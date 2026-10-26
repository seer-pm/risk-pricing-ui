import { gnosis, mainnet, optimism, base } from "viem/chains";

export type AssetCategoryId = "eth" | "usd" | "btc" | "funds";

type AssetCategory = {
  id: AssetCategoryId;
  label: string;
  match: (symbol: string) => boolean;
  color: string;
};

/** Categories have a stable order and use the four kit swatches in that order. */
export const ASSET_CATEGORIES: AssetCategory[] = [
  {
    id: "eth",
    label: "ETH Based",
    match: (symbol) => /eth/i.test(symbol),
    color: "var(--seer-series-1)",
  },
  {
    id: "usd",
    label: "USD Based",
    match: (symbol) => /usd/i.test(symbol),
    color: "var(--seer-series-2)",
  },
  {
    id: "btc",
    label: "BTC Based",
    match: (symbol) => /btc/i.test(symbol),
    color: "var(--seer-series-3)",
  },
  {
    id: "funds",
    label: "Funds Based",
    match: () => true,
    color: "var(--seer-series-4)",
  },
];

export const getAssetCategory = (symbol: string): AssetCategory =>
  ASSET_CATEGORIES.find(({ match }) => match(symbol)) ??
  ASSET_CATEGORIES[ASSET_CATEGORIES.length - 1];

/** Slots belong to selected symbols. Removing one leaves every surviving slot unchanged. */
export const buildAssetColorMap = (
  symbols: string[],
  slots: (string | null)[] = symbols.slice(0, 4),
): Map<string, string> =>
  new Map(
    symbols.map((symbol) => {
      const slot = slots.indexOf(symbol);
      return [
        symbol,
        slot >= 0 && slot < 4
          ? `var(--seer-series-${slot + 1})`
          : "var(--seer-muted)",
      ];
    }),
  );

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

/** Survival and default are the two sides of the reading, separate from gain/loss status. */
export const NO_TO_ALL_COLOR = "var(--seer-series-2)";
export const NO_TO_ALL_TRACK_COLOR = "var(--seer-series-2)";

export type Zone = {
  /** Base word only - RiskZoneBar appends " RISK" once the track has room. */
  label: string;
  from: number;
  to: number;
  /**
   * Pastel pair used to FILL an area at this risk level: the asset bars in
   * MarketEstimateRisk and the market pin on a PredictionSlider.
   *
   * Deliberately NOT the legend palette below. These fills are wide, and the
   * asset bars carry a category colour at 70% opacity on top of them, which a
   * saturated pair would drown.
   */
  colors: string[];
  /**
   * Saturated colour for the legend LINE and its icon pill.
   *
   * The legend is a thin rule rather than a filled band, and the pastel pair
   * above is all but invisible at that weight against the light background -
   * saturation is what carries the colour once the height is gone.
   */
  accent: string;
};

export const zones: Zone[] = [
  {
    label: "LOW",
    from: 0,
    to: 2,
    colors: ["var(--seer-surface-raised)", "var(--seer-accent-soft)"],
    accent: "var(--seer-muted)",
  },
  {
    label: "MODERATE",
    from: 2,
    to: 5,
    colors: ["var(--seer-surface-raised)", "var(--seer-accent-soft)"],
    accent: "var(--seer-muted)",
  },
  {
    label: "HIGH",
    from: 5,
    to: 10,
    colors: ["var(--seer-surface-raised)", "var(--seer-accent-soft)"],
    accent: "var(--seer-muted)",
  },
  {
    label: "CRITICAL",
    from: 10,
    to: 100,
    colors: ["var(--seer-surface-raised)", "var(--seer-accent-soft)"],
    accent: "var(--seer-muted)",
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

/**
 * Track position of a zone's centre, 0..100.
 *
 * The legend places a zone's icon and label here AND anchors that zone's
 * gradient stop here, so a pill always sits on solid colour of its own accent -
 * icon and line cannot drift apart.
 *
 * Declared below logScalePercent on purpose: ZONE_LEGEND_GRADIENT runs it at
 * module load, and a const arrow function is still in its TDZ above this point.
 */
export const zoneMidpointPercent = (zone: Zone): number =>
  (logScalePercent(zone.from) + logScalePercent(zone.to)) / 2;

/**
 * One continuous ramp across the whole legend track.
 *
 * A zone reaches its own accent at its icon - the band midpoint - and then holds
 * it flat to the end of the band, so every pill sits on solid colour of its own
 * accent and all the blending happens in the gaps between pills. The first zone
 * opens on its accent and the last runs out to 100%, which leaves a flat green
 * start and a flat red tail with three transitions in between.
 *
 * Nothing here marks a zone boundary; the axis ticks below the track do that.
 *
 * Declared below logScalePercent and zoneMidpointPercent on purpose: this runs
 * both at module load, and a const arrow function is still in its TDZ above.
 */
export const ZONE_LEGEND_GRADIENT = `linear-gradient(to right, ${[
  `${zones[0].accent} 0%`,
  ...zones.flatMap((zone) => [
    `${zone.accent} ${zoneMidpointPercent(zone)}%`,
    `${zone.accent} ${logScalePercent(zone.to)}%`,
  ]),
].join(", ")})`;

export const MARKET_PD_TOOLTIP =
  "The market's current consensus on the annualized probability this asset defaults, implied by current trading prices.";

// "No To All" is the opposite of a PD: it pays out when nothing defaults, so it
// needs its own caption and explanation rather than the per-asset one.
export const NO_TO_ALL_LABEL = "Market Estimate (Ann.)";
/**
 * Card header for the "No To All" slider: the outcome name plus what it means.
 * Spelled out here rather than composed off the on-chain outcome name, so the
 * casing is ours.
 */
export const NO_TO_ALL_HEADING =
  "No To All - Probability that none of the assets listed default.";
// Second paragraph covers the slider itself, which moves in tandem with the
// asset sliders in both directions. The tooltip renders with
// whitespace-pre-line, so the blank line survives.
export const NO_TO_ALL_TOOLTIP =
  "The market's current consensus on the annualized probability that none " +
  "of the listed assets default, implied by current trading prices.\n\n" +
  "This slider is tied to the asset sliders: moving it rescales every " +
  "asset's probability of default proportionally. Raise it and all risks " +
  "fall; lower it and all risks rise.";
export const BLOCK_EXPLORER_URLS: Partial<Record<number, string>> = {
  [gnosis.id]: "https://gnosisscan.io",
  [mainnet.id]: "https://etherscan.io",
  [optimism.id]: "https://optimistic.etherscan.io",
  [base.id]: "https://basescan.org",
};
