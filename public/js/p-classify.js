/* 分類闖關：看照片，選出牠屬於哪一類。入門 3 類、挑戰 6 類、60 秒挑戰。 */
Zoo.boot(function (animals) {
  const { esc, el, shuffle } = Zoo;
  const root = document.getElementById("root");
  const pool = animals.filter((a) => !a.name_suspect);
  const MODES = {
    easy: { name: "入門（3 類）", groups: ["mammal", "bird", "reptile"] },
    hard: { name: "挑戰（6 類）", groups: Zoo.GROUPS.map((g) => g.id) },
  };

  function menu() {
    root.replaceChildren(el(
      '<div class="panel"><p class="lead zy" style="margin-top:0">看照片，選出牠是哪一類。一共 10 題。</p>' +
      '<p><button class="btn primary big zy" data-m="easy">入門（三類）</button> <small>哺乳類、鳥類、爬蟲類</small></p>' +
      '<p><button class="btn big zy" data-m="hard">挑戰（六類）</button> <small>六大類都會出現</small></p>' +
      '<p><button class="btn big zy" data-m="easy" data-t="1">⏱️ 60 秒挑戰</button> <small>入門三類，答越多越好</small></p>' +
      "<details><summary>六大類怎麼分？</summary><ul>" +
      Zoo.GROUPS.map((g) => "<li>" + g.emoji + " <b>" + esc(g.name) + "</b>：" + esc(g.hint) + "</li>").join("") +
      "</ul></details></div>"
    ));
    root.querySelectorAll("[data-m]").forEach((b) => (b.onclick = () => play(b.dataset.m, !!b.dataset.t)));
  }

  // timed：60 秒挑戰，多準備 40 題讓手快的學生答不完
  function play(mode, timed) {
    const n = timed ? 40 : 10;
    const ids = MODES[mode].groups;
    const groups = ids.map((id) => Zoo.GROUPS.find((g) => g.id === id));
    // 每一類至少出現一次，剩下隨機，題目才不會偏掉
    const chosen = [];
    ids.forEach((id) => { const c = shuffle(pool.filter((a) => a.group === id)); if (c[0]) chosen.push(c[0]); });
    const rest = shuffle(pool.filter((a) => ids.includes(a.group) && !chosen.includes(a)));
    const picked = shuffle(chosen.concat(rest.slice(0, n - chosen.length))).slice(0, n);
    const rounds = picked.map((a) => ({
      animal: a,
      prompt: "<b>" + esc(a.name) + "</b> 是哪一類動物？",
      options: groups.map((g) => ({ id: g.id, label: g.emoji + " " + g.name })),
      answer: a.group,
      explain: esc(a.name) + "是" + esc(a.groupInfo.name) + "：" + esc(a.groupInfo.hint) + "。" + Zoo.confuseNote(a),
    }));
    Quiz.run(root, { key: "classify-" + mode + (timed ? "-timed" : ""), title: timed ? "60 秒分類挑戰" : "分類闖關", rounds, onAgain: menu, timed: timed ? 60 : 0, guide: "classify" });
  }
  // 首頁推薦卡與老師的班級連結會帶 #m=easy／hard／timed，直接開局不經過選單
  const direct = Zoo.hashParams().m;
  if (direct === "timed") play("easy", true);
  else if (MODES[direct]) play(direct, false);
  else menu();
});
