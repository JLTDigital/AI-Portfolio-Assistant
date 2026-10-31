"use client";

import { useEffect, useRef, useState } from "react";

import { MAX_MESSAGES } from "@/lib/chat/limits";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export type ChatStatus = "idle" | "thinking" | "streaming";

/** Holds the conversation and streams each answer from /api/chat. */
export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [signalLost, setSignalLost] = useState(false);
  const request = useRef<AbortController | null>(null);

  useEffect(() => () => request.current?.abort(), []);

  async function requestAnswer(sent: ChatMessage[]) {
    if (request.current) return;

    const controller = new AbortController();
    request.current = controller;

    setMessages(sent);
    setStatus("thinking");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: sent }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) throw new Error("Request failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let answer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        answer += decoder.decode(value, { stream: true });
        if (answer) {
          setMessages([...sent, { role: "assistant", content: answer }]);
          setStatus("streaming");
        }
      }

      if (!answer.trim()) throw new Error("Answer empty");
      setSignalLost(false);
      setStatus("idle");
    } catch {
      // The visitor has left, so there's nobody to tell.
      if (controller.signal.aborted) return;

      // A partial answer can't stay: it would look complete and go back to the
      // model in the next request. The question stays so Retry can resend it.
      setMessages(sent);
      setSignalLost(true);
      setStatus("idle");
    } finally {
      request.current = null;
    }
  }

  function send(question: string) {
    return requestAnswer([...messages, { role: "user", content: question }]);
  }

  function retry() {
    return requestAnswer(messages);
  }

  const callEnded =
    status === "idle" && !signalLost && messages.length >= MAX_MESSAGES;

  return { messages, status, signalLost, callEnded, send, retry };
}
