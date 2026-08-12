import React, { useMemo } from "react";

import { CustomAccordion } from "@kleros/ui-components-library";
import clsx from "clsx";

import { sortOutcomesByCategory } from "@/app/(homepage)/components/RiskPricing/constants";
import { useRiskPredictionStore } from "@/store/riskMarketStore";

import { useTradeWallet } from "@/context/TradeWalletContext";
import { useAssetColorMap } from "@/hooks/useAssetColorMap";
import { useTokensBalances } from "@/hooks/useTokenBalances";

import ProjectAmount from "./ProjectAmount";

const ProjectBalances: React.FC = () => {
  const { tradeExecutor } = useTradeWallet();
  const outcomes = useRiskPredictionStore((state) => state.outcomes);
  const colorOf = useAssetColorMap();
  const { data: outcomeBalances } = useTokensBalances(
    tradeExecutor,
    outcomes.map(({ outcomeId }) => outcomeId),
  );
  // Balances come back in the order they were queried, so each one is carried
  // on its outcome before the list is grouped by category for display.
  const rows = useMemo(
    () =>
      sortOutcomesByCategory(
        outcomes.map((outcome, index) => ({
          ...outcome,
          balance: outcomeBalances?.[index],
        })),
        ({ outcome }) => outcome,
      ),
    [outcomes, outcomeBalances],
  );
  return (
    <CustomAccordion
      className="w-full max-w-full [&_#body-wrapper]:px-0 [&_#expand-button]:px-4!"
      items={[
        {
          title: (
            <div className="flex items-center gap-2">
              <label className="text-klerosUIComponentsPrimaryText text-sm">
                Asset tokens
              </label>
            </div>
          ),
          body: (
            <div
              className={clsx(
                "grid w-full grid-cols-[repeat(auto-fit,minmax(200px,260px))] place-content-center gap-4",
              )}
            >
              {rows.map(({ symbol, outcome, balance }) => (
                <ProjectAmount
                  key={symbol}
                  {...{
                    name: symbol,
                    color: colorOf(outcome),
                  }}
                  balance={balance}
                />
              ))}
            </div>
          ),
        },
      ]}
    />
  );
};

export default ProjectBalances;
