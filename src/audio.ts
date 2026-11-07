export const TRACK_NAMES = ['Purple Daydream', 'Little Star Stage', 'Garden Groove'];
const MELODIES = [
  [72, 0, 76, 79, 0, 76, 74, 0, 72, 76, 79, 81, 0, 79, 76, 0, 77, 0, 81, 79, 0, 77, 76, 0, 74, 76, 79, 74, 0, 72, 0, 0],
  [76, 79, 0, 83, 81, 0, 79, 76, 74, 0, 77, 81, 79, 0, 77, 74, 72, 76, 0, 79, 84, 0, 81, 79, 77, 76, 0, 74, 72, 0, 0, 0],
  [72, 0, 74, 76, 79, 0, 76, 74, 77, 0, 79, 81, 79, 0, 77, 76, 74, 0, 76, 79, 76, 0, 74, 72, 71, 74, 0, 76, 72, 0, 0, 0],
];
export class GameAudio {
  private context?: AudioContext;
  private musicGain?: GainNode;
  private timer?: ReturnType<typeof setInterval>;
  private step = 0;
  private next = 0;
  private voiceGeneration = 0;
  private music = false;
  private voice = true;
  private track = 0;
  private started = false;
  private utterance?: SpeechSynthesisUtterance;
  constructor(private notice: (text: string) => void) {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { this.stopClock(); this.stopSpeech(); void this.context?.suspend(); }
      else if (this.started && this.music) void this.activate().then(() => this.startClock()).catch(() => this.notice('Tap Music to start the music again.'));
    });
  }
  settings(voice: boolean, music: boolean, track: number) {
    this.voice = voice; this.music = music;
    if (this.track !== track) { this.track = track; this.step = 0; }
    if (!voice) this.stopSpeech();
    if (!music) this.stopClock();
    else if (this.started) this.startClock();
  }
  async activate() {
    const Audio = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Audio) return;
    if (!this.context) {
      this.context = new Audio();
      this.musicGain = this.context.createGain();
      this.musicGain.gain.value = .18;
      this.musicGain.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') await this.context.resume();
    this.started = true;
    if (this.music) this.startClock();
  }
  private tone(note: number, time: number, duration: number, volume: number, type: OscillatorType = 'sine', music = true) {
    const ctx = this.context;
    if (!ctx || document.hidden) return;
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = type; osc.frequency.value = 440 * 2 ** ((note - 69) / 12);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(volume, time + .015);
    gain.gain.exponentialRampToValueAtTime(.0001, time + duration);
    osc.connect(gain); gain.connect(music ? this.musicGain! : ctx.destination);
    osc.start(time); osc.stop(time + duration + .02);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }
  private startClock() {
    if (this.timer || !this.context || !this.music || document.hidden || this.context.state !== 'running') return;
    this.next = this.context.currentTime + .05;
    const schedule = () => {
      const ctx = this.context!;
      while (this.next < ctx.currentTime + .18) {
        const step = this.step % 32, note = MELODIES[this.track][step];
        const root = [48, 45, 53, 55][Math.floor(step / 8)];
        if (note) this.tone(note, this.next, .24, .28, 'triangle');
        if (step % 4 === 0) {
          this.tone(root, this.next, .48, .4);
          this.tone(root + 12, this.next, .44, .12);
          this.tone(root + 19, this.next, .4, .09);
        }
        if (step % 2 === 1) this.tone(91, this.next, .035, .04, 'triangle');
        this.next += [60 / 108 / 2, 60 / 116 / 2, 60 / 100 / 2][this.track]; this.step++;
      }
    };
    schedule(); this.timer = setInterval(schedule, 70);
  }
  private stopClock() { if (this.timer) clearInterval(this.timer); this.timer = undefined; }
  stopSpeech() {
    this.voiceGeneration++;
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    this.utterance = undefined;
    if (this.context && this.musicGain) this.musicGain.gain.setTargetAtTime(.18, this.context.currentTime, .08);
  }
  speak(text: string) {
    this.stopSpeech();
    if (!this.voice || document.hidden) return;
    if (!window.speechSynthesis || !('SpeechSynthesisUtterance' in window)) { this.notice('Voice is unavailable here. All instructions are shown on screen.'); return; }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US'; utterance.rate = .87; utterance.pitch = 1.12;
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find(v => v.lang === 'en-US' && /Samantha|Karen|Google US English/.test(v.name)) ?? voices.find(v => v.lang.startsWith('en')) ?? null;
    const generation = this.voiceGeneration;
    if (this.musicGain && this.context) this.musicGain.gain.setTargetAtTime(.035, this.context.currentTime, .05);
    const finish = () => {
      if (generation !== this.voiceGeneration) return;
      if (this.context && this.musicGain) this.musicGain.gain.setTargetAtTime(.18, this.context.currentTime, .1);
      this.utterance = undefined;
    };
    utterance.onend = finish; utterance.onerror = finish;
    this.utterance = utterance;
    window.speechSynthesis.speak(utterance);
  }
  effect(kind: 'jump' | 'dance' | 'ball' | 'flower' | 'microphone' | 'done') {
    if (!this.context || (!this.music && !this.voice)) return;
    const notes = kind === 'jump' ? [65, 72] : kind === 'ball' ? [60, 67, 72] : kind === 'flower' ? [76, 79, 84] : [72, 76, 79, 84];
    notes.forEach((n, i) => this.tone(n, this.context!.currentTime + i * .08, .18, .05, 'sine', false));
  }
}
