// 레벨 데이터: 타일 단위 좌표
// 0 = 빈칸, 1 = 땅, 2 = 한쪽 통과 발판, 3 = 문(간식/보스), 4 = 무너지는 발판, 5 = 얼음(미끄러움), 6 = 보스방 봉인벽
const TILE = 40;
const ROWS = 14;

const STAGES = [
  { name: '속삭이는 숲', theme: 0, mult: 1.0 },
  { name: '노을빛 폐허', theme: 1, mult: 1.12 },
  { name: '노원대장의 요새', theme: 2, mult: 1.2, boss: 'nowon' },
  { name: '얼어붙은 설산', theme: 3, mult: 1.28 },
  { name: '글라스킴의 유리 궁전', theme: 4, mult: 1.36, boss: 'glass' },
];

function makeBuilder(cols, stageNo) {
  const S = STAGES[stageNo - 1];
  const grid = [];
  for (let y = 0; y < ROWS; y++) grid.push(new Array(cols).fill(0));
  const L = {
    stage: stageNo, name: S.name, theme: S.theme, mult: S.mult,
    cols, grid,
    treats: [], hearts: [], enemies: [], hazards: [], checkpoints: [], movers: [],
    triggers: [], icicles: [], crumbles: {},
    gate: null, exitX: null, cage: null, boss: null, arena: null,
    start: { x: 2, y: 11 },
  };
  const b = {
    L,
    solid(x1, x2, y1, y2, v = 1) {
      for (let y = y1; y <= y2; y++)
        for (let x = x1; x <= x2; x++)
          if (y >= 0 && y < ROWS && x >= 0 && x < cols) grid[y][x] = v;
    },
    ground(x1, x2, top = 12) { b.solid(x1, x2, top, ROWS - 1); },
    ice(x1, x2, top = 12) { b.solid(x1, x2, top, top, 5); b.solid(x1, x2, top + 1, ROWS - 1, 1); },
    ceiling(x1, x2) { b.solid(x1, x2, 0, 1); },
    plat(x, y, w) { for (let i = 0; i < w; i++) if (grid[y][x + i] === 0) grid[y][x + i] = 2; },
    crumble(x, y, w) {
      for (let i = 0; i < w; i++) {
        grid[y][x + i] = 4;
        L.crumbles[`${x + i},${y}`] = { x: x + i, y, t: 0, state: 'ok', respawn: 0 };
      }
    },
    treat(x, y) { L.treats.push({ x: x * TILE + 20, y: y * TILE + 20, taken: false }); },
    treatRow(x, y, n) { for (let i = 0; i < n; i++) b.treat(x + i, y); },
    heart(x, y) { L.hearts.push({ x: x * TILE + 20, y: y * TILE + 20, taken: false }); },
    hazard(x1, x2, y = 11) {
      L.hazards.push({ x: x1 * TILE, y: y * TILE + 16, w: (x2 - x1 + 1) * TILE, h: 24, zone: S.theme });
    },
    enemy(type, x, top, min, max, dir = 1) {
      const dims = { cat: [34, 30], hopper: [34, 30], spiky: [34, 26] }[type];
      L.enemies.push({
        type, x: x * TILE, y: top * TILE - dims[1], w: dims[0], h: dims[1], groundY: top * TILE,
        minX: min * TILE, maxX: (max + 1) * TILE, dir,
        speed: (type === 'spiky' ? 48 : type === 'hopper' ? 70 : 64) * S.mult,
        vy: 0, hopT: 0.6 + Math.random(), stun: 0, dead: false, deadT: 0,
      });
    },
    walker(x, top, min, max, dir) { b.enemy('cat', x, top, min, max, dir); },
    hopper(x, top, min, max, dir) { b.enemy('hopper', x, top, min, max, dir); },
    spiky(x, top, min, max, dir) { b.enemy('spiky', x, top, min, max, dir); },
    bird(x, row, min, max) {
      L.enemies.push({
        type: 'crow', x: x * TILE, y: row * TILE, baseY: row * TILE, w: 30, h: 22,
        minX: min * TILE, maxX: (max + 1) * TILE, dir: -1, speed: 88 * S.mult, stun: 0, dead: false, deadT: 0,
        phase: Math.random() * 6,
      });
    },
    mover(x1, x2, row, w, speed) {
      L.movers.push({
        x: x1 * TILE, y: row * TILE, w: w * TILE, h: 16,
        minX: x1 * TILE, maxX: (x2 + 1) * TILE - w * TILE, dir: 1, speed: speed * S.mult, dx: 0,
      });
    },
    icicle(x, row = 2) {
      L.icicles.push({ x: x * TILE + 20, y: row * TILE, y0: row * TILE, vy: 0, state: 'hang', t: 0 });
    },
    checkpoint(x, text, speaker = 'yabung') {
      L.checkpoints.push({ tx: x, ty: 11, x: x * TILE + 20, active: false, text, speaker });
    },
    trigger(x, speaker, text) { L.triggers.push({ x: x * TILE, speaker, text, done: false }); },
    gate(x, req, kind = 'treat') {
      for (let y = 0; y <= 11; y++) grid[y][x] = 3;
      L.gate = { x, req, kind, open: false, openT: 0, msgCd: 0 };
    },
    exit(x) { L.exitX = x; },
    arena(x1, x2, bossKind, spawnX) {
      L.arena = { x1, x2, locked: false };
      L.boss = { kind: bossKind, spawnX };
    },
    wall(x) { b.solid(x, x, 0, ROWS - 1); },
  };
  return b;
}

