/* 猜猜我是誰：線索由模糊到明確，最後照片從模糊變清楚。
   單人挑戰：4 選 1，越早猜中分數越高。全班搶答：老師投影、控制線索，學生舉手搶答。 */
Zoo.boot(function (animals) {
  const { esc, el, shuffle } = Zoo;
  const root = document.getElementById("root");
  const pool = animals.filter((a) => a.quizReady && a.hasPhoto && a.goodClue);

  const mask = Zoo.mask; // 線索文字常含動物自己的名字，遮起來才不會一眼破題
  function clues(a) {
    const dietWord = a.dietKey === "omni" ? "什麼都吃" : a.dietInfo.name;
    return [
      { label: "我住在哪裡", text: "我住在" + a.habitatInfo.emoji + a.habitatInfo.name + "。" },
      { label: "我吃什麼", text: "我喜歡" + dietWord + "。" },
      { label: "我是哪一類", text: "我是" + a.groupInfo.emoji + a.groupInfo.name + "。" },
      { label: "我的特徵", text: mask(a, a.feature1) },
      { label: "我的家鄉", text: mask(a, a.simple.replace(/^.*家鄉在：/, "").replace(/。$/, "")) || "（動物園沒有寫）" },
      { label: "我的照片", text: "", photo: true },
    ];
  }

  function menu() {
    root.replaceChildren(el(
      '<div class="panel"><p class="lead" style="margin-top:0">線索會一個一個出現：住哪裡、吃什麼、哪一類、特徵、家鄉，最後看照片。越早猜中，分數越高。</p>' +
      '<p><button class="btn primary big" id="solo">單人挑戰（8 題）</button></p>' +
      '<p><button class="btn big" id="class">全班搶答（老師投影）</button></p></div>'
    ));
    root.querySelector("#solo").onclick = solo;
    root.querySelector("#class").onclick = classMode;
  }

  function clueBox(a, cs, shown) {
    const box = el("<div></div>");
    cs.slice(0, shown).forEach((c, i) => {
      if (c.photo) {
        const p = Zoo.photo(a, 0);
        p.style.filter = "none";
        box.appendChild(p);
      } else {
        box.appendChild(el('<div class="clue"><small>線索 ' + (i + 1) + "・" + c.label + "</small><br>" + esc(c.text) + "</div>"));
      }
    });
    return box;
  }

  // ---- 單人 ----
  function solo() {
    const picked = shuffle(pool).slice(0, 8);
    let idx = 0, score = 0;
    const next = () => (idx >= picked.length ? done() : round(picked[idx]));
    function round(a) {
      const cs = clues(a);
      let shown = 1;
      const sameGroup = shuffle(pool.filter((x) => x.group === a.group && x !== a));
      const distract = sameGroup.concat(shuffle(pool.filter((x) => x.group !== a.group))).slice(0, 3);
      const options = shuffle([a].concat(distract));
      root.replaceChildren(el(
        '<div class="stage"><div class="bar"><i style="width:' + (idx / picked.length) * 100 + '%"></i></div>' +
        "<p>第 " + (idx + 1) + " / " + picked.length + " 題　⭐ " + score + ' 分</p><div id="clues"></div>' +
        '<div class="opts" id="opts"></div><p><button class="btn" id="more">再給我一個線索（-1 分）</button></p>' +
        '<div class="feedback" id="fb" role="status" aria-live="polite"></div><div id="nx"></div></div>'
      ));
      const clueEl = root.querySelector("#clues"), opts = root.querySelector("#opts"), more = root.querySelector("#more"), fb = root.querySelector("#fb");
      const draw = () => {
        clueEl.replaceChildren(clueBox(a, cs, shown));
        more.disabled = shown >= cs.length;
      };
      let over = false;
      const finishRound = (ok) => {
        over = true;
        const pts = ok ? Math.max(1, 7 - shown) : 0;
        score += pts;
        shown = cs.length; draw(); more.remove();
        opts.querySelectorAll(".opt").forEach((b) => { b.disabled = true; if (b.dataset.id === a.id) b.classList.add("right"); });
        fb.className = "feedback " + (ok ? "ok" : "no");
        fb.innerHTML = (ok ? "答對了！🎉 +" + pts + " 分。" : "答案是 <b>" + esc(a.name) + "</b>。") + ' <a href="/animals.html#' + encodeURIComponent(a.id) + '" target="_blank" rel="noopener">看牠的介紹</a>';
        const b = el('<button class="btn primary big">' + (idx === picked.length - 1 ? "看成績 🏆" : "下一題 ➜") + "</button>");
        b.onclick = () => { idx++; next(); };
        root.querySelector("#nx").appendChild(b); b.focus();
      };
      options.forEach((o) => {
        const b = el('<button class="opt">' + esc(o.name) + "</button>");
        b.dataset.id = o.id;
        b.onclick = () => {
          if (over) return;
          if (o.id === a.id) return finishRound(true);
          b.disabled = true; b.classList.add("wrong");
          if (shown < cs.length) { shown++; draw(); fb.className = "feedback no"; fb.textContent = "不是喔，再給你一個線索！"; }
          else finishRound(false);
        };
        opts.appendChild(b);
      });
      more.onclick = () => { if (shown < cs.length) { shown++; draw(); } };
      draw();
    }
    function done() {
      const total = picked.length * 6;
      let best = 0;
      try { best = +localStorage.getItem("zoo-best-guess") || 0; localStorage.setItem("zoo-best-guess", Math.max(best, score)); } catch (e) { /* 忽略 */ }
      root.replaceChildren(el(
        '<div class="stage"><h2>猜謎完成！</h2><div class="score">' + score + " / " + total + "</div>" +
        "<p>" + (score >= total * 0.7 ? "你是觀察小偵探！🕵️" : "多看幾次線索，下次一定更厲害！") + "</p>" +
        (best ? "<p>最佳紀錄：" + Math.max(best, score) + " 分</p>" : "") +
        '<p><button class="btn primary big" id="again">再玩一次</button> <a class="btn big" href="/">回首頁</a></p></div>'
      ));
      root.querySelector("#again").onclick = menu;
    }
    next();
  }

  // ---- 全班搶答 ----
  function classMode() {
    const order = shuffle(pool);
    let idx = 0, shown = 1, revealed = false, a = order[0], cs = clues(a);
    root.replaceChildren(el(
      '<div class="stage"><p id="info" class="lead" style="margin-top:0"></p><div id="clues"></div>' +
      '<div id="ans" style="font-size:2.4rem;font-weight:800;color:var(--green-d)"></div>' +
      '<p style="margin-top:16px"><button class="btn primary big" id="more">下一個線索（空白鍵）</button> ' +
      '<button class="btn big" id="rev">揭曉答案</button> <button class="btn big" id="nxt">換下一隻 ➜</button></p>' +
      '<p style="font-size:.85rem;color:var(--ink2)">提醒：老師用「老師專區」的搶答計分板記分。</p></div>'
    ));
    const clueEl = root.querySelector("#clues"), ans = root.querySelector("#ans");
    const draw = () => {
      root.querySelector("#info").textContent = "第 " + (idx + 1) + " 隻　線索 " + shown + " / " + cs.length;
      clueEl.replaceChildren(clueBox(a, cs, shown));
      ans.textContent = revealed ? a.name : "";
      root.querySelector("#more").disabled = shown >= cs.length || revealed;
    };
    const moreClue = () => { if (!revealed && shown < cs.length) { shown++; draw(); } };
    root.querySelector("#more").onclick = moreClue;
    root.querySelector("#rev").onclick = () => { revealed = true; shown = cs.length; draw(); };
    root.querySelector("#nxt").onclick = () => {
      idx = (idx + 1) % order.length; a = order[idx]; cs = clues(a); shown = 1; revealed = false; draw();
    };
    const key = (e) => {
      if (!document.body.contains(root.querySelector("#more"))) return document.removeEventListener("keydown", key);
      if (e.code === "Space" && e.target === document.body) { e.preventDefault(); moreClue(); }
    };
    document.addEventListener("keydown", key);
    draw();
  }
  menu();
});
