import React, { useMemo } from "react";

import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";

import {
  NO_TO_ALL_COLOR,
  sortOutcomesByCategory,
} from "@/app/(homepage)/components/RiskPricing/constants";
import {
  selectHasAssetPrediction,
  selectNoToAllProbability,
  useRiskPredictionStore,
} from "@/store/riskMarketStore";

import { useAssetColorMap } from "@/hooks/useAssetColorMap";

import LightButton from "@/components/LightButton";
import { ScrollFade } from "@/components/ScrollFade";

import CloseIcon from "@/assets/svg/close-icon.svg";
import ArrowDown from "@/assets/svg/long-arrow-down.svg";
import ArrowUp from "@/assets/svg/long-arrow-up.svg";

import { formatPd, isUndefined } from "@/utils";

const RiskMarketHeader: React.FC = () => {
  const outcomes = useRiskPredictionStore((state) => state.outcomes);
  const predictions = useRiskPredictionStore((state) => state.riskPredictions);
  const removePrediction = useRiskPredictionStore(
    (state) => state.removePrediction,
  );
  // "No To All" has no stored prediction - it is prod(1 - p_i) over the assets.
  const noToAllProbability = useRiskPredictionStore(selectNoToAllProbability);
  const hasAssetPrediction = useRiskPredictionStore(selectHasAssetPrediction);
  const colorOf = useAssetColorMap();
  // Same category grouping as the sliders this list mirrors.
  const sortedOutcomes = useMemo(
    () => sortOutcomesByCategory(outcomes, ({ outcome }) => outcome),
    [outcomes],
  );
  const hasPredictions = Object.entries(predictions).some(
    ([predictionOutcomeId, prediction]) => {
      const marketProbability = outcomes.find(
        (outcome) => outcome.outcomeId === predictionOutcomeId,
      )?.probability;
      return prediction && prediction !== marketProbability;
    },
  );
  return (
    <div
      className={clsx(
        "mb-4 min-h-28 w-full shrink grow-0",
        "flex flex-col items-center gap-4",
      )}
    >
      <h2 className="text-klerosUIComponentsPrimaryText shrink-0 text-2xl font-semibold">
        Predict
      </h2>
      <ScrollFade
        className={clsx("rounded-base w-full shrink", "max-h-40 min-h-18")}
      >
        {!hasPredictions ? (
          <p className="text-klerosUIComponentsSecondaryText py-4 text-center text-sm">
            No predictions yet — move a slider to differ from the market.
          </p>
        ) : null}
        <div className="flex w-full flex-col gap-0.25">
          <AnimatePresence>
            {sortedOutcomes.slice(0, -1).map((outcome, index, legs) => {
              // "No To All" is the last leg here (the slice drops only
              // "Invalid"), and it has no stored prediction of its own. It is
              // still traded on every submission - usePredictRiskFlow prices it
              // as computePrices().priceY - so it belongs in this list whenever
              // the assets move it, not only when the user drags its own
              // slider.
              const isNoToAll = index === legs.length - 1;
              const prediction = isNoToAll
                ? hasAssetPrediction
                  ? noToAllProbability
                  : undefined
                : predictions[outcome.outcomeId];
              if (!prediction || prediction === outcome.probability) return;
              return (
                <motion.div
                  className={clsx(
                    "bg-klerosUIComponentsMediumBlue rounded-base relative w-full",
                    "flex flex-col items-center justify-center p-3",
                  )}
                  key={outcome.outcomeId}
                  layout
                  initial={{ opacity: 0, y: 0, scale: 1 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.5 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="flex flex-col items-center gap-2 max-sm:items-center sm:flex-row">
                    <div className="flex items-center space-x-2">
                      <div
                        className="size-2 rounded-full"
                        style={{
                          // colorOf only maps assets; without this "No To All"
                          // would fall through to the "Funds Based" purple.
                          backgroundColor: isNoToAll
                            ? NO_TO_ALL_COLOR
                            : colorOf(outcome.outcome),
                        }}
                      />
                      <span className="text-klerosUIComponentsPrimaryText text-sm font-semibold sm:text-base">
                        {outcome.outcome}
                      </span>
                    </div>

                    <div className="space-x-2">
                      <span className="text-klerosUIComponentsPrimaryText text-sm sm:text-base">
                        Probability
                      </span>
                      <span className="text-klerosUIComponentsPrimaryText text-sm font-semibold sm:text-base">
                        {formatPd((prediction ?? 0) * 100)}
                      </span>
                    </div>
                  </div>
                  {!isUndefined(outcome.probability) ? (
                    <label
                      className={clsx(
                        "text-xs sm:text-sm",
                        prediction > outcome.probability
                          ? "text-green-2"
                          : "text-red-2",
                      )}
                    >
                      {prediction > outcome.probability ? (
                        <ArrowUp className="[&_path]:fill-green-2 mr-1 inline size-3" />
                      ) : (
                        <ArrowDown className="[&_path]:fill-red-2 mr-1 inline size-3" />
                      )}
                      {`${prediction > outcome.probability ? "Higher" : "Lower"} than the market`}
                    </label>
                  ) : null}
                  {/* No remove button on "No To All": there is no store key to
                      delete, and the leg cannot be dropped without also
                      dropping the asset predictions that imply it. */}
                  {isNoToAll ? (
                    <span className="text-klerosUIComponentsSecondaryText mt-0.5 text-xs">
                      Derived from your asset predictions
                    </span>
                  ) : hasPredictions ? (
                    <LightButton
                      className="absolute top-1/2 right-2 -translate-y-1/2 p-1"
                      ariaLabel={`Remove ${outcome.outcome} prediction`}
                      text=""
                      icon={
                        <CloseIcon className="[&_path]:stroke-klerosUIComponentsSecondaryText size-4" />
                      }
                      onPress={() => removePrediction(outcome.outcomeId)}
                    />
                  ) : null}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </ScrollFade>
    </div>
  );
};

export default RiskMarketHeader;
