import { Address } from "viem";

import { getPoolAndTicksData } from "@/hooks/liquidity/getTicksData";
import { PoolInfo } from "@/hooks/liquidity/useMarketPools";
import { getVolumeUntilPriceDual } from "@/hooks/liquidity/useVolumeUntilPriceDual";
import {
  getToken0Token1,
  isTwoStringsEqual,
  tickToPrice,
} from "@/hooks/liquidity/utils";
import { ProcessedMarket } from "@/hooks/useProcessMarkets";

import { DECIMALS } from "@/consts";

export interface RiskPool {
  poolInfo: PoolInfo;
  ticks: { tickIdx: string; liquidityNet: string }[];
  /** Outcome token price in collateral, at full precision. */
  currentPrice: number;
}

interface IFetchRiskPool {
  underlying: Address;
  outcome: Address;
  symbol?: string;
}

/**
 * Pool state for one outcome, read once so the caller can both derive the live
 * market price from it and size the trade against it.
 *
 * Throws when the pool cannot be loaded. getPoolAndTicksData swallows subgraph
 * failures and returns {}, which used to surface three steps later as
 * "Cannot destructure property 'ticks' of undefined" - after the user's wallet
 * had been created and funded.
 */
export const fetchRiskPool = async ({
  underlying,
  outcome,
  symbol,
}: IFetchRiskPool): Promise<RiskPool> => {
  const { token0, token1 } = getToken0Token1(underlying, outcome);
  const ticksData = await getPoolAndTicksData(token0, token1);
  const entry = Object.values(ticksData)[0];
  if (!entry) {
    throw new Error(
      `Could not load pool data for ${symbol ?? outcome}. The market data service may be unavailable - nothing was traded, please try again later.`,
    );
  }
  const { ticks, poolInfo } = entry;

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

  return { poolInfo, ticks, currentPrice };
};

interface IProcessMarket {
  pool: RiskPool;
  underlying: Address;
  outcome: Address;
  targetPrice: number;
  /** Outcome tokens the trade wallet already holds. */
  balance: bigint;
  symbol?: string;
  isUserPrediction?: boolean;
}

export const processRiskMarket = ({
  pool,
  underlying,
  outcome,
  targetPrice,
  balance,
  symbol,
  isUserPrediction,
}: IProcessMarket): ProcessedMarket => {
  const { poolInfo, ticks, currentPrice } = pool;

  const direction = targetPrice > currentPrice ? "buy" : "sell";

  const volumeData =
    currentPrice === targetPrice
      ? { outcomeVolume: 0, collateralVolume: 0, targetReached: true }
      : getVolumeUntilPriceDual(
          poolInfo,
          ticks,
          targetPrice,
          outcome,
          direction,
        );

  return {
    action: direction,
    // minting is sized by getRiskQuotes from what the sell legs need, so there
    // is no pre-minted amount to carry on the leg any more
    underlyingBalance: 0n,
    balance,
    volumeUntilPrice: {
      outcomeVolume: volumeData.outcomeVolume,
      collateralVolume: volumeData.collateralVolume,
    },
    underlyingToken: underlying,
    token: outcome,
    difference: Math.abs(currentPrice - targetPrice),
    symbol,
    currentPrice,
    targetPrice,
    // the subgraph reports the fee in hundredths of a bip
    fee: poolInfo.fee / 1e6,
    targetReached: volumeData.targetReached,
    isUserPrediction,
  };
};
