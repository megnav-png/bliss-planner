import type { Metadata } from "next";
import type { Viewport } from "next";
import "./globals.css";
import Providers from "./providers";
import PWAServiceBridge from "@/components/PWAServiceBridge";

export const metadata: Metadata = {
  title: "Bliss Planner",
  description: "Phase 2: onboarding and connected planning dashboard.",
  manifest: "/manifest.webmanifest"
};

export const viewport: Viewport = {
  themeColor: "#173c3a"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="type-root">
        <Providers>
          <PWAServiceBridge />
          {children}
        </Providers>
      </body>
    </html>
  );
}
