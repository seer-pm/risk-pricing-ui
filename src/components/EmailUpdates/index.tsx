"use client";
import React from "react";

import { useToggle } from "react-use";

import CogIcon from "@/assets/svg/cog.svg";

import { cn } from "@/utils";

import LightButton from "../LightButton";

import EmailUpdatesModal from "./EmailUpdatesModal";

const EmailUpdates: React.FC<{
  className?: string;
  iconClassName?: string;
  withText?: boolean;
}> = ({ className, iconClassName, withText = false }) => {
  const [isOpen, toggleIsOpen] = useToggle(false);

  return (
    <>
      <LightButton
        ariaLabel="Email notifications"
        text={withText ? "Email notifications" : ""}
        onPress={toggleIsOpen}
        icon={<CogIcon className={cn("size-4", iconClassName)} />}
        className={cn(
          "flex min-h-8 items-center",
          "[&>p]:text-klerosUIComponentsPrimaryText [&>p]:font-normal",
          { "[&>p]:ml-2": withText },
          className,
        )}
      />
      {/* mount only while open so the verification polling stops on close */}
      {isOpen ? <EmailUpdatesModal {...{ isOpen, toggleIsOpen }} /> : null}
    </>
  );
};

export default EmailUpdates;
