"use client";

import { useEffect, useMemo } from "react";

import { Button } from "@kleros/ui-components-library";
import clsx from "clsx";
import { useLocalStorage, useToggle } from "react-use";
import { Address } from "viem";

import { useRiskPredictionStore } from "@/store/riskMarketStore";

import { TradeWalletProvider } from "@/context/TradeWalletContext";
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
import AssetGroups from "./components/RiskPricing/AssetGroups";
import { sortOutcomesByCategory } from "./components/RiskPricing/constants";
import NoToAllStrip from "./components/RiskPricing/NoToAllStrip";

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

  // Every list on the page plots the same assets, so they are grouped by
  // category once here and shared. "No To All" and "Invalid" stay pinned to the
  // end, which is what the slice(0, -2) / at(-2) reads below rely on.
  const sortedOutcomes = useMemo(
    () =>
      data?.outcomes
        ? sortOutcomesByCategory(data.outcomes, ({ outcome }) => outcome)
        : undefined,
    [data?.outcomes],
  );

  // The outcome tail is always [...assets, "No To All", "Invalid"], and
  // sortOutcomesByCategory pins those two to the end, so position is what
  // separates them here as it does everywhere else on the risk path.
  const assetOutcomes = useMemo(
    () => sortedOutcomes?.slice(0, -2),
    [sortedOutcomes],
  );
  const noToAllOutcome = sortedOutcomes?.at(-2);

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
              {sortedOutcomes ? (
                // Values are passed through raw: formatPd owns the rounding, so
                // pre-rounding here would strip trailing zeros and leave the
                // column of PDs ragged.
                <MarketEstimate
                  assets={sortedOutcomes.slice(0, -2).map((outcome) => {
                    return {
                      symbol: outcome.outcome,
                      risk: outcome.probability * 100,
                      quarterlyRisk:
                        yearlyToQuarterly(outcome.probability) * 100,
                    };
                  })}
                  noToAllProbability={
                    sortedOutcomes.at(-2)?.probability
                      ? sortedOutcomes.at(-2)!.probability * 100
                      : undefined
                  }
                  noToAllQuarterlyProbability={
                    sortedOutcomes.at(-2)?.probability
                      ? yearlySurvivalToQuarterly(
                          sortedOutcomes.at(-2)!.probability,
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
            {/* "No To All" is not a card in this list any more: it is the one
                number every asset slider moves, so it is pinned above them
                rather than sitting 33 cards further down. "Invalid" is never
                traded and never shown - the slice drops both. */}
            {noToAllOutcome ? <NoToAllStrip outcome={noToAllOutcome} /> : null}
            {assetOutcomes ? <AssetGroups assets={assetOutcomes} /> : null}
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
