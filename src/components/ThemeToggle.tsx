"use client";

import { useEffect, useState } from "react";

import { ThemeToggle as KitThemeToggle } from "@seer-pm/ui-kit/react";
import { useTheme } from "next-themes";

import { cn } from "@/utils";

export default function ThemeToggle({
  className,
  withText = false,
}: {
  className?: string;
  iconClassName?: string;
  withText?: boolean;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const theme = mounted && resolvedTheme === "dark" ? "dark" : "light";
  const toggle = () => setTheme(theme === "dark" ? "light" : "dark");
  if (withText)
    return (
      <button
        type="button"
        className={cn("seer-button seer-button-ghost justify-start", className)}
        onClick={toggle}
      >
        <span
          className={cn(
            "seer-icon",
            theme === "dark" ? "seer-icon-sun" : "seer-icon-moon",
          )}
          aria-hidden="true"
        />
        <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
      </button>
    );
  return (
    <KitThemeToggle theme={theme} onToggle={toggle} className={className} />
  );
}
