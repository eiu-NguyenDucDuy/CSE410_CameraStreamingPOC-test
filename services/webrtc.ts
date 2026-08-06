// TODO:
// Waiting for backend signaling contract
export class WebRTCService {
  private peer: RTCPeerConnection | null = null;

  createConnection() {
    this.peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    return this.peer;
  }

  addStream(stream: MediaStream) {
    if (!this.peer) return;

    stream.getTracks().forEach((track) => {
      this.peer?.addTrack(track, stream);
    });
  }

  close() {
    this.peer?.close();
    this.peer = null;
  }
}
