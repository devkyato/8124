import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "8124 Ranked",
  description: "Competitive 2048 with weekly ranks, player profiles, badges, and speedruns."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
