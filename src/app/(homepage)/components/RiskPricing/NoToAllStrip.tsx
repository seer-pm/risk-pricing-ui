"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

import { Slider } from "@kleros/ui-components-library";

import {
  countEditedAssets,
  selectAssets,
  useRiskPredictionStore,
} from "@/store/riskMarketStore";

import { yearlySurvivalToQuarterly } from "@/hooks/useImpliedProbs";
import { RiskPricingOutcome } from "@/hooks/useMarketData";

import { Skeleton } from "@/components/Skeleton";
import WithHelpTooltip from "@/components/WithHelpTooltip";

import { cn, formatPd, SLIDER_PD_DECIMALS } from "@/utils";

import {
  MAX_RISK,
  NO_TO_ALL_COLOR,
  NO_TO_ALL_LABEL,
  NO_TO_ALL_TOOLTIP,
  NO_TO_ALL_TRACK_COLOR,
} from "./constants";
import DeltaChip from "./DeltaChip";
import { usePredictionDrag } from "./usePredictionDrag";

/**
 * Pinned flush to the top of the viewport, with the band painted in the page
 * background so cards scroll behind it rather than through the gap.
 *
 * It does not need to clear the app header. That header is `sticky top-0`, but
 * its containing block is `body`, which layout.tsx sizes `size-full` - so it
 * unpins about 900px down, long before the slider list this strip belongs to
 * comes into view. The two are never both pinned, and the header's z-30 beats
 * this z-20 if they ever were.
 */
const STICKY_OFFSET = "top-0";

/**
 * "No To All" as a pinned strip rather than a card in the list.
 *
 * It is the one number every other slider on the page moves - it is
 * prod(1 - p_i) over the 33 assets - but as the 34th card it sat ~2,700px below
 * the first asset, so a user could not see their own edit land. Pinned here it
 * stays on screen while they work down the list, and dragging it drives the
 * assets back the other way through the same hook the asset sliders use.
 *
 * Unlike the asset sliders this track is LINEAR: survival sits near the top of
 * the range and barely varies in the decade below it, so the log scale that
 * makes PDs readable would squash this into the last few pixels.
 */
const NoToAllStrip = ({ outcome }: { outcome: RiskPricingOutcome }) => {
  // The Slider reads the store, which is empty until the market resolves, and
  // the accordion cards below already gate their sliders the same way.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { displayValue, handleChange, handleChangeEnd } = usePredictionDrag({
    outcome,
    isNoToAll: true,
  });

  const resetRiskPredictions = useRiskPredictionStore(
    (state) => state.resetRiskPredictions,
  );

  const assetCount = useRiskPredictionStore(
    (state) => selectAssets(state).length,
  );
  const editedCount = useRiskPredictionStore((state) =>
    countEditedAssets(state, selectAssets(state)),
  );

  const onChangeEnd = useCallback(
    (value: number | number[]) =>
      handleChangeEnd(Array.isArray(value) ? value[0] : value),
    [handleChangeEnd],
  );

  const formatted = useCallback(
    (value: number) => formatPd(value, SLIDER_PD_DECIMALS),
    [],
  );

  const theme = useMemo(
    () => ({
      sliderColor: NO_TO_ALL_TRACK_COLOR,
      thumbColor: NO_TO_ALL_TRACK_COLOR,
    }),
    [],
  );

  const marketPercent = outcome.probability * 100;
  // A survival probability converts as the 4th root, not through the PD path.
  const quarterlyPercent = yearlySurvivalToQuarterly(displayValue / 100) * 100;

  return (
    <div
      className={cn(
        "sticky z-20 w-full",
        STICKY_OFFSET,
        "bg-klerosUIComponentsLightBackground py-2",
      )}
    >
      <div
        className={cn(
          // Opaque, or the asset cards show through as they scroll past.
          "bg-klerosUIComponentsWhiteBackground border-klerosUIComponentsStroke",
          "rounded-base border shadow-md",
          "flex w-full flex-col gap-1 px-4 py-3 md:px-8",
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <div className="flex items-center gap-2">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: NO_TO_ALL_COLOR }}
            />
            <h3 className="text-klerosUIComponentsPrimaryText text-base font-semibold tracking-wide uppercase">
              No To All
            </h3>
            <WithHelpTooltip tooltipMsg={NO_TO_ALL_TOOLTIP} place="bottom" />
            <span className="text-klerosUIComponentsSecondaryText text-xs max-sm:hidden">
              chance no listed asset defaults
            </span>
          </div>

          {/* tabular-nums throughout: these digits change on every frame of a
            drag, and proportional figures make the whole row twitch. */}
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span
              className="text-xl font-bold tabular-nums"
              style={{ color: NO_TO_ALL_COLOR }}
            >
              {formatPd(displayValue)}
              <span className="ml-1 text-xs font-semibold">(Ann.)</span>
            </span>
            <span className="text-klerosUIComponentsSecondaryText text-xs font-medium tabular-nums">
              {formatPd(quarterlyPercent)} (Quart.)
            </span>
            {/* A rise here is a rise in SURVIVAL, so it is the good direction -
              the opposite of the same chip on an asset header. */}
            <DeltaChip
              deltaPercent={displayValue - marketPercent}
              riseIsGood
              className="self-center"
            />
          </div>
        </div>

        {mounted ? (
          <Slider
            className={cn(
              "w-full",
              // The Slider prints its own value above the thumb. Here that is the
              // same number as the big readout a few pixels to its right, so it
              // only adds a second thing moving during a drag.
              "[&_#slider-label]:hidden",
              "[&_[role=slider]]:border-4",
              "[&_[role=slider]]:border-klerosUIComponentsWhiteBackground",
              "[&_[role=slider]]:bg-klerosUIComponentsWhiteBackground",
              "[&_[role=slider]]:shadow-md",
            )}
            step={0.0001}
            maxValue={MAX_RISK}
            minValue={0}
            value={displayValue}
            leftLabel=""
            rightLabel=""
            aria-label="No To All probability — moving it rescales every asset's probability of default"
            callback={handleChange}
            onChangeEnd={onChangeEnd}
            formatter={formatted}
            // @ts-expect-error other values not needed
            theme={theme}
          />
        ) : (
          <Skeleton className="my-6 h-2 w-full rounded-[30px]" />
        )}

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs">
          <span className="text-klerosUIComponentsSecondaryText tabular-nums">
            {NO_TO_ALL_LABEL} {formatPd(marketPercent)}
          </span>
          <div className="flex items-center gap-3">
            <span className="text-klerosUIComponentsSecondaryText tabular-nums">
              {editedCount} of {assetCount} assets edited
            </span>
            {editedCount > 0 ? (
              <button
                type="button"
                onClick={resetRiskPredictions}
                className="text-klerosUIComponentsPrimaryBlue cursor-pointer font-semibold hover:underline"
              >
                Reset
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(NoToAllStrip);
