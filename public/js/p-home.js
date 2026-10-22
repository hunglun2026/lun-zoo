/* 首頁（歡迎頁）：引導入口、捲動放大切換、捲到才浮現、數字跳動。
   捲動切換的算法參考 www.hunglun.com 首頁 landing.js（tour-zoom）。樣式在 css/home.css。 */
(function () {
  "use strict";
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- 引導入口：身分 → 年級 → 推薦 3 個工具。選過的記在這台裝置（zoo-guide） ----
  const GKEY = "zoo-guide";
  const R = (href, ico, name, why) => ({ href, ico, name, why });
  const RECS = {
    student: {
      low: [R("/memory", "🃏", "翻牌配對", "照片配名字，最容易上手"), R("/animals", "📖", "動物小百科", "看照片、聽叫聲，找出最喜歡的動物"), R("/guess", "🔍", "猜猜我是誰", "線索一個一個出現，猜猜是誰")],
      mid: [R("/classify", "🧩", "分類闖關", "牠是哺乳類、鳥類還是爬蟲類？"), R("/habitat", "🗺️", "誰住哪裡", "森林、沙漠、海洋，幫動物找到家"), R("/guess", "🔍", "猜猜我是誰", "越早猜中分數越高")],
      high: [R("/classify", "🧩", "分類闖關", "挑戰 6 大類，還有 60 秒挑戰"), R("/conserve", "🌏", "保育小教室", "石虎、穿山甲為什麼有危險？"), R("/animals", "📖", "動物小百科", "挑兩種動物「比一比」，找出異同")],
    },
    teacher: {
      low: [R("/teacher#guide", "📚", "課程包「棲地與適應」", "40 分鐘流程，一鍵帶入學習單"), R("/guess", "🔍", "猜猜我是誰", "投影全班搶答，不用每人一台"), R("/memory", "🃏", "翻牌配對", "低年級最好上手的暖身活動")],
      mid: [R("/teacher#guide", "📚", "課程包「生物分類」「動物吃什麼」", "40 分鐘流程，一鍵帶入學習單"), R("/classify", "🧩", "分類闖關", "投影全班一起分類"), R("/teacher#board", "🏆", "搶答計分板", "分組記分，附倒數計時器")],
      high: [R("/teacher#guide", "📚", "課程包「保育」", "40 分鐘流程，一鍵帶入學習單"), R("/conserve", "🌏", "保育小教室", "認識保育等級，討論我們能做什麼"), R("/animals", "📖", "動物小百科比一比", "印出比較表，練習比較異同")],
    },
  };
  const WHO = { student: "學生", teacher: "老師" };
  const LV = { low: "低年級", mid: "中年級", high: "高年級" };
  const guide = document.getElementById("start");
  const steps = guide ? [...guide.querySelectorAll(".g-step")] : [];
  let st = {};
  try { st = JSON.parse(localStorage.getItem(GKEY) || "{}") || {}; } catch (e) { /* 無痕模式 */ }
  if (!WHO[st.who]) st = {};
  const save = () => { try { localStorage.setItem(GKEY, JSON.stringify(st)); } catch (e) { /* 忽略 */ } };
  const show = (name) => steps.forEach((s) => (s.hidden = s.dataset.step !== name));
  function done() {
    document.getElementById("g-who").textContent = WHO[st.who] + "・" + LV[st.lv];
    document.getElementById("g-recs").innerHTML = RECS[st.who][st.lv].map((r) =>
      '<a class="tool" href="' + r.href + '"><div class="ico">' + r.ico + "</div><h3>" + Zoo.esc(r.name) + '</h3><span class="why">' + Zoo.esc(r.why) + "</span></a>").join("");
    show("done");
  }
  if (guide) {
    const pick = (w) => {
      st = { who: w };
      save();
      document.getElementById("g-lvq").textContent = w === "teacher" ? "你教幾年級？" : "你幾年級？";
      show("lv");
    };
    guide.querySelectorAll("[data-who]").forEach((b) => (b.onclick = () => pick(b.dataset.who)));
    guide.querySelectorAll("[data-lv]").forEach((b) => (b.onclick = () => { st.lv = b.dataset.lv; save(); Zoo.setGrade(st.lv); done(); }));
    guide.querySelector("[data-back]").onclick = () => show("who");
    guide.querySelector("[data-reset]").onclick = () => {
      st = {};
      try { localStorage.removeItem(GKEY); } catch (e) { /* 忽略 */ }
      show("who");
    };
    // 開場的「我是學生」「我是老師」：直接選好身分，捲到引導區問年級（沒有 JS 時就只是連到 #start）
    document.querySelectorAll("[data-pick]").forEach((a) => (a.onclick = (e) => {
      e.preventDefault();
      pick(a.dataset.pick);
      guide.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    }));
    if (st.who && LV[st.lv]) done();
  }

  // ---- 捲動放大切換：區塊高度＝張數 × 85vh，畫面固定，捲動進度決定現在顯示哪一張 ----
  const tour = document.getElementById("tour");
  const panels = tour ? [...tour.querySelectorAll(".w-panel")] : [];
  const n = panels.length;
  const dotsBox = tour && tour.querySelector(".w-dots");
  const dots = panels.map((p, i) => {
    const b = document.createElement("button");
    b.setAttribute("aria-label", "跳到第 " + (i + 1) + " 張");
    b.tabIndex = -1; // 鍵盤使用者直接用每張的按鈕，不用跳過一排圓點
    b.onclick = () => {
      const top = tour.getBoundingClientRect().top + scrollY;
      scrollTo({ top: top + (tour.offsetHeight - innerHeight) * (i / Math.max(n - 1, 1)), behavior: reduce ? "auto" : "smooth" });
    };
    if (dotsBox) dotsBox.appendChild(b);
    return b;
  });
  if (tour) tour.style.setProperty("--n", n);
  // 每張的文字與按鈕先存起來，捲動時每一格畫面不用重新找
  const parts = panels.map((el) => ({ txt: el.querySelector(".w-panel-text"), links: [...el.querySelectorAll("a")], img: el.querySelector("img") }));
  // 照片延後載入：7 張疊在同一個固定畫面裡，瀏覽器的懶載入會以為都在畫面上而一次全抓；
  // 改成只載入目前這張和前後各一張（index.html 用 data-src／data-srcset 先不給網址）
  function loadImg(i) {
    const im = parts[i] && parts[i].img;
    if (!im || !im.dataset.src) return;
    if (im.dataset.srcset) im.srcset = im.dataset.srcset;
    im.src = im.dataset.src;
    delete im.dataset.src;
  }
  if (reduce) panels.forEach((_, i) => { parts[i].img.loading = "lazy"; loadImg(i); }); // 靜態排列時交給瀏覽器懶載入

  function drawTour() {
    if (!tour || reduce) return;
    const rect = tour.getBoundingClientRect();
    const progress = clamp(-rect.top / Math.max(rect.height - innerHeight, 1), 0, 1);
    const cur = progress * Math.max(n - 1, 1);
    const index = Math.min(n - 1, Math.round(cur));
    if (rect.top < innerHeight * 1.5) [index - 1, index, index + 1, index + 2].forEach(loadImg); // 快捲到時才開始抓
    panels.forEach((el, i) => {
      const off = i - cur; // 負的＝已經看過（放大淡出），正的＝還沒輪到
      const opacity = off < 0 ? clamp(1 + 1.3 * off, 0, 1) : clamp(2 * (1 - off), 0, 1);
      const scale = off < 0 ? 1 - 0.4 * off : 1 - 0.1 * Math.min(off, 1);
      el.style.opacity = opacity;
      el.style.transform = "scale(" + scale + ")";
      el.style.zIndex = off >= 0 ? 10 - Math.ceil(off) : 20;
      el.style.pointerEvents = opacity > 0.85 ? "auto" : "none";
      parts[i].links.forEach((a) => (a.tabIndex = opacity > 0.85 ? 0 : -1));
      const txt = parts[i].txt;
      txt.style.transform = "translateY(" + 8 * off + "vh)";
      txt.style.opacity = clamp(1 - 1.7 * Math.abs(off), 0, 1);
    });
    dots.forEach((d, i) => d.classList.toggle("active", i === index));
  }
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; drawTour(); });
  };
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);
  drawTour();

  // ---- 捲到才浮現 ----
  const reveals = document.querySelectorAll(".w-reveal");
  if (reduce || !("IntersectionObserver" in window)) reveals.forEach((el) => el.classList.add("in-view"));
  else {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in-view"); io.unobserve(e.target); }
    }), { threshold: 0.15 });
    reveals.forEach((el) => io.observe(el));
  }

  // ---- 數字：等資料載入後換成真實數字，捲到時從 0 跳上去 ----
  function countUp(el, target) {
    if (reduce) { el.textContent = target; return; }
    const start = performance.now();
    const tick = (now) => {
      const t = clamp((now - start) / 1400, 0, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  Zoo.boot(function (animals) {
    const stats = {
      count: animals.length,
      groups: Zoo.GROUPS.length,
      habitats: Zoo.HABITATS.length,
      danger: animals.filter((a) => ["CR", "EN", "VU"].includes(a.cons_code)).length,
    };
    const nums = [...document.querySelectorAll("[data-stat]")];
    nums.forEach((el) => (el.dataset.target = stats[el.dataset.stat]));
    const box = document.querySelector(".w-stats");
    const run = () => nums.forEach((el) => countUp(el, +el.dataset.target));
    if (!box || reduce || !("IntersectionObserver" in window)) return run();
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { run(); io.disconnect(); }
    }, { threshold: 0.4 });
    io.observe(box);
  });
})();
