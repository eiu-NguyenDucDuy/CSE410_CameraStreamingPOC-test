export type SignalingMessageHandler = (data: any) => void;
export type ConnectionStatusHandler = (connected: boolean) => void;

const DEFAULT_WS_URL = process.env.NEXT_PUBLIC_SIGNALING_WS_URL || "ws://localhost:8081/ws/signaling";

export class SignalingService {
  private socket: WebSocket | null = null;
  private listeners: Set<SignalingMessageHandler> = new Set();
  private statusListeners: Set<ConnectionStatusHandler> = new Set();
  private isConnecting = false;
  private currentUrl = DEFAULT_WS_URL;
  private reconnectTimer: NodeJS.Timeout | null = null;

  connect(url = DEFAULT_WS_URL) {
    this.currentUrl = url;

    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isConnecting = true;
    try {
      this.socket = new WebSocket(url);
    } catch (e) {
      console.error("[Signaling] WebSocket instantiation error:", e);
      this.isConnecting = false;
      this.notifyStatus(false);
      this.scheduleReconnect();
      return;
    }

    this.socket.onopen = () => {
      console.log(`[Signaling] Connected to INCIT WebSocket Server at ${url}`);
      this.isConnecting = false;
      this.notifyStatus(true);
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
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
      console.error(`[Signaling] WebSocket Error connecting to ${url}:`, err);
      this.notifyStatus(false);
    };

    this.socket.onclose = () => {
      console.log("[Signaling] WebSocket Connection Closed");
      this.socket = null;
      this.isConnecting = false;
      this.notifyStatus(false);
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect() {
    if (!this.reconnectTimer) {
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        console.log("[Signaling] Attempting to reconnect to", this.currentUrl);
        this.connect(this.currentUrl);
      }, 3000);
    }
  }

  private notifyStatus(connected: boolean) {
    this.statusListeners.forEach((handler) => handler(connected));
  }

  onStatusChange(handler: ConnectionStatusHandler) {
    this.statusListeners.add(handler);
    // immediately notify current status
    handler(this.isConnected());
    return () => {
      this.statusListeners.delete(handler);
    };
  }

  onMessage(handler: SignalingMessageHandler) {
    this.listeners.add(handler);
    return () => {
      this.listeners.delete(handler);
    };
  }

  isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  send(msg: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(msg));
    } else {
      console.warn("[Signaling] Cannot send message, socket not connected", msg);
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.listeners.clear();
    this.statusListeners.clear();
  }
}

export const signalingService = new SignalingService();
