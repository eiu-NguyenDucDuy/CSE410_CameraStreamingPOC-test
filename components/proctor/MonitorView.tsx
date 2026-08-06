import VideoPlayer from "@/components/common/VideoPlayer";
import { Candidate } from "@/types/candidate";

interface Props {
  candidate?: Candidate;
  cameraStream?: MediaStream | null;
  screenStream?: MediaStream | null;
}

export default function MonitorView({ candidate, cameraStream, screenStream }: Props) {
  if (!candidate) {
    return <div className="aspect-video flex items-center justify-center bg-gray-300">Select candidate</div>;
  }

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold">{candidate.name}</h2>

      <div className="relative">
        {/* Remote screen */}
        <div className="aspect-video rounded-xl overflow-hidden bg-black">
          {screenStream ? <VideoPlayer stream={screenStream} /> : <div className="flex h-full items-center justify-center text-white">Waiting for screen</div>}
        </div>

        {/* Remote camera */}
        <div className="absolute right-4 top-4 h-40 w-56 overflow-hidden rounded-lg bg-black">
          {cameraStream ? <VideoPlayer stream={cameraStream} /> : <div className="flex h-full items-center justify-center text-white text-sm">Waiting camera</div>}
        </div>
      </div>
    </div>
  );
}
