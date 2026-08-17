import { gnosis, mainnet, optimism, base } from "viem/chains";

export type AssetCategoryId = "eth" | "usd" | "btc" | "funds";

type AssetCategory = {
  id: AssetCategoryId;
  label: string;
  match: (symbol: string) => boolean;
  color: string;
};

/**
 * Assets are grouped by what they are pegged to, and every member of a group
 * shares its colour - the list can grow to any length, so a colour identifies
 * the category rather than the individual asset. Order matters: the first
 * match wins, and "Funds Based" is the catch-all.
 */
export const ASSET_CATEGORIES: AssetCategory[] = [
  {
    id: "eth",
    label: "ETH Based",
    match: (symbol) => /eth/i.test(symbol),
    color: "#2563eb",
  },
  {
    id: "usd",
    label: "USD Based",
    match: (symbol) => /usd/i.test(symbol),
    color: "#16a34a",
  },
  {
    id: "btc",
    label: "BTC Based",
    match: (symbol) => /btc/i.test(symbol),
    color: "#ea580c",
  },
  {
    id: "funds",
    label: "Funds Based",
    match: () => true,
    color: "#9333ea",
  },
];

export const getAssetCategory = (symbol: string): AssetCategory =>
  ASSET_CATEGORIES.find(({ match }) => match(symbol)) ??
  ASSET_CATEGORIES[ASSET_CATEGORIES.length - 1];

/** symbol -> its category colour. */
export const buildAssetColorMap = (symbols: string[]): Map<string, string> =>
  new Map(symbols.map((symbol) => [symbol, getAssetCategory(symbol).color]));

const CATEGORY_RANK = new Map<AssetCategoryId, number>(
  ASSET_CATEGORIES.map(({ id }, index) => [id, index]),
);

/**
 * Groups assets by category in {@link ASSET_CATEGORIES} order, so every list on
 * the page reads ETH -> USD -> BTC -> Funds. The sort is stable, which keeps
 * the market's own order inside each group.
 *
 * Display-only: the market order is what the trade flow prices against
 * (usePredictRiskFlow pairs probabilities with outcomes by index), so the
 * store's outcome list is never reordered.
 */
export const sortAssetsByCategory = <T>(
  items: T[],
  getSymbol: (item: T) => string,
): T[] =>
  [...items].sort(
    (a, b) =>
      (CATEGORY_RANK.get(getAssetCategory(getSymbol(a)).id) ?? 0) -
      (CATEGORY_RANK.get(getAssetCategory(getSymbol(b)).id) ?? 0),
  );

/**
 * {@link sortAssetsByCategory} for a full outcome list: the last two outcomes
 * are "No To All" and "Invalid" rather than assets, and every caller slices
 * them off by position, so they stay pinned to the end.
 */
export const sortOutcomesByCategory = <T>(
  outcomes: T[],
  getSymbol: (outcome: T) => string,
): T[] =>
  outcomes.length <= 2
    ? outcomes
    : [
        ...sortAssetsByCategory(outcomes.slice(0, -2), getSymbol),
        ...outcomes.slice(-2),
      ];

/**
 * Credora's two headline metrics: shown first and emphasised in the risk panel.
 */
export const PRIORITY_METRICS = ["Asset Quality", "Protocol Security"];

/**
 * "No To All" is not an asset and its slider does not read as a PD - a high
 * value there is the good outcome. It gets the emerald of its summary card in
 * the market estimate, kept clear of every category colour.
 */
export const NO_TO_ALL_COLOR = "#059669";
/** Filled slider track for "No To All" (assets use a pale green). */
export const NO_TO_ALL_TRACK_COLOR = "#A7F3D0";

type Zone = {
  label: string;
  emoji: string;
  from: number;
  to: number;
  colors: string[];
};

export const zones: Zone[] = [
  {
    label: "SAFE",
    emoji: "😊",
    from: 0,
    to: 2,
    colors: ["#bbf7d0", "#dcfce7"],
  },
  {
    label: "CAUTION",
    emoji: "🙄",
    from: 2,
    to: 5,
    colors: ["#fef9c3", "#fed7aa"],
  },
  {
    label: "WARNING",
    emoji: "😬",
    from: 5,
    to: 10,
    colors: ["#fbcfe8", "#f9a8d4"],
  },
  {
    label: "DANGER",
    emoji: "😱",
    from: 10,
    to: 100,
    colors: ["#f9a8d4", "#fb7185"],
  },
];
export const zoneAxis = zones
  .map((x) => x.from)
  .concat([zones.at(-1)?.to ?? 100]);

/** Top of the PD scale, in percent. */
export const MAX_RISK = 100;

/**
 * PD spans orders of magnitude across assets (0.05% to 30%+), so every plot of
 * it - the market-estimate bars, the prediction slider and the zone bar - maps
 * value to horizontal position on the same log scale. Returns 0..100 as a
 * percentage of track width.
 */
export const logScalePercent = (value: number): number => {
  if (value <= 0) return 0;
  return (Math.log10(value + 1) / Math.log10(MAX_RISK + 1)) * MAX_RISK;
};

/** Inverse of {@link logScalePercent} - track position back to a PD. */
export const logScaleToValue = (percent: number): number =>
  Math.pow(10, (percent / MAX_RISK) * Math.log10(MAX_RISK + 1)) - 1;

export const MARKET_PD_TOOLTIP =
  "The market's current consensus on the annualized probability this asset defaults, implied by current trading prices.";

// "No To All" is the opposite of a PD: it pays out when nothing defaults, so it
// needs its own caption and explanation rather than the per-asset one.
export const NO_TO_ALL_LABEL = "Market Estimate (Ann.)";
// Second paragraph covers the slider itself, which is read-only. The tooltip
// renders with whitespace-pre-line, so the blank line survives.
export const NO_TO_ALL_TOOLTIP =
  "The market's current consensus on the annualized probability that none " +
  "of the listed assets default, implied by current trading prices.\n\n" +
  "This slider can't be moved. Its value is calculated from your " +
  "predictions.";
export const BLOCK_EXPLORER_URLS: Partial<Record<number, string>> = {
  [gnosis.id]: "https://gnosisscan.io",
  [mainnet.id]: "https://etherscan.io",
  [optimism.id]: "https://optimistic.etherscan.io",
  [base.id]: "https://basescan.org",
};
