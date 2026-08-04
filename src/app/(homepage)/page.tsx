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
import PredictionsCsvButton from "./components/ParticipateSection/CsvUpload/PredictionsCsvButton";
import PredictAll from "./components/PredictAll";
import QuarterTabs from "./components/QuarterTabs";
import RiskPricing from "./components/RiskPricing";

export default function Home() {
  const { data, isLoading, isError, refetch, isRefetching } = useMarketData();
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
          {isError ? (
            <div className="border-klerosUIComponentsStroke flex h-96 w-full flex-col items-center justify-center gap-4 rounded-xl border border-dashed px-4 text-center">
              <p className="text-klerosUIComponentsPrimaryText text-base font-semibold">
                Couldn&apos;t load market data
              </p>
              <p className="text-klerosUIComponentsSecondaryText max-w-100 text-sm">
                The market feed is unreachable right now. Your predictions are
                saved locally and nothing has been lost.
              </p>
              <Button
                variant="secondary"
                small
                isLoading={isRefetching}
                text="Try again"
                onPress={() => refetch()}
              />
            </div>
          ) : !isLoading ? (
            <>
              {data?.outcomes ? (
                // Values are passed through raw: formatPd owns the rounding, so
                // pre-rounding here would strip trailing zeros and leave the
                // column of PDs ragged.
                <MarketEstimate
                  assets={data.outcomes.slice(0, -2).map((outcome) => {
                    return {
                      symbol: outcome.outcome,
                      risk: outcome.probability * 100,
                      quarterlyRisk:
                        yearlyToQuarterly(outcome.probability) * 100,
                    };
                  })}
                  noToAllProbability={
                    data.outcomes.at(-2)?.probability
                      ? data.outcomes.at(-2)!.probability * 100
                      : undefined
                  }
                  noToAllQuarterlyProbability={
                    data.outcomes.at(-2)?.probability
                      ? yearlySurvivalToQuarterly(
                          data.outcomes.at(-2)!.probability,
                        ) * 100
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
                <PredictionsCsvButton text="Export Predictions" />
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
