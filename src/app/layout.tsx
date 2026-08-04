import { ThemeProvider } from "next-themes";

import clsx from "clsx";
import localFont from "next/font/local";
import { headers } from "next/headers";

import Web3Context from "@/context/Web3Context";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";

import "@kleros/ui-components-library/style.css";
import "./globals.css";

export { metadata } from "@/consts/metadata";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookies = headers().get("cookie");

  return (
    // The font variables go on <html>, not <body>: globals.css maps them to
    // Tailwind's --font-sans/--font-mono in an @theme block, which resolves at
    // :root. Declared on <body> they'd be out of scope there and the whole
    // chain would collapse to the ui-sans-serif fallback.
    <html
      lang="en"
      className={clsx(
        `${geistSans.variable} ${geistMono.variable}`,
        "box-border size-full",
      )}
      suppressHydrationWarning
    >
      <head>
        <meta name="apple-mobile-web-app-title" content="Foresight | Kleros" />
      </head>
      <body
        className={clsx(
          "bg-klerosUIComponentsLightBackground antialiased",
          "flex size-full flex-col",
        )}
      >
        <Web3Context {...{ cookies }}>
          <ThemeProvider themes={["light", "dark"]} attribute="class">
            <Header />
            {children}
            <Footer />
          </ThemeProvider>
        </Web3Context>
      </body>
    </html>
  );
}
