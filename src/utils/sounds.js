// Web Audio API sound manager — no library needed
const AudioContext = window.AudioContext || window.webkitAudioContext;
let ctx = null;

function getCtx() {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function playTone(frequency, type = 'sine', duration = 0.15, volume = 0.3) {
  try {
    const ac = getCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.frequency.value = frequency;
    osc.type = type;
    gain.gain.setValueAtTime(volume, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + duration);
  } catch (e) { /* silent fail */ }
}

export const sounds = {
  cash: () => { playTone(880, 'sine', 0.1, 0.2); setTimeout(() => playTone(1100, 'sine', 0.15, 0.15), 80); },
  error: () => playTone(220, 'sawtooth', 0.3, 0.2),
  alert: () => { playTone(660, 'square', 0.1, 0.3); setTimeout(() => playTone(660, 'square', 0.1, 0.3), 200); },
  levelUp: () => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => playTone(f, 'sine', 0.2, 0.4), i * 100)); },
  click: () => playTone(800, 'sine', 0.05, 0.1),
  raid: () => { playTone(330, 'sawtooth', 0.05, 0.4); setTimeout(() => playTone(220, 'sawtooth', 0.4, 0.4), 60); },
  notification: () => { playTone(1046, 'sine', 0.08, 0.2); setTimeout(() => playTone(1318, 'sine', 0.12, 0.2), 100); },
};