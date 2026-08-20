"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Slider } from "@kleros/ui-components-library";
import clsx from "clsx";

import {
  selectAssetProbs,
  selectAssets,
  selectHasAssetPrediction,
  selectNoToAllProbability,
  useRiskPredictionStore,
} from "@/store/riskMarketStore";

import { scaleProbsToSurvival } from "@/hooks/useImpliedProbs";
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
  NO_TO_ALL_COLOR,
  NO_TO_ALL_LABEL,
  NO_TO_ALL_TOOLTIP,
  NO_TO_ALL_TRACK_COLOR,
  zones,
} from "./constants";
import RiskZoneBar from "./RiskZoneBar";
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
// Helpers — extracted outside the component so they never re-create.
// ---------------------------------------------------------------------------

const identityScale = (v: number) => v;
const identityFromScaled = (v: number) => v;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const PredictionSlider = ({
  outcome,
  isNoToAll,
}: {
  outcome: RiskPricingOutcome;
  isNoToAll: boolean;
}) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Scale helpers — pick identity or log based on isNoToAll.
  const scale = isNoToAll ? identityScale : logScalePercent;
  const fromScaledValue = isNoToAll ? identityFromScaled : logScaleToValue;

  // Store subscription — only re-renders when THIS outcome's prediction
  // changes (or when outcome.probability changes).
  //
  // "No To All" is the exception: it is the probability that none of the listed
  // assets defaults, prod(1 - p_i), so it is read as a derived value rather than
  // as a stored prediction of its own. It is still user-settable — dragging it
  // writes the assets (see `commit` below) and the readout follows from them —
  // which is what keeps it from ever contradicting the price vector the trade is
  // built from: usePredictRiskFlow takes this same value as its target via
  // computePrices().priceY, and useMarketData recomputes it the same way for
  // display. The selector still returns a plain number, so zustand's Object.is
  // check keeps this card from re-rendering unless the derived value moves, and
  // asset cards keep their narrow per-outcome subscription.
  const prediction = useRiskPredictionStore(
    useCallback(
      (state) => {
        if (!isNoToAll) {
          return (
            (state.riskPredictions[outcome.outcomeId] ?? outcome.probability) *
            100
          );
        }
        if (selectAssets(state).length === 0) return outcome.probability * 100;
        return selectNoToAllProbability(state) * 100;
      },
      [isNoToAll, outcome.outcomeId, outcome.probability],
    ),
  );

  // Whether the user has ever committed a prediction for this outcome. Without
  // it the marker would sit permanently slipped down on first paint, when the
  // thumb still rests exactly on the market value.
  //
  // "No To All" never has a stored prediction of its own, so any asset
  // prediction — whether made on an asset slider or by dragging this one —
  // counts as one for it.
  const hasUserPrediction = useRiskPredictionStore(
    useCallback(
      (state) =>
        isNoToAll
          ? selectHasAssetPrediction(state)
          : state.riskPredictions[outcome.outcomeId] !== undefined,
      [isNoToAll, outcome.outcomeId],
    ),
  );

  const setPredictions = useRiskPredictionStore(
    (state) => state.setRiskPredictions,
  );

  // ------------------------------------------------------------------
  // Drag-local state: while the user is sliding, updates go to local
  // state only — no store writes, so sibling sliders don't re-render.
  // On drag-end (onChangeEnd), the local value is flushed to the store.
  // ------------------------------------------------------------------
  const [draftValue, setDraftValue] = useState<number | null>(null);
  const draftRef = useRef<number | null>(null); // stable ref for cleanup

  // Writes a released value into the store, as a percentage.
  //
  // An asset writes its own prediction. "No To All" has none — it is
  // prod(1 - p_i) — so setting it runs backwards into the assets:
  // scaleProbsToSurvival raises every asset's survival to a common power, which
  // lands the derived readout exactly on the released value while keeping the
  // assets in their existing risk order. Raise it and every risk falls; lower it
  // and every risk rises.
  //
  // The whole asset vector is read at release rather than snapshotted at drag
  // start: nothing writes to the store mid-drag (that is what draftValue is
  // for), so the two are the same vector, minus a market refetch landing during
  // the drag — in which case rescaling the fresher one is the better answer.
  const commit = useCallback(
    (real: number) => {
      if (!isNoToAll) {
        setPredictions({ [outcome.outcomeId]: real / 100 });
        return;
      }
      const state = useRiskPredictionStore.getState();
      const assets = selectAssets(state);
      if (assets.length === 0) return;
      const rescaled = scaleProbsToSurvival(
        selectAssetProbs(state),
        real / 100,
      );
      setPredictions(
        Object.fromEntries(
          assets.map((asset, index) => [asset.outcomeId, rescaled[index]]),
        ),
      );
    },
    [isNoToAll, outcome.outcomeId, setPredictions],
  );

  // Flush draft to store on unmount (e.g. if user starts dragging and
  // navigates away without releasing).
  useEffect(() => {
    return () => {
      if (draftRef.current !== null) {
        commit(draftRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = useCallback(
    (scaled: number) => {
      const real = fromScaledValue(scaled);
      draftRef.current = real;
      setDraftValue(real);
    },
    [fromScaledValue],
  );

  const handleChangeEnd = useCallback(
    (scaled: number | number[]) => {
      const real = fromScaledValue(Array.isArray(scaled) ? scaled[0] : scaled);
      draftRef.current = null;
      setDraftValue(null);
      commit(real);
    },
    [fromScaledValue, commit],
  );

  const displayValue = draftValue ?? prediction;

  const formatted = useCallback(
    (scaled: number) => formatPd(fromScaledValue(scaled), SLIDER_PD_DECIMALS),
    [fromScaledValue],
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
    () => ({
      sliderColor: isNoToAll ? NO_TO_ALL_TRACK_COLOR : "#D2FFDC",
      thumbColor: isNoToAll ? NO_TO_ALL_TRACK_COLOR : "#D2FFDC",
    }),
    [isNoToAll],
  );

  // Compared in SCALED space (0..100 = percent of track width) rather than in
  // probability space: the track is log-scaled, so only the scaled distance
  // tells us whether the two labels are about to collide on screen.
  const isPredictionNearMarket =
    Math.abs(scale(displayValue) - scale(marketPercent)) <=
    NEAR_MARKET_THRESHOLD_PERCENT;

  const shouldRepositionMarketPin =
    isPredictionNearMarket && (draftValue !== null || hasUserPrediction);

  if (!mounted) return <LoadingSkeleton />;

  return (
    // The inset lives on this OUTER wrapper, never on the relative container
    // below: `left: %` on the marker resolves against the padding box, so
    // padding the positioning context itself would shift and rescale the
    // marker away from the track. Insetting here keeps the marker exactly on
    // its value while giving the centred "Market PD (Ann.)" label room to stay
    // inside the accordion body, which is overflow-hidden for its animation.
    <div className={clsx("w-full px-4 md:px-10", isNoToAll && "pb-10")}>
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
          value={scale(displayValue)}
          leftLabel=""
          rightLabel=""
          aria-label={
            isNoToAll
              ? `${outcome.outcome} probability — moving it rescales every asset's probability of default`
              : `${outcome.outcome} probability of default`
          }
          callback={handleChange}
          onChangeEnd={handleChangeEnd}
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
            left: `${scale(marketPercent)}%`,
            transform: `translateX(-50%) translateY(${
              shouldRepositionMarketPin ? MARKET_PIN_SLIP_DISTANCE : "0"
            })`,
          }}
        >
          {/* pointer-events-auto: the marker wrapper disables pointer events so
            it never blocks the slider, but the tooltip still needs hover. */}
          <div className="pointer-events-auto flex items-center justify-center whitespace-nowrap">
            <label className="text-klerosUIComponentsPrimaryText text-xs">
              {isNoToAll ? NO_TO_ALL_LABEL : "Market PD (Ann.)"}
            </label>
            <WithHelpTooltip
              tooltipMsg={isNoToAll ? NO_TO_ALL_TOOLTIP : MARKET_PD_TOOLTIP}
              place="top"
            />
          </div>

          <div
            className={clsx("rounded-base px-2 py-0.75 text-center text-xs")}
            style={{
              backgroundColor: isNoToAll ? NO_TO_ALL_COLOR : color,
              color: getReadableTextColor(isNoToAll ? NO_TO_ALL_COLOR : color),
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
      {!isNoToAll && <RiskZoneBar size="sm" className="mt-14" />}
    </div>
  );
};

export default React.memo(PredictionSlider);
