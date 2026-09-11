export type Role = "desktop" | "controller";
export type PlayerSlot = 1 | 2;
export type Sensitivity = "low" | "medium" | "high";

export type MatchStatus =
  | "lobby"
  | "calibrating"
  | "ready"
  | "playing"
  | "paused"
  | "ended";

export interface QuaternionTuple {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface Vec3Tuple {
  x: number;
  y: number;
  z: number;
}

/** Compact controller motion packet. */
export interface MotionPacket {
  type: "motion";
  seq: number;
  ts: number;
  q: [number, number, number, number];
  a: [number, number, number];
  g: [number, number, number];
  swing: number;
}

export type ClientMessage =
  | {
      type: "hello";
      role: Role;
      matchId?: string;
      token?: string;
      slot?: PlayerSlot;
    }
  | { type: "create_match" }
  | { type: "join_match"; matchId: string }
  | MotionPacket
  | { type: "calibrated"; slot?: PlayerSlot }
  | { type: "ready"; slot?: PlayerSlot }
  | { type: "ping"; ts: number };

export type ServerMessage =
  | {
      type: "welcome";
      matchId: string;
      slot: PlayerSlot;
      token: string;
      role: Role;
      controllerPath: string;
    }
  | {
      type: "match_state";
      matchId: string;
      status: MatchStatus;
      players: {
        slot: PlayerSlot;
        desktop: boolean;
        phone: boolean;
        calibrated: boolean;
        ready: boolean;
      }[];
    }
  | {
      type: "motion";
      slot: PlayerSlot;
      seq: number;
      ts: number;
      q: [number, number, number, number];
      a: [number, number, number];
      g: [number, number, number];
      swing: number;
    }
  | { type: "peer_event"; event: "phone_disconnected" | "phone_connected" | "desktop_disconnected" | "desktop_connected"; slot: PlayerSlot }
  | { type: "pong"; ts: number; serverTs: number }
  | { type: "error"; message: string; code?: string };
