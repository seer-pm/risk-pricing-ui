"use client";

import { useMemo, useState } from "react";

import { useRiskPdHistory } from "@/hooks/useRiskPdHistory";

import Loader from "@/components/Loader";

import ChartBarIcon from "@/assets/svg/chart-bar.svg";
import StatsBarIcon from "@/assets/svg/stats-bar.svg";

import { cn } from "@/utils";
import { getReadableTextColor } from "@/utils/getReadableTextColor";

import { FOCUS_RING } from "@/consts/styles";

import Chart from "../Chart";
import {
  ASSET_CATEGORIES,
  type AssetCategoryId,
  buildAssetColorMap,
  getAssetCategory,
} from "../RiskPricing/constants";
import MarketEstimateRisk, {
  type AssetRisk,
} from "../RiskPricing/MarketEstimateRisk";

export type RiskView = "bars" | "overTime";

const VIEWS: Array<{
  id: RiskView;
  label: string;
  Icon: React.FC<{ className?: string }>;
}> = [
  { id: "bars", label: "Risk bars", Icon: StatsBarIcon },
  { id: "overTime", label: "Over time", Icon: ChartBarIcon },
];

type CategoryFilter = AssetCategoryId | "all";

interface IMarketEstimate {
  assets: AssetRisk[];
  noToAllProbability?: number;
  noToAllQuarterlyProbability?: number;
}

/**
 * Owns everything the two views share - title, asset legend, and the view
 * toggle - so switching modes only swaps the plot underneath. Asset visibility
 * and colours are held here rather than per-view, which is what keeps a hidden
 * asset hidden (and every asset the same colour) across a mode switch.
 */
