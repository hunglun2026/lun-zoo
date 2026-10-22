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
        byCons(code).map((a) => '<a class="chip" style="text-decoration:none;color:inherit" href="/animals#' + encodeURIComponent(a.id) + '">' + a.groupInfo.emoji + " " + esc(a.name) + "</a>").join("") + "</div>";
    };
    ladder.appendChild(b);
  });

  // ---- 2. 為什麼有危險 ----
  const risky = animals.filter((a) => ["CR", "EN", "VU"].includes(a.cons_code) && a.crisis && a.crisis.trim() && !a.name_suspect);
  const why = document.getElementById("why");
  function showWhy() {
    const a = shuffle(risky)[0];
    why.replaceChildren();
    why.appendChild(Zoo.photo(a));
    why.appendChild(el(
      "<div><h3><span class=\"zy\">" + esc(a.name) + '</span> <span class="badge" style="background:' + a.cons.color + '">' + esc(a.cons.name) + "</span></h3>" +
      '<div class="clue" style="max-width:640px"><small>牠面臨的危機</small><br>' + esc(a.crisis.trim().slice(0, 220)) + (a.crisis.trim().length > 220 ? "…" : "") + "</div></div>"
    ));
    const h = why.querySelector("h3"), cl = why.querySelector(".clue");
    h.append(Speak.btn(() => [[a.name + "，" + a.cons.name + "。", h], ["牠面臨的危機：" + cl.lastChild.textContent, cl]], "念牠的危機"));
    const more = el('<p><button class="btn primary">換一隻</button> <a class="btn" href="/animals#' + encodeURIComponent(a.id) + '">看完整介紹</a></p>');
    more.querySelector("button").onclick = showWhy;
    why.appendChild(more);
  }
  if (risky.length) showWhy();

  // ---- 3. 誰比較危險 ----
  const duel = document.getElementById("duel");
  const known = animals.filter((a) => a.cons.rank >= 3 && !a.name_suspect && a.hasPhoto);
  function playDuel() {
    let i = 0, score = 0, combo = 0;
    const N = 5, wrongs = [];
    const next = () => {
      if (i >= N) return end();
      let a, b;
      do { a = shuffle(known)[0]; b = shuffle(known)[0]; } while (a.cons.rank === b.cons.rank);
      duel.replaceChildren(el("<div><p>第 " + (i + 1) + " / " + N + " 題　⭐ " + score + "</p>" +
        (combo >= 2 ? '<p class="combo">🔥 連續答對 ' + combo + " 題！</p>" : "") + '<h3 style="margin:.2em 0" id="dq">哪一種動物比較危險？</h3></div>'));
      const row = el('<div class="opts"></div>');
      [a, b].forEach((x) => {
        const o = el('<button class="opt"><span class="ph-slot"></span><span class="zy">' + esc(x.name) + "</span></button>");
        o.querySelector(".ph-slot").replaceWith(Zoo.photo(x));
        o.onclick = () => {
          const ok = x.cons.rank > (x === a ? b : a).cons.rank;
          const hi = a.cons.rank > b.cons.rank ? a : b, lo = hi === a ? b : a;
          combo = ok ? combo + 1 : 0;
          if (ok) { score += 10; Fx.right(); }
          else { Fx.wrong(); wrongs.push({ animal: hi, answer: hi.name + "（" + hi.cons.name + "）比" + lo.name + "（" + lo.cons.name + "）危險" }); }
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
      const dq = duel.querySelector("#dq");
      const items = () => [[dq.textContent, dq], ["第1個，" + a.name, row.children[0]], ["第2個，" + b.name, row.children[1]]];
      dq.append(Speak.btn(items, "念題目和選項"));
      if (Speak.auto()) Speak.say(items());
    };
    const end = () => {
      const stars = score >= 50 ? 3 : score >= 30 ? 2 : score > 0 ? 1 : 0;
      Progress.stars("conserve", stars);
      if (stars === 3) Fx.confetti();
      duel.replaceChildren(el('<div><h3>完成！</h3><div class="stars" aria-label="' + stars + ' 顆星">' + "⭐".repeat(stars) + "☆".repeat(3 - stars) + "</div>" +
        '<div class="score">' + score + " / " + N * 10 + '</div><div id="rv"></div><p><button class="btn primary big">再玩一次</button></p></div>'));
      duel.querySelector("#rv").appendChild(Quiz.review(wrongs));
      duel.querySelector("button").onclick = playDuel;
    };
    next();
  }
  playDuel();
});
