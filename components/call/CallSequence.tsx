"use client";

import { useEffect, useState } from "react";

import { Chat } from "@/components/chat/Chat";
import { useChat } from "@/components/chat/use-chat";

import { CallEnded } from "./CallEnded";
import { Connecting } from "./Connecting";
import { CONTROL, ContactLinks } from "./ContactLinks";
import { IncomingCall } from "./IncomingCall";
import { useCallSounds } from "./use-call-sounds";

type Stage = "ringing" | "connecting" | "connected" | "ending" | "ended";

const CONNECTING_MS = 1200;
const CLOSING_MS = 400;

function prefersReducedMotion() {
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function CallSequence() {
  const [stage, setStage] = useState<Stage>("ringing");
  const chat = useChat();
  const sounds = useCallSounds(stage === "ringing");

  useEffect(() => {
    if (stage !== "connecting") return;

    const timer = setTimeout(() => setStage("connected"), CONNECTING_MS);
    return () => clearTimeout(timer);
  }, [stage]);

  function accept() {
    sounds.playConnect();
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
    <div className="flex h-dvh min-h-[36rem] flex-col">
      {stage === "ringing" && <IncomingCall onAccept={accept} />}
      {stage === "connecting" && <Connecting />}
      {stage === "ended" && <CallEnded onCallAgain={accept} />}
      <Chat
        chat={chat}
        connected={stage === "connected" || stage === "ending"}
        closing={stage === "ending"}
        onEnd={endCall}
      />
      <div className="flex flex-wrap justify-center gap-2 px-4 pb-2">
        <nav
          aria-label="Contact"
          className="flex flex-wrap justify-center gap-2"
        >
          <ContactLinks />
        </nav>
        <button type="button" onClick={sounds.toggle} className={CONTROL}>
          SOUND: {sounds.enabled ? "ON" : "OFF"}
        </button>
      </div>
    </div>
  );
}
