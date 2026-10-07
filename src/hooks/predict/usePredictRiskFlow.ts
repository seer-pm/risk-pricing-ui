import { useEffect, useMemo, useRef } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { Address } from "viem";

import { foresightCreditsAddress } from "@/generated";
import { useRiskPredictionStore } from "@/store/riskMarketStore";

import { useCreateTradeExecutor } from "@/hooks/tradeWallet/useCreateTradeExecutor";
import { useDepositToTradeExecutor } from "@/hooks/tradeWallet/useDepositToTradeExecutor";
import { fetchTokenBalance } from "@/hooks/useTokenBalance";
import { fetchTokensBalances } from "@/hooks/useTokenBalances";

import { formatValue, isUndefined } from "@/utils";
import { formatError } from "@/utils/formatError";
import {
  GetQuotesResult,
  getSDaiToWXdaiData,
  PartialLeg,
  SkippedLeg,
} from "@/utils/getQuotes";
import { getRiskQuotes } from "@/utils/getRiskQuotes";
import {
  fetchRiskPool,
  processRiskMarket,
  RiskPool,
} from "@/utils/processRiskMarket";

import { collateral } from "@/consts";

import { useTradeExecutorPredictRiskOutcomes } from "../tradeWallet/useTradeExecutorPredictRiskOutcomes";
import {
  computePrices,
  solveProbsAsync,
  yearlyToQuarterly,
} from "../useImpliedProbs";

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

  /** Outcome token balances of the trade wallet, "Invalid" included. */
  walletOutcomeBalances?: bigint[];

  onDone: () => void; // called after success + reset
}

// How close the solver has to get to the live pool prices before its result is
// trusted as the market baseline. Matches the solver's own acceptance bar.
const MARKET_SOLVE_TOL = 1e-8;

const skippedNote = ({ symbol, reason }: SkippedLeg) => {
  switch (reason) {
    case "no-liquidity":
      return `${symbol}: not traded - the pool has no liquidity left in that direction.`;
    case "no-route":
      return `${symbol}: not traded - no route available.`;
    case "below-minimum":
      return `${symbol}: not traded - too small with the collateral available.`;
    default:
      return `${symbol}: not traded - the market is already at your prediction (or within the pool fee of it).`;
  }
};