const MarketEstimate: React.FC<IMarketEstimate> = ({
  assets,
  noToAllProbability,
  noToAllQuarterlyProbability,
}) => {
  const [view, setView] = useState<RiskView>("bars");

  // Gated on the view: the solve costs nothing for users who never open the
  // time-series tab, and is cached for the session once they do.
  const {
    series,
    isLoading: isChartLoading,
    isEmpty: isChartEmpty,
    error: chartError,
    progress: chartProgress,
  } = useRiskPdHistory(view === "overTime");

  const [hiddenAssets, setHiddenAssets] = useState<Set<string>>(new Set());
  const [hoveredSymbol, setHoveredSymbol] = useState<string | null>(null);

  const toggleAsset = (symbol: string) =>
    setHiddenAssets((prev) => {
      const next = new Set(prev);
      if (next.has(symbol)) next.delete(symbol);
      else next.add(symbol);
      return next;
    });

  // Only offer a category that the market actually lists.
  const categoryCounts = useMemo(() => {
    const counts = new Map<AssetCategoryId, number>();
    assets.forEach((asset) => {
      const { id } = getAssetCategory(asset.symbol);
      counts.set(id, (counts.get(id) ?? 0) + 1);
    });
    return counts;
  }, [assets]);

  // Picking a category is a bulk legend selection: its assets are selected and
  // every other one is deselected, so the two controls always agree.
  const selectCategory = (id: CategoryFilter) =>
    setHiddenAssets(
      id === "all"
        ? new Set()
        : new Set(
            assets
              .filter((a) => getAssetCategory(a.symbol).id !== id)
              .map((a) => a.symbol),
          ),
    );

  // Derived from the legend rather than stored, so toggling a single chip drops
  // the category highlight instead of leaving it lying about the selection.
  const activeCategory = useMemo((): CategoryFilter | null => {
    if (hiddenAssets.size === 0) return "all";
    const visible = assets.filter((a) => !hiddenAssets.has(a.symbol));
    if (!visible.length) return null;
    const { id } = getAssetCategory(visible[0].symbol);
    const isWholeCategory =
      visible.length === categoryCounts.get(id) &&
      visible.every((a) => getAssetCategory(a.symbol).id === id);
    return isWholeCategory ? id : null;
  }, [assets, hiddenAssets, categoryCounts]);

  const allHidden = hiddenAssets.size === assets.length && assets.length > 0;
  const toggleAll = () =>
    setHiddenAssets(
      allHidden ? new Set() : new Set(assets.map((a) => a.symbol)),
    );

  const colorOf = useMemo(
    () => buildAssetColorMap(assets.map((a) => a.symbol)),
    [assets],
  );

  const visibleAssets = useMemo(
    () => assets.filter((a) => !hiddenAssets.has(a.symbol)),
    [assets, hiddenAssets],
  );

  const visibleSeries = useMemo(
    () => series?.filter((s) => !hiddenAssets.has(s.symbol)) ?? [],
    [series, hiddenAssets],
  );

  return (
    <div className="w-full">
      {/* Title + view toggle */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h2 className="text-klerosUIComponentsPrimaryText text-2xl font-semibold">
          Market Estimate Risk
        </h2>
        <div className="border-klerosUIComponentsStroke flex items-center gap-1.5 rounded-lg border p-1">
          {VIEWS.map(({ id, label, Icon }) => {
            const isActive = id === view;
            return (
              <button
                key={id}
                type="button"
                title={label}
                aria-label={label}
                aria-pressed={isActive}
                onClick={() => setView(id)}
                className={cn(
                  "flex cursor-pointer items-center justify-center gap-2 rounded-lg p-2 transition-colors",
                  FOCUS_RING,
                  // The icons hardcode a fill, so recolour their paths directly.
                  "[&_path]:fill-current",
                  isActive
                    ? "bg-klerosUIComponentsMediumBlue text-klerosUIComponentsPrimaryBlue ring-klerosUIComponentsPrimaryBlue ring-1"
                    : "text-klerosUIComponentsPrimaryText hover:text-klerosUIComponentsPrimaryBlue",
                )}
              >
                <Icon className="size-6" />
                <span className="hidden text-sm font-medium sm:inline">
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Category selector: a bulk control over the legend below */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {[
          { id: "all" as const, label: "All", count: assets.length, color: "" },
          ...ASSET_CATEGORIES.map(({ id, label, color }) => ({
            id,
            label,
            color,
            count: categoryCounts.get(id) ?? 0,
          })),
        ]
          .filter(({ count }) => count > 0)
          .map(({ id, label, count, color }) => {
            const isActive = id === activeCategory;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={isActive}
                onClick={() => selectCategory(id)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg border-2 px-3.5 py-2 text-sm font-semibold transition-colors",
                  FOCUS_RING,
                  isActive
                    ? "border-transparent"
                    : "border-klerosUIComponentsStroke text-klerosUIComponentsPrimaryText hover:border-klerosUIComponentsPrimaryBlue",
                  // "All" has no category colour of its own.
                  isActive &&
                    !color &&
                    "bg-klerosUIComponentsPrimaryBlue text-white",
                )}
                style={
                  isActive
                    ? {
                        backgroundColor: color || undefined,
                        color: color ? getReadableTextColor(color) : undefined,
                      }
                    : undefined
                }
              >
                {color ? (
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor: isActive ? "currentColor" : color,
                    }}
                  />
                ) : null}
                {label}
                <span className="text-xs font-semibold opacity-70">
                  {count}
                </span>
              </button>
            );
          })}
      </div>

      {/* Shared asset legend */}
      <div
        className="mb-6 flex flex-wrap gap-2"
        onMouseLeave={() => setHoveredSymbol(null)}
      >
        {assets.map((asset) => {
          const active = !hiddenAssets.has(asset.symbol);
          return (
            <button
              key={asset.symbol}
              type="button"
              aria-pressed={active}
              onClick={() => toggleAsset(asset.symbol)}
              onMouseEnter={() => setHoveredSymbol(asset.symbol)}
              className={cn(
                "cursor-pointer rounded-full border px-2 py-1 text-xs font-medium transition",
                FOCUS_RING,
                active
                  ? "border-transparent"
                  : "border-klerosUIComponentsStroke bg-klerosUIComponentsWhiteBackground text-klerosUIComponentsSecondaryText hover:border-klerosUIComponentsPrimaryBlue",
              )}
              // Category colours vary in lightness, so the label colour has to
              // follow the chip rather than always being white.
              style={
                active
                  ? {
                      backgroundColor: colorOf.get(asset.symbol),
                      color: getReadableTextColor(
                        colorOf.get(asset.symbol) ?? "#000000",
                      ),
                    }
                  : undefined
              }
            >
              {asset.symbol}
            </button>
          );
        })}

        <button
          type="button"
          onClick={toggleAll}
          className={cn(
            "border-klerosUIComponentsStroke bg-klerosUIComponentsWhiteBackground text-klerosUIComponentsSecondaryText hover:border-klerosUIComponentsPrimaryBlue hover:text-klerosUIComponentsPrimaryBlue cursor-pointer rounded-full border px-2 py-1 text-xs font-medium transition",
            FOCUS_RING,
          )}
        >
          {allHidden ? "Select all" : "Clear all"}
        </button>
      </div>

      {view === "bars" ? (
        <MarketEstimateRisk
          assets={visibleAssets}
          colorOf={colorOf}
          noToAllProbability={noToAllProbability}
          noToAllQuarterlyProbability={noToAllQuarterlyProbability}
        />
      ) : isChartEmpty || chartError ? (
        <div className="text-klerosUIComponentsSecondaryText flex h-100 w-full items-center justify-center text-sm">
          {chartError
            ? "Could not compute the probability history."
            : "Not enough price history yet to chart."}
        </div>
      ) : isChartLoading || !series ? (
        <div className="flex h-100 w-full flex-col items-center justify-center gap-3">
          <Loader />
          <span className="text-klerosUIComponentsSecondaryText text-sm">
            Solving implied probabilities… {Math.round(chartProgress * 100)}%
          </span>
        </div>
      ) : (
        <Chart series={visibleSeries} hoveredSymbol={hoveredSymbol} />
      )}
    </div>
  );
};

export default MarketEstimate;
