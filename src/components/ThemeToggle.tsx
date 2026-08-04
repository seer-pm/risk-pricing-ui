import { useMemo } from "react";

import { useTheme } from "next-themes";

import MoonIcon from "@/assets/svg/moon.svg";
import SunIcon from "@/assets/svg/sun.svg";

import { cn } from "@/utils";

import LightButton from "./LightButton";

const ThemeToggle: React.FC<{
  className?: string;
  iconClassName?: string;
  withText?: boolean;
}> = ({ className, iconClassName, withText = false }) => {
  // resolvedTheme, not theme: the provider has no defaultTheme so `theme` is
  // "system" until the user picks one, which made the first click always go to
  // light regardless of what was on screen.
  const { resolvedTheme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(resolvedTheme === "light" ? "dark" : "light");
  };

  const text = useMemo(
    () => (resolvedTheme === "light" ? "Dark Mode" : "Light Mode"),
    [resolvedTheme],
  );
  return (
    <LightButton
      ariaLabel={text}
      text={withText ? text : ""}
      onPress={toggleTheme}
      icon={
        resolvedTheme === "light" ? (
          <MoonIcon className={cn("size-4", iconClassName)} />
        ) : (
          <SunIcon className={cn("size-4", iconClassName)} />
        )
      }
      className={cn(
        "flex min-h-8 items-center",
        "[&>p]:text-klerosUIComponentsPrimaryText [&>p]:font-normal",
        { "[&>p]:ml-2": withText },
        className,
      )}
    />
  );
};

export default ThemeToggle;
