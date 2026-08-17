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
  const [serverConnected, setServerConnected] = useState(false);
  const [reconnectAlert, setReconnectAlert] = useState(false);

  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  // Sync refs synchronously on render so WebRTC signaling listeners always see current streams
  cameraStreamRef.current = cameraHook.stream;
  screenStreamRef.current = screenHook.stream;

  useEffect(() => {
    // Generate a unique examinee ID for each tab to ensure multiple tabs show up as separate online candidates
    const sid = "SV" + Math.floor(1000 + Math.random() * 9000);
    setStudentId(sid);

    // Connect to WebSocket Signaling Server
    signalingService.connect();

    const unsubStatus = signalingService.onStatusChange((connected) => {
      setServerConnected(connected);
      if (connected) {
        signalingService.send({
          type: "join-examinee",
          studentId: sid,
          name: "Thí sinh " + sid,
          cameraEnabled: !!cameraStreamRef.current,
          screenSharing: !!screenStreamRef.current,
        });
      }
    });

    const joinSession = () => {
      signalingService.send({
        type: "join-examinee",
        studentId: sid,
        name: "Thí sinh " + sid,
        cameraEnabled: !!cameraStreamRef.current,
        screenSharing: !!screenStreamRef.current,
      });
    };

    const timer = setTimeout(joinSession, 500);

    const unsubMsg = signalingService.onMessage(async (msg) => {
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

        try {
          if (targetStream) {
            targetStream.getTracks().forEach((track) => peer.addTrack(track, targetStream));
          }

          await peer.setRemoteDescription(new RTCSessionDescription(offer));

          peer.getTransceivers().forEach((transceiver) => {
            if (targetStream && targetStream.getTracks().length > 0) {
              transceiver.direction = "sendonly";
            }
          });

          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);

          await webrtcService.processIceQueue(peerKey);

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
        if (candidate) {
          await webrtcService.addIceCandidate(peerKey, candidate);
        }
      } else if (msg.type === "receive-warning") {
        if (msg.message) {
          setWarnings((prev) => [...prev, msg.message]);
        }
      } else if (msg.type === "request-reconnect") {
        setReconnectAlert(true);
        setTimeout(() => setReconnectAlert(false), 6000);
        // Resend stream status to trigger proctor re-negotiation
        signalingService.send({
          type: "update-stream-status",
          studentId: sid,
          cameraEnabled: !!cameraStreamRef.current,
          screenSharing: !!screenStreamRef.current,
        });
      }
    });

    return () => {
      clearTimeout(timer);
      unsubStatus();
      unsubMsg();
    };
  }, []);

  // Update status whenever camera or screen changes
  useEffect(() => {
    if (studentId && serverConnected) {
      signalingService.send({
        type: "update-stream-status",
        studentId: studentId,
        cameraEnabled: !!cameraHook.stream,
        screenSharing: !!screenHook.stream,
      });
    }
  }, [cameraHook.stream, screenHook.stream, studentId, serverConnected]);

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      {/* Reconnect notification */}
      {reconnectAlert && (
        <div className="mb-4 rounded-xl bg-amber-500 p-4 text-white shadow-md flex items-center justify-between animate-pulse">
          <span className="font-semibold text-sm">
            🔄 Giám thị vừa yêu cầu bạn làm mới kết nối camera / màn hình. Luồng video đang được tái lập...
          </span>
          <button onClick={() => setReconnectAlert(false)} className="text-xs underline font-bold">
            Đã hiểu
          </button>
        </div>
      )}

      {/* Warning banner */}
      {warnings.length > 0 && (
        <div className="mb-6 space-y-2">
          {warnings.map((warn, i) => (
            <div key={i} className="flex items-center justify-between rounded-xl bg-rose-600 p-4 text-white shadow-xl animate-bounce">
              <span className="font-bold text-sm">⚠️ CẢNH BÁO TỪ GIÁM THỊ: {warn}</span>
              <button onClick={() => setWarnings((prev) => prev.filter((_, idx) => idx !== i))} className="text-xs underline font-semibold bg-rose-700 hover:bg-rose-800 px-3 py-1 rounded">
                Đã hiểu
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        {/* Exam area */}
        <section className="col-span-12 lg:col-span-9 rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">INCIT Online Examination</h1>
              <p className="text-xs text-slate-500 mt-1">Bài thi trắc nghiệm & tự luận trực tuyến có giám sát</p>
            </div>
            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3.5 py-1 text-xs font-semibold text-emerald-800">
              Mã thí sinh: {studentId || "Đang tạo..."}
            </span>
          </div>

          <div className="mt-6 space-y-4">
            <div className="rounded-xl bg-slate-50 p-4 border border-slate-200">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">Câu hỏi 1 / 20</span>
              <h2 className="font-semibold text-slate-800 text-base mt-1">
                Giải thích sự khác biệt giữa giao thức HTTP và HTTPS. Cơ chế mã hóa SSL/TLS hoạt động như thế nào?
              </h2>
            </div>
            <textarea
              className="h-64 w-full rounded-xl border border-slate-300 p-4 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Nhập câu trả lời của bạn tại đây..."
            />
          </div>
        </section>

        {/* Right panel */}
        <aside className="col-span-12 lg:col-span-3 space-y-5">
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

          <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
            <h2 className="font-bold text-sm text-slate-800 mb-2">Trạng thái giám sát</h2>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Signaling Server:</span>
                <span className={`font-semibold ${serverConnected ? "text-emerald-600" : "text-amber-600"}`}>
                  {serverConnected ? "🟢 INCIT Backend (8081)" : "🟡 Đang kết nối..."}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Webcam:</span>
                <span className={`font-semibold ${cameraHook.stream ? "text-emerald-600" : "text-slate-400"}`}>
                  {cameraHook.stream ? "🟢 Đang phát" : "⚪ Tắt"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Chia sẻ màn hình:</span>
                <span className={`font-semibold ${screenHook.stream ? "text-emerald-600" : "text-slate-400"}`}>
                  {screenHook.stream ? "🟢 Đang chia sẻ" : "⚪ Tắt"}
                </span>
              </div>
            </div>
          </div>

          {/* Question Navigator */}
          <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
            <h2 className="mb-3 font-bold text-sm text-slate-800">Danh sách câu hỏi</h2>
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 20 }).map((_, index) => (
                <button
                  key={index}
                  className={`rounded-lg py-2 text-xs font-semibold transition ${
                    index === 0
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-600"
                  }`}
                >
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
