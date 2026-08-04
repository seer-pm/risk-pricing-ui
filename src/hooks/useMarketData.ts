"use client";
import { useEffect, useMemo } from "react";

import { useQuery } from "@tanstack/react-query";
import { Address } from "viem";
import { gnosis } from "viem/chains";

import { useRiskPredictionStore } from "@/store/riskMarketStore";
import { Market, PoolHourData, SerializedMarket } from "@/types/market-types";

import { RISK_PRICING_MARKET_ID } from "@/consts/markets";

import { isTwoStringsEqual, sqrtPriceX96ToPrice } from "./liquidity/utils";

import {
  computePrices,
  quarterlyToYearly,
  useImpliedProbsAsync,
} from "./useImpliedProbs";
import { useTokensInfo } from "./useTokensInfo";

export function deserializeMarket(market: SerializedMarket): Market {
  const result = {
    ...market,
    outcomesSupply: BigInt(market.outcomesSupply),
    parentMarket: {
      ...market.parentMarket,
      payoutNumerators: market.parentMarket.payoutNumerators.map((pn) =>
        BigInt(pn),
      ),
    },
    parentOutcome: BigInt(market.parentOutcome),
    templateId: BigInt(market.templateId),
    questions: market.questions.map((question) => ({
      ...question,
      bond: BigInt(question.bond),
      min_bond: BigInt(question.min_bond),
    })),
    lowerBound: BigInt(market.lowerBound),
    upperBound: BigInt(market.upperBound),
    payoutNumerators: market.payoutNumerators.map((pn) => BigInt(pn)),
  };
  return result as Market;
}

const asJson = async (res: Response, label: string) => {
  // Without this the caller parses the error page as if it were data and fails
  // later with something unrelated, so the query has to reject here.
  if (!res.ok) {
    throw new Error(`${label} request failed (${res.status})`);
  }
  return res.json();
};

const fetchMarket = async () => {
  const [rawMarketData, rawChartData] = await Promise.all([
    // Same-origin via the Seer proxy rather than a direct cross-origin call:
    // the upstream returns a platform 502 with no CORS headers when it falls
    // over, which the browser surfaces as an opaque CORS error instead of a
    // status this code can act on. See src/app/api/seer/[fn]/route.ts.
    fetch("/api/seer/get-market", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chainId: gnosis.id,
        id: RISK_PRICING_MARKET_ID,
      }),
    }).then((res) => asJson(res, "Market")),
    fetch("/api/risk-market-chart").then((res) => asJson(res, "Market chart")),
  ]);
  const marketData = deserializeMarket(rawMarketData) as Market;
  const chartData = rawChartData.data as PoolHourData[][];
  return {
    marketData,
    chartData,
    outcomes: undefined,
  };
};
export interface RiskPricingOutcome {
  outcomeId: Address;
  outcome: string;
  collateral: Address;
  price: number;
  probability: number;
  outcomeIndex: number;
  symbol: string;
}
/**
 * Raw market data query, without the implied-probabilities computation
 * of useMarketData. Shares the same react-query cache entry.
 */
export const useRawMarketData = () => {
  return useQuery<{
    marketData: Market;
    chartData: PoolHourData[][];
    outcomes: RiskPricingOutcome[] | undefined;
  }>({
    queryKey: ["useMarketData"],
    queryFn: () => fetchMarket(),
  });
};

export const useMarketData = () => {
  const queryResult = useRawMarketData();
  const marketData = queryResult.data?.marketData;
  const chartData = queryResult.data?.chartData;
  const prices = useMemo(
    () =>
      marketData && chartData
        ? chartData.map((outcomeChartData, index) => {
            const outcomeId = marketData.wrappedTokens[index];
            const latestPoolHourData = outcomeChartData.at(-1);
            if (!latestPoolHourData) return 0;
            const [price0, price1] = sqrtPriceX96ToPrice(
              BigInt(latestPoolHourData.sqrtPrice),
              undefined,
              true,
            );
            return isTwoStringsEqual(
              outcomeId,
              latestPoolHourData.pool.token0.id,
            )
              ? Number(price0)
              : Number(price1);
          })
        : undefined,
    [marketData, chartData],
  );
  const state = useImpliedProbsAsync(
    prices ? (prices.at(prices.length - 2) ?? 0) : 0,
    prices?.slice(0, -2) ?? [],
    !!prices,
  );
  // state.probs/priceY are quarterly (the pools trade on quarterly-implied
  // prices) — convert to yearly PD for display, recomputing "No To All" from
  // the yearly-converted per-asset probabilities so it stays self-consistent.
  const probabilities = useMemo(() => {
    if (state.status !== "done") return undefined;
    const yearlyProbs = state.probs.map(quarterlyToYearly);
    const { priceY: yearlyPriceY } = computePrices(yearlyProbs);
    return [...yearlyProbs, yearlyPriceY, 0];
  }, [state]);
  const { data } = useTokensInfo(marketData?.wrappedTokens, gnosis.id);
  const outcomes = useMemo(
    () =>
      marketData
        ? marketData.wrappedTokens.map((outcomeId, index) => {
            const outcome = marketData.outcomes[index] ?? "";
            return {
              outcomeId,
              outcome,
              price: prices?.[index] ?? 0,
              probability: probabilities?.[index] ?? 0,
              collateral: marketData.collateralToken,
              outcomeIndex: index,
              symbol:
                data?.[index]?.symbol ?? outcome.slice(0, 11).toUpperCase(),
            };
          })
        : undefined,
    [marketData, prices, probabilities, data],
  );
  const setOutcomes = useRiskPredictionStore((state) => state.setOutcomes);
  useEffect(() => {
    setOutcomes(outcomes ?? []);
  }, [outcomes, setOutcomes]);
  if (!outcomes) return queryResult;
  return { ...queryResult, data: { ...queryResult.data, outcomes } };
};
