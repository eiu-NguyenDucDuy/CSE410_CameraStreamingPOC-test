"use client";

import VideoPlayer from "@/components/common/VideoPlayer";
import { Candidate } from "@/types/candidate";

interface Props {
  candidate?: Candidate;
  cameraStream?: MediaStream | null;
  screenStream?: MediaStream | null;
}

export default function MonitorView({ candidate, cameraStream, screenStream }: Props) {
  if (!candidate) {
    return <div className="aspect-video flex items-center justify-center bg-gray-300 rounded-xl">Select a candidate to monitor</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">{candidate.name} ({candidate.id || candidate.studentId})</h2>
          <span className="text-sm text-gray-500">Status: {candidate.status}</span>
        </div>
        <div className="flex gap-2">
          <span className={`px-2 py-1 rounded text-xs text-white ${candidate.cameraEnabled ? "bg-emerald-600" : "bg-gray-400"}`}>
            Camera: {candidate.cameraEnabled ? "ON" : "OFF"}
          </span>
          <span className={`px-2 py-1 rounded text-xs text-white ${candidate.screenSharing ? "bg-emerald-600" : "bg-gray-400"}`}>
            Screen: {candidate.screenSharing ? "ON" : "OFF"}
          </span>
        </div>
      </div>

      <div className="relative rounded-xl overflow-hidden bg-slate-900 border">
        {/* Remote screen */}
        <div className="aspect-video w-full flex items-center justify-center">
          {screenStream ? (
            <VideoPlayer stream={screenStream} objectFit="contain" />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400 text-sm">
              {candidate.screenSharing ? "📡 Connecting screen stream..." : "🖥️ Candidate is not sharing screen"}
            </div>
          )}
        </div>

        {/* Remote camera overlay */}
        <div className="absolute right-4 top-4 h-44 w-60 overflow-hidden rounded-lg bg-black border-2 border-slate-700 shadow-xl">
          {cameraStream ? (
            <VideoPlayer stream={cameraStream} objectFit="cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400 text-xs text-center p-2">
              {candidate.cameraEnabled ? "📡 Connecting camera stream..." : "📷 Camera turned off"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
