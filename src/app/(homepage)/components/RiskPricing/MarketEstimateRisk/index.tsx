import ShieldCheck from "@/assets/svg/shield-check.svg";

import { cn, formatPd } from "@/utils";

import { logScalePercent, zoneAxis, zones } from "../constants";
import RiskZoneBar from "../RiskZoneBar";

export type AssetRisk = {
  symbol: string;
  risk: number;
  quarterlyRisk?: number;
};

type MarketEstimateRiskProps = {
  /** Already filtered to the visible set by the parent. */
  assets: AssetRisk[];
  /** Symbol -> colour, keyed on the full asset list so colours never shift. */
  colorOf: Map<string, string>;
  noToAllProbability?: number;
  noToAllQuarterlyProbability?: number;
};

/**
 * Past this much of the track, the bar-end readout would run off the right
 * edge, so it flips back over the bar. A flipped readout also moves above the
 * bar: kept level with it, the bar would strike through both lines.
 */
const FLIP_LABEL_AFTER_PERCENT = 55;

/** Left label gutter, kept in sync between the grid lines, bars and zone bar. */
const GUTTER = "ml-20 md:ml-32";
const GUTTER_LEFT = "left-20 md:left-32";
const LABEL_WIDTH = "w-20 md:w-32";

export default function MarketEstimateRisk({
  assets,
  colorOf,
  noToAllProbability,
  noToAllQuarterlyProbability,
}: MarketEstimateRiskProps) {
  if (assets.length === 0) {
    return (
      <div className="text-klerosUIComponentsSecondaryText border-klerosUIComponentsStroke flex h-96 w-full items-center justify-center rounded-xl border border-dashed text-sm">
        No assets selected — pick a category or asset above to plot it.
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="relative">
        {/* Grid lines (offset by the left label gutter; the right gutter
            matches the scrollbar so lines stay aligned with bars/zones) */}
        <div
          className={cn(
            "pointer-events-none absolute top-0 right-2 bottom-0",
            GUTTER_LEFT,
          )}
        >
          {zoneAxis.map((value, index) => (
            <div
              key={value}
              className="border-klerosUIComponentsStroke absolute top-0 h-full border-l border-dashed"
              style={{
                left:
                  index === zoneAxis.length - 1
                    ? `calc(${logScalePercent(value)}% - 1px)`
                    : `${logScalePercent(value)}%`,
              }}
            />
          ))}
        </div>

        {/* Assets (scrollable; a stable gutter keeps the plot width
            constant whether or not the scrollbar is visible, and the top
            padding keeps the first row's raised readout off the clip edge) */}
        <div className="[&::-webkit-scrollbar-thumb]:bg-klerosUIComponentsStroke max-h-[28rem] space-y-8 overflow-y-auto pt-8 [scrollbar-gutter:stable] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
          {assets.map((asset) => {
            const assetColor = colorOf.get(asset.symbol);
            const widthPercent = logScalePercent(asset.risk);
            const flipLabel = widthPercent > FLIP_LABEL_AFTER_PERCENT;

            /** Gradient stops relative to the asset width. */
            const gradientStops = zones
              .flatMap((zone) => {
                if (zone.from >= asset.risk) return [];

                const clampedTo = Math.min(zone.to, asset.risk);

                /**
                 * IMPORTANT:
                 * Normalize against asset risk,
                 * not global MAX_RISK
                 */
                const start =
                  (logScalePercent(zone.from) / logScalePercent(asset.risk)) *
                  100;

                const end =
                  (logScalePercent(clampedTo) / logScalePercent(asset.risk)) *
                  100;

                const [from, to] = zone.colors;

                return [`${from} ${start}%`, `${to} ${end}%`];
              })
              .join(", ");

            return (
              <div key={asset.symbol} className="flex h-8 items-center">
                {/* Asset name label (left of the chart) */}
                <div
                  className={cn(
                    "text-klerosUIComponentsPrimaryText shrink-0 truncate pr-3 text-sm font-semibold md:text-base",
                    LABEL_WIDTH,
                  )}
                  title={asset.symbol}
                >
                  {asset.symbol}
                </div>

                {/* Plotting area (shares its 0-100% scale with the grid
                    lines and zone legend) */}
                <div className="relative h-8 flex-1">
                  {/* Gradient track */}
                  <div
                    className="absolute top-1/2 h-3 -translate-y-1/2 rounded-full"
                    style={{
                      width: `${widthPercent}%`,
                      background: `linear-gradient(to right, ${gradientStops})`,
                    }}
                  />

                  {/* Overlay */}
                  <div
                    className="absolute top-1/2 h-3 -translate-y-1/2 rounded-full opacity-70"
                    style={{
                      width: `${widthPercent}%`,
                      backgroundColor: assetColor,
                    }}
                  />

                  {/* Annualized / quarterly PD at bar end */}
                  <div
                    className={cn(
                      "absolute z-10 flex flex-col leading-tight whitespace-nowrap",
                      flipLabel
                        ? "bottom-1/2 mb-2.5 -translate-x-full text-right"
                        : "top-1/2 -translate-y-1/2 pl-2",
                    )}
                    style={{ left: `${widthPercent}%` }}
                  >
                    <span className="text-klerosUIComponentsPrimaryText text-xs font-semibold">
                      PD (Ann.): {formatPd(asset.risk)}
                    </span>
                    {asset.quarterlyRisk !== undefined && (
                      <span className="text-klerosUIComponentsSecondaryText text-xs font-medium">
                        PD (Quart.): {formatPd(asset.quarterlyRisk)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Zones: always visible below the scroll area. Same left/right gutters
          as the scroll region so the axis stays aligned. */}
      <RiskZoneBar size="lg" className={cn("mt-12 mr-2", GUTTER)} />

      {noToAllProbability !== undefined && (
        /* A full-width band rather than a card: rules top and bottom, no sides
           and no radius. As a bordered card it read as one more item in the
           list above it, when it is really the summary OF that list.

           Only the shield is green. The figures take the ordinary primary and
           secondary text colours - this is a readout under a chart, not a
           control, and the sticky NoToAllStrip is where the same number is
           editable. */
        <div className="bg-klerosUIComponentsSuccessLight border-green-2 dark:border-klerosUIComponentsSuccess mt-10 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-y px-4 py-1">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {/* h-8 w-auto, not size-8: the shield is 27.7x32, and forcing it
                  square would letterbox it inside its own box. */}
              <ShieldCheck aria-hidden="true" className="h-8 w-auto shrink-0" />

              {/* tabular-nums: these digits are redrawn as the user drags the
                  sliders above, and proportional figures make the row twitch. */}
              <div className="flex items-center gap-1">
                <span className="text-klerosUIComponentsPrimaryText text-2xl font-semibold tabular-nums">
                  {formatPd(noToAllProbability)}
                </span>
                <span className="text-klerosUIComponentsSecondaryText text-xs">
                  (Ann.)
                </span>
              </div>
            </div>

            {noToAllQuarterlyProbability !== undefined && (
              <div className="flex items-center gap-1">
                <span className="text-klerosUIComponentsPrimaryText text-xs font-semibold tabular-nums">
                  {formatPd(noToAllQuarterlyProbability)}
                </span>
                <span className="text-klerosUIComponentsSecondaryText text-xs">
                  (Quart.)
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-klerosUIComponentsSecondaryText text-xs">
              Chance that no listed asset defaults
            </span>
            <span className="text-klerosUIComponentsSecondaryText text-xs">
              &gt;
            </span>
            <span className="text-klerosUIComponentsPrimaryText text-sm font-semibold">
              No to All
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
