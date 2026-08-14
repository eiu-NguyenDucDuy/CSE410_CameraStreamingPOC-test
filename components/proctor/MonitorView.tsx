"use client";

import { useState } from "react";
import VideoPlayer from "@/components/common/VideoPlayer";
import { Candidate } from "@/types/candidate";

interface Props {
  candidate?: Candidate;
  cameraStream?: MediaStream | null;
  screenStream?: MediaStream | null;
  onSendWarning?: (studentId: string, message: string) => void;
  onRequestReconnect?: (studentId: string) => void;
}

const PRESET_WARNINGS = [
  "Vui lòng điều chỉnh camera quay thẳng khuôn mặt",
  "Vui lòng bật chia sẻ toàn bộ màn hình làm bài",
  "Tập trung nhìn vào màn hình thi, không nhìn ra ngoài",
  "Không sử dụng điện thoại hoặc tài liệu không cho phép",
  "Phát hiện âm thanh hoặc người lạ gần khu vực làm bài",
];

export default function MonitorView({
  candidate,
  cameraStream,
  screenStream,
  onSendWarning,
  onRequestReconnect,
}: Props) {
  const [customWarning, setCustomWarning] = useState("");
  const [isSending, setIsSending] = useState(false);

  if (!candidate) {
    return (
      <div className="aspect-video flex flex-col items-center justify-center rounded-2xl bg-slate-900 text-slate-400 p-8 border border-slate-800">
        <svg className="w-16 h-16 text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        <p className="text-base font-medium text-slate-300">Chưa chọn thí sinh để giám sát</p>
        <p className="text-xs text-slate-500 mt-1">Chọn thí sinh từ danh sách bên trái để xem camera và màn hình trực tiếp</p>
      </div>
    );
  }

  const handleSend = (msg: string) => {
    if (!msg.trim() || !onSendWarning) return;
    setIsSending(true);
    onSendWarning(candidate.studentId || candidate.id, msg.trim());
    setCustomWarning("");
    setTimeout(() => setIsSending(false), 500);
  };

  const studentId = candidate.studentId || candidate.id;

  return (
    <div className="space-y-5">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-800">{candidate.name}</h2>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-mono font-medium text-slate-600">
              {studentId}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Trạng thái kết nối:{" "}
            <span className={candidate.status === "connected" ? "text-emerald-600 font-semibold" : "text-amber-600 font-semibold"}>
              {candidate.status === "connected" ? "Đang kết nối (Live)" : "Mất kết nối"}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
              candidate.cameraEnabled
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-rose-50 text-rose-700 border border-rose-200"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${candidate.cameraEnabled ? "bg-emerald-500 animate-pulse" : "bg-rose-400"}`} />
            Camera: {candidate.cameraEnabled ? "Bật" : "Tắt"}
          </span>

          <span
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
              candidate.screenSharing
                ? "bg-blue-50 text-blue-700 border border-blue-200"
                : "bg-slate-100 text-slate-600 border border-slate-200"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${candidate.screenSharing ? "bg-blue-500 animate-pulse" : "bg-slate-400"}`} />
            Màn hình: {candidate.screenSharing ? "Đang chia sẻ" : "Tắt"}
          </span>

          {onRequestReconnect && (
            <button
              onClick={() => onRequestReconnect(studentId)}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-100 hover:bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700 transition"
              title="Yêu cầu thí sinh thiết lập lại kết nối video"
            >
              🔄 Kết nối lại
            </button>
          )}
        </div>
      </div>

      {/* Video Streams Container */}
      <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl">
        {/* Main Screen Stream */}
        <div className="aspect-video w-full flex items-center justify-center bg-slate-950">
          {screenStream ? (
            <VideoPlayer stream={screenStream} objectFit="contain" />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-500 p-6 text-center">
              <svg className="w-12 h-12 mb-2 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p className="text-sm font-medium text-slate-400">
                {candidate.screenSharing ? "📡 Đang đồng bộ luồng màn hình..." : "🖥️ Thí sinh chưa chia sẻ màn hình"}
              </p>
              <p className="text-xs text-slate-600 mt-1">Luồng WebRTC trực tiếp độ trễ siêu thấp</p>
            </div>
          )}
        </div>

        {/* Floating Webcam Overlay */}
        <div className="absolute right-4 top-4 h-44 w-60 overflow-hidden rounded-xl bg-slate-900 border-2 border-slate-700 shadow-2xl transition hover:scale-105">
          <div className="absolute top-2 left-2 z-10 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur">
            📷 Camera thí sinh
          </div>
          {cameraStream ? (
            <VideoPlayer stream={cameraStream} objectFit="cover" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-slate-500 p-3 text-center">
              <svg className="w-8 h-8 mb-1 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className="text-xs text-slate-400">
                {candidate.cameraEnabled ? "📡 Đang tải camera..." : "📷 Camera đã tắt"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Warning Dispatch Section */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            ⚠️ Gửi cảnh báo giám thị tới {candidate.name}
          </h3>
          {candidate.warnings && candidate.warnings.length > 0 && (
            <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
              Đã gửi {candidate.warnings.length} cảnh báo
            </span>
          )}
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap gap-2">
          {PRESET_WARNINGS.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(preset)}
              disabled={isSending}
              className="rounded-lg bg-white border border-slate-200 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 px-3 py-1.5 text-xs text-slate-700 font-medium transition shadow-sm"
            >
              {preset}
            </button>
          ))}
        </div>

        {/* Custom warning form */}
        <div className="flex gap-2">
          <input
            type="text"
            value={customWarning}
            onChange={(e) => setCustomWarning(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend(customWarning)}
            placeholder="Nhập nội dung cảnh báo tùy chỉnh..."
            className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
          />
          <button
            onClick={() => handleSend(customWarning)}
            disabled={!customWarning.trim() || isSending}
            className="rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 px-4 py-2 text-xs font-semibold text-white transition shadow-sm"
          >
            {isSending ? "Đang gửi..." : "Gửi cảnh báo"}
          </button>
        </div>

        {/* Warning History */}
        {candidate.warnings && candidate.warnings.length > 0 && (
          <div className="mt-2 space-y-1 border-t border-slate-200 pt-2">
            <p className="text-[11px] font-semibold text-slate-500">Lịch sử cảnh báo đã phát:</p>
            <div className="max-h-24 overflow-y-auto space-y-1">
              {candidate.warnings.map((w, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50/70 p-1.5 rounded border border-rose-100">
                  <span className="font-bold">#{idx + 1}</span> {w}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
