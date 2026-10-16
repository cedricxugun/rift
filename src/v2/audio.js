import { GameAudio } from '../audio.js';

// Warm, low player attacks; short, high enemy warnings; glassy ice transients.
// The shared engine owns every source, gain ramp, pause and disposal operation.
const CUES = {
  shoot: { cooldown: 0.105, voices: 5 },
  impact: { cooldown: 0.085, voices: 5 },
  freeze: { cooldown: 0.19, voices: 5 },
  wind: { cooldown: 0.27, voices: 3 },
  timeStart: { cooldown: 0.5, voices: 4, priority: true },
  timeEnd: { cooldown: 0.5, voices: 3, priority: true },
  ricochet: { cooldown: 0.095, voices: 3 },
  laser: { cooldown: 0.12, voices: 3 },
  enemyShot: { cooldown: 0.12, voices: 2 },
  critical: { cooldown: 0.15, voices: 4 },
  hurt: { cooldown: 0.3, voices: 3, priority: true },
  heal: { cooldown: 0.75, voices: 7, priority: true },
  grow: { cooldown: 0.6, voices: 7, priority: true },
  rankup: { cooldown: 0.65, voices: 9, priority: true },
  core: { cooldown: 0.3, voices: 7, priority: true },
  evolve: { cooldown: 1.2, voices: 14, priority: true },
  bossWarning: { cooldown: 1.3, voices: 8, priority: true },
  warning: { cooldown: 0.7, voices: 3, priority: true },
  wave: { cooldown: 1, voices: 5, priority: true },
  chest: { cooldown: 0.65, voices: 10, priority: true },
  harborBurst: { cooldown: 0.45, voices: 6 },
  furnaceBurst: { cooldown: 0.5, voices: 6 },
  frostRelease: { cooldown: 0.45, voices: 6 },
  guardianBlock: { cooldown: 0.24, voices: 4, priority: true },
  routeCharge: { cooldown: 0.35, voices: 1 },
  branchChoice: { cooldown: 0.4, voices: 5, priority: true },
  opportunity: { cooldown: 0.8, voices: 5, priority: true },
};
const BASS_NOTES = [38, 38, 34, 34, 41, 41, 36, 36];
const CUE_ALIASES = { lightning: 'laser', meteor: 'impact', combo: 'evolve' };

function frequency(note) {
  return 440 * 2 ** ((note - 69) / 12);
}

export class BattleAudio extends GameAudio {
  constructor() {
    super();
    this._battlePlayed = Object.create(null);
    this._halfBeat = 60 / 100 / 2;
  }

