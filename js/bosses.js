// 보스 캐릭터 (외부 이미지 없이 캔버스로 그림)
// 공통 좌표계: (0,0) = 발밑 중앙, 위쪽이 -y, 오른쪽(+x)을 바라봄

function bossLimb(ctx, x1, y1, x2, y2, w, color, line) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = line;
  ctx.lineWidth = w + 2;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}

function swirlEyes(ctx, pts, color = '#2e201c') {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.4;
  for (const [ex, ey] of pts) {
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 4; a += 0.3) {
      const r = a * 0.42;
      const px = ex + Math.cos(a) * r, py = ey + Math.sin(a) * r;
      if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
}

// ───────── 중간보스: 노원대장 김현오 (50대 남성 · 마른 체형 · 짧은 머리) ─────────
function drawNowon(ctx, x, y, s, facing, t, o = {}) {
  const C = {
    skin: '#f2cfb3', skinLine: '#cf9f80',
    hair: '#3b3a3d', grey: '#9a979c',
    jacket: '#2b3550', jacketDark: '#1c2438', stripe: '#e8eaf2',
    shirt: '#d8413f', pants: '#22222a', shoe: '#f4f4f4', sole: '#b9b9c4',
    band: '#ff4d4d',
  };
  const ph = t * (o.run ? 16 : 9);
  const sw = o.walk || o.run ? Math.sin(ph) : 0;
  const lean = o.run ? 0.22 : o.windup ? -0.08 : 0;
  const crouch = o.windup ? 6 : 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(30,20,20,0.2)';
  ellipse(ctx, 0, 0, 24 * s, 4.5 * s);
  ctx.scale(facing * s, s);
  if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
  if (o.defeated) { ctx.translate(0, 0); ctx.rotate(-0.12); }
  ctx.translate(0, crouch);
  ctx.rotate(lean);

  // 다리 (가늘고 긴)
  const legs = o.jump ? [[-4, -0.6], [4, 0.9]] : [[-4, sw], [4, -sw]];
  for (const [lx, k] of legs) {
    const fx = lx + k * 9;
    bossLimb(ctx, lx, -48, fx, -5, 5.5, C.pants, '#111');
    ctx.fillStyle = C.sole;
    rr(ctx, fx - 4, -5.5, 13, 5.5, 2.5); ctx.fill();
    ctx.fillStyle = C.shoe;
    rr(ctx, fx - 4, -7, 12, 4.5, 2.2); ctx.fill();
  }

  // 뒤쪽 팔
  const armBack = o.windup ? [-14, -96] : o.run ? [-16, -62] : [-10 - sw * 6, -52];
  bossLimb(ctx, -6, -84, armBack[0], armBack[1], 5, C.jacket, C.jacketDark);
  ctx.fillStyle = C.skin; circle(ctx, armBack[0], armBack[1], 3.4);

  // 몸통 (마른 상체, 트레이닝 재킷)
  ctx.fillStyle = C.jacketDark;
  rr(ctx, -10, -92, 20, 46, 6); ctx.fill();
  ctx.fillStyle = C.jacket;
  rr(ctx, -9, -91, 18, 44, 5); ctx.fill();
  // 지퍼 사이로 보이는 빨간 티
  ctx.fillStyle = C.shirt;
  ctx.beginPath(); ctx.moveTo(-2, -91); ctx.lineTo(4, -91); ctx.lineTo(2, -74); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#c8c8d0'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(2, -74); ctx.lineTo(2, -48); ctx.stroke();
  // 측면 흰 줄
  ctx.fillStyle = C.stripe;
  ctx.fillRect(-9, -88, 2, 40);
  // 허리 밴드
  ctx.fillStyle = C.jacketDark;
  rr(ctx, -9.5, -51, 19, 5, 2); ctx.fill();

  // 목 + 머리
  ctx.fillStyle = C.skin;
  rr(ctx, -2.5, -99, 6, 9, 2); ctx.fill();
  // 얼굴 (갸름하고 긴 얼굴)
  ctx.fillStyle = C.skinLine;
  ellipse(ctx, 2, -110, 11.5, 14);
  ctx.fillStyle = C.skin;
  ellipse(ctx, 2, -110, 10.5, 13);
  // 귀
  ctx.fillStyle = C.skinLine; ellipse(ctx, -8, -109, 2.8, 4);
  ctx.fillStyle = C.skin; ellipse(ctx, -8, -109, 1.8, 3);
  // 짧은 스포츠 머리 (옆머리 희끗)
  ctx.fillStyle = C.hair;
  ctx.beginPath();
  ctx.moveTo(-9, -112);
  ctx.quadraticCurveTo(-10, -126, 2, -125.5);
  ctx.quadraticCurveTo(13, -126, 12.5, -115);
  ctx.lineTo(10, -118);
  ctx.quadraticCurveTo(2, -120, -6, -117);
  ctx.lineTo(-6, -110);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = C.grey;
  ctx.fillRect(-8.5, -116, 2.5, 5);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(-3, -124.5, 9, 1.5);

  // 눈썹 (날카롭게)
  ctx.strokeStyle = '#2b2a2d';
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  const angry = o.windup || o.run;
  ctx.beginPath(); ctx.moveTo(-1, angry ? -117 : -116); ctx.lineTo(4, angry ? -115 : -116.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(7, angry ? -115 : -116.5); ctx.lineTo(11.5, angry ? -117 : -116); ctx.stroke();
  // 눈
  if (o.stun) {
    swirlEyes(ctx, [[1.5, -111], [9.5, -111]]);
  } else if (o.defeated) {
    ctx.lineWidth = 1.5;
    [[1.5, -111], [9.5, -111]].forEach(([ex, ey]) => {
      ctx.beginPath(); ctx.moveTo(ex - 2, ey - 2); ctx.lineTo(ex + 2, ey + 2);
      ctx.moveTo(ex + 2, ey - 2); ctx.lineTo(ex - 2, ey + 2); ctx.stroke();
    });
  } else {
    ctx.fillStyle = '#231c1a';
    ellipse(ctx, 2, -111, 1.8, angry ? 1.2 : 1.6);
    ellipse(ctx, 9.8, -111, 1.8, angry ? 1.2 : 1.6);
  }
  // 광대 + 팔자 주름 (50대)
  ctx.strokeStyle = C.skinLine;
  ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.moveTo(1, -106); ctx.quadraticCurveTo(0, -102, 2, -99.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(11, -106); ctx.quadraticCurveTo(12, -102, 10.5, -99.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -113.5); ctx.lineTo(3, -113.8); ctx.stroke();
  // 코
  ctx.beginPath(); ctx.moveTo(7, -110); ctx.lineTo(8.6, -105.5); ctx.lineTo(6.6, -105); ctx.stroke();
  // 입
  ctx.strokeStyle = '#8a4a3e';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  if (o.defeated || o.stun) ctx.arc(6, -99.5, 2.6, Math.PI * 1.15, Math.PI * 1.85);
  else if (angry) { ctx.moveTo(2.5, -101.5); ctx.lineTo(9.5, -101.5); }
  else ctx.arc(6, -103.5, 3, 0.25, Math.PI - 0.6); // 비웃음
  ctx.stroke();
  // 턱수염 그림자
  ctx.fillStyle = 'rgba(90,80,90,0.18)';
  ellipse(ctx, 5, -100.5, 6.5, 3);

  // 앞쪽 팔 (주먹)
  const armFront = o.windup ? [16, -100] : o.run ? [20, -78] : o.taunt ? [14, -98] : [12 + sw * 6, -52];
  bossLimb(ctx, 6, -84, armFront[0], armFront[1], 5, C.jacket, C.jacketDark);
  // 대장 완장
  ctx.save();
  ctx.translate(6 + (armFront[0] - 6) * 0.3, -84 + (armFront[1] + 84) * 0.3);
  ctx.rotate(Math.atan2(armFront[1] + 84, armFront[0] - 6));
  ctx.fillStyle = C.band;
  ctx.fillRect(-3, -4.2, 7, 8.4);
  ctx.restore();
  ctx.fillStyle = C.skin;
  circle(ctx, armFront[0], armFront[1], 3.8);

  ctx.restore();
  if (o.stun) drawDizzy(ctx, x, y - 132 * s, t);
}

// ───────── 최종보스: 글라스킴 (40대 여성) ─────────
function drawGlassKim(ctx, x, y, s, facing, t, o = {}) {
  const C = {
    skin: '#fbe0cf', skinLine: '#dcae97',
    hair: '#17121f', hairShine: '#5b3a8c',
    coat: '#6a3fb8', coatDark: '#4a2a86', trim: '#ffd56b',
    skirt: '#1e1a2b', heel: '#1e1a2b', sole: '#e3304b',
    frame: '#ff4fa3', lens: 'rgba(190,240,255,0.55)',
    lip: '#d6204e', crystal: '#9ff0ff', crystalDark: '#4fc3e8',
  };
  const ph = t * (o.dash ? 15 : 8);
  const sw = o.walk || o.dash ? Math.sin(ph) : 0;
  const float = o.cast ? Math.sin(t * 6) * 1.5 : 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(30,10,50,0.22)';
  ellipse(ctx, 0, 0, 22 * s, 4.5 * s);
  ctx.scale(facing * s, s);
  if (o.alpha !== undefined) ctx.globalAlpha = Math.max(0, o.alpha);
  if (o.dash) ctx.rotate(0.12);
  if (o.defeated) ctx.translate(0, 18);
  ctx.translate(0, -float);

  // 다리 + 하이힐
  if (!o.defeated) {
    [[-4, sw], [4, -sw]].forEach(([lx, k]) => {
      const fx = lx + k * 7;
      bossLimb(ctx, lx, -36, fx, -8, 4.5, C.skin, C.skinLine);
      ctx.fillStyle = C.sole;
      ctx.beginPath(); ctx.moveTo(fx - 3, -8); ctx.lineTo(fx + 8, -2); ctx.lineTo(fx + 8, 0); ctx.lineTo(fx - 3, -4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = C.heel;
      ctx.beginPath(); ctx.moveTo(fx - 4, -9); ctx.lineTo(fx + 8, -3.5); ctx.lineTo(fx + 8, -1.5); ctx.lineTo(fx - 3, -5); ctx.closePath(); ctx.fill();
      ctx.fillRect(fx - 4, -6, 1.6, 6);
    });
  }

  // 롱코트 (뒤판)
  ctx.fillStyle = C.coatDark;
  ctx.beginPath();
  ctx.moveTo(-12, -88); ctx.lineTo(12, -88);
  ctx.quadraticCurveTo(18, -60, 19, -30);
  ctx.lineTo(-19, -30);
  ctx.quadraticCurveTo(-18, -60, -12, -88);
  ctx.closePath(); ctx.fill();
  // 스커트
  ctx.fillStyle = C.skirt;
  rr(ctx, -9, -58, 18, 24, 3); ctx.fill();
  // 코트 앞판
  ctx.fillStyle = C.coat;
  ctx.beginPath();
  ctx.moveTo(-11, -87); ctx.lineTo(-2, -86); ctx.lineTo(-5, -31); ctx.lineTo(-18, -31);
  ctx.quadraticCurveTo(-17, -60, -11, -87); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(11, -87); ctx.lineTo(2, -86); ctx.lineTo(6, -31); ctx.lineTo(18, -31);
  ctx.quadraticCurveTo(17, -60, 11, -87); ctx.closePath(); ctx.fill();
  // 금색 단추 + 테두리
  ctx.fillStyle = C.trim;
  [-74, -64, -54].forEach((by) => circle(ctx, 5.5, by, 1.6));
  ctx.fillRect(-18, -33, 13, 2); ctx.fillRect(5, -33, 13, 2);
  // 허리 벨트
  ctx.fillStyle = C.coatDark;
  rr(ctx, -13, -62, 26, 5, 2); ctx.fill();
  ctx.fillStyle = C.trim;
  rr(ctx, -2.5, -62.5, 5, 6, 1.5); ctx.fill();
  // 높은 칼라
  ctx.fillStyle = C.coatDark;
  ctx.beginPath(); ctx.moveTo(-10, -88); ctx.lineTo(-7, -97); ctx.lineTo(-2, -88); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(10, -88); ctx.lineTo(8, -97); ctx.lineTo(2, -88); ctx.closePath(); ctx.fill();
  // 유리 브로치
  ctx.fillStyle = C.crystal;
  ctx.beginPath(); ctx.moveTo(-6, -80); ctx.lineTo(-3.5, -84); ctx.lineTo(-1, -80); ctx.lineTo(-3.5, -76); ctx.closePath(); ctx.fill();

  // 뒤쪽 팔
  const back = o.cast ? [-12, -104] : [-12 - sw * 4, -56];
  bossLimb(ctx, -8, -83, back[0], back[1], 5, C.coat, C.coatDark);
  ctx.fillStyle = C.skin; circle(ctx, back[0], back[1], 3);

  // 목 + 얼굴
  ctx.fillStyle = C.skin;
  rr(ctx, -2.5, -94, 6, 8, 2.5); ctx.fill();
  // 단발 뒷머리
  ctx.fillStyle = C.hair;
  ctx.beginPath();
  ctx.moveTo(-13, -107);
  ctx.quadraticCurveTo(-15, -90, -10, -88);
  ctx.lineTo(13, -88);
  ctx.quadraticCurveTo(17, -92, 15, -107);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = C.skinLine;
  ellipse(ctx, 2.5, -104, 11.6, 13.2);
  ctx.fillStyle = C.skin;
  ellipse(ctx, 2.5, -104, 10.6, 12.2);
  // 앞머리 (일자 뱅)
  ctx.fillStyle = C.hair;
  ctx.beginPath();
  ctx.arc(1.5, -107, 14, Math.PI * 1.02, Math.PI * 1.98);
  ctx.lineTo(15, -108);
  ctx.lineTo(-12.5, -108);
  ctx.closePath(); ctx.fill();
  ctx.fillRect(-12.5, -110, 27.5, 4.5);
  // 보라빛 머릿결 광택
  ctx.strokeStyle = C.hairShine; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(1.5, -107, 11, Math.PI * 1.2, Math.PI * 1.5); ctx.stroke();
  // 옆머리 (턱선 단발)
  ctx.fillStyle = C.hair;
  ctx.beginPath(); ctx.moveTo(-12.5, -106); ctx.quadraticCurveTo(-13, -94, -8, -91); ctx.lineTo(-7, -106); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(14.5, -106); ctx.quadraticCurveTo(15, -94, 11, -91); ctx.lineTo(11, -106); ctx.closePath(); ctx.fill();

  // 유리 왕관 (티아라)
  const broken = o.crown !== undefined ? o.crown : 3;
  const shards = [[-6, -121, 6], [1.5, -126, 9], [9, -121, 6]];
  shards.forEach(([cx, cy, h], i) => {
    if (i >= broken) return;
    ctx.fillStyle = C.crystalDark;
    ctx.beginPath(); ctx.moveTo(cx - 3.2, -116); ctx.lineTo(cx, cy - (h - 6)); ctx.lineTo(cx + 3.2, -116); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.crystal;
    ctx.beginPath(); ctx.moveTo(cx - 1.8, -116.5); ctx.lineTo(cx, cy - (h - 6) + 2); ctx.lineTo(cx + 1, -116.5); ctx.closePath(); ctx.fill();
  });
  ctx.fillStyle = C.trim;
  rr(ctx, -9, -117.5, 21, 3, 1.5); ctx.fill();

  // 고양이눈 안경 (트레이드마크)
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = C.frame;
  [[-1, -103], [9, -103]].forEach(([ex, ey], i) => {
    ctx.fillStyle = C.lens;
    ctx.beginPath();
    ctx.moveTo(ex - 4.5, ey - 1);
    ctx.quadraticCurveTo(ex - 4.5, ey + 3.5, ex, ey + 3.5);
    ctx.quadraticCurveTo(ex + 4.5, ey + 3.5, ex + 4.8, ey - 1.5);
    ctx.lineTo(ex + (i ? 7 : 4.8), ey - (i ? 4.5 : 3));
    ctx.quadraticCurveTo(ex, ey - 3.8, ex - (i ? 4.5 : 7), ey - (i ? 3 : 4.5));
    ctx.closePath();
    ctx.fill(); ctx.stroke();
  });
  ctx.beginPath(); ctx.moveTo(3.8, -104); ctx.lineTo(4.2, -104); ctx.stroke();
  // 눈
  if (o.stun) {
    swirlEyes(ctx, [[-1, -102.5], [9, -102.5]]);
  } else if (o.defeated) {
    ctx.strokeStyle = '#2e201c'; ctx.lineWidth = 1.3;
    [[-1, -102], [9, -102]].forEach(([ex, ey]) => { ctx.beginPath(); ctx.arc(ex, ey - 1, 2.2, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke(); });
    ctx.fillStyle = 'rgba(120,190,255,0.85)';
    ellipse(ctx, 9, -97 + ((t * 18) % 5), 1.2, 1.9);
  } else {
    ctx.fillStyle = '#211726';
    ellipse(ctx, -0.5, -102.5, 1.9, 1.5);
    ellipse(ctx, 9.5, -102.5, 1.9, 1.5);
    // 반쯤 감긴 눈꺼풀 (도도한 표정)
    ctx.strokeStyle = '#211726'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(-3, -104); ctx.lineTo(2, -104.2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(7, -104.2); ctx.lineTo(12, -104); ctx.stroke();
  }
  // 렌즈 반짝임
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillRect(-3.5, -105.5, 1.6, 1.6);
  ctx.fillRect(6.5, -105.5, 1.6, 1.6);
  // 금이 간 안경 (패배)
  if (o.defeated || (o.crown !== undefined && o.crown < 2)) {
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(6, -106); ctx.lineTo(9, -103); ctx.lineTo(7.5, -100.5); ctx.moveTo(9, -103); ctx.lineTo(12, -102.5); ctx.stroke();
  }
  // 아치형 눈썹
  ctx.strokeStyle = '#1e1622'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(-4, -108.5); ctx.quadraticCurveTo(-1, -111, 2.5, -109.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(6.5, -109.5); ctx.quadraticCurveTo(10, -111, 13, -108.5); ctx.stroke();
  // 점 (매력점)
  ctx.fillStyle = '#5a3a40'; circle(ctx, 12.5, -97.5, 0.8);
  // 코
  ctx.strokeStyle = C.skinLine; ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.moveTo(5, -100); ctx.lineTo(5.8, -97.5); ctx.stroke();
  // 빨간 입술
  ctx.fillStyle = C.lip;
  if (o.defeated || o.stun || o.hurt) {
    ctx.beginPath(); ctx.ellipse(5, -93.5, 2.4, 1.6, 0, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(1.5, -94.5);
    ctx.quadraticCurveTo(5, -92.2, 9, -95.5); // 한쪽만 올라간 미소
    ctx.quadraticCurveTo(5, -91, 1.5, -94.5);
    ctx.fill();
  }

  // 앞쪽 팔 + 유리 지팡이
  const front = o.cast ? [12, -108] : o.dash ? [16, -70] : [12 + sw * 4, -58];
  bossLimb(ctx, 8, -83, front[0], front[1], 5, C.coat, C.coatDark);
  ctx.fillStyle = C.skin; circle(ctx, front[0], front[1], 3);
  ctx.save();
  ctx.translate(front[0], front[1]);
  ctx.rotate(o.cast ? -0.25 : 0.35);
  ctx.fillStyle = C.trim;
  ctx.fillRect(-1.2, -26, 2.4, 34);
  ctx.fillStyle = C.crystalDark;
  ctx.beginPath(); ctx.moveTo(0, -40); ctx.lineTo(6, -30); ctx.lineTo(0, -22); ctx.lineTo(-6, -30); ctx.closePath(); ctx.fill();
  ctx.fillStyle = C.crystal;
  ctx.beginPath(); ctx.moveTo(0, -38); ctx.lineTo(3, -30); ctx.lineTo(0, -24); ctx.closePath(); ctx.fill();
  if (o.cast) {
    ctx.globalAlpha *= 0.5 + 0.5 * Math.sin(t * 20);
    ctx.fillStyle = 'rgba(160,240,255,0.6)';
    circle(ctx, 0, -31, 11);
  }
  ctx.restore();

  ctx.restore();
  if (o.stun) drawDizzy(ctx, x, y - 140 * s, t);
}
