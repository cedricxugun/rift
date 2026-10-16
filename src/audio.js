// Original, self-contained audio. Nothing is loaded and no AudioContext is
// created until the player explicitly starts or resumes the game.

const PENTATONIC = [0, 3, 5, 7, 10, 12, 15, 17];
const CHORDS = [
  [50, 57, 62, 65],
  [50, 57, 62, 65],
  [46, 53, 58, 62],
  [46, 53, 58, 62],
  [53, 60, 65, 69],
  [53, 60, 65, 69],
  [48, 55, 60, 64],
  [48, 55, 60, 64],
];
const MELODIES = [
  [74, null, 77, null, 81, 79, 77, null],
  [74, null, 72, null, 69, null, 72, null],
  [74, null, 77, 74, 72, null, 69, null],
  [77, null, 79, null, 77, 74, null, null],
  [77, null, 81, null, 84, 81, 79, null],
  [81, null, 79, 77, 74, null, 77, null],
  [79, null, 76, null, 72, null, 74, null],
  [77, null, 74, null, 72, 69, null, null],
];
const COOLDOWNS = {
  eat: 0.045,
  grow: 0.65,
  shoot: 0.105,
  impact: 0.085,
  freeze: 0.24,
  wind: 0.38,
  core: 0.28,
  evolve: 1.2,
  hurt: 0.36,
  win: 2.2,
  lose: 2.2,
  click: 0.06,
  portal: 0.75,
  warning: 0.8,
};
const IMPORTANT_SOUNDS = new Set(['grow', 'core', 'evolve', 'win', 'lose', 'hurt']);

function noteFrequency(note) {
  return 440 * 2 ** ((note - 69) / 12);
}

export class GameAudio {
  constructor() {
    this.context = null;
    this.unlocked = false;
    this.muted = false;
    this.paused = false;
    this.intensity = 0;
    this.destroyed = false;
    this._master = null;
    this._music = null;
    this._effects = null;
    this._noiseBuffer = null;
    this._noiseCursor = 0;
    this._voices = new Set();
    this._effectVoiceCount = 0;
    this._lastPlayed = Object.create(null);
    this._eatCombo = 0;
    this._lastEat = -Infinity;
    this._scheduler = null;
    this._suspendTimer = null;
    this._transition = 0;
    this._step = 0;
    this._nextStep = 0;
    this._halfBeat = 60 / 88 / 2;
  }

  async unlock() {
    if (this.destroyed) return false;

    if (!this.context) {
      const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AudioContextClass) return false;

      try {
        this.context = new AudioContextClass({ latencyHint: 'interactive' });
        this._createGraph();
      } catch {
        if (this.context) this.context.close().catch(() => {});
        this.context = null;
        return false;
      }
    }

