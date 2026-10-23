export type NocteCue = "deal" | "chip" | "reveal";
let context: AudioContext | null = null;

/** Creates short synthesized cues locally; no media files or third-party assets are loaded. */
export async function activateNocteAudio(): Promise<boolean> {
  if (typeof window === "undefined" || !("AudioContext" in window)) return false;
  context ??= new AudioContext();
  try {
    if (context.state === "suspended") await context.resume();
    return context.state === "running";
  } catch {
    return false;
  }
}

export async function deactivateNocteAudio(): Promise<void> {
  if (context?.state === "running") {
    try { await context.suspend(); } catch { /* A suspended context is already effectively muted. */ }
  }
}

export function playNocteCue(cue: NocteCue, volume: number): void {
  if (!context || context.state !== "running" || volume <= 0) return;
  const now = context.currentTime;
  const notes = cue === "deal" ? [440, 330] : cue === "chip" ? [880] : [392, 587];
  for (const [index, frequency] of notes.entries()) {
    const start = now + index * 0.055;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = cue === "chip" ? "triangle" : "sine";
    oscillator.frequency.setValueAtTime(frequency, start);
    if (cue === "deal") oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.72, start + 0.07);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, Math.min(volume, 1) * 0.075), start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + (cue === "reveal" ? 0.23 : 0.11));
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + (cue === "reveal" ? 0.24 : 0.12));
  }
}
