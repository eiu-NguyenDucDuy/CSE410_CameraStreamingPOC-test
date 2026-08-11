"use client";

import { useState, useRef } from "react";

export function useScreenShare() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const startScreenShare = async () => {
    try {
      setError(null);

      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      setStream(screenStream);

      if (videoRef.current) {
        videoRef.current.srcObject = screenStream;
      }

      // Detect when user clicks "Stop sharing"
      screenStream.getVideoTracks()[0].addEventListener("ended", () => {
        stopScreenShare();
      });
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        console.log("User cancelled screen sharing dialog.");
        setError(null);
      } else {
        console.error("Screen share error:", err);
        setError("Cannot access screen sharing.");
      }
    }
  };

  const stopScreenShare = () => {
    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop();
      });

      setStream(null);
    }
  };

  return { stream, error, videoRef, startScreenShare, stopScreenShare };
}
