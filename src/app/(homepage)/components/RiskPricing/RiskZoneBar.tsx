import React from "react";

import RiskAlert from "@/assets/svg/risk-alert.svg";
import RiskCritical from "@/assets/svg/risk-critical.svg";
import RiskLow from "@/assets/svg/risk-low.svg";

import { cn } from "@/utils";

import {
  logScalePercent,
  ZONE_LEGEND_GRADIENT,
  zoneAxis,
  zoneMidpointPercent,
  zones,
} from "./constants";

type Size = "sm" | "lg";

/**
 * The LOW/MODERATE/HIGH/CRITICAL RISK legend and its axis.
 *
 * This used to exist twice - once under the market-estimate bars and once under
 * each prediction slider - and the two copies had drifted apart on every
 * dimension (bar height, emoji size, label size, and whether they had dark
 * variants at all). Since a user sees both on the same screen, they live here
 * as one component with a size variant instead.
 *
 * It is a rule, not a filled band: a 96px block of pastel was the loudest thing
 * on a page whose actual content is the asset bars above it, and the emoji that
 * sat on it rendered differently on every OS and could not be themed.
 * Everything is positioned off {@link zoneMidpointPercent}, which also anchors
 * the gradient's stops, so icon, label and colour cannot drift.
 */
// MODERATE and HIGH deliberately share a glyph - the design uses one
// exclamation mark for both and separates them on colour alone.
const ZONE_ICONS: Record<string, React.FC<React.SVGProps<SVGElement>>> = {
  LOW: RiskLow,
  MODERATE: RiskAlert,
  HIGH: RiskAlert,
  CRITICAL: RiskCritical,
};

/**
 * Vertical offsets are measured DOWN FROM THE BOTTOM OF THE TRACK rather than
 * from its top, so they hold when the track height changes.
 *
 * The design draws labels, boundary ticks and axis numbers in overlapping
 * horizontal bands, and gets away with it because nothing lines up: labels sit
 * at zone midpoints, ticks and numbers at zone boundaries. On the real log
 * scale those are much closer together than in the mock - MODERATE's midpoint
 * is 31% of the track with its boundaries at 24% and 39% - so the three only
 * clear each other once the track is wide.
 *
 * From xl up it is the design's layout exactly. Below that the odd labels drop
 * to a second row, the axis moves below both rows, and the ticks shrink to a
 * notch under the track so they cannot strike through a label.
 */
const SIZES: Record<
  Size,
  {
    track: string;
    pill: string;
    glyph: string;
    label: string;
    labelOdd: string;
    tick: string;
    axis: string;
  }
> = {
  sm: {
    track: "h-1",
    pill: "size-5 md:size-6",
    glyph: "size-3 md:size-4",
    label: "top-[calc(100%+12px)] text-[10px] md:text-xs",
    labelOdd:
      "top-[calc(100%+28px)] text-[10px] md:text-xs xl:top-[calc(100%+12px)]",
    tick: "top-[calc(100%+2px)] h-1 xl:top-[calc(100%+9px)] xl:h-3",
    axis: "mt-11 h-4 text-[10px] md:text-xs xl:mt-6",
  },
  lg: {
    track: "h-1.5",
    pill: "size-7 md:size-8",
    glyph: "size-[18px] md:size-[21px]",
    label: "top-[calc(100%+17px)] text-[10px] md:text-xs",
    labelOdd:
      "top-[calc(100%+37px)] text-[10px] md:text-xs xl:top-[calc(100%+17px)]",
    tick: "top-[calc(100%+2px)] h-1.5 xl:top-[calc(100%+12px)] xl:h-4",
    axis: "mt-14 h-4 text-[10px] md:text-xs xl:mt-7",
  },
};

/**
 * Axis ticks and numbers, in both themes. Not a theme token: the design uses
 * one grey here light and dark, and it has to sit between the page background
 * and the secondary text that labels the chart above.
 */
const AXIS_GREY = "#bbb";

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
      {/* The pills and labels overflow this box in both directions and take no
          space in flow, so the axis below and the caller's top margin are what
          actually reserve room for them. */}
      <div
        className={cn("relative w-full rounded-full", s.track)}
        style={{ background: ZONE_LEGEND_GRADIENT }}
      >
        {zones.map((zone, index) => {
          const Icon = ZONE_ICONS[zone.label];
          const left = `${zoneMidpointPercent(zone)}%`;

          return (
            <React.Fragment key={zone.label}>
              {/* White in BOTH themes: the glyph is knocked out of the icon's
                  filled disc rather than drawn on top of it, so this circle is
                  what the check/!/x actually read as. */}
              <div
                aria-hidden="true"
                className={cn(
                  "absolute top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2",
                  "items-center justify-center rounded-full bg-white",
                  s.pill,
                )}
                style={{ left, color: zone.accent }}
              >
                <Icon className={s.glyph} />
              </div>

              <span
                className={cn(
                  "text-klerosUIComponentsPrimaryText absolute -translate-x-1/2",
                  "text-center font-normal whitespace-nowrap",
                  index % 2 === 1 ? s.labelOdd : s.label,
                )}
                style={{ left }}
              >
                {zone.label} RISK
              </span>
            </React.Fragment>
          );
        })}

        {/* Ticks sit on the zone BOUNDARIES, which is the only cue left for how
            wide a zone is now that the filled band is gone. They share a band
            with the labels, so below xl they shrink to a notch rather than run
            down through one - see SIZES. */}
        {withAxis
          ? zoneAxis.map((value) => (
              <div
                key={value}
                aria-hidden="true"
                className={cn("absolute w-px -translate-x-1/2", s.tick)}
                style={{
                  left: `${logScalePercent(value)}%`,
                  backgroundColor: AXIS_GREY,
                }}
              />
            ))
          : null}
      </div>

      {withAxis ? (
        <div className={cn("relative", s.axis)} style={{ color: AXIS_GREY }}>
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
