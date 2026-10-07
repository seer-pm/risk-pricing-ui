import { SwaprV3Trade } from "@swapr/sdk";
import { Address, formatUnits, parseUnits } from "viem";

import { sDaiAddress, wxdaiAddress } from "@/generated";

import { ProcessedMarket } from "@/hooks/useProcessMarkets";

import {
  COUPLING_MIN_MOVE,
  DECIMALS,
  DEFAULT_CHAIN,
  MERGE_MIN_WEI,
  PREDICTION_SLIPPAGE_BUFFER,
  VOLUME_MIN_WEI,
} from "@/consts";

import type { GetQuotesResult, PartialLeg, SkippedLeg } from "./getQuotes";
import { getMinimumAmountOut, getSwaprQuote } from "./swapr";

import { minBigIntArray, toTokenAmountString } from ".";

export type GetQuoteProps = {
  account: Address;
  processedOutcomePredictions: ProcessedMarket[];
  /** sDAI in the trade wallet that this prediction may spend. */
  budget: bigint;
  /**
   * Complete sets minted earlier in the same batch (Foresight Credits can only
   * enter the market by being split), on top of each leg's wallet balance.
   */
  preMinted?: bigint;
  /** Wallet balance of "Invalid": never traded, but a merge burns it too. */
  invalidBalance: bigint;
};

const toWei = (value: number) =>
  parseUnits(toTokenAmountString(value), DECIMALS);

const minBigInt = (a: bigint, b: bigint) => (a < b ? a : b);

// A leg that gets within 1% of the volume it wanted has, for the user's
// purposes, arrived: the shortfall is rounding and the swap fee, not a limit
// worth reporting.
const fellShort = (traded: bigint, wanted: bigint) =>
  traded * 100n < wanted * 99n;

/**
 * Moving one PD nudges every other outcome's price by a fraction of a percent
 * through the pricing model. Those legs are not a view on the asset: trading
 * them paid more in fees than the move was worth, each needed its own swap,
 * and a single dust sell was enough to force a ~4.3M gas split. Thirty of them
 * at once is what pushed the batch to the block gas limit.
 *
 * So a leg is dropped when its target is within the pool's own swap fee of
 * spot, and an outcome the user did not move has to clear COUPLING_MIN_MOVE as
 * well.
 */
const isNegligible = ({
  currentPrice,
  targetPrice,
  fee,
  isUserPrediction,
}: ProcessedMarket) => {
  if (
    currentPrice === undefined ||
    targetPrice === undefined ||
    fee === undefined ||
    currentPrice <= 0
  )
    return false;
  const threshold = isUserPrediction ? fee : Math.max(fee, COUPLING_MIN_MOVE);
  return Math.abs(targetPrice - currentPrice) <= currentPrice * threshold;
};

/**
 * Sizes and quotes one prediction: sells first, then whatever collateral the
 * buys can draw on.
 *
 * Collateral is only split into outcome tokens to the extent a sell needs
 * tokens the wallet does not already hold. The previous version split the
 * whole amount and merged nearly all of it straight back - two ~4.5M gas
 * operations that cancelled out, and the main reason a single-slider
 * prediction needed the entire 17M Gnosis block.
 */
