"use client";

import { useSyncExternalStore } from "react";

export type AvatarMode = "orb" | "lite" | "full";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const SMALL_DEVICE = "(pointer: coarse), (max-width: 639px)";
const LOW_POWER_CORES = 2;

let webGLAvailable: boolean | undefined;

function hasWebGL() {
  if (webGLAvailable === undefined) {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    webGLAvailable = context !== null;
    context?.getExtension("WEBGL_lose_context")?.loseContext();
  }
  return webGLAvailable;
}

function subscribe(onChange: () => void) {
  const query = matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getMode(): AvatarMode {
  if (matchMedia(REDUCED_MOTION).matches || !hasWebGL()) return "orb";

  const lowPower = navigator.hardwareConcurrency <= LOW_POWER_CORES;
  return lowPower || matchMedia(SMALL_DEVICE).matches ? "lite" : "full";
}

/** Chooses how much of the avatar this device should run. */
export function useAvatarMode() {
  return useSyncExternalStore<AvatarMode>(subscribe, getMode, () => "orb");
}
