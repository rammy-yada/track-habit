// Sound for the Winter Arc intro. The built-in sounds are made on the spot
// with the Web Audio API — no files to download, nothing to license. An
// admin's own uploaded sound is simply played from the start of the scene.
//
// Browsers only allow sound after the person has tapped or clicked something
// on the page. When that hasn't happened yet the scene just plays silently.

import type { Sound } from "./arc-config";

const MUTE_KEY = "habitflow:arc-sound";

export function soundMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "off";
  } catch {
    return false;
  }
}

export function setSoundMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, muted ? "off" : "on");
  } catch {}
}

export type IntroSound = { start(): void; ignite(): void; title(): void; stop(): void };
const SILENT: IntroSound = { start() {}, ignite() {}, title() {}, stop() {} };

type WindowWithAudio = Window & { webkitAudioContext?: typeof AudioContext };

export function createIntroSound(kind: Sound, customUrl: string | null): IntroSound {
  if (kind === "none" || typeof window === "undefined") return SILENT;

  if (kind === "custom") {
    if (!customUrl) return SILENT;
    const audio = new Audio(customUrl);
    audio.preload = "auto";
    let fade: ReturnType<typeof setInterval> | undefined;
    return {
      start() {
        clearInterval(fade);
        audio.currentTime = 0;
        audio.volume = 0.9;
        audio.play().catch(() => {}); // not allowed yet: stay silent
      },
      ignite() {},
      title() {},
      stop() {
        // fade out rather than cutting off mid-note
        clearInterval(fade);
        fade = setInterval(() => {
          if (audio.volume > 0.08) audio.volume -= 0.08;
          else {
            audio.pause();
            clearInterval(fade);
          }
        }, 40);
      },
    };
  }

  const Ctor = window.AudioContext ?? (window as WindowWithAudio).webkitAudioContext;
  if (!Ctor) return SILENT;
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  const live: AudioScheduledSourceNode[] = [];

  const ready = () => {
    if (!ctx) {
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = 0.8;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});
    return ctx;
  };

  /** One tone that slides from one pitch to another and dies away. */
  function tone(type: OscillatorType, from: number, to: number, at: number, length: number, volume: number) {
    const c = ready();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, c.currentTime + at);
    osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), c.currentTime + at + length);
    gain.gain.setValueAtTime(0.0001, c.currentTime + at);
    gain.gain.exponentialRampToValueAtTime(volume, c.currentTime + at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + at + length);
    osc.connect(gain).connect(master!);
    osc.start(c.currentTime + at);
    osc.stop(c.currentTime + at + length + 0.05);
    live.push(osc);
  }

  /** A burst of filtered noise: the "crack" on top of a hit. */
  function noise(at: number, length: number, volume: number, cutoff: number) {
    const c = ready();
    const buffer = c.createBuffer(1, Math.ceil(c.sampleRate * length), c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const source = c.createBufferSource();
    source.buffer = buffer;
    const filter = c.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    const gain = c.createGain();
    gain.gain.value = volume;
    source.connect(filter).connect(gain).connect(master!);
    source.start(c.currentTime + at);
    live.push(source);
  }

  const boom = () => {
    tone("sine", 130, 34, 0, 1.1, 0.95);
    tone("triangle", 260, 60, 0, 0.5, 0.35);
    noise(0, 0.4, 0.5, 900);
  };
  const thump = (at: number) => {
    tone("sine", 70, 42, at, 0.16, 0.8);
    tone("sine", 62, 38, at + 0.24, 0.18, 0.55);
  };

  return {
    start() {
      try {
        ready();
        if (kind === "rise") {
          tone("sawtooth", 70, 620, 0, 2.3, 0.14);
          noise(1.2, 1.1, 0.12, 2400);
        }
        if (kind === "heartbeat") {
          thump(0.25);
          thump(1.3);
        }
      } catch {}
    },
    ignite() {
      try {
        boom();
      } catch {}
    },
    title() {
      try {
        tone("triangle", 440, 440, 0, 0.9, 0.22);
        tone("triangle", 660, 660, 0.12, 1.1, 0.18);
      } catch {}
    },
    stop() {
      for (const node of live.splice(0)) {
        try {
          node.stop();
        } catch {}
      }
    },
  };
}