export const getRiskQuotes = async ({
  account,
  processedOutcomePredictions,
  budget,
  preMinted = 0n,
  invalidBalance,
}: GetQuoteProps): Promise<GetQuotesResult> => {
  const skipped: SkippedLeg[] = [];
  const partial: PartialLeg[] = [];
  const labelOf = (outcome: ProcessedMarket) => outcome.symbol ?? outcome.token;
  const heldOf = (outcome: ProcessedMarket) => outcome.balance + preMinted;

  const buyOutcomes: ProcessedMarket[] = [];
  const sellOutcomes: ProcessedMarket[] = [];
  for (const outcome of processedOutcomePredictions) {
    const side = outcome.action === "buy" ? "buy" : "sell";
    if (isNegligible(outcome)) {
      skipped.push({ symbol: labelOf(outcome), side, reason: "within-fee" });
      continue;
    }
    (side === "buy" ? buyOutcomes : sellOutcomes).push(outcome);
  }

  // what a zero-volume leg means: already at the target, or nothing to trade
  // against in that direction
  const zeroVolumeReason = (outcome: ProcessedMarket) =>
    outcome.targetReached === false ? "no-liquidity" : "no-volume-to-target";

  // ---- sells ---------------------------------------------------------------
  // Split only as much as the hungriest sell leg is short of, within budget.
  const sellWanted = sellOutcomes.map((outcome) =>
    toWei(outcome.volumeUntilPrice.outcomeVolume),
  );
  const splitWanted = sellOutcomes.reduce((max, outcome, index) => {
    const held = heldOf(outcome);
    const short = sellWanted[index] > held ? sellWanted[index] - held : 0n;
    return short > max ? short : max;
  }, 0n);
  const splitCap = minBigInt(splitWanted, budget);

  const sellRequests = sellOutcomes.reduce(
    (requests, outcome, index) => {
      // clamped in wei: routing the balance through a float would round it up
      // and make the swap pull more tokens than the wallet actually holds
      const wanted = sellWanted[index];
      const sellVolumeWei = minBigInt(wanted, heldOf(outcome) + splitCap);
      if (sellVolumeWei < VOLUME_MIN_WEI) {
        skipped.push({
          symbol: labelOf(outcome),
          side: "sell",
          reason: wanted === 0n ? zeroVolumeReason(outcome) : "below-minimum",
        });
        return requests;
      }

      requests.push({
        outcome,
        wanted,
        // formatUnits is an exact round-trip back through parseUnits
        promise: getSwaprQuote({
          address: account,
          chain: DEFAULT_CHAIN.id,
          outcomeToken: outcome.underlyingToken,
          collateralToken: outcome.token,
          amount: formatUnits(sellVolumeWei, DECIMALS),
        }),
      });

      return requests;
    },
    [] as {
      outcome: ProcessedMarket;
      wanted: bigint;
      promise: Promise<SwaprV3Trade | null>;
    }[],
  );

  const soldByToken: { [key: string]: bigint } = {};
  // the split actually needed, now that it is known which sells got a route
  let splitAmount = 0n;
  const sellQuoteResults = await Promise.allSettled(
    sellRequests.map((request) => request.promise),
  );
  const sellQuotes = sellQuoteResults.reduce((quotes, result, index) => {
    const { outcome, wanted } = sellRequests[index];
    if (result.status === "fulfilled" && result.value) {
      quotes.push(result.value);
      const sold = parseUnits(result.value.inputAmount.toExact(), DECIMALS);
      soldByToken[outcome.token.toLowerCase()] = sold;
      const held = heldOf(outcome);
      if (sold > held && sold - held > splitAmount) splitAmount = sold - held;
      if (outcome.targetReached === false) {
        partial.push({
          symbol: labelOf(outcome),
          side: "sell",
          reason: "pool-liquidity",
        });
      } else if (fellShort(sold, wanted)) {
        partial.push({
          symbol: labelOf(outcome),
          side: "sell",
          reason: "collateral",
        });
      }
    } else {
      // rejected, or fulfilled with null: the quoter found no route. A pool
      // sitting a hair inside the end of its liquidity still reports a sliver
      // of volume, and that is the usual way to get here.
      skipped.push({
        symbol: labelOf(outcome),
        side: "sell",
        reason: outcome.targetReached === false ? "no-liquidity" : "no-route",
      });
    }
    return quotes;
  }, [] as SwaprV3Trade[]);

  // Use minimumAmountOut (slippage-adjusted) to avoid over-allocating to buys
  // when actual swap output is less than expected
  const collateralFromSell = sellQuotes.reduce(
    (acc, curr) =>
      acc + parseUnits(curr!.minimumAmountOut().toExact(), DECIMALS),
    0n,
  );

  // ---- buys: what they need ------------------------------------------------
  // note that here we use collateral volume, instead of sellToken volume like above
  const buyNeeds = buyOutcomes.map((outcome) =>
    toWei(outcome.volumeUntilPrice.collateralVolume),
  );
  const totalBuyNeed = buyNeeds.reduce((acc, need) => acc + need, 0n);

  // ---- merge ---------------------------------------------------------------
  // Complete sets left after the sells can be merged back into collateral.
  // "Invalid" is part of the set: leaving it out let the merge ask for more
  // than the wallet held of it, which reverts the whole batch.
  const mergeable = minBigIntArray([
    ...processedOutcomePredictions.map(
      (outcome) =>
        heldOf(outcome) +
        splitAmount -
        (soldByToken[outcome.token.toLowerCase()] ?? 0n),
    ),
    invalidBalance + preMinted + splitAmount,
  ]);
  const collateralWithoutMerge = budget - splitAmount + collateralFromSell;
  const buffer = BigInt(Math.round(PREDICTION_SLIPPAGE_BUFFER * 100));
  // only worth its gas when the buys cannot be funded without it
  const mergeAmount =
    mergeable >= MERGE_MIN_WEI &&
    totalBuyNeed > (collateralWithoutMerge * buffer) / 100n
      ? mergeable
      : 0n;

  const totalCollateral = collateralWithoutMerge + mergeAmount;
  const bufferedCollateral = (totalCollateral * buffer) / 100n;

  // ---- buys ----------------------------------------------------------------
  let spentOnBuys = 0n;
  const buyRequests = buyOutcomes.reduce(
    (requests, outcome, index) => {
      const volumeUntilPriceWei = buyNeeds[index];
      // Every leg gets what it needs when there is enough to go round;
      // otherwise each gets the same fraction of the way to its target.
      // Weighting by price difference instead starved the assets whenever
      // "No To All" was also a buy: its price gap is ~100x theirs.
      const buyVolumeWei =
        totalBuyNeed <= bufferedCollateral
          ? volumeUntilPriceWei
          : (volumeUntilPriceWei * bufferedCollateral) / totalBuyNeed;

      // Gate in outcome tokens, matching the sell leg. Gating the swap input
      // (collateral) against the same VOLUME_MIN made buys impossible on
      // low-priced outcomes: moving a pool priced ~1e-4 all the way to target
      // costs well under 0.001 collateral, while the equivalent sell is 1-3
      // whole tokens. getVolumeUntilPriceDual already returns both sides, so
      // scale the token figure by however much of the collateral move we can
      // actually afford.
      const outcomeVolumeWei = toWei(outcome.volumeUntilPrice.outcomeVolume);
      const buyVolumeTokens =
        volumeUntilPriceWei === 0n
          ? 0n
          : (outcomeVolumeWei * buyVolumeWei) / volumeUntilPriceWei;
      if (buyVolumeTokens < VOLUME_MIN_WEI) {
        skipped.push({
          symbol: labelOf(outcome),
          side: "buy",
          reason:
            volumeUntilPriceWei === 0n
              ? zeroVolumeReason(outcome)
              : "below-minimum",
        });
        return requests;
      }

      // get quote
      requests.push({
        outcome,
        wanted: volumeUntilPriceWei,
        amount: buyVolumeWei,
        promise: getSwaprQuote({
          address: account,
          chain: DEFAULT_CHAIN.id,
          outcomeToken: outcome.token,
          collateralToken: outcome.underlyingToken,
          amount: formatUnits(buyVolumeWei, DECIMALS),
        }),
      });
      return requests;
    },
    [] as {
      outcome: ProcessedMarket;
      wanted: bigint;
      amount: bigint;
      promise: Promise<SwaprV3Trade | null>;
    }[],
  );

  const buyQuoteResult = await Promise.allSettled(
    buyRequests.map((request) => request.promise),
  );
  const buyQuotes = buyQuoteResult.reduce((quotes, result, index) => {
    const { outcome, wanted, amount } = buyRequests[index];
    if (result.status === "fulfilled" && result.value) {
      quotes.push(result.value);
      spentOnBuys += amount;
      if (outcome.targetReached === false) {
        partial.push({
          symbol: labelOf(outcome),
          side: "buy",
          reason: "pool-liquidity",
        });
      } else if (fellShort(amount, wanted)) {
        partial.push({
          symbol: labelOf(outcome),
          side: "buy",
          reason: "collateral",
        });
      }
    } else {
      skipped.push({
        symbol: labelOf(outcome),
        side: "buy",
        reason: outcome.targetReached === false ? "no-liquidity" : "no-route",
      });
    }
    return quotes;
  }, [] as SwaprV3Trade[]);

  return {
    quotes: { sellQuotes, buyQuotes },
    splitAmount,
    mergeAmount,
    skipped,
    partial,
    unspent: totalCollateral > spentOnBuys ? totalCollateral - spentOnBuys : 0n,
  };
};

