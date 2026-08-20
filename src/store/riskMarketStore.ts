import { create } from "zustand";

import { RiskPricingOutcome } from "@/hooks/useMarketData";

type Predictions = Record<string, number>;

/**
 * A drag in progress.
 *
 * Sliders write here on every pointer move instead of into `riskPredictions`,
 * and the derived selectors below overlay it, so the two sides of this market -
 * "No To All" and the assets that imply it - track each other while the user
 * drags rather than only on release. Before this existed the drag value lived
 * in the dragging component's own state, so nothing else on the page moved
 * until the pointer came up.
 *
 * A "noToAll" drag carries the whole rescaled asset vector because
 * scaleProbsToSurvival solves for it once per frame in the dragging component;
 * every other subscriber then only does a map lookup.
 *
 * Nothing outside these selectors reads it. In particular usePredictRiskFlow
 * builds its price vector from `riskPredictions` directly, so an unreleased
 * drag can never reach a trade.
 */
export type Draft =
  | { kind: "asset"; outcomeId: string; value: number }
  | { kind: "noToAll"; values: Predictions }
  | null;

type Store = {
  riskPredictions: Predictions;
  setRiskPredictions: (predictions: Predictions) => void;
  removePrediction: (key: string) => void;
  resetRiskPredictions: () => void;

  draft: Draft;
  setDraft: (draft: Draft) => void;
  /**
   * Releases a drag: merges the released values and clears the draft in one
   * `set`. Two calls would leave a frame where the draft is gone but the
   * prediction is not yet in, which reads as a flash back to the old value.
   */
  commitDraft: (predictions: Predictions) => void;

  outcomes: RiskPricingOutcome[];
  setOutcomes: (outcomes: RiskPricingOutcome[]) => void;
};

export const useRiskPredictionStore = create<Store>((set) => ({
  riskPredictions: {},

  setRiskPredictions: (predictions) =>
    set((state) => ({
      riskPredictions: {
        ...state.riskPredictions,
        ...predictions,
      },
    })),

  removePrediction: (key) =>
    set((state) => {
      const next = { ...state.riskPredictions };
      delete next[key];

      return {
        riskPredictions: next,
      };
    }),

  resetRiskPredictions: () =>
    set(() => ({
      riskPredictions: {},
      draft: null,
    })),

  draft: null,

  setDraft: (draft) => set(() => ({ draft })),

  commitDraft: (predictions) =>
    set((state) => ({
      riskPredictions: {
        ...state.riskPredictions,
        ...predictions,
      },
      draft: null,
    })),

  outcomes: [],

  setOutcomes: (outcomes) =>
    set(() => ({
      outcomes,
    })),
}));

// ---------------------------------------------------------------------------
// Derived selectors
//
// "No To All" is the probability that none of the listed assets defaults, so it
// is prod(1 - p_i) over the asset predictions rather than a stored value of its
// own. Several call sites need that number - the sticky strip, its slider and
// the "Predict Selected" summary - so it is derived here once instead of being
// reimplemented in each.
//
// Every read goes through selectAssetProbability, which layers the in-flight
// drag on top of the committed prediction on top of the market estimate. That
// single overlay is what makes a drag on either side move the other live.
// ---------------------------------------------------------------------------

/** Assets only: the last two outcomes are "No To All" and "Invalid". */
export const selectAssets = (state: Store) => state.outcomes.slice(0, -2);

const draftValueFor = (state: Store, outcomeId: string): number | undefined => {
  const { draft } = state;
  if (!draft) return undefined;
  if (draft.kind === "asset") {
    return draft.outcomeId === outcomeId ? draft.value : undefined;
  }
  return draft.values[outcomeId];
};

type AssetLike = Pick<RiskPricingOutcome, "outcomeId" | "probability">;

/**
 * One asset's yearly PD as the user currently sees it: the drag in progress,
 * else their committed prediction, else the market estimate.
 */
export const selectAssetProbability = (
  state: Store,
  asset: AssetLike,
): number =>
  draftValueFor(state, asset.outcomeId) ??
  state.riskPredictions[asset.outcomeId] ??
  asset.probability ??
  0;

/**
 * The user's current view of every asset's yearly PD.
 *
 * Returns a fresh array, so read it through `getState()` rather than passing it
 * to `useRiskPredictionStore` - as a hook selector it would re-render forever.
 */
export const selectAssetProbs = (state: Store): number[] =>
  selectAssets(state).map((asset) => selectAssetProbability(state, asset));

/**
 * "No To All" as a probability in [0, 1]. Returns a plain number, so zustand's
 * Object.is check still keeps subscribers from re-rendering unless it moves.
 */
export const selectNoToAllProbability = (state: Store): number =>
  selectAssets(state).reduce(
    (survival, asset) => survival * (1 - selectAssetProbability(state, asset)),
    1,
  );

/** Whether one outcome carries a user value - committed or mid-drag. */
export const selectHasPrediction = (state: Store, outcomeId: string): boolean =>
  draftValueFor(state, outcomeId) !== undefined ||
  state.riskPredictions[outcomeId] !== undefined;

/**
 * Whether any asset carries a user prediction. "No To All" never has a stored
 * prediction of its own, so this is what stands in for one.
 */
export const selectHasAssetPrediction = (state: Store): boolean =>
  state.draft !== null ||
  selectAssets(state).some(
    (asset) => state.riskPredictions[asset.outcomeId] !== undefined,
  );

/**
 * How many of `assets` the user has actually moved off the market estimate.
 *
 * Returns a number so subscribers re-render only when the count changes -
 * subscribing to `riskPredictions` itself would re-render every group header on
 * every drag frame. Committed values only: a count that flickered while the
 * pointer was down would be noise rather than feedback.
 */
export const countEditedAssets = (
  state: Store,
  assets: RiskPricingOutcome[],
): number =>
  assets.reduce((count, asset) => {
    const prediction = state.riskPredictions[asset.outcomeId];
    return prediction !== undefined && prediction !== asset.probability
      ? count + 1
      : count;
  }, 0);
