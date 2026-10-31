"use client";

import { useEffect, useRef } from "react";

import { ContactLinks, DETAILS } from "./ContactLinks";

export function CallEnded({ onCallAgain }: { onCallAgain: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);

  // The chat that held focus has just gone invisible.
  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <main className="fixed inset-x-4 top-1/2 mx-auto max-w-sm -translate-y-1/2 animate-card-fade motion-reduce:animate-none">
      <div className="cut-lg bg-frame p-px">
        <div className="cut-lg flex flex-col gap-4 bg-linear-to-br from-panel-from to-panel-to p-5 pb-8">
          <p aria-hidden="true" className="text-xs text-alert">
            VELIN NETWORK
          </p>

          <h1
            ref={heading}
            tabIndex={-1}
            className="text-3xl font-semibold text-alert outline-none"
          >
            CALL ENDED
          </h1>

          <p className="text-lg font-medium">{DETAILS}</p>

          <div className="flex flex-wrap gap-2 pr-3">
            <ContactLinks />
          </div>

          <button
            type="button"
            onClick={onCallAgain}
            className="min-h-12 border border-amber px-4 text-xl font-semibold text-amber hover:bg-amber hover:text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            CALL AGAIN
          </button>
        </div>
      </div>
    </main>
  );
}
