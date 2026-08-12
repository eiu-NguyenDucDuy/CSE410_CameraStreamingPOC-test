'use client'

import VideoPlayer from '@/components/common/VideoPlayer'
import { Candidate } from '@/types/candidate'

export type MonitorLayout = 'focus' | 'grid' | 'main-list'

interface StreamMap {
  [candidateId: string]: MediaStream | null | undefined
}

interface Props {
  candidates: Candidate[]
  selectedId: string
  onSelect: (id: string) => void
  cameraStreams: StreamMap
  screenStreams: StreamMap
  layout: MonitorLayout
}

function StatusBadge({ active, children }: { active: boolean; children: React.ReactNode }) {
  return <span className={`rounded-md px-2 py-1 text-[11px] font-medium ${active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/10 text-slate-400'}`}>{children}</span>
}

function VideoEmpty({ message }: { message: string }) {
  return <div className="flex h-full w-full items-center justify-center bg-slate-950 text-center text-xs text-slate-500">{message}</div>
}

function CandidateVideo({
  candidate,
  screenStream,
  cameraStream,
  large = false,
  onClick,
}: {
  candidate: Candidate
  screenStream?: MediaStream | null
  cameraStream?: MediaStream | null
  large?: boolean
  onClick?: () => void
}) {
  const isDisconnected = candidate.status === 'disconnected'

  return (
    <div
      onClick={onClick}
      className={`
        group relative w-full overflow-hidden rounded-xl border bg-slate-950
        ${onClick ? 'cursor-pointer hover:border-blue-500' : ''}
        ${large ? 'border-slate-700' : 'border-slate-800'}
      `}
    >
      {/* Screen */}
      <div className="relative aspect-video w-full bg-black">
        {isDisconnected ? (
          <VideoEmpty message="Candidate disconnected" />
        ) : screenStream ? (
          <VideoPlayer stream={screenStream} objectFit="contain" />
        ) : (
          <VideoEmpty message={candidate.screenSharing ? 'Connecting screen...' : 'Screen not shared'} />
        )}
      </div>

      {/* Camera overlay */}
      <div
        className={`
          absolute right-3 top-3 overflow-hidden rounded-lg
          border border-white/20 bg-black shadow-xl
          ${large ? 'h-24 w-36 md:h-28 md:w-44' : 'h-14 w-20'}
        `}
      >
        {cameraStream ? (
          <VideoPlayer stream={cameraStream} objectFit="cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] text-slate-500">{candidate.cameraEnabled ? 'Connecting...' : 'Camera off'}</div>
        )}
      </div>

      {/* Candidate information */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-3 pb-3 pt-10">
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white">{candidate.name}</div>
            <div className="text-[10px] text-slate-400">{candidate.studentId || candidate.id}</div>
          </div>

          <div className="flex gap-1">
            <StatusBadge active={candidate.cameraEnabled}>📷</StatusBadge>
            <StatusBadge active={candidate.screenSharing}>🖥</StatusBadge>
          </div>
        </div>
      </div>

      {/* Selected indicator */}
      {onClick && <div className="pointer-events-none absolute inset-0 rounded-xl ring-0 transition-all group-hover:ring-2 group-hover:ring-blue-500/60" />}
    </div>
  )
}

export default function MonitorView({ candidates, selectedId, onSelect, cameraStreams, screenStreams, layout }: Props) {
  if (candidates.length === 0) {
    return (
      <div className="flex min-h-[500px] items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950">
        <div className="text-center">
          <div className="text-4xl">🖥</div>
          <div className="mt-3 text-sm font-medium text-slate-300">Waiting for examinees</div>
          <div className="mt-1 text-xs text-slate-500">Connected examinees will appear here.</div>
        </div>
      </div>
    )
  }

  const selected = candidates.find((candidate) => candidate.id === selectedId) || candidates[0]

  if (!selected) return null

  const others = candidates.filter((candidate) => candidate.id !== selected.id)

  /* -----------------------------------------------------------
     FOCUS
     Main candidate + small thumbnails below
  ----------------------------------------------------------- */

  if (layout === 'focus') {
    return (
      <div className="space-y-3">
        <CandidateVideo candidate={selected} screenStream={screenStreams[selected.id]} cameraStream={cameraStreams[selected.id]} large />

        {others.length > 0 && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
            {others.map((candidate) => (
              <CandidateVideo key={candidate.id} candidate={candidate} screenStream={screenStreams[candidate.id]} cameraStream={cameraStreams[candidate.id]} onClick={() => onSelect(candidate.id)} />
            ))}
          </div>
        )}
      </div>
    )
  }

  /* -----------------------------------------------------------
     GRID
     All candidates equal size
  ----------------------------------------------------------- */

  if (layout === 'grid') {
    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {candidates.map((candidate) => (
          <CandidateVideo key={candidate.id} candidate={candidate} screenStream={screenStreams[candidate.id]} cameraStream={cameraStreams[candidate.id]} onClick={() => onSelect(candidate.id)} />
        ))}
      </div>
    )
  }

  /* -----------------------------------------------------------
     MAIN + LIST
     Main candidate on left, other candidates on right
  ----------------------------------------------------------- */

  return (
    <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
      {/* Main candidate */}
      <div className="min-w-0">
        <CandidateVideo candidate={selected} screenStream={screenStreams[selected.id]} cameraStream={cameraStreams[selected.id]} large />
      </div>

      {/* Other candidates */}
      <div className="min-w-0 space-y-3">
        {others.length === 0 ? (
          <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed border-slate-700 text-xs text-slate-500">No other candidates</div>
        ) : (
          others.map((candidate) => (
            <CandidateVideo key={candidate.id} candidate={candidate} screenStream={screenStreams[candidate.id]} cameraStream={cameraStreams[candidate.id]} onClick={() => onSelect(candidate.id)} />
          ))
        )}
      </div>
    </div>
  )
}
