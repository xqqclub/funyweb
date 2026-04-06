import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Pixel Town Control",
  description: "2.5D pixel-style city scene powered by Firebase and Netlify."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
