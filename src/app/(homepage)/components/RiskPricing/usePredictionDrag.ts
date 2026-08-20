"use client";

import { useCallback, useEffect, useRef } from "react";

import {
  Draft,
  selectAssetProbability,
  selectAssets,
  selectHasAssetPrediction,
  selectHasPrediction,
  selectNoToAllProbability,
  useRiskPredictionStore,
} from "@/store/riskMarketStore";

import { scaleProbsToSurvival } from "@/hooks/useImpliedProbs";
import { RiskPricingOutcome } from "@/hooks/useMarketData";

/**
 * The drag behaviour shared by the two controls that write predictions: the
 * per-asset slider in each card, and the "No To All" slider in the sticky
 * strip. Both sides of this market are the same number seen from two ends -
 * No To All is prod(1 - p_i) - so they have to agree on how a drag is
 * published, and neither is allowed to be the only place the logic lives.
 *
 * Values in and out are percentages (0..100), matching what the sliders show.
 *
 * While the pointer is down the value goes to the store's `draft`, not to
 * `riskPredictions`: every other readout on the page overlays the draft, so the
 * far side of the coupling moves in step with the drag instead of jumping on
 * release. `commitDraft` then merges and clears in one `set`.
 */
export const usePredictionDrag = ({
  outcome,
  isNoToAll,
}: {
  outcome: RiskPricingOutcome;
  isNoToAll: boolean;
}) => {
  const { outcomeId, probability } = outcome;

  // Narrow subscriptions: an asset card re-renders only when its own value
  // moves, and the strip only when the derived survival moves.
  const displayValue = useRiskPredictionStore(
    useCallback(
      (state) => {
        if (!isNoToAll) {
          return (
            selectAssetProbability(state, { outcomeId, probability }) * 100
          );
        }
        // Before the outcome list has loaded there is nothing to derive from.
        if (selectAssets(state).length === 0) return probability * 100;
        return selectNoToAllProbability(state) * 100;
      },
      [isNoToAll, outcomeId, probability],
    ),
  );

  // Whether the user has ever set a value here. Without it the market marker
  // would sit permanently slipped down on first paint, when the thumb still
  // rests exactly on the market value.
  //
  // "No To All" never has a stored prediction of its own, so any asset
  // prediction - whether made on an asset slider or by dragging No To All -
  // counts as one for it.
  const hasUserPrediction = useRiskPredictionStore(
    useCallback(
      (state) =>
        isNoToAll
          ? selectHasAssetPrediction(state)
          : selectHasPrediction(state, outcomeId),
      [isNoToAll, outcomeId],
    ),
  );

  /**
   * Turns a released or in-flight slider value into the draft it publishes.
   *
   * An asset publishes its own value. "No To All" has none - it is
   * prod(1 - p_i) - so setting it runs backwards into the assets:
   * scaleProbsToSurvival raises every asset's survival to a common power, which
   * lands the derived readout exactly on the dragged value while keeping the
   * assets in their existing risk order. Raise it and every risk falls; lower
   * it and every risk rises.
   *
   * The rescale always starts from the COMMITTED vector, never from the
   * draft-overlaid one. Re-solving each frame against a vector that already
   * hits the previous frame's target would accumulate that solve's rounding
   * across a drag, and would make the result depend on how fast the user moved.
   */
  const buildDraft = useCallback(
    (percent: number): Draft => {
      if (!isNoToAll) {
        return { kind: "asset", outcomeId, value: percent / 100 };
      }
      const state = useRiskPredictionStore.getState();
      const assets = selectAssets(state);
      if (assets.length === 0) return null;
      const committed = assets.map(
        (asset) =>
          state.riskPredictions[asset.outcomeId] ?? asset.probability ?? 0,
      );
      const rescaled = scaleProbsToSurvival(committed, percent / 100);
      return {
        kind: "noToAll",
        values: Object.fromEntries(
          assets.map((asset, index) => [asset.outcomeId, rescaled[index]]),
        ),
      };
    },
    [isNoToAll, outcomeId],
  );

  // ------------------------------------------------------------------
  // Pointer moves arrive faster than frames, and a "No To All" move
  // republishes a value for every asset, so writes are coalesced to one per
  // frame. `pendingRef` doubles as the "a drag is in flight" flag.
  // ------------------------------------------------------------------
  const pendingRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);

  const flush = useCallback(() => {
    frameRef.current = null;
    const percent = pendingRef.current;
    if (percent === null) return;
    useRiskPredictionStore.getState().setDraft(buildDraft(percent));
  }, [buildDraft]);

  const handleChange = useCallback(
    (percent: number) => {
      pendingRef.current = percent;
      if (frameRef.current === null) {
        frameRef.current = requestAnimationFrame(flush);
      }
    },
    [flush],
  );

  const handleChangeEnd = useCallback(
    (percent: number) => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      pendingRef.current = null;

      const store = useRiskPredictionStore.getState();
      const draft = buildDraft(percent);
      if (!draft) {
        store.setDraft(null);
        return;
      }
      store.commitDraft(
        draft.kind === "asset"
          ? { [draft.outcomeId]: draft.value }
          : draft.values,
      );
    },
    [buildDraft],
  );

  // Flush an in-flight drag on unmount, e.g. if the user starts dragging and
  // collapses the section without releasing. Read through a ref so the effect
  // stays mount-only and never re-subscribes mid-drag.
  const handleChangeEndRef = useRef(handleChangeEnd);
  handleChangeEndRef.current = handleChangeEnd;
  useEffect(
    () => () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      if (pendingRef.current !== null) {
        handleChangeEndRef.current(pendingRef.current);
      }
    },
    [],
  );

  return { displayValue, hasUserPrediction, handleChange, handleChangeEnd };
};
