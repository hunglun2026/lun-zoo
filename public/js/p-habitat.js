/* 誰住哪裡：只用「原文只提到一種棲地」的動物出題，答案不會有爭議。 */
Zoo.boot(function (animals) {
  const { esc, el, shuffle } = Zoo;
  const root = document.getElementById("root");
  const pool = animals.filter((a) => a.habitatClear && a.habitatInfo && !a.name_suspect);

  function menu() {
    root.replaceChildren(el(
      '<div class="panel"><p class="lead" style="margin-top:0">每一題會出現一隻動物，請選出牠平常住在哪裡。一共 10 題。</p>' +
      '<p><button class="btn primary big" id="go">開始</button></p>' +
      "<details><summary>有哪些地方？</summary><ul>" +
      Zoo.HABITATS.map((h) => "<li>" + h.emoji + " " + esc(h.name) + "</li>").join("") + "</ul></details></div>"
    ));
    root.querySelector("#go").onclick = play;
  }

  function play() {
    // 盡量讓每種棲地都出現
    const byHab = {};
    pool.forEach((a) => (byHab[a.habitatInfo.id] = (byHab[a.habitatInfo.id] || []).concat(a)));
    const first = Object.values(byHab).map((l) => shuffle(l)[0]);
    const rest = shuffle(pool.filter((a) => !first.includes(a)));
    const picked = shuffle(shuffle(first).slice(0, 10).concat(rest.slice(0, Math.max(0, 10 - first.length))));
    const rounds = picked.slice(0, 10).map((a) => {
      const others = shuffle(Zoo.HABITATS.filter((h) => h.id !== a.habitatInfo.id)).slice(0, 3);
      const opts = shuffle([a.habitatInfo].concat(others));
      const clue = a.habitat.replace(/\s+/g, " ").split(/[。\n]/)[0];
      return {
        animal: a,
        prompt: "<b>" + esc(a.name) + "</b> 住在哪裡？",
        options: opts.map((h) => ({ id: h.id, label: h.emoji + " " + h.name })),
        answer: a.habitatInfo.id,
        explain: esc(a.name) + "住在" + esc(a.habitatInfo.name) + "。動物園的介紹說：「" + esc(clue) + "」",
      };
    });
    Quiz.run(root, { key: "habitat", title: "誰住哪裡", rounds, onAgain: menu });
  }
  menu();
});
