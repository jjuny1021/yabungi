(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  let W = 960;
  const H = 560;
  let dpr = 1;

  const MAX_HEARTS = 3;
  const MAX_LIVES = 3;
  const GROUND_Y = 12 * TILE;
  const PHYS = { SPEED: 270, ACC: 2400, AIR_ACC: 1500, FRICTION: 2600, GRAV: 2100, JUMP: 780, MAXFALL: 900 };
  const SPEAKERS = {
    yabung: { name: '야붕이', color: '#4fb4ff' },
    libera: { name: '리베라', color: '#ff5c8a' },
    memory: { name: '리베라 (기억 속 목소리)', color: '#ff9fbc' },
    nowon: { name: '노원대장 김현오', color: '#d8413f' },
    glass: { name: '글라스킴', color: '#9b5de5' },
  };

  const G = { state: 'title', t: 0, cam: { x: 0 }, particles: [], proj: [], winT: 0, buttons: [], stage: 1 };
  window.G = G; // 디버그용

  const savedStage = () => Math.min(5, Math.max(1, Number(localStorage.getItem('yabungi_stage') || 1)));

  // ───────── 화면 크기 ─────────
  const isTouch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const portrait = window.innerHeight > window.innerWidth;
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
        if (code === 'Enter' || code === 'Space') newRun(1);
        else if (code === 'KeyC' && savedStage() > 1) newRun(savedStage());
        break;
      case 'play':
        if (code === 'KeyP' || code === 'Escape') G.state = 'paused';
        else if (code === 'Enter') skipDialog();
        break;
      case 'paused':
        if (code === 'KeyP' || code === 'Escape' || code === 'Enter') G.state = 'play';
        else if (code === 'KeyR') retryStage();
        break;
      case 'gameover':
        if (code === 'Enter' || code === 'Space') (G.lives > 0 ? continueGame() : retryStage());
        else if (code === 'KeyR') retryStage();
        break;
      case 'rescue':
        if (code === 'Enter') skipDialog();
        break;
      case 'clear':
        if (G.clearT > 0.8 && (code === 'Enter' || code === 'Space')) nextStage();
        break;
      case 'win':
        if (G.winT > 1.2 && (code === 'Enter' || code === 'KeyR' || code === 'Space')) newRun(1);
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

  // ───────── 게임 진행 ─────────
  function newRun(stage) {
    G.run = { time: 0, treats: 0, totalTreats: 0, kills: 0, deaths: 0, fromStart: stage === 1 };
    startStage(stage);
  }

  function startStage(n) {
    const L = buildStage(n);
    G.stage = n;
    G.L = L;
    G.required = L.gate && L.gate.req != null ? L.gate.req : null;
    G.treats = 0;
    G.hearts = MAX_HEARTS;
    G.lives = MAX_LIVES;
    G.time = 0;
    G.kills = 0;
    G.particles = [];
    G.proj = [];
    G.dialogQ = [];
    G.dialog = null;
    G.shake = 0;
    G.boss = null;
    G.cp = { tx: L.start.x, ty: L.start.y };
    G.winT = 0;
    G.cardT = 2.8;
    G.shieldHint = false;
    spawnPlayer();
    G.cam.x = targetCam();
    G.state = 'play';
    pressed.jump = pressed.bark = false;
    Sound.init();
    Sound.setMode('normal');
    Sound.startBgm();
  }

  function retryStage() {
    G.run.deaths += 1;
    startStage(G.stage);
  }

  function nextStage() {
    if (G.stage >= 5) return;
    startStage(G.stage + 1);
  }

  function continueGame() {
    G.hearts = MAX_HEARTS;
    G.proj = [];
    resetBossFight();
    spawnPlayer();
    G.cam.x = targetCam();
    G.state = 'play';
  }

  function spawnPlayer() {
    G.p = {
      x: G.cp.tx * TILE + 3, y: (G.cp.ty + 1) * TILE - 34, w: 34, h: 34,
      vx: 0, vy: 0, onGround: false, onIce: false, facing: 1, coyote: 0, jumpBuf: 0, jumping: false,
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
  const dialogIdle = () => !G.dialog && G.dialogQ.length === 0;

  // ───────── 충돌 ─────────
  function cell(tx, ty) {
    if (tx < 0 || tx >= G.L.cols) return 1;
    if (ty < 0 || ty >= ROWS) return 0;
    const c = G.L.grid[ty][tx];
    if (c === 4) {
      const cr = G.L.crumbles[`${tx},${ty}`];
      return cr && cr.state === 'gone' ? 0 : 4;
    }
    return c;
  }
  function isSolid(tx, ty) {
    const c = cell(tx, ty);
    if (c === 1 || c === 5) return true;
    if (c === 3) return !G.L.gate.open;
    if (c === 6) return !!(G.L.arena && G.L.arena.locked);
    return false;
  }

  function moveX(p, dx) {
    p.x += dx;
    const top = Math.floor(p.y / TILE);
    const bot = Math.floor((p.y + p.h - 1) / TILE);
    if (dx > 0) {
      const tx = Math.floor((p.x + p.w) / TILE);
      for (let ty = top; ty <= bot; ty++) {
        if (isSolid(tx, ty)) { p.x = tx * TILE - p.w - 0.001; p.vx = 0; return true; }
      }
    } else if (dx < 0) {
      const tx = Math.floor(p.x / TILE);
      for (let ty = top; ty <= bot; ty++) {
        if (isSolid(tx, ty)) { p.x = (tx + 1) * TILE; p.vx = 0; return true; }
      }
    }
    return false;
  }

  function moveY(p, dy, prevBottom) {
    p.y += dy;
    const left = Math.floor(p.x / TILE);
    const right = Math.floor((p.x + p.w - 1) / TILE);
    if (dy > 0) {
      const ty = Math.floor((p.y + p.h) / TILE);
      for (let tx = left; tx <= right; tx++) {
        const c = cell(tx, ty);
        const oneWay = (c === 2 || c === 4) && prevBottom <= ty * TILE + 0.5;
        if (isSolid(tx, ty) || oneWay) {
          p.y = ty * TILE - p.h;
          p.vy = 0;
          p.onGround = true;
          if (p === G.p) {
            p.onIce = c === 5;
            if (c === 4) touchCrumble(tx, ty);
          }
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

  function touchCrumble(tx, ty) {
    const cr = G.L.crumbles[`${tx},${ty}`];
    if (cr && cr.state === 'ok') {
      cr.state = 'shake';
      cr.t = 0.45;
      Sound.fx.crumble();
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

  function updateCrumbles(dt) {
    for (const k in G.L.crumbles) {
      const cr = G.L.crumbles[k];
      if (cr.state === 'shake') {
        cr.t -= dt;
        if (cr.t <= 0) {
          cr.state = 'gone';
          cr.respawn = 3;
          for (let i = 0; i < 4; i++) puff(cr.x * TILE + 20, cr.y * TILE + 8, 1);
        }
      } else if (cr.state === 'gone') {
        cr.respawn -= dt;
        if (cr.respawn <= 0) {
          const box = { x: cr.x * TILE, y: cr.y * TILE - 2, w: TILE, h: 18 };
          if (!overlap(G.p, box)) cr.state = 'ok';
        }
      }
    }
  }

  function updatePlayer(dt, control) {
    const p = G.p;
    p.inv = Math.max(0, p.inv - dt);
    p.hurtT = Math.max(0, p.hurtT - dt);
    p.barkCd = Math.max(0, p.barkCd - dt);
    p.barkT = Math.max(0, p.barkT - dt);

    const ice = p.onGround && p.onIce;
    const canControl = control && p.hurtT <= 0;
    const dir = canControl ? (input.right ? 1 : 0) - (input.left ? 1 : 0) : 0;
    if (dir) p.facing = dir;
    const acc = p.onGround ? (ice ? PHYS.ACC * 0.32 : PHYS.ACC) : PHYS.AIR_ACC;
    const fric = p.onGround ? (ice ? PHYS.FRICTION * 0.1 : PHYS.FRICTION) : PHYS.AIR_ACC * 0.5;
    if (dir) p.vx = approach(p.vx, dir * PHYS.SPEED * (ice ? 1.15 : 1), acc * dt);
    else if (p.hurtT <= 0) p.vx = approach(p.vx, 0, fric * dt);

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

    p.standing = null;
    if (p.vy >= 0) {
      for (const m of G.L.movers) {
        if (prevBottom <= m.y + 2 && p.y + p.h >= m.y && p.x + p.w > m.x + 2 && p.x < m.x + m.w - 2) {
          p.y = m.y - p.h;
          p.vy = 0;
          p.onGround = true;
          p.onIce = false;
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
    G.particles.push({ type: 'ring', x: cx, y: cy, life: 0.4, max: 0.4, r: 170 });
    for (const e of G.L.enemies) {
      if (e.dead) continue;
      if (Math.hypot(e.x + e.w / 2 - cx, e.y + e.h / 2 - cy) < 170) e.stun = 2.4;
    }
    const B = G.boss;
    if (B && B.active && !B.defeated) {
      const d = Math.hypot(B.x + B.w / 2 - cx, B.y + B.h * 0.6 - cy);
      if (d < 200) bossBarked(B);
    }
  }

  function updateEnemies(dt) {
    for (const e of G.L.enemies) {
      if (e.dead) { e.deadT += dt; continue; }
      if (e.stun > 0) {
        e.stun -= dt;
        if (e.type === 'crow') e.y = Math.min(e.y + 20 * dt, e.baseY + 30);
        if (e.type === 'hopper') hopperGravity(e, dt);
        continue;
      }
      e.x += e.dir * e.speed * dt;
      if (e.x < e.minX) { e.x = e.minX; e.dir = 1; }
      if (e.x + e.w > e.maxX) { e.x = e.maxX - e.w; e.dir = -1; }
      if (e.type === 'crow') {
        e.phase += dt * 3;
        e.y = e.baseY + Math.sin(e.phase) * 26;
      } else if (e.type === 'hopper') {
        const grounded = e.y >= e.groundY - e.h - 0.5;
        if (grounded) {
          e.hopT -= dt;
          if (e.hopT <= 0) {
            e.vy = -640;
            e.hopT = 1.1 + Math.random() * 0.8;
            // 야붕이 쪽으로 방향 전환
            const px = G.p.x + G.p.w / 2;
            if (Math.abs(px - e.x) < 300) e.dir = px > e.x ? 1 : -1;
          }
        }
        hopperGravity(e, dt);
      } else if (e.drop) {
        // 보스가 불러낸 졸개 : 위에서 떨어짐
        e.vy = (e.vy || 0) + PHYS.GRAV * dt;
        e.y = Math.min(e.y + e.vy * dt, e.groundY - e.h);
        if (e.y >= e.groundY - e.h) e.drop = false;
      }
    }
    G.L.enemies = G.L.enemies.filter((e) => !e.dead || e.deadT < 0.8);
  }

  function hopperGravity(e, dt) {
    e.vy += PHYS.GRAV * dt;
    e.y += e.vy * dt;
    if (e.y >= e.groundY - e.h) { e.y = e.groundY - e.h; e.vy = 0; }
  }

  function updateIcicles(dt) {
    const p = G.p;
    for (const ic of G.L.icicles) {
      if (ic.state === 'hang') {
        if (Math.abs(p.x + p.w / 2 - ic.x) < 80 && p.y > ic.y) { ic.state = 'shake'; ic.t = 0.42; }
      } else if (ic.state === 'shake') {
        ic.t -= dt;
        if (ic.t <= 0) { ic.state = 'fall'; ic.vy = 0; }
      } else if (ic.state === 'fall') {
        ic.vy += 1900 * dt;
        ic.y += ic.vy * dt;
        const box = { x: ic.x - 9, y: ic.y + 4, w: 18, h: 34 };
        if (G.state === 'play' && overlap(p, box, 3)) { hurt(ic.x); }
        const tx = Math.floor(ic.x / TILE);
        const ty = Math.floor((ic.y + 38) / TILE);
        if (isSolid(tx, ty) || cell(tx, ty) === 2 || ic.y > H) {
          ic.state = 'broken';
          ic.t = 3.5;
          Sound.fx.shatter();
          for (let i = 0; i < 7; i++) spark(ic.x, ic.y + 34, '#d8f4ff');
        }
      } else if (ic.state === 'broken') {
        ic.t -= dt;
        if (ic.t <= 0) { ic.state = 'hang'; ic.y = ic.y0; }
      }
    }
  }

  function hurt(fromX) {
    const p = G.p;
    if (p.inv > 0 || G.state !== 'play') return;
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
    G.lives -= 1;
    G.run.deaths += 1;
    G.state = 'gameover';
    G.dialog = null;
    G.dialogQ = [];
    Sound.setMode('normal');
  }

  function interactions() {
    const L = G.L;
    const p = G.p;
    const pcx = p.x + p.w / 2;

    // 적
    for (const e of L.enemies) {
      if (e.dead || !overlap(p, e, 4)) continue;
      const stomp = p.vy > 60 && p.y + p.h - e.y < 22;
      if (e.type === 'spiky' && e.stun <= 0) {
        // 고슴도치: 기절 상태가 아니면 밟아도 따가움
        hurt(e.x + e.w / 2);
        if (G.state !== 'play') return;
        if (stomp) p.vy = -560;
        continue;
      }
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
        if (G.required && G.treats === G.required) say('yabung', `간식 ${G.required}개 모았다! 이제 문을 열 수 있어!`);
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

    // 간식 문
    const gate = L.gate;
    if (gate) {
      gate.msgCd = Math.max(0, gate.msgCd - 1 / 120);
      if (!gate.open && gate.req != null && p.x + p.w >= gate.x * TILE - 6 && p.x < gate.x * TILE + TILE) {
        if (G.treats >= gate.req) {
          openGate();
          say('yabung', '문이 열렸다! 엄마, 지금 갈게요!');
        } else if (gate.msgCd <= 0) {
          gate.msgCd = 4;
          Sound.fx.deny();
          const who = G.stage >= 4 ? 'glass' : 'nowon';
          const lack = gate.req - G.treats;
          sayNow(who, who === 'glass'
            ? `어머~ 간식이 ${lack}개나 모자라네? 돌아가서 더 모아오렴~`
            : `어림없다! 간식이 ${lack}개나 모자라잖아! 더 모아 와!`);
        }
      }
    }

    // 보스방 입장
    const A = L.arena;
    if (A && !A.locked && G.boss === null && !L.bossDefeated && p.x > (A.x1 + 1) * TILE) startBossFight();

    // 스테이지 출구
    if (L.exitX && gate && gate.open && p.x > L.exitX * TILE) stageClear();

    // 리베라 구출 (5스테이지)
    if (L.cage && gate && gate.open && p.x + p.w >= L.cage.x * TILE - 24) startRescue();
  }

  function openGate() {
    const gate = G.L.gate;
    gate.open = true;
    gate.openT = 0;
    Sound.fx.gate();
    G.shake = 0.5;
    if (gate.kind === 'glass') {
      Sound.fx.shatter();
      for (let i = 0; i < 24; i++) spark(gate.x * TILE + 20, 120 + Math.random() * 340, '#bff4ff');
    }
  }

  function stageClear() {
    G.state = 'clear';
    G.clearT = 0;
    G.run.time += G.time;
    G.run.treats += G.treats;
    G.run.totalTreats += G.L.treats.length;
    G.run.kills += G.kills;
    const next = Math.min(5, G.stage + 1);
    if (next > savedStage()) localStorage.setItem('yabungi_stage', String(next));
    Sound.fx.clear();
    Sound.setMode('normal');
  }

  // ───────── 보스 ─────────
  function startBossFight() {
    const L = G.L;
    const A = L.arena;
    A.locked = true;
    for (let y = 0; y <= 11; y++) L.grid[y][A.x1 - 1] = 6;
    const kind = L.boss.kind;
    const s = 0.9;
    G.boss = {
      kind, x: L.boss.spawnX * TILE, y: GROUND_Y - (kind === 'nowon' ? 106 : 104),
      w: 30, h: kind === 'nowon' ? 106 : 104, s,
      vx: 0, vy: 0, dir: -1, onGround: true,
      hp: kind === 'nowon' ? 4 : 5, maxHp: kind === 'nowon' ? 4 : 5,
      state: 'intro', st: 0, inv: 0, resist: 0, alpha: 1, pat: 0, called: false,
      active: true, defeated: false, hitFlash: 0,
    };
    G.dialogQ = [];
    G.dialog = null;
    G.shake = 0.4;
    Sound.setMode('boss');
    Sound.fx.gate();
    if (kind === 'nowon') {
      say('nowon', '어이 꼬맹이, 여기까지 오다니 제법인데? 내가 바로 노원대장 김현오다!');
      say('nowon', '글라스킴 님의 명령이다. 여기서 끝내주지!');
      say('yabung', '우리 엄마를 돌려주세요! 멍멍!');
      say('yabung', '(머리 위를 밟아 공격! 돌진하다 벽에 부딪히면 기회야!)');
    } else {
      say('glass', '어머, 귀여운 강아지네. 나는 글라스킴. 이 유리 궁전의 주인이지.');
      say('glass', '리베라는 이제 내 거야. 데려가고 싶으면 날 이겨보렴!');
      say('yabung', '(유리 방패가 있어! 멍멍 짖어서 어지럽게 만든 다음 왕관을 밟자!)');
    }
  }

  function resetBossFight() {
    const L = G.L;
    if (!L.arena || L.bossDefeated) return;
    L.arena.locked = false;
    G.boss = null;
    G.proj = [];
    Sound.setMode('normal');
    // 보스가 불러낸 졸개 제거
    L.enemies = L.enemies.filter((e) => !e.summoned);
  }

  function setBoss(B, state, st) {
    B.state = state;
    B.st = st;
  }

  function bossBarked(B) {
    if (B.resist > 0 || ['intro', 'stun', 'teleport', 'defeated', 'hit'].includes(B.state)) return;
    if (B.kind === 'glass' && B.alpha < 0.6) return;
    setBoss(B, 'stun', B.kind === 'nowon' ? 1.3 : 2.1);
    B.vx = 0;
    B.resist = B.kind === 'nowon' ? 3.5 : 3.2;
    if (B.kind === 'glass') sayNow('glass', ['어머, 어지러워…!', '시끄러운 강아지 같으니…!', '귀, 귀가 멍멍해…!'][B.hp % 3]);
  }

  function bossFacePlayer(B) {
    B.dir = G.p.x + G.p.w / 2 > B.x + B.w / 2 ? 1 : -1;
  }

  function updateBoss(dt) {
    const B = G.boss;
    if (!B) return;
    const L = G.L;
    const A = L.arena;
    const m = L.mult;
    B.st -= dt;
    B.inv = Math.max(0, B.inv - dt);
    B.resist = Math.max(0, B.resist - dt);
    B.hitFlash = Math.max(0, B.hitFlash - dt);
    const angry = B.hp <= Math.ceil(B.maxHp / 2);

    if (B.kind === 'nowon') updateNowon(B, dt, m, angry, A);
    else updateGlass(B, dt, m, angry, A);

    // 물리
    if (B.state !== 'teleport') {
      B.vy = Math.min(B.vy + PHYS.GRAV * dt, PHYS.MAXFALL);
      const wasDash = B.state === 'dash';
      B.onGround = false;
      const hitWall = moveX(B, B.vx * dt);
      moveY(B, B.vy * dt, B.y + B.h);
      if (wasDash && hitWall) bossWallHit(B);
    }
    B.x = clamp(B.x, A.x1 * TILE, (A.x2 + 1) * TILE - B.w);
  }

  function bossWallHit(B) {
    G.shake = 0.45;
    Sound.fx.stomp();
    for (let i = 0; i < 10; i++) spark(B.x + (B.dir > 0 ? B.w : 0), B.y + B.h * 0.4, '#ffe066');
    B.vx = 0;
    if (B.kind === 'nowon') {
      setBoss(B, 'dizzy', 1.5);
      say('nowon', '으악! 벽이…!');
    } else {
      setBoss(B, 'idle', 0.7);
    }
  }

  function updateNowon(B, dt, m, angry, A) {
    const spd = angry ? 1.25 : 1;
    switch (B.state) {
      case 'intro':
        bossFacePlayer(B);
        if (dialogIdle() || G.dialogQ.length <= 1) if (B.st < -1.5) setBoss(B, 'walk', 1.2);
        break;
      case 'walk':
        bossFacePlayer(B);
        B.vx = B.dir * 120 * m * spd;
        if (B.st <= 0) {
          B.vx = 0;
          const seq = angry ? ['windup', 'jump', 'windup', 'call'] : ['windup', 'jump'];
          let next = seq[B.pat++ % seq.length];
          if (next === 'call' && B.called) next = 'jump';
          if (next === 'windup') { setBoss(B, 'windup', angry ? 0.45 : 0.65); Sound.fx.warn(); }
          else if (next === 'jump') {
            setBoss(B, 'jump', 0);
            const px = G.p.x + G.p.w / 2;
            B.vy = -900;
            B.vx = clamp((px - (B.x + B.w / 2)) / 0.85, -430, 430);
            B.onGround = false;
            B.airborne = true;
          } else {
            setBoss(B, 'call', 1.0);
            B.called = true;
            sayNow('nowon', '얘들아, 나와라! 저 강아지를 잡아!');
          }
        }
        break;
      case 'windup':
        bossFacePlayer(B);
        B.vx = 0;
        if (B.st <= 0) setBoss(B, 'dash', 3);
        break;
      case 'dash':
        B.vx = B.dir * 540 * m * spd;
        if (Math.random() < dt * 30) puff(B.x + B.w / 2, B.y + B.h, 1);
        if (B.st <= 0) setBoss(B, 'walk', 1);
        break;
      case 'dizzy':
      case 'stun':
        B.vx = approach(B.vx, 0, 2000 * dt);
        if (B.st <= 0) setBoss(B, 'walk', 1.0);
        break;
      case 'jump':
        if (B.airborne && B.onGround && B.vy === 0) {
          B.airborne = false;
          B.vx = 0;
          G.shake = 0.4;
          Sound.fx.stomp();
          const y = GROUND_Y - 22;
          [-1, 1].forEach((d) => G.proj.push({ kind: 'wave', x: B.x + B.w / 2 + d * 20, y, w: 24, h: 22, vx: d * 340 * m, life: 2.6 }));
          puff(B.x + B.w / 2, B.y + B.h, 8);
          setBoss(B, 'recover', 0.55);
        }
        break;
      case 'call':
        B.vx = 0;
        if (B.st <= 0) {
          [A.x1 + 3, A.x2 - 3].forEach((tx) => {
            G.L.enemies.push({
              type: 'cat', x: tx * TILE, y: 40, w: 34, h: 30, groundY: GROUND_Y,
              minX: A.x1 * TILE, maxX: (A.x2 + 1) * TILE, dir: tx < (A.x1 + A.x2) / 2 ? 1 : -1,
              speed: 80, vy: 0, stun: 0, dead: false, deadT: 0, drop: true, summoned: true,
            });
          });
          setBoss(B, 'walk', 1.2);
        }
        break;
      case 'recover':
      case 'hit':
        if (B.onGround) B.vx = approach(B.vx, 0, 900 * dt);
        if (B.st <= 0) setBoss(B, 'walk', 1.0);
        break;
      case 'defeated':
        B.vx = approach(B.vx, 0, 900 * dt);
        if (B.st <= 0 && dialogIdle() && !G.L.gate.open) finishBoss();
        break;
      default:
        break;
    }
  }

  function updateGlass(B, dt, m, angry, A) {
    switch (B.state) {
      case 'intro':
        bossFacePlayer(B);
        if (B.st < -1.5 && (dialogIdle() || G.dialogQ.length <= 0)) setBoss(B, 'idle', 0.6);
        break;
      case 'idle':
        bossFacePlayer(B);
        B.vx = 0;
        if (B.st <= 0) {
          const seq = angry ? ['throw', 'dash', 'rain', 'teleport', 'throw', 'rain'] : ['throw', 'rain', 'teleport', 'throw'];
          const next = seq[B.pat++ % seq.length];
          if (next === 'throw') setBoss(B, 'throw', 0.55);
          else if (next === 'rain') setBoss(B, 'rain', 0.6);
          else if (next === 'dash') { setBoss(B, 'windup', 0.5); Sound.fx.warn(); }
          else { setBoss(B, 'teleport', 0.8); B.tpDone = false; }
        }
        break;
      case 'throw':
        bossFacePlayer(B);
        if (B.st <= 0) {
          const n = angry ? 5 : 3;
          const sx = B.x + B.w / 2 + B.dir * 14;
          const sy = B.y + 10;
          const px = G.p.x + G.p.w / 2;
          for (let i = 0; i < n; i++) {
            const T = 0.7 + i * 0.13;
            const tx = px + (i - (n - 1) / 2) * 55;
            const ty = GROUND_Y - 12;
            const g = 900;
            G.proj.push({ kind: 'shard', x: sx, y: sy, vx: (tx - sx) / T, vy: (ty - sy - 0.5 * g * T * T) / T, g, rot: 0, vr: 9, w: 16, h: 16 });
          }
          Sound.fx.throw();
          setBoss(B, 'idle', angry ? 0.75 : 1.0);
        }
        break;
      case 'rain':
        if (B.st <= 0) {
          const n = angry ? 6 : 4;
          const px = G.p.x + G.p.w / 2;
          for (let i = 0; i < n; i++) {
            const x = clamp(px + (i - (n - 1) / 2) * 90 + (Math.random() - 0.5) * 30, A.x1 * TILE + 20, (A.x2 + 1) * TILE - 20);
            G.proj.push({ kind: 'marker', x, life: 0.95 + i * 0.07, max: 0.95 + i * 0.07 });
          }
          Sound.fx.warn();
          setBoss(B, 'idle', 1.3);
        }
        break;
      case 'teleport':
        B.vx = 0;
        if (B.st > 0.4) B.alpha = Math.max(0, (B.st - 0.4) / 0.4);
        else {
          if (!B.tpDone) {
            B.tpDone = true;
            const px = G.p.x + G.p.w / 2;
            const mid = ((A.x1 + A.x2 + 1) / 2) * TILE;
            B.x = px < mid ? (A.x2 - 2) * TILE : (A.x1 + 2) * TILE;
            B.y = GROUND_Y - B.h;
            for (let i = 0; i < 12; i++) spark(B.x + B.w / 2, B.y + 40 + Math.random() * 60, '#bff4ff');
            Sound.fx.ding();
          }
          B.alpha = 1 - Math.max(0, B.st) / 0.4;
        }
        if (B.st <= 0) { B.alpha = 1; setBoss(B, 'idle', 0.5); }
        break;
      case 'windup':
        bossFacePlayer(B);
        if (B.st <= 0) setBoss(B, 'dash', 3);
        break;
      case 'dash':
        B.vx = B.dir * 600 * m;
        if (B.st <= 0) setBoss(B, 'idle', 0.6);
        break;
      case 'stun':
        B.vx = 0;
        if (B.st <= 0) { setBoss(B, 'teleport', 0.8); B.tpDone = false; }
        break;
      case 'hit':
        B.vx = 0;
        if (B.st <= 0) { setBoss(B, 'teleport', 0.8); B.tpDone = false; }
        break;
      case 'defeated':
        B.vx = 0;
        if (B.st <= 0 && dialogIdle()) {
          B.alpha = Math.max(0, B.alpha - dt * 1.2);
          if (B.alpha <= 0 && !G.L.gate.open) finishBoss();
        }
        break;
      default:
        break;
    }
  }

  function damageBoss(B) {
    B.hp -= 1;
    B.inv = 1.0;
    B.hitFlash = 0.3;
    G.shake = 0.35;
    Sound.fx.bossHit();
    for (let i = 0; i < 12; i++) spark(B.x + B.w / 2, B.y, B.kind === 'glass' ? '#bff4ff' : '#ffe066');
    if (B.hp <= 0) {
      B.defeated = true;
      B.vx = 0;
      setBoss(B, 'defeated', 1.6);
      G.proj = [];
      G.L.enemies.forEach((e) => { if (e.summoned) { e.dead = true; e.deadT = 0; } });
      G.dialogQ = [];
      G.dialog = null;
      if (B.kind === 'nowon') {
        say('nowon', '크윽… 이 노원대장 김현오가 강아지한테 지다니…!');
        say('yabung', '우리 엄마 어디 있어요?!');
        say('nowon', '리베라는… 글라스킴 님이 유리 궁전으로 데려갔다. 설산을 넘어가 봐라…');
        say('yabung', '글라스킴…! 엄마, 조금만 더 기다려요!');
      } else {
        say('glass', '말도 안 돼… 내 유리 왕관이…!');
        say('glass', '흥, 리베라가 너무 반짝여서 질투가 났을 뿐이야… 오늘은 이만 물러나 주지!');
        say('yabung', '다시는 우리 엄마 건드리지 마세요! 멍!');
      }
      return;
    }
    if (B.kind === 'nowon') {
      const lines = ['아얏! 감히 내 머리를!', '이 녀석, 제법이잖아…!', '이제 진짜 화났다!'];
      sayNow('nowon', lines[(B.maxHp - B.hp - 1) % lines.length]);
      B.vx = (B.x + B.w / 2 < G.p.x + G.p.w / 2 ? -1 : 1) * 320;
      B.vy = -520;
      setBoss(B, 'hit', 0.9);
    } else {
      const lines = ['감히 내 유리 왕관에 흠집을!', '이 몸이 누군 줄 알고…!', '안 돼! 리베라는 못 줘!', '이번엔 진심이야!'];
      sayNow('glass', lines[(B.maxHp - B.hp - 1) % lines.length]);
      setBoss(B, 'hit', 0.5);
    }
  }

  function finishBoss() {
    const L = G.L;
    L.bossDefeated = true;
    L.arena.locked = false;
    openGate();
    Sound.setMode('normal');
    if (G.boss.kind === 'nowon') say('yabung', '문이 열렸다! 다음은 설산이야!');
    else say('libera', '야붕아! 여기야, 엄마 여기 있어!');
  }

  function bossInteractions() {
    const B = G.boss;
    if (!B || B.defeated || G.state !== 'play') return;
    const p = G.p;
    if (B.kind === 'glass' && B.alpha < 0.5) return;
    if (B.state === 'intro') return;
    const box = { x: B.x, y: B.y, w: B.w, h: B.h };
    if (!overlap(p, box, 3)) return;
    const stomp = p.vy > 40 && p.y + p.h - B.y < 30;
    const vulnerable = B.state === 'stun' || B.state === 'dizzy';
    if (stomp) {
      p.vy = input.jump ? -720 : -600;
      p.jumping = false;
      if (B.inv > 0) return;
      if (B.kind === 'glass' && !vulnerable) {
        // 유리 방패에 튕김
        Sound.fx.ding();
        for (let i = 0; i < 6; i++) spark(p.x + p.w / 2, p.y + p.h, '#bff4ff');
        if (!G.shieldHint) { G.shieldHint = true; sayNow('yabung', '팅! 유리 방패야… 먼저 멍멍 짖어서 어지럽게 하자!'); }
        return;
      }
      damageBoss(B);
      return;
    }
    if (vulnerable || B.inv > 0 || B.state === 'hit') return;
    hurt(B.x + B.w / 2);
  }

  function updateProjectiles(dt) {
    const p = G.p;
    for (const q of G.proj) {
      if (q.kind === 'shard') {
        q.vy += q.g * dt;
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        q.rot += q.vr * dt;
        const box = { x: q.x - 8, y: q.y - 8, w: 16, h: 16 };
        if (G.state === 'play' && overlap(p, box, 2)) { hurt(q.x); q.dead = true; }
        if (q.y >= GROUND_Y - 6 || isSolid(Math.floor(q.x / TILE), Math.floor((q.y + 8) / TILE))) {
          q.dead = true;
          Sound.fx.shatter();
          for (let i = 0; i < 5; i++) spark(q.x, Math.min(q.y, GROUND_Y - 6), '#bff4ff');
        }
      } else if (q.kind === 'marker') {
        q.life -= dt;
        if (q.life <= 0) {
          q.dead = true;
          G.proj.push({ kind: 'shard', x: q.x, y: -20, vx: 0, vy: 300, g: 1500, rot: Math.PI / 2, vr: 0, w: 16, h: 16, color: '#ffc6ef' });
        }
      } else if (q.kind === 'wave') {
        q.x += q.vx * dt;
        q.life -= dt;
        const box = { x: q.x - 12, y: q.y, w: 24, h: q.h };
        if (G.state === 'play' && overlap(p, box, 3)) hurt(q.x);
        if (q.life <= 0 || isSolid(Math.floor((q.x + Math.sign(q.vx) * 12) / TILE), Math.floor((q.y + 10) / TILE))) q.dead = true;
      }
    }
    G.proj = G.proj.filter((q) => !q.dead);
  }

  // ───────── 구출 / 엔딩 ─────────
  function startRescue() {
    G.state = 'rescue';
    G.rescueT = 0;
    G.dialogQ = [];
    G.dialog = null;
    say('libera', '야붕아…? 정말 우리 야붕이니?');
    say('yabung', '엄마! 리베라 엄마! 제가 구하러 왔어요!');
    say('libera', '숲도, 설산도, 무서운 보스들도 다 이겨냈구나… 고마워, 우리 아가.');
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
    if (G.rescueT > 3.5 && dialogIdle()) win();
  }

  function win() {
    G.state = 'win';
    G.winT = 0;
    G.run.time += G.time;
    G.run.treats += G.treats;
    G.run.totalTreats += G.L.treats.length;
    G.run.kills += G.kills;
    const best = Number(localStorage.getItem('yabungi_best5') || 0);
    G.newBest = G.run.fromStart && (!best || G.run.time < best);
    if (G.newBest) localStorage.setItem('yabungi_best5', String(G.run.time));
    G.best = G.newBest ? G.run.time : best;
    G.stars = 1 + (G.run.treats >= G.run.totalTreats * 0.7 ? 1 : 0) + (G.run.deaths <= 2 ? 1 : 0);
    localStorage.setItem('yabungi_cleared', '1');
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
    let lo = 0;
    let hi = G.L.cols * TILE - W;
    const A = G.L.arena;
    if (A && A.locked) {
      lo = (A.x1 - 1) * TILE;
      hi = Math.max(lo, (A.x2 + 2) * TILE - W);
    }
    return clamp(G.p.x + G.p.w / 2 - W * 0.42, lo, hi);
  }

  function tick(dt) {
    G.t += dt;
    if (G.state === 'play') {
      G.time += dt;
      G.cardT = Math.max(0, G.cardT - dt);
      updateMovers(dt);
      updateCrumbles(dt);
      updatePlayer(dt, true);
      updateEnemies(dt);
      updateIcicles(dt);
      updateBoss(dt);
      updateProjectiles(dt);
      if (G.state === 'play') interactions();
      if (G.state === 'play') bossInteractions();
    } else if (G.state === 'rescue') {
      updateMovers(dt);
      updatePlayer(dt, false);
      updateEnemies(dt);
      updateRescue(dt);
    } else if (G.state === 'win') {
      G.winT += dt;
      if (Math.random() < dt * 4) G.particles.push(heartParticle(Math.random() * W + G.cam.x, H - 40));
    } else if (G.state === 'clear') {
      G.clearT += dt;
    }
    if (G.state !== 'title' && G.state !== 'paused') {
      updateParticles(dt);
      updateDialog(dt);
      if (G.L.gate && G.L.gate.open) G.L.gate.openT += dt;
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
    drawBackground(ctx, L.theme, camX, G.t, W, H);

    ctx.save();
    const sh = G.shake > 0 ? G.shake * 18 : 0;
    ctx.translate(-camX + (Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);

    if (L.cage) {
      drawCageBack(ctx, L.cage);
      const c = L.cage;
      const freed = G.state === 'rescue' || G.state === 'win';
      drawHuman(ctx, c.lx, 12 * TILE - 12 * (1 - c.doorT), 1.0, -1, G.t, {
        walk: c.lrun, reach: freed && !c.lrun && c.doorT >= 1, happy: freed && !c.lrun, sad: !freed && !L.gate.open,
      });
      drawCageFront(ctx, c);
      if (G.state === 'play' && Math.abs(G.p.x - c.x * TILE) < 900 && Math.sin(G.t * 2) > -0.2) {
        drawBubble(ctx, c.lx, 12 * TILE - 150, L.gate.open ? '야붕아! 여기야!' : '야붕아… 엄마 여기 있어!');
      }
    }
    if (L.exitX) drawExitSign(ctx, L.exitX * TILE + 20, G.t);

    drawTiles(ctx, L, camX, W, G.t);
    for (const ic of L.icicles) if (ic.state !== 'broken') drawIcicle(ctx, ic, G.t);
    if (L.gate) drawGate(ctx, L.gate, G.treats, L.gate.req, G.t);
    for (const m of L.movers) drawMover(ctx, m, L.theme);
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
      else if (e.type === 'hopper') drawCat(ctx, e.x + e.w / 2, e.y + e.h, e.dir, G.t + e.x * 0.01, { ...o, orange: true });
      else if (e.type === 'spiky') drawHedgehog(ctx, e.x + e.w / 2, e.y + e.h, e.dir, G.t + e.x * 0.01, o);
      else drawCrow(ctx, e.x + e.w / 2, e.y + e.h / 2, e.dir, G.t + e.phase, o);
    }

    drawBossSprite();
    for (const q of G.proj) {
      if (q.kind === 'shard') drawShard(ctx, q, G.t);
      else if (q.kind === 'marker') drawMarker(ctx, q, GROUND_Y, G.t);
      else if (q.kind === 'wave') drawWave(ctx, q, G.t);
    }

    // 야붕이
    const p = G.p;
    if (!(p.inv > 0 && Math.floor(G.t * 18) % 2 === 0 && G.state === 'play')) {
      drawDog(ctx, p.x + p.w / 2, p.y + p.h, 1, p.facing, G.t, {
        run: p.onGround && Math.abs(p.vx) > 30, air: !p.onGround, collar: true,
        bark: p.barkT > 0, happy: G.state === 'rescue' || G.state === 'win' || G.state === 'clear',
      });
    }
    if (p.barkT > 0) {
      text(ctx, '멍멍!', p.x + p.w / 2 + p.facing * 30, p.y - 26 - (0.45 - p.barkT) * 30, 22, '#ffd56b', 'center', '#7a4b1c', 5);
    }

    drawParticles();
    ctx.restore();

    drawHUD();
    drawDialog();
    if (G.cardT > 0 && G.state === 'play') drawStageCard();

    if (G.state === 'paused') drawPause();
    else if (G.state === 'gameover') drawGameOver();
    else if (G.state === 'clear') drawClear();
    else if (G.state === 'win') drawWin();
  }

  function drawBossSprite() {
    const B = G.boss;
    if (!B) return;
    const cx = B.x + B.w / 2;
    const fy = B.y + B.h;
    const blink = B.inv > 0 && Math.floor(G.t * 16) % 2 === 0 && !B.defeated;
    if (B.kind === 'nowon') {
      if (!blink) {
        drawNowon(ctx, cx, fy, B.s, B.dir, G.t, {
          walk: B.state === 'walk', run: B.state === 'dash', windup: B.state === 'windup',
          jump: B.state === 'jump' && !B.onGround, stun: B.state === 'stun' || B.state === 'dizzy',
          defeated: B.defeated, taunt: B.state === 'call' || B.state === 'intro',
        });
      }
    } else {
      const vulnerable = B.state === 'stun';
      if (!B.defeated && !vulnerable && B.alpha > 0.3 && B.state !== 'intro') {
        // 유리 방패
        ctx.save();
        ctx.globalAlpha = 0.25 * B.alpha + 0.08 * Math.sin(G.t * 6);
        ctx.fillStyle = '#bff4ff';
        ellipse(ctx, cx, fy - 58, 34, 66);
        ctx.globalAlpha = 0.6 * B.alpha;
        ctx.strokeStyle = '#e8fbff';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(cx, fy - 58, 34, 66, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
      if (!blink) {
        drawGlassKim(ctx, cx, fy, B.s, B.dir, G.t, {
          alpha: B.alpha, cast: B.state === 'throw' || B.state === 'rain', stun: vulnerable,
          dash: B.state === 'dash', walk: false, defeated: B.defeated, hurt: B.state === 'hit',
          crown: Math.ceil((B.hp / B.maxHp) * 3),
        });
      }
    }
    if (B.state === 'windup' && Math.sin(G.t * 20) > -0.3) {
      text(ctx, '!', cx, B.y - 34, 40, '#ff4d4d', 'center', '#fff', 6);
    }
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
    if (G.required) {
      const ok = G.treats >= G.required;
      text(ctx, `${G.treats} / ${G.required}`, 184, 41, 24, ok ? '#2f9e5a' : '#4a3a5c', 'left');
    } else {
      text(ctx, `${G.treats}`, 184, 41, 24, '#4a3a5c', 'left');
    }

    // 스테이지 / 보스 체력
    const B = G.boss;
    if (B && !B.defeated) {
      const r0 = 300;
      const r1 = W - 190;
      const bw = Math.min(360, r1 - r0 - 20);
      const mid = W >= 900 ? W / 2 : (r0 + r1) / 2;
      const bx = mid - bw / 2;
      ctx.fillStyle = 'rgba(42,33,64,0.82)';
      rr(ctx, bx - 10, 10, bw + 20, 58, 16);
      ctx.fill();
      text(ctx, SPEAKERS[B.kind].name, mid, 26, 17, '#fff');
      ctx.fillStyle = '#4a3c6a';
      rr(ctx, bx, 40, bw, 16, 8);
      ctx.fill();
      ctx.fillStyle = B.kind === 'glass' ? '#9b5de5' : '#ff4d4d';
      rr(ctx, bx, 40, Math.max(12, (bw * B.hp) / B.maxHp), 16, 8);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      for (let i = 1; i < B.maxHp; i++) ctx.fillRect(bx + (bw * i) / B.maxHp - 1, 40, 2, 16);
    } else {
      const label = `STAGE ${G.stage} · ${G.L.name}`;
      ctx.font = `20px ${FONT}`;
      const zw = ctx.measureText(label).width + 36;
      ctx.fillStyle = 'rgba(42,33,64,0.72)';
      rr(ctx, W / 2 - zw / 2, 14, zw, 38, 19);
      ctx.fill();
      text(ctx, label, W / 2, 34, 20, '#fff');
    }

    // 시간 + 진행도
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    rr(ctx, W - 176, 12, 162, 56, 18);
    ctx.fill();
    text(ctx, fmtTime(G.time), W - 95, 32, 24, '#4a3a5c');
    const goal = G.L.exitX || (G.L.cage ? G.L.cage.x : G.L.cols);
    const prog = clamp(G.p.x / (goal * TILE), 0, 1);
    ctx.fillStyle = '#e8e0f2';
    rr(ctx, W - 160, 50, 130, 8, 4);
    ctx.fill();
    ctx.fillStyle = '#ff7aa8';
    rr(ctx, W - 160, 50, Math.max(8, 130 * prog), 8, 4);
    ctx.fill();

    // 짖기 쿨다운 + 남은 기회
    const ready = G.p.barkCd <= 0;
    ctx.fillStyle = ready ? 'rgba(255,213,107,0.95)' : 'rgba(255,255,255,0.6)';
    rr(ctx, 14, 76, 120, 30, 15);
    ctx.fill();
    const keyHint = isTouch ? '' : 'X  ';
    text(ctx, ready ? `${keyHint}멍멍 준비!` : `${keyHint}충전 중…`, 74, 92, 16, '#5a3d14');
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    rr(ctx, 142, 76, 108, 30, 15);
    ctx.fill();
    text(ctx, `기회 ${'●'.repeat(Math.max(0, G.lives))}${'○'.repeat(Math.max(0, MAX_LIVES - G.lives))}`, 196, 92, 15, '#6a4a8c');
    if (Sound.muted) text(ctx, '소리 꺼짐 (M)', W - 70, 88, 14, '#fff', 'center', 'rgba(0,0,0,0.4)', 4);
  }

  function drawStageCard() {
    const a = Math.min(1, G.cardT / 0.5, (2.8 - G.cardT) / 0.3);
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(30,22,52,0.55)';
    ctx.fillRect(0, H / 2 - 70, W, 140);
    text(ctx, `STAGE ${G.stage}`, W / 2, H / 2 - 28, 30, '#ffd56b', 'center', '#2a2140', 6);
    text(ctx, G.L.name, W / 2, H / 2 + 14, 40, '#fff', 'center', '#2a2140', 7);
    const S = STAGES[G.stage - 1];
    if (S.boss) text(ctx, S.boss === 'glass' ? '최종보스 글라스킴 등장!' : '중간보스 노원대장 김현오 등장!', W / 2, H / 2 + 52, 20, '#ff9fbc');
    else if (G.required) text(ctx, `간식 ${G.required}개를 모아 문을 열어라!`, W / 2, H / 2 + 52, 20, '#ffe9a8');
    ctx.globalAlpha = 1;
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
    if (speaker === 'yabung') drawDog(ctx, x - 25, y + 46, 1.55, 1, G.t, { collar: true });
    else if (speaker === 'nowon') drawNowon(ctx, x - 3, y + 4 + 110 * 1.25, 1.25, 1, G.t, {});
    else if (speaker === 'glass') drawGlassKim(ctx, x - 3, y + 10 + 104 * 1.2, 1.2, 1, G.t, { crown: G.boss ? Math.ceil((G.boss.hp / G.boss.maxHp) * 3) : 3 });
    else drawHuman(ctx, x - 6, y + 82 * 1.3 + 2, 1.3, 1, G.t, { closed: speaker === 'memory' });
    ctx.restore();
  }

  function drawDialog() {
    const d = G.dialog;
    if (!d) return;
    const appear = Math.min(1, d.t * 6);
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
    mint: ['#7bd88f', '#4fae64', '#1f4a2a'],
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
        newRun(1);
        break;
      case 'resumeRun':
        newRun(savedStage());
        break;
      case 'restart':
        newRun(1);
        break;
      case 'retryStage':
        retryStage();
        break;
      case 'resume':
        G.state = 'play';
        break;
      case 'continue':
        continueGame();
        break;
      case 'next':
        nextStage();
        break;
      case 'home':
        G.state = 'title';
        Sound.setMode('normal');
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
    button('retryStage', '이 스테이지 처음부터', W / 2, 295, 280, 56, 'yellow', 22);
    button('sound', soundLabel(), W / 2 - 72, 370, 136, 50, 'lilac', 21);
    button('home', '처음 화면', W / 2 + 72, 370, 136, 50, 'lilac', 21);
    if (!isTouch) text(ctx, '키보드: P 계속 · R 스테이지 재시작 · M 소리', W / 2, 446, 16, '#9a8aac');
  }

  function drawGameOver() {
    overlay(0.6);
    panel(W / 2 - 270, 80, 540, 410);
    drawDog(ctx, W / 2, 200, 2, 1, G.t, { closed: true, collar: true });
    text(ctx, '야붕이가 지쳐 쓰러졌어요…', W / 2, 240, 32, '#4a3a5c');
    if (G.lives > 0) {
      text(ctx, `남은 기회 ${G.lives}번 · 엄마가 기다리고 있어. 다시 힘내자!`, W / 2, 282, 19, '#8a6a9c');
      button('continue', '▶  깃발에서 다시', W / 2, 350, 320, 62, 'pink', 27);
    } else {
      text(ctx, '기회를 모두 썼어요. 이 스테이지를 처음부터 다시 도전!', W / 2, 282, 19, '#8a6a9c');
      button('retryStage', `▶  STAGE ${G.stage} 다시 시작`, W / 2, 350, 340, 62, 'pink', 26);
    }
    if (G.lives > 0) button('retryStage', '스테이지 처음부터', W / 2 - 92, 428, 172, 50, 'yellow', 19);
    button('home', '처음 화면', G.lives > 0 ? W / 2 + 92 : W / 2, 428, 156, 50, 'lilac', 20);
  }

  function drawClear() {
    overlay(0.5);
    const a = Math.min(1, G.clearT * 3);
    ctx.globalAlpha = a;
    panel(W / 2 - 290, 60, 580, 440);
    text(ctx, `STAGE ${G.stage} 클리어!`, W / 2, 112, 42, '#ff5c8a', 'center', '#fff', 8);
    text(ctx, G.L.name, W / 2, 156, 22, '#8a6a9c');
    drawDog(ctx, W / 2, 262, 2.1, 1, G.t, { happy: true, collar: true, run: false });
    text(ctx, `걸린 시간 ${fmtTime(G.time)}     모은 간식 ${G.treats} / ${G.L.treats.length}     물리친 적 ${G.kills}`, W / 2, 304, 19, '#4a3a5c');
    const nextS = STAGES[G.stage];
    if (nextS) {
      text(ctx, `다음: STAGE ${G.stage + 1} · ${nextS.name}${nextS.boss ? (nextS.boss === 'glass' ? ' (최종보스)' : ' (중간보스)') : ''}`, W / 2, 342, 20, '#6a5a7c');
    }
    ctx.globalAlpha = 1;
    if (G.clearT > 0.8) {
      button('next', '▶  다음 스테이지', W / 2, 410, 320, 62, 'pink', 27);
      button('home', '처음 화면', W / 2, 472, 160, 44, 'lilac', 19);
    }
  }

  function drawWin() {
    overlay(0.5);
    const a = Math.min(1, G.winT * 2);
    ctx.globalAlpha = a;
    panel(W / 2 - 300, 40, 600, 480);
    text(ctx, '리베라 구출 성공!', W / 2, 92, 44, '#ff5c8a', 'center', '#fff', 8);
    text(ctx, '5개 스테이지 완주!', W / 2, 132, 20, '#8a6a9c');
    ctx.fillStyle = '#ffeef4';
    ellipse(ctx, W / 2, 232, 150, 62);
    drawDog(ctx, W / 2 - 46, 272, 1.6, 1, G.t, { happy: true, collar: true });
    drawHuman(ctx, W / 2 + 44, 272, 1.12, -1, G.t + 1, { happy: true, reach: true });
    drawHeartItem(ctx, W / 2 - 20, 186 + Math.sin(G.t * 3) * 4, 24);

    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < G.stars ? '#ffc93c' : '#e3d9d2';
      starPath(ctx, W / 2 - 60 + i * 60, 322, 22);
      ctx.fill();
    }
    const bestTxt = G.run.fromStart ? (G.newBest ? '  (최고 기록!)' : G.best ? `   최고 ${fmtTime(G.best)}` : '') : '';
    text(ctx, `총 시간  ${fmtTime(G.run.time)}${bestTxt}`, W / 2, 368, 22, '#4a3a5c');
    text(ctx, `모은 간식  ${G.run.treats} / ${G.run.totalTreats}     물리친 적  ${G.run.kills}     쓰러진 횟수  ${G.run.deaths}`, W / 2, 402, 19, '#6a5a7c');
    text(ctx, '야붕이와 리베라는 함께 집으로 돌아갔어요.', W / 2, 436, 19, '#8a6a9c');
    ctx.globalAlpha = 1;
    if (G.winT > 1.2) {
      button('restart', '▶  다시 모험하기', W / 2 - 70, 482, 250, 50, 'pink', 23);
      button('home', '처음 화면', W / 2 + 135, 482, 140, 50, 'lilac', 20);
    }
  }

  function renderTitle() {
    const camX = G.t * 70;
    drawBackground(ctx, 0, camX, G.t, W, H);
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

    ctx.save();
    ctx.translate(W / 2, 100);
    ctx.rotate(-0.03);
    text(ctx, '야붕이', 0, 0, 88, '#ffffff', 'center', '#ff5c8a', 18);
    ctx.restore();
    ctx.fillStyle = '#ff5c8a';
    rr(ctx, W / 2 - 150, 144, 300, 42, 21);
    ctx.fill();
    text(ctx, '리베라를 찾아서', W / 2, 166, 27, '#fff');
    drawHeartItem(ctx, W / 2 + 170, 60, 30);

    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    rr(ctx, W / 2 - 310, 200, 620, 150, 22);
    ctx.fill();
    text(ctx, '어느 날 밤, 엄마 리베라가 글라스킴에게 납치되었어요!', W / 2, 228, 20, '#4a3a5c');
    text(ctx, '숲 · 폐허 · 노원대장의 요새 · 설산 · 유리 궁전, 5개의 스테이지', W / 2, 256, 19, '#4a3a5c');
    text(ctx, '중간보스 노원대장 김현오와 최종보스 글라스킴을 물리쳐 주세요!', W / 2, 284, 19, '#ff5c8a');
    text(ctx, isTouch
      ? '◀ ▶ 이동     점프 버튼     멍! 버튼 = 적 기절'
      : '← → 이동   스페이스 점프   X 멍멍(적 기절)   P 일시정지   M 소리', W / 2, 322, 16, '#7a6a8c');

    const saved = savedStage();
    const pulse = 1 + Math.sin(G.t * 4) * 0.03;
    if (saved > 1) {
      button('start', '▶  처음부터', W / 2 - 150, 404, 260, 64, 'pink', 28);
      button('resumeRun', `이어하기 · STAGE ${saved}`, W / 2 + 150, 404, 260, 64, 'mint', 24);
    } else {
      ctx.save();
      ctx.translate(W / 2, 404);
      ctx.scale(pulse, pulse);
      ctx.translate(-W / 2, -404);
      button('start', '▶  모험 시작', W / 2, 404, 280, 68, 'pink', 32);
      ctx.restore();
    }
    button('sound', Sound.muted ? '소리 꺼짐' : '소리 켜짐', W - 92, 516, 150, 44, 'lilac', 19);
    if (!isTouch) text(ctx, saved > 1 ? 'Enter 처음부터 · C 이어하기' : 'Enter 키로도 시작할 수 있어요', W / 2, 456, 16, '#ffffff', 'center', 'rgba(0,0,0,0.35)', 4);
    const best = Number(localStorage.getItem('yabungi_best5') || 0);
    if (best) text(ctx, `최고 기록 ${fmtTime(best)}`, 90, 530, 18, '#fff', 'center', 'rgba(0,0,0,0.35)', 4);
  }

  // 테스트·디버그용
  window.__yb = { startStage, newRun, damageBoss: () => G.boss && damageBoss(G.boss), bark };

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
