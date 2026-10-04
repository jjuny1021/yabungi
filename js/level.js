// 레벨 데이터: 타일 단위 좌표로 구성 (1 = 땅, 2 = 한쪽 통과 발판, 3 = 철문)
const TILE = 40;
const ROWS = 14;
const ZONE_START = [0, 76, 146];
const ZONE_NAMES = ['1구역 · 속삭이는 숲', '2구역 · 노을빛 폐허', '3구역 · 냥보스의 성'];

function zoneOf(tx) {
  return tx < ZONE_START[1] ? 0 : tx < ZONE_START[2] ? 1 : 2;
}

function buildLevel() {
  const COLS = 220;
  const grid = [];
  for (let y = 0; y < ROWS; y++) grid.push(new Array(COLS).fill(0));

  const L = {
    cols: COLS,
    grid,
    treats: [],
    hearts: [],
    enemies: [],
    hazards: [],
    checkpoints: [],
    movers: [],
    triggers: [],
    gate: null,
    cage: null,
    start: { x: 2, y: 11 },
  };

  const solid = (x1, x2, y1, y2) => {
    for (let y = y1; y <= y2; y++)
      for (let x = x1; x <= x2; x++)
        if (y >= 0 && y < ROWS && x >= 0 && x < COLS) grid[y][x] = 1;
  };
  const ground = (x1, x2, top = 12) => solid(x1, x2, top, ROWS - 1);
  const plat = (x, y, w) => {
    for (let i = 0; i < w; i++) if (grid[y][x + i] === 0) grid[y][x + i] = 2;
  };
  const treat = (x, y) => L.treats.push({ x: x * TILE + 20, y: y * TILE + 20, taken: false });
  const treatRow = (x, y, n) => { for (let i = 0; i < n; i++) treat(x + i, y); };
  const heartItem = (x, y) => L.hearts.push({ x: x * TILE + 20, y: y * TILE + 20, taken: false });
  const hazard = (x1, x2, y = 11) =>
    L.hazards.push({ x: x1 * TILE, y: y * TILE + 16, w: (x2 - x1 + 1) * TILE, h: 24, zone: zoneOf(x1) });
  const walker = (x, top, min, max, dir = 1) =>
    L.enemies.push({
      type: 'cat', x: x * TILE, y: top * TILE - 30, w: 34, h: 30,
      minX: min * TILE, maxX: (max + 1) * TILE, dir, speed: 62, stun: 0, dead: false, deadT: 0,
    });
  const bird = (x, row, min, max) =>
    L.enemies.push({
      type: 'crow', x: x * TILE, y: row * TILE, baseY: row * TILE, w: 30, h: 22,
      minX: min * TILE, maxX: (max + 1) * TILE, dir: -1, speed: 85, stun: 0, dead: false, deadT: 0,
      phase: Math.random() * 6,
    });
  const mover = (x1, x2, row, w, speed) =>
    L.movers.push({
      x: x1 * TILE, y: row * TILE, w: w * TILE, h: 16,
      minX: x1 * TILE, maxX: (x2 + 1) * TILE - w * TILE, dir: 1, speed, dx: 0,
    });
  const checkpoint = (x, text, speaker = 'yabung') =>
    L.checkpoints.push({ tx: x, ty: 11, x: x * TILE + 20, active: false, text, speaker });
  const trigger = (x, speaker, text) => L.triggers.push({ x: x * TILE, speaker, text, done: false });

  // ───────── 1구역: 속삭이는 숲 ─────────
  trigger(1, 'yabung', '엄마…? 리베라 엄마! 어디 있어요?');
  trigger(4, 'yabung', '분홍 리본이 떨어져 있어… 엄마 거야! 냄새를 따라가자!');
  ground(0, 15);
  treatRow(5, 11, 3);
  plat(9, 9, 3); treatRow(9, 8, 3);
  treat(17, 9);
  ground(19, 34);
  walker(24, 12, 20, 28);
  hazard(29, 30);
  plat(27, 9, 4); treatRow(27, 8, 4);
  solid(35, 40, 10, 13); treatRow(36, 9, 3);
  treat(42, 8);
  ground(44, 58);
  checkpoint(46, '엄마 냄새가 점점 진해져. 이 길이 맞아!');
  plat(50, 9, 2);
  plat(53, 7, 2); treatRow(53, 6, 2);
  bird(52, 8, 48, 57);
  hazard(56, 57);
  treat(60, 9);
  ground(62, 75);
  walker(65, 12, 63, 74);
  walker(71, 12, 63, 74, -1);
  treatRow(67, 10, 4);

  // ───────── 2구역: 노을빛 폐허 ─────────
  ground(78, 88);
  trigger(79, 'yabung', '고양이 발자국… 냥보스 일당 짓이 분명해!');
  plat(82, 9, 4); treatRow(82, 8, 4);
  hazard(84, 85);
  mover(89, 95, 10, 2, 90);
  treat(91, 8); treat(94, 8);
  ground(97, 110);
  checkpoint(98, '야붕아, 무서울 땐 크게 짖으렴. 용기는 목소리에서 나온단다. (X 키 / 멍! 버튼)', 'memory');
  solid(102, 103, 10, 11); treatRow(102, 9, 2);
  walker(106, 12, 104, 110);
  bird(108, 7, 104, 114);
  plat(112, 10, 2); treatRow(112, 9, 2);
  plat(115, 9, 2); treatRow(115, 8, 2);
  ground(118, 132);
  plat(122, 9, 5); treatRow(122, 8, 5);
  hazard(123, 125);
  heartItem(127, 11);
  walker(129, 12, 126, 132);
  solid(133, 138, 10, 13); treatRow(134, 9, 3);
  ground(142, 162);

  // ───────── 3구역: 냥보스의 성 ─────────
  trigger(146, 'yabung', '저 성이야! 엄마가 저 안에 있어!');
  checkpoint(149, '조금만 기다려요, 엄마. 거의 다 왔어요!');
  trigger(151, 'boss', '냐하하! 간식 없이는 내 철문을 절대 못 연다냥~!');
  walker(153, 12, 150, 157);
  walker(156, 12, 150, 157, -1);
  bird(155, 8, 150, 160);
  treatRow(152, 10, 3);
  hazard(158, 159);
  mover(163, 168, 10, 2, 110);
  treat(165, 8); treat(167, 8);
  ground(170, 186);
  plat(173, 9, 3); treatRow(173, 8, 3);
  plat(177, 7, 3); treatRow(177, 6, 3);
  hazard(178, 180);
  walker(184, 12, 182, 186);
  ground(190, 219);
  checkpoint(191, '거대한 철문이다! 간식을 충분히 모았다면 열 수 있을 거야.');
  heartItem(192, 11);
  treatRow(194, 10, 4);
  walker(195, 12, 193, 203);
  walker(200, 12, 193, 203, -1);
  bird(198, 8, 193, 203);

  // 철문 (간식 필요)
  for (let y = 0; y <= 11; y++) grid[y][205] = 3;
  L.gate = { x: 205, open: false, openT: 0, msgCd: 0 };

  // 리베라가 갇힌 우리
  L.cage = { x: 211, doorT: 0, lx: 211 * TILE + 60, lrun: false };
  solid(219, 219, 0, 13);

  return L;
}
