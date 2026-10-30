// Halloween Web Audio API Synthesizer & Sound FX Engine

class HalloweenSoundEngine {
  private ctx: AudioContext | null = null;
  private ambientGain: GainNode | null = null;
  private isAmbientPlaying = false;
  private oscs: OscillatorNode[] = [];
  private noiseNode: AudioNode | null = null;
  private isMuted = false;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopAmbient();
    } else {
      this.startAmbient();
    }
    return !this.isMuted;
  }

  public getIsPlaying(): boolean {
    return this.isAmbientPlaying && !this.isMuted;
  }

  // Spooky ambient drone with haunted wind & gothic low resonance
  public startAmbient() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      if (this.isAmbientPlaying) return;

      const master = this.ctx.createGain();
      master.gain.setValueAtTime(0.01, this.ctx.currentTime);
      master.gain.exponentialRampToValueAtTime(0.18, this.ctx.currentTime + 3);
      master.connect(this.ctx.destination);
      this.ambientGain = master;

      // Dark low frequencies (organ drone in C minor / tritone)
      const frequencies = [65.41, 77.78, 92.50, 130.81]; // C2, Eb2, F#2, C3
      this.oscs = [];

      frequencies.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        // Low frequency modulation (LFO) for sinister pulsation
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.frequency.setValueAtTime(0.2 + idx * 0.1, this.ctx.currentTime);
        lfoGain.gain.setValueAtTime(1.5, this.ctx.currentTime);
        lfo.connect(osc.frequency);
        lfo.start();

        gain.gain.setValueAtTime(0.08 / (idx + 1), this.ctx.currentTime);
        osc.connect(gain);
        gain.connect(master);
        osc.start();
        this.oscs.push(osc);
      });

      // Haunted cold wind effect (filtered white noise)
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const bandpass = this.ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(320, this.ctx.currentTime);
      bandpass.Q.setValueAtTime(3.0, this.ctx.currentTime);

      const windGain = this.ctx.createGain();
      windGain.gain.setValueAtTime(0.03, this.ctx.currentTime);

      whiteNoise.connect(bandpass);
      bandpass.connect(windGain);
      windGain.connect(master);
      whiteNoise.start();
      this.noiseNode = whiteNoise;

      this.isAmbientPlaying = true;
    } catch (e) {
      console.warn('Could not start ambient audio:', e);
    }
  }

  public stopAmbient() {
    try {
      if (this.ambientGain && this.ctx) {
        this.ambientGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 1);
        setTimeout(() => {
          this.oscs.forEach(o => {
            try { o.stop(); } catch { /* ignore */ }
          });
          this.oscs = [];
          if (this.noiseNode) {
            try { (this.noiseNode as AudioBufferSourceNode).stop(); } catch { /* ignore */ }
            this.noiseNode = null;
          }
          this.isAmbientPlaying = false;
        }, 1100);
      }
    } catch {
      this.isAmbientPlaying = false;
    }
  }

  // Thunder strike sound when voting
  public playThunder() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const t = this.ctx.currentTime;
      // White noise blast for the lightning crack
      const bufferSize = this.ctx.sampleRate * 1.5;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.4));
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900, t);
      filter.frequency.exponentialRampToValueAtTime(60, t + 1.2);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.6, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 1.4);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(t);

      // Deep rumble sub-bass
      const sub = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      sub.type = 'triangle';
      sub.frequency.setValueAtTime(70, t);
      sub.frequency.exponentialRampToValueAtTime(25, t + 1.8);

      subGain.gain.setValueAtTime(0.5, t);
      subGain.gain.exponentialRampToValueAtTime(0.001, t + 1.8);

      sub.connect(subGain);
      subGain.connect(this.ctx.destination);
      sub.start(t);
      sub.stop(t + 2);
    } catch (e) {
      console.warn('Thunder sound error:', e);
    }
  }

  // Gothic cathedral bell toll
  public playGothicBell() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, t); // A3
      osc.frequency.exponentialRampToValueAtTime(216, t + 2);

      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 2.5);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 2.6);
    } catch {
      // ignore
    }
  }

  // Creaking coffin/door sound
  public playDoorCreak() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.linearRampToValueAtTime(280, t + 0.15);
      osc.frequency.linearRampToValueAtTime(95, t + 0.35);
      osc.frequency.linearRampToValueAtTime(190, t + 0.5);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(350, t);
      filter.Q.setValueAtTime(5, t);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.6);
    } catch {
      // ignore
    }
  }
}

export const spookyAudio = new HalloweenSoundEngine();
