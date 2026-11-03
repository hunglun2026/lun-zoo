/* 動物園守護戰：遊戲規則核心。只算數字，不碰 DOM 與 Pixi（node 能直接跑，難度模擬測試用）。
   用法：const s = DefSim.create(關卡編號); 每一格 DefSim.step(s, dt); 畫面讀 s 的內容，
   發生的事會丟進 s.events（畫面讀完要清空）。 */
(function (G) {
  "use strict";
  const D = G.DefLevels;
  const MAX_LV = 3;
  const PROJ_SPEED = 560;
  const NEXT_WAVE_SEC = 7;

  function create(no) {
    const L = D.LEVELS[no - 1];
    return {
      no, L, t: 0, gold: L.gold, hearts: L.hearts, maxHearts: L.hearts,
      waveNo: 0,              // 已經出了第幾波（0 = 還沒開始）
      spawning: null,         // { list, t }
      nextIn: 3,              // 距離下一波秒數
      enemies: [], towers: [], shots: [], events: [],
      uid: 1, over: false, won: false, kills: 0, leaks: 0,
    };
  }

  const ev = (s, e) => s.events.push(e);

  function startWave(s, early) {
    if (s.over || s.spawning || s.waveNo >= s.L.waves) return false;
    if (early) { const bonus = Math.round(s.nextIn); if (bonus > 0) { s.gold += bonus; ev(s, { k: "bonus", amt: bonus }); } }
    s.spawning = { list: s.L.waveList[s.waveNo].slice(), t: 0 };
    s.waveNo++;
    s.nextIn = 0;
    const boss = (s.L.boss || []).some((b) => b.wave === s.waveNo);
    ev(s, { k: "wave", n: s.waveNo, total: s.L.waves, boss });
    return true;
  }

  function spawnEnemy(s, type, pathIdx, hpScale, atD, speedMul) {
    const def = D.ENEMIES[type];
    const wave = Math.max(1, s.waveNo);
    const grow = def.boss ? 1 : Math.pow(D.WAVE_GROWTH, wave - 1);
    const hp = Math.round(def.hp * grow * s.L.hpMul * (hpScale || 1));
    const e = {
      id: s.uid++, type, def, path: s.L.paths[pathIdx], pathIdx, d: atD || 0, hp, maxHp: hp,
      speed: def.speed * s.L.speed * (speedMul || 1), slowT: 0, slowMul: 1, stunT: 0, noiseT: 2, x: 0, y: 0, ang: 0, dead: false, hit: 0,
    };
    const p = D.posAt(e.path, e.d); e.x = p.x; e.y = p.y; e.ang = p.ang;
    s.enemies.push(e);
    ev(s, { k: "spawn", e });
    return e;
  }

  const towerDmg = (s, t) => t.def.dmg * Math.pow(1.5, t.lv - 1) * (t.def.night && s.L.night ? t.def.night : 1);
  const towerRange = (t) => t.def.range * Math.pow(1.1, t.lv - 1);

  function placeTower(s, slot, type) {
    if (s.over || s.gold < D.TOWER_COST || s.towers.some((t) => t.slot === slot)) return null;
    if (!D.unlocked(s.no).includes(type)) return null;
    s.gold -= D.TOWER_COST;
    const [x, y] = s.L.slotsAt[slot];
    const t = { id: s.uid++, slot, type, def: D.TOWERS[type], x, y, lv: 1, cd: 0.3, askCd: 0, stunT: 0 };
    s.towers.push(t);
    ev(s, { k: "place", t });
    return t;
  }

  // 答對才呼叫：升一級
  function upgrade(s, t) {
    if (t.lv >= MAX_LV) return false;
    t.lv++;
    ev(s, { k: "upgrade", t });
    return true;
  }
  // 答錯：這座塔冷卻幾秒才能再被問
  function penalize(s, t, sec) { t.askCd = sec == null ? 6 : sec; }

  function inRange(t, e) { return Math.hypot(e.x - t.x, e.y - t.y) <= towerRange(t); }

  function damage(s, e, amt, by) {
    if (e.dead) return;
    e.hp -= amt; e.hit = 0.12;
    ev(s, { k: "hit", e, amt, by });
    if (e.hp <= 0) kill(s, e);
  }
  function kill(s, e) {
    e.dead = true; s.kills++;
    s.gold += e.def.reward;
    ev(s, { k: "die", e, reward: e.def.reward });
    if (e.def.split) {
      for (let i = 0; i < e.def.split; i++) {
        const m = spawnEnemy(s, "mini", e.pathIdx, 1, Math.max(0, e.d - 14 * i), 1 + 0.08 * i);
        m.maxHp = m.hp = Math.round(e.maxHp * 0.4);
      }
    }
  }

  function step(s, dtRaw) {
    if (s.over) return;
    const dt = Math.min(dtRaw, 0.05);
    s.t += dt;

    // 波次
    if (s.spawning) {
      s.spawning.t += dt;
      const sp = s.spawning;
      while (sp.list.length && sp.list[0].t <= sp.t) { const q = sp.list.shift(); spawnEnemy(s, q.type, q.path); }
      if (!sp.list.length) { s.spawning = null; s.nextIn = s.waveNo < s.L.waves ? NEXT_WAVE_SEC : 0; }
    } else if (s.waveNo < s.L.waves) {
      s.nextIn -= dt;
      if (s.nextIn <= 0) startWave(s, false);
    }

    // 敵人移動
    for (const e of s.enemies) {
      if (e.dead) continue;
      if (e.hit > 0) e.hit -= dt;
      if (e.slowT > 0) e.slowT -= dt;
      if (e.stunT > 0) { e.stunT -= dt; } else {
        e.d += e.speed * (e.slowT > 0 ? e.slowMul : 1) * dt;
      }
      if (e.def.noise) {
        e.noiseT -= dt;
        if (e.noiseT <= 0) {
          e.noiseT = 3.2;
          for (const t of s.towers) if (Math.hypot(t.x - e.x, t.y - e.y) < 110) { t.stunT = 1.5; }
          ev(s, { k: "noise", x: e.x, y: e.y });
        }
      }
      if (e.d >= e.path.len) {
        e.dead = true; s.leaks++;
        s.hearts = Math.max(0, s.hearts - e.def.dmg);
        ev(s, { k: "leak", e });
        continue;
      }
      const p = D.posAt(e.path, e.d); e.x = p.x; e.y = p.y; e.ang = p.ang;
    }

    // 塔瞄準與開火：打離終點最近（走最遠）的敵人
    for (const t of s.towers) {
      if (t.askCd > 0) t.askCd -= dt;
      if (t.stunT > 0) { t.stunT -= dt; continue; }
      t.cd -= dt;
      if (t.cd > 0) continue;
      let best = null;
      for (const e of s.enemies) if (!e.dead && inRange(t, e) && (!best || e.d > best.d)) best = e;
      if (!best) { t.cd = 0; continue; }
      t.cd = t.def.rate;
      const sh = { id: s.uid++, x: t.x, y: t.y, tid: best.id, tx: best.x, ty: best.y, dmg: towerDmg(s, t), t, dead: false };
      s.shots.push(sh);
      ev(s, { k: "fire", t, shot: sh });
    }

    // 子彈
    for (const sh of s.shots) {
      const tgt = s.enemies.find((e) => e.id === sh.tid && !e.dead);
      if (tgt) { sh.tx = tgt.x; sh.ty = tgt.y; }
      const dx = sh.tx - sh.x, dy = sh.ty - sh.y, dist = Math.hypot(dx, dy), mv = PROJ_SPEED * dt;
      if (dist <= mv + 4) {
        sh.dead = true;
        if (tgt) hitTarget(s, sh, tgt); else ev(s, { k: "fizzle", x: sh.tx, y: sh.ty });
      } else { sh.x += (dx / dist) * mv; sh.y += (dy / dist) * mv; }
    }

    s.enemies = s.enemies.filter((e) => !e.dead);
    s.shots = s.shots.filter((q) => !q.dead);

    if (s.hearts <= 0) { s.over = true; s.won = false; ev(s, { k: "lose" }); }
    else if (s.waveNo >= s.L.waves && !s.spawning && !s.enemies.length) { s.over = true; s.won = true; ev(s, { k: "win", stars: stars(s) }); }
  }

  function hitTarget(s, sh, tgt) {
    const d = sh.t.def;
    if (d.splash) {
      ev(s, { k: "splash", x: tgt.x, y: tgt.y, r: d.splash });
      for (const e of s.enemies.slice()) if (!e.dead && Math.hypot(e.x - tgt.x, e.y - tgt.y) <= d.splash) damage(s, e, sh.dmg * (e === tgt ? 1 : 0.7), sh.t);
    } else damage(s, tgt, sh.dmg, sh.t);
    if (!tgt.dead) {
      if (d.slow) { tgt.slowT = 1.6; tgt.slowMul = 1 - d.slow; }
      if (d.stun && !tgt.def.boss) tgt.stunT = Math.max(tgt.stunT, d.stun);
    }
  }

  // 星星：愛心剩多少
  function stars(s) {
    const r = s.hearts / s.maxHearts;
    return r >= 0.9 ? 3 : r >= 0.5 ? 2 : 1;
  }

  G.DefSim = { create, step, startWave, placeTower, upgrade, penalize, stars, towerDmg, towerRange, spawn: spawnEnemy, MAX_LV, NEXT_WAVE_SEC };
})(globalThis);
