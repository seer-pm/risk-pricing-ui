import React from "react";

import { CustomAccordion } from "@kleros/ui-components-library";
import clsx from "clsx";

import { useRiskPredictionStore } from "@/store/riskMarketStore";

import { useTradeWallet } from "@/context/TradeWalletContext";
import { useAssetColorMap } from "@/hooks/useAssetColorMap";
import { useTokensBalances } from "@/hooks/useTokenBalances";

import { assetColors } from "../../../RiskPricing/constants";

import ProjectAmount from "./ProjectAmount";

const ProjectBalances: React.FC = () => {
  const { tradeExecutor } = useTradeWallet();
  const outcomes = useRiskPredictionStore((state) => state.outcomes);
  const colorOf = useAssetColorMap();
  const { data: outcomeBalances } = useTokensBalances(
    tradeExecutor,
    outcomes.map(({ outcomeId }) => outcomeId),
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
              {outcomes.map(({ symbol, outcome, outcomeIndex }, i) => (
                <ProjectAmount
                  key={symbol}
                  {...{
                    name: symbol,
                    color:
                      colorOf.get(outcome) ??
                      assetColors[outcomeIndex % assetColors.length],
                  }}
                  balance={outcomeBalances?.[i]}
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
