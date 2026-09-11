import { useEffect, useRef, useState } from "react";
import { RallySocket } from "../networking/wsClient";
import { SensorManager } from "../sensors/SensorManager";
import { StatusDot } from "../components/ui/StatusDot";
import type { Sensitivity, ServerMessage } from "../types/protocol";

export function ControllerPage({
  matchId,
  token,
}: {
  matchId: string;
  token?: string;
}) {
  const socketRef = useRef(new RallySocket());
  const sensorsRef = useRef(new SensorManager());
  const seqRef = useRef(0);
  const [net, setNet] = useState(socketRef.current.getStatus());
  const [slot, setSlot] = useState<1 | 2>(1);
  const [active, setActive] = useState(false);
  const [calibrated, setCalibrated] = useState(false);
  const [ready, setReady] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sensitivity, setSensitivity] = useState<Sensitivity>("medium");
  const [vibrate, setVibrate] = useState(true);
  const [snap, setSnap] = useState({
    a: 0,
    b: 0,
    g: 0,
    ax: 0,
    ay: 0,
    az: 0,
    swing: 0,
  });
  const [simHint, setSimHint] = useState(false);
  const simRef = useRef({ a: 0, b: 0, g: 0 });

  useEffect(() => {
    const sock = socketRef.current;
    const sensors = sensorsRef.current;
    const offStatus = sock.onStatus(setNet);
    const offMsg = sock.onMessage((msg: ServerMessage) => {
      if (msg.type === "welcome") setSlot(msg.slot);
      if (msg.type === "error") setError(msg.message);
    });
    sock.connect();
    sock.send({
      type: "hello",
      role: "controller",
      matchId: matchId.toUpperCase(),
      token,
    });

    const offSensor = sensors.on((s) => {
      setSnap({
        a: s.rawAlpha,
        b: s.rawBeta,
        g: s.rawGamma,
        ax: s.accel[0],
        ay: s.accel[1],
        az: s.accel[2],
        swing: s.swing,
      });
      if (!s.motionActive) return;
      seqRef.current += 1;
      sock.send({
        type: "motion",
        seq: seqRef.current,
        ts: Date.now(),
        q: [s.filteredQuat.x, s.filteredQuat.y, s.filteredQuat.z, s.filteredQuat.w],
        a: s.accel,
        g: s.gyro,
        swing: s.swing,
      });
    });

    const simTimer = window.setTimeout(() => {
      if (Math.abs(sensors.getSnapshot().rawBeta) < 0.01) setSimHint(true);
    }, 1200);

    const onPointer = (e: PointerEvent) => {
      if (!sensors.isActive()) return;
      if (e.buttons === 0 && e.pointerType === "mouse") return;
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      simRef.current.g = x * 55;
      simRef.current.b = -y * 55;
      sensors.pushOrientation(simRef.current.a, simRef.current.b, simRef.current.g);
    };
    window.addEventListener("pointermove", onPointer);
    window.addEventListener("pointerdown", onPointer);

    return () => {
      window.clearTimeout(simTimer);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerdown", onPointer);
      offStatus();
      offMsg();
      offSensor();
      sensors.stop();
      sock.disconnect();
    };
  }, [matchId, token]);

  async function enableMotion() {
    sensorsRef.current.start();
    setActive(true);
    const ok = await sensorsRef.current.requestPermission();
    if (!ok) setError("Motion permission denied — drag to simulate tilt.");
  }

  function startCalibrate() {
    setCountdown(3);
    let n = 3;
    const tick = () => {
      n -= 1;
      if (n <= 0) {
        sensorsRef.current.calibrate();
        setCalibrated(true);
        setCountdown(null);
        socketRef.current.send({ type: "calibrated" });
        if (vibrate && navigator.vibrate) navigator.vibrate(40);
        return;
      }
      setCountdown(n);
      window.setTimeout(tick, 700);
    };
    window.setTimeout(tick, 700);
  }

  function markReady() {
    setReady(true);
    socketRef.current.send({ type: "ready" });
    if (vibrate && navigator.vibrate) navigator.vibrate([20, 40, 20]);
  }

  function changeSensitivity(s: Sensitivity) {
    setSensitivity(s);
    sensorsRef.current.setSensitivity(s);
  }

  function reconnect() {
    socketRef.current.disconnect();
    socketRef.current.connect();
    socketRef.current.send({
      type: "hello",
      role: "controller",
      matchId: matchId.toUpperCase(),
      token,
    });
  }

  return (
    <div className="controller">
      <header>
        <div>
          <div className="brand">RALLY3D</div>
          <h1>Player {slot} controller</h1>
        </div>
        <StatusDot
          state={net === "connected" ? "ok" : net === "reconnecting" ? "warn" : "bad"}
          label={net}
        />
      </header>

      <div className="card">
        <div className="metric">
          <span>Connected to</span>
          <b>{matchId.toUpperCase()}</b>
        </div>
        <div className="metric">
          <span>Motion sensor</span>
          <b>{active ? "Active" : "Idle"}</b>
        </div>
        <div className="metric">
          <span>Calibration</span>
          <b>{calibrated ? "Complete" : "Needed"}</b>
        </div>
      </div>

      <div className="stack">
        {!active && (
          <button className="btn btn-primary full" onClick={enableMotion}>
            Enable motion
          </button>
        )}
        {active && simHint && (
          <p className="note">
            No device sensors detected. Drag on this screen to simulate tilt.
          </p>
        )}
        {active && !calibrated && countdown == null && (
          <button className="btn btn-primary full" onClick={startCalibrate}>
            Calibrate racket
          </button>
        )}
        {countdown != null && <div className="countdown">{countdown}</div>}
        {countdown != null && (
          <p className="note">Hold your phone like a table-tennis racket.</p>
        )}
        {calibrated && !ready && (
          <button className="btn btn-primary full" onClick={markReady}>
            Ready
          </button>
        )}
        {calibrated && ready && <p className="note">CALIBRATION COMPLETE ✓ — you are ready.</p>}
        <button className="btn btn-ghost full" onClick={reconnect}>
          Reconnect
        </button>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 10, letterSpacing: "0.14em", fontSize: 11, color: "var(--muted)" }}>
          SENSITIVITY
        </h3>
        <div className="sensitivity">
          {(["low", "medium", "high"] as Sensitivity[]).map((s) => (
            <button
              key={s}
              className="btn btn-ghost"
              aria-pressed={sensitivity === s}
              onClick={() => changeSensitivity(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <label className="note" style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <input
            type="checkbox"
            checked={vibrate}
            onChange={(e) => setVibrate(e.target.checked)}
          />
          Vibration feedback
        </label>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 10, letterSpacing: "0.14em", fontSize: 11, color: "var(--muted)" }}>
          LIVE SENSORS
        </h3>
        <div className="metric">
          <span>alpha</span>
          <b>{snap.a.toFixed(1)}</b>
        </div>
        <div className="metric">
          <span>beta</span>
          <b>{snap.b.toFixed(1)}</b>
        </div>
        <div className="metric">
          <span>gamma</span>
          <b>{snap.g.toFixed(1)}</b>
        </div>
        <div className="metric">
          <span>accel</span>
          <b>
            {snap.ax.toFixed(1)} {snap.ay.toFixed(1)} {snap.az.toFixed(1)}
          </b>
        </div>
        <div className="metric">
          <span>swing</span>
          <b>{snap.swing.toFixed(2)}</b>
        </div>
        {error && (
          <div className="metric">
            <span>error</span>
            <b>{error}</b>
          </div>
        )}
      </div>
    </div>
  );
}
