"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";

import { MAX_USER_CHARS } from "@/lib/chat/limits";

import { useChat } from "./use-chat";

export function Chat() {
  const { messages, status, send } = useChat();
  const [input, setInput] = useState("");
  const transcript = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);

  const answering = status === "thinking" || status === "streaming";

  useEffect(() => {
    const element = transcript.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages, status]);

  async function submit() {
    const question = input.trim();
    if (!question || answering) return;

    setInput("");
    field.current?.focus();

    // Anything typed while waiting is newer, so it isn't overwritten.
    const answered = await send(question);
    if (!answered) setInput((draft) => (draft.trim() ? draft : question));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;
    if (event.nativeEvent.isComposing) return;

    event.preventDefault();
    submit();
  }

  return (
    <main className="mx-auto flex h-dvh w-full max-w-4xl flex-col p-4 text-lg font-medium sm:p-6">
      <p aria-hidden="true" className="text-xs text-alert">
        CHANNEL_HOLO_CALL
      </p>
      <div className="cut-sm bg-frame p-px">
        <h1 className="cut-sm bg-panel-from px-3 py-1 text-xl font-semibold text-accent sm:text-2xl">
          HOLO CALL // AGENT
        </h1>
      </div>

      <p aria-hidden="true" className="mt-4 ml-5 text-xs text-alert sm:ml-6">
        SECURE_LINK( AgentTransmission )
      </p>
      <div className="relative flex min-h-0 flex-1 pl-3 sm:pl-4">
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-3 border-y-2 border-l-2 border-frame sm:w-4"
        />

        <div className="cut-lg flex min-w-0 flex-1 flex-col gap-3 bg-linear-to-br from-panel-from to-panel-to p-3 pb-6 sm:gap-4 sm:p-6 sm:pb-8">
          <div
            ref={transcript}
            role="log"
            aria-label="Conversation with Agent"
            aria-busy={answering}
            tabIndex={0}
            className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-1 focus-visible:outline-2 focus-visible:outline-accent"
          >
            {messages.length === 0 && (
              <p className="my-auto border border-line p-3 text-center">
                Agent is on the line. Ask about Jonathan&apos;s experience.
              </p>
            )}

            {messages.map((message, index) =>
              message.role === "user" ? (
                <div key={index} className="ml-auto max-w-[85%]">
                  <p className="text-right text-sm font-semibold text-amber">
                    YOU
                  </p>
                  <p className="wrap-anywhere whitespace-pre-wrap text-amber">
                    {message.content}
                  </p>
                </div>
              ) : (
                <div key={index} className="max-w-[85%]">
                  <p className="text-sm font-semibold text-muted">AGENT</p>
                  <p className="wrap-anywhere whitespace-pre-wrap [text-shadow:0_0_12px_var(--glow)] motion-reduce:[text-shadow:none]">
                    {message.content}
                  </p>
                </div>
              ),
            )}

            {status === "thinking" && (
              <p className="animate-pulse text-base text-muted motion-reduce:animate-none">
                AGENT IS THINKING…
              </p>
            )}
          </div>

          {status === "failed" && (
            <p role="alert" className="text-base text-alert">
              Transmission failed. Try again.
            </p>
          )}

          <form onSubmit={handleSubmit} className="flex items-stretch gap-2">
            <label htmlFor="chat-input" className="sr-only">
              Message Agent
            </label>
            <textarea
              ref={field}
              id="chat-input"
              rows={2}
              value={input}
              maxLength={MAX_USER_CHARS}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message Agent"
              className="min-w-0 flex-1 resize-none border border-line bg-background/60 p-2 placeholder:text-muted focus-visible:outline-2 focus-visible:outline-accent"
            />
            <button
              type="submit"
              disabled={answering || !input.trim()}
              className="border border-amber px-4 text-base font-semibold text-amber hover:bg-amber hover:text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:border-line disabled:text-muted disabled:hover:bg-transparent disabled:hover:text-muted"
            >
              SEND
            </button>
          </form>
        </div>
      </div>

      <p aria-hidden="true" className="ml-5 text-xs text-alert sm:ml-6">
        [ LINK: STABLE ]
      </p>
    </main>
  );
}
