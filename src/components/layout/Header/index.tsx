"use client";
import clsx from "clsx";
import { useToggle } from "react-use";

import Help from "./Menu/Help";

import DesktopNavbar from "./DesktopNavbar";
import MobileNavbar from "./MobileNavbar";

const Header: React.FC = () => {
  const [isHelpOpen, toggleIsHelpOpen] = useToggle(false);

  return (
    <div
      className={clsx(
        "bg-klerosUIComponentsWhiteBackground",
        "border-seer-border sticky top-0 z-30 mx-auto flex w-full items-center border-b px-4 lg:px-8",
      )}
    >
      <DesktopNavbar {...{ toggleIsHelpOpen }} />
      <MobileNavbar {...{ toggleIsHelpOpen }} />

      <Help {...{ toggleIsHelpOpen, isOpen: isHelpOpen }} />
    </div>
  );
};

export default Header;
