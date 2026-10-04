// 모든 그래픽은 외부 이미지 없이 캔버스로 절차적 생성
const FONT = '"Jua", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';

const PAL = [
  { sky: ['#bfe9ff', '#fff4d8'], far: '#b4dfa6', near: '#86c97a', top: '#6cc04a', topDark: '#4f9a35',
    dirt: '#b07a45', dirtDark: '#8c5c32', plank: '#c98b4f', plankDark: '#93602f' },
  { sky: ['#ffbfa0', '#ffeccc'], far: '#e6b39c', near: '#d49a82', top: '#e3d2b0', topDark: '#c4ae86',
    dirt: '#a99484', dirtDark: '#86705f', plank: '#b98d64', plankDark: '#87623f' },
  { sky: ['#241c4a', '#5e4b8f'], far: '#3d3168', near: '#4a3c7a', top: '#8a7bbd', topDark: '#6a5b9c',
    dirt: '#4b3f78', dirtDark: '#372d5c', plank: '#7f6fb0', plankDark: '#5a4b8a' },
];

function hash(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return (h ^ (h >>> 16)) >>> 0;
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function ellipse(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  ctx.fill();
}

function heartPath(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.3);
  ctx.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.3);
  ctx.bezierCurveTo(x - s * 0.5, y + s * 0.6, x, y + s * 0.8, x, y + s);
  ctx.bezierCurveTo(x, y + s * 0.8, x + s * 0.5, y + s * 0.6, x + s * 0.5, y + s * 0.3);
  ctx.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.3);
  ctx.closePath();
}

