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
  const KEY = "zoo-cache-v2";
  const FORMAT = 2; // 快取資料的格式代號：API 欄位或 enrich() 用到的欄位改了就加 1，舊快取就不會被新程式拿來用
  try { localStorage.removeItem("zoo-cache-v1"); } catch (e) { /* 舊版快取約 500 KB，清掉 */ }
  function readCache() {
    try {
      const c = JSON.parse(localStorage.getItem(KEY) || "null");
      return c && c.format === FORMAT && Array.isArray(c.animals) ? c : null;
    } catch (e) { return null; } // 無痕模式可能不能用
  }
  function saveCache(meta, animals) {
    try { localStorage.setItem(KEY, JSON.stringify({ format: FORMAT, modifiedDate: meta.modifiedDate, syncedAt: meta.syncedAt, version: meta.version, animals })); } catch (e) { /* 容量滿就不存 */ }
  }
  const getJson = (u) => fetch(u).then((r) => { if (!r.ok) throw new Error(u + " HTTP " + r.status); return r.json(); });
  // 抓動物資料一定帶上「最後匯入時間」：伺服器依它分開快取，同步（含手動強制同步）後才不會拿到舊資料卻當成新的存起來
  const getAnimals = (m) => getJson("/api/animals?m=" + encodeURIComponent(m.syncedAt || "")).then((d) => d.animals);

  // 有本機快取就馬上用它畫畫面，背景再問伺服器資料有沒有更新（有就存起來，下一頁生效）。
  // 學生在工具間切換時不用每頁都等網路；教室網路斷了也照樣能用。第一次（沒快取）才等網路。
  async function load() {
    let meta, animals;
    // 補圖表：動物園原照片失效（404）的動物，改用維基共享資源的自由授權照片或自製插圖
    // 縮圖表：本站依原照片縮小的小圖（scripts/build-thumbs.py 產生），卡片和遊戲優先用，比原照片小幾十倍
    // 一開始就跟動物資料同時抓，不要等資料抓完才開始
    const lists = Promise.all(["/js/img-fallback.json?v=7", "/js/thumbs.json?v=7"].map((u) =>
      getJson(u).catch(() => null))); // 沒有就只用原照片與圖示
    const cached = readCache();
    if (cached) {
      animals = cached.animals;
      meta = { modifiedDate: cached.modifiedDate, syncedAt: cached.syncedAt, version: cached.version, count: animals.length };
      getJson("/api/meta").then((m) => {
        if (m.syncedAt !== cached.syncedAt || m.version !== cached.version) {
          return getAnimals(m).then((list) => saveCache(m, list));
        }
      }).catch(() => { /* 離線或伺服器忙：下次再檢查 */ });
    } else {
      meta = await getJson("/api/meta");
      animals = await getAnimals(meta);
      saveCache(meta, animals);
    }
    const [fb, thumbs] = await lists;
    const hasThumb = new Set(thumbs || []);
    animals.forEach((a) => {
      a.fallback = (fb || {})[a.id] || null;
      a.thumb = hasThumb.has(a.id) ? "/img/thumbs/" + a.id + ".webp?v=7" : "";
      enrich(a);
    });
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
  // photo(a)：卡片、遊戲用的小圖，依序試「本站縮圖 → 原照片第 1～4 張 → 補圖 → 類別圖示」
  // photo(a, i)：詳情頁大圖，連動物園原照片第 i 張；第 1 張失效才退回補圖與縮圖
  function photo(a, i, cls) {
    const small = i == null;
    const fb = a.fallback ? [{ src: a.fallback.src, art: a.fallback.kind === "art" }] : [];
    const thumb = a.thumb ? [{ src: a.thumb }] : [];
    const pics = a.pics.map((p) => ({ src: p.url, alt: p.alt }));
    const list = small ? thumb.concat(pics, fb) : [pics[i]].filter(Boolean).concat(i === 0 ? fb.concat(thumb) : []);
    if (!list.length) return placeholder(a, cls);
    const img = new Image();
    img.className = "photo " + (cls || "");
    img.loading = "lazy";
    img.referrerPolicy = "no-referrer";
    let k = 0;
    const use = () => {
      const c = list[k];
      img.alt = ((c.alt || a.nameClean) + (c.art ? "（示意插圖）" : "")).replace(/[?？]/g, "");
      img.src = c.src;
    };
    img.onerror = () => {
      if (++k < list.length) use();
      else if (small || i === 0) img.replaceWith(placeholder(a, cls));
      else img.remove(); // 詳情頁第 2 張以後失效就不顯示，前面已經有圖了
    };
    use();
    return img;
  }
  // 詳情頁用：補圖的出處說明（原照片正常時回空字串）
  function creditLine(a) {
    if (!a.fallback) return "";
    return a.fallback.kind === "art"
      ? "此動物的原照片已無法顯示，圖為示意插圖（AI 繪製），不代表實際外觀細節。"
      : '此動物的原照片已無法顯示，改用維基共享資源照片：<a href="' + esc(a.fallback.creditUrl) + '" target="_blank" rel="noopener">' + esc(a.fallback.credit) + "</a>。";
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

  window.Zoo = { GROUPS, HABITATS, CONS, DIETS, enrich, mask, load, photo, creditLine, placeholder, esc, shuffle, pick, el, youtubeEmbed, dialog };
})();
