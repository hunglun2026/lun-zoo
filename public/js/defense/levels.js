/* 動物園守護戰：關卡、敵人、塔的設定。
   純資料加放塔格產生器，不碰 DOM 與 Pixi，node 也能載入（難度模擬測試用）。
   座標是 960×540 的邏輯畫面。路線從畫面外左側進來，走到右側的動物之家。 */
(function (G) {
  "use strict";
  const W = 960, H = 540;

  // 敵人：hp 是第 1 關第 1 波的基礎值；speed 單位是像素／秒；dmg 是走到終點扣幾顆愛心
  const ENEMIES = {
    trash: { name: "垃圾袋", emoji: "🗑️", hp: 40, speed: 55, reward: 8, dmg: 1, size: 44 },
    snack: { name: "亂餵零食", emoji: "🍟", hp: 26, speed: 98, reward: 7, dmg: 1, size: 40 },
    water: { name: "汙水", emoji: "💧", hp: 72, speed: 68, reward: 10, dmg: 1, size: 44, split: 2 },
    mini: { name: "小水滴", emoji: "💧", hp: 30, speed: 80, reward: 3, dmg: 1, size: 30 },
    horn: { name: "吵鬧喇叭", emoji: "📢", hp: 95, speed: 64, reward: 12, dmg: 1, size: 46, noise: true },
    bug: { name: "外來種小蟲", emoji: "🐛", hp: 30, speed: 86, reward: 6, dmg: 1, size: 36 },
    storm: { name: "颱風", emoji: "🌀", hp: 900, speed: 38, reward: 120, dmg: 5, size: 84, boss: true },
    lost: { name: "棲地消失", emoji: "🌪️", hp: 2000, speed: 34, reward: 300, dmg: 10, size: 96, boss: true },
  };

  // 塔：放塔價格固定。range 是半徑像素，rate 是幾秒打一下，dmg 是 1 級威力
  const TOWER_COST = 60;
  const TOWERS = {
    monkey: { name: "白面捲尾猴", animal: "cebus-capucinus", color: 0xe8873a, range: 125, rate: 0.5, dmg: 8, say: "連續丟水果" },
    giraffe: { name: "網紋長頸鹿", animal: "giraffa-camelopardalis-reticulata", color: 0xd9a520, range: 230, rate: 1.1, dmg: 15, say: "站得高看得遠" },
    elephant: { name: "亞洲象", animal: "elephas-maximus", color: 0x3a8fd9, range: 135, rate: 1.4, dmg: 17, splash: 58, say: "長鼻子噴水，打一片" },
    penguin: { name: "黑腳企鵝", animal: "spheniscus-demersu", color: 0x2fb5a0, range: 145, rate: 0.9, dmg: 6, slow: 0.45, say: "冰涼讓敵人變慢" },
    turtle: { name: "紅腿象龜", animal: "chelonoidis-carbonarius", color: 0x5a9e4b, range: 105, rate: 1.8, dmg: 12, stun: 0.8, say: "硬殼一擋，敵人停住" },
    owl: { name: "領角鴞", animal: "otus-bakkamoena", color: 0x7d5ba6, range: 175, rate: 1.2, dmg: 20, night: 1.8, say: "夜行性，晚上更強" },
  };
  const TOWER_ORDER = ["monkey", "giraffe", "elephant", "penguin", "turtle", "owl"];

  const P = (...pts) => pts;
  // 每關：路線、波數、每波基礎數量與增量、出怪間隔、速度倍率、可出現的敵人（依序加入）
  const RAW = [
    { name: "入口廣場", paths: [P([-30, 270], [220, 270], [220, 130], [500, 130], [500, 400], [760, 400], [760, 270], [930, 270])],
      waves: 3, base: 4, step: 2, gap: 1.5, speed: 1.0, kinds: ["trash"], gold: 150, slots: 8, tip: "垃圾袋慢慢走來，用猴子把牠們趕走！" },
    { name: "草食區", paths: [P([-30, 100], [300, 100], [300, 440], [620, 440], [620, 160], [930, 160])],
      waves: 4, base: 5, step: 2, gap: 1.3, speed: 1.0, kinds: ["trash", "snack"], gold: 150, slots: 9, tip: "零食跑得快，長頸鹿看得遠。" },
    { name: "水池", paths: [P([-30, 430], [180, 430], [180, 110], [400, 110], [400, 380], [640, 380], [640, 110], [930, 110])],
      waves: 4, base: 6, step: 2, gap: 1.2, speed: 1.0, kinds: ["trash", "snack", "water"], gold: 160, slots: 10, tip: "汙水很耐打，大象一次噴一片。" },
    { name: "寒帶館", paths: [P([-30, 270], [160, 270], [160, 90], [340, 90], [340, 450], [520, 450], [520, 90], [700, 90], [700, 450], [930, 450])],
      waves: 5, base: 7, step: 2, gap: 1.1, speed: 1.05, kinds: ["snack", "trash", "horn"], gold: 170, slots: 10, tip: "喇叭會吵得附近的動物暫時不能打。" },
    { name: "颱風來了", paths: [P([-30, 140], [260, 140], [260, 400], [560, 400], [560, 140], [800, 140], [800, 400], [930, 400])],
      waves: 5, base: 8, step: 2, gap: 1.0, speed: 1.05, kinds: ["trash", "snack", "water", "horn"], gold: 180, slots: 11, boss: [{ wave: 5, type: "storm", n: 1 }], tip: "最後一波有颱風魔王，記得把動物升級。" },
    { name: "夜間動物園", paths: [P([-30, 70], [820, 70], [820, 230], [140, 230], [140, 390], [820, 390], [820, 480], [930, 480])],
      waves: 6, base: 13, step: 3, gap: 0.85, speed: 1.1, kinds: ["bug", "snack", "trash", "horn"], gold: 190, slots: 11, night: true, tip: "天黑了，領角鴞的威力變大！" },
    { name: "雨林區", paths: [P([-30, 270], [130, 270], [130, 100], [330, 100], [330, 440], [530, 440], [530, 100], [730, 100], [730, 380], [930, 380])],
      waves: 6, base: 11, step: 3, gap: 0.9, speed: 1.1, kinds: ["bug", "water", "snack", "horn"], gold: 200, slots: 12, tip: "汙水被打到會分成兩個小水滴。" },
    { name: "兩條路", paths: [
        P([-30, 110], [420, 110], [420, 270], [930, 270]),
        P([-30, 430], [420, 430], [420, 270], [930, 270])],
      waves: 7, base: 10, step: 3, gap: 0.85, speed: 1.15, kinds: ["snack", "trash", "water", "bug", "horn"], gold: 220, slots: 12, tip: "敵人從兩個入口進來，塔放在交會處最好用。" },
    { name: "保育區", paths: [
        P([-30, 90], [300, 90], [300, 270], [930, 270]),
        P([-30, 450], [640, 450], [640, 270], [930, 270])],
      waves: 8, base: 11, step: 3, gap: 0.8, speed: 1.2, kinds: ["snack", "bug", "water", "horn", "trash"], gold: 240, slots: 12, night: true, tip: "又快又多，每隻動物都要升級。" },
    { name: "棲地消失", paths: [
        P([-30, 90], [240, 90], [240, 230], [560, 230], [560, 90], [800, 90], [800, 300], [930, 300]),
        P([-30, 450], [240, 450], [240, 330], [560, 330], [560, 450], [800, 450], [800, 300], [930, 300])],
      waves: 10, base: 8, step: 2, gap: 0.8, speed: 1.2, kinds: ["snack", "bug", "water", "horn", "trash"], gold: 260, slots: 13,
      boss: [{ wave: 5, type: "storm", n: 1 }, { wave: 10, type: "lost", n: 1 }], tip: "最後的魔王：棲地消失，大家一起守住動物的家！" },
  ];

  // ---- 路線工具 ----
  function mkPath(pts) {
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return { pts, cum, len: cum[cum.length - 1] };
  }
  function posAt(path, d) {
    const { pts, cum } = path;
    if (d <= 0) return { x: pts[0][0], y: pts[0][1], ang: 0 };
    for (let i = 1; i < pts.length; i++) {
      if (d <= cum[i]) {
        const t = (d - cum[i - 1]) / (cum[i] - cum[i - 1]);
        const dx = pts[i][0] - pts[i - 1][0], dy = pts[i][1] - pts[i - 1][1];
        return { x: pts[i - 1][0] + dx * t, y: pts[i - 1][1] + dy * t, ang: Math.atan2(dy, dx) };
      }
    }
    const e = pts[pts.length - 1];
    return { x: e[0], y: e[1], ang: 0 };
  }
  function segDist(px, py, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(px - (a[0] + dx * t), py - (a[1] + dy * t));
  }
  const distToPath = (x, y, path) => { let m = 1e9; for (let i = 1; i < path.pts.length; i++) m = Math.min(m, segDist(x, y, path.pts[i - 1], path.pts[i])); return m; };

  // 放塔格：沿路線兩側取候選點，離路線 48 以上，優先挑「附近路線最多」的位置，彼此至少隔 78
  function makeSlots(paths, count) {
    const cand = [];
    paths.forEach((p) => {
      for (let i = 1; i < p.pts.length; i++) {
        const a = p.pts[i - 1], b = p.pts[i];
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const nx = -(b[1] - a[1]) / len, ny = (b[0] - a[0]) / len;
        for (let d = 40; d < len - 20; d += 40) {
          const x = a[0] + ((b[0] - a[0]) * d) / len, y = a[1] + ((b[1] - a[1]) * d) / len;
          [-1, 1].forEach((s) => [62, 80].forEach((off) => cand.push([Math.round(x + nx * off * s), Math.round(y + ny * off * s)])));
        }
      }
    });
    const samples = [];
    paths.forEach((p) => { for (let d = 0; d < p.len; d += 24) { const q = posAt(p, d); samples.push([q.x, q.y]); } });
    const ok = cand.filter(([x, y]) => x > 40 && x < W - 40 && y > 66 && y < H - 40 && paths.every((p) => distToPath(x, y, p) >= 48));
    const score = (c) => samples.reduce((n, s) => n + (Math.hypot(s[0] - c[0], s[1] - c[1]) < 150 ? 1 : 0), 0);
    const scored = ok.map((c) => ({ c, s: score(c) })).sort((u, v) => v.s - u.s || u.c[0] - v.c[0] || u.c[1] - v.c[1]);
    const picked = [];
    for (const { c } of scored) {
      if (picked.every((q) => Math.hypot(q[0] - c[0], q[1] - c[1]) >= 78)) picked.push(c);
      if (picked.length >= count) break;
    }
    return picked;
  }

  // 每波出怪表：[{ t: 出場秒數, type, path }]。血量倍率 1.12^(波-1) × 1.07^(關-1)（魔王不吃波次倍率） 在 sim 裡乘上去
  function makeWaves(L, no) {
    const out = [];
    for (let w = 1; w <= L.waves; w++) {
      const total = L.base + (w - 1) * L.step;
      const active = L.kinds.filter((_, k) => k === 0 || w > k); // 後面的敵人隨波數慢慢加入
      const counts = active.map((_, k) => (k === 0 ? Math.ceil(total * (active.length === 1 ? 1 : 0.5)) : 0));
      let rest = total - counts[0];
      for (let k = 1; rest > 0; k = k % (active.length - 1) + 1) { counts[k]++; rest--; if (active.length === 1) break; }
      const list = [];
      active.forEach((type, k) => { for (let i = 0; i < counts[k]; i++) list.push(type); });
      // 把種類打散，不要同一種排成一長串
      const mixed = [];
      for (let i = 0; list.length; i++) mixed.push(list.splice((i * 7) % list.length, 1)[0]);
      const spawns = mixed.map((type, i) => ({ t: i * L.gap, type, path: i % L.paths.length }));
      (L.boss || []).filter((b) => b.wave === w).forEach((b) => { for (let i = 0; i < b.n; i++) spawns.push({ t: mixed.length * L.gap * 0.6 + i * 2, type: b.type, path: i % L.paths.length }); });
      spawns.sort((p, q) => p.t - q.t);
      out.push(spawns);
    }
    return out;
  }

  const LEVELS = RAW.map((L, i) => {
    const paths = L.paths.map(mkPath);
    return Object.assign({}, L, { no: i + 1, paths, slotsAt: makeSlots(paths, L.slots), waveList: makeWaves(L, i + 1), hearts: 20, hpMul: Math.pow(1.07, i) });
  });

  // 第幾關解鎖哪些塔（累積）
  const unlocked = (no) => TOWER_ORDER.slice(0, Math.min(TOWER_ORDER.length, no));

  G.DefLevels = { W, H, ENEMIES, TOWERS, TOWER_ORDER, TOWER_COST, LEVELS, unlocked, posAt, distToPath, WAVE_GROWTH: 1.12 };
})(globalThis);
