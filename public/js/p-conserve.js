/* 保育小教室：等級階梯、危機說明、「誰比較危險」小測驗。 */
Zoo.boot(function (animals) {
  const { esc, el, shuffle } = Zoo;
  const LEVELS = [
    ["EW", "野外已經找不到了，只剩人工飼養"],
    ["CR", "非常危險，很快可能消失"],
    ["EN", "很危險，數量少得很快"],
    ["VU", "有危險，需要保護"],
    ["NT", "快要有危險了，要多注意"],
    ["LC", "暫時還安全，但還是要愛護"],
  ];
  const byCons = (c) => animals.filter((a) => a.cons_code === c && !a.name_suspect);

  // ---- 1. 階梯 ----
  const ladder = document.getElementById("ladder"), list = document.getElementById("ladder-list");
  LEVELS.forEach(([code, text]) => {
    const c = Zoo.CONS[code], n = byCons(code).length;
    if (!n) return;
    const b = el('<button class="rung" style="background:' + c.color + '">' + esc(c.name) + "（" + code + "）：" + esc(text) + "<span>" + n + " 種</span></button>");
    b.onclick = () => {
      list.hidden = false;
      list.innerHTML = "<h3 style='margin-top:0'>" + esc(c.name) + "的動物（" + n + " 種）</h3><div class='chips'>" +
        byCons(code).map((a) => '<a class="chip" style="text-decoration:none;color:inherit" href="/animals.html#' + encodeURIComponent(a.id) + '">' + a.groupInfo.emoji + " " + esc(a.name) + "</a>").join("") + "</div>";
    };
    ladder.appendChild(b);
  });

  // ---- 2. 為什麼有危險 ----
  const risky = animals.filter((a) => ["CR", "EN", "VU"].includes(a.cons_code) && a.crisis && a.crisis.trim() && !a.name_suspect);
  const why = document.getElementById("why");
  function showWhy() {
    const a = shuffle(risky)[0];
    why.replaceChildren();
    why.appendChild(Zoo.photo(a, 0));
    why.appendChild(el(
      "<div><h3>" + esc(a.name) + ' <span class="badge" style="background:' + a.cons.color + '">' + esc(a.cons.name) + "</span></h3>" +
      '<div class="clue" style="max-width:640px"><small>牠面臨的危機</small><br>' + esc(a.crisis.trim().slice(0, 220)) + (a.crisis.trim().length > 220 ? "…" : "") + "</div></div>"
    ));
    const more = el('<p><button class="btn primary">換一隻</button> <a class="btn" href="/animals.html#' + encodeURIComponent(a.id) + '">看完整介紹</a></p>');
    more.querySelector("button").onclick = showWhy;
    why.appendChild(more);
  }
  if (risky.length) showWhy();

  // ---- 3. 誰比較危險 ----
  const duel = document.getElementById("duel");
  const known = animals.filter((a) => a.cons.rank >= 3 && !a.name_suspect && a.hasPhoto);
  function playDuel() {
    let i = 0, score = 0;
    const N = 5;
    const next = () => {
      if (i >= N) return end();
      let a, b;
      do { a = shuffle(known)[0]; b = shuffle(known)[0]; } while (a.cons.rank === b.cons.rank);
      duel.replaceChildren(el("<div><p>第 " + (i + 1) + " / " + N + " 題　⭐ " + score + '</p><h3 style="margin:.2em 0">哪一種動物比較危險？</h3></div>'));
      const row = el('<div class="opts"></div>');
      [a, b].forEach((x) => {
        const o = el('<button class="opt"><span class="ph-slot"></span>' + esc(x.name) + "</button>");
        o.querySelector(".ph-slot").replaceWith(Zoo.photo(x, 0));
        o.onclick = () => {
          const ok = x.cons.rank > (x === a ? b : a).cons.rank;
          if (ok) score += 10;
          row.querySelectorAll(".opt").forEach((btn, k) => {
            const y = k === 0 ? a : b;
            btn.disabled = true;
            btn.insertAdjacentHTML("beforeend", "<small>" + esc(y.cons.name) + "</small>");
            if (y.cons.rank > (y === a ? b : a).cons.rank) btn.classList.add("right");
          });
          if (!ok) o.classList.add("wrong");
          const nx = el('<p><button class="btn primary big">' + (i === N - 1 ? "看成績" : "下一題 ➜") + "</button></p>");
          nx.querySelector("button").onclick = () => { i++; next(); };
          duel.appendChild(el('<div class="feedback ' + (ok ? "ok" : "no") + '">' + (ok ? "答對了！🎉" : "再想想，看看下面的等級～") + "</div>"));
          duel.appendChild(nx);
        };
        row.appendChild(o);
      });
      duel.appendChild(row);
    };
    const end = () => {
      duel.replaceChildren(el('<div><h3>完成！</h3><div class="score">' + score + " / " + N * 10 + '</div><p><button class="btn primary big">再玩一次</button></p></div>'));
      duel.querySelector("button").onclick = playDuel;
    };
    next();
  }
  playDuel();
});
