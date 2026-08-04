import clsx from "clsx";
import { mainnet } from "viem/chains";

import { useCredoraAssets } from "@/hooks/useCredoraAssets";
import { RiskPricingOutcome } from "@/hooks/useMarketData";

import WithHelpTooltip from "@/components/WithHelpTooltip";

import ChartBar from "@/assets/svg/chart-bar.svg";
import CheckOutline from "@/assets/svg/check-outline.svg";
import ExternalArrow from "@/assets/svg/external-arrow.svg";

import { formatPd } from "@/utils";

import { RiskAssetDetailsMapping, RiskProfileIcon } from "@/consts/markets";

import { BLOCK_EXPLORER_URLS, PRIORITY_METRICS } from "./constants";

const shortenHash = (value: string) =>
  value.length > 16 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value;

export default function RiskPanel({
  outcome,
}: {
  outcome: RiskPricingOutcome;
}) {
  const key = outcome.outcome.toLowerCase();
  const fallback = RiskAssetDetailsMapping[key];
  const address = fallback?.address?.toLowerCase();
  const { data, isError } = useCredoraAssets();
  const live = address ? data?.[address] : undefined;
  const riskData = live ?? fallback;
  // Falling back to the bundled snapshot is fine, but say so rather than
  // presenting month-old numbers as current.
  const isStale = isError && !live && Boolean(fallback);

  if (!riskData)
    return (
      <div className="border-klerosUIComponentsStroke text-klerosUIComponentsSecondaryText w-full rounded-xl border border-dashed px-6 py-8 text-center text-sm">
        No risk data available for this asset.
      </div>
    );

  // Credora's headline metrics lead the grid; everything else keeps the order
  // it arrived in.
  const sortedProfiles = [...riskData.risk_profiles].sort((a, b) => {
    const ai = PRIORITY_METRICS.indexOf(a.metric_name);
    const bi = PRIORITY_METRICS.indexOf(b.metric_name);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  return (
    <div className="border-klerosUIComponentsStroke bg-klerosUIComponentsWhiteBackground text-klerosUIComponentsPrimaryText w-full max-w-[1080px] rounded-xl border">
      {/* Header */}
      <div className="border-b-klerosUIComponentsStroke flex flex-wrap items-center justify-between gap-2 border-b px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="bg-klerosUIComponentsMediumBlue flex size-8 items-center justify-center rounded-full">
            <ChartBar className="[&_path]:fill-klerosUIComponentsPrimaryBlue size-4" />
          </div>

          <h3 className="text-lg font-semibold">Risk Panel</h3>
        </div>

        <p className="text-klerosUIComponentsSecondaryText text-sm">
          {isStale
            ? "Live data unavailable — showing last known values"
            : "Data provided by Credora"}
        </p>
      </div>

      {/* Score */}
      <div className="border-b-klerosUIComponentsStroke border-b px-6 py-5">
        <div className="flex items-center gap-5">
          <div className="flex size-20 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-3xl font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            {riskData.metrics_rating}
          </div>

          <div>
            <div className="text-2xl leading-none font-semibold">
              {riskData.rating_type}
            </div>

            <div className="text-klerosUIComponentsSecondaryText mt-2 text-sm">
              {riskData.avg_risk_score}
            </div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="border-b-klerosUIComponentsStroke border-b px-6 py-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 lg:gap-6">
          {sortedProfiles.map((item) => {
            const Icon = RiskProfileIcon[item.metric_name];
            const isPriority = PRIORITY_METRICS.includes(item.metric_name);
            return (
              <div
                key={item.metric_name}
                className={clsx(
                  "min-w-0",
                  isPriority &&
                    "bg-klerosUIComponentsLightBackground -m-2 rounded-lg p-2",
                )}
              >
                <div className="flex items-start gap-2">
                  {Icon ? <Icon className="size-4 shrink-0" /> : null}

                  <div className="min-w-0">
                    <div
                      className={clsx(
                        "flex items-center text-lg leading-none",
                        isPriority ? "font-bold" : "font-medium",
                      )}
                    >
                      {item.score ?? "-"}/{item.max_score}
                      <WithHelpTooltip
                        tooltipMsg={item.content}
                        place="bottom"
                      />
                    </div>

                    <div
                      className={clsx(
                        "mt-1 text-xs leading-snug",
                        isPriority
                          ? "font-bold"
                          : "text-klerosUIComponentsSecondaryText",
                      )}
                    >
                      {item.metric_name}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Consensus PD */}
      <div className="px-6 py-5">
        <div className="flex items-center gap-3 rounded-lg bg-emerald-100 px-5 py-3 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          <ChartBar
            aria-hidden="true"
            className="size-5 shrink-0 [&_path]:fill-current"
          />

          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-xl font-semibold">
              {formatPd(outcome.probability * 100)}
            </span>

            <span className="text-sm opacity-70">Consensus PD (Ann.)</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 pb-6">
        <div className="bg-klerosUIComponentsLightBackground flex flex-wrap items-center gap-x-8 gap-y-4 rounded-lg px-6 py-5">
          <a
            href={`https://app.credora.network/assets/${key}`}
            target="_blank"
            rel="noreferrer noopener"
            className="text-klerosUIComponentsPrimaryBlue flex items-center gap-2 text-base font-medium transition-opacity hover:opacity-80"
          >
            View on Credora
            <ExternalArrow className="size-4" />
          </a>

          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
            <span className="flex items-center gap-3 text-base font-medium">
              {/* Already a circled check in the theme blue - no wrapper needed. */}
              <CheckOutline aria-hidden="true" className="size-7 shrink-0" />
              Ethereum Contract
            </span>

            <div className="flex min-w-0 items-center">
              <a
                className="text-klerosUIComponentsSecondaryText hover:text-klerosUIComponentsPrimaryBlue font-mono text-sm transition-colors"
                title={riskData.address}
                href={`${BLOCK_EXPLORER_URLS[mainnet.id]}/address/${riskData.address}`}
                target="_blank"
                rel="noreferrer noopener"
              >
                {shortenHash(riskData.address)}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
