import React from "react";

import { BigNumberField, Tooltip } from "@kleros/ui-components-library";
import { formatUnits } from "viem";

import { Skeleton } from "@/components/Skeleton";

import { formatValue, isUndefined, shortenName } from "@/utils";

interface IProjectAmount {
  balance?: bigint;
  name: string;
  color: string;
}

const ProjectAmount: React.FC<IProjectAmount> = ({ balance, name, color }) => {
  // `undefined` means "still loading", which is not the same as a zero balance -
  // rendering formatUnits(0n) for it showed a confident, wrong 0.
  const isLoading = isUndefined(balance);

  return (
    <div>
      <div className="bg-klerosUIComponentsMediumBlue flex h-min items-center">
        {isLoading ? (
          <Skeleton className="mr-4 h-[45px] w-24" />
        ) : (
          <BigNumberField
            className="mr-4 w-24 [&_input]:rounded-r-none [&_input]:border-r-0"
            inputProps={{
              className: "text-klerosUIComponentsSecondaryText",
              // The raw 18-decimal string overflowed a w-24 field.
              title: formatUnits(balance, 18),
            }}
            value={formatValue(balance)}
            isDisabled
          />
        )}
        <span
          className="mr-2 size-2 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        <Tooltip text={name} closeDelay={125}>
          <label className="text-klerosUIComponentsPrimaryText text-sm">
            {shortenName(name)}
          </label>
        </Tooltip>
      </div>
    </div>
  );
};

export default ProjectAmount;
