"use client";

import { useEffect, useRef, useState } from "react";

const VOLUME = 0.3;

type Sounds = { ringtone: HTMLAudioElement; connect: HTMLAudioElement };

function createSound(src: string) {
  const sound = new Audio(src);
  sound.volume = VOLUME;
  return sound;
}

function createSounds(): Sounds {
  const ringtone = createSound("/sounds/ringtone.mp3");
  ringtone.loop = true;
  return { ringtone, connect: createSound("/sounds/connect.mp3") };
}

function play(sound: HTMLAudioElement) {
  // Sound is optional, so the call carries on silently if it can't play.
  sound.play().catch(() => {});
}

function stop(sound: HTMLAudioElement) {
  sound.pause();
  sound.currentTime = 0;
}

/** Optional call sounds, off until the visitor turns them on. */
export function useCallSounds(ringing: boolean) {
  const [enabled, setEnabled] = useState(false);
  const sounds = useRef<Sounds | null>(null);

  useEffect(() => {
    const ringtone = sounds.current?.ringtone;
    if (!ringing || !enabled || !ringtone) return;

    play(ringtone);
    return () => stop(ringtone);
  }, [ringing, enabled]);

  function toggle() {
    // Created on the click, so muted visitors never download the files.
    if (!enabled) sounds.current ??= createSounds();
    else if (sounds.current) stop(sounds.current.connect);

    setEnabled(!enabled);
  }

  function playConnect() {
    if (enabled && sounds.current) play(sounds.current.connect);
  }

  return { enabled, toggle, playConnect };
}
