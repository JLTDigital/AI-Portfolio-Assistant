"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";

import { AgentAvatar } from "@/components/agent/AgentAvatar";
import type { AgentState } from "@/components/agent/AgentAvatar";
import { MAX_USER_CHARS } from "@/lib/chat/limits";

import { SignalPanel } from "./SignalPanel";
import { SuggestedQuestions } from "./SuggestedQuestions";
import type { useChat } from "./use-chat";
import { useTypedAnswer } from "./use-typed-answer";

const FOLLOW_DISTANCE_PX = 48;

interface ChatProps {
  chat: ReturnType<typeof useChat>;
  connected: boolean;
  closing: boolean;
  onEnd: () => void;
}

export function Chat({ chat, connected, closing, onEnd }: ChatProps) {
  const { messages, status, signalLost, callEnded, send, retry } = chat;
  const [input, setInput] = useState("");
  const transcript = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const wasLocked = useRef(false);
  const following = useRef(true);
  const lastScrollTop = useRef(0);

  const { shownLength, typing } = useTypedAnswer(messages);
  const answering = status === "thinking" || status === "streaming" || typing;
  const ended = callEnded && !typing;
  const locked = signalLost || ended;

  // Thinking comes first because Retry runs while signalLost is still true.
  let agentState: AgentState = "idle";
  if (status === "thinking") agentState = "thinking";
  else if (status === "streaming" || typing) agentState = "speaking";
  else if (locked) agentState = "signal-lost";

  // Announced once, because the transcript itself isn't live: typing it out
  // would read each character. A failed Retry is left to the panel's alert.
  const last = messages[messages.length - 1];
  let announcement = "";
  if (status === "thinking" && !signalLost) announcement = "Agent is thinking";
  else if (!answering && last?.role === "assistant") {
    announcement = last.content;
  }

  // The intro screen that held focus has just unmounted.
  useEffect(() => {
    if (connected) transcript.current?.focus();
  }, [connected]);

  // The panel takes height from the transcript, so its arrival also scrolls.
  useEffect(() => {
    if (locked) following.current = true;
  }, [locked]);

  useEffect(() => {
    const element = transcript.current;
    if (element && following.current) element.scrollTop = element.scrollHeight;
  }, [messages, status, locked, shownLength]);

  useEffect(() => {
    if (wasLocked.current && !locked) field.current?.focus();
    wasLocked.current = locked;
  }, [locked]);

  // An arrow key moves less than the follow distance, so any upward move lets
  // go unless it only came from the content or the transcript resizing.
  function handleScroll() {
    const element = transcript.current;
    if (!element) return;

    const distance =
      element.scrollHeight - element.scrollTop - element.clientHeight;
    const movedUp = element.scrollTop < lastScrollTop.current;
    following.current = distance < (movedUp ? 1 : FOLLOW_DISTANCE_PX);
    lastScrollTop.current = element.scrollTop;
  }

  function submit() {
    const question = input.trim();
    if (!question || answering || locked) return;

    setInput("");
    field.current?.focus();
    following.current = true;
    send(question);
  }

  // The chip is about to unmount, which would drop focus to the body. The
  // transcript takes it because focusing the input opens the mobile keyboard.
  function askSuggested(question: string) {
    transcript.current?.focus();
    following.current = true;
    send(question);
  }

  function endCall() {
    setInput("");
    onEnd();
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
    <main
      inert={closing}
      className={`mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col p-4 text-lg font-medium sm:p-6 ${connected ? "motion-safe:[&>:not([data-agent-avatar])]:animate-chat-in" : "invisible"} ${closing ? "animate-call-collapse" : ""}`}
    >
      <p aria-hidden="true" className="text-xs text-alert">
        CHANNEL_HOLO_CALL
      </p>
      <div className="flex items-stretch gap-2">
        <div className="cut-sm min-w-0 flex-1 bg-frame p-px">
          <h1
            aria-label="Holo call with Agent"
            className="cut-sm bg-panel-from px-3 py-1 text-xl font-semibold text-accent sm:text-2xl"
          >
            HOLO CALL // AGENT
          </h1>
        </div>
        <button
          type="button"
          onClick={endCall}
          className="min-h-11 shrink-0 border border-amber px-3 text-base font-semibold text-amber hover:bg-amber hover:text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:px-4"
        >
          END CALL
        </button>
      </div>

      <AgentAvatar state={agentState} materialise={connected} />

      <p aria-hidden="true" className="mt-2 ml-5 text-xs text-alert sm:ml-6">
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
            role="region"
            aria-label="Conversation with Agent"
            tabIndex={0}
            onScroll={handleScroll}
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
                    {index === messages.length - 1
                      ? message.content.slice(0, shownLength)
                      : message.content}
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

          <p role="status" className="sr-only">
            {announcement}
          </p>

          {locked && (
            <SignalPanel
              key={ended ? "ended" : "lost"}
              ended={ended}
              retrying={answering}
              onRetry={retry}
            />
          )}

          {messages.length === 0 && (
            <SuggestedQuestions onSelect={askSuggested} />
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
              disabled={locked}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message Agent"
              className="min-w-0 flex-1 resize-none border border-line bg-background/60 p-2 placeholder:text-muted focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:border-frame/60"
            />
            <button
              type="submit"
              disabled={answering || locked || !input.trim()}
              className="border border-amber px-4 text-base font-semibold text-amber hover:bg-amber hover:text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:border-line disabled:text-muted disabled:hover:bg-transparent disabled:hover:text-muted"
            >
              SEND
            </button>
          </form>
        </div>
      </div>

      <p aria-hidden="true" className="ml-5 text-xs text-alert sm:ml-6">
        [ LINK: {ended ? "CLOSED" : signalLost ? "LOST" : "STABLE"} ]
      </p>
    </main>
  );
}
