/* 共用出題引擎：分類闖關、誰住哪裡都用它。
   Quiz.run(root, { key, title, rounds, onAgain })
   rounds[i] = { animal, prompt(html), options:[{id,label,sub}], answer(id), explain(html) } */
(function () {
  "use strict";
  const { esc, el } = Zoo;

  function best(key) { try { return +localStorage.getItem("zoo-best-" + key) || 0; } catch (e) { return 0; } }
  function saveBest(key, v) { try { if (v > best(key)) localStorage.setItem("zoo-best-" + key, v); } catch (e) { /* 忽略 */ } }

  function run(root, cfg) {
    const rounds = cfg.rounds;
    let i = 0, score = 0;

    function show() {
      const r = rounds[i];
      root.replaceChildren();
      const stage = el(
        '<div class="stage"><div class="bar"><i style="width:' + (i / rounds.length) * 100 + '%"></i></div>' +
        "<p>第 " + (i + 1) + " / " + rounds.length + " 題　⭐ " + score + " 分</p>" +
        '<div id="pic"></div><h2 style="margin:.4em 0">' + r.prompt + '</h2><div class="opts" id="opts"></div>' +
        '<div class="feedback" id="fb" role="status" aria-live="polite"></div><div id="nx"></div></div>'
      );
      stage.querySelector("#pic").appendChild(Zoo.photo(r.animal, 0));
      const opts = stage.querySelector("#opts");
      r.options.forEach((o) => {
        const b = el('<button class="opt">' + esc(o.label) + (o.sub ? "<small>" + esc(o.sub) + "</small>" : "") + "</button>");
        b.dataset.id = o.id;
        b.onclick = () => answer(o.id, b, stage, r);
        opts.appendChild(b);
      });
      root.appendChild(stage);
    }

    function answer(id, btn, stage, r) {
      const ok = id === r.answer;
      if (ok) score += 10;
      stage.querySelectorAll(".opt").forEach((b) => {
        b.disabled = true;
        if (b.dataset.id === r.answer) b.classList.add("right");
      });
      if (!ok) btn.classList.add("wrong");
      const fb = stage.querySelector("#fb");
      fb.className = "feedback " + (ok ? "ok" : "no");
      fb.innerHTML = (ok ? "答對了！🎉 " : "差一點點，再記一下～ ") + r.explain;
      const last = i === rounds.length - 1;
      const next = el('<button class="btn primary big">' + (last ? "看成績 🏆" : "下一題 ➜") + "</button>");
      next.onclick = () => { i++; last ? finish() : show(); };
      stage.querySelector("#nx").appendChild(next);
      next.focus();
    }

    function finish() {
      const total = rounds.length * 10;
      const pct = score / total;
      const stars = pct >= 0.9 ? 3 : pct >= 0.6 ? 2 : pct > 0 ? 1 : 0;
      const prev = best(cfg.key);
      saveBest(cfg.key, score);
      root.replaceChildren(el(
        '<div class="stage"><h2>' + esc(cfg.title) + " 完成！</h2>" +
        '<div class="stars" aria-label="' + stars + ' 顆星">' + "⭐".repeat(stars) + "☆".repeat(3 - stars) + "</div>" +
        '<div class="score">' + score + " / " + total + "</div>" +
        "<p>" + (stars === 3 ? "太厲害了，你是動物小博士！" : stars === 2 ? "很不錯喔，再玩一次可以拿到三顆星！" : "沒關係，多看幾次就記住了。") + "</p>" +
        (prev && score > prev ? "<p>🎊 打破自己的紀錄！（上次 " + prev + " 分）</p>" : prev ? "<p>你的最佳紀錄：" + Math.max(prev, score) + " 分</p>" : "") +
        '<p><button class="btn primary big" id="again">再玩一次</button> <a class="btn big" href="/">回首頁</a></p></div>'
      ));
      root.querySelector("#again").onclick = cfg.onAgain;
    }
    show();
  }
  window.Quiz = { run };
})();
