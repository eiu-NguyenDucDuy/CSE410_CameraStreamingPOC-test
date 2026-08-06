import { Candidate } from "@/types/candidate";

export const mockCandidates: Candidate[] = [
  { id: "1", name: "Alice", status: "connected", cameraEnabled: true, screenSharing: true },
  { id: "2", name: "Bob", status: "connecting", cameraEnabled: true, screenSharing: false },
  { id: "3", name: "Charlie", status: "disconnected", cameraEnabled: false, screenSharing: false },
];
