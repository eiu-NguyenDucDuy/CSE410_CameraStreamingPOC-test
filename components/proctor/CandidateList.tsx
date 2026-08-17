"use client";

import { Candidate } from "@/types/candidate";

interface Props {
  candidates: Candidate[];
  selectedId?: string;
  onSelect: (id: string) => void;
}

export default function CandidateList({ candidates, selectedId, onSelect }: Props) {
  return (
    <div className="space-y-2.5">
      {candidates.map((candidate) => {
        const id = candidate.id || candidate.studentId || "";
        const isSelected = selectedId === id;
        const isConnected = candidate.status === "connected";

        return (
          <button
            key={id}
            onClick={() => onSelect(id)}
            className={`w-full rounded-xl border p-3.5 text-left transition ${
              isSelected
                ? "border-blue-500 bg-blue-50/80 shadow-md ring-1 ring-blue-500"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="font-semibold text-slate-800 text-sm truncate max-w-[170px]">
                {candidate.name}
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  isConnected ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? "bg-emerald-500" : "bg-slate-400"}`} />
                {isConnected ? "Live" : "Offline"}
              </span>
            </div>

            <div className="text-xs text-slate-500 mt-0.5 font-mono">
              ID: {candidate.studentId || id}
            </div>

            <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px]">
              <div className="flex items-center gap-2">
                <span className={`flex items-center gap-0.5 ${candidate.cameraEnabled ? "text-emerald-600 font-medium" : "text-slate-400"}`}>
                  📷 {candidate.cameraEnabled ? "ON" : "OFF"}
                </span>
                <span className={`flex items-center gap-0.5 ${candidate.screenSharing ? "text-blue-600 font-medium" : "text-slate-400"}`}>
                  🖥️ {candidate.screenSharing ? "ON" : "OFF"}
                </span>
              </div>

              {candidate.warnings && candidate.warnings.length > 0 && (
                <span className="rounded bg-rose-100 px-1.5 py-0.2 text-[10px] font-bold text-rose-700">
                  ⚠️ {candidate.warnings.length}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
