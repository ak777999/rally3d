import { useEffect, useRef, type MutableRefObject } from "react";
import { GameScene } from "../../scene/GameScene";
import type { PlayerSlot } from "../../types/protocol";

export function GameCanvas({
  sceneRef,
  slot,
}: {
  sceneRef: MutableRefObject<GameScene | null>;
  slot: PlayerSlot;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scene = new GameScene(canvas);
    scene.setSlot(slot);
    scene.resize();
    scene.start();
    sceneRef.current = scene;

    const onResize = () => scene.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      scene.dispose();
      sceneRef.current = null;
    };
  }, [sceneRef, slot]);

  return <canvas ref={canvasRef} />;
}
