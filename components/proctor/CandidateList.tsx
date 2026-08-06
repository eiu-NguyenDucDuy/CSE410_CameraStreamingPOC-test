"use client";

import { Candidate } from "@/types/candidate";

interface Props {
  candidates: Candidate[];
  selectedId?: string;
  onSelect: (id: string) => void;
}

export default function CandidateList({ candidates, selectedId, onSelect }: Props) {
  return (
    <div className="space-y-3">
      {candidates.map((candidate) => (
        <button
          key={candidate.id}
          onClick={() => onSelect(candidate.id)}
          className={`w-full rounded-lg border p-3 text-left ${selectedId === candidate.id ? "border-blue-500 bg-blue-50" : "bg-white"}`}
        >
          <div className="font-semibold">{candidate.name}</div>
          <div className="text-sm text-gray-500">Status: {candidate.status}</div>
          <div className="mt-2 text-xs">
            Camera: {candidate.cameraEnabled ? "🟢" : "🔴"}
            <br />
            Screen: {candidate.screenSharing ? "🟢" : "🔴"}
          </div>
        </button>
      ))}
    </div>
  );
}
