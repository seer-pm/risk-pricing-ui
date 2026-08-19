import { useEffect, useMemo, useRef } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { Address } from "viem";

import { foresightCreditsAddress } from "@/generated";
import { useRiskPredictionStore } from "@/store/riskMarketStore";

import { useCreateTradeExecutor } from "@/hooks/tradeWallet/useCreateTradeExecutor";
import { useDepositToTradeExecutor } from "@/hooks/tradeWallet/useDepositToTradeExecutor";
import { fetchTokenBalance } from "@/hooks/useTokenBalance";

import { isUndefined } from "@/utils";
import { formatError } from "@/utils/formatError";
import { GetQuotesResult, getSDaiToWXdaiData } from "@/utils/getQuotes";
import { getRiskQuotes } from "@/utils/getRiskQuotes";
import { processRiskMarket } from "@/utils/processRiskMarket";

import { collateral } from "@/consts";

import { useTradeExecutorPredictRiskOutcomes } from "../tradeWallet/useTradeExecutorPredictRiskOutcomes";
import { computePrices, yearlyToQuarterly } from "../useImpliedProbs";

import { usePredictState } from "./usePredictState";

interface CheckTradeExecutorResult {
  predictedAddress?: Address;
  isCreated: boolean;
}

interface UsePredictAllFlowArgs {
  account?: Address;
  tradeExecutor?: Address;
  checkTradeExecutorResult?: CheckTradeExecutorResult;
  isXDai: boolean;

  sDAIDepositAmount?: bigint;
  toBeAdded: bigint;
  toBeAddedXDai?: bigint;
  /** Amount of credits to deposit from EOA (skip if 0, credits already in wallet) */
  toBeAddedSeerCredits?: bigint;
  /** Total credits to swap (EOA + wallet) - used for credit<>sDAI quote */
  creditsToSwap?: bigint;

  walletUnderlyingBalances?: bigint[];
  walletTokensBalances?: bigint[];

  onDone: () => void; // called after success + reset
}

