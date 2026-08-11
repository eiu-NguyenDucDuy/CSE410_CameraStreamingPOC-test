export type SignalingMessageHandler = (data: any) => void;

export class SignalingService {
  private socket: WebSocket | null = null;
  private listeners: Set<SignalingMessageHandler> = new Set();
  private isConnecting = false;

  connect(url = "ws://localhost:8080/ws/signaling") {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isConnecting = true;
    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      console.log("[Signaling] Connected to Spring Boot WebSocket Server");
      this.isConnecting = false;
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.listeners.forEach((handler) => handler(data));
      } catch (err) {
        console.error("[Signaling] Error parsing message:", err);
      }
    };

    this.socket.onerror = (err) => {
      console.error("[Signaling] WebSocket Error:", err);
    };

    this.socket.onclose = () => {
      console.log("[Signaling] WebSocket Connection Closed");
      this.socket = null;
      this.isConnecting = false;
    };
  }

  onMessage(handler: SignalingMessageHandler) {
    this.listeners.add(handler);
    return () => {
      this.listeners.delete(handler);
    };
  }

  send(msg: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(msg));
    } else {
      console.warn("[Signaling] Cannot send message, socket not connected", msg);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.listeners.clear();
  }
}

export const signalingService = new SignalingService();
