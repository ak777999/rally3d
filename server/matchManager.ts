import type { WebSocket } from "ws";
import type {
  ClientMessage,
  MatchStatus,
  PlayerSlot,
  Role,
  ServerMessage,
} from "../src/types/protocol.ts";
import { createMatchId, createToken } from "../src/utils/ids.ts";

interface Seat {
  desktop: WebSocket | null;
  controller: WebSocket | null;
  token: string;
  calibrated: boolean;
  ready: boolean;
}

export interface Match {
  id: string;
  createdAt: number;
  status: MatchStatus;
  seats: Record<PlayerSlot, Seat>;
}

const MATCH_TTL_MS = 1000 * 60 * 60;
const GRACE_MS = 12_000;

export class MatchManager {
  private matches = new Map<string, Match>();
  private sockets = new Map<
    WebSocket,
    { matchId: string; role: Role; slot: PlayerSlot }
  >();
  private graceTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor() {
    setInterval(() => this.gc(), 30_000);
  }

  createMatch(): Match {
    let id = createMatchId();
    while (this.matches.has(id)) id = createMatchId();
    const match: Match = {
      id,
      createdAt: Date.now(),
      status: "lobby",
      seats: {
        1: {
          desktop: null,
          controller: null,
          token: createToken(),
          calibrated: false,
          ready: false,
        },
        2: {
          desktop: null,
          controller: null,
          token: createToken(),
          calibrated: false,
          ready: false,
        },
      },
    };
    this.matches.set(id, match);
    return match;
  }

  get(id: string): Match | undefined {
    return this.matches.get(id.toUpperCase());
  }

