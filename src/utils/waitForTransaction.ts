import { getPublicClient } from "@wagmi/core";
import { BaseError } from "viem";

import { config } from "@/wagmiConfig";

import { DEFAULT_CHAIN } from "@/consts";

import { formatError } from "./formatError";

type TransactionFn = () => Promise<`0x${string}` | undefined>;

export type TransactionResult =
  | {
      status: true;
      hash: `0x${string}`;
    }
  | {
      status: false;
      hash?: `0x${string}`;
      error: Error;
    };

/**
 * Why a mined transaction reverted, found by replaying it as its own sender
 * against the block before it.
 *
 * wagmi's waitForTransactionReceipt does a replay too, but without the sender:
 * every call into a TradeExecutor then fails its onlyOwner check first, so any
 * revert at all was reported as "Caller is not the owner".
 */
const getRevertReason = async (hash: `0x${string}`, blockNumber: bigint) => {
  const publicClient = getPublicClient(config, { chainId: DEFAULT_CHAIN.id });
  if (!publicClient) return undefined;
  try {
    const tx = await publicClient.getTransaction({ hash });
    await publicClient.call({
      account: tx.from,
      to: tx.to,
      data: tx.input,
      value: tx.value,
      gas: tx.gas,
      blockNumber: blockNumber - 1n,
    });
    // the replay passed, so the cause was specific to its place in the block
    return undefined;
  } catch (e) {
    if (e instanceof BaseError) {
      if (/out of gas/i.test(e.message)) return "out of gas";
      return formatError(e);
    }
    return undefined;
  }
};

/**
 * Wraps a wagmi write contract call to wait for the transaction to be confirmed.
 * @param transactionFn A function that calls wagmi's writeContract or writeContractAsync and
 *                      returns a promise for the transaction hash.
 * @returns A promise that resolves with the transaction result.
 */
export const waitForTransaction = async (
  transactionFn: TransactionFn,
): Promise<TransactionResult> => {
  try {
    const hash = await transactionFn();

    if (!hash) {
      const error = new Error("Transaction failed to send or was rejected.");
      return { status: false, error };
    }

    const publicClient = getPublicClient(config, { chainId: DEFAULT_CHAIN.id });
    if (!publicClient) {
      return { status: false, hash, error: new Error("No RPC client.") };
    }

    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
      confirmations: 2,
    });

    if (receipt.status === "reverted") {
      const reason = await getRevertReason(hash, receipt.blockNumber);
      const error = new Error(
        `Transaction was reverted${reason ? `: ${reason}` : "."} (${hash})`,
      );
      return { status: false, hash, error };
    }

    return { status: true, hash };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    const error =
      e instanceof Error ? e : new Error(String(e.shortMessage ?? e.message));
    return { status: false, error };
  }
};
