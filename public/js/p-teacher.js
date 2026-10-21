/* 老師專區：分頁切換、學習單產生與列印、出題投影。計分板在 p-board.js。 */
Zoo.boot(function (animals) {
  const { esc, el } = Zoo;
  const $ = (id) => document.getElementById(id);
  $("gen").disabled = false; // 資料載入完才能按（HTML 裡預設停用）
  $("gen2").disabled = false;

  // ---- 分頁 ----
  const tabs = document.querySelectorAll(".tab");
  tabs.forEach((t) => (t.onclick = () => {
    tabs.forEach((x) => x.setAttribute("aria-selected", String(x === t)));
    document.querySelectorAll("main > section").forEach((s) => (s.hidden = s.id !== "tab-" + t.dataset.tab));
  }));
  Board.init($("tab-board"));

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
    return Qgen.make(pool, types, +$("num").value);
  }
  const themeName = () => $("theme").selectedOptions[0].textContent;

  // ---- 學習單 ----
  let sheetQs = [];
  $("gen").onclick = async () => {
    sheetQs = questions();
    if (!sheetQs.length) { await Zoo.dialog("這個主題找不到足夠的題目，請換一個主題或題型。"); return; }
    const head = (ans) =>
      "<h2>🦁 動物探險家學習單" + (ans ? "（答案）" : "") + "</h2><p>主題：" + esc(themeName()) + "　班級：<span class='blank' style='min-width:4em'></span>　座號：<span class='blank' style='min-width:3em'></span>　姓名：<span class='blank'></span></p>";
    const body = (ans) => sheetQs.map((q, i) => {
      let h = '<div class="q"><b>' + (i + 1) + ".</b> " + esc(q.q);
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
  $("print").onclick = () => window.print();

  // ---- 出題投影 ----
  $("gen2").onclick = async () => {
    const qs = questions();
    if (!qs.length) { await Zoo.dialog("這個主題找不到足夠的題目，請換一個主題或題型。"); return; }
    let i = 0, showAns = false;
    const box = $("slide");
    box.hidden = false;
    const draw = () => {
      const q = qs[i];
      box.replaceChildren(el(
        "<div><p>第 " + (i + 1) + " / " + qs.length + " 題</p>" +
        '<div id="pic"></div><h2 style="font-size:2rem">' + esc(q.kind === "riddle" ? q.q : q.q) + "</h2>" +
        (q.choices.length ? '<div class="opts">' + q.choices.map((c) => '<div class="opt' + (showAns && c === q.answer ? " right" : "") + '">' + esc(c) + "</div>").join("") + "</div>" : "") +
        '<div class="feedback ok" style="font-size:2rem">' + (showAns ? "答案：" + esc(q.answer) : "") + "</div>" +
        '<p class="noprint"><button class="btn big" id="prev">◀ 上一題</button> <button class="btn primary big" id="show">' + (showAns ? "隱藏答案" : "顯示答案") + '</button> <button class="btn big" id="next">下一題 ▶</button></p></div>'
      ));
      // 猜謎題先不顯示照片，不然就直接看到答案；揭曉後才顯示
      if (q.kind !== "riddle" || showAns) box.querySelector("#pic").appendChild(Zoo.photo(q.animal, 0));
      box.querySelector("#prev").onclick = () => { i = Math.max(0, i - 1); showAns = false; draw(); };
      box.querySelector("#next").onclick = () => { i = Math.min(qs.length - 1, i + 1); showAns = false; draw(); };
      box.querySelector("#show").onclick = () => { showAns = !showAns; draw(); };
    };
    draw();
    box.scrollIntoView({ behavior: "smooth", block: "start" });
  };
});
