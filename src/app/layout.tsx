import { ThemeProvider } from "next-themes";

import clsx from "clsx";
import { headers } from "next/headers";

import Web3Context from "@/context/Web3Context";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";

import "@kleros/ui-components-library/style.css";
import "./globals.css";

export { metadata } from "@/consts/metadata";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookies = headers().get("cookie");

  return (
    <html lang="en" className="box-border size-full" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-title" content="Foresight | Kleros" />
      </head>
      <body
        className={clsx(
          "bg-klerosUIComponentsLightBackground antialiased",
          "flex size-full flex-col",
        )}
      >
        <ThemeProvider
          themes={["light", "dark"]}
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          <Web3Context {...{ cookies }}>
            <Header />
            {children}
            <Footer />
          </Web3Context>
        </ThemeProvider>
      </body>
    </html>
  );
}
