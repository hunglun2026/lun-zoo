// 動物園守護戰：關卡資料檢查＋機器人難度模擬。node --experimental-strip-types scripts/test-defense.ts
// 機器人不碰畫面，直接用 sim.js 打完每一關：
//   遊玩者 = 放塔、約 8 秒後升到 2 級、約 20 秒後升到 3 級（模擬小朋友答題要時間）
//   不升級 = 一直放塔但從不答題
// 要求：遊玩者 10 關都過；不升級在魔王關（5、10）要輸；難度要隨關卡增加（總血量遞增）。
await import("../public/js/defense/levels.js");
await import("../public/js/defense/sim.js");
const D = (globalThis as any).DefLevels;
const S = (globalThis as any).DefSim;

let fails = 0;
const ok = (c: boolean, msg: string) => { if (!c) { fails++; console.error("FAIL", msg); } };

// ---- 資料檢查 ----
ok(D.LEVELS.length >= 10, "至少 10 關");
for (const L of D.LEVELS) {
  ok(L.slotsAt.length >= L.slots - 1, `第 ${L.no} 關放塔格數量 ${L.slotsAt.length}/${L.slots}`);
  for (const [x, y] of L.slotsAt) {
    const dmin = Math.min(...L.paths.map((p: any) => D.distToPath(x, y, p)));
    ok(dmin >= 48 && dmin <= 100, `第 ${L.no} 關放塔格 (${x},${y}) 離路線 ${dmin.toFixed(0)}`);
    ok(x > 0 && x < D.W && y > 0 && y < D.H, `第 ${L.no} 關放塔格超出畫面`);
  }
  ok(L.waveList.length === L.waves, `第 ${L.no} 關波數`);
  for (const w of L.waveList) for (const sp of w) {
    ok(!!D.ENEMIES[sp.type], `第 ${L.no} 關未知敵人 ${sp.type}`);
    ok(sp.path >= 0 && sp.path < L.paths.length, `第 ${L.no} 關路線編號`);
  }
}
ok(D.LEVELS[4].boss && D.LEVELS[9].boss, "第 5、10 關要有魔王");
ok(D.LEVELS[7].paths.length === 2 && D.LEVELS[9].paths.length === 2, "第 8 關起兩條路");
for (const k of D.TOWER_ORDER) ok(!!D.TOWERS[k], `塔 ${k}`);

// ---- 機器人 ----
type Mode = "遊玩者" | "不升級";
function play(no: number, mode: Mode) {
  const s = S.create(no);
  const types = D.unlocked(no);
  const order = s.L.slotsAt.map((_: any, i: number) => i);
  let nextType = 0;
  const born = new Map();
  for (let i = 0; i < 30 * 1500 && !s.over; i++) {
    // 放塔：有錢就放，種類輪流
    while (s.gold >= D.TOWER_COST && s.towers.length < order.length) {
      const slot = order[s.towers.length];
      const t = S.placeTower(s, slot, types[(types.length - 1 - (nextType++ % types.length))]);
      if (!t) break;
      born.set(t.id, s.t);
    }
    if (mode === "遊玩者") {
      for (const t of s.towers) {
        const age = s.t - born.get(t.id);
        if (t.lv === 1 && age > 8) S.upgrade(s, t);
        else if (t.lv === 2 && age > 20) S.upgrade(s, t);
      }
    }
    S.step(s, 1 / 30);
    s.events.length = 0;
  }
  return s;
}

let prevHp = 0;
console.log("關 | 遊玩者(愛心/星)   | 不升級(愛心)   | 該關總血量");
for (const L of D.LEVELS) {
  const a = play(L.no, "遊玩者"), b = play(L.no, "不升級");
  let hp = 0;
  L.waveList.forEach((w: any[], wi: number) => w.forEach((sp: any) => { hp += D.ENEMIES[sp.type].hp * (D.ENEMIES[sp.type].boss ? 1 : Math.pow(D.WAVE_GROWTH, wi)) * L.hpMul; }));
  console.log(`${String(L.no).padStart(2)} | ${a.won ? "過" : "敗"} ${String(a.hearts).padStart(2)}/${a.maxHearts} ★${a.won ? S.stars(a) : 0}      | ${b.won ? "過" : "敗"} ${String(b.hearts).padStart(2)}      | ${Math.round(hp)}`);
  ok(a.won, `第 ${L.no} 關遊玩者機器人應該過關`);
  if (L.boss) ok(!b.won || b.hearts < b.maxHearts, `第 ${L.no} 關魔王關不升級不該輕鬆過`);
  ok(hp > prevHp, `第 ${L.no} 關總血量要比上一關多`);
  prevHp = hp;
}

if (fails) { console.error(`\n${fails} 項失敗`); process.exit(1); }
console.log("\n守護戰測試全部通過");
