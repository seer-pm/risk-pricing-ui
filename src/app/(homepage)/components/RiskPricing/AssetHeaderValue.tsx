"use client";

import React, { useCallback } from "react";

import {
  selectAssetProbability,
  useRiskPredictionStore,
} from "@/store/riskMarketStore";

import { RiskPricingOutcome } from "@/hooks/useMarketData";

import { formatPd } from "@/utils";

import DeltaChip from "./DeltaChip";

/**
 * The live PD sitting in a collapsed asset card header.
 *
 * This is the whole "No To All -> assets" half of the coupling: dragging the
 * strip rewrites all 33 assets at once, and without a number on each header the
 * user would have to expand every card to see that anything happened.
 *
 * Deliberately its own memoised component rather than markup inside the card:
 * it subscribes to one number, so a strip drag updates 33 text nodes without
 * re-rendering 33 card shells, their sliders and their Credora panels.
 */
const AssetHeaderValue = ({ outcome }: { outcome: RiskPricingOutcome }) => {
  const { outcomeId, probability } = outcome;

  const pdPercent = useRiskPredictionStore(
    useCallback(
      (state) =>
        selectAssetProbability(state, { outcomeId, probability }) * 100,
      [outcomeId, probability],
    ),
  );

  const marketPercent = probability * 100;

  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      {/* tabular-nums: the digits are re-rendered on every frame of a drag, and
          proportional figures make the readout jitter sideways as they change. */}
      <span className="text-klerosUIComponentsPrimaryText text-sm font-semibold tabular-nums">
        {formatPd(pdPercent)}
      </span>
      {/* A rise here is a rise in probability of default, so it is bad news. */}
      <DeltaChip deltaPercent={pdPercent - marketPercent} riseIsGood={false} />
    </div>
  );
};

export default React.memo(AssetHeaderValue);
