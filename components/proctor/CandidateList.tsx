'use client'

import { Candidate } from '@/types/candidate'

interface Props {
  candidates: Candidate[]
  selectedId?: string
  onSelect: (id: string) => void
}

export default function CandidateList({ candidates, selectedId, onSelect }: Props) {
  if (candidates.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-center">
        <div className="text-sm font-medium text-slate-600">No examinees connected</div>
        <div className="mt-1 text-xs text-slate-400">
          Open <code>/examinee</code> in another browser tab to test.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {candidates.map((candidate) => {
        const selected = selectedId === candidate.id
        const connected = candidate.status !== 'disconnected'

        return (
          <button
            key={candidate.id}
            onClick={() => onSelect(candidate.id)}
            className={`
            group relative w-full rounded-xl border p-2.5 text-left transition-all duration-150
            ${selected ? 'border-blue-500 bg-blue-50 shadow-sm ring-1 ring-blue-500' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'}
            ${!connected ? 'opacity-60' : ''}
          `}
          >
            {/* Selected indicator */}
            {selected && <div className="absolute right-2 top-2 h-2 w-2 rounded-full bg-blue-500" />}

            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div
                className={`
                flex h-8 w-8 shrink-0 items-center justify-center rounded-full
                text-sm font-bold
                ${selected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}
              `}
              >
                {candidate.name?.charAt(0)?.toUpperCase() || '?'}
              </div>

              <div className="min-w-0">
                <div className="truncate pr-3 text-sm font-semibold text-slate-800">{candidate.name}</div>
                <div className="mt-0.5 text-xs text-slate-400">{candidate.studentId || candidate.id}</div>
              </div>
            </div>

            {/* Status */}
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                <span className="text-xs text-slate-500">{connected ? 'Online' : 'Offline'}</span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span title={candidate.cameraEnabled ? 'Camera on' : 'Camera off'} className={candidate.cameraEnabled ? 'text-emerald-600' : 'text-slate-300'}>
                  📷
                </span>
                <span title={candidate.screenSharing ? 'Screen sharing' : 'Screen not shared'} className={candidate.screenSharing ? 'text-blue-600' : 'text-slate-300'}>
                  🖥
                </span>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
