(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  let W = 960;
  const H = 560;
  let dpr = 1;

  const MAX_HEARTS = 3;
  const GATE_REQUIRED = 30;
  const PHYS = { SPEED: 270, ACC: 2400, AIR_ACC: 1500, FRICTION: 2600, GRAV: 2100, JUMP: 780, MAXFALL: 900 };
  const SPEAKERS = {
    yabung: { name: '야붕이', color: '#4fb4ff' },
    libera: { name: '리베라', color: '#ff5c8a' },
    memory: { name: '리베라 (기억 속 목소리)', color: '#ff9fbc' },
    boss: { name: '냥보스', color: '#8a7bbd' },
  };

  const G = { state: 'title', t: 0, cam: { x: 0 }, particles: [], winT: 0, buttons: [] };
  window.G = G; // 디버그용

  // ───────── 화면 크기 ─────────
  const isTouch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const portrait = window.innerHeight > window.innerWidth;
    // 세로 화면에서는 시야를 좁혀 캐릭터를 크게 보여줌
    W = portrait ? 720 : 960;
    document.body.classList.toggle('portrait', portrait);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const availH = portrait ? window.innerHeight * 0.62 : window.innerHeight;
    const s = Math.min(window.innerWidth / W, availH / H);
    canvas.style.width = `${Math.floor(W * s)}px`;
    canvas.style.height = `${Math.floor(H * s)}px`;
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 200));
  resize();

  // ───────── 입력 ─────────
  const input = { left: false, right: false, jump: false, bark: false };
  const pressed = { jump: false, bark: false };
  const KEYMAP = {
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    Space: 'jump', ArrowUp: 'jump', KeyW: 'jump', KeyZ: 'jump',
    KeyX: 'bark', ShiftLeft: 'bark', ShiftRight: 'bark',
  };

  window.addEventListener('keydown', (e) => {
    const k = KEYMAP[e.code];
    if (k) {
      if (!input[k] && k in pressed) pressed[k] = true;
      input[k] = true;
      e.preventDefault();
    }
    if (e.code === 'Enter' || e.code === 'Escape') e.preventDefault();
    if (!e.repeat) handleMeta(e.code);
  });
  window.addEventListener('keyup', (e) => {
    const k = KEYMAP[e.code];
    if (k) input[k] = false;
  });
  window.addEventListener('blur', () => {
    for (const k in input) input[k] = false;
  });

  function handleMeta(code) {
    Sound.init();
    if (code === 'KeyM') { Sound.toggle(); return; }
    switch (G.state) {
      case 'title':
        if (code === 'Enter' || code === 'Space') startGame();
        break;
      case 'play':
        if (code === 'KeyP' || code === 'Escape') G.state = 'paused';
        else if (code === 'Enter') skipDialog();
        break;
      case 'paused':
        if (code === 'KeyP' || code === 'Escape' || code === 'Enter') G.state = 'play';
        else if (code === 'KeyR') startGame();
        break;
      case 'gameover':
        if (code === 'Enter' || code === 'Space') continueGame();
        else if (code === 'KeyR') startGame();
        break;
      case 'rescue':
        if (code === 'Enter') skipDialog();
        break;
      case 'win':
        if (G.winT > 1.2 && (code === 'Enter' || code === 'KeyR' || code === 'Space')) startGame();
        break;
      default:
        break;
    }
  }

  // 터치
  if (isTouch) document.body.classList.add('touch-on');
  document.querySelectorAll('#touch button[data-k]').forEach((btn) => {
    const k = btn.dataset.k;
    const down = (e) => {
      e.preventDefault();
      Sound.init();
      if (!input[k] && k in pressed) pressed[k] = true;
      input[k] = true;
      btn.classList.add('active');
      if (G.state !== 'play' && G.state !== 'paused' && k === 'jump') canvasTap();
    };
    const up = (e) => {
      e.preventDefault();
      input[k] = false;
      btn.classList.remove('active');
    };
    btn.addEventListener('pointerdown', down);
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    btn.addEventListener('pointerleave', up);
  });
  document.getElementById('pauseBtn').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (G.state === 'play') G.state = 'paused';
    else if (G.state === 'paused') G.state = 'play';
  });
  const fsBtn = document.getElementById('fsBtn');
  const root = document.documentElement;
  if (root.requestFullscreen || root.webkitRequestFullscreen) {
    fsBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const inFs = document.fullscreenElement || document.webkitFullscreenElement;
      if (inFs) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else (root.requestFullscreen || root.webkitRequestFullscreen).call(root).catch?.(() => {});
    });
  } else {
    fsBtn.style.display = 'none';
  }
  canvas.addEventListener('pointerdown', (e) => {
    Sound.init();
    const id = hitButton(toLogical(e));
    if (id) {
      e.preventDefault();
      pressButton(id);
    } else if (G.state === 'play' || G.state === 'rescue') {
      skipDialog();
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    hoverBtn = hitButton(toLogical(e));
    canvas.style.cursor = hoverBtn ? 'pointer' : 'default';
  });

  function canvasTap() {
    if (G.state === 'title') startGame();
    else if (G.state === 'gameover') continueGame();
    else if (G.state === 'win' && G.winT > 1.2) startGame();
    else if (G.state === 'paused') G.state = 'play';
    else if (G.state === 'rescue' || G.state === 'play') skipDialog();
  }

  // ───────── 게임 진행 ─────────
  function startGame() {
    const L = buildLevel();
    G.L = L;
    G.required = Math.min(GATE_REQUIRED, L.treats.length);
    G.treats = 0;
    G.hearts = MAX_HEARTS;
    G.time = 0;
    G.kills = 0;
    G.particles = [];
    G.dialogQ = [];
    G.dialog = null;
    G.shake = 0;
    G.cp = { tx: L.start.x, ty: L.start.y };
    G.winT = 0;
    spawnPlayer();
    G.cam.x = targetCam();
    G.state = 'play';
    pressed.jump = pressed.bark = false;
    Sound.init();
    Sound.startBgm();
  }

  function continueGame() {
    G.hearts = MAX_HEARTS;
    spawnPlayer();
    G.cam.x = targetCam();
    G.state = 'play';
  }

  function spawnPlayer() {
    G.p = {
      x: G.cp.tx * TILE + 3, y: (G.cp.ty + 1) * TILE - 34, w: 34, h: 34,
      vx: 0, vy: 0, onGround: false, facing: 1, coyote: 0, jumpBuf: 0, jumping: false,
      inv: 1.2, hurtT: 0, barkCd: 0, barkT: 0, standing: null,
    };
  }

  function say(speaker, str) {
    G.dialogQ.push({ speaker, text: str, dur: 1.4 + str.length * 0.065 });
  }

  function sayNow(speaker, str) {
    G.dialog = { speaker, text: str, dur: 1.4 + str.length * 0.065, t: 0 };
  }

  function skipDialog() {
    if (!G.dialog) return;
    const shown = Math.floor(G.dialog.t * 40);
    if (shown < G.dialog.text.length) G.dialog.t = G.dialog.text.length / 40 + 0.01;
    else G.dialog = null;
  }

  // ───────── 충돌 ─────────
  function cell(tx, ty) {
    if (tx < 0 || tx >= G.L.cols) return 1;
    if (ty < 0 || ty >= ROWS) return 0;
    return G.L.grid[ty][tx];
  }
  function isSolid(tx, ty) {
    const c = cell(tx, ty);
    return c === 1 || (c === 3 && !G.L.gate.open);
  }

  function moveX(p, dx) {
    p.x += dx;
    const top = Math.floor(p.y / TILE);
    const bot = Math.floor((p.y + p.h - 1) / TILE);
    if (dx > 0) {
      const tx = Math.floor((p.x + p.w) / TILE);
      for (let ty = top; ty <= bot; ty++) {
        if (isSolid(tx, ty)) { p.x = tx * TILE - p.w - 0.001; p.vx = 0; return; }
      }
    } else if (dx < 0) {
      const tx = Math.floor(p.x / TILE);
      for (let ty = top; ty <= bot; ty++) {
        if (isSolid(tx, ty)) { p.x = (tx + 1) * TILE; p.vx = 0; return; }
      }
    }
  }

  function moveY(p, dy, prevBottom) {
    p.y += dy;
    const left = Math.floor(p.x / TILE);
    const right = Math.floor((p.x + p.w - 1) / TILE);
    if (dy > 0) {
      const ty = Math.floor((p.y + p.h) / TILE);
      for (let tx = left; tx <= right; tx++) {
        const c = cell(tx, ty);
        const oneWay = c === 2 && prevBottom <= ty * TILE + 0.5;
        if (isSolid(tx, ty) || oneWay) {
          p.y = ty * TILE - p.h;
          p.vy = 0;
          p.onGround = true;
          return;
        }
      }
    } else if (dy < 0) {
      const ty = Math.floor(p.y / TILE);
      for (let tx = left; tx <= right; tx++) {
        if (isSolid(tx, ty)) { p.y = (ty + 1) * TILE; p.vy = 0; return; }
      }
    }
  }

  const overlap = (a, b, m = 0) =>
    a.x + m < b.x + b.w && a.x + a.w - m > b.x && a.y + m < b.y + b.h && a.y + a.h - m > b.y;
  const approach = (v, target, amt) => (v < target ? Math.min(v + amt, target) : Math.max(v - amt, target));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ───────── 업데이트 ─────────
  function updateMovers(dt) {
    for (const m of G.L.movers) {
      const old = m.x;
      m.x += m.dir * m.speed * dt;
      if (m.x < m.minX) { m.x = m.minX; m.dir = 1; }
      if (m.x > m.maxX) { m.x = m.maxX; m.dir = -1; }
      m.dx = m.x - old;
      if (G.p.standing === m) moveX(G.p, m.dx);
    }
  }

  function updatePlayer(dt, control) {
    const p = G.p;
    p.inv = Math.max(0, p.inv - dt);
    p.hurtT = Math.max(0, p.hurtT - dt);
    p.barkCd = Math.max(0, p.barkCd - dt);
    p.barkT = Math.max(0, p.barkT - dt);

    const canControl = control && p.hurtT <= 0;
    const dir = canControl ? (input.right ? 1 : 0) - (input.left ? 1 : 0) : 0;
    if (dir) p.facing = dir;
    if (dir) p.vx = approach(p.vx, dir * PHYS.SPEED, (p.onGround ? PHYS.ACC : PHYS.AIR_ACC) * dt);
    else if (p.hurtT <= 0) p.vx = approach(p.vx, 0, (p.onGround ? PHYS.FRICTION : PHYS.AIR_ACC * 0.5) * dt);

    p.coyote = p.onGround ? 0.1 : p.coyote - dt;
    p.jumpBuf = canControl && pressed.jump ? 0.12 : p.jumpBuf - dt;
    if (p.jumpBuf > 0 && p.coyote > 0) {
      p.vy = -PHYS.JUMP;
      p.jumpBuf = 0;
      p.coyote = 0;
      p.onGround = false;
      p.standing = null;
      p.jumping = true;
      Sound.fx.jump();
      puff(p.x + p.w / 2, p.y + p.h, 5);
    }
    if (p.jumping && !input.jump && p.vy < -320) p.vy = -320;

    if (canControl && pressed.bark && p.barkCd <= 0) bark();

    p.vy = Math.min(p.vy + PHYS.GRAV * dt, PHYS.MAXFALL);
    const wasGround = p.onGround;
    const fallSpeed = p.vy;
    p.onGround = false;
    moveX(p, p.vx * dt);
    const prevBottom = p.y + p.h;
    moveY(p, p.vy * dt, prevBottom);

    // 움직이는 발판
    p.standing = null;
    if (p.vy >= 0) {
      for (const m of G.L.movers) {
        if (prevBottom <= m.y + 2 && p.y + p.h >= m.y && p.x + p.w > m.x + 2 && p.x < m.x + m.w - 2) {
          p.y = m.y - p.h;
          p.vy = 0;
          p.onGround = true;
          p.standing = m;
        }
      }
    }
    if (p.onGround) p.jumping = false;
    if (!wasGround && p.onGround && fallSpeed > 500) puff(p.x + p.w / 2, p.y + p.h, 6);

    if (p.x < 0) p.x = 0;
    if (p.y > ROWS * TILE + 80 && G.state === 'play') fallInPit();
  }

  function bark() {
    const p = G.p;
    p.barkCd = 1.2;
    p.barkT = 0.45;
    Sound.fx.bark();
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;
    G.particles.push({ type: 'ring', x: cx, y: cy, life: 0.4, max: 0.4, r: 160 });
    for (const e of G.L.enemies) {
      if (e.dead) continue;
      const ex = e.x + e.w / 2;
      const ey = e.y + e.h / 2;
      if (Math.hypot(ex - cx, ey - cy) < 165) e.stun = 2.6;
    }
  }

  function updateEnemies(dt) {
    for (const e of G.L.enemies) {
      if (e.dead) { e.deadT += dt; continue; }
      if (e.stun > 0) {
        e.stun -= dt;
        if (e.type === 'crow') e.y = Math.min(e.y + 20 * dt, e.baseY + 30);
        continue;
      }
      e.x += e.dir * e.speed * dt;
      if (e.x < e.minX) { e.x = e.minX; e.dir = 1; }
      if (e.x + e.w > e.maxX) { e.x = e.maxX - e.w; e.dir = -1; }
      if (e.type === 'crow') {
        e.phase += dt * 3;
        e.y = e.baseY + Math.sin(e.phase) * 26;
      }
    }
    G.L.enemies = G.L.enemies.filter((e) => !e.dead || e.deadT < 0.8);
  }

  function hurt(fromX) {
    const p = G.p;
    if (p.inv > 0) return;
    G.hearts -= 1;
    p.inv = 1.5;
    p.hurtT = 0.28;
    p.vy = -430;
    p.jumping = false;
    p.vx = (p.x + p.w / 2 < fromX ? -1 : 1) * 320;
    G.shake = 0.3;
    Sound.fx.hurt();
    for (let i = 0; i < 6; i++) spark(p.x + p.w / 2, p.y + p.h / 2, '#ff5c8a');
    if (G.hearts <= 0) gameOver();
  }

  function fallInPit() {
    G.hearts -= 1;
    Sound.fx.hurt();
    G.shake = 0.3;
    if (G.hearts <= 0) {
      gameOver();
      return;
    }
    spawnPlayer();
    G.p.inv = 1.5;
    say('yabung', '앗, 떨어졌다! 다시 해보자!');
  }

  function gameOver() {
    G.hearts = 0;
    G.state = 'gameover';
    G.dialog = null;
    G.dialogQ = [];
  }

  function interactions() {
    const L = G.L;
    const p = G.p;
    const pcx = p.x + p.w / 2;

    // 적
    for (const e of L.enemies) {
      if (e.dead || !overlap(p, e, 4)) continue;
      const stomp = p.vy > 60 && p.y + p.h - e.y < 22;
      if (stomp) {
        e.dead = true;
        e.deadT = 0;
        G.kills++;
        p.vy = input.jump ? -680 : -520;
        p.jumping = false;
        Sound.fx.stomp();
        for (let i = 0; i < 8; i++) spark(e.x + e.w / 2, e.y, '#ffe066');
      } else if (e.stun <= 0) {
        hurt(e.x + e.w / 2);
        if (G.state !== 'play') return;
      }
    }

    // 함정
    for (const hz of L.hazards) {
      if (overlap(p, hz, 6) && p.inv <= 0) {
        hurt(p.x + p.w / 2 + p.facing);
        if (G.state !== 'play') return;
        p.vy = -620;
      }
    }

    // 간식
    for (const tr of L.treats) {
      if (tr.taken) continue;
      if (Math.abs(pcx - tr.x) < 26 && Math.abs(p.y + p.h / 2 - tr.y) < 30) {
        tr.taken = true;
        G.treats++;
        Sound.fx.treat();
        for (let i = 0; i < 6; i++) spark(tr.x, tr.y, '#ffd56b');
        if (G.treats === G.required) say('yabung', `간식 ${G.required}개 모았다! 이제 철문을 열 수 있어!`);
      }
    }

    // 하트
    for (const h of L.hearts) {
      if (h.taken || G.hearts >= MAX_HEARTS) continue;
      if (Math.abs(pcx - h.x) < 26 && Math.abs(p.y + p.h / 2 - h.y) < 30) {
        h.taken = true;
        G.hearts++;
        Sound.fx.heart();
        for (let i = 0; i < 8; i++) G.particles.push(heartParticle(h.x, h.y));
      }
    }

    // 체크포인트
    for (const cp of L.checkpoints) {
      if (!cp.active && pcx > cp.x - 10) {
        cp.active = true;
        G.cp = { tx: cp.tx, ty: cp.ty };
        Sound.fx.checkpoint();
        for (let i = 0; i < 10; i++) spark(cp.x + 16, 11 * TILE - 20, '#ff7aa8');
        if (cp.text) say(cp.speaker, cp.text);
      }
    }

    // 스토리 트리거
    for (const tg of L.triggers) {
      if (!tg.done && p.x > tg.x) {
        tg.done = true;
        say(tg.speaker, tg.text);
      }
    }

    // 철문
    const gate = L.gate;
    gate.msgCd = Math.max(0, gate.msgCd - 1 / 120);
    if (!gate.open && p.x + p.w >= gate.x * TILE - 6 && p.x < gate.x * TILE + TILE) {
      if (G.treats >= G.required) {
        gate.open = true;
        gate.openT = 0;
        Sound.fx.gate();
        G.shake = 0.5;
        say('yabung', '철문이 열렸다! 엄마, 지금 갈게요!');
      } else if (gate.msgCd <= 0) {
        gate.msgCd = 4;
        Sound.fx.deny();
        sayNow('boss', `냐옹~ 간식이 ${G.required - G.treats}개나 모자란다냥! 돌아가서 더 모아 와라냥!`);
      }
    }

    // 리베라 구출
    if (gate.open && p.x + p.w >= L.cage.x * TILE - 24) startRescue();
  }

  function startRescue() {
    G.state = 'rescue';
    G.rescueT = 0;
    G.dialogQ = [];
    G.dialog = null;
    say('libera', '야붕아…? 정말 우리 야붕이니?');
    say('yabung', '엄마! 리베라 엄마! 제가 구하러 왔어요!');
    say('libera', '이렇게 용감하게 자랐구나… 고마워, 우리 아가.');
    say('yabung', '이제 같이 집에 가요. 다시는 안 떨어질 거예요!');
    Sound.fx.gate();
  }

  function updateRescue(dt) {
    G.rescueT += dt;
    const c = G.L.cage;
    c.doorT = Math.min(1, G.rescueT / 1.2);
    if (G.rescueT > 1.2) {
      const target = G.p.x + G.p.w / 2 + 56;
      c.lx += (target - c.lx) * Math.min(1, dt * 2.2);
      c.lrun = Math.abs(target - c.lx) > 4;
    }
    if (G.rescueT > 1.6 && Math.random() < dt * 5) {
      G.particles.push(heartParticle(G.p.x + G.p.w / 2 + 28 + (Math.random() - 0.5) * 40, G.p.y - 10));
    }
    if (G.rescueT > 3.5 && !G.dialog && G.dialogQ.length === 0) win();
  }

  function win() {
    G.state = 'win';
    G.winT = 0;
    const best = Number(localStorage.getItem('yabungi_best') || 0);
    G.newBest = !best || G.time < best;
    if (G.newBest) localStorage.setItem('yabungi_best', String(G.time));
    G.best = G.newBest ? G.time : best;
    const total = G.L.treats.length;
    G.stars = 1 + (G.treats >= total * 0.85 ? 1 : 0) + (G.hearts >= 2 ? 1 : 0);
    Sound.fx.win();
  }

  function updateDialog(dt) {
    if (!G.dialog && G.dialogQ.length) G.dialog = { ...G.dialogQ.shift(), t: 0 };
    if (G.dialog) {
      G.dialog.t += dt;
      if (G.dialog.t > G.dialog.dur) G.dialog = null;
    }
  }

  // ───────── 파티클 ─────────
  function spark(x, y, color) {
    const a = Math.random() * Math.PI * 2;
    const s = 80 + Math.random() * 160;
    G.particles.push({ type: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, g: 400, life: 0.6, max: 0.6, color, size: 3 + Math.random() * 3 });
  }
  function puff(x, y, n) {
    for (let i = 0; i < n; i++) {
      G.particles.push({ type: 'dot', x: x + (Math.random() - 0.5) * 20, y, vx: (Math.random() - 0.5) * 80, vy: -Math.random() * 50, g: 0, life: 0.4, max: 0.4, color: 'rgba(255,255,255,0.8)', size: 4 + Math.random() * 3 });
    }
  }
  function heartParticle(x, y) {
    return { type: 'heart', x, y, vx: (Math.random() - 0.5) * 40, vy: -60 - Math.random() * 60, g: -10, life: 1.6, max: 1.6, size: 12 + Math.random() * 8 };
  }
  function updateParticles(dt) {
    for (const q of G.particles) {
      q.life -= dt;
      if (q.vx !== undefined) {
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        q.vy += (q.g || 0) * dt;
      }
    }
    G.particles = G.particles.filter((q) => q.life > 0);
  }

  function targetCam() {
    return clamp(G.p.x + G.p.w / 2 - W * 0.42, 0, G.L.cols * TILE - W);
  }

  function tick(dt) {
    G.t += dt;
    if (G.state === 'play') {
      G.time += dt;
      updateMovers(dt);
      updatePlayer(dt, true);
      updateEnemies(dt);
      if (G.state === 'play') interactions();
    } else if (G.state === 'rescue') {
      updateMovers(dt);
      updatePlayer(dt, false);
      updateEnemies(dt);
      updateRescue(dt);
    } else if (G.state === 'win') {
      G.winT += dt;
      if (Math.random() < dt * 4) G.particles.push(heartParticle(Math.random() * W + G.cam.x, H - 40));
    }
    if (G.state !== 'title' && G.state !== 'paused') {
      updateParticles(dt);
      updateDialog(dt);
      if (G.L.gate.open) G.L.gate.openT += dt;
      G.cam.x += (targetCam() - G.cam.x) * Math.min(1, dt * 8);
      G.shake = Math.max(0, (G.shake || 0) - dt);
    }
  }

  // ───────── 렌더 ─────────
  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    G.buttons = [];
    if (G.state === 'title') {
      renderTitle();
      return;
    }
    const L = G.L;
    const camX = Math.round(G.cam.x);
    const zone = zoneOf(Math.floor((camX + W / 2) / TILE));
    drawBackground(ctx, zone, camX, G.t, W, H);

    ctx.save();
    const sh = G.shake > 0 ? G.shake * 18 : 0;
    ctx.translate(-camX + (Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);

    drawCageBack(ctx, L.cage);
    // 리베라
    const c = L.cage;
    const freed = G.state !== 'play';
    drawHuman(ctx, c.lx, 12 * TILE - 12 * (1 - c.doorT), 1.0, -1, G.t, {
      walk: c.lrun, reach: freed && !c.lrun && c.doorT >= 1, happy: freed && !c.lrun, sad: !freed,
    });
    drawCageFront(ctx, c);
    if (G.state === 'play' && Math.abs(G.p.x - c.x * TILE) < 700 && Math.sin(G.t * 2) > -0.2) {
      drawBubble(ctx, c.lx, 12 * TILE - 150, L.gate.open ? '야붕아! 여기야!' : '야붕아… 엄마 여기 있어!');
    }

    drawTiles(ctx, L, camX, W);
    drawGate(ctx, L.gate, G.treats, G.required, G.t);
    for (const m of L.movers) drawMover(ctx, m, zoneOf(Math.floor(m.x / TILE)));
    for (const hz of L.hazards) drawHazard(ctx, hz, G.t);
    for (const cp of L.checkpoints) drawFlag(ctx, cp.x, (cp.ty + 1) * TILE, cp.active, G.t);
    for (const tr of L.treats) {
      if (!tr.taken) drawBone(ctx, tr.x, tr.y + Math.sin(G.t * 3 + tr.x * 0.05) * 3, 1, Math.sin(G.t * 2 + tr.x) * 0.25);
    }
    for (const h of L.hearts) {
      if (!h.taken) drawHeartItem(ctx, h.x, h.y + Math.sin(G.t * 3) * 3, 22);
    }
    for (const e of L.enemies) {
      const o = { stun: e.stun > 0, dead: e.dead, deadT: e.deadT };
      if (e.type === 'cat') drawCat(ctx, e.x + e.w / 2, e.y + e.h, e.dir, G.t + e.x * 0.01, o);
      else drawCrow(ctx, e.x + e.w / 2, e.y + e.h / 2, e.dir, G.t + e.phase, o);
    }

    // 야붕이
    const p = G.p;
    if (!(p.inv > 0 && Math.floor(G.t * 18) % 2 === 0 && G.state === 'play')) {
      drawDog(ctx, p.x + p.w / 2, p.y + p.h, 1, p.facing, G.t, {
        run: p.onGround && Math.abs(p.vx) > 30, air: !p.onGround, collar: true,
        bark: p.barkT > 0, happy: G.state === 'rescue' || G.state === 'win',
      });
    }
    if (p.barkT > 0) {
      text(ctx, '멍멍!', p.x + p.w / 2 + p.facing * 30, p.y - 26 - (0.45 - p.barkT) * 30, 22, '#ffd56b', 'center', '#7a4b1c', 5);
    }

    drawParticles();
    ctx.restore();

    drawHUD();
    drawDialog();

    if (G.state === 'paused') drawPause();
    else if (G.state === 'gameover') drawGameOver();
    else if (G.state === 'win') drawWin();
  }

  function drawParticles() {
    for (const q of G.particles) {
      const a = Math.max(0, q.life / q.max);
      ctx.globalAlpha = a;
      if (q.type === 'ring') {
        ctx.strokeStyle = '#ffd56b';
        ctx.lineWidth = 6 * a;
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.r * (1 - a) + 10, 0, Math.PI * 2);
        ctx.stroke();
      } else if (q.type === 'heart') {
        ctx.fillStyle = '#ff7aa8';
        heartPath(ctx, q.x, q.y, q.size);
        ctx.fill();
      } else if (q.type === 'spark') {
        ctx.fillStyle = q.color;
        starPath(ctx, q.x, q.y, q.size);
        ctx.fill();
      } else {
        ctx.fillStyle = q.color;
        circle(ctx, q.x, q.y, q.size);
      }
    }
    ctx.globalAlpha = 1;
  }

  function fmtTime(s) {
    const m = Math.floor(s / 60);
    const ss = Math.floor(s % 60);
    return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  }

  function drawHUD() {
    // 하트 + 간식
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    rr(ctx, 14, 12, 268, 56, 18);
    ctx.fill();
    for (let i = 0; i < MAX_HEARTS; i++) {
      ctx.fillStyle = i < G.hearts ? '#ff5c8a' : '#e3d9d2';
      heartPath(ctx, 42 + i * 32, 27, 26);
      ctx.fill();
    }
    drawBone(ctx, 160, 40, 1.15, -0.25);
    const ok = G.treats >= G.required;
    text(ctx, `${G.treats} / ${G.required}`, 184, 41, 24, ok ? '#2f9e5a' : '#4a3a5c', 'left');

    // 구역
    const zi = zoneOf(Math.floor((G.p.x) / TILE));
    ctx.font = `20px ${FONT}`;
    const zw = ctx.measureText(ZONE_NAMES[zi]).width + 36;
    ctx.fillStyle = 'rgba(42,33,64,0.72)';
    rr(ctx, W / 2 - zw / 2, 14, zw, 38, 19);
    ctx.fill();
    text(ctx, ZONE_NAMES[zi], W / 2, 34, 20, '#fff');

    // 시간 + 진행도
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    rr(ctx, W - 176, 12, 162, 56, 18);
    ctx.fill();
    text(ctx, fmtTime(G.time), W - 95, 32, 24, '#4a3a5c');
    const prog = clamp(G.p.x / (G.L.cage.x * TILE), 0, 1);
    ctx.fillStyle = '#e8e0f2';
    rr(ctx, W - 160, 50, 130, 8, 4);
    ctx.fill();
    ctx.fillStyle = '#ff7aa8';
    rr(ctx, W - 160, 50, Math.max(8, 130 * prog), 8, 4);
    ctx.fill();

    // 짖기 쿨다운
    const ready = G.p.barkCd <= 0;
    ctx.fillStyle = ready ? 'rgba(255,213,107,0.95)' : 'rgba(255,255,255,0.6)';
    rr(ctx, 14, 76, 120, 30, 15);
    ctx.fill();
    const keyHint = isTouch ? '' : 'X  ';
    text(ctx, ready ? `${keyHint}멍멍 준비!` : `${keyHint}충전 중…`, 74, 92, 16, '#5a3d14');
    if (Sound.muted) text(ctx, '소리 꺼짐 (M)', W - 70, 88, 14, '#fff', 'center', 'rgba(0,0,0,0.4)', 4);
  }

  function drawPortrait(speaker, x, y) {
    ctx.save();
    ctx.fillStyle = SPEAKERS[speaker].color;
    circle(ctx, x, y, 33);
    ctx.fillStyle = '#fff7fb';
    circle(ctx, x, y, 29);
    ctx.beginPath();
    ctx.arc(x, y, 29, 0, Math.PI * 2);
    ctx.clip();
    if (speaker === 'boss') {
      ctx.translate(x - 20, y + 40);
      ctx.scale(1.7, 1.7);
      drawCat(ctx, 0, 0, 1, G.t, { boss: true });
    } else {
      if (speaker === 'yabung') {
        drawDog(ctx, x - 25, y + 46, 1.55, 1, G.t, { collar: true });
      } else {
        drawHuman(ctx, x - 6, y + 82 * 1.3 + 2, 1.3, 1, G.t, { closed: speaker === 'memory' });
      }
    }
    ctx.restore();
  }

  function drawDialog() {
    const d = G.dialog;
    if (!d) return;
    const appear = Math.min(1, d.t * 6);
    // 지면의 캐릭터를 가리지 않도록 화면 상단(HUD 아래)에 표시
    const y = 116 - (1 - appear) * 20;
    const x0 = W >= 900 ? 150 : 24;
    const bw = W - x0 * 2;
    ctx.globalAlpha = appear;
    ctx.fillStyle = 'rgba(255,255,255,0.94)';
    rr(ctx, x0, y, bw, 80, 20);
    ctx.fill();
    ctx.strokeStyle = SPEAKERS[d.speaker].color;
    ctx.lineWidth = 4;
    ctx.stroke();
    drawPortrait(d.speaker, x0 + 44, y + 40);
    text(ctx, SPEAKERS[d.speaker].name, x0 + 90, y + 21, 17, SPEAKERS[d.speaker].color, 'left');
    const shown = d.text.slice(0, Math.floor(d.t * 40));
    wrapText(shown, x0 + 90, y + 51, bw - 110, 20, '#3d3150', 23);
    ctx.globalAlpha = 1;
  }

  function wrapText(str, x, y, maxW, size, color, lineH) {
    ctx.font = `${size}px ${FONT}`;
    const lines = [];
    let cur = '';
    for (const ch of str) {
      if (ctx.measureText(cur + ch).width > maxW) {
        lines.push(cur);
        cur = ch;
      } else cur += ch;
    }
    lines.push(cur);
    const startY = y - ((lines.length - 1) * lineH) / 2;
    lines.forEach((ln, i) => text(ctx, ln, x, startY + i * lineH, size, color, 'left'));
  }

  function overlay(alpha = 0.55) {
    ctx.fillStyle = `rgba(30,22,52,${alpha})`;
    ctx.fillRect(0, 0, W, H);
  }

  function panel(x, y, w, h) {
    ctx.fillStyle = '#fffaf4';
    rr(ctx, x, y, w, h, 28);
    ctx.fill();
    ctx.strokeStyle = '#ff7aa8';
    ctx.lineWidth = 5;
    ctx.stroke();
  }

  // ───────── 메뉴 버튼 (터치·마우스 공용) ─────────
  const BTN_COLORS = {
    pink: ['#ff5c8a', '#d13d6b', '#fff'],
    yellow: ['#ffd56b', '#d9a93a', '#5a3d14'],
    lilac: ['#ece6f7', '#c7bce0', '#4a3a5c'],
  };
  let hoverBtn = null;
  function button(id, label, cx, cy, w, h, color = 'pink', size = 26) {
    const [bg, shade, fg] = BTN_COLORS[color];
    const down = G.pressedBtn === id && G.t - G.pressedAt < 0.15;
    const lift = down ? 2 : hoverBtn === id ? -2 : 0;
    const x = cx - w / 2;
    const y = cy - h / 2 + lift;
    ctx.fillStyle = shade;
    rr(ctx, x, cy - h / 2 + 5, w, h, h / 2);
    ctx.fill();
    ctx.fillStyle = bg;
    rr(ctx, x, y, w, h, h / 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    rr(ctx, x + 10, y + 5, w - 20, h * 0.32, h * 0.16);
    ctx.fill();
    text(ctx, label, cx, y + h / 2 + 1, size, fg);
    // 손가락으로 누르기 쉽도록 판정 영역은 조금 더 넓게
    G.buttons.push({ id, x: x - 6, y: cy - h / 2 - 6, w: w + 12, h: h + 17 });
  }

  function soundLabel() {
    return Sound.muted ? '소리 켜기' : '소리 끄기';
  }

  function pressButton(id) {
    G.pressedBtn = id;
    G.pressedAt = G.t;
    Sound.init();
    switch (id) {
      case 'start':
      case 'restart':
        startGame();
        break;
      case 'resume':
        G.state = 'play';
        break;
      case 'continue':
        continueGame();
        break;
      case 'home':
        G.state = 'title';
        break;
      case 'sound':
        Sound.toggle();
        if (!Sound.muted) Sound.fx.treat();
        break;
      default:
        break;
    }
  }

  function toLogical(e) {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  }

  function hitButton(p) {
    for (let i = G.buttons.length - 1; i >= 0; i--) {
      const b = G.buttons[i];
      if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) return b.id;
    }
    return null;
  }

  function drawPause() {
    overlay();
    panel(W / 2 - 200, 80, 400, 410);
    text(ctx, '잠깐 쉬는 중', W / 2, 135, 40, '#4a3a5c');
    button('resume', '▶  계속하기', W / 2, 215, 280, 62, 'pink', 28);
    button('restart', '처음부터 다시', W / 2, 295, 280, 56, 'yellow', 24);
    button('sound', soundLabel(), W / 2 - 72, 370, 136, 50, 'lilac', 21);
    button('home', '처음 화면', W / 2 + 72, 370, 136, 50, 'lilac', 21);
    if (!isTouch) text(ctx, '키보드: P 계속 · R 처음부터 · M 소리', W / 2, 446, 16, '#9a8aac');
  }

  function drawGameOver() {
    overlay(0.6);
    panel(W / 2 - 270, 90, 540, 390);
    drawDog(ctx, W / 2, 215, 2, 1, G.t, { closed: true, collar: true });
    text(ctx, '야붕이가 지쳐 쓰러졌어요…', W / 2, 255, 32, '#4a3a5c');
    text(ctx, '엄마가 기다리고 있어. 다시 힘내자!', W / 2, 295, 20, '#8a6a9c');
    button('continue', '▶  깃발에서 다시', W / 2, 360, 320, 62, 'pink', 27);
    button('restart', '처음부터', W / 2 - 84, 432, 156, 50, 'yellow', 21);
    button('home', '처음 화면', W / 2 + 84, 432, 156, 50, 'lilac', 21);
  }

  function drawWin() {
    overlay(0.5);
    const a = Math.min(1, G.winT * 2);
    ctx.globalAlpha = a;
    panel(W / 2 - 300, 50, 600, 460);
    text(ctx, '리베라 구출 성공!', W / 2, 105, 44, '#ff5c8a', 'center', '#fff', 8);
    // 재회한 두 강아지
    ctx.fillStyle = '#ffeef4';
    ellipse(ctx, W / 2, 222, 150, 62);
    drawDog(ctx, W / 2 - 46, 262, 1.6, 1, G.t, { happy: true, collar: true });
    drawHuman(ctx, W / 2 + 44, 262, 1.12, -1, G.t + 1, { happy: true, reach: true });
    drawHeartItem(ctx, W / 2 - 20, 176 + Math.sin(G.t * 3) * 4, 24);

    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < G.stars ? '#ffc93c' : '#e3d9d2';
      starPath(ctx, W / 2 - 60 + i * 60, 312, 22);
      ctx.fill();
    }
    const total = G.L.treats.length;
    text(ctx, `걸린 시간  ${fmtTime(G.time)}${G.newBest ? '  (최고 기록!)' : `   최고 ${fmtTime(G.best)}`}`, W / 2, 360, 22, '#4a3a5c');
    text(ctx, `모은 간식  ${G.treats} / ${total}     남은 하트  ${G.hearts}     물리친 적  ${G.kills}`, W / 2, 396, 20, '#6a5a7c');
    text(ctx, '야붕이와 리베라는 함께 집으로 돌아갔어요.', W / 2, 430, 19, '#8a6a9c');
    ctx.globalAlpha = 1;
    if (G.winT > 1.2) {
      button('restart', '▶  다시 모험하기', W / 2 - 70, 476, 250, 50, 'pink', 23);
      button('home', '처음 화면', W / 2 + 135, 476, 140, 50, 'lilac', 20);
    }
  }

  function renderTitle() {
    const camX = G.t * 70;
    drawBackground(ctx, 0, camX, G.t, W, H);
    // 바닥
    const P = PAL[0];
    ctx.fillStyle = P.dirt;
    ctx.fillRect(0, 470, W, 90);
    ctx.fillStyle = P.top;
    ctx.fillRect(0, 470, W, 12);
    for (let x = -((camX) % 40); x < W; x += 40) {
      ctx.fillStyle = P.dirtDark;
      ctx.fillRect(x + 12, 500, 5, 4);
      ctx.fillStyle = P.top;
      for (let i = 0; i < 4; i++) circle(ctx, x + 5 + i * 10, 482, 4);
    }
    drawDog(ctx, Math.max(120, W / 2 - 330), 470, 2.2, 1, G.t, { run: true, collar: true });
    for (let i = 0; i < 3; i++) {
      drawBone(ctx, ((600 + i * 160 - camX * 1.0) % 1100 + 1100) % 1100, 430 + Math.sin(G.t * 3 + i) * 6, 1.2, Math.sin(G.t + i) * 0.3);
    }

    // 로고
    ctx.save();
    ctx.translate(W / 2, 112);
    ctx.rotate(-0.03);
    text(ctx, '야붕이', 0, 0, 92, '#ffffff', 'center', '#ff5c8a', 18);
    ctx.restore();
    ctx.fillStyle = '#ff5c8a';
    rr(ctx, W / 2 - 150, 160, 300, 44, 22);
    ctx.fill();
    text(ctx, '리베라를 찾아서', W / 2, 183, 28, '#fff');
    drawHeartItem(ctx, W / 2 + 175, 72, 30);

    // 스토리 카드
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    rr(ctx, W / 2 - 300, 222, 600, 150, 22);
    ctx.fill();
    text(ctx, '어느 날 밤, 엄마 리베라가 냥보스 일당에게 붙잡혀 갔어요.', W / 2, 252, 20, '#4a3a5c');
    text(ctx, '하얀 곱슬털 강아지 야붕이는 엄마의 냄새를 따라 모험을 떠납니다.', W / 2, 282, 20, '#4a3a5c');
    text(ctx, `간식 ${GATE_REQUIRED}개를 모아 철문을 열고 엄마를 구해주세요!`, W / 2, 312, 20, '#ff5c8a');
    text(ctx, isTouch
      ? '◀ ▶ 이동     점프 버튼     멍! 버튼 = 적 기절'
      : '← → 이동   스페이스 점프   X 멍멍(적 기절)   P 일시정지   M 소리', W / 2, 348, 16, '#7a6a8c');

    const pulse = 1 + Math.sin(G.t * 4) * 0.03;
    ctx.save();
    ctx.translate(W / 2, 416);
    ctx.scale(pulse, pulse);
    ctx.translate(-W / 2, -416);
    button('start', '▶  모험 시작', W / 2, 416, 280, 68, 'pink', 32);
    ctx.restore();
    button('sound', Sound.muted ? '소리 꺼짐' : '소리 켜짐', W - 92, 516, 150, 44, 'lilac', 19);
    if (!isTouch) text(ctx, 'Enter 키로도 시작할 수 있어요', W / 2, 466, 16, '#ffffff', 'center', 'rgba(0,0,0,0.35)', 4);
    const best = Number(localStorage.getItem('yabungi_best') || 0);
    if (best) text(ctx, `최고 기록 ${fmtTime(best)}`, 90, 530, 18, '#fff', 'center', 'rgba(0,0,0,0.35)', 4);
  }

  // ───────── 메인 루프 ─────────
  const STEP = 1 / 120;
  let last = performance.now();
  let acc = 0;
  let shownState = null;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    acc += dt;
    if (shownState !== G.state) {
      shownState = G.state;
      // 플레이 중에만 이동/점프 버튼 표시 → 메뉴 버튼을 가리지 않음
      document.body.classList.toggle('playing', G.state === 'play' || G.state === 'rescue');
      document.body.classList.toggle('paused', G.state === 'paused');
    }
    if (G.state === 'title' || G.state === 'paused') G.t += dt;
    while (acc >= STEP) {
      if (G.state !== 'title' && G.state !== 'paused') tick(STEP);
      pressed.jump = false;
      pressed.bark = false;
      acc -= STEP;
    }
    render();
    requestAnimationFrame(frame);
  }

  if (document.fonts && document.fonts.load) {
    document.fonts.load(`24px Jua`).finally(() => requestAnimationFrame(frame));
  } else {
    requestAnimationFrame(frame);
  }
})();
