/* 出題產生器：學習單與「出題投影」共用。
   Qgen.make(pool, types, n, all) → [{ kind, animal, q, choices[], answer, pic }]
   all：全部動物，主題內同類動物不夠 3 隻時從這裡補干擾選項（例如「極地冰原」只有幾隻）。
   pic＝true 的題目要配動物照片（看圖認動物），照片用本站縮圖，列印也印得出來。
   choices 是顯示用文字；answer 是正確答案文字。所有題目都是選擇題，答案唯一。 */
(function () {
  "use strict";
  const { shuffle } = Zoo;

  const KINDS = {
    habitat: { name: "住在哪裡", ok: (a) => a.habitatClear && a.habitatInfo },
    group: { name: "屬於哪一類", ok: () => true },
    diet: { name: "喜歡吃什麼", ok: (a) => a.dietInfo },
    // 猜謎要有「特徵」線索才能唯一指到一種動物，只有棲地、食性、類別的話符合的動物太多
    riddle: { name: "猜猜我是誰", ok: (a) => a.habitatInfo && a.goodClue },
    picture: { name: "看圖認動物", ok: (a) => a.thumb },
  };

  function build(kind, a, pool, all) {
    if (kind === "habitat") {
      const others = shuffle(Zoo.HABITATS.filter((h) => h.id !== a.habitatInfo.id)).slice(0, 3);
      const ch = shuffle([a.habitatInfo].concat(others)).map((h) => h.emoji + h.name);
      return { q: a.name + " 住在哪裡？", choices: ch, answer: a.habitatInfo.emoji + a.habitatInfo.name };
    }
    if (kind === "group") {
      const others = shuffle(Zoo.GROUPS.filter((g) => g.id !== a.group)).slice(0, 3);
      const ch = shuffle([a.groupInfo].concat(others)).map((g) => g.emoji + g.name);
      return { q: a.name + " 是哪一類動物？", choices: ch, answer: a.groupInfo.emoji + a.groupInfo.name };
    }
    if (kind === "diet") {
      const ch = Object.values(Zoo.DIETS).map((d) => d.emoji + d.name);
      return { q: a.name + " 喜歡吃什麼？", choices: ch, answer: a.dietInfo.emoji + a.dietInfo.name };
    }
    // 干擾選項：主題內同類 → 全部同類 → 主題內其他 → 全部其他，湊滿 3 個。同類優先，不然一看類別就知道答案
    const ok = (x) => x.id !== a.id && !x.name_suspect;
    const src = all || pool;
    const same = [...new Set([].concat(
      shuffle(pool.filter((x) => ok(x) && x.group === a.group)), shuffle(src.filter((x) => ok(x) && x.group === a.group)),
      shuffle(pool.filter(ok)), shuffle(src.filter(ok))))].slice(0, 3);
    if (kind === "picture") {
      return { q: "照片裡的是哪一種動物？", choices: shuffle([a].concat(same)).map((x) => x.name), answer: a.name, pic: true };
    }
    // 猜謎：類別＋棲地＋一句遮住名字的特徵，從四個同類動物裡選
    const names = shuffle([a].concat(same)).map((x) => x.name);
    return {
      q: "我是" + a.groupInfo.name + "，我住在" + a.habitatInfo.name + "。" + Zoo.mask(a, a.feature1) + " 我是誰？",
      choices: names,
      answer: a.name,
    };
  }

  function make(pool, types, n, all) {
    const out = [];
    const used = new Set();
    const order = shuffle(pool.filter((a) => !a.name_suspect));
    let t = 0;
    for (const a of order) {
      if (out.length >= n) break;
      // 這隻動物適合哪種題型，從輪到的題型開始找
      for (let k = 0; k < types.length; k++) {
        const kind = types[(t + k) % types.length];
        if (!used.has(a.id) && KINDS[kind].ok(a)) {
          out.push(Object.assign({ kind, animal: a }, build(kind, a, pool, all)));
          used.add(a.id);
          t = (t + k + 1) % types.length;
          break;
        }
      }
    }
    return out;
  }
  window.Qgen = { make, KINDS };
})();
