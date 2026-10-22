/* 注音（低年級）：頁面在要加注音的元素加 class="zy"，低年級時自動在字上方加注音，換年級立刻加上或拿掉。
   注音資料 zhuyin.json 由 scripts/build-zhuyin.py 產生：w＝整詞讀音（動物名字、多音詞），c＝單字預設讀音。
   只有低年級才下載這份資料。 */
(function () {
  "use strict";
  let data = null, loading = null;
  const CJK = new RegExp("[" + String.fromCharCode(0x3400) + "-" + String.fromCharCode(0x9fff) + "]"); // 中文字範圍（寫成數字，字型子集才不會把這兩個邊界字當成網站用字）

  function load() {
    loading = loading || fetch("/js/zhuyin.json?v=13").then((r) => r.json()).then((d) => {
      data = d;
      data.maxW = Math.max(1, ...Object.keys(d.w).map((k) => k.length));
    }).catch(() => { loading = null; });
    return loading;
  }

  // 一段文字轉成 ruby：先找最長的整詞，找不到用單字讀音；不是中文字原樣保留
  function rubyHTML(text) {
    let out = "", i = 0;
    while (i < text.length) {
      let hit = null;
      for (let n = Math.min(data.maxW, text.length - i); n >= 2 && !hit; n--) {
        const w = text.substr(i, n);
        if (data.w[w]) hit = [w, data.w[w]];
      }
      if (hit) {
        [...hit[0]].forEach((ch, k) => { out += "<ruby>" + ch + "<rt>" + hit[1][k] + "</rt></ruby>"; });
        i += hit[0].length;
        continue;
      }
      const ch = text[i];
      out += CJK.test(ch) && data.c[ch] ? "<ruby>" + ch + "<rt>" + data.c[ch] + "</rt></ruby>" : Zoo.esc(ch);
      i++;
    }
    return out;
  }

  // 把 .zy 裡的每個文字節點換成注音；原文記在 data-t，拿掉注音時換回來
  function addTo(root) {
    const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (CJK.test(n.nodeValue) && !n.parentElement.closest(".zyw,rt,button.spk") ? 1 : 3),
    });
    const nodes = [];
    while (walk.nextNode()) nodes.push(walk.currentNode);
    nodes.forEach((n) => {
      const s = document.createElement("span");
      s.className = "zyw";
      s.dataset.t = n.nodeValue;
      s.innerHTML = rubyHTML(n.nodeValue);
      n.replaceWith(s);
    });
  }
  function removeFrom(root) {
    root.querySelectorAll(".zyw").forEach((s) => s.replaceWith(document.createTextNode(s.dataset.t)));
  }

  const isLow = () => Zoo.grade() === "low";
  async function apply(root) {
    const up = root.closest && root.closest(".zy");
    const targets = up ? [up] : [...root.querySelectorAll(".zy")];
    if (!targets.length) return;
    if (!isLow()) { targets.forEach(removeFrom); return; }
    await load();
    if (data && isLow()) targets.forEach(addTo);
  }

  // 新畫出來的 .zy（遊戲換題、開詳細介紹）也自動加
  new MutationObserver((muts) => {
    if (!isLow()) return;
    muts.forEach((m) => m.addedNodes.forEach((n) => {
      const e = n.nodeType === 1 ? n : n.parentElement; // 頁面直接改 textContent 時加進來的是文字節點
      if (e && !e.closest(".zyw")) apply(e);
    }));
  }).observe(document.body, { childList: true, subtree: true });
  document.addEventListener("zoo-grade", () => apply(document.body));
  apply(document.body);
})();
