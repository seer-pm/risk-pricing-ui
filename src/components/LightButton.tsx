"use client";
import React from "react";

import { Button } from "@/components/ui";

import { cn } from "@/utils";

import { FOCUS_RING } from "@/consts/styles";

interface ILightButton extends React.ComponentProps<typeof Button> {
  /**
   * Accessible name. Most uses of this button are icon-only (`text=""`), which
   * leaves the control unnamed to a screen reader - pass this whenever there is
   * no visible text.
   */
  ariaLabel?: string;
}

const LightButton: React.FC<ILightButton> = ({
  className,
  ariaLabel,
  ...props
}) => (
  <Button
    variant="primary"
    small
    aria-label={ariaLabel}
    {...props}
    className={cn(
      "seer-button-ghost p-2",
      "hover:bg-seer-surface-raised",
      FOCUS_RING,
      "[&>svg]:fill-klerosUIComponentsSecondaryText hover:[&>svg]:fill-klerosUIComponentsPrimaryText [&>svg]:mr-0",
      "[&>svg_path]:fill-klerosUIComponentsSecondaryText hover:[&>svg_path]:fill-klerosUIComponentsPrimaryText",
      className,
    )}
  />
);

export default LightButton;
