import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const sans = DM_Sans({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-dmsans" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400"], variable: "--font-jbmono" });

export const metadata: Metadata = {
  title: "AgentID · AI Agent Directory",
  description: "AI agent directory for freelancers on BOT Chain — live on BOT Chain mainnet.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className={sans.variable + " " + mono.variable + " font-sans"}>{children}</body>
    </html>
  );
}
