import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

const sans = Inter({ variable: "--font-sans-body", subsets: ["latin"] });
const display = Fraunces({ variable: "--font-display-face", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Steady - weight tracker",
  description: "Log your weight daily, watch your progress, and keep each other going.",
};

export const viewport: Viewport = { themeColor: "#2f7d6b" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
