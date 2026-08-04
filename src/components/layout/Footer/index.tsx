import React from "react";

import clsx from "clsx";
import Link from "next/link";

import GithubLogo from "@/assets/socialmedia/github.svg";
import TelegramLogo from "@/assets/socialmedia/telegram.svg";
import XLogo from "@/assets/socialmedia/x.svg";
import SecuredByKlerosLogo from "@/assets/svg/secured-by-kleros.svg";

import { cn } from "@/utils";

import { tgLink } from "@/consts/markets";

// TODO: update links
const socialmedia = {
  telegram: {
    icon: TelegramLogo,
    url: tgLink,
    label: "Telegram",
  },
  x: {
    icon: XLogo,
    url: "https://x.com/kleros_io",
    label: "X",
  },
  github: {
    icon: GithubLogo,
    url: "https://github.com/kleros/futarchy-ui",
    label: "GitHub",
  },
};

const SecuredByKleros: React.FC = () => (
  <Link
    className="hover:underline"
    href="https://kleros.io"
    aria-label="Secured by Kleros"
    target="_blank"
    rel="noreferrer"
  >
    <SecuredByKlerosLogo
      className={clsx(
        "hover-short-transition ml-2 min-h-6",
        "[&_path]:fill-white/75 hover:[&_path]:fill-white",
      )}
    />
  </Link>
);

// A plain link, not a Link wrapping a LightButton: a <button> inside an <a> is
// invalid and gives each icon two tab stops, only one of which navigates.
const SocialMedia = () => (
  <div className="flex">
    {Object.values(socialmedia).map(({ url, icon: Icon, label }) => (
      <Link
        key={url}
        href={url}
        target="_blank"
        rel="noreferrer"
        aria-label={label}
        title={label}
        className={cn(
          "hover-short-transition rounded-lg p-2",
          "hover:bg-whiteLowOpacityStrong",
          "focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none",
        )}
      >
        <Icon className="[&_path]:fill-white/75 hover:[&_path]:fill-white" />
      </Link>
    ))}
  </div>
);

const Footer: React.FC = () => (
  <div
    className={clsx(
      "bg-footer-background",
      "min-h-16 w-full",
      "flex shrink-0 flex-col items-center justify-between gap-4 px-6 py-5 md:flex-row md:py-0",
    )}
  >
    <SecuredByKleros />
    <SocialMedia />
  </div>
);

export default Footer;