// ───────── STAGE 1 : 속삭이는 숲 ─────────
function stage1() {
  const b = makeBuilder(172, 1);
  b.trigger(1, 'yabung', '엄마…? 리베라 엄마! 어디 있어요?');
  b.trigger(5, 'yabung', '반짝이는 금색 귀걸이… 엄마 거야! 냄새를 따라가자!');
  b.ground(0, 16);
  b.treatRow(6, 11, 3);
  b.plat(10, 9, 3); b.treatRow(10, 8, 3);
  b.walker(14, 12, 8, 16);
  b.treat(18, 9);
  b.ground(20, 36);
  b.walker(24, 12, 21, 28);
  b.hazard(29, 30);
  b.plat(27, 9, 4); b.treatRow(27, 8, 4);
  b.solid(33, 36, 10, 13); b.treatRow(33, 9, 3);
  b.ground(41, 58);
  b.checkpoint(43, '엄마 냄새가 점점 진해져. 이 길이 맞아!');
  b.hopper(47, 12, 45, 52);
  b.plat(50, 9, 2); b.plat(53, 7, 2); b.treatRow(53, 6, 2);
  b.bird(52, 8, 47, 58);
  b.hazard(56, 57);
  b.treat(60, 9);
  b.ground(62, 73);
  b.walker(65, 12, 63, 72); b.walker(70, 12, 63, 72, -1);
  b.treatRow(66, 10, 4);
  b.solid(74, 75, 10, 13); b.solid(76, 77, 8, 13);
  b.treatRow(76, 7, 2);
  b.ground(82, 100);
  b.heart(84, 11);
  b.plat(86, 9, 3); b.treatRow(86, 8, 3);
  b.walker(90, 12, 83, 96); b.hopper(95, 12, 90, 99);
  b.bird(93, 7, 85, 100);
  b.hazard(97, 98);
  b.ground(104, 125);
  b.checkpoint(105, '야붕아, 무서울 땐 크게 짖으렴. 용기는 목소리에서 나온단다. (X 키 / 멍! 버튼)', 'memory');
  b.plat(108, 9, 2); b.plat(111, 7, 2); b.plat(114, 5, 2); b.treatRow(114, 4, 2);
  b.walker(110, 12, 106, 118); b.walker(117, 12, 110, 119, -1);
  b.hazard(120, 121);
  b.plat(119, 9, 4); b.treatRow(119, 8, 4);
  b.ground(129, 171);
  b.trigger(131, 'nowon', '어이, 꼬맹이! 간식 22개 없으면 이 문은 못 지나간다!');
  b.walker(134, 12, 131, 145); b.hopper(140, 12, 133, 148); b.bird(142, 8, 133, 150);
  b.treatRow(136, 10, 3);
  b.plat(146, 9, 3); b.treatRow(146, 8, 3);
  b.walker(152, 12, 150, 156, -1);
  b.gate(158, 22);
  b.exit(163);
  b.wall(171);
  return b.L;
}

