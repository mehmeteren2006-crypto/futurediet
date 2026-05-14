import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// next/font/google: fontu build sırasında indirir, @import çakışması olmaz
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Diet Assistant — AI Diyetisyen",
  description:
    "Kişiselleştirilmiş AI diyetisyen: kalori takibi, yemek analizi ve telafi planı.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className={`${inter.variable} h-full`}>
      <body className="font-sans h-full overflow-hidden">{children}</body>
    </html>
  );
}
