import React, { useMemo, useRef, useState } from "react";

import { Button, Modal } from "@kleros/ui-components-library";
import clsx from "clsx";
import { useToggle } from "react-use";
import { useAccount, useBalance } from "wagmi";

import {
  useReadSDaiPreviewDeposit,
  useReadSDaiPreviewRedeem,
} from "@/generated";
import { useRiskPredictionStore } from "@/store/riskMarketStore";

import { usePredictRiskFlow } from "@/hooks/predict/usePredictRiskFlow";
import { useCheckTradeExecutorCreated } from "@/hooks/tradeWallet/useCheckTradeExecutorCreated";
import { useCreditsBalance } from "@/hooks/useCreditsBalance";
import { useFirstPredictionStatus } from "@/hooks/useFirstPredictionStatus";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { useTokensBalances } from "@/hooks/useTokenBalances";

import { PredictAmountSection } from "@/components/Predict/PredictAmountSection";
import PredictSteps from "@/components/Predict/PredictSteps";
import { ScrollFade } from "@/components/ScrollFade";

import { isUndefined } from "@/utils";

import { collateral } from "@/consts";
import { TokenType } from "@/consts/tokens";

import RiskMarketHeader from "./RiskMarketHeader";
interface IPredictAllPopup {
  isOpen: boolean;
  toggleIsOpen: () => void;
  toggleGuide: (val: boolean) => void;
}

