import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { GameCanvas } from "../components/game/GameCanvas";
import { StatusDot } from "../components/ui/StatusDot";
import { RallySocket } from "../networking/wsClient";
import { GameScene } from "../scene/GameScene";
import type {
  PlayerSlot,
  ServerMessage,
} from "../types/protocol";

function statusFromBool(on: boolean): "ok" | "bad" {
  return on ? "ok" : "bad";
}

export function DesktopGamePage({
  mode,
  joinCode,
  onLeave,
}: {
  mode: "create" | "join";
  joinCode?: string;
  onLeave: () => void;
}) {
  const sceneRef = useRef<GameScene | null>(null);
  const socketRef = useRef(new RallySocket());
  const [net, setNet] = useState(socketRef.current.getStatus());
  const [matchId, setMatchId] = useState(joinCode?.toUpperCase() ?? "");
  const [slot, setSlot] = useState<PlayerSlot>(1);
  const [token, setToken] = useState("");
  const [controllerPath, setControllerPath] = useState("");
  const [qr, setQr] = useState("");
  const [phoneOn, setPhoneOn] = useState(false);
  const [calibrated, setCalibrated] = useState(false);
  const [ready, setReady] = useState(false);
  const [seq, setSeq] = useState(0);
  const [swing, setSwing] = useState(0);
  const [quatLabel, setQuatLabel] = useState("0 0 0 1");
  const [rtt, setRtt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const slotRef = useRef<PlayerSlot>(1);

  const controllerUrl = useMemo(() => {
    if (!controllerPath) return "";
    return `${location.origin}${controllerPath}`;
  }, [controllerPath]);

  useEffect(() => {
    if (!controllerUrl) return;
    QRCode.toDataURL(controllerUrl, {
      width: 336,
      margin: 1,
      color: { dark: "#07080c", light: "#ffffff" },
    }).then(setQr);
  }, [controllerUrl]);

  useEffect(() => {
    const sock = socketRef.current;
    const offStatus = sock.onStatus(setNet);
    const offMsg = sock.onMessage((msg: ServerMessage) => {
      if (msg.type === "welcome") {
        setMatchId(msg.matchId);
        setSlot(msg.slot);
        slotRef.current = msg.slot;
        setToken(msg.token);
        setControllerPath(msg.controllerPath);
        sceneRef.current?.setSlot(msg.slot);
      }
      if (msg.type === "error") setError(msg.message);
      if (msg.type === "match_state") {
        const me = msg.players.find((p) => p.slot === slotRef.current) ?? msg.players[0];
        if (me) {
          setPhoneOn(me.phone);
          setCalibrated(me.calibrated);
          setReady(me.ready);
        }
      }
      if (msg.type === "peer_event") {
        if (msg.event === "phone_connected") setPhoneOn(true);
        if (msg.event === "phone_disconnected") setPhoneOn(false);
      }
      if (msg.type === "motion") {
        sceneRef.current?.setOrientationTuple(msg.q);
        setSeq(msg.seq);
        setSwing(msg.swing);
        setQuatLabel(
          msg.q.map((n) => n.toFixed(2)).join(" "),
        );
      }
      if (msg.type === "pong") {
        setRtt(Math.max(0, Date.now() - msg.ts));
      }
    });

    sock.connect();
    if (mode === "create") sock.send({ type: "create_match" });
    else if (joinCode) sock.send({ type: "join_match", matchId: joinCode.toUpperCase() });

    return () => {
      offStatus();
      offMsg();
      sock.disconnect();
    };
  }, [mode, joinCode]);

  return (
    <div className="game-layout">
      <div className="topbar">
        <strong>RALLY3D</strong>
        <div className="status-row">
          <StatusDot
            state={net === "connected" ? "ok" : net === "reconnecting" ? "warn" : "bad"}
            label={`PC ${net}`}
          />
          <StatusDot state={statusFromBool(phoneOn)} label="Phone" />
        </div>
        <button className="btn btn-ghost" onClick={onLeave}>
          Leave
        </button>
      </div>
      <div className="stage">
        <GameCanvas sceneRef={sceneRef} slot={slot} />
        <aside className="panel debug-panel">
          <h3>Sensor debug</h3>
          <div className="metric">
            <span>slot</span>
            <b>P{slot}</b>
          </div>
          <div className="metric">
            <span>seq</span>
            <b>{seq}</b>
          </div>
          <div className="metric">
            <span>quat</span>
            <b>{quatLabel}</b>
          </div>
          <div className="metric">
            <span>swing</span>
            <b>{swing.toFixed(2)}</b>
          </div>
          <div className="metric">
            <span>rtt</span>
            <b>{rtt == null ? "—" : `${rtt} ms`}</b>
          </div>
          <div className="metric">
            <span>calibrated</span>
            <b>{calibrated ? "yes" : "no"}</b>
          </div>
          <div className="metric">
            <span>ready</span>
            <b>{ready ? "yes" : "no"}</b>
          </div>
          {error && (
            <div className="metric">
              <span>error</span>
              <b>{error}</b>
            </div>
          )}
        </aside>
        <aside className="panel pair-panel">
          <h3>Pair your racket</h3>
          <div className="match-code">{matchId || "······"}</div>
          {qr ? <img src={qr} alt="Controller QR code" /> : <div className="note">Generating QR…</div>}
          <p className="note">
            Scan this QR code with your phone to use it as your racket.
          </p>
          {controllerUrl && (
            <p className="note" style={{ wordBreak: "break-all", marginTop: 8 }}>
              {controllerUrl}
            </p>
          )}
          <p className="note" style={{ marginTop: 8 }}>Token {token || "—"}</p>
        </aside>
        <div className="hud-bottom">
          <div className="status-row">
            <StatusDot state={net === "connected" ? "ok" : "warn"} label="Internet" />
            <StatusDot state={statusFromBool(phoneOn)} label={`Player ${slot} phone`} />
          </div>
        </div>
      </div>
    </div>
  );
}
