import * as THREE from "three";

export function createRacket(): THREE.Group {
  const group = new THREE.Group();
  group.name = "racket";

  const handleMat = new THREE.MeshStandardMaterial({
    color: 0x3a2618,
    roughness: 0.55,
    metalness: 0.08,
  });
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.022, 0.16, 16),
    handleMat,
  );
  handle.position.y = -0.12;
  handle.castShadow = true;

  const flare = new THREE.Mesh(
    new THREE.CylinderGeometry(0.028, 0.018, 0.03, 16),
    handleMat,
  );
  flare.position.y = -0.035;
  flare.castShadow = true;

  const throat = new THREE.Mesh(
    new THREE.CylinderGeometry(0.016, 0.028, 0.05, 16),
    handleMat,
  );
  throat.position.y = 0.01;
  throat.castShadow = true;

  const bladeShape = new THREE.Shape();
  const w = 0.075;
  const h = 0.09;
  bladeShape.moveTo(0, h);
  bladeShape.bezierCurveTo(w, h, w, 0.02, w * 0.85, -0.01);
  bladeShape.lineTo(0.02, -0.02);
  bladeShape.lineTo(-0.02, -0.02);
  bladeShape.lineTo(-w * 0.85, -0.01);
  bladeShape.bezierCurveTo(-w, 0.02, -w, h, 0, h);

  const bladeGeom = new THREE.ExtrudeGeometry(bladeShape, {
    depth: 0.01,
    bevelEnabled: true,
    bevelThickness: 0.002,
    bevelSize: 0.002,
    bevelSegments: 2,
  });
  bladeGeom.center();
  bladeGeom.rotateX(Math.PI / 2);

  const wood = new THREE.MeshStandardMaterial({
    color: 0xc4a574,
    roughness: 0.7,
    metalness: 0.05,
  });
  const rubberRed = new THREE.MeshStandardMaterial({
    color: 0xb42318,
    roughness: 0.85,
    metalness: 0.02,
  });
  const rubberBlack = new THREE.MeshStandardMaterial({
    color: 0x141416,
    roughness: 0.85,
    metalness: 0.04,
  });

  const core = new THREE.Mesh(bladeGeom, wood);
  core.castShadow = true;
  core.receiveShadow = true;
  core.position.y = 0.07;

  const faceGeom = bladeGeom.clone();
  const faceA = new THREE.Mesh(faceGeom, rubberRed);
  faceA.position.set(0, 0.07, 0.007);
  faceA.scale.set(0.96, 0.96, 0.15);
  faceA.castShadow = true;

  const faceB = new THREE.Mesh(faceGeom, rubberBlack);
  faceB.position.set(0, 0.07, -0.007);
  faceB.scale.set(0.96, 0.96, 0.15);

  const edge = new THREE.Mesh(
    new THREE.TorusGeometry(0.078, 0.004, 8, 40),
    new THREE.MeshStandardMaterial({ color: 0xd8dde6, roughness: 0.4 }),
  );
  edge.rotation.x = Math.PI / 2;
  edge.position.y = 0.075;
  edge.scale.set(0.92, 1.08, 1);

  group.add(handle, flare, throat, core, faceA, faceB, edge);
  return group;
}
