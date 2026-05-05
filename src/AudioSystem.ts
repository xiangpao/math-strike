export class AudioSystem {
  private ctx: AudioContext | null = null;
  private enabled: boolean = false;
  private bgmAudio: HTMLAudioElement | null = null;
  private bgmGain: GainNode | null = null;
  private bgmPlaying: boolean = false;

  // Raiden-style intense fast arpeggio BGM melody
  private readonly BGM_NOTES: [number, number][] = [
    [440, 0.25],[523, 0.25],[659, 0.25],[880, 0.25], // A minor arpeggio
    [440, 0.25],[523, 0.25],[659, 0.25],[880, 0.25],
    [349, 0.25],[440, 0.25],[523, 0.25],[698, 0.25], // F major arpeggio
    [349, 0.25],[440, 0.25],[523, 0.25],[698, 0.25],
    [392, 0.25],[493, 0.25],[587, 0.25],[783, 0.25], // G major arpeggio
    [392, 0.25],[493, 0.25],[587, 0.25],[783, 0.25],
    [330, 0.25],[415, 0.25],[493, 0.25],[659, 0.25], // E major arpeggio
    [330, 0.25],[415, 0.25],[493, 0.25],[659, 0.25]
  ];
  private bgmScheduled: boolean = false;

  constructor() {}

  public init() {
    if (!this.ctx) {
      try {
        const AC = window.AudioContext || (window as any).webkitAudioContext;
        this.ctx = new AC();
        this.enabled = true;
        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.value = 0.12;
        this.bgmGain.connect(this.ctx.destination);

        // Try file first, fall back to synth
        this.bgmAudio = new Audio('/assets/bgm.mp3');
        this.bgmAudio.loop = true;
        this.bgmAudio.volume = 0.28;
      } catch (e) {
        console.error('Web Audio API not supported', e);
      }
    }
  }

  public playBGM() {
    if (!this.enabled || !this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (this.bgmPlaying) return;
    this.bgmPlaying = true;

    if (this.bgmAudio) {
      this.bgmAudio.play().catch(() => {
        // File failed — fall back to synth BGM
        this._startSynthBGM();
      });
    } else {
      this._startSynthBGM();
    }
  }

  private _startSynthBGM() {
    if (!this.ctx || !this.bgmGain || this.bgmScheduled) return;
    this.bgmScheduled = true;
    const BPM = 160; // Faster, aggressive tempo
    const beatDur = 60 / BPM;
    let t = this.ctx.currentTime + 0.05;

    const schedule = () => {
      if (!this.ctx || !this.bgmGain || !this.bgmPlaying) return;
      for (const [freq, beats] of this.BGM_NOTES) {
        const dur = beats * beatDur;
        if (freq > 0) {
          const osc = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          osc.type = 'square';
          osc.frequency.value = freq;
          g.gain.setValueAtTime(0.12, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.9);
          osc.connect(g);
          g.connect(this.bgmGain!);
          osc.start(t);
          osc.stop(t + dur);
        }
        t += dur;
      }
      // Loop
      const loopLen = this.BGM_NOTES.reduce((s, [, b]) => s + b * beatDur, 0);
      setTimeout(schedule, (loopLen - 0.5) * 1000);
    };
    schedule();
  }

  public stopBGM() {
    this.bgmPlaying = false;
    this.bgmScheduled = false;
    if (this.bgmAudio) {
      this.bgmAudio.pause();
      this.bgmAudio.currentTime = 0;
    }
  }

  private playTone(freq: number, type: OscillatorType, duration: number, vol = 0.1, slideFreq?: number) {
    if (!this.enabled || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    if (slideFreq) osc.frequency.exponentialRampToValueAtTime(slideFreq, this.ctx.currentTime + duration);
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  private playNoise(duration: number, vol = 0.1) {
    if (!this.enabled || !this.ctx) return;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * duration, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(1200, this.ctx.currentTime);
    filt.frequency.linearRampToValueAtTime(80, this.ctx.currentTime + duration);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    src.connect(filt); filt.connect(gain); gain.connect(this.ctx.destination);
    src.start();
  }

  public playShoot() { this.playTone(520, 'square', 0.08, 0.07, 180); }

  public playHit() {
    this.playNoise(0.18, 0.25);
    this.playTone(800, 'sine', 0.06, 0.08, 400);
  }

  public playExplosion() {
    this.playNoise(0.55, 0.55);
    this.playTone(120, 'sawtooth', 0.3, 0.15, 60);
  }

  public playBomb() {
    this.playNoise(1.5, 0.8);
    this.playTone(80, 'sawtooth', 1.0, 0.4, 40);
    setTimeout(() => this.playNoise(1.0, 0.6), 200);
    setTimeout(() => this.playTone(100, 'square', 0.8, 0.3, 50), 400);
  }

  public playPowerUp() {
    this.playTone(400, 'sine', 0.1, 0.12, 600);
    setTimeout(() => this.playTone(600, 'sine', 0.1, 0.12, 900), 100);
    setTimeout(() => this.playTone(900, 'sine', 0.18, 0.12, 1300), 200);
  }

  public playError() { this.playTone(140, 'sawtooth', 0.3, 0.22, 90); }

  public playCombo() {
    // Rising arpeggio for combo
    [523, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => this.playTone(f, 'square', 0.12, 0.08), i * 60)
    );
  }

  public playLaser() {
    this.playTone(1200, 'sawtooth', 0.4, 0.1, 200);
    this.playTone(800, 'sine', 0.4, 0.08, 1600);
  }
}

