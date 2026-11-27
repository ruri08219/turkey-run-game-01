// Synthesized sound only: WebAudio oscillators and noise, no audio files and no
// network. The context is created on the first user gesture (a key press or a
// click), so browsers never block it; M toggles mute.

export function createAudio() {
  let ctx = null;
  let muted = false;
  let master = null;

  function ensure() {
    if (ctx !== null) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch {
      ctx = null;
    }
    return ctx;
  }

  function unlock() {
    const c = ensure();
    if (c && c.state === 'suspended') c.resume().catch(() => {});
  }

  function tone(freq, dur, type, vol, slideTo, delay) {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    const t0 = c.currentTime + (delay || 0);
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol || 0.2, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noiseBurst(dur, vol, delay) {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    const t0 = c.currentTime + (delay || 0);
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buffer = c.createBuffer(1, len, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buffer;
    const gain = c.createGain();
    gain.gain.setValueAtTime(vol || 0.25, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
  }

  return {
    unlock,
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    click() {
      tone(660, 0.07, 'triangle', 0.15);
    },
    /** The turkey's gobble: four quick low blips, pitch dropping. */
    gobble() {
      tone(320, 0.09, 'square', 0.16, 180);
      tone(300, 0.09, 'square', 0.16, 170, 0.1);
      tone(280, 0.09, 'square', 0.16, 160, 0.2);
      tone(240, 0.16, 'square', 0.18, 120, 0.3);
    },
    flap() {
      noiseBurst(0.12, 0.12);
      tone(500, 0.1, 'sine', 0.08, 700);
    },
    pickup() {
      tone(880, 0.09, 'sine', 0.2);
      tone(1318, 0.14, 'sine', 0.2, null, 0.08);
    },
    dodge() {
      tone(520, 0.06, 'triangle', 0.08, 760);
    },
    /** The farmer spotted the turkey: two sharp sawtooth stabs. */
    spotted() {
      tone(196, 0.16, 'sawtooth', 0.22, 180);
      tone(262, 0.2, 'sawtooth', 0.22, 240, 0.15);
    },
    hit() {
      noiseBurst(0.25, 0.3);
      tone(220, 0.3, 'sawtooth', 0.22, 70);
    },
    sizzle() {
      noiseBurst(0.4, 0.14);
    },
    stageClear() {
      tone(523, 0.12, 'triangle', 0.2);
      tone(659, 0.12, 'triangle', 0.2, null, 0.11);
      tone(784, 0.2, 'triangle', 0.22, null, 0.22);
    },
    win() {
      const notes = [523, 659, 784, 1046, 784, 1046];
      notes.forEach((n, i) => tone(n, 0.18, 'triangle', 0.2, null, i * 0.13));
      tone(1318, 0.5, 'triangle', 0.2, null, 0.85);
    },
    lose() {
      tone(392, 0.25, 'sawtooth', 0.18, 370);
      tone(311, 0.25, 'sawtooth', 0.18, 290, 0.24);
      tone(233, 0.5, 'sawtooth', 0.18, 180, 0.48);
    },
  };
}