// ───────── STAGE 2 : 노을빛 폐허 ─────────
function stage2() {
  const b = makeBuilder(190, 2);
  b.trigger(1, 'yabung', '여기저기 고양이 발자국… 그리고 큰 운동화 자국?');
  b.ground(0, 12);
  b.treatRow(5, 11, 3);
  b.plat(8, 9, 3); b.treatRow(8, 8, 3);
  b.spiky(11, 12, 9, 12);
  b.mover(13, 19, 10, 2, 90);
  b.treat(16, 8);
  b.ground(20, 34);
  b.walker(23, 12, 21, 29); b.hopper(27, 12, 21, 29);
  b.hazard(31, 32);
  b.plat(30, 9, 3); b.treatRow(30, 8, 3);
  b.solid(35, 36, 9, 13); b.treatRow(35, 8, 2);
  b.ground(41, 60);
  b.checkpoint(42, '고슴도치는 밟으면 따가워! 멍멍 짖어서 기절시키자!');
  b.bird(46, 8, 42, 55); b.bird(52, 6, 46, 60);
  b.plat(45, 9, 2); b.plat(48, 7, 3); b.treatRow(48, 6, 3); b.plat(52, 9, 2);
  b.spiky(53, 12, 50, 55);
  b.hazard(57, 58);
  b.mover(61, 70, 9, 2, 110);
  b.treat(64, 7); b.treat(67, 7);
  b.ground(71, 90);
  b.heart(72, 11);
  b.hopper(75, 12, 72, 77); b.hopper(83, 12, 80, 89);
  b.solid(78, 79, 10, 13); b.treatRow(78, 9, 2);
  b.hazard(85, 86);
  b.plat(84, 9, 4); b.treatRow(84, 8, 4);
  b.ground(94, 112);
  b.checkpoint(95, '야붕아, 넘어져도 괜찮아. 다시 일어나면 돼.', 'memory');
  b.walker(98, 12, 96, 108); b.spiky(104, 12, 100, 108); b.bird(102, 7, 95, 112);
  b.plat(99, 9, 3); b.plat(103, 7, 3); b.plat(107, 9, 3); b.treatRow(103, 6, 3);
  b.hazard(109, 110);
  b.mover(113, 118, 10, 2, 120);
  b.ground(119, 140);
  b.solid(124, 125, 10, 13); b.solid(126, 127, 8, 13); b.solid(128, 129, 10, 13);
  b.treatRow(126, 7, 2);
  b.walker(132, 12, 130, 139); b.hopper(136, 12, 130, 139);
  b.ground(144, 189);
  b.trigger(146, 'nowon', '흐흐, 이번 문은 간식 25개다! 노원대장님 말씀 잘 들어라!');
  b.walker(148, 12, 145, 160); b.walker(155, 12, 145, 160, -1); b.spiky(162, 12, 160, 168); b.bird(152, 8, 145, 165);
  b.treatRow(150, 10, 4);
  b.plat(160, 9, 3); b.treatRow(160, 8, 3);
  b.gate(172, 25);
  b.exit(177);
  b.wall(189);
  return b.L;
}