  handle(ws: WebSocket, raw: string) {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw) as ClientMessage;
    } catch {
      this.send(ws, { type: "error", message: "Invalid JSON", code: "bad_json" });
      return;
    }

    switch (msg.type) {
      case "create_match": {
        const match = this.createMatch();
        this.bind(ws, match, "desktop", 1);
        this.sendWelcome(ws, match, "desktop", 1);
        this.broadcastState(match);
        break;
      }
      case "join_match": {
        const match = this.get(msg.matchId);
        if (!match) {
          this.send(ws, { type: "error", message: "Match not found", code: "not_found" });
          return;
        }
        const slot: PlayerSlot = match.seats[1].desktop ? 2 : 1;
        if (match.seats[slot].desktop) {
          this.send(ws, { type: "error", message: "Match is full", code: "full" });
          return;
        }
        this.bind(ws, match, "desktop", slot);
        this.sendWelcome(ws, match, "desktop", slot);
        this.broadcastState(match);
        break;
      }
      case "hello": {
        this.handleHello(ws, msg);
        break;
      }
      case "motion": {
        const ctx = this.sockets.get(ws);
        if (!ctx || ctx.role !== "controller") return;
        const match = this.get(ctx.matchId);
        if (!match) return;
        const payload: ServerMessage = {
          type: "motion",
          slot: ctx.slot,
          seq: msg.seq,
          ts: msg.ts,
          q: msg.q,
          a: msg.a,
          g: msg.g,
          swing: msg.swing,
        };
        const desktop = match.seats[ctx.slot].desktop;
        if (desktop && desktop.readyState === 1) desktop.send(JSON.stringify(payload));
        break;
      }
      case "calibrated": {
        const ctx = this.sockets.get(ws);
        if (!ctx) return;
        const match = this.get(ctx.matchId);
        if (!match) return;
        match.seats[ctx.slot].calibrated = true;
        this.broadcastState(match);
        break;
      }
      case "ready": {
        const ctx = this.sockets.get(ws);
        if (!ctx) return;
        const match = this.get(ctx.matchId);
        if (!match) return;
        match.seats[ctx.slot].ready = true;
        this.broadcastState(match);
        break;
      }
      case "ping": {
        this.send(ws, { type: "pong", ts: msg.ts, serverTs: Date.now() });
        break;
      }
      default:
        break;
    }
  }

  private handleHello(
    ws: WebSocket,
    msg: Extract<ClientMessage, { type: "hello" }>,
  ) {
    if (!msg.matchId) {
      this.send(ws, { type: "error", message: "Missing matchId", code: "bad_hello" });
      return;
    }
    const match = this.get(msg.matchId);
    if (!match) {
      this.send(ws, { type: "error", message: "Match not found", code: "not_found" });
      return;
    }

    if (msg.role === "controller") {
      const slot = this.resolveControllerSlot(match, msg.token, msg.slot);
      if (!slot) {
        this.send(ws, {
          type: "error",
          message: "Controller slot unavailable",
          code: "slot_taken",
        });
        return;
      }
      const existing = match.seats[slot].controller;
      if (existing && existing !== ws) {
        try {
          existing.close();
        } catch {
          /* ignore */
        }
      }
      this.bind(ws, match, "controller", slot);
      this.sendWelcome(ws, match, "controller", slot);
      this.broadcast(match, {
        type: "peer_event",
        event: "phone_connected",
        slot,
      });
      this.broadcastState(match);
      return;
    }

    const slot: PlayerSlot =
      msg.slot && !match.seats[msg.slot].desktop ? msg.slot : match.seats[1].desktop ? 2 : 1;
    if (match.seats[slot].desktop && match.seats[slot].desktop !== ws) {
      this.send(ws, { type: "error", message: "Desktop slot taken", code: "slot_taken" });
      return;
    }
    this.bind(ws, match, "desktop", slot);
    this.sendWelcome(ws, match, "desktop", slot);
    this.broadcast(match, {
      type: "peer_event",
      event: "desktop_connected",
      slot,
    });
    this.broadcastState(match);
  }

  private resolveControllerSlot(
    match: Match,
    token?: string,
    requested?: PlayerSlot,
  ): PlayerSlot | null {
    if (token) {
      if (match.seats[1].token === token) return 1;
      if (match.seats[2].token === token) return 2;
    }
    if (requested && !match.seats[requested].controller) return requested;
    if (!match.seats[1].controller) return 1;
    if (!match.seats[2].controller) return 2;
    return null;
  }

  disconnect(ws: WebSocket) {
    const ctx = this.sockets.get(ws);
    if (!ctx) return;
    this.sockets.delete(ws);
    const match = this.get(ctx.matchId);
    if (!match) return;
    const seat = match.seats[ctx.slot];
    if (ctx.role === "desktop" && seat.desktop === ws) seat.desktop = null;
    if (ctx.role === "controller" && seat.controller === ws) {
      seat.controller = null;
      seat.ready = false;
    }
    this.broadcast(match, {
      type: "peer_event",
      event: ctx.role === "controller" ? "phone_disconnected" : "desktop_disconnected",
      slot: ctx.slot,
    });
    this.broadcastState(match);

    const key = `${match.id}:${ctx.slot}:${ctx.role}`;
    const existing = this.graceTimers.get(key);
    if (existing) clearTimeout(existing);
    this.graceTimers.set(
      key,
      setTimeout(() => {
        this.graceTimers.delete(key);
      }, GRACE_MS),
    );
  }

  private bind(ws: WebSocket, match: Match, role: Role, slot: PlayerSlot) {
    const prev = this.sockets.get(ws);
    if (prev) this.disconnect(ws);
    this.sockets.set(ws, { matchId: match.id, role, slot });
    if (role === "desktop") match.seats[slot].desktop = ws;
    else match.seats[slot].controller = ws;
  }

  private sendWelcome(ws: WebSocket, match: Match, role: Role, slot: PlayerSlot) {
    this.send(ws, {
      type: "welcome",
      matchId: match.id,
      slot,
      token: match.seats[slot].token,
      role,
      controllerPath: `/controller/${match.id}/${match.seats[slot].token}`,
    });
  }

  private broadcastState(match: Match) {
    const payload: ServerMessage = {
      type: "match_state",
      matchId: match.id,
      status: match.status,
      players: ([1, 2] as PlayerSlot[]).map((slot) => ({
        slot,
        desktop: !!match.seats[slot].desktop && match.seats[slot].desktop!.readyState === 1,
        phone: !!match.seats[slot].controller && match.seats[slot].controller!.readyState === 1,
        calibrated: match.seats[slot].calibrated,
        ready: match.seats[slot].ready,
      })),
    };
    this.broadcast(match, payload);
  }

  private broadcast(match: Match, msg: ServerMessage) {
    const sockets = [
      match.seats[1].desktop,
      match.seats[1].controller,
      match.seats[2].desktop,
      match.seats[2].controller,
    ];
    const data = JSON.stringify(msg);
    for (const s of sockets) {
      if (s && s.readyState === 1) s.send(data);
    }
  }

  private send(ws: WebSocket, msg: ServerMessage) {
    if (ws.readyState === 1) ws.send(JSON.stringify(msg));
  }

  private gc() {
    const now = Date.now();
    for (const [id, match] of this.matches) {
      const alive = [1, 2].some(
        (s) =>
          match.seats[s as PlayerSlot].desktop ||
          match.seats[s as PlayerSlot].controller,
      );
      if (!alive && now - match.createdAt > MATCH_TTL_MS) this.matches.delete(id);
    }
  }
}