    this.unlocked = true;
    return this._refreshPlayback();
  }

  setMuted(value) {
    const muted = Boolean(value);
    if (this.muted === muted) return;
    this.muted = muted;
    void this._refreshPlayback();
  }

  setPaused(value) {
    const paused = Boolean(value);
    if (this.paused === paused) return;
    this.paused = paused;
    void this._refreshPlayback();
  }

  setIntensity(value) {
    if (Number.isFinite(value)) this.intensity = Math.max(0, Math.min(1, value));
  }

  play(name, strength = 1) {
    const context = this.context;
    if (!context || !this.unlocked || this.muted || this.paused || this.destroyed) return;
    if (context.state !== 'running' || !Object.hasOwn(COOLDOWNS, name)) return;

    const now = context.currentTime;
    const previous = this._lastPlayed[name] ?? -Infinity;
    if (now - previous < COOLDOWNS[name]) return;
    if (this._effectVoiceCount > 32 && !IMPORTANT_SOUNDS.has(name)) return;
    this._lastPlayed[name] = now;

    const power = Number.isFinite(strength) ? Math.max(0.3, Math.min(1.6, strength)) : 1;
    const time = now + 0.005;

    switch (name) {
      case 'eat': {
        this._eatCombo = now - this._lastEat < 0.3 ? Math.min(7, this._eatCombo + 1) : 0;
        this._lastEat = now;
        const pitch = noteFrequency(51 + PENTATONIC[this._eatCombo]);
        this._tone({ time, frequency: pitch * 1.6, endFrequency: pitch * 0.64, duration: 0.12, volume: 0.13 * power });
        this._tone({ time: time + 0.025, frequency: pitch * 2.05, duration: 0.09, volume: 0.022 * power });
        break;
      }
      case 'grow':
        this._chime([62, 69, 74, 77, 81], time, 0.075, 0.45, 0.095);
        this._tone({ time, frequency: 73, endFrequency: 147, duration: 0.52, attack: 0.06, volume: 0.065 });
        break;
      case 'shoot':
        this._tone({ time, frequency: 155, endFrequency: 48, type: 'triangle', duration: 0.16, volume: 0.1 * power });
        this._noise({ time, duration: 0.095, frequency: 1400, endFrequency: 280, volume: 0.08 * power });
        break;
      case 'impact':
        this._noise({ time, duration: 0.17, frequency: 1000, endFrequency: 150, volume: 0.085 * power });
        this._tone({ time, frequency: 86, endFrequency: 42, duration: 0.12, volume: 0.045 * power });
        break;
      case 'freeze':
        this._noise({ time, duration: 0.38, attack: 0.025, filter: 'highpass', frequency: 3700, volume: 0.022 * power });
        this._chime([86, 93, 98], time, 0.055, 0.38, 0.035 * power);
        break;
      case 'wind':
        this._noise({ time, duration: 0.43, attack: 0.1, filter: 'bandpass', frequency: 250, endFrequency: 1300, volume: 0.13 * power });
        this._tone({ time, frequency: 108, endFrequency: 196, duration: 0.38, attack: 0.08, volume: 0.026 * power });
        break;
      case 'core':
        this._chime([74, 81, 86], time, 0.08, 0.55, 0.075 * power);
        break;
      case 'evolve':
        this._chime([62, 69, 74, 77, 81, 86], time, 0.085, 0.7, 0.09);
        this._tone({ time, frequency: 73.42, endFrequency: 146.83, duration: 0.8, attack: 0.12, volume: 0.07 });
        this._noise({ time: time + 0.2, duration: 0.9, attack: 0.24, filter: 'bandpass', frequency: 700, endFrequency: 2500, volume: 0.038 });
        break;
      case 'hurt':
        this._tone({ time, frequency: 196, endFrequency: 82, type: 'triangle', duration: 0.19, volume: 0.095 * power });
        this._noise({ time, duration: 0.11, filter: 'bandpass', frequency: 850, volume: 0.048 * power });
        break;
      case 'win':
        this._chime([62, 66, 69, 74, 78, 81, 86], time, 0.12, 0.95, 0.09);
        for (const note of [50, 57, 62, 66]) {
          this._tone({ time: time + 0.5, frequency: noteFrequency(note), duration: 1.7, attack: 0.08, hold: 0.45, volume: 0.027 });
        }
        break;
      case 'lose':
        this._chime([74, 72, 69, 62], time, 0.2, 0.6, 0.06);
        break;
      case 'click':
        this._tone({ time, frequency: noteFrequency(86), endFrequency: noteFrequency(89), duration: 0.065, volume: 0.043 });
        break;
      case 'portal':
        this._noise({ time, duration: 0.65, attack: 0.18, filter: 'bandpass', frequency: 280, endFrequency: 1800, volume: 0.078 });
        this._chime([69, 74, 77, 81], time, 0.095, 0.45, 0.045);
        break;
      case 'warning':
        this._tone({ time, frequency: noteFrequency(74), type: 'triangle', duration: 0.13, volume: 0.05 });
        this._tone({ time: time + 0.19, frequency: noteFrequency(74), type: 'triangle', duration: 0.13, volume: 0.04 });
        break;
      default:
        break;
    }
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.unlocked = false;
    this._transition += 1;
    clearInterval(this._scheduler);
    clearTimeout(this._suspendTimer);
    this._scheduler = null;
    this._suspendTimer = null;
    this._stopVoices(0);
    for (const voice of this._voices) {
      voice.source.onended = null;
      for (const node of voice.nodes) node.disconnect();
    }
    this._voices.clear();
    this._effectVoiceCount = 0;
    const context = this.context;
    this.context = null;
    this._master = null;
    this._music = null;
    this._effects = null;
    this._noiseBuffer = null;
    if (context && context.state !== 'closed') void context.close().catch(() => {});
  }

  _createGraph() {
    const context = this.context;
    this._master = context.createGain();
    this._master.gain.value = 0;
    this._music = context.createGain();
    this._music.gain.value = 0.55;
    this._effects = context.createGain();
    this._effects.gain.value = 0.7;

    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -16;
    compressor.knee.value = 16;
    compressor.ratio.value = 5;
    compressor.attack.value = 0.008;
    compressor.release.value = 0.18;
    this._music.connect(compressor);
    this._effects.connect(compressor);
    compressor.connect(this._master);
    this._master.connect(context.destination);

    // A seeded impulse produces a tiny, warm room rather than a large echo.
    let seed = 0x51f15e;
    const noise = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const samples = noise.getChannelData(0);
    for (let index = 0; index < samples.length; index += 1) {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      samples[index] = (seed >>> 0) / 2147483648 - 1;
    }
    this._noiseBuffer = noise;

    const impulse = context.createBuffer(2, Math.floor(context.sampleRate * 0.9), context.sampleRate);
    for (let channel = 0; channel < 2; channel += 1) {
      const data = impulse.getChannelData(channel);
      for (let index = 0; index < data.length; index += 1) {
        const offset = (index + channel * 7919) % samples.length;
        data[index] = samples[offset] * (1 - index / data.length) ** 3 * 0.28;
      }
    }
    const reverb = context.createConvolver();
    reverb.buffer = impulse;
    const musicSend = context.createGain();
    musicSend.gain.value = 0.22;
    const effectsSend = context.createGain();
    effectsSend.gain.value = 0.1;
    const reverbReturn = context.createGain();
    reverbReturn.gain.value = 0.32;
    this._music.connect(musicSend);
    this._effects.connect(effectsSend);
    musicSend.connect(reverb);
    effectsSend.connect(reverb);
    reverb.connect(reverbReturn);
    reverbReturn.connect(compressor);
  }

  async _refreshPlayback() {
    const context = this.context;
    if (!context || !this.unlocked || this.destroyed || context.state === 'closed') return false;
    const transition = ++this._transition;
    clearTimeout(this._suspendTimer);
    this._suspendTimer = null;

    if (this.muted || this.paused) {
      clearInterval(this._scheduler);
      this._scheduler = null;
      this._step = Math.floor(this._step / 8) * 8;
      const time = context.currentTime;
      this._master.gain.cancelScheduledValues(time);
      this._master.gain.setValueAtTime(this._master.gain.value, time);
      this._master.gain.linearRampToValueAtTime(0, time + 0.045);
      this._stopVoices(0.055);
      this._suspendTimer = setTimeout(() => {
        this._suspendTimer = null;
        if (transition !== this._transition || this.destroyed) return;
        if (context.state === 'running') void context.suspend().catch(() => {});
      }, 75);
      return true;
    }

    try {
      if (context.state !== 'running') await context.resume();
    } catch {
      return false;
    }
    if (transition !== this._transition || this.destroyed || this.muted || this.paused) return false;
    if (context.state !== 'running') return false;

    const time = context.currentTime;
    this._master.gain.cancelScheduledValues(time);
    this._master.gain.setValueAtTime(this._master.gain.value, time);
    this._master.gain.linearRampToValueAtTime(0.7, time + 0.085);
    if (this._scheduler === null) {
      this._nextStep = time + 0.09;
      this._schedule();
      this._scheduler = setInterval(() => this._schedule(), 80);
    }
    return true;
  }

  _schedule() {
    const context = this.context;
    if (!context || context.state !== 'running' || this.muted || this.paused || this.destroyed) return;
    const now = context.currentTime;
    // Background throttling must never schedule an accumulated burst of notes.
    if (this._nextStep < now - 0.25) {
      this._nextStep = now + 0.035;
      this._step = Math.floor(this._step / 8) * 8;
    }
    while (this._nextStep < now + 0.16) {
      this._musicStep(this._step, this._nextStep);
      this._nextStep += this._halfBeat;
      this._step = (this._step + 1) % 64;
    }
  }

  _musicStep(step, time) {
    const bar = Math.floor(step / 8);
    const beat = step % 8;
    const chord = CHORDS[bar];
    const energy = this.intensity;

    if (beat === 0) {
      for (let index = 0; index < chord.length; index += 1) {
        this._tone({
          time,
          frequency: noteFrequency(chord[index]),
          type: 'triangle',
          duration: this._halfBeat * 8 + 0.42,
          attack: 0.24,
          hold: this._halfBeat * 5,
          volume: 0.017,
          cutoff: 850,
          detune: index % 2 ? 3 : -3,
          pan: (index - 1.5) * 0.2,
          kind: 'music',
        });
      }
    }

    if (beat === 0 || beat === 4) {
      this._tone({ time, frequency: noteFrequency(chord[0] - 12), duration: 0.48, attack: 0.018, volume: 0.053, kind: 'music' });
      this._tone({ time, frequency: 105, endFrequency: 44, duration: 0.135, volume: 0.022 + energy * 0.023, kind: 'music' });
    }

    const note = MELODIES[bar][beat];
    if (note !== null) {
      this._tone({ time, frequency: noteFrequency(note), type: 'triangle', duration: 0.46, attack: 0.006, cutoff: 2400, volume: 0.041, pan: bar % 2 ? 0.15 : -0.15, kind: 'music' });
      this._tone({ time: time + 0.002, frequency: noteFrequency(note + 12), duration: 0.13, volume: 0.008, pan: bar % 2 ? -0.18 : 0.18, kind: 'music' });
    }

    if (beat % 2 === 0 || energy > 0.65) {
      this._noise({ time, duration: 0.048, filter: 'highpass', frequency: 5100, volume: 0.006 + energy * 0.012, pan: beat % 2 ? -0.2 : 0.2, kind: 'music' });
    }
  }

  _chime(notes, time, spacing, duration, volume) {
    for (let index = 0; index < notes.length; index += 1) {
      const frequency = noteFrequency(notes[index]);
      const start = time + index * spacing;
      this._tone({ time: start, frequency, duration, volume: volume * (1 - index * 0.045), pan: (index % 3 - 1) * 0.18 });
      this._tone({ time: start, frequency: frequency * 2, duration: duration * 0.36, volume: volume * 0.12 });
    }
  }

  _tone({ time, frequency, endFrequency, duration, volume, type = 'sine', attack = 0.006, hold = 0, cutoff, detune = 0, pan = 0, kind = 'effect' }) {
    const context = this.context;
    if (!context || this.destroyed || this._voices.size >= 96) return;
    const start = Math.max(context.currentTime, time);
    const end = start + duration;
    const oscillator = context.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, end);
    oscillator.detune.value = detune;

    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.linearRampToValueAtTime(volume, start + attack);
    if (hold > attack) envelope.gain.setValueAtTime(volume, start + hold);
    envelope.gain.exponentialRampToValueAtTime(0.0001, end);
    const nodes = [oscillator, envelope];
    if (cutoff) {
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = cutoff;
      filter.Q.value = 0.55;
      oscillator.connect(filter);
      filter.connect(envelope);
      nodes.push(filter);
    } else {
      oscillator.connect(envelope);
    }

    const bus = kind === 'music' ? this._music : this._effects;
    if (pan && typeof context.createStereoPanner === 'function') {
      const panner = context.createStereoPanner();
      panner.pan.value = pan;
      envelope.connect(panner);
      panner.connect(bus);
      nodes.push(panner);
    } else {
      envelope.connect(bus);
    }
    this._trackVoice(oscillator, end + 0.025, kind, nodes);
    oscillator.start(start);
    oscillator.stop(end + 0.025);
  }

  _noise({ time, duration, volume, frequency, endFrequency, attack = 0.005, filter: filterType = 'lowpass', pan = 0, kind = 'effect' }) {
    const context = this.context;
    if (!context || this.destroyed || this._voices.size >= 96) return;
    const start = Math.max(context.currentTime, time);
    const end = start + duration;
    const source = context.createBufferSource();
    source.buffer = this._noiseBuffer;
    source.loop = true;
    const filter = context.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(frequency, start);
    if (endFrequency) filter.frequency.exponentialRampToValueAtTime(endFrequency, end);
    filter.Q.value = 0.65;
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.linearRampToValueAtTime(volume, start + attack);
    envelope.gain.exponentialRampToValueAtTime(0.0001, end);
    source.connect(filter);
    filter.connect(envelope);
    const nodes = [source, filter, envelope];
    const bus = kind === 'music' ? this._music : this._effects;
    if (pan && typeof context.createStereoPanner === 'function') {
      const panner = context.createStereoPanner();
      panner.pan.value = pan;
      envelope.connect(panner);
      panner.connect(bus);
      nodes.push(panner);
    } else {
      envelope.connect(bus);
    }
    this._trackVoice(source, end + 0.025, kind, nodes);
    source.start(start, (this._noiseCursor++ * 0.173) % 1);
    source.stop(end + 0.025);
  }

  _trackVoice(source, end, kind, nodes) {
    const voice = { source, end, kind, nodes };
    this._voices.add(voice);
    if (kind !== 'music') this._effectVoiceCount += 1;
    source.onended = () => {
      if (!this._voices.delete(voice)) return;
      if (kind !== 'music') this._effectVoiceCount -= 1;
      for (const node of nodes) node.disconnect();
    };
  }

  _stopVoices(delay) {
    const context = this.context;
    if (!context) return;
    const stopTime = context.currentTime + delay;
    for (const voice of this._voices) {
      if (voice.end <= stopTime) continue;
      try {
        voice.source.stop(stopTime);
        voice.end = stopTime;
      } catch {
        // A voice may have ended between the state change and its callback.
      }
    }
  }
}
