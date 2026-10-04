// 리베라 : 야붕이의 엄마(사람)
// 실물 사진 참고 - 짙은 갈색 긴 생머리, 금색 링 귀걸이, 흰 니트 위에
// '리베라' 글씨 패턴 + 초록·빨강 사선 스트라이프 크림색 반팔 재킷 & 스커트 셋업
const LIBERA = {
  skin: '#ffe4d4', skinLine: '#e2b39b',
  hair: '#3d2b25', hairDark: '#2b1e1a', hairShine: '#5a4038',
  cream: '#fbf6ea', creamLine: '#d9cfbd', ink: '#2f3a66',
  green: '#2f8a52', red: '#d23a3a',
  knit: '#f3f0ea', knitLine: '#ddd7cd',
  lip: '#d4524f', shoe: '#2d2a33',
};

function liberaFabric(ctx, pathFn, stripeAngle, stripeOffsets, t) {
  const C = LIBERA;
  ctx.save();
  pathFn();
  ctx.fillStyle = C.creamLine;
  ctx.fill();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = C.creamLine;
  ctx.stroke();
  pathFn();
  ctx.fillStyle = C.cream;
  ctx.fill();
  ctx.clip();
  // '리베라' 글씨 패턴 (작은 남색 글자 줄)
  ctx.fillStyle = C.ink;
  ctx.globalAlpha = 0.75;
  for (let y = -110; y < 0; y += 4.2) {
    const off = (Math.round(y / 4.2) % 2) * 2.5;
    for (let x = -30; x < 30; x += 5) {
      ctx.fillRect(x + off, y, 1.1, 1.6);
      ctx.fillRect(x + off + 1.6, y + 0.3, 1.1, 1.2);
    }
  }
  ctx.globalAlpha = 1;
  // 초록-빨강-초록 사선 스트라이프
  for (const off of stripeOffsets) {
    ctx.save();
    ctx.translate(off[0], off[1]);
    ctx.rotate(stripeAngle);
    ctx.fillStyle = C.green;
    ctx.fillRect(-40, -2.6, 80, 5.2);
    ctx.fillStyle = C.red;
    ctx.fillRect(-40, -1.2, 80, 2.4);
    ctx.restore();
  }
  ctx.restore();
}

