import { Address, createPublicClient, http } from "viem";
import { gnosis } from "viem/chains";

import {
  deserializeMarket,
  PoolHourData,
  SerializedMarket,
} from "@/types/market-types";

import {
  isTwoStringsEqual,
  sqrtPriceX96ToPrice,
} from "@/hooks/liquidity/utils";

import { RISK_PRICING_MARKET_ID } from "@/consts/markets";

import {
  computePrices,
  quarterlyToYearly,
  solveProbsSync,
} from "./impliedProbsCore";
import { GetTokenResult, getTokensInfo } from "./tokensInfo";

const SEER_FUNCTIONS = "https://app.seer.pm/.netlify/functions";

export interface RiskPricingSnapshot {
  marketId: Address;
  chainId: number;
  collateral: Address;
  /** Latest pool-hour timestamp (unix seconds) across the outcome pools. */
  updatedAt: number | null;
  assets: {
    index: number;
    name: string;
    symbol: string;
    outcomeToken: Address;
    price: number;
    pdQuarterly: number;
    pdYearly: number;
  }[];
  noToAll: {
    index: number;
    outcomeToken: Address;
    price: number;
    /** Yearly probability that none of the listed assets defaults. */
    probability: number;
  };
  solverMaxErr: number;
}

// Token symbols never change, so read them on-chain once per server instance.
let tokensCache: { key: string; tokens: GetTokenResult[] } | undefined;
async function getAssetTokens(addresses: Address[]) {
  const key = addresses.join(",");
  if (tokensCache?.key === key) return tokensCache.tokens;
  const client = createPublicClient({
    chain: gnosis,
    transport: http(
      process.env.NEXT_PUBLIC_GNOSIS_RPC || "https://rpc.gnosis.gateway.fm",
    ),
  });
  try {
    const tokens = await getTokensInfo(addresses, gnosis.id, client);
    tokensCache = { key, tokens };
    return tokens;
  } catch {
    return undefined;
  }
}

const asJson = async (res: Response, label: string) => {
  if (!res.ok) throw new Error(`${label} request failed (${res.status})`);
  return res.json();
};

const SNAPSHOT_TTL_MS = 5 * 60 * 1000;
let snapshotCache:
  | { at: number; value: Promise<RiskPricingSnapshot> }
  | undefined;

/**
 * Server-side equivalent of useMarketData: latest pool prices, the implied
 * quarterly PDs, and their yearly conversion, as shown in the UI. Cached for
 * five minutes per server instance (the upstream chart data is hourly); a
 * failed build is dropped so the next request retries.
 */
export function getRiskPricingSnapshot(): Promise<RiskPricingSnapshot> {
  if (snapshotCache && Date.now() - snapshotCache.at < SNAPSHOT_TTL_MS) {
    return snapshotCache.value;
  }
  const entry = { at: Date.now(), value: buildSnapshot() };
  snapshotCache = entry;
  entry.value.catch(() => {
    if (snapshotCache === entry) snapshotCache = undefined;
  });
  return entry.value;
}

async function buildSnapshot(): Promise<RiskPricingSnapshot> {
  const [rawMarket, chartData] = await Promise.all([
    fetch(`${SEER_FUNCTIONS}/get-market`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chainId: gnosis.id, id: RISK_PRICING_MARKET_ID }),
      cache: "no-store",
    }).then((res) => asJson(res, "Market") as Promise<SerializedMarket>),
    fetch(
      `${SEER_FUNCTIONS}/market-chart?marketId=${RISK_PRICING_MARKET_ID}&chainId=${gnosis.id}`,
      { cache: "no-store" },
    ).then((res) => asJson(res, "Market chart") as Promise<PoolHourData[][]>),
  ]);
  const market = deserializeMarket(rawMarket);

  const prices = chartData.map((outcomeChartData, index) => {
    const latest = outcomeChartData.at(-1);
    if (!latest) return 0;
    const [price0, price1] = sqrtPriceX96ToPrice(
      BigInt(latest.sqrtPrice),
      undefined,
      true,
    );
    return isTwoStringsEqual(market.wrappedTokens[index], latest.pool.token0.id)
      ? Number(price0)
      : Number(price1);
  });
  const updatedAt = chartData.reduce<number | null>((max, series) => {
    const t = series.at(-1)?.periodStartUnix;
    return t !== undefined && (max === null || t > max) ? t : max;
  }, null);

  // Outcomes are [...assets, "No To All", "Invalid"].
  const assetCount = market.wrappedTokens.length - 2;
  const solved = solveProbsSync(prices.slice(0, assetCount));
  const yearlyProbs = solved.probs.map(quarterlyToYearly);
  const { priceY: yearlySurvival } = computePrices(yearlyProbs);

  const tokens = await getAssetTokens(
    market.wrappedTokens.slice(0, assetCount),
  );

  return {
    marketId: RISK_PRICING_MARKET_ID,
    chainId: gnosis.id,
    collateral: market.collateralToken,
    updatedAt,
    assets: solved.probs.map((pdQuarterly, index) => {
      const name = market.outcomes[index] ?? "";
      return {
        index,
        name,
        symbol: tokens?.[index]?.symbol ?? name.slice(0, 11).toUpperCase(),
        outcomeToken: market.wrappedTokens[index],
        price: prices[index] ?? 0,
        pdQuarterly,
        pdYearly: yearlyProbs[index],
      };
    }),
    noToAll: {
      index: assetCount,
      outcomeToken: market.wrappedTokens[assetCount],
      price: prices[assetCount] ?? 0,
      probability: yearlySurvival,
    },
    solverMaxErr: solved.maxErr,
  };
}
