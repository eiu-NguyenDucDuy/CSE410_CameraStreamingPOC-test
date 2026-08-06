export type StreamType = "camera" | "screen";

export interface RemoteStream {
  candidateId: string;
  type: StreamType;
  stream: MediaStream;
}
