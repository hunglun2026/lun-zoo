/* 翻牌配對：照片牌對名字牌。入門 6 對、挑戰 8 對，記翻牌次數與秒數。最適合低年級。 */
Zoo.boot(function (animals) {
  const { esc, el, shuffle } = Zoo;
  const root = document.getElementById("root");
  // 有本站縮圖的才出（翻牌很快，原照片太大會來不及載入）；名字太長的牌面放不下
  const pool = animals.filter((a) => a.thumb && !a.name_suspect && a.name.length <= 7);
  const MODES = { easy: { name: "入門", pairs: 6 }, hard: { name: "挑戰", pairs: 8 } };
  const bestKey = (m) => "zoo-best-memory-" + m;
  const getBest = (m) => { try { return +localStorage.getItem(bestKey(m)) || 0; } catch (e) { return 0; } };

  function menu() {
    root.replaceChildren(el(
      '<div class="panel"><p class="lead" style="margin-top:0">把動物的照片和名字配成一對。一次翻兩張，一樣的就留著，不一樣的會蓋回去。</p>' +
      '<p><button class="btn primary big" data-m="easy">入門（6 對）</button></p>' +
      '<p><button class="btn big" data-m="hard">挑戰（8 對）</button></p></div>'
    ));
    root.querySelectorAll("[data-m]").forEach((b) => (b.onclick = () => play(b.dataset.m)));
  }

  function play(mode) {
    const n = MODES[mode].pairs;
    // 盡量每一類都有，畫面比較熱鬧，也不會整盤都是長得很像的鳥
    const byGroup = Zoo.GROUPS.map((g) => shuffle(pool.filter((a) => a.group === g.id)));
    const picked = [];
    for (let k = 0; picked.length < n && k < 20; k++) byGroup.forEach((l) => { if (l[k] && picked.length < n) picked.push(l[k]); });
    const cards = shuffle(picked.flatMap((a) => [{ a, kind: "pic" }, { a, kind: "name" }]));
    let first = null, lock = false, flips = 0, found = 0;
    const t0 = Date.now();

    const head = el('<p class="lead" style="text-align:center">翻牌 <b id="flips">0</b> 次　配對 <b id="found">0</b> / ' + n + "</p>");
    const board = el('<div class="memory' + (n > 6 ? " m8" : "") + '"></div>');
    root.replaceChildren(head, board);

    cards.forEach((c) => {
      const b = el('<button class="mcard" aria-label="蓋著的牌"><span class="back" aria-hidden="true">🐾</span><span class="front"></span></button>');
      const front = b.querySelector(".front");
      if (c.kind === "pic") front.appendChild(Zoo.photo(c.a));
      else front.innerHTML = "<b>" + esc(c.a.name) + "</b>";
      c.btn = b;
      b.onclick = () => flip(c);
      board.appendChild(b);
    });

    function open(c, show) {
      c.btn.classList.toggle("up", show);
      c.btn.setAttribute("aria-label", show ? (c.kind === "pic" ? "照片：" : "名字：") + c.a.name : "蓋著的牌");
    }
    function flip(c) {
      if (lock || c.done || c === first) return;
      open(c, true);
      flips++;
      head.querySelector("#flips").textContent = flips;
      if (!first) { first = c; return; }
      const a = first;
      first = null;
      if (a.a === c.a) {
        a.done = c.done = true;
        a.btn.classList.add("ok"); c.btn.classList.add("ok");
        found++;
        head.querySelector("#found").textContent = found;
        Fx.right();
        if (found === n) setTimeout(done, 600);
      } else {
        lock = true;
        setTimeout(() => { open(a, false); open(c, false); lock = false; }, 1000);
      }
    }

    function done() {
      const sec = Math.round((Date.now() - t0) / 1000);
      // 最少要翻 2n 次；多翻幾次還算很棒
      const stars = flips <= n * 2 + 4 ? 3 : flips <= n * 2 + 12 ? 2 : 1;
      const prev = getBest(mode);
      try { if (!prev || flips < prev) localStorage.setItem(bestKey(mode), flips); } catch (e) { /* 忽略 */ }
      Progress.stars("memory-" + mode, stars);
      if (stars === 3) Fx.confetti();
      const box = el(
        '<div class="stage"><h2>全部配對完成！</h2><div class="stars" aria-label="' + stars + ' 顆星">' + "⭐".repeat(stars) + "☆".repeat(3 - stars) + "</div>" +
        "<p>翻了 <b>" + flips + "</b> 次，花了 <b>" + sec + "</b> 秒。" +
        (prev && flips < prev ? "🎊 打破紀錄！（上次 " + prev + " 次）" : prev ? "最佳紀錄：" + Math.min(prev, flips) + " 次" : "") + "</p>" +
        '<h3>這次認識的動物</h3><div class="chips" style="justify-content:center">' +
        picked.map((a) => '<a class="chip" style="text-decoration:none;color:inherit" href="/animals.html#' + encodeURIComponent(a.id) + '" target="_blank" rel="noopener">' + a.groupInfo.emoji + " " + esc(a.name) + "</a>").join("") +
        '</div><p><button class="btn primary big" id="again">再玩一次</button> <a class="btn big" href="/passport.html">看我的護照</a></p></div>'
      );
      root.replaceChildren(box);
      root.querySelector("#again").onclick = menu;
    }
  }
  menu();
});
