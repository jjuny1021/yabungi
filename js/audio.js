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
    clear: () => [659, 784, 988, 1319].forEach((f, i) => tone(f, 0.22, 'triangle', 0.17, 0, i * 0.11)),
    bossHit: () => { tone(160, 0.35, 'sawtooth', 0.2, -90); tone(880, 0.12, 'square', 0.1, 400, 0.05); },
    shatter: () => [2400, 1800, 2900].forEach((f, i) => tone(f, 0.09, 'triangle', 0.07, -600, i * 0.03)),
    throw: () => tone(900, 0.15, 'sine', 0.08, 500),
    ding: () => tone(1800, 0.12, 'triangle', 0.1),
    crumble: () => tone(120, 0.2, 'sawtooth', 0.08, -50),
    warn: () => { tone(740, 0.1, 'square', 0.08); tone(740, 0.1, 'square', 0.08, 0, 0.16); },
  };

  // 귀여운 8마디 루프
  const melody = [659, 0, 784, 659, 587, 0, 523, 587, 659, 0, 784, 880, 784, 0, 659, 0,
                  523, 0, 587, 659, 587, 0, 523, 440, 494, 0, 523, 587, 523, 0, 0, 0];
  const bass = [131, 131, 147, 165, 131, 131, 110, 123];
  // 보스전: 빠르고 긴장감 있는 단조 루프
  const bossMelody = [440, 0, 523, 440, 659, 0, 622, 0, 587, 0, 523, 0, 494, 523, 494, 0,
                      440, 0, 523, 440, 698, 0, 659, 0, 622, 587, 523, 494, 440, 0, 415, 0];
  const bossBass = [110, 110, 87, 87, 98, 98, 82, 82];
  let mode = 'normal';
  let BEAT = 0.2;
  function setMode(m) {
    if (mode === m) return;
    mode = m;
    BEAT = m === 'boss' ? 0.14 : 0.2;
    step = 0;
  }

  function schedule() {
    if (!ctx) return;
    const mel = mode === 'boss' ? bossMelody : melody;
    const bs = mode === 'boss' ? bossBass : bass;
    const boss = mode === 'boss';
    while (nextTime < ctx.currentTime + 0.35) {
      const d = nextTime - ctx.currentTime;
      const n = mel[step % mel.length];
      if (n) tone(n, BEAT * 0.9, boss ? 'square' : 'triangle', boss ? 0.028 : 0.045, 0, d);
      if (step % 4 === 0) tone(bs[(step / 4) % bs.length], BEAT * 3, boss ? 'sawtooth' : 'sine', boss ? 0.035 : 0.06, 0, d);
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

  return { init, fx, startBgm, stopBgm, toggle, setMode, get muted() { return muted; } };
})();
