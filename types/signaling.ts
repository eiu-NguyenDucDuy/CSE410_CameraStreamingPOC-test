export type SignalEvent = "candidate:join" | "candidate:leave" | "stream:offer" | "stream:answer" | "stream:ice";

export interface CandidateConnection {
  candidateId: string;
  role: "proctor" | "examinee";
}
