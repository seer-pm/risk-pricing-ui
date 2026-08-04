"use client";

import { useCallback, useMemo, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { UTCTimestamp } from "lightweight-charts";

import { buildAssetColorMap } from "@/app/(homepage)/components/RiskPricing/constants";

import {
  buildGrid,
  buildPriceMatrix,
  GRID_STEP_SECONDS,
} from "@/utils/riskChartData";

import { endTime, startTime } from "@/consts/markets";

import { quarterlyToYearly, solveProbsBatchAsync } from "./useImpliedProbs";
import { useRawMarketData } from "./useMarketData";

export type PdSeries = {
  symbol: string;
  color: string;
  data: Array<{ time: UTCTimestamp; value: number }>;
};

/**
 * Yearly PD per asset over time, for the "Over Time" chart mode.
 *
 * Reuses the pool history already fetched and cached by useMarketData - the
 * chart costs no extra network request, only compute. That compute is a solver
 * run per grid point, so it is deliberately gated behind `enabled` and cached
 * with staleTime: Infinity: opening the tab solves once per session, and
 * switching tabs or toggling the legend never re-solves.
 */
export const useRiskPdHistory = (enabled: boolean) => {
  const { data } = useRawMarketData();
  const marketData = data?.marketData;
  const chartData = data?.chartData;

  const [progress, setProgress] = useState(0);
  const onProgress = useCallback(
    ({ progress: p }: { progress: number }) => setProgress(p),
    [],
  );

  // Assets only: the last two outcomes are "No To All" and "Invalid", matching
  // the bar chart's slice(0, -2). The solver's targetY argument is not part of
  // the solved system, so those columns are not needed here at all.
  const assets = useMemo(() => {
    if (!marketData || !chartData || chartData.length < 3) return undefined;
    return {
      chartData: chartData.slice(0, -2),
      wrappedTokens: marketData.wrappedTokens.slice(0, -2),
      symbols: marketData.outcomes.slice(0, -2),
    };
  }, [marketData, chartData]);

  const resampled = useMemo(() => {
    if (!assets) return undefined;
    const grid = buildGrid(
      startTime,
      Math.min(Math.floor(Date.now() / 1000), endTime),
    );
    return buildPriceMatrix(assets.chartData, assets.wrappedTokens, grid);
  }, [assets]);

  const hasData = !!resampled?.matrix.length;

  // Bucket the newest timestamp to the grid so the API route's 5-minute
  // revalidation does not retrigger a full solve when no new grid point exists.
  const fingerprint = useMemo(() => {
    if (!resampled?.times.length) return "";
    const last = resampled.times[resampled.times.length - 1];
    const bucket = Math.floor(last / GRID_STEP_SECONDS);
    return `${resampled.times.length}:${bucket}`;
  }, [resampled]);

  const query = useQuery({
    queryKey: ["riskPdHistory", fingerprint],
    queryFn: ({ signal }) => {
      setProgress(0);
      return solveProbsBatchAsync(resampled!.matrix, { signal, onProgress });
    },
    enabled: enabled && hasData,
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    retry: false,
  });

  const series = useMemo((): PdSeries[] | undefined => {
    if (!query.data || !resampled || !assets) return undefined;

    if (process.env.NODE_ENV !== "production") {
      const worstErr = Math.max(...query.data.maxErrs);
      if (worstErr > 1e-9) {
        console.warn(
          "[useRiskPdHistory] solver residual",
          worstErr,
          "exceeds tolerance - warm-start drift may be corrupting the series",
        );
      }
    }

    // Same asset list, same order as the bars, so a line and its bar share a
    // colour.
    const colorOf = buildAssetColorMap(assets.symbols);

    return assets.symbols.map((symbol, index) => ({
      symbol,
      color: colorOf.get(symbol)!,
      data: resampled.times.map((time, t) => ({
        time: time as UTCTimestamp,
        // Same conversion the bars use, so the last point lands on the bar value.
        value: quarterlyToYearly(query.data.probs[t][index]) * 100,
      })),
    }));
  }, [query.data, resampled, assets]);

  return {
    series,
    isLoading: enabled && hasData && (query.isPending || query.isFetching),
    // No overlapping price history to plot - a pool with no snapshots yet drops
    // the whole grid. Distinct from "loading" so the UI shows an empty state
    // instead of spinning at 0% forever.
    isEmpty: enabled && !hasData,
    progress,
    error: query.error?.message,
  };
};
