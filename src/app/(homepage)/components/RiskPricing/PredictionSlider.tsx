"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

import { Slider } from "@kleros/ui-components-library";
import clsx from "clsx";

import { RiskPricingOutcome } from "@/hooks/useMarketData";

import { Skeleton } from "@/components/Skeleton";
import WithHelpTooltip from "@/components/WithHelpTooltip";

import { formatPd, SLIDER_PD_DECIMALS } from "@/utils";
import { getReadableTextColor } from "@/utils/getReadableTextColor";

import {
  logScalePercent,
  logScaleToValue,
  MARKET_PD_TOOLTIP,
  MAX_RISK,
  zones,
} from "./constants";
import RiskZoneBar from "./RiskZoneBar";
import { usePredictionDrag } from "./usePredictionDrag";
import { interpolateColor } from "./utils";

const LoadingSkeleton: React.FC = () => (
  <div className="relative w-full">
    <Skeleton className="h-2 w-full rounded-[30px]" />
    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/3">
      <Skeleton className="h-[22px] w-[42px]" />
      <Skeleton
        className="mx-auto h-9 w-0.75 rounded-b-full"
        variant="secondary"
      />
    </div>
  </div>
);
const maxValue = MAX_RISK;

// How close (in percent of track width) the prediction has to get to the market
// marker before the marker slips out of the way of the slider's own value label.
// futarchy-ui uses 5; ours needs more because the pill stretches to the width of
// the "Market PD (Ann.)" caption (~115px on a 1000px track = 5.75% per side),
// and the value label adds ~2.5% more before the two actually touch.
const NEAR_MARKET_THRESHOLD_PERCENT = 9;

// How far the marker slips down. Hiding the 36px stem already drops the pill to
// just under the track; this clears the thumb on top of that.
const MARKET_PIN_SLIP_DISTANCE = "32px";

// ---------------------------------------------------------------------------
// Component
//
// Assets only. "No To All" is no longer a card in the list - it is the sticky
// NoToAllStrip above it, which drives the same drag hook from the other end.
// ---------------------------------------------------------------------------

