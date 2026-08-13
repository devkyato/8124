import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "8124 by devmako lolol",
  description: "a small full-stack take on the classic 2048 game"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
