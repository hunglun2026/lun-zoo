/* 動物探險家：共用資料層。所有頁面都先載入這支，再各自畫畫面。
   負責：抓資料並快取、棲地／食性／類別分類規則、圖片備援、小工具。 */
(function () {
  "use strict";

  // ---- 類別（綱 → 國小看得懂的群）----
  const GROUPS = [
    { id: "mammal", name: "哺乳類", emoji: "🐘", color: "#e07a3f", hint: "身上有毛，寶寶喝媽媽的奶" },
    { id: "bird", name: "鳥類", emoji: "🦜", color: "#3a8fd9", hint: "有羽毛，會下蛋" },
    { id: "reptile", name: "爬蟲類", emoji: "🐊", color: "#5a9e4b", hint: "皮膚有鱗片或硬殼，用肺呼吸" },
    { id: "amphibian", name: "兩棲類", emoji: "🐸", color: "#2fb5a0", hint: "小時候住水裡，長大可以到陸地" },
    { id: "fish", name: "魚類", emoji: "🐟", color: "#2b6fb5", hint: "住在水裡，用鰓呼吸" },
    { id: "insect", name: "昆蟲與蜘蛛", emoji: "🦋", color: "#b0558f", hint: "身體分節，沒有骨頭" },
  ];
  const CLASS_TO_GROUP = {
    哺乳綱: "mammal", 鳥綱: "bird", 爬蟲綱: "reptile", 兩棲綱: "amphibian",
    硬骨魚綱: "fish", 軟骨魚綱: "fish", 昆蟲綱: "insect", 蛛形綱: "insect", 唇足綱: "insect",
  };

  // ---- 棲地（優先順序由上到下，先符合的當「主要棲地」）----
  const HABITATS = [
    { id: "desert", name: "沙漠", emoji: "🏜️", re: /沙漠|荒漠|沙地|乾旱/ },
    { id: "polar", name: "極地冰原", emoji: "🧊", re: /極地|冰原|冰川|南極|北極|寒帶|冰雪/ },
    { id: "sea", name: "海洋", emoji: "🌊", re: /海洋|海域|沿海|沿岸|海岸|珊瑚|淺海|深海|海水|海中|潮間/ },
    { id: "mountain", name: "高山岩地", emoji: "⛰️", re: /高山|山地|山區|岩石|岩壁|峭壁|洞穴|山脈/ },
    { id: "water", name: "河流湖泊濕地", emoji: "🏞️", re: /河|湖|溪|池|沼澤|濕地|溼地|水域|淡水|水塘|紅樹林|草澤|水田|泥灘/ },
    { id: "grass", name: "草原", emoji: "🌾", re: /草原|草地|稀樹|莽原|平原|灌木|農田|旱地/ },
    { id: "forest", name: "森林", emoji: "🌳", re: /森林|雨林|叢林|樹林|林地|竹林|林/ },
  ];

  // ---- 保育等級（IUCN 紅色名錄）----
  const CONS = {
    EW: { name: "野外滅絕", color: "#6b2d5c", rank: 8 },
    CR: { name: "極危", color: "#c8341f", rank: 7 },
    EN: { name: "瀕危", color: "#e0742a", rank: 6 },
    VU: { name: "易危", color: "#d9a520", rank: 5 },
    NT: { name: "近危", color: "#8aa83a", rank: 4 },
    LC: { name: "暫無危機", color: "#3f9c5a", rank: 3 },
    DD: { name: "資料不足", color: "#8a8f98", rank: 2 },
    NE: { name: "未評估", color: "#8a8f98", rank: 1 },
    "": { name: "未列等級", color: "#a0a6ae", rank: 0 },
  };
  const DIETS = {
    plant: { name: "吃植物", emoji: "🌿" },
    meat: { name: "吃肉", emoji: "🍖" },
    omni: { name: "什麼都吃", emoji: "🍽️" },
  };

  const PLANT_RE = /果|葉|草|種子|花|嫩|根|竹|堅果|植物|蜜|藻|樹皮|穀|菜|芽|莖/;
  const ANIMAL_RE = /魚|蟲|肉|鳥|蛙|哺乳|蛋|蜘蛛|甲殼|鼠|動物|蝦|蟹|蛇|蜥|蠕|腐|蝸|貝|屍/;

  // 原文最先提到的棲地當主要棲地（作者通常先寫主要的）；位置相同才看 HABITATS 的順序
  function pickHabitat(text) {
    const t = (text || "").replace(/海拔/g, ""); // 「海拔」不是海洋
    let best = null, bestAt = Infinity;
    for (const h of HABITATS) {
      const m = h.re.exec(t);
      if (m && m.index < bestAt) { best = h; bestAt = m.index; }
    }
    return best;
  }
  function pickDiet(text) {
    const t = text || "";
    if (!t.trim()) return null;
    if (/雜食/.test(t)) return "omni";
    if (/草食|植食|素食/.test(t) && !/肉食/.test(t)) return "plant";
    if (/肉食|食肉/.test(t) && !/草食/.test(t)) return "meat";
    const p = PLANT_RE.test(t), a = ANIMAL_RE.test(t);
    if (p && a) return "omni";
    if (p) return "plant";
    if (a) return "meat";
    return null;
  }

  const clean = (s) => (s || "").replace(/\r/g, "").replace(/[ 　]+/g, " ").trim();
  const trimTo = (t, max) => {
    const m = t.match(/^[^。！!]*[。！!]?/);
    const out = (m ? m[0] : t).trim();
    return out.length > max ? out.slice(0, max) + "…" : out;
  };
  const noParen = (s) => s.replace(/[（(][^）)]*[）)]/g, "");
  const firstSentence = (s, max) => trimTo(noParen(clean(s)).replace(/^\d+[、.．]\s*/, "").split(/\n/)[0], max);
  // 特徵欄常是一長串數字（體重、體長），低年級讀不懂：優先挑「沒有數字」的句子
  function bestLine(s, max) {
    const lines = noParen(clean(s)).split(/\n/).map((l) => l.replace(/^\s*\d+[、.．]\s*/, "").trim()).filter(Boolean);
    return trimTo(lines.find((l) => !/\d/.test(l) && l.length >= 6) || lines[0] || "", max);
  }
  // 線索文字常含動物自己的名字，遮起來，不然一眼就破題
  function mask(a, text) {
    const names = new Set([a.nameClean, a.name_en].filter(Boolean));
    (a.also_known || "").split(/[、，,；;]/).forEach((n) => n.trim().length >= 2 && names.add(n.trim()));
    if (a.nameClean.length >= 4) names.add(a.nameClean.slice(-3)); // 例：鈷藍箭毒蛙 → 箭毒蛙
    let t = text;
    [...names].sort((x, y) => y.length - x.length).forEach((n) => { t = t.split(n).join("○○"); });
    return t;
  }

  function enrich(a) {
    a.group = CLASS_TO_GROUP[a.class] || "insect";
    a.groupInfo = GROUPS.find((g) => g.id === a.group);
    // 棲地欄位空白時，退回用展區名稱、分布、特徵判斷
    a.habitatInfo = pickHabitat(a.habitat) || pickHabitat([a.location, a.distribution, a.feature].join(" "));
    // 棲地明確：原文只提到一種棲地，出「誰住哪裡」的題目才不會有爭議
    const ht = (a.habitat || "").replace(/海拔/g, "");
    a.habitatClear = HABITATS.filter((h) => h.re.test(ht)).length === 1;
    a.dietKey = pickDiet(a.diet);
    a.dietInfo = a.dietKey ? DIETS[a.dietKey] : null;
    a.cons = CONS[a.cons_code] || CONS[""];
    a.name = a.name_suspect ? a.name_ch.replace(/[?？]/g, "") + "（名稱待確認）" : a.name_ch;
    a.nameClean = a.name_ch.replace(/[?？]/g, "");
    a.hasPhoto = a.pics.length > 0;
    a.quizReady = !a.name_suspect && a.habitatInfo && a.dietInfo; // 能出題的動物
    // 低年級簡易介紹：用範本組句，不編造內容
    const parts = ["牠是" + a.groupInfo.name + "。"];
    if (a.habitatInfo) parts.push("住在" + a.habitatInfo.name + "。");
    if (a.dietInfo) parts.push("喜歡" + (a.dietKey === "omni" ? "什麼都吃" : a.dietInfo.name) + "。");
    const where = firstSentence(a.distribution, 30);
    if (where) parts.push("家鄉在：" + where.replace(/。$/, "") + "。");
    a.simple = parts.join("");
    a.feature1 = bestLine(a.feature, 60);
    // 適合當謎題線索：夠長，而且遮掉名字後不會只剩空話（名字被遮超過一處就太空了）
    a.goodClue = a.feature1.length >= 14 && mask(a, a.feature1).split("○○").length - 1 <= 1;
    return a;
  }

  // ---- 載入與快取 ----
  const KEY = "zoo-cache-v1";
  async function load() {
    let meta = null, animals = null;
    try {
      meta = await (await fetch("/api/meta")).json();
      let cached = null;
      try { cached = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { /* 無痕模式可能不能用 */ }
      if (cached && cached.modifiedDate === meta.modifiedDate && cached.version === meta.version) animals = cached.animals;
      if (!animals) {
        animals = (await (await fetch("/api/animals")).json()).animals;
        try { localStorage.setItem(KEY, JSON.stringify({ modifiedDate: meta.modifiedDate, version: meta.version, animals })); } catch (e) { /* 容量滿就不存 */ }
      }
    } catch (e) {
      // 離線或伺服器忙：退回上次存的資料，教室網路不穩時還能用
      try {
        const c = JSON.parse(localStorage.getItem(KEY) || "null");
        if (c) { animals = c.animals; meta = meta || { modifiedDate: c.modifiedDate, count: c.animals.length, offline: true }; }
      } catch (e2) { /* 沒有快取 */ }
      if (!animals) throw e;
    }
    animals.forEach(enrich);
    return { animals, meta };
  }

  // ---- 圖片：先用動物園的照片，載入失敗換成類別圖示 ----
  function placeholder(a, cls) {
    const d = document.createElement("div");
    d.className = "ph " + (cls || "");
    d.style.background = a.groupInfo.color + "22";
    d.innerHTML = '<span aria-hidden="true">' + a.groupInfo.emoji + "</span>";
    d.setAttribute("role", "img");
    d.setAttribute("aria-label", a.nameClean);
    return d;
  }
  function photo(a, i, cls) {
    const p = a.pics[i || 0];
    if (!p) return placeholder(a, cls);
    const img = new Image();
    img.className = "photo " + (cls || "");
    img.loading = "lazy";
    img.referrerPolicy = "no-referrer";
    img.alt = (p.alt || a.nameClean).replace(/[?？]/g, "");
    img.onerror = () => img.replaceWith(placeholder(a, cls));
    img.src = p.url;
    return img;
  }

  // ---- 小工具 ----
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  const pick = (arr, n) => shuffle(arr).slice(0, n);
  // el(html)：HTML 字串轉成「單一」元素。多個頂層元素要自己包一層 <div>，否則後面的會被丟掉
  const el = (html) => {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    if (t.content.children.length > 1) console.warn("Zoo.el：HTML 有多個頂層元素，只會用第一個", html.slice(0, 60));
    return t.content.firstElementChild;
  };
  function youtubeEmbed(url) {
    const m = (url || "").match(/list=([\w-]+)/);
    return m ? "https://www.youtube-nocookie.com/embed/videoseries?list=" + m[1] : "";
  }

  // 自製確認對話框（不用瀏覽器內建的 alert／confirm）
  function dialog(message, buttons) {
    return new Promise((resolve) => {
      const d = document.createElement("dialog");
      d.className = "zdlg";
      d.innerHTML = "<p>" + esc(message) + '</p><div class="row"></div>';
      (buttons || [{ label: "好", value: true, primary: true }]).forEach((b) => {
        const btn = document.createElement("button");
        btn.className = "btn" + (b.primary ? " primary" : "") + (b.danger ? " danger" : "");
        btn.textContent = b.label;
        btn.onclick = () => { d.close(); d.remove(); resolve(b.value); };
        d.lastChild.appendChild(btn);
      });
      document.body.appendChild(d);
      d.showModal();
    });
  }

  window.Zoo = { GROUPS, HABITATS, CONS, DIETS, enrich, mask, load, photo, placeholder, esc, shuffle, pick, el, youtubeEmbed, dialog };
})();
