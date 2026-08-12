const defaultIceServers: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export class WebRTCService {
  private peers: Map<string, RTCPeerConnection> = new Map();
  private iceQueues: Map<string, RTCIceCandidateInit[]> = new Map();

  createPeer(
    key: string,
    onIceCandidate?: (candidate: RTCIceCandidate) => void,
    onTrack?: (stream: MediaStream) => void
  ): RTCPeerConnection {
    this.closePeer(key);

    const peer = new RTCPeerConnection({ iceServers: defaultIceServers });
    this.iceQueues.set(key, []);

    peer.onicecandidate = (event) => {
      if (event.candidate && onIceCandidate) {
        onIceCandidate(event.candidate);
      }
    };

    peer.onconnectionstatechange = () => {
      console.log(`[WebRTC] Peer ${key} connectionState:`, peer.connectionState);
    };

    peer.oniceconnectionstatechange = () => {
      console.log(`[WebRTC] Peer ${key} iceConnectionState:`, peer.iceConnectionState);
    };

    peer.ontrack = (event) => {
      console.log(`[WebRTC] Remote track received for ${key}:`, event.track.kind);
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

  async addIceCandidate(key: string, candidate: RTCIceCandidateInit) {
    const peer = this.peers.get(key);
    if (!peer) return;

    if (peer.remoteDescription && peer.remoteDescription.type) {
      try {
        await peer.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error(`[WebRTC] Error adding ICE candidate for ${key}:`, err);
      }
    } else {
      const queue = this.iceQueues.get(key) || [];
      queue.push(candidate);
      this.iceQueues.set(key, queue);
    }
  }

  async processIceQueue(key: string) {
    const peer = this.peers.get(key);
    const queue = this.iceQueues.get(key) || [];
    if (!peer || !peer.remoteDescription) return;

    while (queue.length > 0) {
      const candidate = queue.shift();
      if (candidate) {
        try {
          await peer.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error(`[WebRTC] Error processing queued ICE candidate for ${key}:`, err);
        }
      }
    }
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
    this.iceQueues.delete(key);
  }

  closeAll() {
    this.peers.forEach((peer) => peer.close());
    this.peers.clear();
    this.iceQueues.clear();
  }
}
