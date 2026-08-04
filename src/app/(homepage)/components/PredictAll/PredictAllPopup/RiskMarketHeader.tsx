import React from "react";

import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";

import { useRiskPredictionStore } from "@/store/riskMarketStore";

import { useAssetColorMap } from "@/hooks/useAssetColorMap";

import LightButton from "@/components/LightButton";
import { ScrollFade } from "@/components/ScrollFade";

import CloseIcon from "@/assets/svg/close-icon.svg";
import ArrowDown from "@/assets/svg/long-arrow-down.svg";
import ArrowUp from "@/assets/svg/long-arrow-up.svg";

import { isUndefined } from "@/utils";

import { assetColors } from "../../RiskPricing/constants";

const RiskMarketHeader: React.FC = () => {
  const outcomes = useRiskPredictionStore((state) => state.outcomes);
  const predictions = useRiskPredictionStore((state) => state.riskPredictions);
  const removePrediction = useRiskPredictionStore(
    (state) => state.removePrediction,
  );
  const colorOf = useAssetColorMap();
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
        <div className="flex w-full flex-col gap-0.25">
          <AnimatePresence>
            {outcomes.slice(0, -1).map((outcome) => {
              const prediction = predictions[outcome.outcomeId];
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
                          backgroundColor:
                            colorOf.get(outcome.outcome) ??
                            assetColors[
                              outcome.outcomeIndex % assetColors.length
                            ],
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
                        {predictions[outcome.outcomeId]
                          ? `${(predictions[outcome.outcomeId] * 100).toFixed(3)}%`
                          : "0%"}
                      </span>
                    </div>
                  </div>
                  {!isUndefined(predictions[outcome.outcomeId]) &&
                  !isUndefined(outcome.probability) ? (
                    <label
                      className={clsx(
                        "text-xs sm:text-sm",
                        predictions[outcome.outcomeId] > outcome.probability
                          ? "text-green-2"
                          : "text-red-2",
                      )}
                    >
                      {predictions[outcome.outcomeId] > outcome.probability ? (
                        <ArrowUp className="[&_path]:fill-green-2 mr-1 inline size-3" />
                      ) : (
                        <ArrowDown className="[&_path]:fill-red-2 mr-1 inline size-3" />
                      )}
                      {`${predictions[outcome.outcomeId] > outcome.probability ? "Higher" : "Lower"} than the market`}
                    </label>
                  ) : null}
                  {hasPredictions ? (
                    <LightButton
                      className="absolute top-1/2 right-2 -translate-y-1/2 p-1"
                      text=""
                      icon={
                        <CloseIcon className="[&_path]:stroke-klerosUIComponentsSecondaryText size-3" />
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
