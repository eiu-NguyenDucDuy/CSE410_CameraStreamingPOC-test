"use client";

import { useEffect, useRef } from "react";

interface Props {
  stream?: MediaStream | null;
  className?: string;
  objectFit?: "cover" | "contain";
}

export default function VideoPlayer({ stream, className = "", objectFit = "cover" }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream ?? null;
    }
  }, [stream]);

  const fitClass = objectFit === "contain" ? "object-contain" : "object-cover";

  return <video ref={videoRef} autoPlay playsInline muted className={`h-full w-full ${fitClass} ${className}`} />;
}
