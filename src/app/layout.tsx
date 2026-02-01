import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import "@rainbow-me/rainbowkit/styles.css";
import { Providers } from "@/components/providers/WagmiProvider";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-poppins"
});

export const metadata: Metadata = {
  title: "PayPai - AI-Powered Smart Wallet",
  description: "Execute blockchain transactions with natural language on Kite AI Chain",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={poppins.variable}><Providers>{children}</Providers></body>
    </html>
  );
}
