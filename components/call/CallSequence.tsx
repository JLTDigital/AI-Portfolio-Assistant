"use client";

import { useEffect, useState } from "react";

import { Chat } from "@/components/chat/Chat";
import { useChat } from "@/components/chat/use-chat";

import { CallEnded } from "./CallEnded";
import { Connecting } from "./Connecting";
import { IncomingCall } from "./IncomingCall";

type Stage = "ringing" | "connecting" | "connected" | "ending" | "ended";

const CONNECTING_MS = 1200;
const CLOSING_MS = 400;

function prefersReducedMotion() {
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function CallSequence() {
  const [stage, setStage] = useState<Stage>("ringing");
  const chat = useChat();

  useEffect(() => {
    if (stage !== "connecting") return;

    const timer = setTimeout(() => setStage("connected"), CONNECTING_MS);
    return () => clearTimeout(timer);
  }, [stage]);

  function accept() {
    setStage(prefersReducedMotion() ? "connected" : "connecting");
  }

  function finishCall() {
    chat.reset();
    setStage("ended");
  }

  function endCall() {
    if (prefersReducedMotion()) return finishCall();

    setStage("ending");
    setTimeout(finishCall, CLOSING_MS);
  }

  // Chat stays mounted but invisible from the start: WebGL startup blocks the
  // main thread, so it has to happen before anything needs to animate.
  return (
    <>
      {stage === "ringing" && <IncomingCall onAccept={accept} />}
      {stage === "connecting" && <Connecting />}
      {stage === "ended" && <CallEnded onCallAgain={accept} />}
      <Chat
        chat={chat}
        connected={stage === "connected" || stage === "ending"}
        closing={stage === "ending"}
        onEnd={endCall}
      />
    </>
  );
}
