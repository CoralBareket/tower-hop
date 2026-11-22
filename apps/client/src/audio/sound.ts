/**
 * All game audio, synthesized at runtime with the Web Audio API — no audio files.
 * Original chiptune SFX + an original looping tune whose tempo follows the tower speed.
 *
 * Browsers only allow audio after a user gesture, so `unlock()` must be called from a
 * key/click handler (the menu's "press SPACE" does this).
 */

type Wave = OscillatorType;

// Note helpers: semitone offsets from A4 (440 Hz). null = rest.
const hz = (semi: number) => 440 * 2 ** (semi / 12);
const N = {
  C4: -9,
  D4: -7,
  E4: -5,
  F4: -4,
  G4: -2,
  A4: 0,
  B4: 2,
  C5: 3,
  D5: 5,
  E5: 7,
  G5: 10,
  A5: 12,
  C3: -21,
  F3: -16,
  G3: -14,
  A3: -12,
  E3: -17,
  D3: -19,
};

/** Original 32-step loop (A-minor pentatonic-ish, bouncy). Each step = 1/8 note. */
const LEAD: (number | null)[] = [
  N.A4,
  null,
  N.C5,
  N.E5,
  null,
  N.D5,
  N.C5,
  null,
  N.A4,
  null,
  N.G4,
  N.A4,
  null,
  N.C5,
  N.D5,
  null,
  N.E5,
  null,
  N.G5,
  N.E5,
  null,
  N.D5,
  N.C5,
  N.D5,
  N.E5,
  null,
  N.D5,
  N.C5,
  N.A4,
  null,
  N.G4,
  null,
];
const BASS: (number | null)[] = [
  N.A3,
  null,
  N.A3,
  null,
  N.F3,
  null,
  N.F3,
  null,
  N.C3,
  null,
  N.C3,
  null,
  N.G3,
  null,
  N.G3,
  null,
  N.A3,
  null,
  N.A3,
  null,
  N.F3,
  null,
  N.F3,
  null,
  N.D3,
  null,
  N.E3,
  null,
  N.A3,
  null,
  N.E3,
  null,
];

class Sound {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxBus!: GainNode;
  private musicBus!: GainNode;
  private muted = false;
  private bpm = 132;
  private step = 0;
  private nextStepTime = 0;
  private timer: number | null = null;

  /** Create/resume the AudioContext. Call from a user-gesture handler. */
  unlock(): void {
    try {
      if (!this.ctx) {
        this.ctx = new AudioContext();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.5;
        this.master.connect(this.ctx.destination);
        this.sfxBus = this.ctx.createGain();
        this.sfxBus.gain.value = 0.6;
        this.sfxBus.connect(this.master);
        this.musicBus = this.ctx.createGain();
        this.musicBus.gain.value = 0.28;
        this.musicBus.connect(this.master);
      }
      void this.ctx.resume();
    } catch {
      this.ctx = null; // audio unavailable — game stays silent but playable
    }
  }

  get isMuted(): boolean {
    return this.muted;
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.ctx)
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.5, this.ctx.currentTime, 0.02);
    return this.muted;
  }

  // ---------- low-level ----------

  private tone(
    freq: number,
    dur: number,
    {
      wave = 'square' as Wave,
      vol = 0.3,
      slideTo = 0,
      at = 0,
      bus = 'sfx' as 'sfx' | 'music',
    } = {},
  ): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t0 = at || ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(bus === 'sfx' ? this.sfxBus : this.musicBus);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  // ---------- SFX ----------

  /** power 0..1 = run speed at take-off; bigger jumps sweep higher. */
  jump(power: number): void {
    this.tone(260, 0.16, { slideTo: 520 + power * 700, vol: 0.18 });
  }

  land(): void {
    this.tone(150, 0.07, { wave: 'triangle', slideTo: 70, vol: 0.35 });
  }

  bounce(): void {
    this.tone(700, 0.08, { slideTo: 1100, vol: 0.15 });
  }

  combo(floors: number): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const steps = floors >= 20 ? [N.C5, N.E5, N.G5, N.A5 + 3] : [N.C5, N.E5, N.G5];
    steps.forEach((s, i) => this.tone(hz(s), 0.12, { at: t + i * 0.07, vol: 0.2 }));
  }

  hurry(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 3; i++)
      this.tone(hz(N.A5), 0.09, { at: t + i * 0.14, vol: 0.18, wave: 'sawtooth' });
  }

  gameOver(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [N.E5, N.C5, N.A4, N.E4].forEach((s, i) =>
      this.tone(hz(s), 0.22, { at: t + i * 0.16, vol: 0.22, wave: 'triangle' }),
    );
  }

  // ---------- music (lookahead scheduler: timing stays tight even if frames stutter) ----------

  startMusic(): void {
    if (!this.ctx || this.timer !== null) return;
    this.bpm = 132;
    this.step = 0;
    this.nextStepTime = this.ctx.currentTime + 0.05;
    this.timer = window.setInterval(() => this.schedule(), 25);
  }

  stopMusic(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
  }

  /** Each tower speed-up level pushes the tempo up. */
  setIntensity(level: number): void {
    this.bpm = 132 + level * 10;
  }

  private schedule(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const stepDur = 60 / this.bpm / 2; // eighth notes
    while (this.nextStepTime < ctx.currentTime + 0.12) {
      const i = this.step % LEAD.length;
      const lead = LEAD[i];
      const bass = BASS[i];
      const at = this.nextStepTime;
      if (lead !== null) this.tone(hz(lead), stepDur * 0.9, { at, vol: 0.22, bus: 'music' });
      if (bass !== null)
        this.tone(hz(bass), stepDur * 1.6, { at, vol: 0.3, wave: 'triangle', bus: 'music' });
      if (i % 4 === 0)
        this.tone(90, 0.06, { at, vol: 0.25, wave: 'sine', slideTo: 45, bus: 'music' }); // kick
      this.nextStepTime += stepDur;
      this.step++;
    }
  }
}

export const sound = new Sound();
