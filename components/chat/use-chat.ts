"use client";

import { useEffect, useRef, useState } from "react";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export type ChatStatus = "idle" | "thinking" | "streaming" | "failed";

/** Holds the conversation and streams each answer from /api/chat. */
export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const request = useRef<AbortController | null>(null);

  useEffect(() => () => request.current?.abort(), []);

  /** Resolves false if the question was not answered and should be kept. */
  async function send(question: string) {
    if (request.current) return false;

    const controller = new AbortController();
    request.current = controller;

    const sent: ChatMessage[] = [
      ...messages,
      { role: "user", content: question },
    ];
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
      setStatus("idle");
      return true;
    } catch {
      // The visitor has left, so there's nobody to tell.
      if (controller.signal.aborted) return false;

      // A partial answer can't stay: it would look complete and go back to the
      // model in the next request.
      setMessages(messages);
      setStatus("failed");
      return false;
    } finally {
      request.current = null;
    }
  }

  return { messages, status, send };
}
