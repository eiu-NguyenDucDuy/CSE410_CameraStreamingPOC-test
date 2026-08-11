export type CandidateStatus = "connected" | "connecting" | "disconnected";

export interface Candidate {
  id: string;
  studentId?: string;
  name: string;
  status: CandidateStatus;
  cameraEnabled: boolean;
  screenSharing: boolean;
  socketId?: string;
  warnings?: string[];
}
