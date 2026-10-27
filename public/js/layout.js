/* 頁首、頁尾與頁面啟動器。每頁 <body data-page="..."> 決定導覽列亮哪一個。 */
(function () {
  "use strict";
  const NAV = [
    ["animals", "動物小百科", "/animals", "📖"],
    ["map", "逛動物園", "/map", "🚶"],
    ["classify", "分類闖關", "/classify", "🧩"],
    ["habitat", "誰住哪裡", "/habitat", "🗺️"],
    ["guess", "猜猜我是誰", "/guess", "🔍"],
    ["memory", "翻牌配對", "/memory", "🃏"],
    ["conserve", "保育小教室", "/conserve", "🌏"],
    ["passport", "探險護照", "/passport", "🎫"],
    ["teacher", "老師專區", "/teacher", "🍎"],
    ["help", "使用說明", "/help", "📘"],
  ];
  const page = document.body.dataset.page || "";
  const wrap = document.createElement("div");
  wrap.className = "wrap";
  const main = document.querySelector("main");
  main.before(wrap);
  wrap.innerHTML =
    '<header class="top"><a class="logo" href="/">🦁 動物探險家</a><nav aria-label="主選單">' +
    NAV.map((n) => '<a href="' + n[2] + '"' + (n[0] === page ? ' aria-current="page"' : "") + ">" + n[1] + "</a>").join("") +
    '</nav><button class="gradebtn" id="gradebtn"></button></header>';
  wrap.appendChild(main);

  // 年級鈕：共用電腦上一節低年級、下一節高年級，隨時可換，換了立刻生效
  const ICON = { low: "🌱", mid: "🌿", high: "🌳" };
  const gb = document.getElementById("gradebtn");
  const drawGrade = () => {
    const g = Zoo.grade();
    gb.textContent = ICON[g] + " " + Zoo.GRADES[g];
    gb.setAttribute("aria-label", "目前是" + Zoo.GRADES[g] + "，按一下換年級");
  };
  gb.onclick = async () => {
    const g = await Zoo.dialog("你幾年級？低年級會顯示注音、朗讀比較慢。", Object.keys(Zoo.GRADES).map((k) =>
      ({ label: ICON[k] + " " + Zoo.GRADES[k], value: k, primary: k === Zoo.grade() })).concat([{ label: "取消", value: "" }]));
    if (g) Zoo.setGrade(g);
  };
  document.addEventListener("zoo-grade", drawGrade);
  drawGrade();

  // 手機底部分頁列：9 個連結在窄螢幕會排成好幾行，改成 4 個大按鈕，其餘收進「更多」
  const PLAY = ["play", "classify", "habitat", "guess", "memory", "conserve"];
  const TABS = [
    ["📖", "百科", "/animals", page === "animals"],
    ["🎮", "闖關", "/play", PLAY.includes(page)],
    ["🎫", "護照", "/passport", page === "passport"],
  ];
  const bar = document.createElement("nav");
  bar.className = "tabbar noprint";
  bar.setAttribute("aria-label", "快速選單");
  bar.innerHTML = TABS.map((t) => '<a href="' + t[2] + '"' + (t[3] ? ' aria-current="page"' : "") + "><i>" + t[0] + "</i>" + t[1] + "</a>").join("") +
    '<button type="button" id="more"><i>☰</i>更多</button>';
  document.body.appendChild(bar);
  const sheet = document.createElement("dialog");
  sheet.className = "sheetmenu";
  sheet.innerHTML = '<div class="dlg-in"><div class="dlg-bar"><button class="btn" data-close>關閉 ✕</button></div>' +
    [["🏠", "首頁", "/"]].concat(NAV.map((n) => [n[3], n[1], n[2]])).map((n) => '<a href="' + n[2] + '">' + (n[0] ? n[0] + " " : "") + n[1] + "</a>").join("") + "</div>";
  document.body.appendChild(sheet);
  document.getElementById("more").onclick = () => sheet.showModal();
  sheet.querySelector("[data-close]").onclick = () => sheet.close();
  sheet.onclick = (e) => { if (e.target === sheet) sheet.close(); };
  const foot = document.createElement("footer");
  foot.className = "foot";
  foot.innerHTML =
    "<div class=\"foot-brand\"><img src=\"/img/hunglun-logo.webp\" alt=\"鴻綸科技\" width=\"156\" height=\"56\"></div>" +
    "<p class=\"foot-copy\">本站資料主要為政府單位開放資料，資料版權屬原資料提供單位，由鴻綸科技整理製作。本站程式、介面設計與整理編排 © 2026 鴻綸科技股份有限公司 版權所有，未經書面同意，不得轉載、複製、改作或仿製。</p>" +
    '<p id="data-stamp" hidden></p>';
  wrap.appendChild(foot);

  // Zoo.boot(fn)：載入資料後呼叫 fn(animals, meta)，處理載入中與失敗畫面
  window.Zoo.boot = async function (fn) {
    main.insertAdjacentHTML("beforeend", '<div class="loading" id="boot">動物們正在集合…🐾</div>');
    try {
      const { animals, meta } = await window.Zoo.load();
      document.getElementById("boot").remove();
      document.getElementById("data-stamp").textContent =
        "目前共收錄 " + animals.length + " 種動物。資料更新日期：" + String(meta.modifiedDate || "").slice(0, 10) + "。";
      document.querySelectorAll("[data-count]").forEach((e) => (e.textContent = animals.length));
      await fn(animals, meta);
      // 量「畫面可以操作」的時間用：開發者工具看效能標記，測試腳本讀 <html data-ready>（毫秒）
      performance.mark("zoo-ready");
      document.documentElement.dataset.ready = Math.round(performance.now());
    } catch (e) {
      console.error(e);
      const b = document.getElementById("boot");
      if (b) { b.className = "err"; b.innerHTML = '資料載入失敗了。請檢查網路後重新整理。<br><button class="btn" onclick="location.reload()">重新整理</button>'; }
    }
  };
})();
