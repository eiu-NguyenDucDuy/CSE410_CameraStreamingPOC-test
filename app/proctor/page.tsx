"use client";

import { mockCandidates } from "@/services/mockCandidates";
import { useState } from "react";
import CandidateList from "@/components/proctor/CandidateList";
import MonitorView from "@/components/proctor/MonitorView";

export default function ProctorPage() {
  const [selectedId, setSelectedId] = useState(mockCandidates[0].id);

  const selectedCandidate = mockCandidates.find((candidate) => candidate.id === selectedId);

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="grid grid-cols-12">
        {/* Sidebar */}
        <aside className="col-span-3 min-h-screen bg-white p-5 border-r">
          <h1 className="mb-5 text-2xl font-bold">Candidates</h1>

          <CandidateList candidates={mockCandidates} selectedId={selectedId} onSelect={setSelectedId} />
        </aside>

        {/* Monitor */}
        <section className="col-span-9 p-6">
          <h1 className="mb-5 text-3xl font-bold">Live Monitoring</h1>

          <div className="rounded-xl bg-white p-5 shadow">
            <MonitorView candidate={selectedCandidate} cameraStream={null} screenStream={null} />
            {/* <MonitorView candidate={selectedCandidate} cameraStream={remoteCamera} screenStream={remoteScreen} /> */}
          </div>
        </section>
      </div>
    </main>
  );
}
