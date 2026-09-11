# RALLY3D — Stage 1

Online multiplayer 3D table tennis. Your phone is the racket.

Stage 1 delivers the live control pipeline:

```
Phone sensors → SensorManager (calibrate / filter) → WebSocket → Desktop Three.js racket
```

## Run

```bash
git clone https://github.com/ak777999/rally3d.git
cd rally3d
npm install --registry https://registry.npmjs.org
npm run dev
```

Open `http://localhost:5173` on your PC. The process binds `0.0.0.0:5173`, so a phone on the same Wi-Fi can use `http://<lan-ip>:5173`.

On your phone (same Wi-Fi), open the QR / controller URL shown after **Play Online**.

## Stage 1 flow

1. PC: Play Online — creates a match + QR.
2. Phone: scan QR → Player controller.
3. Phone: Enable Motion → Calibrate → move the phone.
4. PC: the 3D racket rotates from the live quaternion stream.

## Notes

- iOS Safari requires **HTTPS** (or localhost) before `DeviceOrientation` permission works.
- Match IDs are 6-character codes. Controller URLs include a temporary seat token.
- The server is authoritative for seats. A third device cannot silently take P1/P2.
- Later stages: ball physics, scoring, second-PC sync, polish.

## Scripts

- `npm run dev` — Vite + WebSocket on port 5173
- `npm run build` / `npm start` — production static + same server
