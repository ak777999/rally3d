import * as THREE from "three";
import { createRacket } from "./createRacket";
import { createTable } from "./createTable";
import { createArena, createLights } from "./createArena";
import { fromTuple, Quat, quatSlerp } from "../utils/quat";

export class GameScene {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly racket: THREE.Group;
  readonly opponentRacket: THREE.Group;

  private filtered = new THREE.Quaternion();
  private target = new THREE.Quaternion();
  private base = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(-0.35, 0, 0),
  );
  private running = false;
  private raf = 0;
  private last = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.setClearColor(0x07080c, 1);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x07080c, 6, 16);

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.05, 40);
    this.camera.position.set(-2.55, 1.55, 0);
    this.camera.lookAt(0, 0.86, 0);

    createLights(this.scene);
    this.scene.add(createArena());
    this.scene.add(createTable());

    this.racket = createRacket();
    this.racket.position.set(-1.05, 1.05, 0);
    this.scene.add(this.racket);

    this.opponentRacket = createRacket();
    this.opponentRacket.position.set(1.05, 1.05, 0);
    this.opponentRacket.rotation.y = Math.PI;
    this.opponentRacket.visible = false;
    this.scene.add(this.opponentRacket);

    const glow = new THREE.PointLight(0x3ee0c0, 0.6, 2.4);
    this.racket.add(glow);
  }

  setSlot(slot: 1 | 2) {
    if (slot === 1) {
      this.camera.position.set(-2.55, 1.55, 0);
      this.racket.position.set(-1.05, 1.05, 0);
    } else {
      this.camera.position.set(2.55, 1.55, 0);
      this.racket.position.set(1.05, 1.05, 0);
    }
    this.camera.lookAt(0, 0.86, 0);
  }

  setOrientation(q: Quat) {
    this.target.set(q.x, q.y, q.z, q.w);
  }

  setOrientationTuple(t: [number, number, number, number]) {
    this.setOrientation(fromTuple(t));
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.filtered.slerp(this.target, 1 - Math.exp(-14 * dt));
      this.racket.quaternion.copy(this.base).multiply(this.filtered);
      this.renderer.render(this.scene, this.camera);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  resize() {
    const parent = this.canvas.parentElement;
    const w = parent?.clientWidth || this.canvas.clientWidth || window.innerWidth;
    const h = parent?.clientHeight || this.canvas.clientHeight || window.innerHeight;
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  dispose() {
    this.stop();
    this.renderer.dispose();
  }
}

export function slerpToward(current: Quat, target: Quat, t: number): Quat {
  return quatSlerp(current, target, t);
}