// ───────── STAGE 3 : 노원대장의 요새 (중간보스) ─────────
function stage3() {
  const b = makeBuilder(162, 3);
  b.trigger(1, 'yabung', '저 요새야! 노원대장 김현오가 산다는 곳…!');
  b.ground(0, 14);
  b.walker(9, 12, 6, 14); b.treatRow(4, 11, 3);
  b.plat(10, 9, 3); b.treatRow(10, 8, 3);
  b.ground(18, 32);
  b.hazard(21, 22); b.hazard(27, 28);
  b.plat(20, 9, 4); b.plat(26, 9, 4); b.treatRow(20, 8, 4);
  b.hopper(24, 12, 23, 26);
  b.bird(26, 7, 20, 32);
  b.mover(33, 40, 10, 2, 120);
  b.treat(36, 8);
  b.ground(41, 58);
  b.checkpoint(42, '조금만 기다려요, 엄마. 거의 다 왔어요!');
  b.spiky(45, 12, 43, 47); b.walker(54, 12, 50, 57, -1);
  b.solid(48, 49, 10, 13); b.treatRow(48, 9, 2);
  b.plat(53, 8, 3); b.treatRow(53, 7, 3);
  b.ground(62, 82);
  b.hazard(66, 67);
  b.hopper(71, 12, 68, 81); b.hopper(77, 12, 68, 81);
  b.bird(72, 8, 63, 82);
  b.plat(68, 9, 3); b.treatRow(68, 8, 3);
  b.plat(73, 7, 3); b.treatRow(73, 6, 3);
  b.heart(80, 11);
  b.mover(83, 90, 9, 2, 130);
  b.ground(91, 161);
  b.checkpoint(92, '저 문 너머에서 무서운 아저씨 목소리가 들려…!');
  b.walker(95, 12, 93, 100); b.spiky(104, 12, 101, 108); b.bird(100, 7, 93, 110);
  b.treatRow(96, 10, 4);
  b.plat(105, 9, 3); b.treatRow(105, 8, 3);
  b.checkpoint(112, '여기가 노원대장의 방…! 정신 바짝 차리자!');
  b.heart(114, 11);
  // 보스방: 118~141, 왼쪽 벽 117은 입장 시 봉인, 오른쪽 142는 보스 처치 시 열림
  b.arena(118, 141, 'nowon', 136);
  b.plat(122, 9, 3); b.plat(134, 9, 3);
  b.gate(142, null, 'boss');
  b.exit(148);
  b.wall(161);
  return b.L;
}

// ───────── STAGE 4 : 얼어붙은 설산 ─────────
function stage4() {
  const b = makeBuilder(200, 4);
  b.trigger(1, 'yabung', '으… 추워! 그래도 엄마를 위해서라면!');
  b.trigger(5, 'glass', '후후… 현오를 이겼다고? 하지만 설산에서 꽁꽁 얼어버릴걸!');
  b.ground(0, 14);
  b.treatRow(5, 11, 3);
  b.ice(15, 24);
  b.walker(18, 12, 15, 24);
  b.plat(17, 9, 3); b.treatRow(17, 8, 3);
  b.ground(28, 44);
  b.ceiling(30, 40);
  b.icicle(32); b.icicle(35); b.icicle(38);
  b.treatRow(32, 11, 6);
  b.hopper(42, 12, 41, 44);
  b.crumble(45, 10, 2); b.crumble(48, 9, 2); b.crumble(51, 10, 2);
  b.treat(48, 8); b.treat(51, 9);
  b.ground(54, 72);
  b.checkpoint(55, '발이 미끄러워… 얼음 위에서는 조심조심!');
  b.ice(58, 66);
  b.spiky(62, 12, 58, 66);
  b.bird(63, 7, 56, 72);
  b.plat(60, 9, 3); b.treatRow(60, 8, 3);
  b.hazard(68, 69);
  b.plat(67, 9, 4); b.treatRow(67, 8, 4);
  b.mover(73, 80, 10, 2, 130);
  b.treat(76, 8);
  b.ground(81, 100);
  b.heart(82, 11);
  b.ceiling(84, 96);
  b.icicle(86); b.icicle(89); b.icicle(92); b.icicle(95);
  b.walker(88, 12, 82, 99); b.hopper(94, 12, 85, 99);
  b.treatRow(88, 10, 4);
  b.ground(104, 126);
  b.checkpoint(105, '엄마가 해주던 따뜻한 밥이 그리워… 힘내자!');
  b.crumble(108, 9, 3); b.crumble(112, 7, 3); b.crumble(116, 9, 3);
  b.treatRow(112, 6, 3);
  b.ice(110, 122);
  b.walker(111, 12, 108, 122); b.walker(118, 12, 108, 122, -1); b.bird(115, 8, 106, 124);
  b.hazard(124, 125);
  b.crumble(128, 10, 2);
  b.ground(132, 152);
  b.spiky(136, 12, 133, 142); b.hopper(148, 12, 146, 151);
  b.solid(143, 144, 10, 13); b.treatRow(143, 9, 2);
  b.plat(138, 9, 3); b.treatRow(138, 8, 3);
  b.ceiling(146, 151); b.icicle(147); b.icicle(150);
  b.crumble(154, 10, 2);
  b.ground(157, 199);
  b.trigger(158, 'glass', '간식 30개가 없으면 이 얼음문은 절대 안 열린단다~');
  b.walker(160, 12, 158, 172); b.walker(167, 12, 158, 172, -1); b.spiky(174, 12, 172, 179); b.bird(165, 7, 158, 178);
  b.treatRow(162, 10, 4);
  b.plat(173, 9, 3); b.treatRow(173, 8, 3);
  b.gate(182, 30);
  b.exit(187);
  b.wall(199);
  return b.L;
}

