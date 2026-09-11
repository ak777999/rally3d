export function HowItWorksPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="how">
      <div className="brand">RALLY3D</div>
      <h1 style={{ margin: "12px 0 16px", letterSpacing: "-0.04em" }}>How it works</h1>
      <p className="note">
        Two computers share one match. Each player pairs a phone as a motion
        controller. The server keeps identity, slots, and live packets in sync.
      </p>
      <ol>
        <li>Open RALLY3D on your PC and create or join a match.</li>
        <li>Scan the QR code with your phone (or open the controller link).</li>
        <li>Tap Enable Motion, then Calibrate while holding the phone like a racket.</li>
        <li>Move the phone. The 3D racket on the PC follows in real time.</li>
        <li>Later stages add the second player, ball physics, scoring, and serve.</li>
      </ol>
      <div style={{ marginTop: 24 }}>
        <button className="btn btn-ghost" onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  );
}
