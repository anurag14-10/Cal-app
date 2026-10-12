import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OmniCalc Pro — High-Performance Scientific Calculator with SQLite",
  description:
    "Next.js calculator application with full scientific computation, interactive tape ledger, and SQLite persistence.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
