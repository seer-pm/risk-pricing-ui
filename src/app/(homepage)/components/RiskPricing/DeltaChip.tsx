import React from "react";

import ArrowDown from "@/assets/svg/long-arrow-down.svg";
import ArrowUp from "@/assets/svg/long-arrow-up.svg";

import { cn } from "@/utils";

import { formatDeltaPp } from "./utils";

/** Below this a delta is float dust rather than a move the user made. */
const DELTA_EPS = 1e-9;

interface IDeltaChip {
  /** Signed change from the market estimate, in percentage points. */
  deltaPercent: number;
  /**
   * Whether a rise is the good direction.
   *
   * The two ends of this market read a rise oppositely: an asset value is a
   * probability of DEFAULT, so up is worse, while "No To All" is a SURVIVAL
   * probability, so up is better. The same arrow therefore has to be able to
   * carry either colour, and only the caller knows which end it is on.
   */
  riseIsGood: boolean;
  className?: string;
}

/**
 * The "how far you have moved this from the market" readout, shared by the
 * asset card headers and the sticky No To All strip so the two never disagree
 * on rounding or wording.
 */
const DeltaChip: React.FC<IDeltaChip> = ({
  deltaPercent,
  riseIsGood,
  className,
}) => {
  if (!(Math.abs(deltaPercent) > DELTA_EPS)) return null;

  const isRise = deltaPercent > 0;
  const isGood = isRise === riseIsGood;
  const Arrow = isRise ? ArrowUp : ArrowDown;

  return (
    <span
      className={cn(
        "flex items-center gap-0.5 text-xs font-medium tabular-nums",
        isGood ? "text-green-2" : "text-red-2",
        className,
      )}
      title={`${isRise ? "Higher" : "Lower"} than the market estimate`}
    >
      <Arrow
        className={cn(
          "size-3 shrink-0",
          isGood ? "[&_path]:fill-green-2" : "[&_path]:fill-red-2",
        )}
      />
      {formatDeltaPp(deltaPercent)}
    </span>
  );
};

export default React.memo(DeltaChip);
