"use client";
import React from "react";

import Link from "next/link";

import LogoKleros from "@/assets/svg/built-by-kleros.svg";
import LogoForeSight from "@/assets/svg/logo-foresight.svg";

// Icon-only links, so each carries its name in aria-label.
// (The former `mounted` guard rendered exactly the same markup in both
// branches, so it only cost a re-render.)
const Logo: React.FC = () => (
  <div className="flex items-center gap-7">
    <Link href="/" aria-label="Foresight home">
      <LogoForeSight className="hover:brightness-105" />
    </Link>
    <Link
      href="https://kleros.io/"
      aria-label="Kleros"
      target="_blank"
      rel="noreferrer"
    >
      <LogoKleros className="hover:brightness-105" />
    </Link>
  </div>
);

export default Logo;
