import {
  IDENTITY,
  Quat,
  fromTuple,
  quatFromEulerYXZ,
  quatInvert,
  quatMultiply,
  quatNormalize,
  quatScaleAngle,
  quatSlerp,
  toTuple,
  quatAngle,
} from "../utils/quat";
import type { Sensitivity } from "../types/protocol";

const SENSITIVITY_SCALE: Record<Sensitivity, number> = {
  low: 0.55,
  medium: 1,
  high: 1.55,
};

const DEADZONE_RAD = 0.035;

export interface SensorSnapshot {
  rawAlpha: number;
  rawBeta: number;
  rawGamma: number;
  accel: [number, number, number];
  gyro: [number, number, number];
  rawQuat: Quat;
  relativeQuat: Quat;
  filteredQuat: Quat;
  swing: number;
  calibrated: boolean;
  motionActive: boolean;
}

type Listener = (snap: SensorSnapshot) => void;

function deg(n: number): number {
  return (n * Math.PI) / 180;
}

function orientationToQuat(alpha: number, beta: number, gamma: number): Quat {
  const q = quatFromEulerYXZ(deg(beta), deg(alpha), deg(-gamma));
  const qScreen: Quat = { x: -Math.SQRT1_2, y: 0, z: 0, w: Math.SQRT1_2 };
  return quatNormalize(quatMultiply(q, qScreen));
}

export class SensorManager {
  private listeners = new Set<Listener>();
  private calibrated = false;
  private motionActive = false;
  private calibInverse: Quat = { ...IDENTITY };
  private filtered: Quat = { ...IDENTITY };
  private lastRaw: Quat = { ...IDENTITY };
  private accel: [number, number, number] = [0, 0, 0];
  private gyro: [number, number, number] = [0, 0, 0];
  private rawAlpha = 0;
  private rawBeta = 0;
  private rawGamma = 0;
  private swing = 0;
  private sensitivity: Sensitivity = "medium";
  private accelHistory: number[] = [];
  private orientHandler: ((e: DeviceOrientationEvent) => void) | null = null;
  private motionHandler: ((e: DeviceMotionEvent) => void) | null = null;
  private raf = 0;

  on(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  setSensitivity(s: Sensitivity) {
    this.sensitivity = s;
  }

  getSensitivity(): Sensitivity {
    return this.sensitivity;
  }

  isActive(): boolean {
    return this.motionActive;
  }

  isCalibrated(): boolean {
    return this.calibrated;
  }

  async requestPermission(): Promise<boolean> {
    const doe = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<PermissionState>;
    };
    const dme = DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<PermissionState>;
    };
    try {
      if (typeof doe.requestPermission === "function") {
        const state = await Promise.race([
          doe.requestPermission(),
          new Promise<PermissionState>((resolve) =>
            setTimeout(() => resolve("granted"), 1200),
          ),
        ]);
        if (state !== "granted") {
          this.start();
          return false;
        }
      }
      if (typeof dme.requestPermission === "function") {
        await Promise.race([
          dme.requestPermission().catch(() => "denied"),
          new Promise((resolve) => setTimeout(resolve, 800)),
        ]);
      }
      this.start();
      return true;
    } catch {
      this.start();
      return true;
    }
  }

  pushOrientation(alpha: number, beta: number, gamma: number) {
    this.rawAlpha = alpha;
    this.rawBeta = beta;
    this.rawGamma = gamma;
    this.lastRaw = orientationToQuat(alpha, beta, gamma);
  }

  start() {
    if (this.motionActive) return;
    this.orientHandler = (e: DeviceOrientationEvent) => {
      if (e.alpha == null || e.beta == null || e.gamma == null) return;
      this.rawAlpha = e.alpha;
      this.rawBeta = e.beta;
      this.rawGamma = e.gamma;
      this.lastRaw = orientationToQuat(e.alpha, e.beta, e.gamma);
    };
    this.motionHandler = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity ?? e.acceleration;
      if (a) {
        this.accel = [a.x ?? 0, a.y ?? 0, a.z ?? 0];
      }
      const r = e.rotationRate;
      if (r) {
        this.gyro = [r.alpha ?? 0, r.beta ?? 0, r.gamma ?? 0];
      }
      this.updateSwing();
    };
    window.addEventListener("deviceorientation", this.orientHandler, true);
    window.addEventListener("devicemotion", this.motionHandler, true);
    this.motionActive = true;
    const tick = () => {
      this.emit();
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop() {
    if (this.orientHandler) {
      window.removeEventListener("deviceorientation", this.orientHandler, true);
    }
    if (this.motionHandler) {
      window.removeEventListener("devicemotion", this.motionHandler, true);
    }
    cancelAnimationFrame(this.raf);
    this.motionActive = false;
  }

  calibrate() {
    this.calibInverse = quatInvert(this.lastRaw);
    this.filtered = { ...IDENTITY };
    this.calibrated = true;
  }

  resetCalibration() {
    this.calibrated = false;
    this.filtered = { ...IDENTITY };
  }

  getSnapshot(): SensorSnapshot {
    const relative = this.calibrated
      ? quatNormalize(quatMultiply(this.calibInverse, this.lastRaw))
      : { ...this.lastRaw };

    let scaled = quatScaleAngle(relative, SENSITIVITY_SCALE[this.sensitivity]);
    if (quatAngle(scaled) < DEADZONE_RAD) {
      scaled = { ...IDENTITY };
    }
    this.filtered = quatSlerp(this.filtered, scaled, 0.28);
    return {
      rawAlpha: this.rawAlpha,
      rawBeta: this.rawBeta,
      rawGamma: this.rawGamma,
      accel: this.accel,
      gyro: this.gyro,
      rawQuat: this.lastRaw,
      relativeQuat: scaled,
      filteredQuat: this.filtered,
      swing: this.swing,
      calibrated: this.calibrated,
      motionActive: this.motionActive,
    };
  }

  private updateSwing() {
    const mag = Math.hypot(this.accel[0], this.accel[1], this.accel[2]);
    this.accelHistory.push(mag);
    if (this.accelHistory.length > 8) this.accelHistory.shift();
    const avg =
      this.accelHistory.reduce((s, v) => s + v, 0) /
      Math.max(1, this.accelHistory.length);
    const delta = Math.abs(mag - avg);
    const gyroMag = Math.hypot(this.gyro[0], this.gyro[1], this.gyro[2]);
    const raw = Math.max(0, (delta - 1.6) * 0.35 + (gyroMag - 80) * 0.004);
    this.swing = Math.min(1, this.swing * 0.82 + raw);
  }

  private emit() {
    const snap = this.getSnapshot();
    this.listeners.forEach((fn) => fn(snap));
  }
}

export function quatToPacket(q: Quat): [number, number, number, number] {
  return toTuple(q);
}

export function packetToQuat(t: [number, number, number, number]): Quat {
  return fromTuple(t);
}
