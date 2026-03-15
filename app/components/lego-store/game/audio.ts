/**
 * Web Audio API sound effects for LEGO Store game
 * All sounds synthesized — no external audio files needed
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

/** Cash register "ka-ching" sound */
export function playRegister(): void {
  try {
    const ac = getCtx();
    const t = ac.currentTime;

    // High pitched "ding"
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(1800, t + 0.05);
    osc.frequency.exponentialRampToValueAtTime(2400, t + 0.1);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.connect(gain).connect(ac.destination);
    osc.start(t);
    osc.stop(t + 0.3);

    // "Click" transient
    const osc2 = ac.createOscillator();
    const gain2 = ac.createGain();
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(800, t);
    gain2.gain.setValueAtTime(0.1, t);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc2.connect(gain2).connect(ac.destination);
    osc2.start(t);
    osc2.stop(t + 0.05);
  } catch {
    // Audio not available
  }
}

/** Door bell "ding-dong" when store opens / customer enters */
export function playDoorBell(): void {
  try {
    const ac = getCtx();
    const t = ac.currentTime;

    // Ding
    const osc1 = ac.createOscillator();
    const gain1 = ac.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, t);
    gain1.gain.setValueAtTime(0.12, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc1.connect(gain1).connect(ac.destination);
    osc1.start(t);
    osc1.stop(t + 0.4);

    // Dong (lower, delayed)
    const osc2 = ac.createOscillator();
    const gain2 = ac.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(660, t + 0.15);
    gain2.gain.setValueAtTime(0, t);
    gain2.gain.setValueAtTime(0.12, t + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    osc2.connect(gain2).connect(ac.destination);
    osc2.start(t + 0.15);
    osc2.stop(t + 0.6);
  } catch {
    // Audio not available
  }
}

/** Notification / success sound */
export function playNotification(): void {
  try {
    const ac = getCtx();
    const t = ac.currentTime;

    const notes = [523, 659, 784]; // C5, E5, G5
    notes.forEach((freq, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + i * 0.08);
      gain.gain.setValueAtTime(0, t);
      gain.gain.setValueAtTime(0.1, t + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.2);
      osc.connect(gain).connect(ac.destination);
      osc.start(t + i * 0.08);
      osc.stop(t + i * 0.08 + 0.2);
    });
  } catch {
    // Audio not available
  }
}

/** Game over — descending sad tones */
export function playGameOver(): void {
  try {
    const ac = getCtx();
    const t = ac.currentTime;

    const notes = [440, 392, 349, 294]; // A4, G4, F4, D4
    notes.forEach((freq, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + i * 0.25);
      gain.gain.setValueAtTime(0, t);
      gain.gain.setValueAtTime(0.15, t + i * 0.25);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.25 + 0.5);
      osc.connect(gain).connect(ac.destination);
      osc.start(t + i * 0.25);
      osc.stop(t + i * 0.25 + 0.5);
    });
  } catch {
    // Audio not available
  }
}

/** Milestone achievement jingle */
export function playMilestone(): void {
  try {
    const ac = getCtx();
    const t = ac.currentTime;

    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + i * 0.12);
      gain.gain.setValueAtTime(0, t);
      gain.gain.setValueAtTime(0.12, t + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.4);
      osc.connect(gain).connect(ac.destination);
      osc.start(t + i * 0.12);
      osc.stop(t + i * 0.12 + 0.4);
    });
  } catch {
    // Audio not available
  }
}
