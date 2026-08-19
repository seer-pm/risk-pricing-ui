import { Address } from "viem";

import { getPoolAndTicksData } from "@/hooks/liquidity/getTicksData";
import { getVolumeUntilPriceDual } from "@/hooks/liquidity/useVolumeUntilPriceDual";
import {
  getToken0Token1,
  isTwoStringsEqual,
  tickToPrice,
} from "@/hooks/liquidity/utils";
import { fetchTokenBalance } from "@/hooks/useTokenBalance";

import { DECIMALS } from "@/consts";

interface IProcessMarket {
  underlying: Address;
  outcome: Address;
  targetPrice: number;
  tradeExecutor: Address;
  mintAmount?: bigint;
  symbol?: string;
}

export const processRiskMarket = async ({
  underlying,
  outcome,
  targetPrice,
  tradeExecutor,
  mintAmount,
  symbol,
}: IProcessMarket) => {
  try {
    const { token0, token1 } = getToken0Token1(underlying, outcome);
    const ticksData = await getPoolAndTicksData(token0, token1);
    const { ticks, poolInfo } = Object.values(ticksData)[0];

    const outcomeBalance = await fetchTokenBalance(tradeExecutor, outcome);

    // calculate overshoot parameters
    let volumeData;
    // keepPrecision is required, not cosmetic. Without it tickToPrice rounds to
    // 4 decimals, and outcomes here trade between 1e-4 and 4e-2 - PYUSD's true
    // 1.494e-4 became 1.000e-4, a 33% error. The direction below was then
    // decided against that rounded price while getVolumeUntilPriceDual measures
    // volume from the exact getSqrtRatioAtTick(tick), so any target landing in
    // the gap between the two sat on the wrong side of spot for the chosen
    // direction and returned zero volume - reported to the user as "pool
    // already at your prediction". Replayed against live pools, that silently
    // dropped 12 of 34 legs.
    const currentPrice = Number(
      tickToPrice(poolInfo.tick, DECIMALS, true)[
        isTwoStringsEqual(poolInfo.token0, outcome) ? 0 : 1
      ],
    );

    const direction = targetPrice > currentPrice ? "buy" : "sell";

    if (currentPrice === targetPrice) {
      volumeData = { outcomeVolume: 0, collateralVolume: 0 };
    } else {
      volumeData = getVolumeUntilPriceDual(
        poolInfo,
        ticks,
        targetPrice!,
        outcome,
        direction,
      );
    }

    return {
      action: direction,
      underlyingBalance: mintAmount ?? 0n,
      balance: outcomeBalance.value,
      volumeUntilPrice: volumeData,
      underlyingToken: underlying,
      token: outcome,
      difference: Math.abs(currentPrice - targetPrice),
      symbol,
    };
  } catch (e) {
    if (e instanceof Error) {
      throw new Error(`Error processing market: ${e.message}`);
    } else {
      throw e;
    }
  }
};
