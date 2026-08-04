import { Tooltip } from "@kleros/ui-components-library";
import clsx from "clsx";
import { mainnet } from "viem/chains";

import { useCredoraAssets } from "@/hooks/useCredoraAssets";
import { RiskPricingOutcome } from "@/hooks/useMarketData";

import HelpIcon from "@/assets/menu-icons/help.svg";

import { RiskAssetDetailsMapping, RiskProfileIcon } from "@/consts/markets";

import { BLOCK_EXPLORER_URLS, PRIORITY_METRICS } from "./constants";

export default function RiskPanel({
  outcome,
}: {
  outcome: RiskPricingOutcome;
}) {
  const key = outcome.outcome.toLowerCase();
  const fallback = RiskAssetDetailsMapping[key];
  const address = fallback?.address?.toLowerCase();
  const { data } = useCredoraAssets();
  const riskData = (address ? data?.[address] : undefined) ?? fallback;
  if (!riskData) return <p>No data for this asset</p>;

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
    <div className="w-full max-w-[1080px] rounded-[20px] border border-black/10 bg-white text-black dark:border-white/10 dark:bg-neutral-900 dark:text-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-black/10 px-6 py-5 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ff7b7b]">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              className="text-white"
            >
              <path
                d="M5 15L10 10L14 14L20 8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <h2 className="text-[24px] font-semibold tracking-[-0.02em]">
            Risk Panel
          </h2>
        </div>

        <p className="text-sm text-black/50 dark:text-white/50">
          Data provided by Credora
        </p>
      </div>

      {/* Score Section */}
      <div className="border-b border-black/10 px-6 py-5 dark:border-white/10">
        <div className="flex items-center gap-5">
          <div className="flex h-[80px] w-[80px] items-center justify-center rounded-[8px] bg-[#d5f4d7] text-[32px] font-semibold text-[#2d4d31] dark:bg-[#1a3d1f] dark:text-[#8fdca0]">
            {riskData.metrics_rating}
          </div>

          <div>
            <div className="text-[24px] leading-none font-semibold">
              {riskData.rating_type}
            </div>

            <div className="mt-2 text-[15px] text-black/50 dark:text-white/50">
              {riskData.avg_risk_score}
            </div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="border-b border-black/10 px-6 py-5 dark:border-white/10">
        <div className="grid grid-cols-6 gap-6">
          {sortedProfiles.map((item) => {
            const Icon = RiskProfileIcon[item.metric_name];
            const isPriority = PRIORITY_METRICS.includes(item.metric_name);
            return (
              <div
                key={item.metric_name}
                className={clsx(
                  "min-w-0",
                  isPriority &&
                    "-m-2 rounded-lg bg-black/[0.04] p-2 dark:bg-white/8",
                )}
              >
                <div className="flex items-start gap-2">
                  {Icon ? (
                    <Icon width={16} height={16} className="shrink-0" />
                  ) : null}

                  <div>
                    <div
                      className={clsx(
                        "text-[18px] leading-none",
                        isPriority ? "font-bold" : "font-medium",
                      )}
                    >
                      {item.score ?? "-"}/{item.max_score}
                      <Tooltip
                        text={item.content}
                        place="bottom"
                        wrapperProps={{ className: "inline-flex items-center" }}
                        className="max-w-94 [&>small]:text-sm"
                      >
                        <HelpIcon className="ml-1 inline-block size-3.5" />
                      </Tooltip>
                    </div>

                    <div
                      className={clsx(
                        "mt-1 text-[13px] leading-snug",
                        isPriority
                          ? "font-bold text-black dark:text-white"
                          : "text-black/50 dark:text-white/50",
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
        <div className="flex items-center gap-3 rounded-[8px] bg-[#d8f4d8] px-5 py-3 text-[#29482d] dark:bg-[#1a3d1f] dark:text-[#8fdca0]">
          <span className="text-[24px]">🗠</span>

          <div className="flex items-baseline gap-2">
            <span className="text-[20px] font-semibold">
              {Number(outcome.probability * 100).toFixed(2)}%
            </span>

            <span className="text-[14px] text-[#29482d]/70 dark:text-[#8fdca0]/70">
              Consensus PD (Ann.)
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 pb-6">
        <div className="flex items-center gap-8 rounded-[6px] bg-[#f3f3f3] px-6 py-5 text-black dark:bg-neutral-800 dark:text-white">
          <button className="flex items-center gap-2 text-[16px] font-medium text-[#1570ef] transition-opacity hover:opacity-80">
            <a
              href={`https://app.credora.network/assets/${key}`}
              target="_blank"
              rel="noreferrer noopener"
            >
              View on Credora
            </a>

            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M7 17L17 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M9 7H17V15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#00a6c7] text-sm text-white">
              ✓
            </div>

            <div className="flex items-center gap-4">
              <span className="text-[16px] font-medium text-[#3b3b3b] dark:text-neutral-300">
                Ethereum Contract
              </span>

              <a
                className="text-[14px] text-[#9c9c9c] dark:text-neutral-500"
                href={`${BLOCK_EXPLORER_URLS[mainnet.id]}/address/${riskData.address}`}
                target="_blank"
                rel="noreferrer noopener"
              >
                {riskData.address}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
