"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import CandidateList from "@/components/proctor/CandidateList";
import MonitorView from "@/components/proctor/MonitorView";
import { Candidate } from "@/types/candidate";
import { signalingService } from "@/services/signaling";
import { WebRTCService } from "@/services/webrtc";
import { sendProctorWarning, fetchActiveCandidates } from "@/services/proctoringApi";

const webrtcService = new WebRTCService();

export default function ProctorPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [filter, setFilter] = useState<"all" | "streaming" | "warnings">("all");
  const [serverConnected, setServerConnected] = useState(false);

  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  const selectedCandidate = candidates.find((c) => c.id === selectedId || c.studentId === selectedId);

  // Connect to Signaling Server
  useEffect(() => {
    signalingService.connect();

    const unsubStatus = signalingService.onStatusChange((connected) => {
      setServerConnected(connected);
      if (connected) {
        // Send join-proctor once connected
        signalingService.send({ type: "join-proctor" });
      }
    });

    const joinProctor = () => {
      signalingService.send({ type: "join-proctor" });
    };

    const timer = setTimeout(joinProctor, 500);

    // Initial fallback fetch via REST
    fetchActiveCandidates().then((list) => {
      if (list && list.length > 0) {
        const formatted: Candidate[] = list.map((e) => ({
          id: e.studentId || e.id,
          studentId: e.studentId,
          name: e.name,
          status: (e.status as any) || "connected",
          cameraEnabled: e.cameraEnabled || false,
          screenSharing: e.screenSharing || false,
          socketId: e.socketId,
          warnings: e.warnings || [],
        }));
        setCandidates((prev) => (prev.length === 0 ? formatted : prev));
        if (!selectedId && formatted.length > 0) {
          setSelectedId(formatted[0].id);
        }
      }
    });

    const unsubMsg = signalingService.onMessage(async (msg) => {
      if (msg.type === "examinees-list") {
        const list: Candidate[] = (msg.payload || []).map((e: any) => ({
          id: e.studentId || e.id,
          studentId: e.studentId,
          name: e.name,
          status: (e.status as any) || "connected",
          cameraEnabled: e.cameraEnabled || false,
          screenSharing: e.screenSharing || false,
          socketId: e.socketId,
          warnings: e.warnings || [],
        }));
        setCandidates(list);
        if (list.length > 0 && !selectedId) {
          setSelectedId(list[0].id);
        }
      } else if (msg.type === "examinee-joined" || msg.type === "examinee-updated") {
        const e = msg.payload;
        if (!e) return;
        const cand: Candidate = {
          id: e.studentId || e.id,
          studentId: e.studentId,
          name: e.name,
          status: (e.status as any) || "connected",
          cameraEnabled: e.cameraEnabled || false,
          screenSharing: e.screenSharing || false,
          socketId: e.socketId,
          warnings: e.warnings || [],
        };
        setCandidates((prev) => {
          const idx = prev.findIndex((item) => item.id === cand.id || item.studentId === cand.studentId);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = cand;
            return next;
          }
          return [...prev, cand];
        });
      } else if (msg.type === "examinee-left") {
        const studentId = msg.payload?.studentId;
        if (studentId) {
          setCandidates((prev) =>
            prev.map((c) => (c.id === studentId || c.studentId === studentId ? { ...c, status: "disconnected" } : c))
          );
        }
      } else if (msg.type === "signal-answer") {
        const { senderSocketId, streamType, answer } = msg;
        const peerKey = `${senderSocketId}-${streamType}`;
        const peer = webrtcService.getPeer(peerKey);
        if (peer && answer) {
          try {
            await peer.setRemoteDescription(new RTCSessionDescription(answer));
            await webrtcService.processIceQueue(peerKey);
          } catch (err) {
            console.error("Error setting remote answer:", err);
          }
        }
      } else if (msg.type === "signal-ice") {
        const { senderSocketId, streamType, candidate } = msg;
        const peerKey = `${senderSocketId}-${streamType}`;
        if (candidate) {
          await webrtcService.addIceCandidate(peerKey, candidate);
        }
      }
    });

    return () => {
      clearTimeout(timer);
      unsubStatus();
      unsubMsg();
    };
  }, []);

  // WebRTC negotiation when selected candidate changes
  useEffect(() => {
    if (!selectedCandidate || !selectedCandidate.socketId || selectedCandidate.status === "disconnected") {
      setCameraStream(null);
      setScreenStream(null);
      return;
    }

    // Reset streams
    setCameraStream(null);
    setScreenStream(null);

    const socketId = selectedCandidate.socketId;

    // Connect Camera Stream
    if (selectedCandidate.cameraEnabled) {
      const cameraPeerKey = `${socketId}-camera`;
      const cameraPeer = webrtcService.createPeer(
        cameraPeerKey,
        (candidate) => {
          signalingService.send({
            type: "signal-ice",
            targetSocketId: socketId,
            streamType: "camera",
            candidate,
          });
        },
        (remoteStream) => {
          console.log("[Proctor] Camera remoteStream received for socket:", socketId);
          setCameraStream(remoteStream);
        }
      );

      cameraPeer.addTransceiver("video", { direction: "recvonly" });

      cameraPeer
        .createOffer()
        .then((offer) => cameraPeer.setLocalDescription(offer).then(() => offer))
        .then((offer) => {
          signalingService.send({
            type: "signal-offer",
            targetSocketId: socketId,
            streamType: "camera",
            offer,
          });
        })
        .catch((err) => console.error("Error creating camera offer:", err));
    } else {
      webrtcService.closePeer(`${socketId}-camera`);
    }

    // Connect Screen Stream
    if (selectedCandidate.screenSharing) {
      const screenPeerKey = `${socketId}-screen`;
      const screenPeer = webrtcService.createPeer(
        screenPeerKey,
        (candidate) => {
          signalingService.send({
            type: "signal-ice",
            targetSocketId: socketId,
            streamType: "screen",
            candidate,
          });
        },
        (remoteStream) => {
          console.log("[Proctor] Screen remoteStream received for socket:", socketId);
          setScreenStream(remoteStream);
        }
      );

      screenPeer.addTransceiver("video", { direction: "recvonly" });

      screenPeer
        .createOffer()
        .then((offer) => screenPeer.setLocalDescription(offer).then(() => offer))
        .then((offer) => {
          signalingService.send({
            type: "signal-offer",
            targetSocketId: socketId,
            streamType: "screen",
            offer,
          });
        })
        .catch((err) => console.error("Error creating screen offer:", err));
    } else {
      webrtcService.closePeer(`${socketId}-screen`);
    }
  }, [selectedCandidate?.socketId, selectedCandidate?.cameraEnabled, selectedCandidate?.screenSharing]);

  const handleSendWarning = (studentId: string, message: string) => {
    // Send via WebSocket
    signalingService.send({
      type: "proctor-warning",
      studentId: studentId,
      message: message,
    });
    // Also send via REST API to ensure delivery & logging
    sendProctorWarning(studentId, message);

    // Optimistically update candidate warning list in state
    setCandidates((prev) =>
      prev.map((c) =>
        c.id === studentId || c.studentId === studentId
          ? { ...c, warnings: [...(c.warnings || []), message] }
          : c
      )
    );
  };

  const handleRequestReconnect = (studentId: string) => {
    signalingService.send({
      type: "request-reconnect",
      studentId: studentId,
    });
  };

  const filteredCandidates = useMemo(() => {
    if (filter === "streaming") {
      return candidates.filter((c) => c.cameraEnabled || c.screenSharing);
    }
    if (filter === "warnings") {
      return candidates.filter((c) => c.warnings && c.warnings.length > 0);
    }
    return candidates;
  }, [candidates, filter]);

  const onlineCount = candidates.filter((c) => c.status === "connected").length;

  return (
    <main className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="border-b bg-white px-6 py-3 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-sm">
            IC
          </span>
          <div>
            <h1 className="text-lg font-bold text-slate-800">INCIT Live Proctoring System</h1>
            <p className="text-xs text-slate-500">Giám sát camera và màn hình thí sinh trực tiếp theo thời gian thực</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                serverConnected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
              }`}
            />
            <span className="text-xs font-semibold text-slate-700">
              {serverConnected ? "INCIT Backend Connected (8081)" : "Server Disconnected"}
            </span>
          </div>

          <div className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {onlineCount} / {candidates.length} Thí sinh online
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="flex-1 grid grid-cols-12 gap-6 p-6">
        {/* Left Sidebar: Candidates List */}
        <aside className="col-span-12 lg:col-span-3 flex flex-col rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800">Danh sách thí sinh</h2>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
              {filteredCandidates.length}
            </span>
          </div>

          {/* Filter tabs */}
          <div className="mb-3 flex rounded-lg bg-slate-100 p-1 text-xs font-medium">
            <button
              onClick={() => setFilter("all")}
              className={`flex-1 rounded-md py-1 transition ${
                filter === "all" ? "bg-white text-blue-700 font-semibold shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setFilter("streaming")}
              className={`flex-1 rounded-md py-1 transition ${
                filter === "streaming" ? "bg-white text-blue-700 font-semibold shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Đang stream
            </button>
            <button
              onClick={() => setFilter("warnings")}
              className={`flex-1 rounded-md py-1 transition ${
                filter === "warnings" ? "bg-white text-rose-700 font-semibold shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Có cảnh báo
            </button>
          </div>

          {/* Candidate list container */}
          <div className="flex-1 overflow-y-auto max-h-[calc(100vh-230px)] pr-1">
            {filteredCandidates.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 rounded-xl bg-slate-50 border border-dashed border-slate-200">
                Không có thí sinh phù hợp bộ lọc.
                <br />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Mở trang <code className="bg-slate-200 px-1 rounded">/examinee</code> ở tab/trình duyệt khác để tham gia.
                </span>
              </div>
            ) : (
              <CandidateList
                candidates={filteredCandidates}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            )}
          </div>
        </aside>

        {/* Right Main Panel: Live Video Monitor & Control */}
        <section className="col-span-12 lg:col-span-9 rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
          <MonitorView
            candidate={selectedCandidate}
            cameraStream={cameraStream}
            screenStream={screenStream}
            onSendWarning={handleSendWarning}
            onRequestReconnect={handleRequestReconnect}
          />
        </section>
      </div>
    </main>
  );
}
