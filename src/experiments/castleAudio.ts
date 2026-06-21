export type CastleSound = "correct" | "wrong" | "summon" | "power" | "bolt" | "victory" | "defeat";

let audioContext: AudioContext | null = null;

const NOTES: Record<CastleSound, Array<{ frequency: number; at: number; duration: number; gain: number; type?: OscillatorType }>> = {
  correct: [
    { frequency: 523, at: 0, duration: 0.09, gain: 0.035 },
    { frequency: 659, at: 0.08, duration: 0.12, gain: 0.03 },
  ],
  wrong: [
    { frequency: 220, at: 0, duration: 0.14, gain: 0.026, type: "triangle" },
    { frequency: 185, at: 0.1, duration: 0.16, gain: 0.022, type: "triangle" },
  ],
  summon: [
    { frequency: 180, at: 0, duration: 0.06, gain: 0.04 },
    { frequency: 360, at: 0.04, duration: 0.12, gain: 0.03 },
  ],
  power: [
    { frequency: 392, at: 0, duration: 0.09, gain: 0.03, type: "triangle" },
    { frequency: 587, at: 0.07, duration: 0.12, gain: 0.03, type: "triangle" },
    { frequency: 784, at: 0.14, duration: 0.14, gain: 0.025, type: "triangle" },
  ],
  bolt: [
    { frequency: 330, at: 0, duration: 0.1, gain: 0.035, type: "sawtooth" },
    { frequency: 660, at: 0.08, duration: 0.16, gain: 0.03, type: "triangle" },
  ],
  victory: [
    { frequency: 523, at: 0, duration: 0.13, gain: 0.03 },
    { frequency: 659, at: 0.12, duration: 0.13, gain: 0.03 },
    { frequency: 784, at: 0.24, duration: 0.22, gain: 0.035 },
  ],
  defeat: [
    { frequency: 294, at: 0, duration: 0.18, gain: 0.025, type: "triangle" },
    { frequency: 247, at: 0.16, duration: 0.22, gain: 0.022, type: "triangle" },
  ],
};

export function playCastleSound(sound: CastleSound, enabled: boolean) {
  if (!enabled || typeof window === "undefined" || !window.AudioContext) return;
  try {
    audioContext ||= new window.AudioContext();
    void audioContext.resume();
    const now = audioContext.currentTime;
    for (const note of NOTES[sound]) {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = note.type || "sine";
      oscillator.frequency.setValueAtTime(note.frequency, now + note.at);
      gain.gain.setValueAtTime(0.0001, now + note.at);
      gain.gain.exponentialRampToValueAtTime(note.gain, now + note.at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + note.at + note.duration);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(now + note.at);
      oscillator.stop(now + note.at + note.duration + 0.02);
    }
  } catch {
    // Optional audio should never interrupt study.
  }
}
