"use client";

import { type ComponentProps } from "react";

import {
  BigNumberField as NumberField,
  Button as LibraryButton,
  Card as LibraryCard,
  Modal as LibraryModal,
  TextField as LibraryTextField,
} from "@kleros/ui-components-library";
import { Button as AriaButton } from "react-aria-components";

import { cn } from "@/utils";

export * from "@kleros/ui-components-library";

export function Button({
  text,
  variant = "primary",
  small,
  isLoading,
  isDisabled,
  Icon,
  icon,
  className,
  ...props
}: ComponentProps<typeof LibraryButton>) {
  return (
    <AriaButton
      {...props}
      isDisabled={isDisabled || isLoading}
      aria-busy={isLoading || undefined}
      className={cn(
        "seer-button",
        variant === "secondary"
          ? "seer-button-secondary"
          : "seer-button-primary",
        small && "seer-button-sm",
        className,
      )}
    >
      {!isLoading && (icon || (Icon && <Icon className="size-4" />))}
      <span className="button-text">{text}</span>
    </AriaButton>
  );
}

export function Card({
  round: _round,
  hover,
  className,
  ...props
}: ComponentProps<typeof LibraryCard>) {
  void _round;
  return (
    <div
      {...props}
      className={cn(
        "rounded-surface border-seer-border bg-seer-surface text-seer-text border",
        hover && "hover:bg-seer-raised",
        className,
      )}
    />
  );
}

// React Aria keeps transaction notifications and wallet portals outside the dialog usable.
export function Modal({
  className,
  ...props
}: ComponentProps<typeof LibraryModal>) {
  return (
    <LibraryModal
      {...props}
      className={cn("seer-dialog-panel risk-dialog", className)}
    />
  );
}

export function TextField({
  className,
  inputProps,
  ...props
}: ComponentProps<typeof LibraryTextField>) {
  return (
    <LibraryTextField
      {...props}
      className={cn("seer-field", className)}
      inputProps={{
        ...inputProps,
        className: cn("seer-input", inputProps?.className),
      }}
    />
  );
}

export function BigNumberField({
  className,
  ...props
}: ComponentProps<typeof NumberField>) {
  return (
    <NumberField
      {...props}
      className={cn("seer-field risk-number-field", className)}
    />
  );
}
