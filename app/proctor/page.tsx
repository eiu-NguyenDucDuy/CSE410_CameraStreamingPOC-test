'use client'

import MonitorView, { MonitorLayout } from '@/components/proctor/MonitorView'
import CandidateList from '@/components/proctor/CandidateList'
import { signalingService } from '@/services/signaling'
import { useEffect, useRef, useState } from 'react'
import { WebRTCService } from '@/services/webrtc'
import { Candidate } from '@/types/candidate'

interface ExamineePayload {
  id?: string
  studentId?: string
  name?: string
  status?: Candidate['status']
  cameraEnabled?: boolean
  screenSharing?: boolean
  socketId?: string
  warnings?: string[]
}

const webrtcService = new WebRTCService()

type StreamMap = Record<string, MediaStream | null>

export default function ProctorPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [layout, setLayout] = useState<MonitorLayout>('main-list')

  const [cameraStreams, setCameraStreams] = useState<StreamMap>({})
  const [screenStreams, setScreenStreams] = useState<StreamMap>({})
  const [showCandidates, setShowCandidates] = useState(true)

  const candidatesRef = useRef<Candidate[]>([])

  useEffect(() => {
    candidatesRef.current = candidates
  }, [candidates])

  /* ============================================================
     SIGNALLING
  ============================================================ */

  useEffect(() => {
    signalingService.connect()

    const joinProctor = () => {
      signalingService.send({
        type: 'join-proctor',
      })
    }

    const timer = setTimeout(joinProctor, 500)

    const unsub = signalingService.onMessage(async (msg) => {
      /* --------------------------------------------------------
         Initial candidate list
      -------------------------------------------------------- */

      if (msg.type === 'examinees-list') {
        const payload = Array.isArray(msg.payload) ? (msg.payload as ExamineePayload[]) : []

        const list: Candidate[] = payload.map((e) => ({
          id: e.studentId || e.id || '',
          studentId: e.studentId,
          name: e.name || 'Unknown candidate',
          status: e.status || 'connected',
          cameraEnabled: !!e.cameraEnabled,
          screenSharing: !!e.screenSharing,
          socketId: e.socketId,
          warnings: e.warnings || [],
        }))

        setCandidates(list)

        if (list.length > 0) {
          setSelectedId((current) => (current && list.some((c) => c.id === current) ? current : list[0].id))
        }

        return
      }

      /* --------------------------------------------------------
         Candidate joined / updated
      -------------------------------------------------------- */

      if (msg.type === 'examinee-joined' || msg.type === 'examinee-updated') {
        const e = msg.payload

        if (!e) return

        const candidate: Candidate = {
          id: e.studentId || e.id,
          studentId: e.studentId,
          name: e.name,
          status: e.status || 'connected',
          cameraEnabled: !!e.cameraEnabled,
          screenSharing: !!e.screenSharing,
          socketId: e.socketId,
          warnings: e.warnings || [],
        }

        setCandidates((prev) => {
          const index = prev.findIndex((item) => item.id === candidate.id)

          if (index >= 0) {
            const next = [...prev]
            next[index] = candidate
            return next
          }

          return [...prev, candidate]
        })

        setSelectedId((current) => current || candidate.id)

        return
      }

      /* --------------------------------------------------------
         Candidate left
      -------------------------------------------------------- */

      if (msg.type === 'examinee-left') {
        const studentId = msg.payload?.studentId
        if (!studentId) return
        setCandidates((prev) => prev.map((candidate) => (candidate.id === studentId || candidate.studentId === studentId ? { ...candidate, status: 'disconnected' } : candidate)))
        return
      }

      /* --------------------------------------------------------
         WebRTC Answer
      -------------------------------------------------------- */

      if (msg.type === 'signal-answer') {
        const { senderSocketId, streamType, answer } = msg

        if (!senderSocketId || !answer) return

        const peerKey = `${senderSocketId}-${streamType}`
        const peer = webrtcService.getPeer(peerKey)

        if (!peer) return

        try {
          await peer.setRemoteDescription(new RTCSessionDescription(answer))

          await webrtcService.processIceQueue(peerKey)
        } catch (err) {
          console.error('[Proctor] Error setting remote answer:', err)
        }

        return
      }

      /* --------------------------------------------------------
         WebRTC ICE
      -------------------------------------------------------- */

      if (msg.type === 'signal-ice') {
        const { senderSocketId, streamType, candidate } = msg
        if (!senderSocketId || !candidate) return
        const peerKey = `${senderSocketId}-${streamType}`
        await webrtcService.addIceCandidate(peerKey, candidate)
      }
    })

    return () => {
      clearTimeout(timer)
      unsub()
    }
  }, [])

  /* ============================================================
     CREATE WEBRTC CONNECTIONS FOR ALL CANDIDATES
  ============================================================ */

  useEffect(() => {
    const activeCandidates = candidates.filter((candidate) => candidate.socketId && candidate.status !== 'disconnected')
    const activeKeys = new Set<string>()

    activeCandidates.forEach((candidate) => {
      if (!candidate.socketId) return

      const socketId = candidate.socketId

      /* --------------------------------------------------------
         CAMERA
      -------------------------------------------------------- */

      if (candidate.cameraEnabled) {
        const peerKey = `${socketId}-camera`

        activeKeys.add(peerKey)

        const existingPeer = webrtcService.getPeer(peerKey)

        if (!existingPeer) {
          const peer = webrtcService.createPeer(
            peerKey,
            (iceCandidate) => {
              signalingService.send({ type: 'signal-ice', targetSocketId: socketId, streamType: 'camera', candidate: iceCandidate })
            },
            (remoteStream) => {
              console.log('[Proctor] Camera received:', candidate.id)
              setCameraStreams((prev) => ({ ...prev, [candidate.id]: remoteStream }))
            },
          )

          peer.addTransceiver('video', {
            direction: 'recvonly',
          })

          peer
            .createOffer()
            .then(async (offer) => {
              await peer.setLocalDescription(offer)
              return offer
            })
            .then((offer) => {
              signalingService.send({ type: 'signal-offer', targetSocketId: socketId, streamType: 'camera', offer })
            })
            .catch((err) => {
              console.error('[Proctor] Camera offer error:', err)
            })
        }
      } else {
        webrtcService.closePeer(`${socketId}-camera`)

        setCameraStreams((prev) => {
          const next = { ...prev }
          delete next[candidate.id]
          return next
        })
      }

      /* --------------------------------------------------------
         SCREEN
      -------------------------------------------------------- */

      if (candidate.screenSharing) {
        const peerKey = `${socketId}-screen`

        activeKeys.add(peerKey)

        const existingPeer = webrtcService.getPeer(peerKey)

        if (!existingPeer) {
          const peer = webrtcService.createPeer(
            peerKey,
            (iceCandidate) => {
              signalingService.send({
                type: 'signal-ice',
                targetSocketId: socketId,
                streamType: 'screen',
                candidate: iceCandidate,
              })
            },
            (remoteStream) => {
              console.log('[Proctor] Screen received:', candidate.id)
              setScreenStreams((prev) => ({ ...prev, [candidate.id]: remoteStream }))
            },
          )

          peer.addTransceiver('video', {
            direction: 'recvonly',
          })

          peer
            .createOffer()
            .then(async (offer) => {
              await peer.setLocalDescription(offer)
              return offer
            })
            .then((offer) => {
              signalingService.send({
                type: 'signal-offer',
                targetSocketId: socketId,
                streamType: 'screen',
                offer,
              })
            })
            .catch((err) => {
              console.error('[Proctor] Screen offer error:', err)
            })
        }
      } else {
        webrtcService.closePeer(`${socketId}-screen`)

        setScreenStreams((prev) => {
          const next = { ...prev }
          delete next[candidate.id]
          return next
        })
      }
    })

    /* ----------------------------------------------------------
       Close peers for candidates that are no longer active
    ---------------------------------------------------------- */

    candidates.forEach((candidate) => {
      if (!candidate.socketId) return

      const cameraKey = `${candidate.socketId}-camera`
      const screenKey = `${candidate.socketId}-screen`

      if (!activeKeys.has(cameraKey)) {
        webrtcService.closePeer(cameraKey)
      }

      if (!activeKeys.has(screenKey)) {
        webrtcService.closePeer(screenKey)
      }
    })
  }, [candidates])

  /* ============================================================
     CLEANUP
  ============================================================ */

  useEffect(() => {
    return () => {
      webrtcService.closeAll()
    }
  }, [])

  /* ============================================================
     COUNTERS
  ============================================================ */

  const onlineCount = candidates.filter((candidate) => candidate.status !== 'disconnected').length
  const sharingCount = candidates.filter((candidate) => candidate.status !== 'disconnected' && candidate.screenSharing).length
  const cameraCount = candidates.filter((candidate) => candidate.status !== 'disconnected' && candidate.cameraEnabled).length

  /* ============================================================
     UI
  ============================================================ */

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-slate-100 text-slate-900">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCandidates((prev) => !prev)}
            className={`
              flex h-9 w-9 items-center justify-center rounded-lg border transition
              ${showCandidates ? 'border-blue-200 bg-blue-50 text-blue-600' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}
            `}
            title="Toggle candidates"
            aria-label="Toggle candidates"
          >
            ☰
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight">Live Exam Monitor</h1>

              <span className="flex items-center gap-1.5 rounded-full bg-red-50 px-2 py-1 text-[10px] font-bold text-red-600">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                LIVE
              </span>
            </div>

            <p className="text-[11px] text-slate-400">Real-time proctoring dashboard</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden text-right md:block">
            <div className="text-[10px] text-slate-400">Examinees</div>
            <div className="text-sm font-semibold">{onlineCount}</div>
          </div>

          <div className="hidden text-right md:block">
            <div className="text-[10px] text-slate-400">Screens</div>
            <div className="text-sm font-semibold text-blue-600">{sharingCount}</div>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-medium text-emerald-700">Connected</span>
          </div>
        </div>
      </header>

      {/* Main area */}
      <div className="flex min-h-0 flex-1">
        {/* Candidate sidebar */}
        {showCandidates && (
          <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-100 px-4">
              <div>
                <h2 className="text-sm font-semibold">Candidates</h2>
                <p className="text-[10px] text-slate-400">{onlineCount} online</p>
              </div>

              <button onClick={() => setShowCandidates(false)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="Hide candidates">
                ←
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <CandidateList candidates={candidates} selectedId={selectedId} onSelect={setSelectedId} />
            </div>
          </aside>
        )}

        {/* Monitor */}
        <section className="flex min-w-0 min-h-0 flex-1 flex-col bg-slate-900">
          {/* Monitor header */}
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-950 px-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-sm font-medium text-white">Monitoring</span>

              {selectedId && <span className="truncate text-xs text-slate-500">{candidates.find((candidate) => candidate.id === selectedId)?.name}</span>}
            </div>

            {!showCandidates && (
              <button onClick={() => setShowCandidates(true)} className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white">
                ☰ Candidates
              </button>
            )}
          </div>

          {/* Monitor content */}
          <div className="min-h-0 flex-1 overflow-auto p-3">
            <MonitorView candidates={candidates} selectedId={selectedId} onSelect={setSelectedId} cameraStreams={cameraStreams} screenStreams={screenStreams} layout={layout} />
          </div>

          {/* Layout toolbar */}
          <div className="flex h-12 shrink-0 items-center justify-center border-t border-slate-800 bg-slate-950">
            <div className="flex items-center gap-1 rounded-lg bg-slate-900 p-1">
              <button
                onClick={() => setLayout('focus')}
                className={`
                rounded-md px-4 py-1.5 text-xs font-medium transition
                ${layout === 'focus' ? 'bg-white text-slate-900' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
              `}
              >
                ▣ Focus
              </button>

              <button
                onClick={() => setLayout('grid')}
                className={`
                rounded-md px-4 py-1.5 text-xs font-medium transition
                ${layout === 'grid' ? 'bg-white text-slate-900' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
              `}
              >
                ▦ Grid
              </button>

              <button
                onClick={() => setLayout('main-list')}
                className={`
                rounded-md px-4 py-1.5 text-xs font-medium transition
                ${layout === 'main-list' ? 'bg-white text-slate-900' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
              `}
              >
                ▤ Main + List
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
