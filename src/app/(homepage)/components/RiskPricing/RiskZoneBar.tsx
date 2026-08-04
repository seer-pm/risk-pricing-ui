import React from "react";

import { cn } from "@/utils";

import { logScalePercent, zoneAxis, zones } from "./constants";

type Size = "sm" | "lg";

/**
 * The SAFE/CAUTION/WARNING/DANGER band and its axis.
 *
 * This used to exist twice - once under the market-estimate bars and once under
 * each prediction slider - and the two copies had drifted apart on every
 * dimension (bar height, emoji size, label size, and whether they had dark
 * variants at all). Since a user sees both on the same screen, they live here
 * as one component with a size variant instead.
 */
// On a log scale the middle bands are narrow - CAUTION and WARNING are each
// only ~13% of the track - so type and emoji step down on small screens or the
// labels collide and the bubbles overlap.
const SIZES: Record<
  Size,
  { bar: string; emoji: string; emojiTop: string; label: string; axis: string }
> = {
  sm: {
    bar: "h-10 md:h-12",
    emoji: "text-base md:text-xl",
    emojiTop: "-top-3 md:-top-4",
    label: "mt-3 md:mt-4 text-[10px] md:text-xs",
    axis: "mt-2 h-4 text-[10px] md:text-xs",
  },
  lg: {
    bar: "h-20 md:h-24",
    emoji: "text-xl md:text-3xl",
    emojiTop: "-top-3.5 md:-top-5",
    label: "mt-4 md:mt-5 text-[10px] md:text-sm",
    axis: "mt-3 h-5 text-[10px] md:text-sm",
  },
};

interface IRiskZoneBar {
  size?: Size;
  /** Wrapper classes - callers own the surrounding spacing. */
  className?: string;
  /** Axis is hidden when the caller renders its own. */
  withAxis?: boolean;
}

const RiskZoneBar: React.FC<IRiskZoneBar> = ({
  size = "sm",
  className,
  withAxis = true,
}) => {
  const s = SIZES[size];

  return (
    <div className={className}>
      <div className={cn("flex overflow-visible rounded-xl", s.bar)}>
        {zones.map((zone) => {
          const width = logScalePercent(zone.to) - logScalePercent(zone.from);
          return (
            <div
              key={zone.label}
              className="relative flex min-w-0 flex-col items-center justify-center overflow-visible"
              style={{
                width: `${width}%`,
                background: `linear-gradient(to right, ${zone.colors[0]}, ${zone.colors[1]})`,
              }}
            >
              {/* The ring punches the bar out from behind the emoji, so it has
                  to match whatever the bar is sitting on. */}
              <div
                aria-hidden="true"
                className={cn(
                  "border-klerosUIComponentsLightBackground bg-klerosUIComponentsLightBackground absolute z-20 rounded-full border-4",
                  s.emojiTop,
                  s.emoji,
                )}
              >
                {zone.emoji}
              </div>

              {/* Not themed: the band underneath is a pastel gradient in both
                  light and dark, so the label stays dark either way. */}
              <span
                className={cn(
                  "w-full truncate px-0.5 text-center font-medium text-neutral-800",
                  s.label,
                )}
                title={zone.label}
              >
                {zone.label}
              </span>
            </div>
          );
        })}
      </div>

      {withAxis ? (
        <div
          className={cn(
            "text-klerosUIComponentsSecondaryText relative",
            s.axis,
          )}
        >
          {zoneAxis.map((value) => (
            <div
              key={value}
              className="absolute -translate-x-1/2"
              style={{ left: `${logScalePercent(value)}%` }}
            >
              {value}%
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default React.memo(RiskZoneBar);
