"use client";

import { useScreenShare } from "@/hooks/useScreenShare";

interface Props {
  stream?: MediaStream | null;
  startScreenShare?: () => void;
  stopScreenShare?: () => void;
  error?: string | null;
}

export default function ScreenShareStatus(props: Props) {
  const internalHook = useScreenShare();

  const stream = props.stream !== undefined ? props.stream : internalHook.stream;
  const startScreenShare = props.startScreenShare || internalHook.startScreenShare;
  const stopScreenShare = props.stopScreenShare || internalHook.stopScreenShare;
  const error = props.error !== undefined ? props.error : internalHook.error;

  return (
    <div className="rounded-xl bg-white p-4 shadow">
      <h2 className="font-semibold">Screen Sharing</h2>

      <p className="mt-2">
        Status:
        <span className="ml-2">{stream ? "🟢 Sharing" : "⚪ Not Sharing"}</span>
      </p>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        onClick={stream ? stopScreenShare : startScreenShare}
        className={`mt-3 rounded-lg px-4 py-2 text-white ${stream ? "bg-red-600" : "bg-green-600"}`}
      >
        {stream ? "Stop Sharing" : "Share Screen"}
      </button>
    </div>
  );
}
