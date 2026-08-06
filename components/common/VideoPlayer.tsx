"use client";

import { useEffect, useRef } from "react";

interface Props {
  stream?: MediaStream | null;
  className?: string;
}

export default function VideoPlayer({ stream, className = "" }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream ?? null;
    }
  }, [stream]);

  return <video ref={videoRef} autoPlay playsInline muted className={`h-full w-full object-cover ${className}`} />;
}