  play(name, strength = 1) {
    const context = this.context;
    if (!context || !this.unlocked || this.muted || this.paused || this.destroyed) return;
    if (context.state !== 'running') return;
    // Related attacks share their palette and cooldown, avoiding duplicate bursts.
    if (Object.hasOwn(CUE_ALIASES, name)) name = CUE_ALIASES[name];

    const cue = CUES[name];
    if (!cue) {
      super.play(name, strength);
      return;
    }

    const now = context.currentTime;
    if (now - (this._battlePlayed[name] ?? -Infinity) < cue.cooldown) return;
    // Leave a reserve for damage alerts and the larger progression stingers.
    const allowance = cue.priority ? 48 : 34;
    if (this._effectVoiceCount + cue.voices > allowance) return;
    this._battlePlayed[name] = now;

    const power = Number.isFinite(strength) ? Math.max(0.3, Math.min(1.4, strength)) : 1;
    const time = now + 0.004;

    switch (name) {
      case 'shoot':
        this._tone({ time, frequency: 172, endFrequency: 45, duration: 0.25, attack: 0.002, volume: 0.24 * power });
        this._tone({ time, frequency: 230, endFrequency: 78, type: 'triangle', cutoff: 1300, duration: 0.12, attack: 0.002, volume: 0.085 * power });
        this._noise({ time, frequency: 2700, endFrequency: 560, duration: 0.085, attack: 0.002, volume: 0.19 * power });
        this._tone({ time, frequency: 1660, endFrequency: 970, duration: 0.09, attack: 0.002, volume: 0.039 * power });
        this._noise({ time: time + 0.015, frequency: 470, endFrequency: 95, duration: 0.28, volume: 0.065 * power });
        break;
      case 'impact':
        this._tone({ time, frequency: 102, endFrequency: 34, duration: 0.34, attack: 0.002, volume: 0.25 * power });
        this._noise({ time, frequency: 1900, endFrequency: 180, duration: 0.32, attack: 0.002, volume: 0.27 * power });
        this._tone({ time, frequency: 630, endFrequency: 310, type: 'triangle', cutoff: 1700, duration: 0.105, volume: 0.071 * power });
        this._noise({ time: time + 0.07, frequency: 2450, endFrequency: 950, duration: 0.105, volume: 0.11 * power, pan: -0.22 });
        this._noise({ time: time + 0.14, frequency: 1550, endFrequency: 560, duration: 0.12, volume: 0.085 * power, pan: 0.22 });
        break;
      case 'freeze':
        this._noise({ time, filter: 'bandpass', frequency: 4100, endFrequency: 1800, duration: 0.085, attack: 0.002, volume: 0.19 * power });
        this._tone({ time, frequency: 1174.66, endFrequency: 1110, duration: 0.28, attack: 0.002, volume: 0.065 * power, pan: -0.18 });
        this._tone({ time: time + 0.018, frequency: 1760, endFrequency: 1690, duration: 0.21, attack: 0.002, volume: 0.048 * power, pan: 0.18 });
        this._tone({ time: time + 0.04, frequency: 2349.32, duration: 0.24, volume: 0.029 * power });
        this._noise({ time: time + 0.07, filter: 'highpass', frequency: 3200, duration: 0.27, volume: 0.042 * power });
        break;
      case 'wind':
        this._noise({ time, filter: 'bandpass', frequency: 240, endFrequency: 1550, duration: 0.48, attack: 0.035, volume: 0.3 * power });
        this._noise({ time: time + 0.07, filter: 'bandpass', frequency: 1800, endFrequency: 390, duration: 0.24, attack: 0.015, volume: 0.17 * power });
        this._tone({ time, frequency: 105, endFrequency: 218, duration: 0.34, attack: 0.035, volume: 0.073 * power });
        break;
      case 'timeStart':
        this._duckMusic(time, 0.24, 0.6);
        this._noise({ time, filter: 'bandpass', frequency: 2500, endFrequency: 320, duration: 0.65, attack: 0.025, volume: 0.16 * power });
        this._tone({ time, frequency: 880, endFrequency: 220, duration: 0.65, attack: 0.012, volume: 0.09 * power });
        this._tone({ time: time + 0.03, frequency: 1320, endFrequency: 330, duration: 0.7, volume: 0.045 * power });
        this._tone({ time, frequency: 110, endFrequency: 55, duration: 0.8, attack: 0.03, volume: 0.09 * power });
        break;
      case 'timeEnd':
        this._tone({ time, frequency: 220, endFrequency: 660, duration: 0.28, attack: 0.012, volume: 0.07 * power });
        this._tone({ time: time + 0.09, frequency: 880, duration: 0.35, volume: 0.055 * power });
        this._noise({ time, filter: 'bandpass', frequency: 440, endFrequency: 2200, duration: 0.23, attack: 0.02, volume: 0.08 * power });
        break;
      case 'ricochet':
        this._tone({ time, frequency: 1920, endFrequency: 760, duration: 0.095, attack: 0.002, volume: 0.085 * power });
        this._tone({ time, frequency: 1270, endFrequency: 2460, duration: 0.045, attack: 0.002, volume: 0.034 * power });
        this._noise({ time, filter: 'bandpass', frequency: 3100, duration: 0.033, attack: 0.002, volume: 0.065 * power });
        break;
      case 'laser':
        this._tone({ time, frequency: 880, endFrequency: 392, type: 'triangle', cutoff: 2300, duration: 0.19, attack: 0.003, volume: 0.105 * power });
        this._tone({ time, frequency: 1760, endFrequency: 660, duration: 0.085, volume: 0.04 * power });
        this._noise({ time, filter: 'bandpass', frequency: 1650, endFrequency: 3600, duration: 0.12, volume: 0.075 * power });
        break;
      case 'enemyShot':
        this._noise({ time, filter: 'bandpass', frequency: 3650, endFrequency: 1650, duration: 0.1, attack: 0.002, volume: 0.16 * power });
        this._tone({ time, frequency: 784, endFrequency: 659, type: 'triangle', cutoff: 2600, duration: 0.075, attack: 0.002, volume: 0.054 * power });
        break;
      case 'critical':
        this._tone({ time, frequency: 133, endFrequency: 43, duration: 0.29, attack: 0.002, volume: 0.29 * power });
        this._noise({ time, frequency: 2200, endFrequency: 380, duration: 0.2, attack: 0.002, volume: 0.29 * power });
        this._tone({ time, frequency: 960, endFrequency: 350, type: 'triangle', cutoff: 2400, duration: 0.12, volume: 0.115 * power });
        this._tone({ time: time + 0.025, frequency: 1480, endFrequency: 2100, duration: 0.09, volume: 0.07 * power });
        break;
      case 'hurt':
        this._duckMusic(time, 0.26, 0.18);
        this._tone({ time, frequency: 112, endFrequency: 47, duration: 0.25, attack: 0.003, volume: 0.19 * power });
        this._tone({ time, frequency: 174, endFrequency: 83, type: 'triangle', cutoff: 1000, duration: 0.15, volume: 0.12 * power });
        this._noise({ time, filter: 'bandpass', frequency: 820, endFrequency: 390, duration: 0.15, volume: 0.16 * power });
        break;
      case 'heal':
        // A warm rising major chord is distinct from brittle ice and rank fanfares.
        this._chime([67, 71, 74], time, 0.095, 0.44, 0.09 * power);
        this._tone({ time, frequency: 196, endFrequency: 392, duration: 0.38, attack: 0.035, volume: 0.058 * power });
        break;
      case 'grow':
        this._chime([62, 69, 74], time, 0.085, 0.45, 0.11);
        this._tone({ time, frequency: 73.42, endFrequency: 146.83, duration: 0.5, attack: 0.025, volume: 0.125 });
        break;
      case 'rankup':
        this._duckMusic(time, 0.25, 0.55);
        this._chime([69, 74, 81, 86], time, 0.085, 0.5, 0.125);
        this._tone({ time, frequency: 110, endFrequency: 220, type: 'triangle', cutoff: 900, duration: 0.38, attack: 0.03, volume: 0.085 });
        break;
      case 'core':
        this._chime([74, 81, 86], time, 0.075, 0.5, 0.1 * power);
        this._tone({ time, frequency: 220, endFrequency: 440, duration: 0.28, volume: 0.073 * power });
        break;
      case 'evolve':
        this._duckMusic(time, 0.2, 1.1);
        this._noise({ time, filter: 'bandpass', frequency: 300, endFrequency: 2900, duration: 0.5, attack: 0.09, volume: 0.19 });
        this._chime([62, 69, 74, 77, 81], time + 0.12, 0.09, 0.8, 0.125);
        for (const note of [50, 57, 62]) {
          this._tone({ time: time + 0.32, frequency: frequency(note), type: 'triangle', cutoff: 950, duration: 1.1, attack: 0.04, hold: 0.25, volume: 0.057 });
        }
        break;
      case 'bossWarning':
        this._duckMusic(time, 0.2, 0.75);
        this._tone({ time, frequency: 98, endFrequency: 73.42, duration: 0.72, attack: 0.018, volume: 0.15 });
        this._tone({ time, frequency: 219, endFrequency: 196, type: 'triangle', cutoff: 1100, duration: 0.58, attack: 0.012, volume: 0.082 });
        for (let index = 0; index < 3; index += 1) {
          const start = time + index * 0.22;
          this._tone({ time: start, frequency: index === 1 ? 622.25 : 523.25, type: 'triangle', cutoff: 2200, duration: 0.15, volume: 0.085 });
          this._noise({ time: start, filter: 'bandpass', frequency: 2850, duration: 0.055, volume: 0.075 });
        }
        break;
      case 'warning':
        this._tone({ time, frequency: 587.33, type: 'triangle', cutoff: 1900, duration: 0.13, volume: 0.079 });
        this._tone({ time: time + 0.18, frequency: 587.33, type: 'triangle', cutoff: 1900, duration: 0.13, volume: 0.07 });
        this._noise({ time, filter: 'bandpass', frequency: 2300, duration: 0.06, volume: 0.056 });
        break;
      case 'wave':
        this._duckMusic(time, 0.3, 0.4);
        for (const note of [62, 69, 74]) {
          this._tone({ time, frequency: frequency(note), type: 'triangle', cutoff: 1650, duration: 0.6, attack: 0.035, hold: 0.13, volume: 0.068 });
        }
        this._tone({ time, frequency: 104, endFrequency: 47, duration: 0.32, volume: 0.15 });
        this._noise({ time, frequency: 1900, endFrequency: 470, duration: 0.14, volume: 0.12 });
        break;
      case 'chest':
        this._noise({ time, filter: 'bandpass', frequency: 1700, duration: 0.055, volume: 0.095 });
        this._tone({ time, frequency: 280, endFrequency: 145, type: 'triangle', duration: 0.1, volume: 0.065 });
        this._chime([77, 81, 86, 89], time + 0.055, 0.085, 0.52, 0.095);
        break;
      case 'harborBurst':
        // A rounded cannon report opens into a broad, rising gust.
        this._tone({ time, frequency: 146.83, endFrequency: 42, duration: 0.36, attack: 0.003, volume: 0.23 * power });
        this._tone({ time, frequency: 220, endFrequency: 73.42, type: 'triangle', cutoff: 1000, duration: 0.19, volume: 0.09 * power });
        this._noise({ time, frequency: 2100, endFrequency: 360, duration: 0.14, attack: 0.003, volume: 0.18 * power });
        this._noise({ time: time + 0.045, filter: 'bandpass', frequency: 210, endFrequency: 1450, duration: 0.55, attack: 0.095, volume: 0.21 * power, pan: -0.12 });
        this._tone({ time: time + 0.04, frequency: 110, endFrequency: 196, duration: 0.44, attack: 0.08, volume: 0.038 * power });
        this._noise({ time: time + 0.24, filter: 'bandpass', frequency: 950, endFrequency: 320, duration: 0.24, attack: 0.015, volume: 0.085 * power, pan: 0.16 });
        break;
      case 'furnaceBurst':
        this._noise({ time, frequency: 480, endFrequency: 100, duration: 0.33, attack: 0.02, volume: 0.25 * power });
        this._tone({ time, frequency: 98, endFrequency: 49, type: 'triangle', cutoff: 700, duration: 0.31, attack: 0.02, volume: 0.1 * power });
        this._noise({ time: time + 0.08, filter: 'bandpass', frequency: 1500, endFrequency: 700, duration: 0.14, volume: 0.09 * power });
        for (const [index, note] of [79, 84, 88].entries()) {
          this._tone({ time: time + 0.09 + index * 0.045, frequency: frequency(note), duration: 0.2 + index * 0.03, volume: (0.044 - index * 0.007) * power, pan: (index - 1) * 0.18 });
        }
        break;
      case 'frostRelease':
        this._noise({ time, filter: 'bandpass', frequency: 2400, endFrequency: 4800, duration: 0.24, attack: 0.01, volume: 0.105 * power });
        for (const [index, note] of [74, 77, 81, 86].entries()) {
          const pitch = frequency(note);
          this._tone({ time: time + index * 0.034, frequency: pitch, endFrequency: pitch * 1.025, duration: 0.34, attack: 0.004, volume: (0.055 - index * 0.006) * power, pan: -0.3 + index * 0.2 });
        }
        this._tone({ time: time + 0.16, frequency: frequency(93), duration: 0.15, volume: 0.018 * power });
        break;
      case 'guardianBlock':
        this._tone({ time, frequency: 783.99, endFrequency: 760, duration: 0.135, attack: 0.003, volume: 0.085 * power });
        this._tone({ time: time + 0.009, frequency: 1174.66, duration: 0.17, attack: 0.004, volume: 0.032 * power });
        this._tone({ time, frequency: 196, endFrequency: 247, type: 'triangle', cutoff: 800, duration: 0.09, volume: 0.037 * power });
        this._noise({ time, filter: 'bandpass', frequency: 1700, duration: 0.045, attack: 0.002, volume: 0.055 * power });
        break;
      case 'routeCharge':
        // One quiet note, without a second partial or a noise transient.
        this._tone({ time, frequency: frequency(84), duration: 0.115, attack: 0.005, volume: 0.026 * power });
        break;
      case 'branchChoice':
        this._chime([72, 79], time, 0.06, 0.3, 0.09 * power);
        this._tone({ time, frequency: 261.63, endFrequency: 196, type: 'triangle', cutoff: 900, duration: 0.095, attack: 0.003, volume: 0.05 * power });
        break;
      case 'opportunity':
        this._chime([76, 83], time, 0.13, 0.54, 0.062 * power);
        this._tone({ time: time + 0.27, frequency: frequency(88), duration: 0.45, attack: 0.009, volume: 0.035 * power });
        break;
      default:
        break;
    }
  }

