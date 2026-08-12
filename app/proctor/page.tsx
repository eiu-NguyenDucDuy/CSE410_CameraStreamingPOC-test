"use client";

import { useEffect, useState, useRef } from "react";
import CandidateList from "@/components/proctor/CandidateList";
import MonitorView from "@/components/proctor/MonitorView";
import { Candidate } from "@/types/candidate";
import { signalingService } from "@/services/signaling";
import { WebRTCService } from "@/services/webrtc";

const webrtcService = new WebRTCService();

export default function ProctorPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");

  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  const selectedCandidate = candidates.find((c) => c.id === selectedId || c.studentId === selectedId);

  // Connect to Signaling Server
  useEffect(() => {
    signalingService.connect();

    const joinProctor = () => {
      signalingService.send({ type: "join-proctor" });
    };

    const timer = setTimeout(joinProctor, 500);

    const unsub = signalingService.onMessage(async (msg) => {
      if (msg.type === "examinees-list") {
        const list: Candidate[] = (msg.payload || []).map((e: any) => ({
          id: e.studentId || e.id,
          studentId: e.studentId,
          name: e.name,
          status: e.status || "connected",
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
          status: e.status || "connected",
          cameraEnabled: e.cameraEnabled || false,
          screenSharing: e.screenSharing || false,
          socketId: e.socketId,
          warnings: e.warnings || [],
        };
        setCandidates((prev) => {
          const idx = prev.findIndex((item) => item.id === cand.id);
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
      unsub();
    };
  }, []);

  // Whenever selected candidate or their stream status changes, request WebRTC offer
  useEffect(() => {
    if (!selectedCandidate || !selectedCandidate.socketId || selectedCandidate.status === "disconnected") {
      setCameraStream(null);
      setScreenStream(null);
      return;
    }

    // Reset streams when switching or updating candidate
    setCameraStream(null);
    setScreenStream(null);

    const socketId = selectedCandidate.socketId;

    // Connect Camera Stream if enabled
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

    // Connect Screen Stream if enabled
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

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="grid grid-cols-12">
        {/* Sidebar */}
        <aside className="col-span-3 min-h-screen bg-white p-5 border-r">
          <div className="mb-5 flex items-center justify-between">
            <h1 className="text-xl font-bold">Candidates</h1>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
              {candidates.length} online
            </span>
          </div>

          {candidates.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500 rounded-lg bg-slate-50 border border-dashed">
              Chưa có thí sinh nào tham gia phòng thi.
              <br />
              <span className="text-xs text-gray-400">Hãy mở tab `/examinee` ở trình duyệt khác.</span>
            </div>
          ) : (
            <CandidateList candidates={candidates} selectedId={selectedId} onSelect={setSelectedId} />
          )}
        </aside>

        {/* Monitor */}
        <section className="col-span-9 p-6">
          <h1 className="mb-5 text-2xl font-bold">Live Monitoring Center</h1>

          <div className="rounded-xl bg-white p-5 shadow">
            <MonitorView
              candidate={selectedCandidate}
              cameraStream={cameraStream}
              screenStream={screenStream}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
