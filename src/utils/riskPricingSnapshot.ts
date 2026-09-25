import { Address, createPublicClient, http } from "viem";
import { gnosis } from "viem/chains";

import {
  deserializeMarket,
  Market,
  PoolHourData,
  SerializedMarket,
} from "@/types/market-types";

import {
  isTwoStringsEqual,
  sqrtPriceX96ToPrice,
} from "@/hooks/liquidity/utils";

import {
  getRiskPricingMarket,
  RISK_PRICING_MARKET_ID,
  RiskPricingMarketInfo,
} from "@/consts/markets";

import {
  computePrices,
  quarterlyToYearly,
  solveProbsBatchSync,
  solveProbsSync,
} from "./impliedProbsCore";
import {
  buildGrid,
  buildPriceMatrix,
  GRID_STEP_SECONDS,
} from "./riskChartData";
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

export interface RiskPricingHistory {
  marketId: Address;
  chainId: number;
  quarter: string;
  startTime: number;
  endTime: number;
  intervalSeconds: number;
  /** Unix seconds; every series below is aligned with this array. */
  times: number[];
  assets: {
    index: number;
    name: string;
    symbol: string;
    outcomeToken: Address;
    pdQuarterly: number[];
    pdYearly: number[];
  }[];
  noToAll: {
    index: number;
    outcomeToken: Address;
    /** Yearly probability that none of the listed assets defaults. */
    probability: number[];
  };
  solverMaxErr: number;
}

// Token symbols never change, so read them on-chain once per server instance.
const tokensCache = new Map<string, GetTokenResult[]>();
async function getAssetTokens(addresses: Address[]) {
  const key = addresses.join(",");
  const hit = tokensCache.get(key);
  if (hit) return hit;
  const client = createPublicClient({
    chain: gnosis,
    transport: http(
      process.env.NEXT_PUBLIC_GNOSIS_RPC || "https://rpc.gnosis.gateway.fm",
    ),
  });
  try {
    const tokens = await getTokensInfo(addresses, gnosis.id, client);
    tokensCache.set(key, tokens);
    return tokens;
  } catch {
    return undefined;
  }
}

const asJson = async (res: Response, label: string) => {
  if (!res.ok) throw new Error(`${label} request failed (${res.status})`);
  return res.json();
};

const CACHE_TTL_MS = 5 * 60 * 1000;

type CacheEntry<T> = { at: number; ttl: number; value: Promise<T> };

/**
 * Per-key promise cache. A failed build is dropped so the next request
 * retries; a `ttl` of Infinity keeps the value for the server's lifetime.
 */
function cached<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  ttl: number,
  build: () => Promise<T>,
): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < hit.ttl) return hit.value;
  const entry = { at: Date.now(), ttl, value: build() };
  cache.set(key, entry);
  entry.value.catch(() => {
    if (cache.get(key) === entry) cache.delete(key);
  });
  return entry.value;
}

async function fetchMarketInputs(marketId: Address) {
  const [rawMarket, chartData] = await Promise.all([
    fetch(`${SEER_FUNCTIONS}/get-market`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chainId: gnosis.id, id: marketId }),
      cache: "no-store",
    }).then((res) => asJson(res, "Market") as Promise<SerializedMarket>),
    fetch(
      `${SEER_FUNCTIONS}/market-chart?marketId=${marketId}&chainId=${gnosis.id}`,
      { cache: "no-store" },
    ).then((res) => asJson(res, "Market chart") as Promise<PoolHourData[][]>),
  ]);
  const market = deserializeMarket(rawMarket);
  // Outcomes are [...assets, "No To All", "Invalid"].
  const assetCount = market.wrappedTokens.length - 2;
  return { market, chartData, assetCount };
}

const assetLabel = (
  market: Market,
  tokens: GetTokenResult[] | undefined,
  index: number,
) => {
  const name = market.outcomes[index] ?? "";
  return {
    name,
    symbol: tokens?.[index]?.symbol ?? name.slice(0, 11).toUpperCase(),
  };
};

const snapshotCache = new Map<string, CacheEntry<RiskPricingSnapshot>>();

