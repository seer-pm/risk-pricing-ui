import { zoneAxis, zones } from "../constants";

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
  maxRisk?: number;
  noToAllProbability?: number;
  noToAllQuarterlyProbability?: number;
};

export default function MarketEstimateRisk({
  assets,
  colorOf,
  maxRisk = 100,
  noToAllProbability,
  noToAllQuarterlyProbability,
}: MarketEstimateRiskProps) {
  /**
   * Log scale mapping
   * Keeps low-end ranges visually meaningful
   */
  const scale = (value: number) => {
    if (value <= 0) return 0;

    return Math.log(value + 1) / Math.log(maxRisk + 1);
  };

  /**
   * Convert value -> percent on screen
   */
  const scaledPercent = (value: number) => scale(value) * 100;

  return (
    <>
      {/* Chart */}
      <div className="w-full">
        <div>
          {/* Assets viewport: scrolls vertically so the zone axis below stays
              in view even with many (25+) assets. */}
          <div className="relative">
            {/* Grid lines (offset by the left label gutter; the right gutter
                matches the scrollbar so lines stay aligned with bars/zones) */}
            <div className="pointer-events-none absolute top-0 right-2 bottom-0 left-32">
              {zoneAxis.map((value, index) => (
                <div
                  key={value}
                  className="absolute top-0 border-l border-dashed border-neutral-300"
                  style={{
                    left:
                      index === zoneAxis.length - 1
                        ? `calc(${scaledPercent(value)}% - 1px)`
                        : `${scaledPercent(value)}%`,
                    height: "100%",
                  }}
                />
              ))}
            </div>

            {/* Assets (scrollable; a stable gutter keeps the plot width
                constant whether or not the scrollbar is visible) */}
            <div className="max-h-[28rem] space-y-8 overflow-y-auto [scrollbar-gutter:stable] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-neutral-300 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-600 [&::-webkit-scrollbar-track]:bg-transparent">
              {assets.map((asset) => {
                const assetColor = colorOf.get(asset.symbol);

                /**
                 * Track width uses LOG SCALE
                 */
                const widthPercent = scaledPercent(asset.risk);

                /**
                 * Gradient stops relative to the asset width
                 */
                const gradientStops = zones
                  .flatMap((zone) => {
                    if (zone.from >= asset.risk) return [];

                    const clampedTo = Math.min(zone.to, asset.risk);

                    /**
                     * IMPORTANT:
                     * Normalize against asset risk,
                     * not global maxRisk
                     */
                    const start = (scale(zone.from) / scale(asset.risk)) * 100;

                    const end = (scale(clampedTo) / scale(asset.risk)) * 100;

                    const [from, to] = zone.colors;

                    return [`${from} ${start}%`, `${to} ${end}%`];
                  })
                  .join(", ");

                return (
                  <div key={asset.symbol} className="flex h-8 items-center">
                    {/* Asset name label (left of the chart) */}
                    <div className="w-32 shrink-0 truncate pr-3 text-base font-semibold text-black dark:text-white">
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
                        className="absolute top-1/2 z-10 flex -translate-y-1/2 flex-col pl-2 leading-tight whitespace-nowrap"
                        style={{
                          left: `${widthPercent}%`,
                        }}
                      >
                        <span className="text-klerosUIComponentsPrimaryText text-xs font-semibold">
                          PD (Ann.): {asset.risk}%
                        </span>
                        {asset.quarterlyRisk !== undefined && (
                          <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                            PD (Quart.): {asset.quarterlyRisk}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Zones: always visible below the scroll area. Same left/right
              gutters as the scroll region so the axis stays aligned. */}
          <div className="relative mt-10 mr-2 ml-32">
            <div className="overflow-visible rounded-xl">
              <div className="flex h-24 overflow-visible">
                {zones.map((zone) => {
                  /**
                   * Zone width also uses LOG SCALE
                   */
                  const left = scale(zone.from);
                  const right = scale(zone.to);

                  const width = (right - left) * 100;

                  return (
                    <div
                      key={zone.label}
                      className="relative flex flex-col items-center justify-center overflow-visible"
                      style={{
                        width: `${width}%`,
                        background: `linear-gradient(to right, ${zone.colors[0]}, ${zone.colors[1]})`,
                      }}
                    >
                      {/* Emoji */}
                      <div className="absolute -top-5 z-20 rounded-full border-[4px] border-white bg-white text-3xl dark:border-neutral-900 dark:bg-neutral-900">
                        {zone.emoji}
                      </div>

                      {/* Label */}
                      <div className="mt-5 text-sm font-medium text-neutral-800">
                        {zone.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Axis */}
            <div className="relative mt-3 h-5 text-sm text-neutral-500 dark:text-neutral-400">
              {zoneAxis.map((value) => (
                <div
                  key={value}
                  className="absolute -translate-x-1/2"
                  style={{
                    left: `${scaledPercent(value)}%`,
                  }}
                >
                  {value}
                </div>
              ))}
            </div>
          </div>
          {noToAllProbability !== undefined && (
            <div className="mt-10 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    NO TO ALL
                  </div>

                  <div className="mt-1 text-xs text-emerald-600 dark:text-emerald-500">
                    Chance that no listed asset defaults
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-2xl">🛡️</span>

                  <div className="flex flex-col items-end leading-tight">
                    <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                      {noToAllProbability}%{" "}
                      <span className="text-xs font-semibold">(Ann.)</span>
                    </span>
                    {noToAllQuarterlyProbability !== undefined && (
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-500">
                        {noToAllQuarterlyProbability}% (Quart.)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
