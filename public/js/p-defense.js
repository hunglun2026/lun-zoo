/* 動物園守護戰：外殼（選關、HUD、放塔選單、「這是什麼動物？」問答、結果畫面）。
   規則在 defense/sim.js，畫面在 defense/view.js，這裡只管介面與串接。
   網址 #m=3 直接開第 3 關（老師班級連結用）。 */
Zoo.boot(function (animals) {
  const { esc, el, shuffle } = Zoo;
  const D = DefLevels, S = DefSim;
  const root = document.getElementById("root");
  const pool = animals.filter((a) => a.thumb && !a.name_suspect);
  const thumbOf = (id) => { const a = animals.find((x) => x.id === id); return (a && a.thumb) || "/img/thumbs/" + id + ".webp"; };
  window.DefThumbs = {};
  D.TOWER_ORDER.forEach((k) => { window.DefThumbs[D.TOWERS[k].animal] = thumbOf(D.TOWERS[k].animal); });

  let sim = null, view = null, modal = null, userPaused = false, speed = 1, asked = [];
  const stars = (no) => (Progress.get().stars["defense-" + no] || 0);
  const isOpen = (no) => no <= 3 || stars(no - 1) > 0;

  // ---------- 選關 ----------
  function menu() {
    destroyGame();
    const total = D.LEVELS.reduce((n, L) => n + stars(L.no), 0);
    const box = el(
      '<div class="panel"><p class="lead zy" style="margin-top:0">動物是砲塔，把亂丟的垃圾和噪音擋在外面，守住動物的家！認出動物就能讓牠升級。</p>' +
      '<p class="zy df-sum">⭐ ' + total + " / " + D.LEVELS.length * 3 + '</p><div class="df-levels"></div></div>');
    const grid = box.querySelector(".df-levels");
    D.LEVELS.forEach((L) => {
      const open = isOpen(L.no), s = stars(L.no);
      const b = el('<button class="df-lv' + (open ? "" : " locked") + '"' + (open ? "" : " disabled") + '><b>' + L.no + '</b><span class="zy">' + esc(L.name) + "</span><i>" +
        (open ? "⭐".repeat(s) + "☆".repeat(3 - s) : "🔒") + "</i>" + (L.boss ? '<em class="zy">魔王</em>' : "") + "</button>");
      b.onclick = () => play(L.no);
      grid.appendChild(b);
    });
    root.replaceChildren(box);
  }

  // ---------- 遊戲畫面 ----------
  function destroyGame() {
    if (view) { view.destroy(); view = null; }
    sim = null; modal = null; userPaused = false;
    document.querySelectorAll(".df-layer").forEach((n) => n.remove());
  }

  async function play(no) {
    destroyGame();
    sim = S.create(no);
    const L = sim.L;
    const wrap = el(
      '<div class="df-wrap"><div class="df-hud">' +
      '<span class="chip" id="h-heart">❤️ ' + sim.hearts + '</span><span class="chip" id="h-gold">🪙 ' + sim.gold + '</span><span class="chip zy" id="h-wave">第 0 / ' + L.waves + ' 波</span>' +
      '<button class="btn" id="b-next">▶ 開始</button><button class="btn" id="b-spd" aria-label="加速">⏩ ×1</button><button class="btn" id="b-pause" aria-label="暫停">⏸</button><button class="btn" id="b-exit">離開</button></div>' +
      '<p class="df-rotate zy">📱 把手機橫過來玩，畫面更大，也更好點。</p><div class="df-stage" id="stage"><div class="df-banner" id="banner" aria-live="polite"></div><div class="df-toast" id="toast" role="status"></div></div>' +
      '<p class="df-tip zy" id="tip"></p></div>');
    root.replaceChildren(wrap);
    const stage = wrap.querySelector("#stage");
    const $ = (id) => wrap.querySelector("#" + id);
    $("tip").textContent = "第 " + no + " 關：" + L.name + "。" + L.tip;

    let tt = 0;
    const toast = (msg) => { const t = $("toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(tt); tt = setTimeout(() => t.classList.remove("on"), 1800); };
    const banner = (msg, cls) => { const b = $("banner"); b.textContent = msg; b.className = "df-banner on " + (cls || ""); clearTimeout(b._t); b._t = setTimeout(() => (b.className = "df-banner"), 1700); };

    const cache = {};
    const set = (id, v) => { if (cache[id] !== v) { cache[id] = v; $(id).textContent = v; } };
    const hooks = {
      speed: () => speed,
      holdPause: () => !!modal || userPaused,
      onSlot: (i) => { if (!sim.over && !modal) picker(i); },
      onTower: (t) => { if (!sim.over && !modal) tapTower(t); },
      onFrame: (s) => {
        set("h-heart", "❤️ " + s.hearts);
        set("h-gold", "🪙 " + s.gold);
        set("h-wave", "第 " + s.waveNo + " / " + s.L.waves + " 波");
        const canNext = !s.spawning && s.waveNo < s.L.waves;
        const nb = $("b-next");
        nb.hidden = !canNext;
        if (canNext) set("b-next", s.waveNo === 0 ? "▶ 開始" : "▶ 提早開始 +" + Math.max(0, Math.round(s.nextIn)) + "🪙");
      },
      onEvent: (e) => {
        if (e.k === "wave") banner(e.boss ? "魔王來了！第 " + e.n + " 波" : "第 " + e.n + " 波", e.boss ? "boss" : "");
        else if (e.k === "win") setTimeout(() => result(true, e.stars), 1000);
        else if (e.k === "lose") setTimeout(() => result(false, 0), 1000);
      },
    };
    view = await V().create(stage, sim, hooks);
    banner(L.name, "");
    window.Defense = { sim, view, S, stress: (n) => { for (let i = 0; i < n; i++) S.spawn(sim, "trash", i % L.paths.length, 40, -i * 4); } };

    $("b-next").onclick = () => S.startWave(sim, sim.waveNo > 0);
    $("b-spd").onclick = () => { speed = speed === 1 ? 2 : 1; $("b-spd").textContent = "⏩ ×" + speed; };
    $("b-pause").onclick = () => { userPaused = !userPaused; view.setPaused(userPaused); $("b-pause").textContent = userPaused ? "▶" : "⏸"; };
    $("b-exit").onclick = async () => {
      if (sim.over) return menu();
      view.setPaused(true);
      const ok = await Zoo.dialog("要離開這一關嗎？這一關的進度不會保留。", [{ label: "繼續玩", value: false }, { label: "離開", value: true, danger: true }]);
      if (ok) menu(); else if (!userPaused && !modal && view) view.setPaused(false);
    };

    // ----- 放塔選單 -----
    function picker(slot) {
      if (modal) return;
      closePicker();
      if (sim.gold < D.TOWER_COST) { Fx.wrong(); return toast("金幣不夠，先打敗幾隻敵人再來放動物"); }
      const types = D.unlocked(sim.no);
      const sheet = el('<div class="df-layer df-sheet" role="dialog" aria-label="選一隻動物來守衛"><div class="df-sheet-in"><p class="zy"><b>選一隻動物來守衛</b>　<small>每隻 🪙' + D.TOWER_COST + "</small></p><div class=\"df-picks\"></div>" +
        '<button class="btn" id="pk-x">取消</button></div></div>');
      const list = sheet.querySelector(".df-picks");
      types.forEach((k) => {
        const d = D.TOWERS[k];
        const b = el('<button class="df-pick"><img alt="" src="' + esc(thumbOf(d.animal)) + '" style="border-color:#' + d.color.toString(16).padStart(6, "0") + '"><b class="zy">' + esc(d.name) + '</b><small class="zy">' + esc(d.say) + "</small></button>");
        b.onclick = () => {
          closePicker();
          if (S.placeTower(sim, slot, k)) Fx.right();
          else { Fx.wrong(); toast("金幣不夠，先打敗幾隻敵人再來放動物"); }
        };
        list.appendChild(b);
      });
      sheet.querySelector("#pk-x").onclick = closePicker;
      sheet.addEventListener("click", (ev) => { if (ev.target === sheet) closePicker(); });
      document.body.appendChild(sheet);
    }
    const closePicker = () => document.querySelectorAll(".df-sheet").forEach((n) => n.remove());

    // ----- 點塔：能升級就問「這是什麼動物？」 -----
    function tapTower(t) {
      view.select(t);
      setTimeout(() => { if (view) view.select(null); }, 1800);
      if (t.lv >= S.MAX_LV) return toast(t.def.name + "已經是最高級了");
      if (t.stunT > 0) return toast("太吵了，" + t.def.name + "暫時聽不到");
      if (t.askCd > 0) return toast("先休息一下，" + Math.ceil(t.askCd) + " 秒後再試");
      ask(t);
    }
    function ask(t) {
      const q = makeQuestion();
      view.setPaused(true);
      const m = el(
        '<div class="df-layer df-modal" role="dialog" aria-modal="true"><div class="stage df-q"><p class="zy" style="margin:0 0 .3em"><b>' + esc(t.def.name) + "</b> 想升級：這是什麼動物？</p>" +
        '<div id="pic"></div><div class="spk-row" id="sr"></div><div class="opts" id="opts"></div><div class="feedback" id="fb" role="status" aria-live="polite"></div><div id="nx"></div></div></div>');
      m.querySelector("#pic").appendChild(Zoo.photo(q.animal));
      const opts = m.querySelector("#opts");
      q.options.forEach((a) => {
        const b = el('<button class="opt zy">' + esc(a.name) + "</button>");
        b.dataset.id = a.id;
        b.onclick = () => answer(a, b);
        opts.appendChild(b);
      });
      const items = () => [["這是什麼動物？", m.querySelector("p")]].concat([...opts.children].map((b, k) => ["第" + (k + 1) + "個，" + b.textContent, b]));
      m.querySelector("#sr").append(Speak.btn(items, "念題目和選項"));
      modal = m;
      document.body.appendChild(m);
      function answer(a, btn) {
        const ok = a.id === q.animal.id;
        opts.querySelectorAll(".opt").forEach((b) => { b.disabled = true; if (b.dataset.id === q.animal.id) b.classList.add("right"); });
        const fb = m.querySelector("#fb");
        if (ok) {
          Fx.right(); fb.className = "feedback ok"; fb.textContent = "答對了！" + t.def.name + "升級！";
          setTimeout(() => { close(); S.upgrade(sim, t); }, 900);
        } else {
          Fx.wrong(); btn.classList.add("wrong"); fb.className = "feedback no";
          fb.innerHTML = "這是 <b>" + esc(q.animal.name) + "</b>。" + esc(q.animal.groupInfo.name) + "：" + esc(q.animal.groupInfo.hint) + "。";
          S.penalize(sim, t, 6);
          const ok2 = el('<button class="btn primary big zy">知道了</button>');
          ok2.onclick = close;
          m.querySelector("#nx").appendChild(ok2); ok2.focus();
        }
      }
      function close() { m.remove(); modal = null; if (!userPaused && view) view.setPaused(false); }
    }

    // ----- 結果 -----
    function result(won, st) {
      if (!view) return;
      if (won) { Progress.stars("defense-" + no, st); if (st === 3) Fx.confetti(); }
      const next = no < D.LEVELS.length && won;
      const r = el(
        '<div class="df-layer df-modal"><div class="stage df-q"><h2 class="zy">' + (won ? (no === D.LEVELS.length ? "全部守住了！你是動物園守護者！" : "守住了！") : "動物的家被攻進來了") + "</h2>" +
        (won ? '<div class="stars" aria-label="' + st + ' 顆星">' + "⭐".repeat(st) + "☆".repeat(3 - st) + "</div>" : '<p class="zy">別灰心，把動物升級、多放幾隻再試一次。</p>') +
        '<p><button class="btn primary big zy" id="r-again">再玩一次</button> ' + (next ? '<button class="btn primary big zy" id="r-next">下一關 ➜</button> ' : "") +
        '<button class="btn big zy" id="r-menu">選關</button></p></div></div>');
      r.querySelector("#r-again").onclick = () => { r.remove(); play(no); };
      const n = r.querySelector("#r-next"); if (n) n.onclick = () => { r.remove(); play(no + 1); };
      r.querySelector("#r-menu").onclick = () => { r.remove(); menu(); };
      document.body.appendChild(r);
    }
  }

  const V = () => DefView;

  // ---------- 出題：看照片選名字 ----------
  function makeQuestion() {
    const fresh = pool.filter((a) => !asked.includes(a.id));
    const a = shuffle(fresh.length ? fresh : pool)[0];
    asked.push(a.id); if (asked.length > 40) asked.shift();
    const g = Zoo.grade();
    const others = shuffle(pool.filter((x) => x.id !== a.id && x.name !== a.name));
    const seen = new Set([a.name]);
    const uniq = (list) => list.filter((x) => (seen.has(x.name) ? false : (seen.add(x.name), true)));
    const same = uniq(others.filter((x) => x.group === a.group)), diff = uniq(others.filter((x) => x.group !== a.group));
    // 低年級：干擾項都是不同類別（容易）；高年級：都是同類別（要看清楚特徵）
    const d = g === "low" ? diff.slice(0, 3) : g === "high" ? same.slice(0, 3).concat(diff).slice(0, 3) : same.slice(0, 1).concat(diff).slice(0, 3);
    return { animal: a, options: shuffle([a].concat(d)) };
  }

  const direct = parseInt(Zoo.hashParams().m, 10);
  if (direct >= 1 && direct <= D.LEVELS.length) play(direct); else menu();
});
