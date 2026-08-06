export type CandidateStatus = "connected" | "connecting" | "disconnected";

export interface Candidate {
  id: string;
  name: string;
  status: CandidateStatus;
  cameraEnabled: boolean;
  screenSharing: boolean;
}