function starPath(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align = 'center', outline = null, lw = 5) {
  ctx.font = `${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  if (outline) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = lw;
    ctx.strokeStyle = outline;
    ctx.strokeText(str, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

// ───────── 배경 ─────────
function hillLayer(ctx, off, base, amp, period, color, W, H) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W + 16; x += 16) {
    const wx = x + off;
    const y = base + Math.sin(wx / period) * amp + Math.sin(wx / (period * 0.37)) * amp * 0.35;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
}

function drawBackground(ctx, zone, camX, t, W, H) {
  const P = PAL[zone];
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, P.sky[0]);
  g.addColorStop(1, P.sky[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  if (zone === 2) {
    // 별과 달
    for (let i = 0; i < 60; i++) {
      const sx = (hash(i, 7) % 2000 - camX * 0.05) % W;
      const x = sx < 0 ? sx + W : sx;
      const y = hash(i, 3) % 260;
      ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.5 + i));
      ctx.fillStyle = '#fff6d0';
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff3c4';
    circle(ctx, 780, 90, 42);
    ctx.fillStyle = 'rgba(255,243,196,0.15)';
    circle(ctx, 780, 90, 70);
  } else {
    // 해
    ctx.fillStyle = zone === 0 ? 'rgba(255,240,170,0.9)' : 'rgba(255,214,150,0.95)';
    circle(ctx, 800, zone === 0 ? 90 : 160, zone === 0 ? 40 : 56);
    // 구름
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 5; i++) {
      let x = ((i * 260 - camX * 0.08 + t * 8) % (W + 300)) - 150;
      if (x < -150) x += W + 300;
      const y = 60 + (i % 3) * 45;
      circle(ctx, x, y, 22);
      circle(ctx, x + 26, y - 10, 26);
      circle(ctx, x + 54, y, 20);
      ctx.fillRect(x, y, 54, 20);
    }
  }

  hillLayer(ctx, camX * 0.12, H * 0.6, 40, 260, P.far, W, H);

  if (zone === 0) {
    // 나무
    const off = camX * 0.3;
    for (let i = Math.floor(off / 150) - 1; i < Math.floor(off / 150) + W / 150 + 2; i++) {
      const x = i * 150 - off + (hash(i, 1) % 50);
      const s = 0.8 + (hash(i, 2) % 40) / 100;
      const base = H * 0.78;
      ctx.fillStyle = '#7b5a3a';
      ctx.fillRect(x - 6 * s, base - 70 * s, 12 * s, 70 * s);
      ctx.fillStyle = i % 2 ? '#5fae5a' : '#6cbc64';
      circle(ctx, x, base - 90 * s, 34 * s);
      circle(ctx, x - 24 * s, base - 70 * s, 24 * s);
      circle(ctx, x + 24 * s, base - 70 * s, 24 * s);
    }
  } else if (zone === 1) {
    // 부서진 기둥
    const off = camX * 0.3;
    for (let i = Math.floor(off / 210) - 1; i < Math.floor(off / 210) + W / 210 + 2; i++) {
      const x = i * 210 - off + (hash(i, 4) % 60);
      const h = 80 + (hash(i, 5) % 90);
      const base = H * 0.8;
      ctx.fillStyle = '#c9a894';
      ctx.fillRect(x, base - h, 34, h);
      ctx.fillStyle = '#b8937e';
      ctx.fillRect(x + 6, base - h, 5, h);
      ctx.fillRect(x + 20, base - h, 5, h);
      ctx.fillStyle = '#d8bba6';
      ctx.fillRect(x - 6, base - h - 10, 46, 12);
    }
  } else {
    // 냥보스의 성 실루엣
    const cx = 520 - (camX - 146 * TILE) * 0.15;
    ctx.fillStyle = '#2f2654';
    const b = H * 0.72;
    ctx.fillRect(cx - 160, b - 160, 320, 160);
    ctx.fillRect(cx - 200, b - 220, 60, 220);
    ctx.fillRect(cx + 140, b - 220, 60, 220);
    ctx.fillRect(cx - 40, b - 260, 80, 260);
    const roof = (x, y, w) => {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w / 2, y - 50); ctx.lineTo(x + w, y); ctx.closePath(); ctx.fill();
    };
    roof(cx - 205, b - 220, 70); roof(cx + 135, b - 220, 70); roof(cx - 48, b - 260, 96);
    // 고양이 귀 모양 깃발
    ctx.fillStyle = '#ffd56b';
    for (let i = 0; i < 6; i++) ctx.fillRect(cx - 140 + i * 52, b - 120, 14, 20);
  }

  hillLayer(ctx, camX * 0.35, H * 0.74, 26, 180, P.near, W, H);
}

// ───────── 타일 ─────────
function drawTiles(ctx, L, camX, W) {
  const x0 = Math.max(0, Math.floor(camX / TILE) - 1);
  const x1 = Math.min(L.cols - 1, Math.ceil((camX + W) / TILE) + 1);
  for (let x = x0; x <= x1; x++) {
    const z = zoneOf(x);
    const P = PAL[z];
    for (let y = 0; y < ROWS; y++) {
      const c = L.grid[y][x];
      const px = x * TILE, py = y * TILE;
      if (c === 1) {
        const topOpen = y === 0 || L.grid[y - 1][x] !== 1;
        ctx.fillStyle = P.dirt;
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = P.dirtDark;
        const h = hash(x, y);
        if (z === 0) {
          ctx.fillRect(px + (h % 26) + 4, py + ((h >> 5) % 22) + 12, 5, 4);
          ctx.fillRect(px + ((h >> 9) % 26) + 4, py + ((h >> 13) % 20) + 14, 3, 3);
        } else {
          ctx.fillRect(px, py + 19, TILE, 2);
          ctx.fillRect(px + (y % 2 ? 10 : 30), py, 2, 19);
          ctx.fillRect(px + (y % 2 ? 30 : 10), py + 21, 2, 19);
        }
        if (topOpen) {
          ctx.fillStyle = P.top;
          ctx.fillRect(px, py, TILE, 10);
          ctx.fillStyle = P.topDark;
          ctx.fillRect(px, py + 10, TILE, 3);
          if (z === 0) {
            ctx.fillStyle = P.top;
            for (let i = 0; i < 4; i++) circle(ctx, px + 5 + i * 10, py + 11, 4);
          }
        }
      } else if (c === 2) {
        ctx.fillStyle = P.plank;
        rr(ctx, px, py, TILE, 14, 3);
        ctx.fill();
        ctx.fillStyle = P.plankDark;
        ctx.fillRect(px, py + 11, TILE, 3);
        ctx.fillRect(px + TILE - 2, py + 2, 2, 9);
      }
    }
  }
}

function drawHazard(ctx, hz, t) {
  const n = Math.round(hz.w / 20);
  for (let i = 0; i < n; i++) {
    const x = hz.x + i * 20;
    const b = hz.y + hz.h;
    if (hz.zone === 0) {
      // 가시덤불
      ctx.fillStyle = '#3f7d3a';
      circle(ctx, x + 10, b - 8, 10);
      ctx.fillStyle = '#7a3b2e';
      ctx.beginPath(); ctx.moveTo(x + 2, b - 6); ctx.lineTo(x + 6, b - 24); ctx.lineTo(x + 10, b - 6); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + 10, b - 6); ctx.lineTo(x + 14, b - 22); ctx.lineTo(x + 18, b - 6); ctx.fill();
    } else {
      ctx.fillStyle = hz.zone === 1 ? '#8c8a96' : '#c7c2e0';
      ctx.beginPath(); ctx.moveTo(x, b); ctx.lineTo(x + 10, b - 24); ctx.lineTo(x + 20, b); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath(); ctx.moveTo(x + 10, b - 24); ctx.lineTo(x + 13, b - 6); ctx.lineTo(x + 10, b); ctx.fill();
    }
  }
}

function drawMover(ctx, m, zone) {
  const P = PAL[zone];
  ctx.fillStyle = P.plankDark;
  rr(ctx, m.x, m.y + 2, m.w, m.h, 5);
  ctx.fill();
  ctx.fillStyle = P.plank;
  rr(ctx, m.x, m.y, m.w, m.h - 3, 5);
  ctx.fill();
  ctx.fillStyle = '#ffd56b';
  circle(ctx, m.x + 10, m.y + 7, 3);
  circle(ctx, m.x + m.w - 10, m.y + 7, 3);
}

// ───────── 캐릭터 ─────────
function fluff(ctx, pts, fill, line) {
  ctx.fillStyle = line;
  for (const [x, y, r] of pts) circle(ctx, x, y, r + 1.6);
  ctx.fillStyle = fill;
  for (const [x, y, r] of pts) circle(ctx, x, y, r);
}

// 야붕이 / 리베라 : 화이트 푸들 + 말티즈 (곱슬 정수리 + 길게 늘어진 귀)
function drawDog(ctx, x, y, s, facing, t, o = {}) {
  const white = o.tint || '#ffffff';
  const line = o.line || '#cbbfb3';
  const ear = o.ear || '#f3ebe2';
  const phase = t * 16;
  const sw = o.run ? Math.sin(phase) : 0;
  const bob = o.run ? Math.abs(Math.sin(phase)) * 2.2 : Math.sin(t * 2.5) * 0.7;

  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(40,30,20,0.16)';
  ellipse(ctx, 0, 0, 18 * s, 3.5 * s);
  ctx.scale(facing * s, s);
  ctx.translate(0, -bob);

  // 다리
  const legs = o.air
    ? [[-10, -0.8], [-4, 0.8], [6, -0.8], [11, 0.8]]
    : [[-10, sw], [-4, -sw], [6, -sw], [11, sw]];
  for (const [lx, k] of legs) {
    const dx = k * 3.5;
    const lift = o.air ? 3 : Math.max(0, -k) * 2;
    ctx.fillStyle = line;
    rr(ctx, lx - 4 + dx, -11 - lift, 8, 11, 3.5);
    ctx.fill();
    ctx.fillStyle = white;
    rr(ctx, lx - 2.8 + dx, -10 - lift, 5.6, 9, 2.6);
    ctx.fill();
  }

  // 꼬리 (폼폼)
  const tw = Math.sin(t * (o.run || o.happy ? 16 : 6)) * 2.5;
  fluff(ctx, [[-19, -23 + tw, 5.5], [-16, -19 + tw * 0.5, 3.5]], white, line);

  // 몸
  fluff(ctx, [[-11, -16, 7.5], [-4, -18, 8.5], [4, -17, 8.5], [-6, -11, 7], [3, -11, 7], [10, -14, 6.5], [-13, -11, 5.5]], white, line);

  // 머리 + 곱슬 정수리
  fluff(ctx, [[14, -27, 9.5], [20, -24, 6], [9, -34, 5.5], [15, -36, 5.5], [20, -33, 5], [8, -26, 6]], white, line);

  // 말티즈 귀
  const earRot = 0.25 + (o.run ? sw * 0.15 : 0) + (o.air ? -0.4 : 0);
  ctx.fillStyle = line;
  ellipse(ctx, 8.5, -22, 5.6, 10.6, earRot);
  ctx.fillStyle = ear;
  ellipse(ctx, 8.5, -22, 4.2, 9.2, earRot);

  // 볼터치
  ctx.fillStyle = 'rgba(255,140,170,0.45)';
  ellipse(ctx, 19.5, -21, 3.2, 2);

  // 눈
  const blink = (t % 3.7) < 0.12 || o.closed;
  if (blink) {
    ctx.strokeStyle = '#2b2220';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(15.5, -28);
    ctx.quadraticCurveTo(18, -25.5, 20.5, -28);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#2b2220';
    circle(ctx, 18, -28, 2.7);
    ctx.fillStyle = '#fff';
    circle(ctx, 19, -29, 0.95);
  }

  // 코
  ctx.fillStyle = '#2b2220';
  ellipse(ctx, 25.5, -25.5, 2.6, 2.1);

  // 입
  if (o.run || o.happy || o.bark) {
    ctx.fillStyle = '#ff7f9c';
    ellipse(ctx, 22.5, -19.5 + (o.bark ? 1 : 0), 2.4, o.bark ? 4 : 3.2);
  } else {
    ctx.strokeStyle = '#2b2220';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(23, -22.5, 2, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }

  // 리본 (리베라)
  if (o.bow) {
    ctx.fillStyle = '#ff5c8a';
    ctx.beginPath(); ctx.moveTo(13, -42); ctx.lineTo(5, -48); ctx.lineTo(5, -36); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(13, -42); ctx.lineTo(21, -48); ctx.lineTo(21, -36); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff9fbc';
    circle(ctx, 13, -42, 3);
  }
  // 목걸이 (야붕이)
  if (o.collar) {
    ctx.fillStyle = '#4fb4ff';
    rr(ctx, 6, -20, 12, 3.5, 1.7);
    ctx.fill();
    ctx.fillStyle = '#ffd56b';
    circle(ctx, 13, -15.5, 2.4);
  }
  ctx.restore();
}

function drawCat(ctx, x, y, facing, t, o = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ellipse(ctx, 0, 0, 16, 3);
  if (o.dead) {
    ctx.scale(1, Math.max(0.15, 1 - o.deadT * 4));
    ctx.globalAlpha = Math.max(0, 1 - o.deadT * 1.6);
  }
  ctx.scale(facing, 1);
  const step = o.stun ? 0 : Math.sin(t * 12);
  const body = o.boss ? '#3d3a4a' : '#7d8394';
  const dark = o.boss ? '#24222d' : '#5d6270';

  ctx.strokeStyle = dark;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-13, -12);
  ctx.quadraticCurveTo(-26, -18, -20, -32 + Math.sin(t * 5) * 3);
  ctx.stroke();

  ctx.fillStyle = dark;
  [-10, -3, 5, 11].forEach((lx, i) => {
    rr(ctx, lx - 2.5 + step * (i % 2 ? 2 : -2), -8, 5, 8, 2);
    ctx.fill();
  });

  ctx.fillStyle = body;
  ellipse(ctx, 0, -14, 16, 10);
  ctx.fillStyle = dark;
  ctx.fillRect(-8, -23, 3, 8);
  ctx.fillRect(-1, -24, 3, 8);

  ctx.fillStyle = body;
  circle(ctx, 13, -22, 10);
  ctx.beginPath(); ctx.moveTo(5, -27); ctx.lineTo(7, -38); ctx.lineTo(13, -30); ctx.fill();
  ctx.beginPath(); ctx.moveTo(14, -31); ctx.lineTo(20, -38); ctx.lineTo(22, -26); ctx.fill();
  ctx.fillStyle = '#ffb3c6';
  ctx.beginPath(); ctx.moveTo(7, -29); ctx.lineTo(8, -35); ctx.lineTo(11, -30); ctx.fill();

  // 도둑 마스크
  ctx.fillStyle = '#2d2f3a';
  rr(ctx, 4, -27, 19, 7, 3.5);
  ctx.fill();

  if (o.stun) {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.6;
    [[10, -23.5], [17, -23.5]].forEach(([ex, ey]) => {
      ctx.beginPath();
      ctx.moveTo(ex - 2, ey - 2); ctx.lineTo(ex + 2, ey + 2);
      ctx.moveTo(ex + 2, ey - 2); ctx.lineTo(ex - 2, ey + 2);
      ctx.stroke();
    });
  } else {
    ctx.fillStyle = '#ffe066';
    circle(ctx, 10, -23.5, 2.3);
    circle(ctx, 17, -23.5, 2.3);
    ctx.fillStyle = '#111';
    ctx.fillRect(9.4, -25.5, 1.3, 4);
    ctx.fillRect(16.4, -25.5, 1.3, 4);
  }
  ctx.fillStyle = '#ff8fa8';
  circle(ctx, 22, -19, 1.8);
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(22, -18); ctx.lineTo(29, -19);
  ctx.moveTo(22, -17); ctx.lineTo(29, -15);
  ctx.stroke();
  if (o.boss) {
    // 왕관
    ctx.fillStyle = '#ffd56b';
    ctx.beginPath();
    ctx.moveTo(6, -33); ctx.lineTo(8, -42); ctx.lineTo(12, -36); ctx.lineTo(15, -44); ctx.lineTo(18, -36); ctx.lineTo(21, -42); ctx.lineTo(21, -32);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  if (o.stun) drawDizzy(ctx, x, y - 44, t);
}

function drawCrow(ctx, x, y, facing, t, o = {}) {
  ctx.save();
  ctx.translate(x, y);
  if (o.dead) {
    ctx.globalAlpha = Math.max(0, 1 - o.deadT * 1.6);
    ctx.rotate(o.deadT * 8);
  }
  ctx.scale(facing, 1);
  const flap = o.stun ? 0.2 : Math.sin(t * 14);
  ctx.fillStyle = '#2c2a3a';
  ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-23, -5); ctx.lineTo(-23, 5); ctx.closePath(); ctx.fill();
  ellipse(ctx, 0, 0, 14, 9);
  circle(ctx, 11, -5, 7);
  ctx.fillStyle = '#ff9f43';
  ctx.beginPath(); ctx.moveTo(16, -7); ctx.lineTo(25, -4); ctx.lineTo(16, -1); ctx.closePath(); ctx.fill();
  ctx.fillStyle = o.stun ? '#fff' : '#ff4d6d';
  circle(ctx, 13, -7, 1.9);
  ctx.fillStyle = '#433f57';
  ctx.beginPath(); ctx.moveTo(-5, -2); ctx.lineTo(-14, -3 - 15 * flap); ctx.lineTo(6, -4); ctx.closePath(); ctx.fill();
  ctx.restore();
  if (o.stun) drawDizzy(ctx, x, y - 20, t);
}

function drawDizzy(ctx, x, y, t) {
  ctx.fillStyle = '#ffe066';
  for (let i = 0; i < 3; i++) {
    const a = t * 5 + i * 2.1;
    starPath(ctx, x + Math.cos(a) * 13, y + Math.sin(a) * 4, 4.5);
    ctx.fill();
  }
}

// ───────── 오브젝트 ─────────
function drawBone(ctx, x, y, s = 1, rot = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  const draw = (pad) => {
    rr(ctx, -9 - pad, -3.5 - pad, 18 + pad * 2, 7 + pad * 2, 3 + pad);
    ctx.fill();
    circle(ctx, -9, -3.5, 4 + pad);
    circle(ctx, -9, 3.5, 4 + pad);
    circle(ctx, 9, -3.5, 4 + pad);
    circle(ctx, 9, 3.5, 4 + pad);
  };
  ctx.fillStyle = '#b97f3f';
  draw(1.6);
  ctx.fillStyle = '#f8dfaa';
  draw(0);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillRect(-7, -2.5, 10, 1.6);
  ctx.restore();
}

function drawHeartItem(ctx, x, y, s, color = '#ff5c8a') {
  ctx.fillStyle = '#c23a62';
  heartPath(ctx, x, y - s / 2 - 1.5, s + 3);
  ctx.fill();
  ctx.fillStyle = color;
  heartPath(ctx, x, y - s / 2, s);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  circle(ctx, x - s * 0.2, y - s * 0.15, s * 0.1);
}

function drawFlag(ctx, x, yb, active, t) {
  ctx.fillStyle = '#8a7f75';
  ctx.fillRect(x - 2, yb - 72, 4, 72);
  ctx.fillStyle = '#6b6159';
  rr(ctx, x - 9, yb - 6, 18, 6, 2);
  ctx.fill();
  ctx.fillStyle = '#ffd56b';
  circle(ctx, x, yb - 74, 4);
  const wave = Math.sin(t * 4) * 3;
  ctx.fillStyle = active ? '#ff7aa8' : '#cfc8c0';
  ctx.beginPath();
  ctx.moveTo(x + 2, yb - 70);
  ctx.quadraticCurveTo(x + 20, yb - 68 + wave, x + 36, yb - 60 + wave);
  ctx.lineTo(x + 2, yb - 46);
  ctx.closePath();
  ctx.fill();
  if (active) {
    ctx.fillStyle = '#fff';
    circle(ctx, x + 14, yb - 57 + wave * 0.5, 3.4);
    circle(ctx, x + 9, yb - 62 + wave * 0.5, 1.6);
    circle(ctx, x + 14, yb - 64 + wave * 0.5, 1.6);
    circle(ctx, x + 19, yb - 62 + wave * 0.5, 1.6);
  }
}

function drawGate(ctx, gate, treats, req, t) {
  const x = gate.x * TILE;
  const bottom = 12 * TILE;
  const lift = gate.open ? Math.min(1, gate.openT / 1.4) * bottom : 0;
  // 기둥
  ctx.fillStyle = '#2b2448';
  ctx.fillRect(x - 12, 0, 10, bottom);
  ctx.fillRect(x + TILE + 2, 0, 10, bottom);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - 2, 0, TILE + 4, bottom);
  ctx.clip();
  ctx.translate(0, -lift);
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = '#5c5578';
    ctx.fillRect(x + 3 + i * 10, 0, 5, bottom);
    ctx.fillStyle = '#9b93bd';
    ctx.fillRect(x + 3 + i * 10, 0, 1.5, bottom);
  }
  for (let y = 40; y < bottom; y += 90) {
    ctx.fillStyle = '#433c63';
    ctx.fillRect(x - 2, y, TILE + 4, 8);
  }
  ctx.restore();

  if (!gate.open) {
    // 자물쇠 팻말
    const sy = bottom - 150;
    const ok = treats >= req;
    ctx.fillStyle = ok ? '#7bd88f' : '#ffd56b';
    rr(ctx, x - 34, sy, TILE + 68, 54, 10);
    ctx.fill();
    ctx.strokeStyle = '#2b2448';
    ctx.lineWidth = 3;
    ctx.stroke();
    drawBone(ctx, x - 12, sy + 27, 1.05, -0.3);
    text(ctx, `${Math.min(treats, req)}/${req}`, x + 36, sy + 28, 22, '#2b2448');
    if (Math.sin(t * 4) > 0) text(ctx, ok ? '열 수 있어!' : '간식 필요', x + 20, sy - 14, 16, '#fff', 'center', '#2b2448', 4);
  }
}

function drawCageBack(ctx, cage) {
  const x = cage.x * TILE;
  const b = 12 * TILE;
  ctx.fillStyle = `rgba(30,20,60,${0.35 * (1 - cage.doorT)})`;
  rr(ctx, x, b - 120, 120, 120, 10);
  ctx.fill();
}

function drawCageFront(ctx, cage) {
  const x = cage.x * TILE;
  const b = 12 * TILE;
  const lift = cage.doorT * 125;
  ctx.fillStyle = '#5a4f7a';
  rr(ctx, x - 8, b - 12, 136, 12, 4);
  ctx.fill();
  // 돔
  ctx.strokeStyle = '#3a3156';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(x + 60, b - 120, 62, Math.PI, 0);
  ctx.stroke();
  ctx.fillStyle = '#ffd56b';
  circle(ctx, x + 60, b - 186, 7);
  // 창살
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - 4, 0, 128, b - 12);
  ctx.clip();
  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = '#3a3156';
    ctx.fillRect(x + 2 + i * 19, b - 125 - lift, 6, 115);
    ctx.fillStyle = '#7d72a8';
    ctx.fillRect(x + 2 + i * 19, b - 125 - lift, 2, 115);
  }
  ctx.fillStyle = '#3a3156';
  ctx.fillRect(x - 2, b - 70 - lift, 124, 7);
  ctx.restore();
  if (cage.doorT < 0.05) {
    // 자물쇠
    ctx.fillStyle = '#ffd56b';
    rr(ctx, x + 50, b - 72, 20, 16, 3);
    ctx.fill();
    ctx.strokeStyle = '#ffd56b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x + 60, b - 72, 6, Math.PI, 0);
    ctx.stroke();
  }
}

function drawBubble(ctx, x, y, str) {
  ctx.font = `17px ${FONT}`;
  const w = ctx.measureText(str).width + 24;
  ctx.fillStyle = '#fff';
  rr(ctx, x - w / 2, y - 20, w, 34, 14);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 6, y + 13); ctx.lineTo(x, y + 22); ctx.lineTo(x + 6, y + 13);
  ctx.fill();
  text(ctx, str, x, y - 3, 17, '#4a3a5c');
}
