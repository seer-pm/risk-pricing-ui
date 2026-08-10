import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Address, formatUnits, type Hex } from "viem";
import { type UseSimulateContractReturnType } from "wagmi";

import { DECIMALS } from "@/consts";

type ExtendedWagmiError = UseSimulateContractReturnType["error"] & {
  shortMessage?: string;
  metaMessages?: string[];
};

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};

export const shortenAddress = (address: Address) =>
  `${address.slice(0, 6)}...${address.slice(-5, -1)}`;

export const formatValue = (value: bigint, decimals = 18) => {
  const formattedValue = formatUnits(value, decimals);
  if (formattedValue === "0") {
    return "0";
  } else {
    const parsedValue = parseFloat(formattedValue);
    return parsedValue >= 0.01 ? commify(parsedValue.toFixed(2)) : "<0.01";
  }
};

/**
 * Decimal places used for every probability-of-default figure in the UI.
 * PD runs from ~0.05% to 30%+ and small differences at the low end are
 * meaningful, so this errs on the precise side.
 */
export const PD_DECIMALS = 3;

/**
 * @description The single formatter for probability-of-default values. Always
 * emits the same number of decimals so a column of PDs lines up - callers must
 * not pre-round, and must not use `Number(x.toFixed(n))`, which strips trailing
 * zeros and produces a ragged column.
 * @param probability PD as a percentage (e.g. 0.74 for 0.74%)
 */
export const formatPd = (probability: number): string => {
  if (probability > 0 && probability < 10 ** -PD_DECIMALS) {
    return `<0.${"0".repeat(PD_DECIMALS - 1)}1%`;
  }
  return `${probability.toFixed(PD_DECIMALS)}%`;
};

/** @description USD amounts, with the sign where readers expect it. */
export const formatUsd = (value: number): string =>
  value > 0 && value < 0.01 ? "<$0.01" : `$${commify(value.toFixed(2))}`;

/**
 * @param error
 * @description Tries to extract the human readable error message, otherwise reverts to error.message
 * @returns Human readable error if possible
 */
export const parseWagmiError = (
  error: UseSimulateContractReturnType["error"],
) => {
  if (!error) return "";
  const extError = error as ExtendedWagmiError;

  const metaMessage = extError?.metaMessages?.[0];
  const shortMessage = extError?.shortMessage;

  return metaMessage ?? shortMessage ?? error.message;
};

export const isUndefined = (
  maybeObject: unknown,
): maybeObject is undefined | null =>
  typeof maybeObject === "undefined" || maybeObject === null;

export function commify(value: string | number): string {
  const comps = String(value).split(".");

  if (!String(value).match(/^-?\d+(\.\d+)?$/)) {
    return "0";
  }

  // Make sure we have at least one whole digit (0 if none)
  let whole = comps[0];

  let negative = "";
  if (whole.substring(0, 1) === "-") {
    negative = "-";
    whole = whole.substring(1);
  }

  // Make sure we have at least 1 whole digit with no leading zeros
  while (whole.substring(0, 1) === "0") {
    whole = whole.substring(1);
  }
  if (whole === "") {
    whole = "0";
  }

  let suffix = "";
  if (comps.length === 2) {
    suffix = "." + (comps[1] || "0");
  }
  while (suffix.length > 2 && suffix[suffix.length - 1] === "0") {
    suffix = suffix.substring(0, suffix.length - 1);
  }

  const formatted: string[] = [];
  while (whole.length) {
    if (whole.length <= 3) {
      formatted.unshift(whole);
      break;
    } else {
      const index = whole.length - 3;
      formatted.unshift(whole.substring(index));
      whole = whole.substring(0, index);
    }
  }

  if (suffix === ".0") suffix = "";

  return negative + formatted.join(",") + suffix;
}

export const shortenName = (name: string) =>
  name.length > 16 ? `${name.slice(0, 12)}...` : name;

export function formatBytecode(bytecode: string): Hex {
  // Remove any whitespace
  const cleaned = bytecode.trim();

  // Add 0x prefix if not present
  if (!cleaned.startsWith("0x")) {
    return `0x${cleaned}` as Hex;
  }

  return cleaned as Hex;
}

export function minBigIntArray(values: bigint[]): bigint {
  if (values.length === 0) {
    throw new Error("Cannot compute min of empty array");
  }
  return values.reduce((min, v) => (v < min ? v : min));
}

export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

/**
 * Decimal string safe for parseUnits / Swapr (never scientific notation).
 * e.g. 8.4e-7 → "0.000000840094292439" rather than "8.4e-7".
 */
export function toTokenAmountString(
  value: number,
  decimals = DECIMALS,
): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  const fixed = value.toFixed(decimals);
  return fixed.replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0+$/, "") || "0";
}

/**
 * @description Converts the Market's score from integer to human readable with precision.
 * @param value Market's score in integer representation
 * @param precision MArket's precision value
 * @returns formatted value with precision
 */
export const formatWithPrecision = (value: number, precision: number) =>
  (value / precision).toFixed(Math.log10(precision));
