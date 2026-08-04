import { Card } from "@kleros/ui-components-library";

import CsvUpload from "./CsvUpload";
import { TradeWallet } from "./TradeWallet";

const ParticipateSection: React.FC = () => {
  return (
    <div className="flex w-full flex-col gap-4">
      <h2 className="text-klerosUIComponentsPrimaryText text-2xl font-semibold">
        Participate
      </h2>

      <TradeWallet />
      <Card
        round
        className="border-gradient-purple-blue h-auto w-full rounded-xl border-none px-4 py-6 md:px-8"
      >
        {/* NOTE: project specific */}
        <h3 className="text-klerosUIComponentsPrimaryText text-base font-semibold">
          Set estimates for the protocols below
        </h3>
        <p className="text-klerosUIComponentsSecondaryText mt-1 text-sm">
          You can choose how many protocols you want to predict. Note that the
          same capital can be used to predict on all protocols at once.
        </p>
      </Card>
      <CsvUpload />
    </div>
  );
};
export default ParticipateSection;
