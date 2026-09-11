export type Quat = { x: number; y: number; z: number; w: number };

export const IDENTITY: Quat = { x: 0, y: 0, z: 0, w: 1 };

export function quatFromEulerYXZ(x: number, y: number, z: number): Quat {
  const cx = Math.cos(x / 2);
  const sx = Math.sin(x / 2);
  const cy = Math.cos(y / 2);
  const sy = Math.sin(y / 2);
  const cz = Math.cos(z / 2);
  const sz = Math.sin(z / 2);
  return {
    x: sx * cy * cz + cx * sy * sz,
    y: cx * sy * cz - sx * cy * sz,
    z: cx * cy * sz - sx * sy * cz,
    w: cx * cy * cz + sx * sy * sz,
  };
}

export function quatMultiply(a: Quat, b: Quat): Quat {
  return {
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
  };
}

export function quatInvert(q: Quat): Quat {
  const n = q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w || 1;
  return { x: -q.x / n, y: -q.y / n, z: -q.z / n, w: q.w / n };
}

export function quatNormalize(q: Quat): Quat {
  const n = Math.hypot(q.x, q.y, q.z, q.w) || 1;
  return { x: q.x / n, y: q.y / n, z: q.z / n, w: q.w / n };
}

export function quatDot(a: Quat, b: Quat): number {
  return a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
}

export function quatSlerp(a: Quat, b: Quat, t: number): Quat {
  let ax = a.x;
  let ay = a.y;
  let az = a.z;
  let aw = a.w;
  let dot = quatDot(a, b);
  if (dot < 0) {
    ax = -ax;
    ay = -ay;
    az = -az;
    aw = -aw;
    dot = -dot;
  }
  if (dot > 0.9995) {
    return quatNormalize({
      x: ax + (b.x - ax) * t,
      y: ay + (b.y - ay) * t,
      z: az + (b.z - az) * t,
      w: aw + (b.w - aw) * t,
    });
  }
  const theta0 = Math.acos(Math.min(1, Math.max(-1, dot)));
  const theta = theta0 * t;
  const sin0 = Math.sin(theta0);
  const s0 = Math.sin(theta0 - theta) / sin0;
  const s1 = Math.sin(theta) / sin0;
  return {
    x: s0 * ax + s1 * b.x,
    y: s0 * ay + s1 * b.y,
    z: s0 * az + s1 * b.z,
    w: s0 * aw + s1 * b.w,
  };
}

export function quatAngle(q: Quat): number {
  return 2 * Math.acos(Math.min(1, Math.abs(q.w)));
}

export function quatScaleAngle(q: Quat, scale: number): Quat {
  const nq = quatNormalize(q);
  const angle = quatAngle(nq);
  if (angle < 1e-6) return { ...IDENTITY };
  const half = (angle * scale) / 2;
  const s = Math.sin(half) / Math.sin(angle / 2);
  return quatNormalize({
    x: nq.x * s,
    y: nq.y * s,
    z: nq.z * s,
    w: Math.cos(half) * Math.sign(nq.w || 1),
  });
}

export function toTuple(q: Quat): [number, number, number, number] {
  return [q.x, q.y, q.z, q.w];
}

export function fromTuple(t: [number, number, number, number]): Quat {
  return { x: t[0], y: t[1], z: t[2], w: t[3] };
}
