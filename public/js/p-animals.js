/* 動物小百科：搜尋、篩選、詳細介紹對話框（網址 #動物id 可直接開啟某一種）。 */
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
    c.prepend(photo(a, 0));
    c.onclick = () => open(a);
    return c;
  }

  // ---- 詳細介紹 ----
  const fact = (title, text) => (text && text.trim() ? '<div class="fact"><h4>' + title + "</h4><p>" + esc(text.trim()) + "</p></div>" : "");
  function open(a) {
    history.replaceState(null, "", "#" + a.id);
    const vid = Zoo.youtubeEmbed(a.videos);
    body.innerHTML =
      '<button class="btn dlg-close" id="x">關閉 ✕</button>' +
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
    if (!dlg.open) dlg.showModal();
    body.parentElement.scrollTop = 0;
  }
  dlg.addEventListener("close", () => history.replaceState(null, "", location.pathname));
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });

  render();
  const want = decodeURIComponent(location.hash.slice(1));
  const hit = want && animals.find((a) => a.id === want);
  if (hit) open(hit);
});
