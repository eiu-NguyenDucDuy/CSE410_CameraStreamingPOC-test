"use client";

import { useScreenShare } from "@/hooks/useScreenShare";

export default function ScreenShareStatus() {
  const { stream, error, startScreenShare, stopScreenShare } = useScreenShare();

  return (
    <div className="rounded-xl bg-white p-4 shadow">
      <h2 className="font-semibold">Screen Sharing</h2>

      <p className="mt-2">
        Status:
        <span className="ml-2">{stream ? "🟢 Sharing" : "⚪ Not Sharing"}</span>
      </p>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button onClick={stream ? stopScreenShare : startScreenShare} className={`mt-3 rounded-lg px-4 py-2 text-white ${stream ? "bg-red-600" : "bg-green-600"}`}>
        {stream ? "Stop Sharing" : "Share Screen"}
      </button>
    </div>
  );
}
