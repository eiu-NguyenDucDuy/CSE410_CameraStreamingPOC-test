"use client";

import { useCamera } from "@/hooks/useCamera";

export default function CameraPreview() {
  const { videoRef, error, stream, startCamera, stopCamera } = useCamera();

  return (
    <div className="rounded-xl bg-white p-4 shadow">
      <h2 className="mb-3 text-lg font-semibold">Camera Preview</h2>

      <div className="aspect-video overflow-hidden rounded-lg bg-black">
        <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
      </div>

      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

      <div className="mt-4 flex gap-3">
        {!stream ? (
          <button onClick={startCamera} className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
            Start Camera
          </button>
        ) : (
          <button onClick={stopCamera} className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700">
            Stop Camera
          </button>
        )}
      </div>
    </div>
  );
}