  _createGraph() {
    super._createGraph();
    // More headroom for readable attacks; the inherited compressor contains
    // overlapping explosions without making quiet cues disappear in music.
    this._effects.gain.value = 0.95;
    this._music.gain.value = 0.46;
  }

  _musicStep(step, time) {
    const beat = step % 8;
    const energy = this.intensity;
    if (beat === 0) this._halfBeat = 60 / (96 + energy * 30) / 2;
    super._musicStep(step, time);
    if (energy < 0.2) return;

    const note = BASS_NOTES[Math.floor(step / 8)];
    if (beat % 2 === 0 || energy > 0.65) {
      const pitch = note + (beat === 3 || beat === 7 ? 7 : 12);
      this._tone({ time, frequency: frequency(pitch), type: 'triangle', cutoff: 650 + energy * 650, duration: this._halfBeat * 0.64, attack: 0.004, volume: 0.023 + energy * 0.033, pan: beat % 2 ? 0.12 : -0.12, kind: 'music' });
    }
    if (beat === 2 || beat === 6) {
      this._tone({ time, frequency: 158, endFrequency: 83, type: 'triangle', duration: 0.095, volume: 0.035 + energy * 0.035, kind: 'music' });
      this._noise({ time, filter: 'bandpass', frequency: 1700, duration: 0.085, volume: 0.014 + energy * 0.028, kind: 'music' });
    }
  }

  _duckMusic(time, level, duration) {
    const gain = this._music.gain;
    const now = this.context.currentTime;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);
    gain.linearRampToValueAtTime(level, time + 0.025);
    gain.setValueAtTime(level, time + duration);
    gain.linearRampToValueAtTime(0.46, time + duration + 0.28);
  }

  _tone(options) {
    if (this._voices.size >= 64) return;
    if (options.kind === 'music') {
      if (this._voices.size - this._effectVoiceCount >= 24) return;
    } else if (this._effectVoiceCount >= 48) {
      return;
    }
    super._tone(options);
  }

  _noise(options) {
    if (this._voices.size >= 64) return;
    if (options.kind === 'music') {
      if (this._voices.size - this._effectVoiceCount >= 24) return;
    } else if (this._effectVoiceCount >= 48) {
      return;
    }
    super._noise(options);
  }
}
