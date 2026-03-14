// ─── Sound Effects (Web Audio API) ──────────────────────────────────────────

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

export function playGrab() {
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.2);
}

export function playCombo() {
  const ctx = getCtx();
  if (!ctx) return;
  [0, 0.08, 0.16].forEach((delay, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = [523, 659, 784][i];
    gain.gain.setValueAtTime(0.15, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + 0.15);
  });
}

export function playMegaCombo() {
  const ctx = getCtx();
  if (!ctx) return;
  [0, 0.06, 0.12, 0.18, 0.24].forEach((delay, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = [523, 659, 784, 988, 1175][i];
    gain.gain.setValueAtTime(0.12, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + 0.12);
  });
}

export function playFart() {
  const ctx = getCtx();
  if (!ctx) return;
  const duration = 0.15 + Math.random() * 0.25;
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let val = 0;
  for (let i = 0; i < bufferSize; i++) {
    val += (Math.random() * 2 - 1) * 0.1;
    val = Math.max(-1, Math.min(1, val));
    const env = Math.exp(-i / (bufferSize * 0.3));
    data[i] = val * env;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 150 + Math.random() * 100;
  filter.Q.value = 2;
  const gain = ctx.createGain();
  gain.gain.value = 0.6;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start();
}

export function playBigFart() {
  const ctx = getCtx();
  if (!ctx) return;
  const duration = 0.4 + Math.random() * 0.3;
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let val = 0;
  for (let i = 0; i < bufferSize; i++) {
    val += (Math.random() * 2 - 1) * 0.15;
    val = Math.max(-1, Math.min(1, val));
    const wobble = Math.sin(i / (ctx.sampleRate * 0.02)) * 0.3;
    const env = Math.exp(-i / (bufferSize * 0.5));
    data[i] = (val + wobble * val) * env;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 100 + Math.random() * 80;
  filter.Q.value = 5;
  const gain = ctx.createGain();
  gain.gain.value = 0.8;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start();
}

export function playBuzz() {
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.value = 80;
  gain.gain.setValueAtTime(0.25, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.3);
}

export function playMiss() {
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(400, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(150, ctx.currentTime + 0.4);
  gain.gain.setValueAtTime(0.25, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.4);
}

export function playGameOver() {
  const ctx = getCtx();
  if (!ctx) return;
  [0, 0.15, 0.3, 0.45].forEach((delay, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = [392, 330, 262, 196][i];
    gain.gain.setValueAtTime(0.2, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + 0.2);
  });
  setTimeout(() => playBigFart(), 650);
}

export function playSiren() {
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(900, ctx.currentTime + 0.3);
  osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.6);
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.6);
}

export function playPowerup() {
  const ctx = getCtx();
  if (!ctx) return;
  [0, 0.05, 0.1, 0.15].forEach((delay, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = [440, 554, 659, 880][i];
    gain.gain.setValueAtTime(0.2, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + 0.15);
  });
}

export function playMamaStep() {
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 60 + Math.random() * 30;
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.1);
}

export function vibrate(ms: number) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(ms);
  }
}
