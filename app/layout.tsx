import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "8124 Arcade",
  description: "Instant-play competitive 2048 with weekly ranks, arcade profiles, badges, and speedruns."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
