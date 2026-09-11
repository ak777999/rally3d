import * as THREE from "three";

export function createArena(): THREE.Group {
  const group = new THREE.Group();

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(8, 48),
    new THREE.MeshStandardMaterial({
      color: 0x0b0d14,
      roughness: 0.9,
      metalness: 0.1,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(3.2, 3.28, 64),
    new THREE.MeshBasicMaterial({
      color: 0x3ee0c0,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.01;

  const ring2 = new THREE.Mesh(
    new THREE.RingGeometry(4.1, 4.16, 64),
    new THREE.MeshBasicMaterial({
      color: 0x3d7cff,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
    }),
  );
  ring2.rotation.x = -Math.PI / 2;
  ring2.position.y = 0.01;

  group.add(floor, ring, ring2);
  return group;
}

export function createLights(scene: THREE.Scene) {
  const ambient = new THREE.AmbientLight(0xb8c4d8, 0.45);
  const key = new THREE.DirectionalLight(0xffffff, 1.35);
  key.position.set(3.2, 6.5, 2.4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 18;
  key.shadow.camera.left = -5;
  key.shadow.camera.right = 5;
  key.shadow.camera.top = 5;
  key.shadow.camera.bottom = -5;

  const fill = new THREE.DirectionalLight(0x3ee0c0, 0.28);
  fill.position.set(-4, 3, -2);

  const rim = new THREE.PointLight(0x3d7cff, 1.4, 12, 2);
  rim.position.set(0, 2.4, 0);

  scene.add(ambient, key, fill, rim);
}
