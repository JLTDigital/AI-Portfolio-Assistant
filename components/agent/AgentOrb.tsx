import type { AgentState } from "./AgentAvatar";

/** The static avatar, used when the blob can't or shouldn't run. */
export function AgentOrb({ state }: { state: AgentState }) {
  const colours =
    state === "signal-lost"
      ? "from-amber via-alert to-frame/20"
      : "from-accent via-[#ff006b]/70 to-[#4a00ff]/20";

  return (
    <div
      className={`absolute inset-[12%] rounded-full bg-radial-[at_35%_30%] to-80% ${colours}`}
    />
  );
}