export const PredictAllPopup: React.FC<IPredictAllPopup> = ({
  isOpen,
  toggleIsOpen,
  toggleGuide,
}) => {
  const outcomes = useRiskPredictionStore((state) => state.outcomes);

  const [amount, setAmount] = useState<bigint>();
  const [selectedToken, setSelectedToken] = useState<TokenType>(TokenType.sDAI);
  const [isUsingSeerCredits, toggleIsUsingCredits] = useToggle(true);

  const firstPredictionRef = useRef<boolean | null>(null);

  const isXDai = selectedToken === TokenType.xDAI;

  const resetUI = () => {
    setAmount(undefined);
    setSelectedToken(TokenType.sDAI);
  };

  // checking to see if user alrd has trade wallet
  const { address: account } = useAccount();
  const { data: checkTradeExecutorResult } =
    useCheckTradeExecutorCreated(account);
  const tradeExecutor = checkTradeExecutorResult?.predictedAddress;

  //  balances
  const { data: userSDaiBalanceData } = useTokenBalance({
    address: account,
    token: collateral.address,
  });
  const {
    walletCredits,
    totalCredits: seerCreditsBalance,
    totalCreditsEquivalentXDAI: seerCreditsEquivalentXDAI,
  } = useCreditsBalance({
    account,
    tradeExecutor,
    isXDai,
  });

  const { data: userXDaiBalanceData } = useBalance({
    address: account,
  });

  const { data: walletSDaiBalanceData } = useTokenBalance({
    address: tradeExecutor,
    token: collateral.address,
  });

  // Balances of this market's outcome tokens. These used to be read through
  // the legacy markets store, which is empty here, so a returning user's
  // position was never seen and re-predicting without new capital was refused.
  const outcomeIds = useMemo(
    () => outcomes.map((outcome) => outcome.outcomeId),
    [outcomes],
  );
  const { data: tokensBalances } = useTokensBalances(tradeExecutor, outcomeIds);

  const { isFirstPrediction, setStoredHasPredicted } =
    useFirstPredictionStatus(tradeExecutor);
  // wallet only holds sDAI, this gives the equivalent amount in xDAI
  // to inform user how much equivalent xDAI they have
  const { data: walletXDaiBalance } = useReadSDaiPreviewRedeem({
    args: [walletSDaiBalanceData?.value ?? 0n],
    query: {
      enabled:
        !isUndefined(walletSDaiBalanceData) &&
        walletSDaiBalanceData.value > 0 &&
        isXDai,
      retry: false,
    },
  });

  // tells us the resulting sDAI
  const { data: resultingDeposit } = useReadSDaiPreviewDeposit({
    args: [amount ?? 0n],
    query: {
      enabled: !isUndefined(amount) && amount > 0,
      retry: false,
    },
  });

  // the total amount of collateral being supplied in sDAI
  // accounts for all sources of collateral including seer credits
  const sDAIDepositAmount = useMemo(() => {
    if (!isXDai) return amount;
    return resultingDeposit;
  }, [resultingDeposit, amount, isXDai]);

  // additional sDAI required to be deposited, accounts for Seer credits (EOA + wallet) if being used
  const toBeAdded = useMemo(() => {
    if (isUndefined(sDAIDepositAmount)) return 0n;
    // account for wallet balance
    const sDAIDepositWalletBalanceOffset =
      sDAIDepositAmount > (walletSDaiBalanceData?.value ?? 0n)
        ? sDAIDepositAmount - (walletSDaiBalanceData?.value ?? 0n)
        : 0n;
    // account for Seer Credits (EOA + trade wallet)
    if (isUsingSeerCredits) {
      return sDAIDepositWalletBalanceOffset - seerCreditsBalance > 0
        ? sDAIDepositWalletBalanceOffset - seerCreditsBalance
        : 0n;
    }
    return sDAIDepositWalletBalanceOffset;
  }, [
    sDAIDepositAmount,
    walletSDaiBalanceData,
    seerCreditsBalance,
    isUsingSeerCredits,
  ]);

  const creditsToSwap = useMemo(() => {
    if (!isUsingSeerCredits) return 0n;
    return (sDAIDepositAmount ?? 0n) > seerCreditsBalance
      ? seerCreditsBalance
      : (sDAIDepositAmount ?? 0n);
  }, [isUsingSeerCredits, sDAIDepositAmount, seerCreditsBalance]);

  // offset deposit by wallet credits, only deposit from eoa
  const toBeAddedSeerCredits = useMemo(() => {
    if (!isUsingSeerCredits) return 0n;
    return creditsToSwap > walletCredits ? creditsToSwap - walletCredits : 0n;
  }, [isUsingSeerCredits, creditsToSwap, walletCredits]);

  // For display, distinguish credits from wallet vs EOA
  const creditsFromWallet =
    creditsToSwap > walletCredits ? walletCredits : creditsToSwap;
  const creditsFromEOA = toBeAddedSeerCredits;

  // when using xDAI input, we need to convert the additional sDAI amount required,
  // back to xDAI to take what's necessary
  const { data: toBeAddedXDai } = useReadSDaiPreviewRedeem({
    args: [toBeAdded],
    query: {
      enabled: !isUndefined(toBeAdded) && toBeAdded > 0 && isXDai,
      retry: false,
    },
  });

  // can be either xDAI or sDAI (includes credits from both EOA and trade wallet)
  const availableBalance = useMemo(() => {
    const seerCreditBalanceEquivalent = isXDai
      ? (seerCreditsEquivalentXDAI ?? 0n)
      : seerCreditsBalance;
    return !isXDai
      ? (userSDaiBalanceData?.value ?? 0n) +
          (walletSDaiBalanceData?.value ?? 0n) +
          (isUsingSeerCredits ? seerCreditBalanceEquivalent : 0n)
      : (userXDaiBalanceData?.value ?? 0n) +
          (walletXDaiBalance ?? 0n) +
          (isUsingSeerCredits ? seerCreditBalanceEquivalent : 0n);
  }, [
    isXDai,
    userSDaiBalanceData,
    walletSDaiBalanceData,
    userXDaiBalanceData,
    walletXDaiBalance,
    seerCreditsBalance,
    isUsingSeerCredits,
    seerCreditsEquivalentXDAI,
  ]);

  const {
    handlePredict,
    finish,
    tradeNotes,
    createdTradeWallet,
    isCreatingWallet,
    isAddingCollateral,
    isCollateralAdded,
    isAddingSeerCredits,
    isSeerCreditsAdded,
    isProcessingMarkets,
    isLoadingQuotes,
    isPredictionSuccessful,
    chunkProgressMessage,
    isSending,
    error,
    frozenToBeAdded,
    frozenToBeAddedSeerCredits,
    tradeExecutorPredictAll,
  } = usePredictRiskFlow({
    account,
    tradeExecutor,
    checkTradeExecutorResult,
    isXDai,
    sDAIDepositAmount,
    toBeAdded,
    toBeAddedXDai,
    toBeAddedSeerCredits,
    creditsToSwap,
    walletOutcomeBalances: tokensBalances,
    onDone: () => {
      toggleIsOpen();
      resetUI();
      toggleGuide(true);

      // if it was the first prediction from user
      if (firstPredictionRef.current) {
        setStoredHasPredicted(true);
      }
    },
  });

  const disabled =
    isSending || (!isUndefined(amount) && amount > availableBalance);

  return (
    <Modal
      className={clsx(
        "fixed top-[5vh] left-1/2 -translate-x-1/2 transform",
        "h-auto max-h-[90vh] w-max max-md:w-full max-md:max-w-sm",
        "flex p-4 pb-0! md:px-10 md:py-8",
      )}
      onOpenChange={toggleIsOpen}
      {...{ isOpen }}
    >
      <div className="flex flex-col items-center">
        <RiskMarketHeader />
        <ScrollFade className="min-h-32 w-full">
          <PredictAmountSection
            {...{
              amount,
              setAmount,
              selectedToken,
              setSelectedToken,
              availableBalance,
              isSending,
              toBeAdded,
              toggleIsUsingCredits,
              isUsingSeerCredits,
              seerCreditsBalance,
              seerCreditsEquivalentXDAI,
              creditsFromWallet,
              creditsFromEOA,
              sDAIDepositAmount,
              isFirstPrediction,
            }}
            isWalletCreated={checkTradeExecutorResult?.isCreated ?? false}
          />
          <PredictSteps
            {...{
              tradeExecutor: tradeExecutor ?? createdTradeWallet,
              toBeAdded: frozenToBeAdded ?? toBeAdded,
              toBeAddedSeerCredits:
                frozenToBeAddedSeerCredits ?? toBeAddedSeerCredits,
              isAddingCollateral,
              isCreatingWallet,
              isCollateralAdded,
              isAddingSeerCredits,
              isSeerCreditsAdded,
              isLoadingQuotes,
              isProcessingMarkets,
              isPredictionSuccessful,
              chunkProgressMessage,
              tradeNotes,
              isMakingPrediction: tradeExecutorPredictAll.isPending,
              error,
            }}
          />
        </ScrollFade>

        <div className="bg-klerosUIComponentsWhiteBackground sticky bottom-0 py-4">
          <div className="flex flex-wrap gap-3.5">
            {isPredictionSuccessful && tradeNotes?.length ? (
              // The prediction is in; the popup only stayed open so the notes
              // above could be read. Offering "Predict" again here would send
              // a second trade.
              <Button text="Done" onPress={finish} />
            ) : (
              <>
                <Button
                  text="Cancel"
                  variant="secondary"
                  onPress={() => {
                    toggleIsOpen();
                    resetUI();
                  }}
                  isDisabled={isSending}
                />
                <Button
                  text="Predict"
                  onPress={() => {
                    firstPredictionRef.current = isFirstPrediction;
                    handlePredict();
                  }}
                  isDisabled={disabled}
                  isLoading={isSending}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
