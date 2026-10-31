"use client";

import { useEffect, useRef } from "react";

export function Connecting() {
  const heading = useRef<HTMLHeadingElement>(null);

  // Accept has just unmounted, which would otherwise drop focus to the body.
  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <main className="fixed inset-0 flex items-center justify-center p-4">
      <div
        aria-hidden="true"
        className="signal-static fixed inset-0 animate-connect-static motion-reduce:animate-none"
      />
      <h1
        ref={heading}
        tabIndex={-1}
        className="relative animate-rgb-split text-center text-2xl font-semibold text-accent outline-none motion-reduce:animate-none sm:text-3xl"
      >
        CONNECTING…
        <span className="block text-base text-muted sm:text-lg">
          ENCRYPTED LINK ESTABLISHED
        </span>
      </h1>
    </main>
  );
}