const partialNote = ({ symbol, reason }: PartialLeg) =>
  reason === "pool-liquidity"
    ? `${symbol}: only partly moved - the pool's liquidity ends before your prediction.`
    : `${symbol}: only partly moved - not enough collateral or tokens to go all the way.`;

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
  walletOutcomeBalances,
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
  // the delayed clean-up after a failure must not fire into a later attempt
  const resetTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const predictions = useRiskPredictionStore((state) => state.riskPredictions);
  const outcomes = useRiskPredictionStore((state) => state.outcomes);
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

  const hasDepositCollateral = useMemo(() => {
    return (sDAIDepositAmount ?? 0n) + (toBeAddedSeerCredits ?? 0n) > 0n;
  }, [sDAIDepositAmount, toBeAddedSeerCredits]);

  // An existing position is collateral in its own right: selling part of it
  // funds the rest of the prediction, which is how a view is changed without
  // adding capital.
  const hasPosition = useMemo(() => {
    return (
      checkTradeExecutorResult?.isCreated &&
      walletOutcomeBalances?.some((v) => v > 0n)
    );
  }, [checkTradeExecutorResult?.isCreated, walletOutcomeBalances]);

  // assets + "No To All". "Invalid" is never traded.
  const tradedOutcomes = useMemo(() => outcomes.slice(0, -1), [outcomes]);

  const loadPools = () =>
    Promise.all(
      tradedOutcomes.map((outcome) =>
        fetchRiskPool({
          underlying: outcome.collateral,
          outcome: outcome.outcomeId,
          // the name the user sees on the card, for error and note text
          symbol: outcome.outcome,
        }),
      ),
    );

  /**
   * Target price per traded outcome, measured against the pools as they are
   * right now rather than against the page's market estimate, which is as old
   * as the last page load.
   *
   * predictions/outcome.probability are yearly PD; the pools trade on
   * quarterly-implied prices, so convert before pricing the trade.
   *
   * Solve over the assets only. "No To All" is a survival probability, not a
   * PD, so it is never fed to computePrices as another asset; its model price
   * is priceY.
   *
   * An asset the user has not moved is priced from the live pool, so it only
   * trades by the amount the coupling between outcomes implies.
   *
   * "No To All" is traded relative to its own pool. The market does not have
   * to be internally consistent - the asset pools can imply one survival
   * probability while the "No To All" pool trades at another - and aiming at
   * the model's priceY outright spent the user's collateral closing that gap:
   * it bought "No To All" on every submission, including ones where the user
   * had dragged it down. Scaling the pool price by how far the user moved the
   * implied survival keeps the direction they asked for, and leaves the pool
   * alone when they changed nothing.
   */
  const buildTargets = async (pools: RiskPool[]) => {
    const assets = tradedOutcomes.slice(0, -1);
    const assetPrices = pools.slice(0, -1).map((pool) => pool.currentPrice);
    const noToAllPrice = pools[pools.length - 1].currentPrice;

    // fall back to the page's estimate if the live solve does not converge
    let marketProbs = assets.map((asset) =>
      yearlyToQuarterly(asset.probability ?? 0),
    );
    try {
      const solved = await solveProbsAsync(noToAllPrice, assetPrices);
      if (solved.maxErr < MARKET_SOLVE_TOL) marketProbs = solved.probs;
    } catch {
      // keep the fallback
    }

    const isMoved = assets.map(
      (asset) =>
        predictions[asset.outcomeId] !== undefined &&
        predictions[asset.outcomeId] !== asset.probability,
    );
    const userProbs = assets.map((asset, index) =>
      isMoved[index]
        ? yearlyToQuarterly(predictions[asset.outcomeId])
        : marketProbs[index],
    );

    const market = computePrices(marketProbs);
    const user = computePrices(userProbs);
    const noToAllTarget =
      market.priceY > 0
        ? noToAllPrice * (user.priceY / market.priceY)
        : user.priceY;

    // index 0..n-1 = assets, index n = "No To All", lining up with
    // tradedOutcomes
    return { targets: [...user.prices, noToAllTarget], isMoved };
  };

  const finish = () => {
    onDone();
    reset();
    queryClient.refetchQueries({ queryKey: ["useTicksData"] });
    // the page's market estimate is what the next prediction is compared
    // against, and this trade has just moved it
    queryClient.refetchQueries({ queryKey: ["useMarketData"] });
  };

  const handlePredict = async () => {
    if (isUndefined(account) || isUndefined(checkTradeExecutorResult)) return;
    if (isSubmittingRef.current) return;

    const snapshot = {
      sDAIDeposit: sDAIDepositAmount ?? 0n,
      toBeAdded,
      toBeAddedXDai,
      toBeAddedSeerCredits,
      creditsToSwap: creditsToSwap ?? 0n,
    };
    setFlag("frozenToBeAdded", toBeAdded);
    setFlag("frozenToBeAddedSeerCredits", toBeAddedSeerCredits);

    if (tradedOutcomes.length < 2) {
      setFlag("error", "Market data is still loading, please try again.");
      return;
    }

    if (!hasDepositCollateral && !hasPosition) {
      setFlag(
        "error",
        "Enter an amount to predict with. sDAI already in your Trade Wallet is used before anything is taken from your wallet.",
      );
      return;
    }

    clearTimeout(resetTimerRef.current);
    setFlag("error", undefined);
    setFlag("tradeNotes", undefined);
    setFlag("isSending", true);
    isSubmittingRef.current = true;

    try {
      // Read the pools before anything goes on chain. If the market data is
      // unreachable the prediction cannot be priced, and finding that out
      // after the wallet was created and funded left the user's money moved
      // for nothing.
      setFlag("chunkProgressMessage", "Checking market data...");
      setFlag("isProcessingMarkets", true);
      await loadPools();
      setFlag("isProcessingMarkets", false);
      setFlag("chunkProgressMessage", undefined);

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
        !isUndefined(snapshot.toBeAddedSeerCredits) &&
        snapshot.toBeAddedSeerCredits > 0n
      ) {
        setFlag("isAddingSeerCredits", true);

        await depositToTradeExecutor.mutateAsync({
          token: foresightCreditsAddress,
          amount: snapshot.toBeAddedSeerCredits,
          tradeExecutor: tradeWallet,
          isXDai: false,
        });

        setFlag("isAddingSeerCredits", false);
        setFlag("isSeerCreditsAdded", true);
      }

      // deposit sDAI/xDAI if needed
      if (snapshot.toBeAdded > 0n) {
        setFlag("isAddingCollateral", true);

        await depositToTradeExecutor.mutateAsync({
          token: collateral.address,
          amount: isXDai ? (snapshot.toBeAddedXDai ?? 0n) : snapshot.toBeAdded,
          tradeExecutor: tradeWallet,
          isXDai,
        });

        setFlag("isAddingCollateral", false);
        setFlag("isCollateralAdded", true);
      }

      setFlag("chunkProgressMessage", undefined);
      setFlag("isProcessingMarkets", true);

      // Foresight Credits are swapped and split inside the batch; what they
      // mint arrives as complete sets rather than as sDAI.
      const sDaiToWXDaiData = await getSDaiToWXdaiData(
        tradeWallet,
        snapshot.creditsToSwap,
      );
      const preMinted = sDaiToWXDaiData?.minSDaiReceived ?? 0n;

      // The sDAI this prediction may spend: the amount entered, less the part
      // covered by credits, and never more than the wallet really holds - an
      // xDAI deposit converts at a rate that can differ from the preview by a
      // few wei, and a transfer that asks for more than the balance reverts.
      const walletSDai = (
        await fetchTokenBalance(tradeWallet, collateral.address)
      ).value;
      const sDaiWanted =
        snapshot.sDAIDeposit > snapshot.creditsToSwap
          ? snapshot.sDAIDeposit - snapshot.creditsToSwap
          : 0n;
      const budget = sDaiWanted < walletSDai ? sDaiWanted : walletSDai;

      const [pools, balances] = await Promise.all([
        loadPools(),
        fetchTokensBalances(
          tradeWallet,
          outcomes.map((outcome) => outcome.outcomeId),
        ),
      ]);
      // fetchTokensBalances answers a failed read with []
      if (balances.length !== outcomes.length) {
        throw new Error(
          "Could not read your Trade Wallet balances. Nothing was traded, please try again.",
        );
      }

      const { targets, isMoved } = await buildTargets(pools);

      // process outcome predictions
      const processedPredictions = tradedOutcomes.map((outcome, index) =>
        processRiskMarket({
          pool: pools[index],
          underlying: outcome.collateral,
          outcome: outcome.outcomeId,
          targetPrice: targets[index] ?? 0,
          balance: balances[index],
          // the name the user sees on the card, for error and note text
          symbol: outcome.outcome,
          // "No To All" is the last leg, and moves with any asset
          isUserPrediction: isMoved[index] ?? isMoved.some(Boolean),
        }),
      );
      setFlag("isProcessingMarkets", false);

      // get quotes
      setFlag("isLoadingQuotes", true);
      let quoteResult: GetQuotesResult;
      try {
        quoteResult = await getRiskQuotes({
          account: tradeWallet,
          processedOutcomePredictions: processedPredictions,
          budget,
          preMinted,
          invalidBalance: balances[balances.length - 1],
        });
      } finally {
        setFlag("isLoadingQuotes", false);
      }

      // Tell the user about the legs they asked for that will not land where
      // they put them. Restricted to assets they moved: every prediction also
      // nudges the other 30-odd outcomes by a hair, and listing those is what
      // made an earlier version of this notice unreadable.
      const movedSymbols = new Set(
        tradedOutcomes
          .slice(0, -1)
          .filter((_, index) => isMoved[index])
          .map((outcome) => outcome.outcome),
      );
      const noToAllSymbol = tradedOutcomes[tradedOutcomes.length - 1].outcome;
      const skipped = quoteResult.skipped ?? [];
      const partial = quoteResult.partial ?? [];
      const notes = [
        ...skipped
          .filter(
            (leg) =>
              movedSymbols.has(leg.symbol) ||
              (leg.symbol === noToAllSymbol && leg.reason === "no-liquidity"),
          )
          .map(skippedNote),
        ...partial
          .filter(
            (leg) =>
              movedSymbols.has(leg.symbol) || leg.symbol === noToAllSymbol,
          )
          .map(partialNote),
      ];

      const { sellQuotes, buyQuotes } = quoteResult.quotes;
      if (sellQuotes.length + buyQuotes.length === 0) {
        const unfunded =
          budget + preMinted === 0n &&
          skipped.some(
            (leg) => leg.side === "buy" && leg.reason === "below-minimum",
          );
        throw new Error(
          unfunded
            ? "This prediction needs collateral to buy with. Enter an amount - sDAI already in your Trade Wallet is used before anything is taken from your wallet."
            : ["Nothing to trade.", ...notes].join("\n"),
        );
      }

      const unspent = quoteResult.unspent ?? 0n;
      if (budget > 0n && unspent * 10n >= budget) {
        notes.push(
          `${formatValue(unspent)} sDAI was not needed and stays in your Trade Wallet.`,
        );
      }

      // execute trade
      await tradeExecutorPredictAll.mutateAsync({
        quoteResult,
        tradeExecutor: tradeWallet,
        seerCreditsSwapQuote: sDaiToWXDaiData?.quote,
        onProgress: (current, total) =>
          setFlag(
            "chunkProgressMessage",
            `Confirm transaction ${current} of ${total} in your wallet...`,
          ),
      });
      setFlag("chunkProgressMessage", undefined);
      setFlag("isPredictionSuccessful", true);

      if (notes.length > 0) {
        // stays open until the user has read it; the popup calls finish()
        setFlag("tradeNotes", notes);
      } else {
        // close + reset
        setTimeout(finish, 1000);
      }
    } catch (e) {
      setFlag("isProcessingMarkets", false);
      setFlag("chunkProgressMessage", undefined);
      if (e instanceof Error) {
        setFlag("error", formatError(e));
      } else {
        setFlag("error", "");
      }

      // reset state later if user doesn't act
      resetTimerRef.current = setTimeout(() => reset(), 10000);
    } finally {
      setFlag("isSending", false);
      isSubmittingRef.current = false;
    }
  };

  return {
    handlePredict,
    finish,
    ...state,
    tradeExecutorPredictAll,
  };
}
