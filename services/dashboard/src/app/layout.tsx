import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChainStream — Multi-Chain Blockchain Indexer & Streaming Control Center",
  description: "High-performance, fault-tolerant multi-chain blockchain indexing platform with real-time Kafka streaming, Postgres persistence, and low-latency APIs.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-text-primary antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
