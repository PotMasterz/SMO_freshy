import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SMO Freshy — Passcode Game",
  description: "Crack the 4-digit codes on your riddle slips.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