export const getSDaiToWXdaiData = async (account: Address, amount?: bigint) => {
  if (!amount) return;
  const quoteSDaiToWXDai = await getSwaprQuote({
    address: account,
    chain: DEFAULT_CHAIN.id,
    outcomeToken: wxdaiAddress,
    collateralToken: sDaiAddress,
    amount: formatUnits(amount, DECIMALS),
  }).catch((e) => {
    throw e;
  });

  if (!quoteSDaiToWXDai) {
    throw new Error("No route found for sDAI <> WXDAI");
  }

  const minWXDaiReceived = await getMinimumAmountOut(quoteSDaiToWXDai);
  const quoteWXDaiToSDai = await getSwaprQuote({
    address: account,
    chain: DEFAULT_CHAIN.id,
    outcomeToken: sDaiAddress,
    collateralToken: wxdaiAddress,
    amount: formatUnits(minWXDaiReceived, DECIMALS),
  }).catch((e) => {
    throw e;
  });
  if (!quoteWXDaiToSDai) {
    throw new Error("No route found for WXDAI <> sDAI");
  }
  const minSDaiReceived = await getMinimumAmountOut(quoteWXDaiToSDai);

  return {
    quote: quoteSDaiToWXDai,
    minSDaiReceived,
    slippage: amount - minSDaiReceived,
  };
};
