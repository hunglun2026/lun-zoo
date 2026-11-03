/* 動物園守護戰：Pixi 畫面層。只「讀」sim 的狀態來畫，規則都在 sim.js。
   DefView.create(host, sim, hooks) → { destroy, setPaused, select, stats }
   hooks：onSlot(slotIdx)、onTower(tower)  玩家點到放塔格或點到塔
   動畫全部用程式做（彈跳、壓扁拉長、受擊閃光、粒子、飄字、畫面微震），貼圖只有縮圖徽章與 emoji。 */
(function (G) {
  "use strict";
  const D = G.DefLevels;
  const REDUCED = !!(G.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const PARTICLES = REDUCED ? 0.3 : 1;
  const ease = { out: (t) => 1 - Math.pow(1 - t, 3), back: (t) => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); } };

  // ---- 貼圖工具 ----
  function canvasTex(w, h, draw) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    draw(c.getContext("2d"), w, h);
    return PIXI.Texture.from(c);
  }
  const emojiCache = {};
  function emojiTex(ch) {
    return emojiCache[ch] || (emojiCache[ch] = canvasTex(128, 128, (g, w, h) => {
      g.font = '96px "Noto Color Emoji","Segoe UI Emoji","Apple Color Emoji",sans-serif';
      g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText(ch, w / 2, h / 2 + 6);
    }));
  }
  const dotTex = () => emojiCache.__dot || (emojiCache.__dot = canvasTex(32, 32, (g) => {
    const r = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r; g.fillRect(0, 0, 32, 32);
  }));
  // 動物縮圖 → 圓形徽章（cover 裁切），載入失敗用顏色圈加 emoji
  function badgeTex(url, color, fallback) {
    return new Promise((res) => {
      const mk = (img) => canvasTex(160, 160, (g, w, h) => {
        g.save(); g.beginPath(); g.arc(80, 80, 70, 0, Math.PI * 2); g.clip();
        if (img) {
          const k = Math.max(140 / img.naturalWidth, 140 / img.naturalHeight);
          g.drawImage(img, 80 - (img.naturalWidth * k) / 2, 80 - (img.naturalHeight * k) / 2, img.naturalWidth * k, img.naturalHeight * k);
        } else { g.fillStyle = "#" + color.toString(16).padStart(6, "0"); g.fillRect(0, 0, w, h); g.font = "70px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(fallback, 80, 86); }
        g.restore();
        g.lineWidth = 9; g.strokeStyle = "#fff"; g.beginPath(); g.arc(80, 80, 70, 0, Math.PI * 2); g.stroke();
        g.lineWidth = 5; g.strokeStyle = "#" + color.toString(16).padStart(6, "0"); g.beginPath(); g.arc(80, 80, 76, 0, Math.PI * 2); g.stroke();
      });
      if (!url) return res(mk(null));
      const img = new Image();
      img.onload = () => res(mk(img));
      img.onerror = () => res(mk(null));
      img.src = url;
    });
  }

  async function create(host, sim, hooks) {
    const L = sim.L;
    const app = new PIXI.Application();
    await app.init({ width: D.W, height: D.H, backgroundAlpha: 0, antialias: true, resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true });
    app.canvas.className = "df-canvas";
    host.appendChild(app.canvas);

    const world = new PIXI.Container();
    app.stage.addChild(world);
    const layers = {};
    ["bg", "slots", "shadow", "enemies", "towers", "shots", "fx", "text"].forEach((k) => { layers[k] = new PIXI.Container(); world.addChild(layers[k]); });
    layers.text.eventMode = "none"; layers.shots.eventMode = "none"; layers.fx.eventMode = "none"; layers.enemies.eventMode = "none";

    // ---- 背景：草地、路、放塔格、動物之家 ----
    const bg = new PIXI.Graphics();
    bg.rect(0, 0, D.W, D.H).fill(L.night ? 0x1f3a2c : 0xa7d676);
    for (let i = 0; i < 60; i++) { // 草地的小色塊，讓畫面不死板（固定種子，每次一樣）
      const x = (i * 197) % D.W, y = (i * 311) % D.H;
      bg.circle(x, y, 18 + (i % 5) * 6).fill({ color: L.night ? 0x25452f : 0x98c967, alpha: 0.55 });
    }
    L.paths.forEach((p) => {
      const draw = (w, c) => { bg.moveTo(p.pts[0][0], p.pts[0][1]); p.pts.slice(1).forEach((q) => bg.lineTo(q[0], q[1])); bg.stroke({ width: w, color: c, cap: "round", join: "round" }); };
      draw(50, L.night ? 0x4a3a2a : 0xb98d54); draw(40, L.night ? 0x66523a : 0xe3c58d);
    });
    layers.bg.addChild(bg);
    const end = L.paths[0].pts[L.paths[0].pts.length - 1];
    const home = new PIXI.Sprite(emojiTex("🏡")); home.anchor.set(0.5); home.position.set(Math.min(end[0], D.W - 52) + 8, end[1] - 6); home.scale.set(0.8);
    layers.bg.addChild(home);
    if (L.night) { const v = new PIXI.Graphics(); v.rect(0, 0, D.W, D.H).fill({ color: 0x0a1030, alpha: 0.28 }); layers.fx.addChild(v); }

    // ---- 放塔格 ----
    const slotG = [];
    L.slotsAt.forEach((p, i) => {
      const g = new PIXI.Graphics();
      g.circle(0, 0, 30).fill({ color: 0xffffff, alpha: 0.35 }).stroke({ width: 4, color: 0xffffff, alpha: 0.9 });
      g.position.set(p[0], p[1]);
      g.eventMode = "static"; g.cursor = "pointer"; g.hitArea = new PIXI.Circle(0, 0, 40);
      g.on("pointertap", () => hooks.onSlot(i));
      const plus = new PIXI.Text({ text: "+", style: { fontSize: 34, fill: 0xffffff, fontWeight: "900" } });
      plus.anchor.set(0.5); g.addChild(plus);
      layers.slots.addChild(g); slotG[i] = g;
    });

    // ---- 塔的徽章貼圖（載入完才開始畫）----
    const badges = {};
    await Promise.all(D.unlocked(sim.no).map(async (k) => {
      const d = D.TOWERS[k];
      const url = (G.DefThumbs && G.DefThumbs[d.animal]) || "";
      badges[k] = await badgeTex(url, d.color, "🐾");
    }));

    // ---- 物件池 ----
    const pool = {};
    const take = (kind, make) => { const a = pool[kind] || (pool[kind] = []); return a.pop() || make(); };
    const give = (kind, o) => { o.visible = false; (pool[kind] || (pool[kind] = [])).push(o); };

    // 粒子（一律用同一張圓點貼圖）
    const parts = [];
    function burst(x, y, n, o) {
      n = Math.ceil(n * PARTICLES);
      for (let i = 0; i < n; i++) {
        const s = take("part", () => { const q = new PIXI.Sprite(dotTex()); q.anchor.set(0.5); layers.fx.addChild(q); return q; });
        const a = Math.random() * Math.PI * 2, sp = (o.speed || 120) * (0.4 + Math.random() * 0.8);
        s.visible = true; s.position.set(x, y); s.tint = o.colors ? o.colors[i % o.colors.length] : o.color; s.alpha = 1; s.blendMode = o.add ? "add" : "normal";
        s.scale.set((o.size || 0.5) * (0.6 + Math.random() * 0.8));
        parts.push({ s, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp + (o.up || 0), life: 0, max: (o.life || 0.5) * (0.7 + Math.random() * 0.6), g: o.g || 0, grow: o.grow || 0 });
      }
    }
    // 飄字
    const floats = [];
    function floatText(x, y, text, color, size) {
      if (floats.length > 14) return;
      const t = take("txt", () => { const q = new PIXI.Text({ text: "", style: { fontSize: 22, fontWeight: "900", fill: 0xffffff, stroke: { color: 0x23332b, width: 5 } } }); q.anchor.set(0.5); layers.text.addChild(q); return q; });
      t.text = text; t.style.fill = color; t.style.fontSize = size || 22; t.visible = true; t.alpha = 1; t.position.set(x, y); t.scale.set(0.4);
      floats.push({ t, life: 0, max: 0.9, y0: y });
    }
    // 衝擊圈
    const rings = [];
    function ring(x, y, r, color, dur) {
      const g = take("ring", () => { const q = new PIXI.Graphics(); layers.fx.addChild(q); return q; });
      g.visible = true; g.clear(); g.circle(0, 0, 10).stroke({ width: 6, color }); g.position.set(x, y); g.alpha = 1; g.scale.set(0.2);
      rings.push({ g, life: 0, max: dur || 0.4, r: r / 10 });
    }

    // ---- 敵人 ----
    const eView = new Map();
    function makeEnemy() {
      const c = new PIXI.Container();
      const shadow = new PIXI.Graphics(); shadow.ellipse(0, 0, 18, 7).fill({ color: 0x000000, alpha: 0.28 });
      const body = new PIXI.Sprite(); body.anchor.set(0.5, 0.78);
      const bar = new PIXI.Graphics();
      c.addChild(shadow, body, bar);
      layers.enemies.addChild(c);
      return { c, shadow, body, bar };
    }
    function addEnemy(e) {
      const v = take("enemy", makeEnemy);
      const sz = e.def.size;
      v.body.texture = emojiTex(e.def.emoji); v.body.width = v.body.height = sz * 1.15; v.base = v.body.scale.x;
      v.shadow.scale.set(sz / 40); v.c.visible = true; v.c.alpha = 1; v.c.scale.set(0.3); v.born = 0; v.dying = 0; v.phase = Math.random() * 6;
      v.body.tint = 0xffffff; v.sz = sz; v.e = e;
      eView.set(e.id, v);
      if (e.def.boss) shake(10, 0.6);
    }
    function drawBar(v, e) {
      const w = Math.max(30, v.sz * 0.9), r = Math.max(0, e.hp / e.maxHp);
      v.bar.clear();
      if (r >= 1) return;
      v.bar.roundRect(-w / 2, -v.sz * 0.85, w, 6, 3).fill({ color: 0x23332b, alpha: 0.7 });
      v.bar.roundRect(-w / 2 + 1, -v.sz * 0.85 + 1, (w - 2) * r, 4, 2).fill(r > 0.5 ? 0x4ccf6e : r > 0.25 ? 0xf2c230 : 0xe8473a);
    }

    // ---- 塔 ----
    const tView = new Map();
    let selected = null;
    function addTower(t) {
      const c = new PIXI.Container(); c.position.set(t.x, t.y);
      const rangeG = new PIXI.Graphics(); rangeG.visible = false;
      const base = new PIXI.Graphics(); base.ellipse(0, 24, 30, 10).fill({ color: 0x000000, alpha: 0.25 });
      const spr = new PIXI.Sprite(badges[t.type]); spr.anchor.set(0.5); spr.width = spr.height = 62;
      const lv = new PIXI.Text({ text: "★", style: { fontSize: 18, fill: 0xffd23c, fontWeight: "900", stroke: { color: 0x23332b, width: 4 } } }); lv.anchor.set(0.5); lv.position.set(0, 36);
      const ask = new PIXI.Text({ text: "?", style: { fontSize: 22, fill: 0xffffff, fontWeight: "900" } }); ask.anchor.set(0.5);
      const bub = new PIXI.Container(); const bg2 = new PIXI.Graphics(); bg2.circle(0, 0, 15).fill(0xe8873a).stroke({ width: 3, color: 0xffffff }); bub.addChild(bg2, ask); bub.position.set(26, -30);
      const mute = new PIXI.Text({ text: "🔇", style: { fontSize: 26 } }); mute.anchor.set(0.5); mute.position.set(0, -34); mute.visible = false;
      c.addChild(rangeG, base, spr, lv, bub, mute);
      c.eventMode = "static"; c.cursor = "pointer"; c.hitArea = new PIXI.Circle(0, 0, 42);
      c.on("pointertap", () => hooks.onTower(t));
      layers.towers.addChild(c);
      const v = { c, rangeG, spr, lv, bub, mute, kick: 0, pop: 1, t, born: 0 };
      tView.set(t.id, v);
      c.scale.set(0.2);
      slotG[t.slot].visible = false;
      ring(t.x, t.y, 50, t.def.color, 0.4);
      burst(t.x, t.y, 12, { colors: [0xffffff, t.def.color], speed: 150, life: 0.5, size: 0.5, g: 200 });
    }
    function refreshRange(v) {
      v.rangeG.clear();
      v.rangeG.circle(0, 0, G.DefSim.towerRange(v.t)).fill({ color: v.t.def.color, alpha: 0.12 }).stroke({ width: 3, color: v.t.def.color, alpha: 0.6 });
    }
    function select(t) {
      selected = t;
      tView.forEach((v) => { v.rangeG.visible = !!t && v.t === t; if (v.rangeG.visible) refreshRange(v); });
    }

    // ---- 子彈 ----
    const sView = new Map();
    function addShot(sh) {
      const s = take("shot", () => { const q = new PIXI.Sprite(dotTex()); q.anchor.set(0.5); layers.shots.addChild(q); return q; });
      s.visible = true; s.tint = sh.t.def.color; s.scale.set(sh.t.type === "elephant" ? 0.9 : 0.7); s.blendMode = "add";
      s.position.set(sh.x, sh.y);
      sView.set(sh.id, { s, sh, trail: 0 });
    }

    // 畫面微震
    let shakeAmp = 0, shakeT = 0;
    function shake(a, t) { if (REDUCED) return; shakeAmp = Math.max(shakeAmp, a); shakeT = Math.max(shakeT, t); }

    // 金幣飛向左上角
    const coins = [];
    function coinFly(x, y) {
      if (coins.length > 12) return;
      const s = take("coin", () => { const q = new PIXI.Sprite(emojiTex("🪙")); q.anchor.set(0.5); q.width = q.height = 26; layers.text.addChild(q); return q; });
      s.visible = true; s.alpha = 1; s.position.set(x, y);
      coins.push({ s, x0: x, y0: y, life: 0, max: 0.7 + Math.random() * 0.2 });
    }

    function handleEvents() {
      const evs = sim.events; sim.events = [];
      for (const e of evs) {
        if (hooks.onEvent) hooks.onEvent(e); // 輸贏、波次、獎勵金幣等交給外殼處理
        switch (e.k) {
          case "spawn": addEnemy(e.e); break;
          case "place": addTower(e.t); break;
          case "fire": { const v = tView.get(e.t.id); if (v) v.kick = 1; addShot(e.shot); break; }
          case "hit": {
            const v = eView.get(e.e.id);
            if (v) { v.hitT = 0.12; v.pop = 1; drawBar(v, e.e); }
            burst(e.e.x, e.e.y - 8, 4, { color: e.by ? e.by.def.color : 0xffffff, speed: 110, life: 0.35, size: 0.4, g: 160 });
            if (e.amt >= 18 || e.e.def.boss) floatText(e.e.x, e.e.y - 26, String(Math.round(e.amt)), 0xffffff, 18);
            break;
          }
          case "splash": ring(e.x, e.y, e.r, 0x6ec6ff, 0.45); burst(e.x, e.y, 14, { colors: [0x6ec6ff, 0xffffff], speed: 140, life: 0.45, size: 0.5, g: 220 }); break;
          case "fizzle": burst(e.x, e.y, 3, { color: 0xffffff, speed: 60, life: 0.25, size: 0.3 }); break;
          case "die": {
            const v = eView.get(e.e.id);
            if (v) v.dying = 0.01;
            burst(e.e.x, e.e.y, e.e.def.boss ? 40 : 10, { colors: [0xffe27a, 0xffffff, 0xff9a3c], speed: e.e.def.boss ? 260 : 150, life: 0.6, size: 0.55, up: -60, g: 260, add: true });
            floatText(e.e.x, e.e.y - 20, "+" + e.reward, 0xffe27a, e.e.def.boss ? 30 : 22);
            for (let i = 0; i < Math.min(3, 1 + (e.reward / 10) | 0); i++) coinFly(e.e.x + (Math.random() - 0.5) * 20, e.e.y);
            if (e.e.def.boss) shake(14, 0.7);
            break;
          }
          case "leak": {
            const v = eView.get(e.e.id);
            if (v) v.dying = 0.01;
            shake(8, 0.3); ring(e.e.x, e.e.y, 70, 0xe8473a, 0.5);
            floatText(e.e.x - 30, e.e.y - 20, "-" + e.e.def.dmg + " ❤", 0xff6a5c, 26);
            break;
          }
          case "upgrade": {
            const v = tView.get(e.t.id);
            if (v) { v.pop = 1.5; v.born = 0; }
            ring(e.t.x, e.t.y, 90, 0xffd23c, 0.6);
            burst(e.t.x, e.t.y, 26, { colors: [0xffd23c, 0xffffff, e.t.def.color], speed: 220, life: 0.8, size: 0.6, up: -80, g: 260, add: true });
            floatText(e.t.x, e.t.y - 50, "升級 Lv." + e.t.lv, 0xffd23c, 26);
            if (selected === e.t) select(e.t);
            break;
          }
          case "noise": ring(e.x, e.y, 110, 0x9aa0a6, 0.5); break;
          case "wave": if (e.boss) shake(6, 0.4); break;
          default: break;
        }
      }
    }

    // ---- 每一格更新 ----
    let paused = false, accFps = 0, nFps = 0, last = 0, time = 0;
    function frame(ticker) {
      const dtRaw = Math.min(ticker.deltaMS / 1000, 0.05);
      const dt = paused ? 0 : dtRaw;
      if (!paused && !sim.over) {
        const steps = hooks.speed ? hooks.speed() : 1;
        for (let i = 0; i < steps; i++) G.DefSim.step(sim, dtRaw);
      }
      time += dtRaw;
      accFps += 1 / Math.max(dtRaw, 0.001); nFps++;
      handleEvents();

      // 敵人
      eView.forEach((v, id) => {
        const e = v.e;
        if (v.dying) {
          v.dying += dtRaw;
          const k = Math.min(1, v.dying / 0.28);
          v.c.scale.set(Math.max(0.01, 1 - ease.out(k)) * 1.1); v.c.alpha = 1 - k; v.c.rotation = k * 1.2;
          if (k >= 1) { v.c.rotation = 0; v.c.visible = false; (pool.enemy || (pool.enemy = [])).push(v); eView.delete(id); }
          return;
        }
        v.born = Math.min(1, v.born + dtRaw * 4);
        const grow = ease.back(v.born);
        const moving = e.stunT <= 0;
        v.phase += dtRaw * (e.speed / 40) * (moving ? 1 : 0.2);
        const bob = Math.abs(Math.sin(v.phase * 2)), sq = Math.sin(v.phase * 2) * 0.07;
        v.c.position.set(e.x, e.y);
        v.c.scale.set(grow);
        v.body.y = -bob * (e.def.boss ? 4 : 7);
        v.body.rotation = Math.sin(v.phase) * (e.def.boss ? 0.06 : 0.14);
        const k = v.base * (v.pop > 0 ? 1 + v.pop * 0.18 : 1);
        v.body.scale.set(k * (1 + sq), k * (1 - sq));
        if (v.pop > 0) v.pop = Math.max(0, v.pop - dtRaw * 8);
        v.hitT = Math.max(0, (v.hitT || 0) - dtRaw);
        v.body.tint = v.hitT > 0 ? 0xff7a6a : e.slowT > 0 ? 0x9fd8ff : e.stunT > 0 ? 0xffe27a : 0xffffff;
        v.shadow.alpha = 1 - bob * 0.3;
        if (e.def.boss) v.body.rotation += Math.sin(time * 6) * 0.04;
      });
      // 塔
      tView.forEach((v) => {
        const t = v.t;
        v.born = Math.min(1, v.born + dtRaw * 3.2);
        const kick = v.kick > 0 ? (v.kick = Math.max(0, v.kick - dtRaw * 7)) : 0;
        const base = v.pop > 1 ? (v.pop = Math.max(1, v.pop - dtRaw * 2.2)) : 1;
        const idle = 1 + Math.sin(time * 3 + t.id) * 0.025;
        v.c.scale.set(ease.back(v.born) * base * idle * (1 - kick * 0.14));
        v.spr.rotation = Math.sin(time * 2 + t.id) * 0.04 + (kick ? Math.sin(kick * 20) * 0.12 : 0);
        v.lv.text = "★".repeat(t.lv);
        const canAsk = t.lv < G.DefSim.MAX_LV && t.askCd <= 0;
        v.bub.visible = canAsk && !(t.stunT > 0);
        v.bub.scale.set(1 + Math.sin(time * 6) * 0.1);
        v.mute.visible = t.stunT > 0;
        v.spr.alpha = t.stunT > 0 ? 0.6 : 1;
      });
      // 子彈
      sView.forEach((q, id) => {
        const sh = q.sh;
        q.s.position.set(sh.x, sh.y);
        q.trail += dtRaw;
        if (q.trail > 0.03) { q.trail = 0; burst(sh.x, sh.y, 1, { color: sh.t.def.color, speed: 8, life: 0.22, size: 0.35, add: true }); }
        if (sh.dead) { give("shot", q.s); sView.delete(id); }
      });
      // 粒子
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]; p.life += dtRaw;
        if (p.life >= p.max) { give("part", p.s); parts.splice(i, 1); continue; }
        p.vy += p.g * dtRaw; p.s.x += p.vx * dtRaw; p.s.y += p.vy * dtRaw;
        const k = p.life / p.max; p.s.alpha = 1 - k * k; if (p.grow) p.s.scale.set(p.s.scale.x + p.grow * dtRaw);
      }
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i]; r.life += dtRaw; const k = r.life / r.max;
        if (k >= 1) { give("ring", r.g); rings.splice(i, 1); continue; }
        r.g.scale.set(0.2 + ease.out(k) * r.r); r.g.alpha = 1 - k;
      }
      for (let i = floats.length - 1; i >= 0; i--) {
        const f = floats[i]; f.life += dtRaw; const k = f.life / f.max;
        if (k >= 1) { give("txt", f.t); floats.splice(i, 1); continue; }
        f.t.y = f.y0 - ease.out(k) * 38; f.t.scale.set(Math.min(1, ease.back(Math.min(1, k * 3)))); f.t.alpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      }
      for (let i = coins.length - 1; i >= 0; i--) {
        const c = coins[i]; c.life += dtRaw; const k = c.life / c.max;
        if (k >= 1) { give("coin", c.s); coins.splice(i, 1); continue; }
        const e2 = k * k; c.s.x = c.x0 + (60 - c.x0) * e2; c.s.y = c.y0 + (-10 - c.y0) * e2 - Math.sin(k * Math.PI) * 40; c.s.alpha = k > 0.85 ? (1 - k) / 0.15 : 1;
      }
      slotG.forEach((g, i) => { if (g.visible) { const s = 1 + Math.sin(time * 3 + i) * 0.05; g.scale.set(s); } });
      // 畫面微震
      if (shakeT > 0) { shakeT -= dtRaw; world.position.set((Math.random() - 0.5) * shakeAmp, (Math.random() - 0.5) * shakeAmp); if (shakeT <= 0) { shakeAmp = 0; world.position.set(0, 0); } }
      if (hooks.onFrame) hooks.onFrame(sim);
    }
    app.ticker.add(frame);
    const onVis = () => { if (document.hidden) paused = true; else if (!hooks.holdPause || !hooks.holdPause()) paused = false; };
    document.addEventListener("visibilitychange", onVis);

    return {
      setPaused(v) { paused = v; },
      select,
      freeSlot(i) { if (slotG[i]) slotG[i].visible = true; },
      stats() { return { fps: nFps ? accFps / nFps : 0, enemies: eView.size, parts: parts.length }; },
      resetStats() { accFps = 0; nFps = 0; },
      destroy() { document.removeEventListener("visibilitychange", onVis); app.destroy(true, { children: true }); },
      app,
    };
  }

  G.DefView = { create };
})(window);
