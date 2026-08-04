"use client";

import { useMemo } from "react";

import { buildAssetColorMap } from "@/app/(homepage)/components/RiskPricing/constants";
import { useRiskPredictionStore } from "@/store/riskMarketStore";

/**
 * Asset colours for the places that hold a single outcome rather than the whole
 * asset list (accordion dots, resolved chips, balances). Built from the store's
 * outcome list - the same slice the charts use, so every dot on the page
 * matches its bar and its line.
 */
export const useAssetColorMap = () => {
  const outcomes = useRiskPredictionStore((state) => state.outcomes);
  return useMemo(
    // The last two outcomes are "No To All" and "Invalid", which are not assets
    // and keep their own colours.
    () =>
      buildAssetColorMap(outcomes.slice(0, -2).map(({ outcome }) => outcome)),
    [outcomes],
  );
};
