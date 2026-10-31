"use client";

import { useEffect, useState } from "react";

import { Chat } from "@/components/chat/Chat";

import { Connecting } from "./Connecting";
import { IncomingCall } from "./IncomingCall";

type Stage = "ringing" | "connecting" | "connected";

const CONNECTING_MS = 1200;

export function CallSequence() {
  const [stage, setStage] = useState<Stage>("ringing");

  useEffect(() => {
    if (stage !== "connecting") return;

    const timer = setTimeout(() => setStage("connected"), CONNECTING_MS);
    return () => clearTimeout(timer);
  }, [stage]);

  function accept() {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    setStage(reduced ? "connected" : "connecting");
  }

  // Chat stays mounted but invisible from the start: WebGL startup blocks the
  // main thread, so it has to happen before anything needs to animate.
  return (
    <>
      {stage === "ringing" && <IncomingCall onAccept={accept} />}
      {stage === "connecting" && <Connecting />}
      <Chat connected={stage === "connected"} />
    </>
  );
}
