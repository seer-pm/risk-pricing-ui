import { SwaprV3Trade } from "@swapr/sdk";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getAccount, getPublicClient, writeContract } from "@wagmi/core";
import { type BytesLike } from "ethers";
import { Address, encodeFunctionData, erc20Abi, parseUnits } from "viem";

import { TradeExecutorAbi } from "@/contracts/abis/TradeExecutorAbi";
import {
  creditsManagerAbi,
  creditsManagerAddress,
  gnosisRouterAbi,
  gnosisRouterAddress,
  sDaiAddress,
  wxdaiAbi,
  wxdaiAddress,
} from "@/generated";
import { useRiskPredictionStore } from "@/store/riskMarketStore";
import { config } from "@/wagmiConfig";

import { isUndefined } from "@/utils";
import { formatError } from "@/utils/formatError";
import { estimateGasWithBuffer } from "@/utils/gasLimit";
import { GetQuotesResult } from "@/utils/getQuotes";
import { getMinimumAmountOut } from "@/utils/swapr";
import { waitForTransaction } from "@/utils/waitForTransaction";

import { collateral, DECIMALS, DEFAULT_CHAIN } from "@/consts";
import { RISK_PRICING_MARKET_ID } from "@/consts/markets";

import { RiskPricingOutcome } from "../useMarketData";

import { mergeFromRouter } from "./useTradeExecutorPredict";

interface PredictProps {
  tradeExecutor: Address;
  quoteResult: GetQuotesResult;
  seerCreditsSwapQuote?: SwaprV3Trade;
  /** Called before each transaction when the batch needs more than one. */
  onProgress?: (current: number, total: number) => void;
}

interface Call {
  to: Address | string;
  data: string | BytesLike;
  value?: bigint;
}

// Use the available SeerCredits in TradeWallet to Mint Parent market tokens
// swap sDAI to Wxdai => Convert Wxdai to xdai (wxdai.withdraw()) => mint tokens with xdai
async function getMintFromSeerCreditsCalls(
  tradeExecutor: Address,
  seerCreditSwapQuote: SwaprV3Trade,
): Promise<Call[]> {
  const quote = seerCreditSwapQuote;

  const approveCall = {
    to: sDaiAddress,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [
        quote.approveAddress as Address,
        parseUnits(quote.maximumAmountIn().toExact(), DECIMALS),
      ],
    }),
  };

  const swapTxn = await quote.swapTransaction({ recipient: tradeExecutor });
  const executeCall = {
    to: creditsManagerAddress,
    data: encodeFunctionData({
      abi: creditsManagerAbi,
      functionName: "execute",
      args: [
        swapTxn.to! as `0x${string}`,
        swapTxn.data! as `0x${string}`,
        parseUnits(quote.maximumAmountIn().toExact(), DECIMALS),
        wxdaiAddress,
      ],
    }),
  };

  const availableWxdai = await getMinimumAmountOut(quote);
  if (!availableWxdai) {
    throw new Error("Unable to fetch Wrapped xDAI balance.");
  }

  const withdrawCall = {
    to: wxdaiAddress,
    data: encodeFunctionData({
      abi: wxdaiAbi,
      functionName: "withdraw",
      args: [availableWxdai],
    }),
  };

  // splitPosition with xDAI
  const splitCall = {
    to: gnosisRouterAddress,
    data: encodeFunctionData({
      abi: gnosisRouterAbi,
      functionName: "splitFromBase",
      args: [RISK_PRICING_MARKET_ID],
    }),
    value: availableWxdai,
  };

  return [approveCall, executeCall, withdrawCall, splitCall];
}

export const getSplitFromTradeExecutorCalls = ({
  amount,
}: Pick<
  {
    tradeExecutor: Address;
    amount: bigint;
  },
  "amount"
>) => {
  const approveCall = {
    to: collateral.address,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [gnosisRouterAddress, amount],
    }),
  };
  const splitCall = {
    to: gnosisRouterAddress,
    data: encodeFunctionData({
      abi: gnosisRouterAbi,
      functionName: "splitPosition",
      args: [collateral.address, RISK_PRICING_MARKET_ID, amount],
    }),
  };
  const calls = [approveCall, splitCall];
  return calls;
};

/**
 * One indivisible piece of the batch - an approval always travels with the
 * call that spends it - and roughly what it costs, in units of one swap
 * (~200k gas before refunds).
 *
 * Splitting or merging a 35-outcome market wraps or unwraps every outcome
 * token, which measured ~4.3M and ~4.6M gas on a Gnosis fork.
 */
export type Step = { calls: Call[]; weight: number };

const SWAP_WEIGHT = 1;
const SPLIT_WEIGHT = 23;
const MERGE_WEIGHT = 30;
const SEER_CREDITS_MINT_WEIGHT = 26;
/**
 * Per-transaction ceiling. A split plus 13 swaps measured 5-6M gas, which
 * leaves the buffered gas limit around 8M. A transaction that needs most of
 * the 17M block only fits in a nearly empty one and can sit pending
 * indefinitely, so a larger batch is sent as several transactions instead.
 */
const MAX_WEIGHT_PER_TRANSACTION = 36;

const getSwapStep = async (
  quote: SwaprV3Trade,
  tradeExecutor: Address,
): Promise<Step> => {
  const approveCall = {
    to: quote.inputAmount.currency.address! as Address,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [
        quote.approveAddress as Address,
        parseUnits(quote.maximumAmountIn().toExact(), DECIMALS),
      ],
    }),
  };
  const txn = await quote.swapTransaction({ recipient: tradeExecutor });
  return {
    calls: [approveCall, { to: txn.to!, data: txn.data! }],
    weight: SWAP_WEIGHT,
  };
};

