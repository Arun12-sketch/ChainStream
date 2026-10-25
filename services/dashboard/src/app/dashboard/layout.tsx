"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [selectedChain, setSelectedChain] = useState<number>(0);

  return (
    <div className="flex h-screen bg-background overflow-hidden text-text-primary">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar
          selectedChain={selectedChain}
          onSelectChain={setSelectedChain}
        />
        <main className="flex-1 overflow-y-auto p-6 bg-grid-pattern">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
