import { Button, Card, Tooltip } from "@kleros/ui-components-library";
import clsx from "clsx";
import { useToggle } from "react-use";

import { usePredictionMarkets } from "@/hooks/usePredictionMarkets";

import EnsureChain from "@/components/EnsureChain";
import AdvancedGuide from "@/components/Guides/AdvancedGuide";

import CheckOutline from "@/assets/svg/check-outline-button.svg";

import { PredictAllPopup } from "./PredictAllPopup";

const MaybeTooltip: React.FC<{
  enabled: boolean;
  text: string;
  children: React.ReactNode;
}> = ({ enabled, text, children }) =>
  enabled ? (
    <Tooltip text={text} place="top" small className="[&_small]:text-xs">
      {children}
    </Tooltip>
  ) : (
    <>{children}</>
  );

const PredictAll = ({ enabled }: { enabled: boolean }) => {
  const [isOpen, toggleIsOpen] = useToggle(false);
  const markets = usePredictionMarkets();
  const [isGuideOpen, toggleGuide] = useToggle(false);

  return (
    <Card
      round
      className={clsx(
        "border-gradient-purple-blue h-auto w-full rounded-xl border-none px-4 py-6 md:px-8",
        "flex flex-wrap items-start justify-center gap-x-8 gap-y-4",
        "md:flex-row md:items-center md:justify-between",
      )}
    >
      <h3 className="text-klerosUIComponentsPrimaryText text-base font-semibold">
        Predict all the estimates above
      </h3>
      <EnsureChain>
        {/* Wrapped only while disabled: otherwise the button is a dead control
            with no explanation, but on an enabled button the hint is noise. */}
        <MaybeTooltip
          enabled={!enabled}
          text="Move a slider away from the market estimate to make a prediction."
        >
          <Button
            icon={
              <CheckOutline
                className={clsx(
                  "mr-2 size-4",
                  markets.length === 0
                    ? ["[&_path]:fill-klerosUIComponentsStroke"]
                    : ["[&_path]:fill-klerosUIComponentsWhiteBackground"],
                )}
              />
            }
            text="Predict Selected"
            onPress={toggleIsOpen}
            isDisabled={!enabled}
          />
        </MaybeTooltip>
        {isOpen ? (
          <PredictAllPopup {...{ isOpen, toggleIsOpen, toggleGuide }} />
        ) : null}
        <AdvancedGuide
          isVisible={isGuideOpen}
          closeGuide={() => {
            toggleGuide(false);
          }}
        />
      </EnsureChain>
    </Card>
  );
};

export default PredictAll;
