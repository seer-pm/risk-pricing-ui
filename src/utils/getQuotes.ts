import { SwaprV3Trade } from "@swapr/sdk";
import { Address, formatUnits, parseUnits } from "viem";

import { sDaiAddress, wxdaiAddress } from "@/generated";

import { ProcessedMarket } from "@/hooks/useProcessMarkets";

import {
  DECIMALS,
  DEFAULT_CHAIN,
  PREDICTION_SLIPPAGE_BUFFER,
  VOLUME_MIN,
  VOLUME_MIN_WEI,
} from "@/consts";

import { getMinimumAmountOut, getSwaprQuote } from "./swapr";

import { minBigIntArray, toTokenAmountString } from ".";

export type GetQuoteProps = {
  // account that will trade, tradeExecutor in this case
  account: Address;
  // amount of underlyingBalance, if non-zero, the flow will mint and provide more liquidity to trade with
  //   amount: number; we use the underlyingBalance directly from processed market data
  processedMarkets: ProcessedMarket[];
  // market name for clearer error messages when predicting multiple markets
  marketName?: string;
};

export type GetQuotesResult = {
  quotes: {
    sellQuotes: SwaprV3Trade[];
    buyQuotes: SwaprV3Trade[];
  };
  mergeAmount: bigint;
};

const withMarketContext = (msg: string, marketName?: string) =>
  marketName ? `${msg}\nMarket: ${marketName}` : msg;

/**
 * @description Tries to get quotes for a single market's UP and DOWN tokens [upProcessed, downProcessed].
 * Will skip if no route is found for either sell or buy direction.
 * Only throws if not enough collateral is acquired to get buy quotes.
 *
 * Note: If sellQuotes or buyQuotes are empty, we still return partial results,
 *       since selling or buying alone can move the price toward the user's prediction.
 *
 * Note: processedMarkets = [upProcessed, downProcessed]. Can be buy both, sell both, or mixed.
 */
export const getQuotes = async ({
  account,
  processedMarkets,
  marketName,
}: GetQuoteProps) => {
  const [buyMarkets, sellMarkets] = processedMarkets.reduce(
    (acc, curr) => {
      acc[curr.action === "buy" ? 0 : 1].push(curr);
      return acc;
    },
    [[], []] as [ProcessedMarket[], ProcessedMarket[]],
  );

  // getting sell quotes
  const sellPromises = sellMarkets.reduce(
    (promises, market) => {
      // if underlying balance is non-zero, then the previous step will have minted this much tokens already
      // so we have that available, hence added here
      const availableSellVolume = market.underlyingBalance + market.balance;
      // calculating the max amount of tokens we can sell.
      // clamped in wei: routing the balance through a float would round it up
      // and make the swap pull more tokens than the wallet actually holds
      const volumeUntilPriceWei = parseUnits(
        toTokenAmountString(market.volumeUntilPrice.outcomeVolume),
        DECIMALS,
      );
      const sellVolumeWei =
        volumeUntilPriceWei < availableSellVolume
          ? volumeUntilPriceWei
          : availableSellVolume;
      if (sellVolumeWei < VOLUME_MIN_WEI) {
        return promises;
      }

      // formatUnits is an exact round-trip back through parseUnits
      const volume = formatUnits(sellVolumeWei, DECIMALS);

      promises.push(
        getSwaprQuote({
          address: account,
          chain: DEFAULT_CHAIN.id,
          // we are want collateral as outcome here
          outcomeToken: market.underlyingToken,
          // we are giving in the UP or DOWN token
          collateralToken: market.token,
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
  if (!sellPromises.length && sellMarkets.length > 0) {
    console.warn(
      withMarketContext(
        `getQuotes: No sell quotes requested (all volumes below minimum: ${VOLUME_MIN}).`,
        marketName,
      ),
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
  const newBalances = processedMarkets.map(
    (market) =>
      // keep in mind underlying balance here is to denote the amount we minted
      (market.balance ?? 0n) +
      market.underlyingBalance -
      (sellTokenMapping[market.token.toLowerCase()] ?? 0n),
  );

  //get collateral from merge
  const collateralFromMerge = minBigIntArray(newBalances);

  const totalCollateral = collateralFromSell + collateralFromMerge;
  const bufferedCollateral =
    (totalCollateral * BigInt(Math.round(PREDICTION_SLIPPAGE_BUFFER * 100))) /
    100n;

  if (!totalCollateral) {
    throw new Error(
      withMarketContext(
        "Quote Error: Not enough collateral. Could not acquire enough collateral to find buy quotes",
        marketName,
      ),
    );
  }

  // get buy quotes
  const sumBuyDifference = buyMarkets.reduce(
    (acc, curr) => acc + curr.difference,
    0,
  );
  const buyPromises = buyMarkets.reduce(
    (promises, market) => {
      // here we allocate the collateral based on the weight of prediction,
      // so if a market has high difference they get more collateral to utilize
      const sumBuyUnits = parseUnits(
        toTokenAmountString(sumBuyDifference),
        DECIMALS,
      );
      const availableBuyVolume =
        sumBuyUnits === 0n
          ? 0n
          : (parseUnits(toTokenAmountString(market.difference), DECIMALS) *
              bufferedCollateral) /
            sumBuyUnits;

      // note that here we use collateral volume, instead of sellToken volume like above
      const volumeUntilPriceWei = parseUnits(
        toTokenAmountString(market.volumeUntilPrice.collateralVolume),
        DECIMALS,
      );
      const buyVolumeWei =
        volumeUntilPriceWei < availableBuyVolume
          ? volumeUntilPriceWei
          : availableBuyVolume;
      if (buyVolumeWei < VOLUME_MIN_WEI) {
        return promises;
      }

      const volume = formatUnits(buyVolumeWei, DECIMALS);

      // get quote
      promises.push(
        getSwaprQuote({
          address: account,
          chain: DEFAULT_CHAIN.id,
          // we are want UP/DOWN as outcome here
          outcomeToken: market.token,
          // we are giving in the underlying token
          collateralToken: market.underlyingToken,
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
  if (!buyPromises.length && buyMarkets.length > 0) {
    console.warn(
      withMarketContext(
        `getQuotes: No buy quotes requested (all volumes below minimum: ${VOLUME_MIN}).`,
        marketName,
      ),
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
