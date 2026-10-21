/* 分類闖關：看照片，選出牠屬於哪一類。入門 3 類、挑戰 6 類。 */
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
      '<div class="panel"><p class="lead" style="margin-top:0">每一題會出現一隻動物，請選出牠屬於哪一類。一共 10 題。</p>' +
      '<p><button class="btn primary big" data-m="easy">入門（哺乳類、鳥類、爬蟲類）</button></p>' +
      '<p><button class="btn big" data-m="hard">挑戰（六大類都出現）</button></p>' +
      "<details><summary>六大類怎麼分？</summary><ul>" +
      Zoo.GROUPS.map((g) => "<li>" + g.emoji + " <b>" + esc(g.name) + "</b>：" + esc(g.hint) + "</li>").join("") +
      "</ul></details></div>"
    ));
    root.querySelectorAll("[data-m]").forEach((b) => (b.onclick = () => play(b.dataset.m)));
  }

  function play(mode) {
    const ids = MODES[mode].groups;
    const groups = ids.map((id) => Zoo.GROUPS.find((g) => g.id === id));
    // 每一類至少出現一次，剩下隨機，題目才不會偏掉
    const chosen = [];
    ids.forEach((id) => { const c = shuffle(pool.filter((a) => a.group === id)); if (c[0]) chosen.push(c[0]); });
    const rest = shuffle(pool.filter((a) => ids.includes(a.group) && !chosen.includes(a)));
    const picked = shuffle(chosen.concat(rest.slice(0, 10 - chosen.length))).slice(0, 10);
    const rounds = picked.map((a) => ({
      animal: a,
      prompt: "<b>" + esc(a.name) + "</b> 是哪一類動物？",
      options: groups.map((g) => ({ id: g.id, label: g.emoji + " " + g.name })),
      answer: a.group,
      explain: esc(a.name) + "是" + esc(a.groupInfo.name) + "：" + esc(a.groupInfo.hint) + "。",
    }));
    Quiz.run(root, { key: "classify-" + mode, title: "分類闖關", rounds, onAgain: menu });
  }
  menu();
});
