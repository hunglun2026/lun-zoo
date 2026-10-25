/* 猜猜我是誰。單人挑戰：先給照片，4 選 1，看不出來再按「再給我一個線索」（文字提示），越早猜中分數越高。
   全班搶答：老師投影、控制線索，同樣先出照片，文字線索由老師一個一個加，學生舉手搶答。 */
Zoo.boot(function (animals) {
  const { esc, el, shuffle } = Zoo;
  const root = document.getElementById("root");
  const pool = animals.filter((a) => a.quizReady && a.hasPhoto && a.goodClue);

  const mask = Zoo.mask; // 線索文字常含動物自己的名字，遮起來才不會一眼破題
  function clues(a, photoFirst) {
    const dietWord = a.dietKey === "omni" ? "什麼都吃" : a.dietInfo.name;
    const list = [
      { label: "我住在哪裡", text: "我住在" + a.habitatInfo.emoji + a.habitatInfo.name + "。" },
      { label: "我吃什麼", text: "我喜歡" + dietWord + "。" },
      { label: "我是哪一類", text: "我是" + a.groupInfo.emoji + a.groupInfo.name + "。" },
      { label: "我的特徵", text: mask(a, a.feature1) },
      { label: "我的家鄉", text: mask(a, a.simple.replace(/^.*家鄉在：/, "").replace(/。$/, "")) || "（動物園沒有寫）" },
    ];
    const pic = { label: "我的照片", text: "", photo: true };
    return photoFirst ? [pic].concat(list) : list.concat(pic);
  }

  function menu() {
    root.replaceChildren(el(
      '<div class="panel"><p class="lead zy" style="margin-top:0">線索一個一個出現，越早猜中，分數越高。</p>' +
      '<p><button class="btn primary big zy" id="solo">單人挑戰（8 題）</button></p>' +
      '<p><button class="btn big zy" id="class">全班搶答</button> <small>老師用投影機，學生舉手</small></p></div>'
    ));
    root.querySelector("#solo").onclick = () => solo();
    root.querySelector("#class").onclick = classMode;
  }

  function clueBox(a, cs, shown) {
    const box = el("<div></div>");
    let n = 0; // 文字線索的編號（照片不算）
    cs.slice(0, shown).forEach((c) => {
      if (c.photo) {
        const p = Zoo.photo(a);
        p.style.filter = "none";
        box.appendChild(p);
      } else {
        const d = el('<div class="clue"><small>線索 ' + (i + 1) + "・" + c.label + '</small><br><span class="zy">' + esc(c.text) + "</span></div>");
        d.dataset.say = c.label + "。" + c.text;
        d.querySelector("small").after(Speak.btn(() => [[d.dataset.say, d]], "念這個線索"));
        box.appendChild(d);
      }
    });
    return box;
  }
  // 念最新出現的線索（學生按過喇叭之後、或老師投影時）
  const readLast = (clueEl) => {
    const all = clueEl.querySelectorAll(".clue"), d = all[all.length - 1];
    if (d) Speak.say([[d.dataset.say, d]]);
  };

  // ---- 單人 ----
  // list：「只練錯的」時傳入上一輪答錯的動物
  function solo(list) {
    const picked = list ? shuffle(list) : shuffle(pool).slice(0, 8);
    let idx = 0, score = 0, combo = 0;
    const wrongs = [];
    // 第一次玩：小手帶著選答案、找到「下一題」（「只練錯的」複習不用）
    const tour = !list && window.Guide ? Guide.tour("guess") : null;
    const next = () => (idx >= picked.length ? done() : round(picked[idx]));
    function round(a) {
      const cs = clues(a, true); // 單人挑戰先給照片
      let shown = 1;
      const sameGroup = shuffle(pool.filter((x) => x.group === a.group && x !== a));
      const distract = sameGroup.concat(shuffle(pool.filter((x) => x.group !== a.group))).slice(0, 3);
      const options = shuffle([a].concat(distract));
      root.replaceChildren(el(
        '<div class="stage"><div class="bar"><i style="width:' + (idx / picked.length) * 100 + '%"></i></div>' +
        "<p>第 " + (idx + 1) + " / " + picked.length + " 題　⭐ " + score + " 分</p>" +
        (combo >= 2 ? '<p class="combo">🔥 連續答對 ' + combo + " 題！</p>" : "") + '<div id="clues"></div>' +
        '<div class="opts" id="opts"></div><p><button class="btn" id="more">再給我一個線索（-1 分）</button></p>' +
        '<div class="feedback" id="fb" role="status" aria-live="polite"></div><div id="nx"></div></div>'
      ));
      const clueEl = root.querySelector("#clues"), opts = root.querySelector("#opts"), more = root.querySelector("#more"), fb = root.querySelector("#fb");
      const draw = () => {
        clueEl.replaceChildren(clueBox(a, cs, shown));
        more.disabled = shown >= cs.length;
        if (Speak.auto() && !over) readLast(clueEl);
      };
      let over = false, missed = false; // missed：這題有沒有猜錯過，猜錯過就列入複習
      const finishRound = (ok) => {
        over = true;
        const pts = ok ? Math.max(1, 7 - shown) : 0;
        score += pts;
        combo = ok ? combo + 1 : 0;
        if (ok) Fx.right();
        if (!ok || missed) wrongs.push({ animal: a, answer: a.name });
        shown = cs.length; draw(); more.remove();
        opts.querySelectorAll(".opt").forEach((b) => { b.disabled = true; if (b.dataset.id === a.id) b.classList.add("right"); });
        fb.className = "feedback " + (ok ? "ok" : "no");
        fb.innerHTML = (ok ? "答對了！🎉 +" + pts + " 分。" : "答案是 <b>" + esc(a.name) + "</b>。") + ' <a href="/animals#' + encodeURIComponent(a.id) + '" target="_blank" rel="noopener">看牠的介紹</a>';
        if (Speak.auto()) Speak.say(ok ? "答對了！" : "答案是" + a.name);
        const b = el('<button class="btn primary big">' + (idx === picked.length - 1 ? "看成績 🏆" : "下一題 ➜") + "</button>");
        b.onclick = () => { if (tour) tour.done(); idx++; next(); };
        root.querySelector("#nx").appendChild(b); b.focus();
        if (tour) tour.say(b, "按下一題");
      };
      options.forEach((o) => {
        const b = el('<button class="opt zy">' + esc(o.name) + "</button>");
        b.dataset.id = o.id;
        b.onclick = () => {
          if (over) return;
          if (o.id === a.id) return finishRound(true);
          b.disabled = true; b.classList.add("wrong"); Fx.wrong(); missed = true;
          if (shown < cs.length) { shown++; draw(); fb.className = "feedback no"; fb.textContent = "不是喔，再給你一個線索！"; }
          else finishRound(false);
        };
        opts.appendChild(b);
      });
      more.onclick = () => { if (shown < cs.length) { shown++; draw(); } };
      draw();
      if (tour && idx === 0) tour.say(opts, "看線索，選一個");
    }
    function done() {
      const total = picked.length * 6;
      const stars = score >= total * 0.7 ? 3 : score >= total * 0.4 ? 2 : score > 0 ? 1 : 0;
      let best = 0;
      // 「只練錯的」是複習，不記最佳分數與護照星數
      if (!list) {
        try { best = +localStorage.getItem("zoo-best-guess") || 0; localStorage.setItem("zoo-best-guess", Math.max(best, score)); } catch (e) { /* 忽略 */ }
        Progress.stars("guess", stars);
      }
      if (stars === 3) Fx.confetti();
      const box = el(
        '<div class="stage"><h2>猜謎完成！</h2><div class="stars" aria-label="' + stars + ' 顆星">' + "⭐".repeat(stars) + "☆".repeat(3 - stars) + "</div>" +
        '<div class="score">' + score + " / " + total + "</div>" +
        "<p>" + (stars === 3 ? "你是觀察小偵探！🕵️" : "多看幾次線索，下次一定更厲害！") + "</p>" +
        (best ? "<p>最佳紀錄：" + Math.max(best, score) + " 分</p>" : "") +
        '<div id="rv"></div><p><button class="btn primary big" id="again">再玩一次</button> ' +
        (wrongs.length ? '<button class="btn big" id="redo">只練錯的（' + wrongs.length + " 題）</button> " : "") +
        '<a class="btn big" href="/passport">看我的護照</a></p></div>'
      );
      box.querySelector("#rv").appendChild(Quiz.review(wrongs));
      root.replaceChildren(box);
      root.querySelector("#again").onclick = menu;
      const redo = root.querySelector("#redo");
      if (redo) redo.onclick = () => solo(wrongs.map((w) => w.animal));
    }
    next();
  }

  // ---- 全班搶答 ----
  function classMode() {
    const order = shuffle(pool);
    let idx = 0, shown = 1, revealed = false, a = order[0], cs = clues(a, true);
    root.replaceChildren(el(
      '<div class="stage"><p id="info" class="lead" style="margin-top:0"></p><div id="clues"></div>' +
      '<div id="ans" style="font-size:2.4rem;font-weight:800;color:var(--green-d)"></div>' +
      '<p style="margin-top:16px"><button class="btn primary big" id="more">下一個線索（空白鍵）</button> ' +
      '<button class="btn big" id="rev">揭曉答案</button> <button class="btn big" id="nxt">換下一隻 ➜</button> <button class="btn big" id="autoread" aria-pressed="true">🔊 自動念：開</button></p>' +
      '<p style="font-size:.85rem;color:var(--ink2)">提醒：老師用「老師專區」的搶答計分板記分。</p></div>'
    ));
    const clueEl = root.querySelector("#clues"), ans = root.querySelector("#ans");
    const draw = () => {
      root.querySelector("#info").textContent = "第 " + (idx + 1) + " 隻　線索 " + shown + " / " + cs.length;
      clueEl.replaceChildren(clueBox(a, cs, shown));
      ans.textContent = revealed ? a.name : "";
      root.querySelector("#more").disabled = shown >= cs.length || revealed;
      if (!loud) return;
      if (revealed) Speak.say("答案是：" + a.name); else readLast(clueEl);
    };
    // 投影給全班聽：預設自動念（老師不用每條自己念），可以關掉
    let loud = true;
    const ar = root.querySelector("#autoread");
    ar.onclick = () => { loud = !loud; ar.textContent = loud ? "🔊 自動念：開" : "🔇 自動念：關"; ar.setAttribute("aria-pressed", String(loud)); if (!loud) Speak.stop(); };
    const moreClue = () => { if (!revealed && shown < cs.length) { shown++; draw(); } };
    root.querySelector("#more").onclick = moreClue;
    root.querySelector("#rev").onclick = () => { revealed = true; shown = cs.length; draw(); };
    root.querySelector("#nxt").onclick = () => {
      idx = (idx + 1) % order.length; a = order[idx]; cs = clues(a, true); shown = 1; revealed = false; draw();
    };
    const key = (e) => {
      if (!document.body.contains(root.querySelector("#more"))) return document.removeEventListener("keydown", key);
      if (e.code === "Space" && e.target === document.body) { e.preventDefault(); moreClue(); }
    };
    document.addEventListener("keydown", key);
    draw();
  }
  // 首頁推薦卡與老師的班級連結會帶 #m=solo／class，直接開局不經過選單
  const direct = Zoo.hashParams().m;
  if (direct === "solo") solo();
  else if (direct === "class") classMode();
  else menu();
});
