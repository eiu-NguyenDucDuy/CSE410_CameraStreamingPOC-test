const defaultIceServers: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export class WebRTCService {
  private peers: Map<string, RTCPeerConnection> = new Map();

  createPeer(
    key: string,
    onIceCandidate?: (candidate: RTCIceCandidate) => void,
    onTrack?: (stream: MediaStream) => void
  ): RTCPeerConnection {
    this.closePeer(key);

    const peer = new RTCPeerConnection({ iceServers: defaultIceServers });

    peer.onicecandidate = (event) => {
      if (event.candidate && onIceCandidate) {
        onIceCandidate(event.candidate);
      }
    };

    peer.ontrack = (event) => {
      const remoteStream = event.streams && event.streams[0] ? event.streams[0] : new MediaStream([event.track]);
      if (onTrack) {
        onTrack(remoteStream);
      }
    };

    this.peers.set(key, peer);
    return peer;
  }

  getPeer(key: string): RTCPeerConnection | undefined {
    return this.peers.get(key);
  }

  addStreamToPeer(key: string, stream: MediaStream) {
    const peer = this.peers.get(key);
    if (!peer) return;

    stream.getTracks().forEach((track) => {
      peer.addTrack(track, stream);
    });
  }

  closePeer(key: string) {
    const peer = this.peers.get(key);
    if (peer) {
      peer.close();
      this.peers.delete(key);
    }
  }

  closeAll() {
    this.peers.forEach((peer) => peer.close());
    this.peers.clear();
  }
}
