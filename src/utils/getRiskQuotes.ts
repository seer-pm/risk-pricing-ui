import { SwaprV3Trade } from "@swapr/sdk";
import { Address, formatUnits, parseUnits } from "viem";

import { sDaiAddress, wxdaiAddress } from "@/generated";

import { ProcessedMarket } from "@/hooks/useProcessMarkets";

import {
  DECIMALS,
  DEFAULT_CHAIN,
  PREDICTION_SLIPPAGE_BUFFER,
  VOLUME_MIN,
} from "@/consts";

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

  // getting sell quotes
  const sellPromises = sellOutcomes.reduce(
    (promises, outcome) => {
      // if underlying balance is non-zero, then the previous step will have minted this much tokens already
      // so we have that available, hence added here
      const availableSellVolume = outcome.underlyingBalance + outcome.balance;
      // calculating the max amount of tokens we can sell
      const availableAsNumber = Number(
        formatUnits(availableSellVolume, DECIMALS),
      );
      const volumeNumber = Math.min(
        outcome.volumeUntilPrice.outcomeVolume,
        availableAsNumber,
      );
      if (volumeNumber < VOLUME_MIN) {
        return promises;
      }

      const volume = toTokenAmountString(volumeNumber);

      promises.push(
        getSwaprQuote({
          address: account,
          chain: DEFAULT_CHAIN.id,
          outcomeToken: outcome.underlyingToken,
          collateralToken: outcome.token,
          amount: volume,
        }).catch((e) => {
          throw e;
        }),
      );

      return promises;
    },
    [] as Promise<SwaprV3Trade | null>[],
  );

  // no sell promises added (all volumes below minimum)
  if (!sellPromises.length && sellOutcomes.length > 0) {
    console.warn(
      `getQuotes: No sell quotes requested (all volumes below minimum: ${VOLUME_MIN}).`,
    );
  }

  const sellTokenMapping: { [key: string]: bigint } = {};
  const sellQuoteResults = await Promise.allSettled(sellPromises);
  const sellQuotes = sellQuoteResults.reduce((quotes, result) => {
    if (result.status === "fulfilled" && result.value) {
      quotes.push(result.value);
      sellTokenMapping[
        // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
        result.value.inputAmount.currency.address?.toLowerCase()!
      ] = parseUnits(result.value.inputAmount.toExact(), DECIMALS);
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
  console.log(buyOutcomes);
  // get buy quotes
  const sumBuyDifference = buyOutcomes.reduce(
    (acc, curr) => acc + curr.difference,
    0,
  );
  const buyPromises = buyOutcomes.reduce(
    (promises, outcome) => {
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
      const availableBuyAsNumber = Number(
        formatUnits(availableBuyVolume, DECIMALS),
      );
      const volumeNumber = Math.min(
        outcome.volumeUntilPrice.collateralVolume,
        availableBuyAsNumber,
      );
      if (volumeNumber < VOLUME_MIN) {
        return promises;
      }

      const volume = toTokenAmountString(volumeNumber);

      // get quote
      promises.push(
        getSwaprQuote({
          address: account,
          chain: DEFAULT_CHAIN.id,
          outcomeToken: outcome.token,
          collateralToken: outcome.underlyingToken,
          amount: volume,
        }).catch((e) => {
          throw e;
        }),
      );
      return promises;
    },
    [] as Promise<SwaprV3Trade | null>[],
  );

  // no buy promises added (all volumes below minimum)
  if (!buyPromises.length && buyOutcomes.length > 0) {
    console.warn(
      `getQuotes: No buy quotes requested (all volumes below minimum: ${VOLUME_MIN}).`,
    );
  }

  const buyQuoteResult = await Promise.allSettled(buyPromises);
  const buyQuotes = buyQuoteResult.reduce((quotes, result) => {
    if (result.status === "fulfilled" && result.value) {
      quotes.push(result.value);
    }
    return quotes;
  }, [] as SwaprV3Trade[]);

  return {
    quotes: { sellQuotes, buyQuotes },
    mergeAmount: collateralFromMerge,
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