/**
 * Server-side equivalent of useMarketData: latest pool prices, the implied
 * quarterly PDs, and their yearly conversion, as shown in the UI. Cached for
 * five minutes per market and server instance (the upstream chart data is
 * hourly).
 */
export function getRiskPricingSnapshot(
  marketId: Address = RISK_PRICING_MARKET_ID,
): Promise<RiskPricingSnapshot> {
  return cached(snapshotCache, marketId.toLowerCase(), CACHE_TTL_MS, () =>
    buildSnapshot(marketId),
  );
}

async function buildSnapshot(marketId: Address): Promise<RiskPricingSnapshot> {
  const { market, chartData, assetCount } = await fetchMarketInputs(marketId);

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

  const solved = solveProbsSync(prices.slice(0, assetCount));
  const yearlyProbs = solved.probs.map(quarterlyToYearly);
  const { priceY: yearlySurvival } = computePrices(yearlyProbs);

  const tokens = await getAssetTokens(
    market.wrappedTokens.slice(0, assetCount),
  );

  return {
    marketId,
    chainId: gnosis.id,
    collateral: market.collateralToken,
    updatedAt,
    assets: solved.probs.map((pdQuarterly, index) => ({
      index,
      ...assetLabel(market, tokens, index),
      outcomeToken: market.wrappedTokens[index],
      price: prices[index] ?? 0,
      pdQuarterly,
      pdYearly: yearlyProbs[index],
    })),
    noToAll: {
      index: assetCount,
      outcomeToken: market.wrappedTokens[assetCount],
      price: prices[assetCount] ?? 0,
      probability: yearlySurvival,
    },
    solverMaxErr: solved.maxErr,
  };
}

const historyCache = new Map<string, CacheEntry<RiskPricingHistory>>();

/**
 * Server-side equivalent of useRiskPdHistory: every asset's PD on the "Over
 * Time" chart's 4h grid, from the same resampling and batch solver. Cached for
 * five minutes per market, and for good once the market's window has closed.
 */
export function getRiskPricingHistory(
  info: RiskPricingMarketInfo = getRiskPricingMarket()!,
): Promise<RiskPricingHistory> {
  const final = Date.now() / 1000 > info.endTime;
  return cached(
    historyCache,
    info.id.toLowerCase(),
    final ? Infinity : CACHE_TTL_MS,
    () => buildHistory(info),
  );
}

// Six significant digits is well within the pools' own precision, and keeps
// the payload (assets x grid points x 2 series) manageable.
const round = (x: number) => Number(x.toPrecision(6));

async function buildHistory(
  info: RiskPricingMarketInfo,
): Promise<RiskPricingHistory> {
  const { market, chartData, assetCount } = await fetchMarketInputs(info.id);
  const assetTokens = market.wrappedTokens.slice(0, assetCount);

  const grid = buildGrid(
    info.startTime,
    Math.min(Math.floor(Date.now() / 1000), info.endTime),
  );
  const { times, matrix } = buildPriceMatrix(
    chartData.slice(0, assetCount),
    assetTokens,
    grid,
  );
  const solved = matrix.length
    ? solveProbsBatchSync(matrix)
    : { probs: [], maxErrs: [] };
  const yearly = solved.probs.map((row) => row.map(quarterlyToYearly));

  const tokens = await getAssetTokens(assetTokens);

  return {
    marketId: info.id,
    chainId: gnosis.id,
    quarter: info.quarter,
    startTime: info.startTime,
    endTime: info.endTime,
    intervalSeconds: GRID_STEP_SECONDS,
    times,
    assets: assetTokens.map((outcomeToken, index) => ({
      index,
      ...assetLabel(market, tokens, index),
      outcomeToken,
      pdQuarterly: solved.probs.map((row) => round(row[index])),
      pdYearly: yearly.map((row) => round(row[index])),
    })),
    noToAll: {
      index: assetCount,
      outcomeToken: market.wrappedTokens[assetCount],
      probability: yearly.map((row) =>
        round(row.reduce((acc, p) => acc * (1 - p), 1)),
      ),
    },
    solverMaxErr: solved.maxErrs.reduce((max, e) => Math.max(max, e), 0),
  };
}
