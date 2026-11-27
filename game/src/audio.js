// Synthesised engine sound: a low oscillator hum whose pitch follows
// the throttle, plus short chimes for rings and landings. No audio files;
// everything is made by WebAudio at run time, and it only starts after
// a player gesture (browsers block audio before that).
export function createAudio() {
  let ctx = null;
  let hum = null;
  let humGain = null;
  let muted = false;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      hum = ctx.createOscillator();
      hum.type = 'sawtooth';
      hum.frequency.value = 55;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 320;
      humGain = ctx.createGain();
      humGain.gain.value = 0;
      hum.connect(filter).connect(humGain).connect(ctx.destination);
      hum.start();
      return true;
    } catch {
      return false;
    }
  }

  function blip(freq, seconds, volume, when = 0) {
    if (!ctx || muted) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + when;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(volume, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + seconds);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + seconds + 0.05);
    } catch {
      /* sound is decoration; a failure never stops the game */
    }
  }

  return {
    // Call from the start button / first keypress.
    start() {
      if (!ensure()) return;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      if (humGain) humGain.gain.setTargetAtTime(muted ? 0 : 0.045, ctx.currentTime, 0.2);
    },
    setThrottle(throttle, speed01) {
      if (!ctx || !hum || muted) return;
      hum.frequency.setTargetAtTime(48 + throttle * 70 + speed01 * 25, ctx.currentTime, 0.1);
    },
    stopHum() {
      if (ctx && humGain) humGain.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
    },
    ring() {
      blip(880, 0.25, 0.16);
      blip(1318, 0.35, 0.12, 0.09);
    },
    land() {
      blip(523, 0.3, 0.15);
      blip(659, 0.3, 0.15, 0.12);
      blip(784, 0.5, 0.15, 0.24);
    },
    crash() {
      blip(160, 0.5, 0.2);
      blip(90, 0.7, 0.18, 0.1);
    },
    toggleMute() {
      muted = !muted;
      if (ctx && humGain) humGain.gain.setTargetAtTime(muted ? 0 : 0.045, ctx.currentTime, 0.1);
      return muted;
    },
    get muted() {
      return muted;
    },
  };
}
