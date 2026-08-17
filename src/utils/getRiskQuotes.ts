import { SwaprV3Trade } from "@swapr/sdk";
import { Address, formatUnits, parseUnits } from "viem";

import { sDaiAddress, wxdaiAddress } from "@/generated";

import { ProcessedMarket } from "@/hooks/useProcessMarkets";

import {
  DECIMALS,
  DEFAULT_CHAIN,
  PREDICTION_SLIPPAGE_BUFFER,
  VOLUME_MIN_WEI,
} from "@/consts";

import type { SkippedLeg } from "./getQuotes";
import { getMinimumAmountOut, getSwaprQuote } from "./swapr";

import { minBigIntArray, toTokenAmountString } from ".";

export type GetQuoteProps = {
  account: Address;
  processedOutcomePredictions: ProcessedMarket[];
};

export const getRiskQuotes = async ({
  account,
  processedOutcomePredictions,
}: GetQuoteProps) => {
  const [buyOutcomes, sellOutcomes] = processedOutcomePredictions.reduce(
    (acc, curr) => {
      acc[curr.action === "buy" ? 0 : 1].push(curr);
      return acc;
    },
    [[], []] as [ProcessedMarket[], ProcessedMarket[]],
  );

  const skipped: SkippedLeg[] = [];
  const labelOf = (outcome: ProcessedMarket) => outcome.symbol ?? outcome.token;

  // getting sell quotes
  const sellRequests = sellOutcomes.reduce(
    (requests, outcome) => {
      // if underlying balance is non-zero, then the previous step will have minted this much tokens already
      // so we have that available, hence added here
      const availableSellVolume = outcome.underlyingBalance + outcome.balance;
      // calculating the max amount of tokens we can sell.
      // clamped in wei: routing the balance through a float would round it up
      // and make the swap pull more tokens than the wallet actually holds
      const volumeUntilPriceWei = parseUnits(
        toTokenAmountString(outcome.volumeUntilPrice.outcomeVolume),
        DECIMALS,
      );
      const sellVolumeWei =
        volumeUntilPriceWei < availableSellVolume
          ? volumeUntilPriceWei
          : availableSellVolume;
      if (sellVolumeWei < VOLUME_MIN_WEI) {
        skipped.push({
          symbol: labelOf(outcome),
          side: "sell",
          reason:
            volumeUntilPriceWei === 0n
              ? "no-volume-to-target"
              : "below-minimum",
        });
        return requests;
      }

      // formatUnits is an exact round-trip back through parseUnits
      const volume = formatUnits(sellVolumeWei, DECIMALS);

      requests.push({
        outcome,
        promise: getSwaprQuote({
          address: account,
          chain: DEFAULT_CHAIN.id,
          outcomeToken: outcome.underlyingToken,
          collateralToken: outcome.token,
          amount: volume,
        }),
      });

      return requests;
    },
    [] as { outcome: ProcessedMarket; promise: Promise<SwaprV3Trade | null> }[],
  );

  const sellTokenMapping: { [key: string]: bigint } = {};
  const sellQuoteResults = await Promise.allSettled(
    sellRequests.map((request) => request.promise),
  );
  const sellQuotes = sellQuoteResults.reduce((quotes, result, index) => {
    if (result.status === "fulfilled" && result.value) {
      quotes.push(result.value);
      sellTokenMapping[
        // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
        result.value.inputAmount.currency.address?.toLowerCase()!
      ] = parseUnits(result.value.inputAmount.toExact(), DECIMALS);
    } else {
      // rejected, or fulfilled with null: the quoter found no route
      skipped.push({
        symbol: labelOf(sellRequests[index].outcome),
        side: "sell",
        reason: "no-route",
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

  //get new balances
  const newBalances = processedOutcomePredictions.map(
    (outcome) =>
      // keep in mind underlying balance here is to denote the amount we minted
      (outcome.balance ?? 0n) +
      outcome.underlyingBalance -
      (sellTokenMapping[outcome.token.toLowerCase()] ?? 0n),
  );

  //get collateral from merge
  const collateralFromMerge = minBigIntArray(newBalances);

  const totalCollateral = collateralFromSell + collateralFromMerge;
  const bufferedCollateral =
    (totalCollateral * BigInt(Math.round(PREDICTION_SLIPPAGE_BUFFER * 100))) /
    100n;
  if (!totalCollateral) {
    throw new Error(
      "Quote Error: Not enough collateral. Could not acquire enough collateral to find buy quotes",
    );
  }
  // get buy quotes
  const sumBuyDifference = buyOutcomes.reduce(
    (acc, curr) => acc + curr.difference,
    0,
  );
  const buyRequests = buyOutcomes.reduce(
    (requests, outcome) => {
      // here we allocate the collateral based on the weight of prediction,
      // so if an outcome has high difference they get more collateral to utilize
      const sumBuyUnits = parseUnits(
        toTokenAmountString(sumBuyDifference),
        DECIMALS,
      );
      const availableBuyVolume =
        sumBuyUnits === 0n
          ? 0n
          : (parseUnits(toTokenAmountString(outcome.difference), DECIMALS) *
              bufferedCollateral) /
            sumBuyUnits;

      // note that here we use collateral volume, instead of sellToken volume like above
      const volumeUntilPriceWei = parseUnits(
        toTokenAmountString(outcome.volumeUntilPrice.collateralVolume),
        DECIMALS,
      );
      const buyVolumeWei =
        volumeUntilPriceWei < availableBuyVolume
          ? volumeUntilPriceWei
          : availableBuyVolume;

      // Gate in outcome tokens, matching the sell leg. Gating the swap input
      // (collateral) against the same VOLUME_MIN made buys impossible on
      // low-priced outcomes: moving a pool priced ~1e-4 all the way to target
      // costs well under 0.001 collateral, while the equivalent sell is 1-3
      // whole tokens. getVolumeUntilPriceDual already returns both sides, so
      // scale the token figure by however much of the collateral move we can
      // actually afford.
      const outcomeVolumeWei = parseUnits(
        toTokenAmountString(outcome.volumeUntilPrice.outcomeVolume),
        DECIMALS,
      );
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
              ? "no-volume-to-target"
              : "below-minimum",
        });
        return requests;
      }

      const volume = formatUnits(buyVolumeWei, DECIMALS);

      // get quote
      requests.push({
        outcome,
        promise: getSwaprQuote({
          address: account,
          chain: DEFAULT_CHAIN.id,
          outcomeToken: outcome.token,
          collateralToken: outcome.underlyingToken,
          amount: volume,
        }),
      });
      return requests;
    },
    [] as { outcome: ProcessedMarket; promise: Promise<SwaprV3Trade | null> }[],
  );

  const buyQuoteResult = await Promise.allSettled(
    buyRequests.map((request) => request.promise),
  );
  const buyQuotes = buyQuoteResult.reduce((quotes, result, index) => {
    if (result.status === "fulfilled" && result.value) {
      quotes.push(result.value);
    } else {
      skipped.push({
        symbol: labelOf(buyRequests[index].outcome),
        side: "buy",
        reason: "no-route",
      });
    }
    return quotes;
  }, [] as SwaprV3Trade[]);

  return {
    quotes: { sellQuotes, buyQuotes },
    mergeAmount: collateralFromMerge,
    skipped,
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
