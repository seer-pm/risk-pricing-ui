import { useCallback, useEffect, useMemo } from "react";

import { useLocalStorage } from "react-use";
import type { Address } from "viem";

import { useRiskPredictionStore } from "@/store/riskMarketStore";

import { useTokensBalances } from "./useTokenBalances";

/**
 * This hook checks if the user had already predicted before.
 * User hasn't predicted before if:
 *  - TradeWallet isn't created
 *  - Outcome token balances are zero. Checks for Invalid token too in case user sold every other token
 * @returns If user has already predicted before
 * @remarks Persists the status in localStorage
 */
export const useFirstPredictionStatus = (tradeExecutor?: Address) => {
  const storageKey = useMemo(
    () =>
      tradeExecutor
        ? `hasPredictedBefore:${tradeExecutor.toLowerCase()}`
        : "__noop__",
    [tradeExecutor],
  );

  const [storedValue, setStoredValue] = useLocalStorage<boolean>(
    storageKey,
    false,
  );
  // Without a trade wallet there is nobody to remember this for. The
  // placeholder key is shared by every account that has no wallet yet, so
  // writing to it marked the next new user as a returning one.
  const storedHasPredicted = tradeExecutor ? storedValue : false;
  const setStoredHasPredicted = useCallback(
    (value: boolean) => {
      if (tradeExecutor) setStoredValue(value);
    },
    [tradeExecutor, setStoredValue],
  );

  // This market's own outcome tokens. The legacy markets list this used to
  // read belongs to a different market, so the balances were always zero.
  const outcomes = useRiskPredictionStore((state) => state.outcomes);
  const tokens = useMemo(
    () => outcomes.map((outcome) => outcome.outcomeId),
    [outcomes],
  );

  const { data: outcomeTokenBalances } = useTokensBalances(
    tradeExecutor,
    tokens,
  );

  const hasOnChainPrediction = useMemo(() => {
    if (!tradeExecutor) return false;
    if (!outcomeTokenBalances) return false;

    return outcomeTokenBalances.some((val) => val > 0n);
  }, [tradeExecutor, outcomeTokenBalances]);

  // once true => always true
  useEffect(() => {
    if (hasOnChainPrediction && !storedHasPredicted) {
      setStoredHasPredicted(true);
    }
  }, [hasOnChainPrediction, storedHasPredicted, setStoredHasPredicted]);

  const hasPredictedBefore = storedHasPredicted || hasOnChainPrediction;

  return {
    hasPredictedBefore,
    isFirstPrediction: !hasPredictedBefore,
    setStoredHasPredicted,
  };
};
