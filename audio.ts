import {Platform} from 'react-native';
import Sound from 'react-native-sound';

export const MUSIC_VOLUME = {
  splash: 0.85,
  home: 0.78,
  gameplay: 0.34,
  muted: 0,
} as const;

export const FADE_OUT_MS = 400;
export const FADE_IN_MS = 550;
export const CROSSFADE_MS = 800;

let fadeTimer: ReturnType<typeof setInterval> | null = null;

/** Call once at app start — required for reliable iOS playback. */
export function initAudioSession() {
  Sound.setCategory('Playback');
  if (Platform.OS === 'ios') {
    Sound.setActive(true);
  }
}

export function cancelMusicFade() {
  if (fadeTimer) {
    clearInterval(fadeTimer);
    fadeTimer = null;
  }
}

function easeInOut(t: number): number {
  return t * t * (3 - 2 * t);
}

export function fadeSoundVolume(
  sound: Sound | null,
  fromVolume: number,
  toVolume: number,
  durationMs: number,
  onComplete?: () => void,
) {
  cancelMusicFade();
  if (!sound?.isLoaded()) {
    onComplete?.();
    return;
  }
  const steps = Math.max(6, Math.round(durationMs / 45));
  const stepMs = durationMs / steps;
  let step = 0;
  sound.setVolume(fromVolume);
  fadeTimer = setInterval(() => {
    step += 1;
    const t = Math.min(1, step / steps);
    const next = fromVolume + (toVolume - fromVolume) * easeInOut(t);
    sound.setVolume(Math.max(0, Math.min(1, next)));
    if (step >= steps) {
      cancelMusicFade();
      onComplete?.();
    }
  }, stepMs);
}

/** Start a looping track immediately (do not use play()'s callback on iOS — it fires on end). */
export function startLoopingTrack(sound: Sound, volume: number) {
  sound.setVolume(volume);
  sound.play();
}

export function crossfadeTracks(
  outgoing: Sound | null,
  outgoingVolume: number,
  incoming: Sound | null,
  incomingVolume: number,
  durationMs: number,
  onComplete?: () => void,
) {
  cancelMusicFade();
  if (!incoming?.isLoaded()) {
    outgoing?.stop();
    return;
  }

  const outStart = outgoing?.isLoaded() ? outgoingVolume : 0;
  startLoopingTrack(incoming, 0);

  const steps = Math.max(6, Math.round(durationMs / 45));
  const stepMs = durationMs / steps;
  let step = 0;

  fadeTimer = setInterval(() => {
    step += 1;
    const t = Math.min(1, step / steps);
    const eased = easeInOut(t);
    incoming.setVolume(incomingVolume * eased);
    if (outgoing?.isLoaded()) {
      outgoing.setVolume(outStart * (1 - eased));
    }
    if (step >= steps) {
      cancelMusicFade();
      outgoing?.stop();
      incoming.setVolume(incomingVolume);
      onComplete?.();
    }
  }, stepMs);
}
