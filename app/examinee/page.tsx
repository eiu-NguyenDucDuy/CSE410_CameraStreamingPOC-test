"use client";

import { useEffect, useState, useRef } from "react";
import CameraPreview from "@/components/examinee/CameraPreview";
import ScreenShareStatus from "@/components/examinee/ScreenShareStatus";
import { useCamera } from "@/hooks/useCamera";
import { useScreenShare } from "@/hooks/useScreenShare";
import { signalingService } from "@/services/signaling";
import { WebRTCService } from "@/services/webrtc";

const webrtcService = new WebRTCService();

export default function ExamineePage() {
  const cameraHook = useCamera();
  const screenHook = useScreenShare();

  const [studentId, setStudentId] = useState<string>("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  // Sync refs synchronously on render so WebRTC signaling listeners always see current streams
  cameraStreamRef.current = cameraHook.stream;
  screenStreamRef.current = screenHook.stream;

  useEffect(() => {
    // Load or create student ID
    let sid = localStorage.getItem("examinee_id");
    if (!sid) {
      sid = "SV" + Math.floor(100 + Math.random() * 900);
      localStorage.setItem("examinee_id", sid);
    }
    setStudentId(sid);

    // Connect to WebSocket Signaling Server
    signalingService.connect();

    const joinSession = () => {
      signalingService.send({
        type: "join-examinee",
        studentId: sid,
        name: "Thí sinh " + sid,
        cameraEnabled: !!cameraStreamRef.current,
        screenSharing: !!screenStreamRef.current,
      });
      setIsConnected(true);
    };

    const timer = setTimeout(joinSession, 500);

    const unsub = signalingService.onMessage(async (msg) => {
      if (msg.type === "signal-offer") {
        const { senderSocketId, streamType, offer } = msg;
        if (!senderSocketId || !offer) return;

        const peerKey = `${senderSocketId}-${streamType}`;
        const peer = webrtcService.createPeer(
          peerKey,
          (candidate) => {
            signalingService.send({
              type: "signal-ice",
              targetSocketId: senderSocketId,
              streamType,
              candidate,
            });
          }
        );

        const targetStream = streamType === "camera" ? cameraStreamRef.current : screenStreamRef.current;
        if (targetStream) {
          targetStream.getTracks().forEach((track) => peer.addTrack(track, targetStream));
        }

        try {
          await peer.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);

          signalingService.send({
            type: "signal-answer",
            targetSocketId: senderSocketId,
            streamType,
            answer,
          });
        } catch (err) {
          console.error("Error responding to offer:", err);
        }
      } else if (msg.type === "signal-ice") {
        const { senderSocketId, streamType, candidate } = msg;
        const peerKey = `${senderSocketId}-${streamType}`;
        const peer = webrtcService.getPeer(peerKey);
        if (peer && candidate) {
          try {
            await peer.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.error("Error adding ICE candidate:", err);
          }
        }
      } else if (msg.type === "receive-warning") {
        if (msg.message) {
          setWarnings((prev) => [...prev, msg.message]);
        }
      }
    });

    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, []);

  // Update status whenever camera or screen changes
  useEffect(() => {
    if (studentId && isConnected) {
      signalingService.send({
        type: "update-stream-status",
        studentId: studentId,
        cameraEnabled: !!cameraHook.stream,
        screenSharing: !!screenHook.stream,
      });
    }
  }, [cameraHook.stream, screenHook.stream, studentId, isConnected]);

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      {/* Warning banner */}
      {warnings.length > 0 && (
        <div className="mb-6 space-y-2">
          {warnings.map((warn, i) => (
            <div key={i} className="flex items-center justify-between rounded-xl bg-red-600 p-4 text-white shadow-lg animate-bounce">
              <span className="font-semibold">⚠️ CẢNH BÁO TỪ GIÁM THỊ: {warn}</span>
              <button onClick={() => setWarnings((prev) => prev.filter((_, idx) => idx !== i))} className="text-sm underline">
                Đóng
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        {/* Exam area */}
        <section className="col-span-9 rounded-xl bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Online Examination</h1>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800">
              Mã thí sinh: {studentId || "Đang tạo..."}
            </span>
          </div>

          <div className="mt-6">
            <h2 className="font-semibold">Question 1</h2>
            <p className="mt-2">Explain the difference between HTTP and HTTPS.</p>
            <textarea className="mt-4 h-64 w-full rounded-lg border p-4" placeholder="Your answer..." />
          </div>
        </section>

        {/* Right panel */}
        <aside className="col-span-3 space-y-5">
          <CameraPreview
            stream={cameraHook.stream}
            startCamera={cameraHook.startCamera}
            stopCamera={cameraHook.stopCamera}
            error={cameraHook.error}
            videoRef={cameraHook.videoRef}
          />
          <ScreenShareStatus
            stream={screenHook.stream}
            startScreenShare={screenHook.startScreenShare}
            stopScreenShare={screenHook.stopScreenShare}
            error={screenHook.error}
          />

          <div className="rounded-xl bg-white p-4 shadow">
            <h2 className="font-semibold">Status</h2>
            <p className="mt-2">
              Server:
              <span className="ml-2 font-medium text-emerald-600">{isConnected ? "🟢 Connected" : "🟡 Connecting"}</span>
            </p>
            <p className="mt-1">
              Camera:
              <span className="ml-2">{cameraHook.stream ? "🟢 Live" : "⚪ Off"}</span>
            </p>
            <p className="mt-1">
              Screen:
              <span className="ml-2">{screenHook.stream ? "🟢 Sharing" : "⚪ Off"}</span>
            </p>
          </div>

          {/* Questions */}
          <div className="rounded-xl bg-white p-4 shadow">
            <h2 className="mb-3 font-semibold">Questions</h2>
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 20 }).map((_, index) => (
                <button key={index} className="rounded bg-slate-200 py-2 hover:bg-blue-500 hover:text-white">
                  {index + 1}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
