"use client";

import React, { type ReactNode, useEffect } from "react";

import { gnosis } from "@reown/appkit/networks";
import { createAppKit } from "@reown/appkit/react";
import { useTheme } from "next-themes";

import { configureRpcProviders } from "@swapr/sdk";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cookieToInitialState, WagmiProvider, type Config } from "wagmi";

import { wagmiAdapter } from "@/wagmiConfig";

import { reownProjectId, GNOSIS_RPC } from "@/consts";
import {
  siteName,
  metadata as websiteMetadata,
  websiteUrl,
} from "@/consts/metadata";
const queryClient = new QueryClient();

if (!reownProjectId) {
  throw new Error("Project ID is not defined");
}

configureRpcProviders({
  [gnosis.id]: GNOSIS_RPC,
});

const metadata = {
  name: siteName,
  description: websiteMetadata.description ?? "",
  url: websiteUrl,
  icons: ["icon1.png"],
};

const appKit = createAppKit({
  themeVariables: {
    "--w3m-accent": "#7d33ff",
    "--w3m-font-family": "Open Sans Variable, Open Sans, sans-serif",
    "--w3m-border-radius-master": "2px",
  },
  adapters: [wagmiAdapter],
  projectId: reownProjectId,
  networks: [gnosis],
  defaultNetwork: gnosis,
  metadata: metadata,
  enableCoinbase: false,
  features: {
    analytics: false,
  },
});

interface IWeb3Context {
  children: ReactNode;
  cookies: string | null;
}

const Web3Context: React.FC<IWeb3Context> = ({ children, cookies }) => {
  const { resolvedTheme } = useTheme();
  useEffect(() => {
    appKit.setThemeMode(resolvedTheme === "dark" ? "dark" : "light");
  }, [resolvedTheme]);
  const initialState = cookieToInitialState(
    wagmiAdapter.wagmiConfig as Config,
    cookies,
  );

  return (
    <WagmiProvider
      config={wagmiAdapter.wagmiConfig as Config}
      {...{ initialState }}
    >
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
};

export default Web3Context;
