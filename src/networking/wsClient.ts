import type { ClientMessage, ServerMessage } from "../types/protocol";

export type ConnectionStatus = "idle" | "connecting" | "connected" | "reconnecting" | "error";

function wsUrl(): string {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${location.host}/ws`;
}

export class RallySocket {
  private ws: WebSocket | null = null;
  private status: ConnectionStatus = "idle";
  private listeners = new Set<(msg: ServerMessage) => void>();
  private statusListeners = new Set<(s: ConnectionStatus) => void>();
  private queue: string[] = [];
  private retries = 0;
  private closedByUser = false;
  private pingTimer = 0;

  getStatus(): ConnectionStatus {
    return this.status;
  }

  onMessage(fn: (msg: ServerMessage) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  onStatus(fn: (s: ConnectionStatus) => void): () => void {
    this.statusListeners.add(fn);
    fn(this.status);
    return () => this.statusListeners.delete(fn);
  }

  connect() {
    this.closedByUser = false;
    this.open();
  }

  disconnect() {
    this.closedByUser = true;
    window.clearInterval(this.pingTimer);
    this.ws?.close();
    this.ws = null;
    this.setStatus("idle");
  }

  send(msg: ClientMessage) {
    const raw = JSON.stringify(msg);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(raw);
    } else {
      this.queue.push(raw);
    }
  }

  private open() {
    this.setStatus(this.retries > 0 ? "reconnecting" : "connecting");
    const socket = new WebSocket(wsUrl());
    this.ws = socket;

    socket.addEventListener("open", () => {
      this.retries = 0;
      this.setStatus("connected");
      for (const item of this.queue) socket.send(item);
      this.queue = [];
      window.clearInterval(this.pingTimer);
      this.pingTimer = window.setInterval(() => {
        this.send({ type: "ping", ts: Date.now() });
      }, 4000);
    });

    socket.addEventListener("message", (ev) => {
      try {
        const msg = JSON.parse(String(ev.data)) as ServerMessage;
        this.listeners.forEach((fn) => fn(msg));
      } catch {
        /* ignore malformed */
      }
    });

    socket.addEventListener("close", () => {
      window.clearInterval(this.pingTimer);
      if (this.closedByUser) return;
      this.setStatus("reconnecting");
      const wait = Math.min(4000, 400 * 2 ** this.retries);
      this.retries += 1;
      window.setTimeout(() => this.open(), wait);
    });

    socket.addEventListener("error", () => {
      this.setStatus("error");
    });
  }

  private setStatus(s: ConnectionStatus) {
    this.status = s;
    this.statusListeners.forEach((fn) => fn(s));
  }
}
