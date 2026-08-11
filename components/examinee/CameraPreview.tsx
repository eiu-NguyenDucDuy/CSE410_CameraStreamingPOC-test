"use client";

import { useCamera } from "@/hooks/useCamera";
import { useEffect } from "react";

interface Props {
  stream?: MediaStream | null;
  startCamera?: () => void;
  stopCamera?: () => void;
  error?: string | null;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
}

export default function CameraPreview(props: Props) {
  const internalHook = useCamera();

  const stream = props.stream !== undefined ? props.stream : internalHook.stream;
  const startCamera = props.startCamera || internalHook.startCamera;
  const stopCamera = props.stopCamera || internalHook.stopCamera;
  const error = props.error !== undefined ? props.error : internalHook.error;
  const videoRef = props.videoRef || internalHook.videoRef;

  useEffect(() => {
    if (videoRef && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, videoRef]);

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
