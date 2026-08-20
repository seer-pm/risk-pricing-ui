import {
  Accordion,
  CustomAccordion,
  Tooltip,
} from "@kleros/ui-components-library";
import clsx from "clsx";
import Link from "next/link";

import {
  selectHasAssetPrediction,
  selectNoToAllProbability,
  useRiskPredictionStore,
} from "@/store/riskMarketStore";

import { useTradeWallet } from "@/context/TradeWalletContext";
import { useAssetColorMap } from "@/hooks/useAssetColorMap";
import { RiskPricingOutcome } from "@/hooks/useMarketData";
import { useRiskMarketResolution } from "@/hooks/useRiskMarketResolution";
import { useRiskTokenPositionValue } from "@/hooks/useRiskTokenPositionValue";

import CheckOutline from "@/assets/svg/check-outline-button.svg";
import InfoIcon from "@/assets/svg/info.svg";
import MinusOutline from "@/assets/svg/minus-outline.svg";

import { formatUsd } from "@/utils";

import { advancedUserGuide } from "@/consts/markets";

import { NO_TO_ALL_COLOR, NO_TO_ALL_HEADING } from "./constants";
import Details from "./Details";
import PositionValue from "./PositionValue";
import PredictionSlider from "./PredictionSlider";

const RiskPricing = ({
  outcome,
  isNoToAll,
}: {
  outcome: RiskPricingOutcome;
  isNoToAll: boolean;
}) => {
  const {
    outcome: outcomeName,
    collateral,
    price,
    probability,
    outcomeId,
    outcomeIndex,
  } = outcome;
  // "No To All" has no stored prediction of its own - it is prod(1 - p_i) over
  // the assets - so it reads as selected whenever that derived value has moved
  // off the market estimate, whether the user dragged this slider or an asset's.
  const isSelected = useRiskPredictionStore((state) => {
    if (isNoToAll) {
      return (
        selectHasAssetPrediction(state) &&
        selectNoToAllProbability(state) !== probability
      );
    }
    const pred = state.riskPredictions[outcomeId];
    return pred !== undefined && pred !== probability;
  });
  const { tradeExecutor } = useTradeWallet();
  const colorOf = useAssetColorMap();

  const { isResolved, payoutFractions } = useRiskMarketResolution();
  const effectivePrice = isResolved
    ? (payoutFractions?.[outcomeIndex] ?? 0)
    : price;

  const { value } = useRiskTokenPositionValue(
    outcomeId,
    collateral,
    tradeExecutor ?? "0x",
    effectivePrice,
  );
  const wrapperClassName = clsx(
    "bg-klerosUIComponentsLightBackground flex h-auto w-full max-w-full flex-col gap-4",
    "[&>div]:my-0",
    // "No To All" is not an asset - tint the whole card so the section
    // reads as separate from the per-asset sliders above it.
    isNoToAll && [
      // Important: the accordion swaps the header background itself when it
      // expands, and would otherwise wash the tint out.
      "[&_#expand-button]:border-emerald-300! [&_#expand-button]:bg-emerald-50!",
      "dark:[&_#expand-button]:border-emerald-800! dark:[&_#expand-button]:bg-emerald-950!",
      "[&_#body-wrapper]:bg-emerald-50/60 dark:[&_#body-wrapper]:bg-emerald-950/40",
    ],
  );

  const header = (
    <div className="flex flex-1 flex-wrap items-center justify-between gap-4">
      <div className="flex max-w-full grow basis-[70%] flex-wrap gap-2 md:min-w-[300px]">
        <div className="flex items-center gap-2">
          <span
            className="size-2 rounded-full"
            style={{
              backgroundColor: isNoToAll
                ? NO_TO_ALL_COLOR
                : colorOf(outcomeName),
            }}
          />
          <h3 className="text-klerosUIComponentsPrimaryText text-left text-lg font-semibold">
            {isNoToAll ? NO_TO_ALL_HEADING : outcomeName}
          </h3>
        </div>
        {value > 0 ? (
          <div className="flex items-center gap-2">
            <div className="border-klerosUIComponentsPrimaryText h-4 w-0 border-[0.5px] max-md:hidden" />

            <Tooltip
              text="Click here to understand your Position"
              small
              delay={0}
              closeDelay={300}
              className="px-2 py-2 [&_small]:text-xs"
            >
              <Link
                href={advancedUserGuide}
                target="_blank"
                rel="noopener noreferrer"
                className={clsx(
                  "flex items-center gap-1",
                  "text-klerosUIComponentsPrimaryText justify-center text-sm",
                  "hover:text-klerosUIComponentsPrimaryBlue cursor-pointer transition-colors",
                )}
              >
                Position:
                <span className="font-bold"> {formatUsd(value)} </span>
                <InfoIcon className="mb-0.25 inline size-3" />
              </Link>
            </Tooltip>
          </div>
        ) : null}
      </div>
      {isSelected ? (
        <CheckOutline className="[&_path]:fill-klerosUIComponentsSuccess animate-fade-in size-4" />
      ) : (
        <MinusOutline className="size-4" />
      )}
    </div>
  );

  const content = (
    <div className="flex w-full flex-col">
      {/* The market marker is absolutely positioned above the track and
          the accordion body is overflow-hidden, so it needs headroom
          for its caption + pill or they get clipped. */}
      <div className="pt-6 pb-4">
        <PredictionSlider outcome={outcome} isNoToAll={isNoToAll} />
      </div>
      {tradeExecutor ? (
        <div className="flex w-full items-center justify-between gap-2">
          <PositionValue outcome={outcome} tradeExecutor={tradeExecutor} />
        </div>
      ) : null}
      {!isNoToAll && (
        <Accordion
          aria-label="accordion"
          className={clsx(
            "w-full max-w-full",
            "[&_#expand-button]:bg-klerosUIComponentsLightBackground [&_#expand-button_p]:font-normal",
          )}
          items={[{ title: "Details", body: <Details outcome={outcome} /> }]}
        />
      )}
    </div>
  );

  // "No To All" is always open: it is the summary of every asset slider above
  // it, so there is nothing to collapse away. CustomAccordion has no
  // always-expanded mode - `defaultExpanded` only picks the initial item and
  // the whole header stays a toggle button - so this mirrors its markup minus
  // the button, the chevron and the height animation, keeping the ids the tint
  // selectors above target.
  if (isNoToAll) {
    return (
      <div className={wrapperClassName}>
        <div className="my-2">
          <div
            id="expand-button"
            className={clsx(
              "bg-klerosUIComponentsWhiteBackground border-klerosUIComponentsStroke border",
              "rounded-[3px] px-4 py-[11.5px] md:px-8",
              "flex w-full items-center justify-between gap-4",
            )}
          >
            {header}
          </div>
          <div id="body-wrapper" className="p-4 md:p-8">
            {content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <CustomAccordion
      aria-label="card"
      className={clsx(wrapperClassName, "transition-shadow hover:shadow-md")}
      items={[{ title: header, body: content }]}
    />
  );
};

export default RiskPricing;