export function usePredictRiskFlow({
  account,
  tradeExecutor,
  checkTradeExecutorResult,
  isXDai,
  sDAIDepositAmount,
  toBeAdded,
  toBeAddedXDai,
  toBeAddedSeerCredits,
  creditsToSwap,
  walletUnderlyingBalances,
  walletTokensBalances,
  onDone,
}: UsePredictAllFlowArgs) {
  const queryClient = useQueryClient();
  const { state, setFlag, reset } = usePredictState();
  // synchronous in-flight guard. `isSending` disables the button, but it is
  // reducer state: it lags the click, and it is lost if the modal remounts.
  // A second prediction started while the first is in flight gets quoted
  // against pool state the first one is about to invalidate, so its buy leg
  // reverts on slippage after the whole batch has already executed.
  const isSubmittingRef = useRef(false);

  const predictions = useRiskPredictionStore((state) => state.riskPredictions);
  const outcomes = useRiskPredictionStore((state) => state.outcomes);
  // predictions/outcome.probability are yearly PD; the pools trade on
  // quarterly-implied prices, so convert before pricing the trade.
  //
  // Solve over the assets only. "No To All" is a survival probability, not a
  // PD, so including it here (slice(0, -1)) fed computePrices a 34th element
  // it treated as another asset default: that priced No To All near 0.12
  // against a pool at ~0.71, so it was classified "sell" and dumped to the
  // bottom of its range on every submission, and it biased every asset target
  // downwards. priceY is the correct No To All target, and is what
  // useMarketData already recomputes for display.
  const assetProbs = outcomes
    .slice(0, -2)
    .map(
      (outcome) => predictions[outcome.outcomeId] ?? outcome.probability ?? 0,
    );
  const { priceY, prices } = computePrices(assetProbs.map(yearlyToQuarterly));
  // index 0..n-1 = assets, index n = "No To All". "Invalid" is never traded,
  // so this lines up with the slice(0, -1) the trade loop below iterates.
  const predictedPrices = [...prices, priceY];
  const createTradeExecutor = useCreateTradeExecutor();
  const depositToTradeExecutor = useDepositToTradeExecutor(() => {});
  const tradeExecutorPredictAll = useTradeExecutorPredictRiskOutcomes();

  useEffect(() => {
    const err =
      createTradeExecutor.error ??
      depositToTradeExecutor.error ??
      tradeExecutorPredictAll.error;

    if (err) {
      setFlag("error", formatError(err));
      createTradeExecutor.reset();
      depositToTradeExecutor.reset();
      tradeExecutorPredictAll.reset();
    }
  }, [
    createTradeExecutor.error,
    depositToTradeExecutor.error,
    tradeExecutorPredictAll.error,
    setFlag,
  ]);

  const hasWalletCollateral = useMemo(() => {
    return (
      checkTradeExecutorResult?.isCreated &&
      walletUnderlyingBalances &&
      walletUnderlyingBalances.every((v) => v > 0n)
    );
  }, [checkTradeExecutorResult?.isCreated, walletUnderlyingBalances]);

  const hasDepositCollateral = useMemo(() => {
    return (sDAIDepositAmount ?? 0n) + (toBeAddedSeerCredits ?? 0n) > 0n;
  }, [sDAIDepositAmount, toBeAddedSeerCredits]);

  const hasPosition = useMemo(() => {
    return walletTokensBalances?.some((v) => v > 0n);
  }, [walletTokensBalances]);

  const handlePredict = async () => {
    if (isUndefined(account) || isUndefined(checkTradeExecutorResult)) return;
    if (isSubmittingRef.current) return;

    const snapshot: {
      initialSDAIDeposit?: bigint;
      initialToBeAdded?: bigint;
      initialToBeAddedXDai?: bigint;
      initialToBeAddedSeerCredits?: bigint;
    } = {
      initialSDAIDeposit: sDAIDepositAmount,
      initialToBeAdded: toBeAdded,
      initialToBeAddedXDai: toBeAddedXDai,
      initialToBeAddedSeerCredits: toBeAddedSeerCredits,
    };
    setFlag("frozenToBeAdded", toBeAdded);
    setFlag("frozenToBeAddedSeerCredits", toBeAddedSeerCredits);

    if (!hasWalletCollateral && !hasDepositCollateral && !hasPosition) {
      setFlag("error", "Require collateral to trade");
      return;
    }

    setFlag("error", undefined);
    setFlag("isSending", true);
    isSubmittingRef.current = true;

    try {
      let tradeWallet = tradeExecutor;

      // create wallet if needed
      if (!checkTradeExecutorResult.isCreated) {
        setFlag("isCreatingWallet", true);

        const created = await createTradeExecutor.mutateAsync({ account });
        tradeWallet = created.predictedAddress;

        if (isUndefined(tradeWallet)) {
          throw new Error("Failed to create wallet!");
        }

        setFlag("isCreatingWallet", false);
        setFlag("createdTradeWallet", tradeWallet);
      } else {
        if (!tradeWallet) {
          tradeWallet = checkTradeExecutorResult.predictedAddress;
        }
        if (!tradeWallet) {
          throw new Error("Missing trade wallet address");
        }
        setFlag("createdTradeWallet", tradeWallet);
      }

      // deposit SeerCredits if needed
      if (
        !isUndefined(snapshot.initialToBeAddedSeerCredits) &&
        snapshot.initialToBeAddedSeerCredits > 0n
      ) {
        setFlag("isAddingSeerCredits", true);

        await depositToTradeExecutor.mutateAsync({
          token: foresightCreditsAddress,
          amount: snapshot.initialToBeAddedSeerCredits,
          tradeExecutor: tradeWallet,
          isXDai: false,
        });

        setFlag("isAddingSeerCredits", false);
        setFlag("isSeerCreditsAdded", true);
      }

      // deposit sDAI/xDAI if needed
      if (
        !isUndefined(snapshot.initialToBeAdded) &&
        snapshot.initialToBeAdded > 0n
      ) {
        setFlag("isAddingCollateral", true);

        await depositToTradeExecutor.mutateAsync({
          token: collateral.address,
          amount: isXDai
            ? (snapshot.initialToBeAddedXDai ?? 0n)
            : snapshot.initialToBeAdded,
          tradeExecutor: tradeWallet,
          isXDai,
        });

        // if xDAI, re-read the actual sDAI received
        if (isXDai) {
          const updatedWalletSDaiBalance = await fetchTokenBalance(
            tradeWallet,
            collateral.address,
          );
          snapshot.initialSDAIDeposit = updatedWalletSDaiBalance.value;
        }

        setFlag("isAddingCollateral", false);
        setFlag("isCollateralAdded", true);
      }

      setFlag("isProcessingMarkets", true);

      const sDaiToWXDaiData = await getSDaiToWXdaiData(
        tradeWallet!,
        creditsToSwap,
      );
      // the expected/equivalent sDAI received by using SeerCredits can be less than initially calculated
      // so adjusting
      if (
        sDaiToWXDaiData &&
        sDaiToWXDaiData.slippage > 0n &&
        snapshot.initialSDAIDeposit
      ) {
        snapshot.initialSDAIDeposit =
          snapshot.initialSDAIDeposit - sDaiToWXDaiData.slippage;
      }

      setFlag("chunkProgressMessage", undefined);
      setFlag("isProcessingMarkets", true);

      // process outcome predictions
      const processedPredictions = await Promise.all(
        outcomes.slice(0, -1).map(async (outcome, index) => {
          const mintAmount = snapshot.initialSDAIDeposit ?? 0n;
          const outcomeProcessed = await processRiskMarket({
            underlying: outcome.collateral,
            outcome: outcome.outcomeId,
            tradeExecutor: tradeWallet!,
            mintAmount: mintAmount,
            targetPrice: predictedPrices[index] ?? 0,
            symbol: outcome.symbol,
          });
          return outcomeProcessed;
        }),
      );
      setFlag("isProcessingMarkets", false);

      // get quotes
      setFlag("chunkProgressMessage", undefined);
      setFlag("isLoadingQuotes", true);
      let quoteResult: GetQuotesResult | undefined;
      try {
        quoteResult = await getRiskQuotes({
          account: tradeWallet!,
          processedOutcomePredictions: processedPredictions,
        });
      } catch (e) {
        setFlag("isLoadingQuotes", false);
        // keep the real reason: "No routes found" hid the actual failure,
        // which is usually the not-enough-collateral throw
        throw e instanceof Error ? e : new Error("No routes found");
      }

      if (!quoteResult) {
        setFlag("isLoadingQuotes", false);
        throw new Error("No routes found");
      }

      setFlag("isLoadingQuotes", false);
      setFlag("chunkProgressMessage", undefined);
      // execute trade
      const mintAmount =
        (snapshot.initialSDAIDeposit ?? 0n) -
        (sDaiToWXDaiData?.minSDaiReceived ?? 0n);

      await tradeExecutorPredictAll.mutateAsync({
        quoteResult: quoteResult!,
        tradeExecutor: tradeWallet!,
        mintAmount: mintAmount,
        seerCreditsSwapQuote: sDaiToWXDaiData?.quote,
      });
      setFlag("isPredictionSuccessful", true);

      // close + reset
      setTimeout(() => {
        onDone();
        reset();
        queryClient.refetchQueries({
          queryKey: ["useTicksData"],
        });
      }, 1000);
    } catch (e) {
      if (e instanceof Error) {
        setFlag("error", formatError(e));
      } else {
        setFlag("error", "");
      }

      // reset state later if user doesn't act
      setTimeout(() => reset(), 10000);
    } finally {
      setFlag("isSending", false);
      isSubmittingRef.current = false;
    }
  };

  return {
    handlePredict,
    ...state,
    tradeExecutorPredictAll,
  };
}
