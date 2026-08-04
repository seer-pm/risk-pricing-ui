import { Tooltip } from "@kleros/ui-components-library";
import clsx from "clsx";
import Image from "next/image";

import { useAssetColorMap } from "@/hooks/useAssetColorMap";
import { useRawMarketData } from "@/hooks/useMarketData";
import { useRiskMarketResolution } from "@/hooks/useRiskMarketResolution";

import SeerLogo from "@/components/SeerLogo";

import HelpIcon from "@/assets/menu-icons/help.svg";
import SeerHeaderBackground from "@/assets/png/seer-header-bg.png";
import ChartBar from "@/assets/svg/chart-bar.svg";

import { cn } from "@/utils";
import { getReadableTextColor } from "@/utils/getReadableTextColor";

import { endTime, marketMetadata } from "@/consts/markets";

import { assetColors } from "../RiskPricing/constants";

import Countdown from "./Countdown";

const defaultDefinition = (
  <>
    Default according to Risk Pricing definition includes:
    <br />• <span className="font-bold">Redemption Failure:</span> inability to
    redeem the asset at expected value for 2 weeks
    <br />• <span className="font-bold">Reserve Insolvency:</span> reserves fall
    1% below issuance value for 7+ days
    <br />• <span className="font-bold">Other structural failures</span>{" "}
    relevant to token mechanics (wrapped assets, LSTs, fiat-backed stablecoins)
    <br />
    <br />
    <span className="font-bold">
      Only defaults occurring during Q3 2026 count.
    </span>{" "}
    Defaults caused by events prior to Q3 do not count.
  </>
) as unknown as string;

const Header: React.FC = () => {
  const { data } = useRawMarketData();
  const colorOf = useAssetColorMap();
  const {
    isResolved,
    payoutFractions,
    isLoading: isLoadingResolution,
  } = useRiskMarketResolution();

  const winningOutcomes =
    isResolved && payoutFractions
      ? (data?.marketData?.outcomes ?? [])
          .map((outcome, index) => ({
            outcome,
            index,
            payoutFraction: payoutFractions[index] ?? 0,
          }))
          .filter(({ payoutFraction }) => payoutFraction > 0)
      : [];

  return (
    <div className="flex flex-col items-start gap-4">
      <h1 className="text-klerosUIComponentsPrimaryText text-2xl font-semibold">
        {marketMetadata.name}
      </h1>
      <div className="flex flex-wrap gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <ChartBar className="size-3.5" />
          <span className="text-klerosUIComponentsSecondaryText text-sm">
            Trading Period:
          </span>
          <span className="text-klerosUIComponentsPrimaryText text-sm font-semibold">
            Until{" "}
            {new Date(endTime * 1000).toLocaleString("en-GB", {
              timeZone: "UTC",
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }) + " UTC"}
          </span>
        </div>
        <Countdown />
      </div>

      <div
        className={clsx(
          "relative mt-8 box-border w-full overflow-hidden rounded-xl",
          "border-gradient-purple-blue",
          "flex flex-col gap-2",
        )}
      >
        <Image
          src={SeerHeaderBackground}
          alt="Seer header background"
          className="absolute -z-2 size-full object-cover max-md:opacity-35"
        />
        <div className="flex size-full flex-wrap items-center gap-6 px-6 pt-3.75">
          <SeerLogo />
          <p className="text-klerosUIComponentsPrimaryText text-base">
            What is the yearly Probability of{" "}
            <Tooltip
              text={defaultDefinition}
              place="bottom"
              wrapperProps={{ className: "inline-flex items-center" }}
              className="max-w-94 [&>small]:text-sm"
            >
              <span className="cursor-help border-b border-dotted border-current">
                Default (PD)
              </span>
              <HelpIcon className="ml-1 inline-block size-3.5" />
            </Tooltip>{" "}
            for the following DeFi assets during Q3 2026?
          </p>
        </div>
        <p className="text-klerosUIComponentsSecondaryText px-6 pb-3.75 text-xs whitespace-pre-line">
          What is the probability? Estimate the risk level of the following
          protocols.
        </p>
      </div>
      {!isLoadingResolution && winningOutcomes.length > 0 ? (
        <div className="border-b-klerosUIComponentsStroke w-full space-y-2 border-b pb-8">
          <h2 className="text-klerosUIComponentsPrimaryText text-base font-semibold">
            Market resolved:
          </h2>
          <div className="flex flex-row flex-wrap items-center gap-2">
            {winningOutcomes.map(({ outcome, index, payoutFraction }) => {
              const color =
                colorOf.get(outcome) ?? assetColors[index % assetColors.length];
              return (
                <div
                  className={cn(
                    "rounded-base h-fit px-1 py-0.5",
                    "flex flex-row gap-2",
                  )}
                  key={index}
                  style={{ backgroundColor: color }}
                >
                  <p
                    className="text-xs"
                    style={{ color: getReadableTextColor(color) }}
                  >
                    {outcome}
                    <span
                      className="mx-1 text-xs"
                      style={{ color: getReadableTextColor(color) }}
                    >
                      |
                    </span>
                    {Number((payoutFraction * 100).toFixed(2))}%
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
};
export default Header;
