/* 頁首、頁尾與頁面啟動器。每頁 <body data-page="..."> 決定導覽列亮哪一個。 */
(function () {
  "use strict";
  const NAV = [
    ["animals", "動物小百科", "/animals.html"],
    ["classify", "分類闖關", "/classify.html"],
    ["habitat", "誰住哪裡", "/habitat.html"],
    ["guess", "猜猜我是誰", "/guess.html"],
    ["memory", "翻牌配對", "/memory.html"],
    ["conserve", "保育小教室", "/conserve.html"],
    ["passport", "探險護照", "/passport.html"],
    ["teacher", "老師專區", "/teacher.html"],
  ];
  const page = document.body.dataset.page || "";
  const wrap = document.createElement("div");
  wrap.className = "wrap";
  const main = document.querySelector("main");
  main.before(wrap);
  wrap.innerHTML =
    '<header class="top"><a class="logo" href="/">🦁 動物探險家</a><nav aria-label="主選單">' +
    NAV.map((n) => '<a href="' + n[2] + '"' + (n[0] === page ? ' aria-current="page"' : "") + ">" + n[1] + "</a>").join("") +
    "</nav></header>";
  wrap.appendChild(main);
  const foot = document.createElement("footer");
  foot.className = "foot";
  foot.innerHTML =
    '<p>動物資料與照片來源：<a href="https://www.zoo.gov.tw/" target="_blank" rel="noopener">臺北市立動物園</a>，' +
    '經<a href="https://data.gov.tw/dataset/121197" target="_blank" rel="noopener">政府資料開放平臺</a>提供，依政府資料開放授權條款第1版使用；' +
    "其中僅文字開放授權，照片與影音著作權屬原單位，本站僅供教學引用並連回來源；列表與遊戲中的小圖由本站依原照片縮小，以加快載入。</p>" +
    '<p id="data-stamp">資料載入中…</p>' +
    "<p>鴻綸科技 製作。本站不蒐集任何個人資料，學習進度只存在這台裝置的瀏覽器裡。</p>";
  wrap.appendChild(foot);

  // Zoo.boot(fn)：載入資料後呼叫 fn(animals, meta)，處理載入中與失敗畫面
  window.Zoo.boot = async function (fn) {
    main.insertAdjacentHTML("beforeend", '<div class="loading" id="boot">動物們正在集合…🐾</div>');
    try {
      const { animals, meta } = await window.Zoo.load();
      document.getElementById("boot").remove();
      document.getElementById("data-stamp").textContent =
        "目前共收錄 " + animals.length + " 種動物。資料更新日期：" + String(meta.modifiedDate || "").slice(0, 10) + (meta.offline ? "（離線，使用上次存的資料）" : "") + "。";
      document.querySelectorAll("[data-count]").forEach((e) => (e.textContent = animals.length));
      await fn(animals, meta);
    } catch (e) {
      console.error(e);
      const b = document.getElementById("boot");
      if (b) { b.className = "err"; b.innerHTML = '資料載入失敗了。請檢查網路後重新整理。<br><button class="btn" onclick="location.reload()">重新整理</button>'; }
    }
  };
})();
