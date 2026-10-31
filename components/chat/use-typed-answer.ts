"use client";

import { useEffect, useState } from "react";

import type { ChatMessage } from "./use-chat";

const TICK_MS = 20;
// Providers send text in bursts, so a long backlog types faster and a long
// answer still finishes within about ten seconds.
const BACKLOG_TICKS = 120;

/** Paces the newest answer so it types out instead of landing in bursts. */
export function useTypedAnswer(messages: ChatMessage[]) {
  const last = messages[messages.length - 1];
  const text = last?.role === "assistant" ? last.content : "";
  const [shownLength, setShownLength] = useState(0);

  // Adjusted during render so a new answer can never flash the old length.
  if (!text && shownLength !== 0) setShownLength(0);

  const typing = shownLength < text.length;

  useEffect(() => {
    if (!typing) return;

    const timer = setTimeout(() => {
      const instant = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const step = Math.ceil((text.length - shownLength) / BACKLOG_TICKS);
      setShownLength(instant ? text.length : shownLength + step);
    }, TICK_MS);
    return () => clearTimeout(timer);
  }, [typing, text, shownLength]);

  return { shownLength, typing };
}
