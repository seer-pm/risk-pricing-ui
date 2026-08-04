import React, { useMemo } from "react";

import { Tooltip } from "@kleros/ui-components-library";
import clsx from "clsx";
import Link from "next/link";
import { Address } from "viem";

import { RiskPricingOutcome } from "@/hooks/useMarketData";
import { useRiskMarketResolution } from "@/hooks/useRiskMarketResolution";
import { useRiskTokenPositionValue } from "@/hooks/useRiskTokenPositionValue";

import InfoIcon from "@/assets/svg/info.svg";

import { formatUsd, formatValue, isUndefined } from "@/utils";

import { advancedUserGuide } from "@/consts/markets";

interface IPositionValue {
  outcome: RiskPricingOutcome;
  tradeExecutor: Address;
}

const PositionValue: React.FC<IPositionValue> = ({
  outcome,
  tradeExecutor,
}) => {
  const {
    outcomeId,
    collateral,
    price: marketPrice,
    symbol,
    outcomeIndex,
  } = outcome;
  const { isResolved, payoutFractions } = useRiskMarketResolution();
  // once resolved, the redeemable value per token is the reported payout
  // fraction, not the (stale) pool price
  const effectivePrice = isResolved
    ? (payoutFractions?.[outcomeIndex] ?? 0)
    : marketPrice;
  const {
    value: totalValue,
    balance,
    price,
  } = useRiskTokenPositionValue(
    outcomeId,
    collateral,
    tradeExecutor ?? "0x",
    effectivePrice,
  );

  const displayTotal = useMemo(() => {
    if (totalValue > 0) {
      if (totalValue < 0.01) {
        return "<0.01";
      } else {
        return totalValue;
      }
    }
    return "0";
  }, [totalValue]);

  if (displayTotal === "0" || (marketPrice === 0 && !isResolved)) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-klerosUIComponentsPrimaryText text-sm font-semibold">
        {isResolved ? "Position to redeem:" : "Details of your position:"}
      </h3>
      <div
        className={clsx(
          "flex flex-col justify-start gap-4",
          "flex-wrap md:flex-row md:items-center md:justify-center",
        )}
      >
        {!isUndefined(balance) && balance > 0 ? (
          <>
            <p className="text-klerosUIComponentsPrimaryText justify-center text-sm">
              <span className="font-bold">
                {formatValue(balance ?? 0n, 18)} {symbol} &nbsp;
              </span>
              ~{formatUsd(totalValue)} &nbsp;
              <span className="text-klerosUIComponentsSecondaryText text-xs">
                ({formatUsd(price)} per {symbol})
              </span>
            </p>
            <span className="text-klerosUIComponentsPrimaryText justify-center text-sm max-md:hidden">
              {" | "}
            </span>
          </>
        ) : null}

        <Tooltip
          text="Click here to understand your Position"
          small
          delay={0}
          closeDelay={300}
          className="px-2 py-2 [&_small]:text-xs"
        >
          <Link
            href={advancedUserGuide}
            target="_blank"
            rel="noopener noreferrer"
            className={clsx(
              "flex items-center gap-1",
              "text-klerosUIComponentsPrimaryText justify-center text-sm",
              "hover:text-klerosUIComponentsPrimaryBlue transition-colors",
            )}
            onClick={(e) => e.stopPropagation()}
          >
            Total:
            <span className="font-bold"> {formatUsd(totalValue)} </span>
            <InfoIcon className="mb-0.25 inline size-3" />
          </Link>
        </Tooltip>
      </div>
      {isResolved ? (
        <p className="text-klerosUIComponentsSecondaryText text-xs">
          Use &quot;Redeem outcome tokens&quot; in the Trade Wallet above to
          redeem your position.
        </p>
      ) : null}
    </div>
  );
};

export default PositionValue;
