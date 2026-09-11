export function HomePage({
  onPlay,
  onJoin,
  onHow,
}: {
  onPlay: () => void;
  onJoin: (code: string) => void;
  onHow: () => void;
}) {
  return (
    <div className="home">
      <div className="home-card">
        <div className="brand">STAGE 1 · MOTION MVP</div>
        <h1>RALLY3D</h1>
        <p className="tagline">Your phone is the racket.</p>
        <div className="actions">
          <button className="btn btn-primary" onClick={onPlay}>
            Play Online
          </button>
          <button className="btn btn-ghost" onClick={onPlay}>
            Practice
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => {
              const code = window.prompt("Enter match code");
              if (code) onJoin(code.trim().toUpperCase());
            }}
          >
            Join Match
          </button>
          <button className="btn btn-ghost" onClick={onHow}>
            How it works
          </button>
        </div>
        <p className="blurb">
          Connect your phone. Pick up your racket. Play table tennis in 3D.
          This build proves the live sensor pipeline: phone motion drives the
          desktop racket over WebSocket.
        </p>
      </div>
    </div>
  );
}
