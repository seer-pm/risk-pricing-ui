"use client";
import React, { useState } from "react";

import { Button, Modal, TextField } from "@kleros/ui-components-library";
import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";

import { useSignIn } from "@/hooks/subscription/useSignIn";
import { useSubscribe } from "@/hooks/subscription/useSubscribe";
import {
  SubscriptionStatus,
  useSubscriptionStatus,
} from "@/hooks/subscription/useSubscriptionStatus";

import ConnectWallet from "@/components/ConnectWallet";
import LightButton from "@/components/LightButton";

import CloseIcon from "@/assets/svg/close-icon.svg";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;

interface IEmailUpdatesModal {
  isOpen: boolean;
  toggleIsOpen: () => void;
}

const EmailUpdatesModal: React.FC<IEmailUpdatesModal> = ({
  isOpen,
  toggleIsOpen,
}) => {
  const { status, user } = useSubscriptionStatus();
  const signIn = useSignIn();
  const { subscribe, unsubscribe, resendVerification } = useSubscribe();
  const queryClient = useQueryClient();

  // null = untouched, so the saved email stays prefilled even if it
  // loads after the modal opened
  const [emailInput, setEmailInput] = useState<string | null>(null);
  const [isEditingEmail, setIsEditingEmail] = useState(false);

  const currentEmail = user?.email ?? null;
  const email = (emailInput ?? currentEmail ?? "").trim();
  const isEmailValid =
    EMAIL_REGEX.test(email) && email.length <= MAX_EMAIL_LENGTH;

  const isMutating =
    subscribe.isPending ||
    unsubscribe.isPending ||
    resendVerification.isPending;

  const handleSubscribe = async () => {
    await subscribe.mutateAsync({
      email,
      currentEmail,
      currentEmailVerified: user?.email_verified ?? false,
    });
    setIsEditingEmail(false);
  };

  const handleUnsubscribe = async () => {
    await unsubscribe.mutateAsync();
    setIsEditingEmail(false);
  };

  const emailForm = (
    <div className="flex flex-col gap-4">
      <TextField
        type="email"
        label="Email"
        placeholder="you@example.com"
        value={emailInput ?? currentEmail ?? ""}
        onChange={setEmailInput}
        variant={email.length > 0 && !isEmailValid ? "error" : undefined}
        message={
          email.length > 0 && !isEmailValid
            ? "Please enter a valid email."
            : undefined
        }
        className="w-full"
      />
      <div className="flex flex-wrap gap-3.5">
        {isEditingEmail ? (
          <Button
            text="Cancel"
            variant="secondary"
            isDisabled={isMutating}
            onPress={() => {
              setIsEditingEmail(false);
              setEmailInput(null);
            }}
          />
        ) : null}
        <Button
          text={isEditingEmail ? "Save" : "Subscribe"}
          isDisabled={!isEmailValid || isMutating}
          isLoading={subscribe.isPending}
          onPress={handleSubscribe}
        />
      </div>
      {subscribe.isError ? (
        <p className="text-klerosUIComponentsError text-sm">
          Failed to subscribe. Please try again.
        </p>
      ) : null}
    </div>
  );

  const manageButtons = (
    <div className="flex flex-wrap gap-3.5">
      <Button
        text="Change email"
        variant="secondary"
        isDisabled={isMutating}
        onPress={() => setIsEditingEmail(true)}
      />
      <Button
        text="Unsubscribe"
        variant="secondary"
        isDisabled={isMutating}
        isLoading={unsubscribe.isPending}
        onPress={handleUnsubscribe}
      />
    </div>
  );

  const renderContent = () => {
    switch (status) {
      case SubscriptionStatus.DISCONNECTED:
        return (
          <div className="flex flex-col items-start gap-4">
            <p className="text-klerosUIComponentsSecondaryText text-sm">
              Connect your wallet to subscribe to email notifications.
            </p>
            <ConnectWallet />
          </div>
        );
      case SubscriptionStatus.NOT_SIGNED_IN:
        return (
          <div className="flex flex-col items-start gap-4">
            <p className="text-klerosUIComponentsSecondaryText text-sm">
              Sign a message with your wallet to manage email notifications.
              It&apos;s free — no transaction is sent.
            </p>
            <Button
              text="Sign in"
              isLoading={signIn.isPending}
              isDisabled={signIn.isPending}
              onPress={() => signIn.mutate()}
            />
            {signIn.isError ? (
              <p className="text-klerosUIComponentsError text-sm">
                Sign-in failed. Please try again.
              </p>
            ) : null}
          </div>
        );
      case SubscriptionStatus.LOADING:
        return (
          <p className="text-klerosUIComponentsSecondaryText text-sm">
            Loading your subscription status…
          </p>
        );
      case SubscriptionStatus.NEEDS_EMAIL:
        return (
          <div className="flex flex-col gap-4">
            <p className="text-klerosUIComponentsSecondaryText text-sm">
              {currentEmail
                ? user?.email_verified
                  ? "Your email is already verified on Seer — just hit Subscribe to follow this market. No new verification needed."
                  : "Your saved Seer email is prefilled below, but it hasn't been verified yet — we'll send you a new verification link when you subscribe."
                : "Enter your email to get notified when this market receives a new answer or is resolved."}
            </p>
            {emailForm}
          </div>
        );
      case SubscriptionStatus.PENDING_VERIFICATION:
        if (isEditingEmail) return emailForm;
        return (
          <div className="flex flex-col gap-4">
            <p className="text-klerosUIComponentsSecondaryText text-sm">
              Your email{" "}
              <span className="text-klerosUIComponentsPrimaryText font-semibold">
                {user?.email}
              </span>{" "}
              hasn&apos;t been verified yet. A verification link was sent to
              your inbox — the confirmation page opens on Seer (app.seer.pm).
              You&apos;ll start receiving notifications once verified. No email
              in sight? Use Resend.
            </p>
            {resendVerification.isSuccess ? (
              <p className="text-klerosUIComponentsSuccess text-sm">
                Verification email sent.
              </p>
            ) : null}
            <div className="flex flex-wrap gap-3.5">
              <Button
                text="Resend email"
                variant="secondary"
                isDisabled={isMutating || !user?.email}
                isLoading={resendVerification.isPending}
                onPress={() => resendVerification.mutate(user!.email!)}
              />
              <Button
                text="Change email"
                variant="secondary"
                isDisabled={isMutating}
                onPress={() => setIsEditingEmail(true)}
              />
              <Button
                text="Unsubscribe"
                variant="secondary"
                isDisabled={isMutating}
                isLoading={unsubscribe.isPending}
                onPress={handleUnsubscribe}
              />
            </div>
          </div>
        );
      case SubscriptionStatus.SUBSCRIBED:
        if (isEditingEmail) return emailForm;
        return (
          <div className="flex flex-col gap-4">
            <p className="text-klerosUIComponentsSecondaryText text-sm">
              You&apos;re subscribed. We&apos;ll email{" "}
              <span className="text-klerosUIComponentsPrimaryText font-semibold">
                {user?.email}
              </span>{" "}
              when this market receives a new answer or is resolved.
            </p>
            {manageButtons}
          </div>
        );
      case SubscriptionStatus.ERROR:
        return (
          <div className="flex flex-col items-start gap-4">
            <p className="text-klerosUIComponentsError text-sm">
              Something went wrong while loading your subscription.
            </p>
            <Button
              text="Retry"
              variant="secondary"
              onPress={() => {
                queryClient.invalidateQueries({ queryKey: ["seerUser"] });
                queryClient.invalidateQueries({ queryKey: ["seerFavorites"] });
              }}
            />
          </div>
        );
    }
  };

  return (
    <Modal
      className={clsx(
        "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform",
        "h-auto w-full max-w-md",
        "flex flex-col gap-4 p-6",
      )}
      onOpenChange={toggleIsOpen}
      isDismissable
      {...{ isOpen }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-klerosUIComponentsPrimaryText text-lg font-semibold">
          Email notifications
        </h2>
        <LightButton
          ariaLabel="Close"
          text=""
          icon={
            <CloseIcon className="[&_path]:stroke-klerosUIComponentsSecondaryText size-4" />
          }
          onPress={toggleIsOpen}
        />
      </div>
      {renderContent()}
    </Modal>
  );
};

export default EmailUpdatesModal;
