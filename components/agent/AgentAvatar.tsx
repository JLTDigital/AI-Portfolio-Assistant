"use client";

import dynamic from "next/dynamic";
import { catchError } from "next/error";

import { AgentOrb } from "./AgentOrb";
import { useAvatarMode } from "./use-avatar-mode";

export type AgentState =
  | "idle"
  | "ringing"
  | "thinking"
  | "speaking"
  | "signal-lost";

const BLOB_STATES = {
  idle: { theme: "aurora", complexity: 1, speed: 1, motion: "" },
  ringing: {
    theme: "aurora",
    complexity: 2,
    speed: 2,
    motion: "animate-avatar-ring",
  },
  thinking: { theme: "aurora", complexity: 4, speed: 4, motion: "" },
  speaking: {
    theme: "aurora",
    complexity: 2,
    speed: 3,
    motion: "animate-avatar-speak",
  },
  "signal-lost": {
    theme: "danger",
    complexity: 1,
    speed: 1,
    motion: "animate-avatar-dim",
  },
} as const;

const MorphingBlob = dynamic(
  () => import("@/components/ui/morphing-blob").then((m) => m.MorphingBlob),
  { ssr: false, loading: () => <AgentOrb state="idle" /> },
);

// A failed blob must never take the chat down with it.
const OrbOnError = catchError((props: { state: AgentState }) => (
  <AgentOrb state={props.state} />
));

interface AgentAvatarProps {
  state: AgentState;
  materialise: boolean;
}

export function AgentAvatar({ state, materialise }: AgentAvatarProps) {
  const mode = useAvatarMode();
  const { motion, ...blob } = BLOB_STATES[state];
  const lost = state === "signal-lost";

  return (
    <div
      aria-hidden="true"
      data-agent-avatar
      className="relative mx-auto mt-3 size-24 shrink-0 sm:mt-4 sm:size-40 [@media(max-height:639px)]:size-16"
    >
      {materialise && (
        <div className="absolute top-1/2 left-1/2 -mt-1.5 -ml-1.5 size-3 animate-point-of-light rounded-full bg-accent shadow-[0_0_16px_var(--accent)] motion-reduce:hidden" />
      )}
      <div
        className={`absolute inset-0 ${materialise ? "animate-avatar-materialise motion-reduce:animate-none" : ""}`}
      >
        <div className="absolute inset-x-[12%] bottom-0 h-[14%] rounded-[50%] border border-accent/60 shadow-[0_0_12px_var(--glow)]" />
        {mode === "orb" ? (
          <div className={`size-full ${lost ? "opacity-45" : ""}`}>
            <AgentOrb state={state} />
          </div>
        ) : (
          <div className={`size-full ${motion}`}>
            <OrbOnError state={state}>
              <MorphingBlob
                {...blob}
                size="100%"
                particleCount={mode === "full" ? 150 : 40}
                enableEffects={mode === "full"}
              />
            </OrbOnError>
          </div>
        )}
        <div className="scene-scanlines absolute inset-0 rounded-full" />
      </div>
    </div>
  );
}
