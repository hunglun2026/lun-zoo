/* 老師專區：分頁切換、學習單產生與列印、出題投影（含 10 秒倒數）、課程包一鍵帶入設定。計分板在 p-board.js，班級連結在 p-classlink.js。 */
Zoo.boot(function (animals) {
  const { esc, el } = Zoo;
  const $ = (id) => document.getElementById(id);
  $("gen").disabled = false; // 資料載入完才能按（HTML 裡預設停用）
  $("gen2").disabled = false;
  $("cm").disabled = false;

  // ---- 分頁 ----
  const tabs = document.querySelectorAll(".tab");
  const showTab = (name) => {
    tabs.forEach((x) => x.setAttribute("aria-selected", String(x.dataset.tab === name)));
    document.querySelectorAll("main > section").forEach((s) => (s.hidden = s.id !== "tab-" + name));
  };
  tabs.forEach((t) => (t.onclick = () => showTab(t.dataset.tab)));
  // 網址 #guide、#board 這類可以直接打開那個分頁（首頁引導入口會連過來）
  const fromHash = () => { const h = location.hash.slice(1); if ([...tabs].some((t) => t.dataset.tab === h)) showTab(h); };
  window.addEventListener("hashchange", fromHash);
  fromHash();
  Board.init($("tab-board"));
  ClassLink.init($("tab-link"));

  // ---- 主題與題型 ----
  const themes = [["all", "全部動物", () => true]]
    .concat(Zoo.GROUPS.map((g) => ["g-" + g.id, g.emoji + " " + g.name, (a) => a.group === g.id]))
    .concat(Zoo.HABITATS.map((h) => ["h-" + h.id, h.emoji + " " + h.name + "的動物", (a) => a.habitatInfo && a.habitatInfo.id === h.id]))
    .concat([["danger", "⚠️ 有危險的動物", (a) => ["CR", "EN", "VU"].includes(a.cons_code)]]);
  $("theme").innerHTML = themes.map((t) => '<option value="' + t[0] + '">' + esc(t[1]) + "</option>").join("");
  const kinds = [["mix", "混合題型"]].concat(Object.entries(Qgen.KINDS).map(([k, v]) => [k, v.name]));
  $("kind").innerHTML = kinds.map((k) => '<option value="' + k[0] + '">' + esc(k[1]) + "</option>").join("");

  function questions() {
    const th = themes.find((t) => t[0] === $("theme").value);
    const pool = animals.filter(th[2]);
    const types = $("kind").value === "mix" ? Object.keys(Qgen.KINDS) : [$("kind").value];
    return Qgen.make(pool, types, +$("num").value, animals);
  }
  const themeName = () => $("theme").selectedOptions[0].textContent;

  // ---- 學習單 ----
  let sheetQs = [];
  $("gen").onclick = async () => {
    sheetQs = questions();
    if (!sheetQs.length) { await Zoo.dialog("這個主題找不到足夠的題目，請換一個主題或題型。"); return; }
    // 主題太小（例如極地冰原）湊不滿題數時要講，不然老師會以為印出來的是完整份
    if (sheetQs.length < +$("num").value) await Zoo.dialog("這個主題和題型只湊得到 " + sheetQs.length + " 題（你選了 " + $("num").value + " 題）。可以換成「混合題型」或別的主題來湊滿。");
    const head = (ans) =>
      "<h2>🦁 動物探險家學習單" + (ans ? "（答案）" : "") + "</h2><p>主題：" + esc(themeName()) + "　班級：<span class='blank' style='min-width:4em'></span>　座號：<span class='blank' style='min-width:3em'></span>　姓名：<span class='blank'></span></p>";
    const body = (ans) => sheetQs.map((q, i) => {
      let h = '<div class="q"><b>' + (i + 1) + ".</b> " + esc(q.q);
      if (q.pic) h += '<br><img class="qimg" src="' + esc(q.animal.thumb) + '" alt="第 ' + (i + 1) + ' 題的動物照片">';
      if (q.choices.length) h += "<br>" + q.choices.map((c) => (ans && c === q.answer ? '<span class="ans">● ' : "○ <span>") + esc(c) + "</span>").join("　　");
      else h += "<br>答：" + (ans ? '<span class="ans">' + esc(q.answer) + "</span>" : '<span class="blank"></span>');
      return h + "</div>";
    }).join("");
    $("sheet").innerHTML =
      head(false) + body(false) +
      '<p style="font-size:.8rem">資料來源：臺北市立動物園（政府資料開放平臺）。動物探險家 zoo.hunglun.com</p>' +
      ($("withAns").checked ? '<div class="pb"></div>' + head(true) + body(true) : "");
    $("sheet").hidden = false;
    $("print").disabled = false;
    $("sheet").scrollIntoView({ behavior: "smooth", block: "start" });
  };
  // 等學習單上的照片都載完才列印，不然網路慢時會印出空白框
  $("print").onclick = async () => {
    const imgs = [...$("sheet").querySelectorAll("img")].filter((i) => !i.complete);
    await Promise.all(imgs.map((i) => new Promise((r) => { i.addEventListener("load", r); i.addEventListener("error", r); })));
    window.print();
  };

  // ---- 全螢幕上課模式（p-class.js）：離開時重畫計分板分頁，分數才會跟上課時加的一樣 ----
  $("cm").onclick = async () => {
    const qs = questions();
    if (!qs.length) { await Zoo.dialog("這個主題找不到足夠的題目，請換一個主題或題型。"); return; }
    ClassMode.start(qs, () => Board.init($("tab-board")));
  };

  // ---- 出題投影 ----
  let cd = null; // 投影的 10 秒倒數；放外層，重新出題時才停得掉上一輪的
  $("gen2").onclick = async () => {
    const qs = questions();
    if (!qs.length) { await Zoo.dialog("這個主題找不到足夠的題目，請換一個主題或題型。"); return; }
    clearInterval(cd);
    let i = 0, showAns = false;
    const box = $("slide");
    box.hidden = false;
    const draw = () => {
      clearInterval(cd); // 換題就停掉倒數
      const q = qs[i];
      box.replaceChildren(el(
        "<div><p>第 " + (i + 1) + " / " + qs.length + " 題</p>" +
        '<div id="pic"></div><h2 style="font-size:2rem">' + esc(q.kind === "riddle" ? q.q : q.q) + "</h2>" +
        (q.choices.length ? '<div class="opts">' + q.choices.map((c) => '<div class="opt' + (showAns && c === q.answer ? " right" : "") + '">' + esc(c) + "</div>").join("") + "</div>" : "") +
        '<div class="feedback ok" style="font-size:2rem">' + (showAns ? "答案：" + esc(q.answer) : "") + "</div>" +
        '<div class="timer" id="cd" aria-live="polite"></div>' +
        '<p class="noprint"><button class="btn big" id="prev">◀ 上一題</button> <button class="btn big" id="ten">⏱️ 10 秒</button> <button class="btn primary big" id="show">' + (showAns ? "隱藏答案" : "顯示答案") + '</button> <button class="btn big" id="next">下一題 ▶</button></p></div>'
      ));
      // 猜謎題先不顯示照片，不然就直接看到答案；揭曉後才顯示
      if (q.kind !== "riddle" || showAns) box.querySelector("#pic").appendChild(Zoo.photo(q.animal));
      const h = box.querySelector("h2");
      h.append(Speak.btn(() => [[q.q, h]].concat(q.choices.map((c, k) => ["第" + (k + 1) + "個，" + c, box.querySelectorAll(".opt")[k]])), "念題目和選項"));
      box.querySelector("#prev").onclick = () => { i = Math.max(0, i - 1); showAns = false; draw(); };
      box.querySelector("#next").onclick = () => { i = Math.min(qs.length - 1, i + 1); showAns = false; draw(); };
      box.querySelector("#show").onclick = () => { showAns = !showAns; draw(); };
      // 10 秒倒數：給全班想一想再舉手，時間到響三聲
      box.querySelector("#ten").onclick = () => {
        let left = 10;
        const t = box.querySelector("#cd");
        clearInterval(cd);
        t.textContent = left;
        cd = setInterval(() => {
          left--;
          t.textContent = left > 0 ? left : "時間到！";
          if (left > 0 && left <= 3) Fx.tick();
          if (left <= 0) { clearInterval(cd); Fx.ding(); }
        }, 1000);
      };
    };
    draw();
    box.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // ---- 課程包：一鍵帶入學習單的主題、題型、題數，直接產生 ----
  document.querySelectorAll("[data-pack]").forEach((b) => (b.onclick = () => {
    const [theme, kind, num] = b.dataset.pack.split(",");
    $("theme").value = theme; $("kind").value = kind; $("num").value = num;
    showTab("sheet");
    $("gen").click();
  }));
});
