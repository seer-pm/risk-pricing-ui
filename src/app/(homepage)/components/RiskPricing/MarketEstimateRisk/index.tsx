import { cn, formatPd } from "@/utils";

import { logScalePercent } from "../constants";

export type AssetRisk = {
  symbol: string;
  risk: number;
  quarterlyRisk?: number;
};
type MarketEstimateRiskProps = {
  assets: AssetRisk[];
  colorOf: Map<string, string>;
  noToAllProbability?: number;
  noToAllQuarterlyProbability?: number;
};

export default function MarketEstimateRisk({
  assets,
  colorOf,
}: MarketEstimateRiskProps) {
  if (!assets.length)
    return (
      <div className="text-seer-muted flex min-h-60 items-center justify-center text-sm">
        No assets selected: pick a category or asset above to plot it.
      </div>
    );
  return (
    <div>
      <div
        className="risk-estimate-columns border-seer-border text-seer-muted border-b pb-2 text-xs"
        aria-hidden="true"
      >
        <span>Asset</span>
        <span className="text-right">PD (Ann.)</span>
        <span className="text-right">PD (Quart.)</span>
        <span className="hidden pl-5 sm:block">
          Annualized probability · log scale
        </span>
      </div>
      <div
        className="max-h-[440px] overflow-y-auto overscroll-contain pr-2 [scrollbar-gutter:stable]"
        role="region"
        aria-label="Asset default probabilities"
        tabIndex={0}
      >
        <table className="text-seer-text w-full table-fixed text-sm">
          <caption className="sr-only">
            Market estimates of default probability. Annualized and quarterly
            values by asset.
          </caption>
          <thead className="sr-only">
            <tr>
              <th scope="col">Asset</th>
              <th scope="col">PD (Ann.)</th>
              <th scope="col">PD (Quart.)</th>
              <th scope="col">Annualized probability on a logarithmic scale</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => (
              <tr
                key={asset.symbol}
                className="risk-estimate-columns border-seer-border/60 hover:bg-seer-surface-raised border-b last:border-0"
              >
                <th
                  scope="row"
                  className="truncate py-3 text-left font-semibold"
                  title={asset.symbol}
                >
                  {asset.symbol}
                </th>
                <td className="py-3 text-right tabular-nums">
                  {formatPd(asset.risk)}
                </td>
                <td className="text-seer-muted py-3 text-right tabular-nums">
                  {asset.quarterlyRisk === undefined
                    ? "Unavailable"
                    : formatPd(asset.quarterlyRisk)}
                </td>
                <td
                  className="hidden items-center pl-5 sm:flex"
                  aria-hidden="true"
                >
                  <div className="bg-seer-surface-raised h-1.5 w-full rounded-full">
                    <div
                      className={cn("h-full min-w-px rounded-full")}
                      style={{
                        width: `${logScalePercent(asset.risk)}%`,
                        backgroundColor: colorOf.get(asset.symbol),
                      }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-seer-muted mt-3 text-xs">
        {assets.length} assets · Annualized and quarterly probability of default
      </p>
    </div>
  );
}
