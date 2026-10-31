"use client";

import { useEffect, useRef } from "react";

const LINKS = [
  { label: "PORTFOLIO", href: process.env.NEXT_PUBLIC_PORTFOLIO_URL },
  { label: "LINKEDIN", href: process.env.NEXT_PUBLIC_LINKEDIN_URL },
];

const DETAILS =
  "You can find Jonathan's full details on his portfolio or LinkedIn.";

const CONTROL =
  "border border-amber px-4 py-1 text-base font-semibold text-amber hover:bg-amber hover:text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

interface SignalPanelProps {
  ended: boolean;
  retrying: boolean;
  onRetry: () => void;
}

/** Pre-written, so it still works when no LLM is available. */
export function SignalPanel({ ended, retrying, onRetry }: SignalPanelProps) {
  const panel = useRef<HTMLDivElement>(null);

  // Disabling the input would otherwise drop keyboard focus.
  useEffect(() => panel.current?.focus(), []);

  return (
    <div className="cut-sm shrink-0 bg-frame p-px">
      <div
        ref={panel}
        tabIndex={-1}
        className="cut-sm signal-static flex flex-col gap-3 bg-panel-from p-3 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
      >
        <div role="alert">
          {retrying ? (
            <p className="text-xl font-semibold text-alert">RECONNECTING…</p>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-alert">
                {ended ? "CALL ENDED" : "SIGNAL LOST"}
              </h2>
              <p>
                {ended
                  ? "This call has reached its limit."
                  : "Agent's bandwidth is maxed out for now."}{" "}
                {DETAILS}
              </p>
              {!ended && (
                <p className="text-base text-muted">Try again later.</p>
              )}
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-2 pr-3">
          {!ended && (
            <button
              type="button"
              aria-disabled={retrying}
              onClick={onRetry}
              className={`${CONTROL} aria-disabled:cursor-not-allowed aria-disabled:border-line aria-disabled:text-muted aria-disabled:hover:bg-transparent aria-disabled:hover:text-muted`}
            >
              RETRY
            </button>
          )}
          {LINKS.map(
            ({ label, href }) =>
              href && (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={CONTROL}
                >
                  {label}
                </a>
              ),
          )}
        </div>
      </div>
    </div>
  );
}
