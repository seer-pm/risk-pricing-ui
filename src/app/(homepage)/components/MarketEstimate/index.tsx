"use client";

import { useMemo, useState } from "react";

import { useRiskPdHistory } from "@/hooks/useRiskPdHistory";

import Loader from "@/components/Loader";

import { cn, formatPd } from "@/utils";

import Chart from "../Chart";
import {
  ASSET_CATEGORIES,
  type AssetCategoryId,
  buildAssetColorMap,
  getAssetCategory,
  sortAssetsByCategory,
} from "../RiskPricing/constants";
import MarketEstimateRisk, {
  type AssetRisk,
} from "../RiskPricing/MarketEstimateRisk";

export type RiskView = "bars" | "overTime";
interface IMarketEstimate {
  assets: AssetRisk[];
  noToAllProbability?: number;
  noToAllQuarterlyProbability?: number;
}

export default function MarketEstimate({
  assets,
  noToAllProbability,
  noToAllQuarterlyProbability,
}: IMarketEstimate) {
  const [view, setView] = useState<RiskView>("bars");
  const [category, setCategory] = useState<AssetCategoryId | "all">("all");
  const [hoveredSymbol, setHoveredSymbol] = useState<string | null>(null);
  const [colorSlots, setColorSlots] = useState<(string | null)[]>(() =>
    assets.slice(0, 4).map((asset) => asset.symbol),
  );
  const { series, isLoading, isEmpty, error, progress } = useRiskPdHistory(
    view === "overTime",
  );
  const colorOf = useMemo(
    () =>
      buildAssetColorMap(
        assets.map((asset) => asset.symbol),
        colorSlots,
      ),
    [assets, colorSlots],
  );
  const visibleAssets = useMemo(
    () =>
      assets.filter(
        (asset) =>
          category === "all" || getAssetCategory(asset.symbol).id === category,
      ),
    [assets, category],
  );
  const visibleSeries = useMemo(
    () =>
      sortAssetsByCategory(
        (series ?? [])
          .filter((line) =>
            visibleAssets.some((asset) => asset.symbol === line.symbol),
          )
          .map((line) => ({ ...line, color: colorOf.get(line.symbol)! })),
        (line) => line.symbol,
      ),
    [series, visibleAssets, colorOf],
  );
  const toggleColor = (symbol: string) =>
    setColorSlots((current) => {
      const slots = [...current];
      const existing = slots.indexOf(symbol);
      if (existing >= 0) slots[existing] = null;
      else {
        const empty = slots.indexOf(null);
        if (empty >= 0) slots[empty] = symbol;
        else if (slots.length < 4) slots.push(symbol);
      }
      return slots;
    });

  return (
    <section
      id="market-estimates"
      aria-labelledby="estimates-title"
      className="rounded-surface border-seer-border bg-seer-surface scroll-mt-24 border p-4 sm:p-6"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2
          id="estimates-title"
          className="text-seer-text text-xl font-semibold"
        >
          Market estimates
        </h2>
        <div
          className="rounded-control bg-seer-surface-raised flex items-center gap-1 p-1"
          role="group"
          aria-label="Estimate view"
        >
          {(
            [
              { id: "bars", label: "Risk bars" },
              { id: "overTime", label: "Over time" },
            ] as const
          ).map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-pressed={view === id}
              onClick={() => setView(id)}
              className={cn(
                "seer-button seer-button-ghost seer-button-sm",
                view === id && "bg-seer-surface text-seer-accent-text",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {noToAllProbability !== undefined && (
        <div className="border-seer-border mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-y py-3 text-sm">
          <span className="text-seer-muted">
            Chance that no listed asset defaults
          </span>
          <span className="text-seer-text flex flex-wrap items-baseline gap-4">
            <span className="font-semibold">
              {formatPd(noToAllProbability)}{" "}
              <span className="text-seer-muted text-xs font-normal">
                (Ann.)
              </span>
            </span>
            {noToAllQuarterlyProbability !== undefined && (
              <span>
                {formatPd(noToAllQuarterlyProbability)}{" "}
                <span className="text-seer-muted text-xs">(Quart.)</span>
              </span>
            )}
          </span>
        </div>
      )}
      <div
        className="mb-4 flex flex-wrap items-center gap-1"
        role="group"
        aria-label="Asset category"
      >
        {[
          { id: "all" as const, label: "All", count: assets.length },
          ...ASSET_CATEGORIES.map(({ id, label }) => ({
            id,
            label,
            count: assets.filter(
              (asset) => getAssetCategory(asset.symbol).id === id,
            ).length,
          })),
        ]
          .filter(({ count }) => count > 0)
          .map(({ id, label, count }) => (
            <button
              type="button"
              key={id}
              onClick={() => {
                setCategory(id);
              }}
              aria-pressed={category === id}
              className={cn(
                "seer-button seer-button-ghost seer-button-sm",
                category === id
                  ? "bg-seer-accent-soft text-seer-accent-text"
                  : "text-seer-muted",
              )}
            >
              <span>
                {label} <span className="ml-1 font-normal">{count}</span>
              </span>
            </button>
          ))}
      </div>
      <details className="mb-5">
        <summary className="text-seer-accent-text w-fit cursor-pointer text-sm font-semibold">
          Choose chart highlights ({colorSlots.filter(Boolean).length}/4)
        </summary>
        <p className="text-seer-muted my-3 max-w-prose text-sm">
          Highlight up to four assets. Other assets remain visible as context.
          Deselect a highlighted asset to choose another.
        </p>
        <div
          className="flex flex-wrap gap-2"
          onMouseLeave={() => setHoveredSymbol(null)}
        >
          {assets.map((asset) => {
            const active = colorSlots.includes(asset.symbol);
            return (
              <button
                key={asset.symbol}
                type="button"
                aria-pressed={active}
                aria-label={`Highlight ${asset.symbol}`}
                disabled={!active && colorSlots.filter(Boolean).length >= 4}
                onClick={() => toggleColor(asset.symbol)}
                onMouseEnter={() => setHoveredSymbol(asset.symbol)}
                onFocus={() => setHoveredSymbol(asset.symbol)}
                onBlur={() => setHoveredSymbol(null)}
                className={cn(
                  "seer-button seer-button-ghost seer-button-sm border-seer-border border",
                  active && "bg-seer-accent-soft",
                )}
              >
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: colorOf.get(asset.symbol) }}
                  aria-hidden="true"
                />
                <span>{asset.symbol}</span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className="seer-button seer-button-ghost seer-button-sm mt-3"
          onClick={() => setColorSlots([null, null, null, null])}
        >
          Clear highlights
        </button>
      </details>
      {view === "overTime" && (
        <ul
          aria-label="Highlighted asset estimates"
          className="text-seer-text mb-4 flex flex-wrap gap-x-6 gap-y-2 text-sm"
        >
          {colorSlots.flatMap((symbol, slot) => {
            const asset = visibleAssets.find(
              (candidate) => candidate.symbol === symbol,
            );
            return asset
              ? [
                  <li key={symbol} className="flex items-center gap-2">
                    <span
                      className="size-2 rounded-full"
                      style={{
                        backgroundColor: `var(--seer-series-${slot + 1})`,
                      }}
                      aria-hidden="true"
                    />
                    <span className="font-semibold">{asset.symbol}</span>
                    <span>
                      {formatPd(asset.risk)}{" "}
                      <span className="text-seer-muted text-xs">(Ann.)</span>
                    </span>
                  </li>,
                ]
              : [];
          })}
        </ul>
      )}
      {view === "bars" ? (
        <MarketEstimateRisk assets={visibleAssets} colorOf={colorOf} />
      ) : isEmpty || error ? (
        <p className="text-seer-muted flex min-h-60 items-center justify-center text-sm">
          {error
            ? "Could not compute the probability history."
            : "Not enough price history yet to chart."}
        </p>
      ) : isLoading || !series ? (
        <div className="flex min-h-60 flex-col items-center justify-center gap-3">
          <Loader />
          <span className="text-seer-muted text-sm">
            Solving implied probabilities… {Math.round(progress * 100)}%
          </span>
        </div>
      ) : (
        <Chart series={visibleSeries} hoveredSymbol={hoveredSymbol} />
      )}
    </section>
  );
}
