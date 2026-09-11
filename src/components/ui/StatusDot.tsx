export function StatusDot({
  state,
  label,
}: {
  state: "ok" | "warn" | "bad" | "idle";
  label: string;
}) {
  const cls = state === "idle" ? "dot" : `dot ${state}`;
  return (
    <span className="chip">
      <span className={cls} />
      {label}
    </span>
  );
}
