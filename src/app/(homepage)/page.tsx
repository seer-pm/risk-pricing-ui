"use client";

import { useEffect, useMemo } from "react";

import { Button } from "@kleros/ui-components-library";
import clsx from "clsx";
import { useLocalStorage, useToggle } from "react-use";
import { Address } from "viem";

import { useRiskPredictionStore } from "@/store/riskMarketStore";

import { TradeWalletProvider } from "@/context/TradeWalletContext";
import { isTwoStringsEqual } from "@/hooks/liquidity/utils";
import {
  yearlySurvivalToQuarterly,
  yearlyToQuarterly,
} from "@/hooks/useImpliedProbs";
import { useMarketData } from "@/hooks/useMarketData";

import FirstVisitGuide from "@/components/Guides/FirstVisit";
import Loader from "@/components/Loader";

import { isUndefined } from "@/utils";

import AdvancedSection from "./components/AdvancedSection";
import Header from "./components/Header";
import MarketEstimate from "./components/MarketEstimate";
import ParticipateSection from "./components/ParticipateSection";
import ExportPredictions from "./components/ParticipateSection/CsvUpload/ExportPredictions";
import PredictAll from "./components/PredictAll";
import QuarterTabs from "./components/QuarterTabs";
import RiskPricing from "./components/RiskPricing";

export default function Home() {
  const { data, isLoading } = useMarketData();
  const predictions = useRiskPredictionStore((state) => state.riskPredictions);
  const resetRiskPredictions = useRiskPredictionStore(
    (state) => state.resetRiskPredictions,
  );
  const hasPredictions = useMemo(() => {
    const outcomeMap = new Map(
      (data?.outcomes ?? []).map((o) => [o.outcomeId, o.probability]),
    );
    return Object.entries(predictions).some(
      ([predictionOutcomeId, prediction]) => {
        const marketProbability = outcomeMap.get(
          predictionOutcomeId as Address,
        );
        return prediction && prediction !== marketProbability;
      },
    );
  }, [predictions, data?.outcomes]);

  const [isOpen, toggleGuide] = useToggle(false);
  const [isOnboardingDone, setOnboardingDone] = useLocalStorage<boolean>(
    "onboarding-done",
    false,
  );

  useEffect(() => {
    if (!isOnboardingDone || isUndefined(isOnboardingDone)) {
      toggleGuide(true);
    }
  }, [isOnboardingDone, toggleGuide]);
  return (
    <div className="w-full px-4 py-12 md:px-8 lg:px-32">
      <div className="mx-auto max-w-294 space-y-6">
        <Header />
        <QuarterTabs />
        <div className="min-h-106 space-y-6">
          {!isLoading ? (
            <>
              {data?.outcomes ? (
                <MarketEstimate
                  assets={data.outcomes.slice(0, -2).map((outcome) => {
                    return {
                      symbol: outcome.outcome,
                      risk: Number((outcome.probability * 100).toFixed(3)),
                      quarterlyRisk: Number(
                        (yearlyToQuarterly(outcome.probability) * 100).toFixed(
                          3,
                        ),
                      ),
                    };
                  })}
                  noToAllProbability={
                    data.outcomes.at(-2)?.probability
                      ? Number(
                          (data.outcomes.at(-2)!.probability * 100).toFixed(3),
                        )
                      : undefined
                  }
                  noToAllQuarterlyProbability={
                    data.outcomes.at(-2)?.probability
                      ? Number(
                          (
                            yearlySurvivalToQuarterly(
                              data.outcomes.at(-2)!.probability,
                            ) * 100
                          ).toFixed(3),
                        )
                      : undefined
                  }
                />
              ) : null}
            </>
          ) : (
            <div className="flex h-96 w-full items-center justify-center">
              <Loader />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <TradeWalletProvider>
            <ParticipateSection />
            <div className="flex flex-col gap-4">
              {data?.outcomes
                ? data.outcomes.map((outcome) => {
                    if (isTwoStringsEqual(outcome.outcome, "invalid"))
                      return null;
                    return (
                      <RiskPricing
                        key={outcome.outcomeId}
                        outcome={outcome}
                        isNoToAll={
                          outcome.outcomeIndex === data!.outcomes!.length - 2
                        }
                      />
                    );
                  })
                : null}
            </div>
            {hasPredictions ? (
              <div
                className={clsx(
                  "flex w-full flex-wrap justify-between gap-4",
                  "flex-col-reverse items-start sm:flex-row sm:items-center",
                )}
              >
                <Button
                  variant="secondary"
                  small
                  text="Reset Predictions"
                  onPress={resetRiskPredictions}
                />
                <ExportPredictions />
              </div>
            ) : null}
            <PredictAll enabled={hasPredictions} />
          </TradeWalletProvider>

          <AdvancedSection />
        </div>

        <FirstVisitGuide
          isVisible={isOpen}
          closeGuide={() => {
            setOnboardingDone(true);
            toggleGuide(false);
          }}
        />
      </div>
    </div>
  );
}
