// 간단한 WebAudio 효과음 + 배경음악 (외부 음원 없이 절차적으로 생성)
const Sound = (() => {
  let ctx = null;
  let master = null;
  let muted = false;
  let bgmTimer = null;
  let step = 0;
  let nextTime = 0;

  function init() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
  }

  function tone(freq, dur, type = 'square', vol = 0.2, slide = 0, delay = 0) {
    if (!ctx || muted) return;
    const t = ctx.currentTime + Math.max(0, delay);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  const fx = {
    jump: () => tone(420, 0.16, 'square', 0.1, 320),
    treat: () => { tone(880, 0.08, 'triangle', 0.18); tone(1320, 0.12, 'triangle', 0.15, 0, 0.06); },
    heart: () => [660, 880, 1100].forEach((f, i) => tone(f, 0.12, 'triangle', 0.16, 0, i * 0.06)),
    hurt: () => tone(320, 0.3, 'sawtooth', 0.14, -220),
    stomp: () => tone(220, 0.15, 'square', 0.16, -140),
    bark: () => { tone(540, 0.07, 'sawtooth', 0.18, -220); tone(480, 0.09, 'sawtooth', 0.18, -240, 0.1); },
    checkpoint: () => [523, 659, 784].forEach((f, i) => tone(f, 0.16, 'triangle', 0.15, 0, i * 0.08)),
    gate: () => tone(140, 0.7, 'sawtooth', 0.12, 160),
    deny: () => tone(180, 0.2, 'square', 0.1),
    win: () => [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 0.28, 'triangle', 0.17, 0, i * 0.15)),
  };

  // 귀여운 8마디 루프
  const melody = [659, 0, 784, 659, 587, 0, 523, 587, 659, 0, 784, 880, 784, 0, 659, 0,
                  523, 0, 587, 659, 587, 0, 523, 440, 494, 0, 523, 587, 523, 0, 0, 0];
  const bass = [131, 131, 147, 165, 131, 131, 110, 123];
  const BEAT = 0.2;

  function schedule() {
    if (!ctx) return;
    while (nextTime < ctx.currentTime + 0.35) {
      const d = nextTime - ctx.currentTime;
      const n = melody[step % melody.length];
      if (n) tone(n, BEAT * 0.9, 'triangle', 0.045, 0, d);
      if (step % 4 === 0) tone(bass[(step / 4) % bass.length], BEAT * 3, 'sine', 0.06, 0, d);
      nextTime += BEAT;
      step++;
    }
  }

  function startBgm() {
    init();
    if (!ctx || bgmTimer) return;
    nextTime = ctx.currentTime + 0.1;
    bgmTimer = setInterval(schedule, 100);
  }

  function stopBgm() {
    if (bgmTimer) clearInterval(bgmTimer);
    bgmTimer = null;
  }

  function toggle() {
    muted = !muted;
    if (master) master.gain.value = muted ? 0 : 0.5;
    return muted;
  }

  return { init, fx, startBgm, stopBgm, toggle, get muted() { return muted; } };
})();
