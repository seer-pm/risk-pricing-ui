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
    <html lang="en" className="box-border min-h-full" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('theme');var d=t==='dark'||((!t||t==='system')&&matchMedia('(prefers-color-scheme:dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.classList.toggle('light',!d);document.documentElement.style.colorScheme=d?'dark':'light'}catch(e){}",
          }}
        />
        <meta name="apple-mobile-web-app-title" content="Risk Pricing | Seer" />
      </head>
      <body
        className={clsx(
          "bg-klerosUIComponentsLightBackground antialiased",
          "flex min-h-screen flex-col",
        )}
      >
        <div
          hidden
          dangerouslySetInnerHTML={{
            __html:
              "<!-- THESIS: read default risk before predicting. OWN-WORLD: Seer Electric Foundation, shared tokens, Open Sans and hairline surfaces in both themes. STORY: the exact question, market estimates, askers and resolution precede evidence and trading. FIRST VIEWPORT: complete lockup, question, period and attribution lead into aligned annualized and quarterly estimates for 33 assets. FORM: user-approved code-first adaptation of the shared kit and Deep reference. FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance. -->",
          }}
        />
        <a
          href="#main-content"
          className="seer-button seer-button-primary sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50"
        >
          Skip to content
        </a>
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
