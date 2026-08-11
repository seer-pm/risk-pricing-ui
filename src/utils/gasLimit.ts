import {
  BaseError,
  ContractFunctionRevertedError,
  ExecutionRevertedError,
  type PublicClient,
} from "viem";

export const GNOSIS_BLOCK_GAS_LIMIT = 17_000_000n;

/** Buffer multiplier for gas estimation (20% ) */
const GAS_BUFFER_MULTIPLIER = 1.2;

/**
 * Computes a gas limit with buffer, capped at the Gnosis block gas limit.
 */
export function getGasLimitWithBuffer(estimatedGas: bigint) {
  const withBuffer =
    (estimatedGas * BigInt(Math.floor(GAS_BUFFER_MULTIPLIER * 100))) / 100n;
  return withBuffer > GNOSIS_BLOCK_GAS_LIMIT
    ? GNOSIS_BLOCK_GAS_LIMIT
    : withBuffer;
}

type EstimateGasParams = Parameters<PublicClient["estimateContractGas"]>[0];

/**
 * True when the estimation failed because the call actually reverts on-chain,
 * as opposed to a transport problem (timeout, rate limit, bad gateway).
 */
function isRevert(error: unknown) {
  if (!(error instanceof BaseError)) return false;
  return !!error.walk(
    (e) =>
      e instanceof ContractFunctionRevertedError ||
      e instanceof ExecutionRevertedError,
  );
}

/**
 * Estimates gas for a contract call, applies buffer, and caps at Gnosis block limit.
 *
 * Throws if the call reverts — submitting it anyway just burns the user's gas,
 * and the reason the wallet reports afterwards is not necessarily ours (a
 * simulation without a `from` reports `TradeExecutor`'s `onlyOwner` failure
 * instead of the real inner revert).
 *
 * Returns undefined if estimation fails for any other reason, so the wallet's
 * own estimate can still be used.
 */
export async function estimateGasWithBuffer(
  publicClient: PublicClient,
  params: EstimateGasParams,
) {
  try {
    const estimated = await publicClient.estimateContractGas(params);
    return getGasLimitWithBuffer(estimated);
  } catch (e) {
    if (isRevert(e)) {
      throw e;
    }
    return undefined;
  }
}
