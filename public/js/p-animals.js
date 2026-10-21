/* 動物小百科：搜尋、篩選、詳細介紹對話框（網址 #動物id 可直接開啟某一種）、比一比。
   打開詳細介紹＝在探險護照蓋章（progress.js）。 */
Zoo.boot(function (animals) {
  const { esc, el, photo } = Zoo;
  const state = { q: "", group: "", habitat: "", diet: "", cons: "" };
  const grid = document.getElementById("grid");
  const dlg = document.getElementById("dlg");
  const body = document.getElementById("dlg-body");

  // ---- 篩選按鈕 ----
  const defs = [
    ["group", "類別", Zoo.GROUPS.map((g) => [g.id, g.emoji + " " + g.name])],
    ["habitat", "棲地", Zoo.HABITATS.map((h) => [h.id, h.emoji + " " + h.name])],
    ["diet", "食物", Object.entries(Zoo.DIETS).map(([k, v]) => [k, v.emoji + " " + v.name])],
    ["cons", "保育", [["danger", "⚠️ 有危險（極危、瀕危、易危）"]]],
  ];
  const filters = document.getElementById("filters");
  defs.forEach(([key, label, opts]) => {
    const row = el('<div class="chips"><span class="lab">' + label + "</span></div>");
    opts.forEach(([val, text]) => {
      const b = el('<button class="chip" aria-pressed="false">' + esc(text) + "</button>");
      b.onclick = () => {
        state[key] = state[key] === val ? "" : val;
        row.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", "false"));
        if (state[key]) b.setAttribute("aria-pressed", "true");
        render();
      };
      row.appendChild(b);
    });
    filters.appendChild(row);
  });
  document.getElementById("q").addEventListener("input", (e) => { state.q = e.target.value.trim().toLowerCase(); render(); });

  function match(a) {
    if (state.group && a.group !== state.group) return false;
    if (state.habitat && a.habitatInfo?.id !== state.habitat) return false;
    if (state.diet && a.dietKey !== state.diet) return false;
    if (state.cons === "danger" && !["CR", "EN", "VU"].includes(a.cons_code)) return false;
    if (state.q) {
      const hay = (a.nameClean + a.name_en + a.name_latin + a.also_known).toLowerCase();
      if (!hay.includes(state.q)) return false;
    }
    return true;
  }

  function render() {
    const list = animals.filter(match);
    document.getElementById("count").textContent = list.length ? "找到 " + list.length + " 種動物" : "找不到，換個條件試試看。";
    grid.replaceChildren(...list.map(card));
  }
  function card(a) {
    const c = el('<button class="acard"><div class="info"><b>' + esc(a.name) + "</b><small>" + a.groupInfo.emoji + " " + esc(a.groupInfo.name) + "</small></div></button>");
    c.prepend(photo(a));
    c.onclick = () => open(a);
    return c;
  }

  // ---- 詳細介紹 ----
  const fact = (title, text) => (text && text.trim() ? '<div class="fact"><h4>' + title + "</h4><p>" + esc(text.trim()) + "</p></div>" : "");
  function open(a) {
    history.replaceState(null, "", "#" + a.id);
    Progress.seen(a.id);
    const vid = Zoo.youtubeEmbed(a.videos);
    body.innerHTML =
      '<div class="dlg-bar"><button class="btn" id="add">' + (cmp.includes(a) ? "✔ 已加入比一比" : "➕ 加入比一比") + '</button><button class="btn" id="x">關閉 ✕</button></div>' +
      "<h2 style='margin-top:0'>" + esc(a.name) + "</h2>" +
      '<p><span class="badge" style="background:' + a.cons.color + '">' + esc(a.cons.name) + "</span> " +
      esc(a.name_en) + (a.name_latin ? "（<i>" + esc(a.name_latin) + "</i>）" : "") + "</p>" +
      '<div class="gallery" id="gal"></div>' +
      '<div class="fact" style="background:var(--orange-l)"><h4>一句話認識牠</h4><p>' + esc(a.simple) + "</p></div>" +
      '<div class="facts">' +
      fact("長什麼樣子", a.feature) + fact("吃什麼", a.diet) + fact("住在哪裡", a.habitat) +
      fact("從哪裡來", a.distribution) + fact("行為", a.behavior) + fact("面臨的危機", a.crisis) +
      fact("在動物園哪裡看到", a.location) +
      fact("科學分類", [a.phylum, a.class, a.ord, a.family].filter(Boolean).join(" › ")) + "</div>" +
      (vid ? '<h3>🎬 影片</h3><iframe src="' + vid + '" title="' + esc(a.name) + ' 影片" style="width:100%;aspect-ratio:16/9;border:0;border-radius:14px" loading="lazy" allowfullscreen></iframe>' : "") +
      (a.voices.length ? "<h3>🔊 聲音</h3>" + a.voices.map((v) => "<p>" + esc(v.alt) + '<br><audio controls preload="none" src="' + esc(v.url) + '"></audio> <a href="' + esc(v.url) + '" target="_blank" rel="noopener">聽不到？開新分頁</a></p>').join("") : "") +
      '<p style="font-size:.8rem;color:var(--ink2)">資料與照片來源：<a href="https://www.zoo.gov.tw/" target="_blank" rel="noopener">臺北市立動物園</a>。' + Zoo.creditLine(a) + "</p>";
    const gal = body.querySelector("#gal");
    // 有補圖的動物（原照片全部失效）只放 1 張，不然同一張補圖會重複 4 次
    a.pics.slice(0, a.fallback ? 1 : 4).forEach((_, i) => gal.appendChild(photo(a, i)));
    if (!a.pics.length) gal.appendChild(Zoo.placeholder(a, "xl"));
    body.querySelector("#x").onclick = () => dlg.close();
    body.querySelector("#add").onclick = (e) => { addCmp(a); e.target.textContent = "✔ 已加入比一比"; };
    if (!dlg.open) dlg.showModal();
    body.parentElement.scrollTop = 0;
  }
  dlg.addEventListener("close", () => history.replaceState(null, "", location.pathname));
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });

  // ---- 比一比：選兩種動物並排比較，對應自然課「比較異同」 ----
  const cmp = [];
  const bar = document.getElementById("cmpbar");
  const cmpBox = document.getElementById("cmp");
  function addCmp(a) {
    if (cmp.includes(a)) return;
    if (cmp.length >= 2) cmp.shift(); // 只比兩種，加第三種就換掉最早的
    cmp.push(a);
    drawBar();
  }
  function drawBar() {
    bar.hidden = !cmp.length;
    document.body.classList.toggle("has-cmpbar", cmp.length > 0); // 留底部空間，浮動列才不會蓋住頁尾
    bar.replaceChildren(el("<div><b>比一比：</b>" + cmp.map((a, i) => '<button class="chip" data-i="' + i + '" aria-label="移除 ' + esc(a.name) + '">' + esc(a.name) + " ✕</button>").join(" ") +
      (cmp.length < 2 ? " <small>再選一種動物</small>" : ' <button class="btn primary" id="go-cmp">開始比較 ➜</button>') + "</div>"));
    bar.querySelectorAll("[data-i]").forEach((b) => (b.onclick = () => { cmp.splice(+b.dataset.i, 1); drawBar(); }));
    const go = bar.querySelector("#go-cmp");
    if (go) go.onclick = () => { dlg.close(); compare(cmp[0], cmp[1]); };
  }
  const home = (a) => (a.simple.match(/家鄉在：(.*)。$/) || [])[1] || "（動物園沒有寫）";
  const ROWS = [
    ["類別", (a) => a.groupInfo.emoji + " " + a.groupInfo.name],
    ["住在哪裡", (a) => (a.habitatInfo ? a.habitatInfo.emoji + " " + a.habitatInfo.name : "（動物園沒有寫）")],
    ["吃什麼", (a) => (a.dietInfo ? a.dietInfo.emoji + " " + a.dietInfo.name : "（動物園沒有寫）")],
    ["保育等級", (a) => a.cons.name],
    ["家鄉", home],
    ["長什麼樣子", (a) => a.feature1 || "（動物園沒有寫）"],
    ["在動物園哪裡", (a) => a.location || "（動物園沒有寫）"],
  ];
  function compare(a, b) {
    cmpBox.hidden = false;
    cmpBox.replaceChildren(el(
      '<div class="sheet"><h2>🔍 比一比：' + esc(a.name) + " 和 " + esc(b.name) + "</h2>" +
      '<table class="cmp"><thead><tr><th></th><th scope="col">' + esc(a.name) + '</th><th scope="col">' + esc(b.name) + "</th></tr></thead><tbody>" +
      '<tr><th scope="row">照片</th><td class="p0"></td><td class="p1"></td></tr>' +
      ROWS.map(([label, f]) => {
        const x = f(a), y = f(b);
        return '<tr><th scope="row">' + label + (x === y && !/沒有寫/.test(x) ? ' <span class="same">一樣</span>' : "") + "</th><td>" + esc(x) + "</td><td>" + esc(y) + "</td></tr>";
      }).join("") + "</tbody></table>" +
      "<p><b>想一想：</b>牠們還有哪裡一樣？哪裡不一樣？</p><p class=\"lines\"></p>" +
      '<p class="noprint"><button class="btn primary" id="cmp-print">列印</button> <button class="btn" id="cmp-close">關閉比較</button></p></div>'
    ));
    cmpBox.querySelector(".p0").appendChild(photo(a));
    cmpBox.querySelector(".p1").appendChild(photo(b));
    cmpBox.querySelector("#cmp-close").onclick = () => { cmpBox.hidden = true; };
    // 列印時只印比較表（body 加 pcmp，style.css 的列印規則會藏掉其他區塊）
    cmpBox.querySelector("#cmp-print").onclick = () => { document.body.classList.add("pcmp"); window.print(); };
    cmpBox.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  addEventListener("afterprint", () => document.body.classList.remove("pcmp"));

  render();
  const want = decodeURIComponent(location.hash.slice(1));
  const hit = want && animals.find((a) => a.id === want);
  if (hit) open(hit);
});