const PredictionSlider = ({ outcome }: { outcome: RiskPricingOutcome }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // PD spans orders of magnitude across assets, so the track is log-scaled:
  // logScalePercent maps a PD to a track position, logScaleToValue maps back.
  const { displayValue, hasUserPrediction, handleChange, handleChangeEnd } =
    usePredictionDrag({ outcome, isNoToAll: false });

  const onChange = useCallback(
    (scaled: number) => handleChange(logScaleToValue(scaled)),
    [handleChange],
  );

  const onChangeEnd = useCallback(
    (scaled: number | number[]) =>
      handleChangeEnd(
        logScaleToValue(Array.isArray(scaled) ? scaled[0] : scaled),
      ),
    [handleChangeEnd],
  );

  const formatted = useCallback(
    (scaled: number) => formatPd(logScaleToValue(scaled), SLIDER_PD_DECIMALS),
    [],
  );

  // Market-probability derived values (do not change during dragging).
  const marketPercent = outcome.probability * 100;

  const zone = useMemo(
    () =>
      zones.find((z) => marketPercent >= z.from && marketPercent <= z.to) ??
      zones[0],
    [marketPercent],
  );

  const color = useMemo(
    () =>
      interpolateColor(
        zone.colors[0],
        zone.colors[1],
        (marketPercent - zone.from) / (zone.to - zone.from),
      ),
    [marketPercent, zone],
  );

  const theme = useMemo(
    () => ({ sliderColor: "#D2FFDC", thumbColor: "#D2FFDC" }),
    [],
  );

  // Compared in SCALED space (0..100 = percent of track width) rather than in
  // probability space: the track is log-scaled, so only the scaled distance
  // tells us whether the two labels are about to collide on screen.
  const isPredictionNearMarket =
    Math.abs(logScalePercent(displayValue) - logScalePercent(marketPercent)) <=
    NEAR_MARKET_THRESHOLD_PERCENT;

  const shouldRepositionMarketPin = isPredictionNearMarket && hasUserPrediction;

  if (!mounted) return <LoadingSkeleton />;

  return (
    // The inset lives on this OUTER wrapper, never on the relative container
    // below: `left: %` on the marker resolves against the padding box, so
    // padding the positioning context itself would shift and rescale the
    // marker away from the track. Insetting here keeps the marker exactly on
    // its value while giving the centred "Market PD (Ann.)" label room to stay
    // inside the accordion body, which is overflow-hidden for its animation.
    <div className="w-full px-4 md:px-10">
      {/* Positioning context for the marker only — the ZoneBar and Axis stay
          outside it so the marker's `bottom-0` means "bottom of the track box"
          rather than "bottom of the whole column". */}
      <div className="relative w-full">
        {/* Slider */}
        <Slider
          className={clsx(
            "w-full",
            "[&_#slider-label]:!text-klerosUIComponentsPrimaryText",
            "[&_#slider-label]:font-semibold",

            // Thumb — reads against the track in both themes.
            "[&_[role=slider]]:border-4",
            "[&_[role=slider]]:border-klerosUIComponentsWhiteBackground",
            "[&_[role=slider]]:bg-klerosUIComponentsWhiteBackground",
            "[&_[role=slider]]:shadow-md",
          )}
          step={0.0001}
          maxValue={maxValue}
          minValue={0}
          value={logScalePercent(displayValue)}
          leftLabel=""
          rightLabel=""
          aria-label={`${outcome.outcome} probability of default`}
          callback={onChange}
          onChangeEnd={onChangeEnd}
          formatter={formatted}
          // @ts-expect-error other values not needed
          theme={theme}
        />

        {/* Market-probability marker (does not move while dragging).

            At rest it sits just above the track with its stem crossing it, and
            it covers the Slider's own bold value label — the thumb starts on
            the market value, so there is nothing to read there anyway. Once the
            user drags and the prediction comes within
            NEAR_MARKET_THRESHOLD_PERCENT of the market, the whole group slips
            down (transition-transform, 250ms from the Kleros theme), the stem
            hides and the caption flips below the pill, freeing that space.

            Rendered after the Slider so it paints on top of it: both are
            positioned with z-index auto, so DOM order decides. */}
        <div
          className={clsx(
            "pointer-events-none absolute bottom-0 flex flex-col transition-transform",
            shouldRepositionMarketPin && "flex-col-reverse",
          )}
          style={{
            left: `${logScalePercent(marketPercent)}%`,
            transform: `translateX(-50%) translateY(${
              shouldRepositionMarketPin ? MARKET_PIN_SLIP_DISTANCE : "0"
            })`,
          }}
        >
          {/* pointer-events-auto: the marker wrapper disables pointer events so
            it never blocks the slider, but the tooltip still needs hover. */}
          <div className="pointer-events-auto flex items-center justify-center whitespace-nowrap">
            <label className="text-klerosUIComponentsPrimaryText text-xs">
              Market PD (Ann.)
            </label>
            <WithHelpTooltip tooltipMsg={MARKET_PD_TOOLTIP} place="top" />
          </div>

          <div
            className={clsx("rounded-base px-2 py-0.75 text-center text-xs")}
            style={{
              backgroundColor: color,
              color: getReadableTextColor(color),
            }}
          >
            {formatPd(marketPercent, SLIDER_PD_DECIMALS)}
          </div>

          <span
            className={clsx(
              "bg-klerosUIComponentsPrimaryText mx-auto block h-9 w-0.75",
              shouldRepositionMarketPin ? "hidden" : "rounded-b-full",
            )}
          />
        </div>
      </div>

      {/* mt-14: when the prediction comes near the market, the marker slips
          32px below the track. This gap is the room it lands in — a smaller one
          and the pill/caption would cover the emoji bubbles, which themselves
          poke 16px above the bar. */}
      <RiskZoneBar size="sm" className="mt-14" />
    </div>
  );
};

export default React.memo(PredictionSlider);