function drawHuman(ctx, x, y, s, facing, t, o = {}) {
  const C = LIBERA;
  const ph = t * 9;
  const sw = o.walk ? Math.sin(ph) : 0;
  const bob = o.walk ? Math.abs(Math.sin(ph)) * 1.5 : Math.sin(t * 2) * 0.5;
  const sway = Math.sin(t * 2.2) * 0.8 + (o.walk ? sw * 1.2 : 0);

  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(40,30,20,0.16)';
  ellipse(ctx, 0, 0, 20 * s, 4 * s);
  ctx.scale(facing * s, s);
  ctx.translate(0, -bob);

  // 다리 + 구두
  [[-7, sw], [2.5, -sw]].forEach(([lx, k]) => {
    const dx = k * 3.5;
    ctx.fillStyle = C.skinLine;
    rr(ctx, lx - 0.8 + dx, -26, 7.4, 23, 3.5);
    ctx.fill();
    ctx.fillStyle = C.skin;
    rr(ctx, lx + dx, -25, 5.8, 21, 3);
    ctx.fill();
    ctx.fillStyle = C.shoe;
    rr(ctx, lx - 1 + dx, -5, 9.5, 5.5, 2.5);
    ctx.fill();
  });

  // 등 뒤로 늘어진 긴 생머리
  ctx.fillStyle = C.hairDark;
  ctx.beginPath();
  ctx.moveTo(-19, -86);
  ctx.quadraticCurveTo(-25 + sway, -60, -20 + sway, -46);
  ctx.lineTo(-4, -48);
  ctx.lineTo(-2, -86);
  ctx.closePath();
  ctx.fill();

  // 스커트 (같은 패턴의 셋업)
  liberaFabric(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-11.5, -45);
    ctx.lineTo(11.5, -45);
    ctx.lineTo(13.5, -22);
    ctx.quadraticCurveTo(0, -20, -13.5, -22);
    ctx.closePath();
  }, -0.55, [[-4, -27], [9, -38]], t);

  // 흰 니트 이너 (골지 라인)
  ctx.fillStyle = C.knitLine;
  rr(ctx, -8.5, -66, 17, 24, 4);
  ctx.fill();
  ctx.fillStyle = C.knit;
  rr(ctx, -7.5, -65.5, 15, 23, 3.5);
  ctx.fill();
  ctx.strokeStyle = C.knitLine;
  ctx.lineWidth = 0.6;
  for (let i = -5; i <= 5; i += 2.5) {
    ctx.beginPath();
    ctx.moveTo(i, -63);
    ctx.lineTo(i, -44);
    ctx.stroke();
  }

  // 반팔 소매 + 팔
  const arm = (sx, hx, hy, back) => {
    ctx.lineCap = 'round';
    ctx.strokeStyle = C.skinLine;
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(sx, -55); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.strokeStyle = C.skin;
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(sx, -55); ctx.lineTo(hx, hy); ctx.stroke();
    // 소매
    const ang = Math.atan2(hy + 55, hx - sx);
    liberaFabric(ctx, () => {
      ctx.beginPath();
      ctx.ellipse(sx + Math.cos(ang) * 4, -57 + Math.sin(ang) * 4, 7, 6, ang, 0, Math.PI * 2);
    }, back ? 0.7 : -0.7, [[sx + Math.cos(ang) * 6, -57 + Math.sin(ang) * 6]], t);
  };
  let hands;
  if (o.reach) {
    const wave = Math.sin(t * 6) * 2;
    hands = [[14, -48 + wave], [24, -45 - wave]];
  } else if (o.sad) {
    hands = [[-3, -40], [6, -39]];
  } else {
    hands = [[-14 - sw * 4, -34], [14 + sw * 4, -34]];
  }
  arm(-10, hands[0][0], hands[0][1], true);

  // 오픈 재킷 (좌우 앞판 + 카라)
  liberaFabric(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-13.5, -64);
    ctx.lineTo(-3.5, -66);
    ctx.lineTo(-2.5, -52);
    ctx.lineTo(-4.5, -40);
    ctx.lineTo(-15, -41);
    ctx.closePath();
  }, -0.75, [[-8, -58], [-9, -45]], t);
  liberaFabric(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(3.5, -66);
    ctx.lineTo(13.5, -64);
    ctx.lineTo(15, -41);
    ctx.lineTo(4.5, -40);
    ctx.lineTo(2.5, -52);
    ctx.closePath();
  }, -0.75, [[9, -56], [10, -44]], t);
  // 카라
  ctx.fillStyle = C.cream;
  ctx.strokeStyle = C.creamLine;
  ctx.lineWidth = 1.2;
  [[-1, -4.5, -11], [1, 4.5, 11]].forEach(([d, a, b]) => {
    ctx.beginPath();
    ctx.moveTo(a, -67);
    ctx.lineTo(b, -66);
    ctx.lineTo(d * 3, -58);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });

  arm(10, hands[1][0], hands[1][1], false);

  // 목 + 니트 목 부분
  ctx.fillStyle = C.skin;
  rr(ctx, -3.5, -71, 7, 7, 3);
  ctx.fill();
  ctx.fillStyle = C.knit;
  rr(ctx, -5.5, -68, 11, 4, 2);
  ctx.fill();

  // 머리
  ctx.fillStyle = C.hair;
  circle(ctx, -1, -86, 20);
  ctx.fillStyle = C.skinLine;
  ellipse(ctx, 3.5, -82, 14.8, 15.2);
  ctx.fillStyle = C.skin;
  ellipse(ctx, 3.5, -82, 13.8, 14.2);

  // 옆 가르마로 넘긴 앞머리 + 얼굴 옆선 머리카락
  ctx.fillStyle = C.hair;
  ctx.beginPath();
  ctx.moveTo(-14, -90);
  ctx.quadraticCurveTo(-2, -108, 17, -94);
  ctx.quadraticCurveTo(10, -98, 2, -95);
  ctx.quadraticCurveTo(-6, -92, -9, -80);
  ctx.closePath();
  ctx.fill();
  // 앞쪽으로 떨어지는 긴 머리 (어깨 아래까지)
  ctx.beginPath();
  ctx.moveTo(-12, -88);
  ctx.quadraticCurveTo(-15 + sway * 0.5, -66, -12 + sway, -50);
  ctx.lineTo(-6 + sway, -52);
  ctx.quadraticCurveTo(-7, -70, -7, -84);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(15, -94);
  ctx.quadraticCurveTo(20, -80, 18 + sway * 0.6, -60);
  ctx.lineTo(14 + sway * 0.6, -60);
  ctx.quadraticCurveTo(16, -78, 13, -90);
  ctx.closePath();
  ctx.fill();
  // 머릿결 광택
  ctx.strokeStyle = C.hairShine;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(-1, -88, 15, Math.PI * 1.15, Math.PI * 1.45);
  ctx.stroke();

  // 금색 링 귀걸이
  ctx.strokeStyle = '#e0b04a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(-6, -73, 2.6, 0, Math.PI * 2);
  ctx.stroke();

  // 눈썹
  ctx.strokeStyle = '#4a3530';
  ctx.lineWidth = 1.3;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-0.5, -88); ctx.quadraticCurveTo(2, -89.5, 4.5, -88.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(8.5, -88.5); ctx.quadraticCurveTo(11, -89.5, 13.5, -88); ctx.stroke();

  // 눈
  const blink = (t % 4.1) < 0.12 || o.closed;
  if (blink || o.happy) {
    ctx.strokeStyle = '#2e201c';
    ctx.lineWidth = 1.7;
    [2, 11].forEach((ex) => {
      ctx.beginPath();
      if (o.happy && !o.closed) ctx.arc(ex, -81, 2.5, Math.PI * 1.1, Math.PI * 1.9);
      else ctx.arc(ex, -83, 2.5, Math.PI * 0.1, Math.PI * 0.9);
      ctx.stroke();
    });
  } else {
    ctx.fillStyle = '#2e201c';
    ellipse(ctx, 2, -82, 2.2, 2.6);
    ellipse(ctx, 11, -82, 2.2, 2.6);
    ctx.fillStyle = '#fff';
    circle(ctx, 2.7, -83, 0.85);
    circle(ctx, 11.7, -83, 0.85);
    // 속눈썹
    ctx.strokeStyle = '#2e201c';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-0.6, -84); ctx.lineTo(-1.6, -85); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(13.6, -84); ctx.lineTo(14.6, -85); ctx.stroke();
  }
  if (o.sad) {
    ctx.fillStyle = 'rgba(120,190,255,0.85)';
    ellipse(ctx, 0.5, -76 + ((t * 20) % 6), 1.3, 2);
  }

  // 코 + 볼터치 + 붉은 입술
  ctx.strokeStyle = C.skinLine;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(7.5, -79); ctx.lineTo(8.3, -76.5); ctx.stroke();
  ctx.fillStyle = 'rgba(255,130,150,0.35)';
  ellipse(ctx, -1.5, -76, 3, 1.8);
  ellipse(ctx, 14.5, -76, 3, 1.8);
  ctx.fillStyle = C.lip;
  if (o.sad) {
    ctx.beginPath();
    ctx.ellipse(7, -71.5, 2.6, 1.2, 0, Math.PI, 0);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.ellipse(7, -73, o.happy ? 3.4 : 2.8, o.happy ? 2 : 1.4, 0, 0, Math.PI);
    ctx.fill();
  }
  ctx.restore();
}