// ───────── STAGE 5 : 글라스킴의 유리 궁전 (최종보스) ─────────
function stage5() {
  const b = makeBuilder(152, 5);
  b.trigger(1, 'yabung', '반짝반짝 유리 궁전… 엄마가 여기 있어!');
  b.ground(0, 12);
  b.treatRow(4, 11, 3);
  b.crumble(13, 10, 2); b.crumble(16, 9, 2); b.crumble(19, 10, 2);
  b.treat(16, 8);
  b.ground(22, 38);
  b.spiky(25, 12, 23, 27); b.hopper(34, 12, 31, 38);
  b.hazard(28, 29);
  b.plat(27, 9, 3); b.treatRow(27, 8, 3);
  b.bird(32, 7, 24, 38);
  b.mover(39, 46, 10, 2, 140);
  b.treat(42, 8);
  b.ground(47, 66);
  b.checkpoint(48, '유리 바닥에 비친 내 모습… 제법 용감해 보여!');
  b.hazard(52, 53); b.hazard(59, 60);
  b.plat(51, 9, 3); b.plat(58, 9, 3); b.treatRow(51, 8, 3); b.treatRow(58, 8, 3);
  b.walker(55, 12, 54, 57); b.hopper(63, 12, 61, 66);
  b.bird(56, 6, 48, 66);
  b.crumble(67, 10, 2); b.crumble(71, 8, 2); b.crumble(75, 10, 2);
  b.treat(71, 7);
  b.ground(78, 96);
  b.heart(79, 11);
  b.spiky(84, 12, 81, 86); b.spiky(93, 12, 90, 96, -1);
  b.walker(88, 12, 87, 92);
  b.plat(82, 9, 2); b.plat(86, 7, 3); b.plat(91, 9, 2); b.treatRow(86, 6, 3);
  b.ground(100, 151);
  b.checkpoint(101, '이 문 너머에 글라스킴이 있어. 엄마, 조금만 기다려요!');
  b.heart(103, 11);
  b.walker(105, 12, 103, 109); b.hopper(108, 12, 103, 109);
  // 보스방 113~139, 오른쪽 140 유리 장벽 → 리베라의 우리
  b.arena(113, 139, 'glass', 134);
  b.plat(117, 9, 3); b.plat(132, 9, 3);
  b.gate(140, null, 'glass');
  b.L.cage = { x: 144, doorT: 0, lx: 144 * TILE + 60, lrun: false };
  b.wall(151);
  return b.L;
}

function buildStage(n) {
  return [stage1, stage2, stage3, stage4, stage5][n - 1]();
}
