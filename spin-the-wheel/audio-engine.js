export class AudioEngine {
  constructor() {
    this.context = null;
    this.master = null;
    this.enabledByGesture = false;
    this.volume = 0.7;
    this.ambientOsc = null;
    this.ambientAuxOsc = null;
    this.ambientGain = null;
    this.ambientLfo = null;
    this.noiseBuffer = null;
  }

  ensureReady() {
    if (!this.context) {
      this.context = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.context.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.context.destination);
    }

    if (this.context.state === "suspended") {
      this.context.resume();
    }
    this.enabledByGesture = true;
  }

  setVolume(nextVolume) {
    this.volume = Math.max(0, Math.min(nextVolume, 1));
    if (this.master) {
      this.master.gain.value = this.volume;
    }
  }

  playOscillatorLayer({
    type = "sine",
    frequency = 440,
    startTime = this.context?.currentTime ?? 0,
    duration = 0.3,
    peak = 0.08,
    attack = 0.01,
    detune = 0,
    filterType = null,
    filterFrequency = 1800,
    filterQ = 0.7,
    endFrequency = null
  } = {}) {
    if (!this.enabledByGesture || !this.context || !this.master) return;

    const endTime = startTime + Math.max(duration, attack + 0.04);
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startTime);
    oscillator.detune.setValueAtTime(detune, startTime);

    let output = oscillator;
    if (filterType) {
      const filter = this.context.createBiquadFilter();
      filter.type = filterType;
      filter.frequency.setValueAtTime(filterFrequency, startTime);
      filter.Q.value = filterQ;
      output.connect(filter);
      output = filter;
    }

    if (Number.isFinite(endFrequency) && endFrequency > 0 && endFrequency !== frequency) {
      oscillator.frequency.exponentialRampToValueAtTime(endFrequency, endTime);
    }

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.00011, peak), startTime + Math.max(attack, 0.001));
    gain.gain.exponentialRampToValueAtTime(0.0001, endTime);

    output.connect(gain);
    gain.connect(this.master);
    oscillator.start(startTime);
    oscillator.stop(endTime + 0.02);
  }

  playNoiseAccent({
    startTime = this.context?.currentTime ?? 0,
    duration = 0.24,
    peak = 0.05,
    filterType = "bandpass",
    filterFrequency = 1800,
    filterQ = 0.9,
    playbackRate = 1
  } = {}) {
    if (!this.enabledByGesture || !this.context || !this.master) return;

    const endTime = startTime + duration;
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();

    source.buffer = this.getNoiseBuffer();
    source.playbackRate.value = playbackRate;
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFrequency, startTime);
    filter.Q.value = filterQ;

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.00011, peak), startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, endTime);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start(startTime);
    source.stop(endTime + 0.02);
  }

  playTick(speed = 0.2) {
    if (!this.enabledByGesture || !this.context || !this.master) return;
    this.playTickVariant("click", speed);
  }

  playTickVariant(variant = "click", speed = 0.2) {
    if (!this.enabledByGesture || !this.context || !this.master) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();

    if (variant === "pop") {
      oscillator.type = "sine";
      oscillator.frequency.value = 460 + Math.min(speed * 1200, 1200);
      filter.type = "bandpass";
      filter.frequency.value = 800;
    } else if (variant === "wooden") {
      oscillator.type = "triangle";
      oscillator.frequency.value = 290 + Math.min(speed * 700, 800);
      filter.type = "lowpass";
      filter.frequency.value = 1000;
    } else if (variant === "digital") {
      oscillator.type = "sawtooth";
      oscillator.frequency.value = 900 + Math.min(speed * 2200, 2000);
      filter.type = "highpass";
      filter.frequency.value = 700;
    } else if (variant === "soft") {
      oscillator.type = "sine";
      oscillator.frequency.value = 580 + Math.min(speed * 1000, 900);
      filter.type = "lowpass";
      filter.frequency.value = 1400;
    } else {
      oscillator.type = "square";
      oscillator.frequency.value = 700 + Math.min(speed * 1800, 1800);
      filter.type = "highpass";
      filter.frequency.value = 500;
    }

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.13, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);

    oscillator.start(now);
    oscillator.stop(now + 0.065);
  }

  playWin() {
    if (!this.enabledByGesture || !this.context || !this.master) return;
    this.playWinVariant("fanfare");
  }

  playWinVariant(variant = "fanfare") {
    if (!this.enabledByGesture || !this.context || !this.master) return;
    const now = this.context.currentTime;

    if (variant === "applause") {
      for (let i = 0; i < 4; i += 1) {
        const delay = i * 0.08;
        this.playNoiseAccent({
          startTime: now + delay,
          duration: 0.34 + i * 0.04,
          peak: 0.06 + i * 0.012,
          filterType: "bandpass",
          filterFrequency: 1200 + i * 220,
          filterQ: 1.1,
          playbackRate: 0.86 + i * 0.08
        });
      }
      this.playOscillatorLayer({
        type: "triangle",
        frequency: 523.25,
        startTime: now + 0.02,
        duration: 0.32,
        peak: 0.045,
        filterType: "lowpass",
        filterFrequency: 1800
      });
      this.playOscillatorLayer({
        type: "sine",
        frequency: 783.99,
        startTime: now + 0.08,
        duration: 0.28,
        peak: 0.03,
        filterType: "lowpass",
        filterFrequency: 2200
      });
      return;
    }

    if (variant === "chime") {
      const notes = [659.25, 783.99, 987.77, 1174.66];
      notes.forEach((frequency, index) => {
        const delay = index * 0.08;
        this.playOscillatorLayer({
          type: "sine",
          frequency,
          startTime: now + delay,
          duration: 0.72,
          peak: 0.09,
          filterType: "lowpass",
          filterFrequency: 3200,
          filterQ: 0.7
        });
        this.playOscillatorLayer({
          type: "triangle",
          frequency: frequency * 2,
          startTime: now + delay + 0.015,
          duration: 0.46,
          peak: 0.028,
          filterType: "bandpass",
          filterFrequency: Math.min(4200, frequency * 2.4),
          filterQ: 0.9
        });
      });
      this.playNoiseAccent({
        startTime: now,
        duration: 0.18,
        peak: 0.028,
        filterType: "highpass",
        filterFrequency: 2400,
        filterQ: 0.6,
        playbackRate: 1.2
      });
      return;
    }

    if (variant === "sparkle") {
      this.playNoiseAccent({
        startTime: now,
        duration: 0.22,
        peak: 0.05,
        filterType: "bandpass",
        filterFrequency: 2600,
        filterQ: 1,
        playbackRate: 1.28
      });
      [1174.66, 1567.98, 1975.53, 2637.02, 3135.96].forEach((frequency, index) => {
        this.playOscillatorLayer({
          type: "triangle",
          frequency,
          startTime: now + index * 0.045,
          duration: 0.22,
          peak: 0.055,
          filterType: "bandpass",
          filterFrequency: Math.min(5200, frequency * 1.4),
          filterQ: 1.1
        });
      });
      return;
    }

    this.playNoiseAccent({
      startTime: now,
      duration: 0.18,
      peak: 0.055,
      filterType: "highpass",
      filterFrequency: 1800,
      filterQ: 0.7,
      playbackRate: 1.08
    });
    this.playOscillatorLayer({
      type: "sine",
      frequency: 82.41,
      endFrequency: 55,
      startTime: now,
      duration: 0.28,
      peak: 0.16,
      filterType: "lowpass",
      filterFrequency: 240,
      filterQ: 0.8
    });

    const notes = [392, 523.25, 659.25, 783.99, 1046.5];
    notes.forEach((frequency, index) => {
      const delay = index * 0.07;
      this.playOscillatorLayer({
        type: "triangle",
        frequency,
        startTime: now + delay,
        duration: 0.38,
        peak: 0.11,
        filterType: "lowpass",
        filterFrequency: 2800,
        filterQ: 0.8
      });
      this.playOscillatorLayer({
        type: "sawtooth",
        frequency: frequency * 2,
        startTime: now + delay + 0.012,
        duration: 0.22,
        peak: 0.024,
        detune: 6,
        filterType: "bandpass",
        filterFrequency: Math.min(4200, frequency * 3),
        filterQ: 1.15
      });
    });

    [1046.5, 1318.51, 1567.98].forEach((frequency, index) => {
      this.playOscillatorLayer({
        type: "sine",
        frequency,
        startTime: now + 0.2 + index * 0.04,
        duration: 0.4,
        peak: 0.03,
        filterType: "lowpass",
        filterFrequency: 3600,
        filterQ: 0.7
      });
    });
  }

  startSpinAmbient(variant = "whoosh") {
    if (!this.enabledByGesture || !this.context || !this.master) return;
    if (this.ambientOsc) return;

    const now = this.context.currentTime;
    if (variant === "none") return;

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(variant === "hum" ? 0.045 : 0.082, now + 0.18);

    if (variant === "hum") {
      const osc = this.context.createOscillator();
      const shimmer = this.context.createOscillator();
      const filter = this.context.createBiquadFilter();
      const shimmerGain = this.context.createGain();

      filter.type = "lowpass";
      filter.frequency.value = 420;
      osc.type = "sine";
      osc.frequency.value = 136;
      shimmer.type = "triangle";
      shimmer.frequency.value = 272;
      shimmerGain.gain.value = 0.16;

      osc.connect(filter);
      shimmer.connect(shimmerGain);
      shimmerGain.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      osc.start(now);
      shimmer.start(now);
      this.ambientOsc = osc;
      this.ambientAuxOsc = shimmer;
      this.ambientGain = gain;
      return;
    }

    const source = this.context.createBufferSource();
    source.buffer = this.getNoiseBuffer();
    source.loop = true;
    const filter = this.context.createBiquadFilter();
    filter.type = "bandpass";
    const baseFrequency = variant === "wind" ? 420 : 760;
    const peakFrequency = variant === "wind" ? 760 : 1360;
    filter.frequency.setValueAtTime(baseFrequency, now);
    filter.frequency.exponentialRampToValueAtTime(peakFrequency, now + 1.2);
    filter.Q.value = variant === "wind" ? 0.9 : 1.2;

    const lfo = this.context.createOscillator();
    const lfoGain = this.context.createGain();
    lfo.type = "sine";
    lfo.frequency.value = variant === "wind" ? 0.18 : 0.32;
    lfoGain.gain.value = variant === "wind" ? 120 : 210;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    source.connect(filter);
    filter.connect(gain);

    if (variant === "whoosh") {
      const tone = this.context.createOscillator();
      const toneGain = this.context.createGain();
      tone.type = "triangle";
      tone.frequency.setValueAtTime(84, now);
      tone.frequency.exponentialRampToValueAtTime(132, now + 1.4);
      toneGain.gain.setValueAtTime(0.0001, now);
      toneGain.gain.exponentialRampToValueAtTime(0.028, now + 0.22);
      toneGain.gain.exponentialRampToValueAtTime(0.014, now + 1.4);
      tone.connect(toneGain);
      toneGain.connect(gain);
      tone.start(now);
      this.ambientAuxOsc = tone;
    }

    gain.connect(this.master);
    source.start(now);
    lfo.start(now);
    this.ambientOsc = source;
    this.ambientGain = gain;
    this.ambientLfo = lfo;
  }

  stopSpinAmbient() {
    if (!this.context || !this.ambientGain) return;
    const now = this.context.currentTime;
    this.ambientGain.gain.cancelScheduledValues(now);
    this.ambientGain.gain.setValueAtTime(Math.max(0.0001, this.ambientGain.gain.value), now);
    this.ambientGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
    [this.ambientOsc, this.ambientAuxOsc, this.ambientLfo].forEach((node) => {
      if (!node) return;
      try {
        node.stop(now + 0.18);
      } catch {
        // Ignore if already stopped.
      }
    });
    this.ambientOsc = null;
    this.ambientAuxOsc = null;
    this.ambientGain = null;
    this.ambientLfo = null;
  }

  getNoiseBuffer() {
    if (this.noiseBuffer || !this.context) {
      return this.noiseBuffer;
    }
    const length = this.context.sampleRate * 1.2;
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * 0.55;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }
}
