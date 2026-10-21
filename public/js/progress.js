/* 探險護照的紀錄：看過哪些動物、各遊戲最好幾顆星、徽章。只存在這台裝置的 localStorage，不上傳、不蒐集個資。
   Progress.seen(id)、Progress.stars(key, n)、Progress.badges(animals)、Progress.get()、Progress.clear() */
window.Progress = (function () {
  "use strict";
  const KEY = "zoo-progress-v1";
  function get() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || "null");
      if (s && s.seen) return s;
    } catch (e) { /* 無痕模式 */ }
    return { seen: {}, stars: {} };
  }
  function update(fn) {
    const s = get();
    fn(s);
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* 存不了就算了，不影響遊戲 */ }
  }
  const seen = (id) => update((s) => { s.seen[id] = s.seen[id] || Date.now(); });
  const stars = (key, n) => update((s) => { s.stars[key] = Math.max(s.stars[key] || 0, n); });
  const clear = () => { try { localStorage.removeItem(KEY); } catch (e) { /* 忽略 */ } };

  // 各遊戲在護照上顯示的名字（key 要跟各遊戲存星數用的一樣）
  const GAMES = [
    ["classify-easy", "分類闖關・入門"], ["classify-hard", "分類闖關・挑戰"], ["classify-easy-timed", "分類闖關・60 秒"],
    ["habitat", "誰住哪裡"], ["habitat-timed", "誰住哪裡・60 秒"], ["guess", "猜猜我是誰"],
    ["conserve", "誰比較危險"], ["memory-easy", "翻牌配對・入門"], ["memory-hard", "翻牌配對・挑戰"],
  ];

  // 徽章：有沒有拿到全部從紀錄算出來，不另外存，規則改了舊紀錄也會跟著對
  function badges(animals) {
    const s = get();
    const seenA = animals.filter((a) => s.seen[a.id]);
    const st = (k) => s.stars[k] || 0;
    const list = [
      ["👣", "第一步", "在小百科看第 1 種動物", seenA.length >= 1],
      ["📖", "動物百科通", "在小百科看過 50 種動物", seenA.length >= 50],
      ["🧩", "分類小達人", "六大類動物都至少看過一種", Zoo.GROUPS.every((g) => seenA.some((a) => a.group === g.id))],
      ["🌏", "保育小尖兵", "看過 10 種有危險的動物（極危、瀕危、易危）", seenA.filter((a) => ["CR", "EN", "VU"].includes(a.cons_code)).length >= 10],
      ["🏆", "闖關高手", "分類闖關挑戰拿到三顆星", st("classify-hard") >= 3],
      ["🗺️", "棲地專家", "誰住哪裡拿到三顆星", st("habitat") >= 3],
      ["🕵️", "觀察小偵探", "猜猜我是誰拿到三顆星", st("guess") >= 3],
      ["⚡", "閃電快手", "任一個 60 秒挑戰拿到三顆星", st("classify-easy-timed") >= 3 || st("habitat-timed") >= 3],
      ["🃏", "翻牌記憶王", "完成翻牌配對挑戰（8 對）", st("memory-hard") >= 1],
      ["🛡️", "保育判斷王", "誰比較危險拿到三顆星", st("conserve") >= 3],
    ];
    return list.map(([icon, name, how, got]) => ({ icon, name, how, got }));
  }
  return { get, seen, stars, clear, badges, GAMES };
})();