async function getTradeExecutorSteps({
  tradeExecutor,
  quoteResult,
  seerCreditsSwapQuote,
  outcomes,
}: PredictProps & { outcomes: RiskPricingOutcome[] }) {
  const steps: Step[] = [];

  // Foresight Credits can only enter the market by being split, so that mint
  // is unconditional. getRiskQuotes was told about it as `preMinted`.
  if (seerCreditsSwapQuote) {
    steps.push({
      calls: await getMintFromSeerCreditsCalls(
        tradeExecutor,
        seerCreditsSwapQuote,
      ),
      weight: SEER_CREDITS_MINT_WEIGHT,
    });
  }

  const { quotes, mergeAmount, splitAmount } = quoteResult;
  const { sellQuotes, buyQuotes } = quotes;

  // only what the sells are short of, see getRiskQuotes
  if (!isUndefined(splitAmount) && splitAmount > 0n) {
    steps.push({
      calls: getSplitFromTradeExecutorCalls({ amount: splitAmount }),
      weight: SPLIT_WEIGHT,
    });
  }

  // order matters across the whole list: sells and the merge fund the buys
  steps.push(
    ...(await Promise.all(
      sellQuotes.map((quote) => getSwapStep(quote, tradeExecutor)),
    )),
  );

  if (mergeAmount > 0n) {
    // the router pulls every outcome token, "Invalid" included
    const mergeApproveCalls = outcomes.map(({ outcomeId }) => ({
      to: outcomeId,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: "approve",
        args: [gnosisRouterAddress, mergeAmount],
      }),
    }));
    steps.push({
      calls: [
        ...mergeApproveCalls,
        mergeFromRouter(RISK_PRICING_MARKET_ID, mergeAmount),
      ],
      weight: MERGE_WEIGHT,
    });
  }

  steps.push(
    ...(await Promise.all(
      buyQuotes.map((quote) => getSwapStep(quote, tradeExecutor)),
    )),
  );

  return steps;
}

/** Packs steps into transactions in order, never splitting a step. */
export const chunkSteps = (steps: Step[]): Call[][] => {
  const chunks: Call[][] = [];
  let current: Call[] = [];
  let weight = 0;
  for (const step of steps) {
    if (
      current.length > 0 &&
      weight + step.weight > MAX_WEIGHT_PER_TRANSACTION
    ) {
      chunks.push(current);
      current = [];
      weight = 0;
    }
    current.push(...step.calls);
    weight += step.weight;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
};

async function executeCalls(tradeExecutor: Address, calls: Call[]) {
  const valueCalls = calls.map((call) => ({
    ...call,
    value: call?.value ?? 0n,
  }));

  // try to add a capped buffer, otherwise let wallet estimate the gas
  const publicClient = getPublicClient(config, { chainId: DEFAULT_CHAIN.id });
  const account = getAccount(config);
  const gas =
    publicClient && account?.address
      ? await estimateGasWithBuffer(publicClient, {
          address: tradeExecutor,
          abi: TradeExecutorAbi,
          functionName: "batchValueExecute",
          args: [valueCalls],
          account: account.address,
        })
      : undefined;

  const writePromise = writeContract(config, {
    address: tradeExecutor,
    abi: TradeExecutorAbi,
    functionName: "batchValueExecute",
    args: [valueCalls],
    value: 0n,
    chainId: DEFAULT_CHAIN.id,
    ...(!isUndefined(gas) && { gas }),
  });

  const result = await waitForTransaction(() => writePromise);
  if (!result.status) {
    throw result.error;
  }
  return result;
}

async function predictRiskOutcomesFromTradeExecutor({
  tradeExecutor,
  quoteResult,
  seerCreditsSwapQuote,
  outcomes,
  onProgress,
}: PredictProps & { outcomes: RiskPricingOutcome[] }) {
  const steps = await getTradeExecutorSteps({
    tradeExecutor,
    quoteResult,
    seerCreditsSwapQuote,
    outcomes,
  });
  const chunks = chunkSteps(steps);

  let result;
  for (let i = 0; i < chunks.length; i++) {
    if (chunks.length > 1) onProgress?.(i + 1, chunks.length);
    try {
      result = await executeCalls(tradeExecutor, chunks[i]);
    } catch (e) {
      // the earlier transactions are final, so say where things stand rather
      // than leaving the user to guess from a bare revert reason
      if (i === 0) throw e;
      const reason = e instanceof Error ? formatError(e) : undefined;
      throw new Error(
        `${reason ?? "Transaction failed."}\n${i} of ${chunks.length} transactions went through and the rest were not sent. Nothing is lost: the tokens and sDAI are in your Trade Wallet, and you can predict again to finish.`,
      );
    }
  }
  return result;
}

export const useTradeExecutorPredictRiskOutcomes = (
  onSuccess?: () => unknown,
) => {
  const outcomes = useRiskPredictionStore((state) => state.outcomes);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (props: PredictProps) =>
      predictRiskOutcomesFromTradeExecutor({ ...props, outcomes }),
    onSuccess() {
      onSuccess?.();
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ["useTokenBalance"] });
        queryClient.refetchQueries({ queryKey: ["useTokensBalances"] });
      }, 3000);
    },
  });
};
