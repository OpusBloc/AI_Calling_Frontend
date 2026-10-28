"use client";

import { useState } from "react";
import { Phone, UsersRound } from "lucide-react";
import { PoolsTab } from "../../components/number-pool/pools-tab";
import { LeadPoolsTab } from "../../components/number-pool/lead-pools-tab";
import PageHeader from "@/components/PageHeader";

export default function NumberPoolPage() {
  const [activeTab, setActiveTab] = useState<"plivo" | "leads">("plivo");
  return (
    <div className="space-y-6 px-6 py-4">
      <PageHeader title="Number Pool" description="Caller IDs and number pools used to place calls." />
      <div>
        <div role="tablist" aria-label="Number pool sections" className="mb-4 flex gap-6 border-b border-hairline">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "plivo"}
            onClick={() => setActiveTab("plivo")}
            className={`border-b-2 px-1 py-3 text-sm font-medium transition-colors ${activeTab === "plivo" ? "border-accent text-accent-text" : "border-transparent text-muted hover:text-heading"}`}
          >
            <span className="inline-flex items-center gap-2"><Phone size={16} /> Plivo Numbers</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "leads"}
            onClick={() => setActiveTab("leads")}
            className={`border-b-2 px-1 py-3 text-sm font-medium transition-colors ${activeTab === "leads" ? "border-accent text-accent-text" : "border-transparent text-muted hover:text-heading"}`}
          >
            <span className="inline-flex items-center gap-2"><UsersRound size={16} /> Lead Pools</span>
          </button>
        </div>
        {activeTab === "plivo" ? <PoolsTab /> : <LeadPoolsTab />}
      </div>
    </div>
  );
}
