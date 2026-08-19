import { create } from "zustand";

import { RiskPricingOutcome } from "@/hooks/useMarketData";

type Predictions = Record<string, number>;

type Store = {
  riskPredictions: Predictions;
  setRiskPredictions: (predictions: Predictions) => void;
  removePrediction: (key: string) => void;
  resetRiskPredictions: () => void;

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
// own. Three call sites need that number - the slider, its card's selected
// state and the "Predict Selected" summary - so it is derived here once instead
// of being reimplemented in each.
// ---------------------------------------------------------------------------

/** Assets only: the last two outcomes are "No To All" and "Invalid". */
export const selectAssets = (state: Store) => state.outcomes.slice(0, -2);

/**
 * The user's current view of every asset's yearly PD: their prediction where
 * they made one, the market estimate otherwise.
 *
 * Returns a fresh array, so read it through `getState()` rather than passing it
 * to `useRiskPredictionStore` - as a hook selector it would re-render forever.
 */
export const selectAssetProbs = (state: Store): number[] =>
  selectAssets(state).map(
    (asset) => state.riskPredictions[asset.outcomeId] ?? asset.probability ?? 0,
  );

/**
 * "No To All" as a probability in [0, 1]. Returns a plain number, so zustand's
 * Object.is check still keeps subscribers from re-rendering unless it moves.
 */
export const selectNoToAllProbability = (state: Store): number =>
  selectAssets(state).reduce(
    (survival, asset) =>
      survival *
      (1 - (state.riskPredictions[asset.outcomeId] ?? asset.probability ?? 0)),
    1,
  );

/**
 * Whether any asset carries a user prediction. "No To All" never has a stored
 * prediction of its own, so this is what stands in for one.
 */
export const selectHasAssetPrediction = (state: Store): boolean =>
  selectAssets(state).some(
    (asset) => state.riskPredictions[asset.outcomeId] !== undefined,
  );
