/* 首頁（歡迎頁）動畫：捲動放大切換、捲到才浮現、數字跳動。
   捲動切換的算法參考 www.hunglun.com 首頁 landing.js（tour-zoom）。樣式在 css/home.css。 */
(function () {
  "use strict";
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

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

  function drawTour() {
    if (!tour || reduce) return;
    const rect = tour.getBoundingClientRect();
    const progress = clamp(-rect.top / Math.max(rect.height - innerHeight, 1), 0, 1);
    const cur = progress * Math.max(n - 1, 1);
    const index = Math.min(n - 1, Math.round(cur));
    panels.forEach((el, i) => {
      const off = i - cur; // 負的＝已經看過（放大淡出），正的＝還沒輪到
      const opacity = off < 0 ? clamp(1 + 1.3 * off, 0, 1) : clamp(2 * (1 - off), 0, 1);
      const scale = off < 0 ? 1 - 0.4 * off : 1 - 0.1 * Math.min(off, 1);
      el.style.opacity = opacity;
      el.style.transform = "scale(" + scale + ")";
      el.style.zIndex = off >= 0 ? 10 - Math.ceil(off) : 20;
      el.style.pointerEvents = opacity > 0.85 ? "auto" : "none";
      el.querySelectorAll("a").forEach((a) => (a.tabIndex = opacity > 0.85 ? 0 : -1));
      const txt = el.querySelector(".w-panel-text");
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
