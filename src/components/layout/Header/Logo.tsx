import { BrandLockup } from "@seer-pm/ui-kit/react";
import Link from "next/link";

import { riskApp } from "@/consts/brand";

export default function Logo() {
  return (
    <Link
      href="/"
      aria-label="Risk Pricing home"
      className="text-seer-text shrink-0"
    >
      <BrandLockup appName={riskApp.name} />
    </Link>
  );
}
