import * as THREE from "three";

export function createTable(): THREE.Group {
  const group = new THREE.Group();
  group.name = "table";

  const top = new THREE.Mesh(
    new THREE.BoxGeometry(2.74, 0.04, 1.525),
    new THREE.MeshStandardMaterial({
      color: 0x1a4f8a,
      roughness: 0.35,
      metalness: 0.05,
    }),
  );
  top.position.y = 0.76;
  top.receiveShadow = true;
  top.castShadow = true;

  const lineMat = new THREE.MeshBasicMaterial({ color: 0xf4f7fb });
  const lines = new THREE.Group();
  const addLine = (w: number, d: number, x: number, z: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.002, d), lineMat);
    m.position.set(x, 0.781, z);
    lines.add(m);
  };
  addLine(2.74, 0.02, 0, 0.752);
  addLine(2.74, 0.02, 0, -0.752);
  addLine(0.02, 1.525, 1.36, 0);
  addLine(0.02, 1.525, -1.36, 0);
  addLine(0.02, 1.525, 0, 0);
  addLine(2.74, 0.012, 0, 0);

  const net = new THREE.Mesh(
    new THREE.PlaneGeometry(0.02, 0.152, 1, 8),
    new THREE.MeshStandardMaterial({
      color: 0xdfe6f0,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
    }),
  );
  net.position.set(0, 0.86, 0);
  net.rotation.y = Math.PI / 2;

  const postMat = new THREE.MeshStandardMaterial({
    color: 0xc9a227,
    metalness: 0.7,
    roughness: 0.25,
  });
  const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.16, 10), postMat);
  const postR = postL.clone();
  postL.position.set(0, 0.86, 0.8);
  postR.position.set(0, 0.86, -0.8);

  const legMat = new THREE.MeshStandardMaterial({ color: 0x1b1d24, roughness: 0.6 });
  const legs = [
    [-1.2, 0.38, 0.62],
    [1.2, 0.38, 0.62],
    [-1.2, 0.38, -0.62],
    [1.2, 0.38, -0.62],
  ].map(([x, y, z]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.76, 0.06), legMat);
    leg.position.set(x, y, z);
    leg.castShadow = true;
    return leg;
  });

  group.add(top, lines, net, postL, postR, ...legs);
  return group;
}
