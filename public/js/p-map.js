/* 逛動物園：把動物依「在動物園哪裡看到」（location）分到各館區，排成一條從大門走到出口的小徑。
   點館區開面板看動物，點動物到小百科看介紹（會在探險護照蓋章）；每區顯示看過幾種。
   網址 #z=館區代號 可直接開某一區（從小百科返回時用）。 */
Zoo.boot(function (animals) {
  const { esc, el, photo } = Zoo;
  // 館區照逛的順序排。test 比對 location 切開後的每一段（先比先贏，所以穿山甲館、昆蟲館要放在熱帶雨林區前面）
  const ZONES = [
    { key: "panda", name: "大貓熊館", ico: "🐼", color: "#3a8fd9", test: /大貓熊|新光特展/, say: "大貓熊館在入口附近，先來看看國寶朋友。" },
    { key: "kids", name: "兒童動物區", ico: "🐐", color: "#e8873a", test: /兒童/, say: "兒童動物區的動物最親近人，慢慢走、輕輕看。" },
    { key: "taiwan", name: "臺灣動物區", ico: "🦌", color: "#2f8f5b", test: /臺灣|台灣/, say: "這裡住的都是臺灣自己的動物。" },
    { key: "pangolin", name: "穿山甲館", ico: "🦔", color: "#8a6a3d", test: /穿山甲/, say: "穿山甲館在熱帶雨林室內，要輕聲細語喔。" },
    { key: "rainforest", name: "熱帶雨林區", ico: "🌴", color: "#1f6f43", test: /熱帶雨林/, say: "熱帶雨林區又濕又熱，動物的顏色都很鮮豔。" },
    { key: "bird", name: "鳥園區", ico: "🦜", color: "#d9a21f", test: /鳥園/, say: "鳥園區有好多會飛的朋友，抬頭看看。" },
    { key: "reptile", name: "兩棲爬蟲動物館", ico: "🦎", color: "#6b8e23", test: /兩棲|爬蟲/, say: "兩棲爬蟲動物館裡有青蛙、蜥蜴和蛇。" },
    { key: "insect", name: "昆蟲館", ico: "🦋", color: "#b455a0", test: /昆蟲|室內館/, say: "昆蟲館裡的小動物要靠近看才看得清楚。" },
    { key: "africa", name: "非洲動物區", ico: "🦒", color: "#c9822b", test: /非洲/, say: "非洲動物區有長頸鹿、斑馬，草原好大。" },
    { key: "desert", name: "沙漠動物區", ico: "🐪", color: "#c8a45a", test: /沙漠/, say: "沙漠動物區又乾又熱，動物很會省水。" },
    { key: "australia", name: "澳洲動物區", ico: "🦘", color: "#d9623b", test: /澳洲/, say: "澳洲動物區有會跳的袋鼠。" },
    { key: "temperate", name: "溫帶動物區", ico: "🐻", color: "#5a7d9a", test: /溫帶/, say: "溫帶動物區的動物不怕冷。" },
    { key: "penguin", name: "企鵝館", ico: "🐧", color: "#2a6f9e", test: /企鵝/, say: "企鵝館很涼快，企鵝在水裡游得很快。" },
    { key: "koala", name: "無尾熊館", ico: "🐨", color: "#7a8b99", test: /無尾熊/, say: "無尾熊館的主角每天睡很久，不要吵牠。" },
  ];

  // 動物分到館區：location 用 ; 、 切成好幾段，一種動物可以住在好幾區
  ZONES.forEach((z) => { z.list = []; });
  animals.forEach((a) => {
    const hit = new Set();
    String(a.location || "").split(/[;；、,，]/).forEach((seg) => {
      const z = ZONES.find((x) => x.test.test(seg));
      if (z) hit.add(z);
    });
    hit.forEach((z) => z.list.push(a));
  });
  const zones = ZONES.filter((z) => z.list.length);
  zones.forEach((z) => { z.cover = z.list.find((a) => a.thumb) || z.list[0]; });

  const trail = document.getElementById("trail");
  const dlg = document.getElementById("zone");
  const body = document.getElementById("zone-body");
  const seenOf = (z) => { const s = Progress.get().seen; return z.list.filter((a) => s[a.id]).length; };

  function draw() {
    const s = Progress.get().seen;
    const done = zones.filter((z) => seenOf(z) === z.list.length).length;
    const total = animals.filter((a) => s[a.id]).length;
    trail.replaceChildren(
      el('<div class="gate"><span aria-hidden="true">🚪</span><b class="zy">動物園大門</b></div>'),
      ...zones.map((z, i) => stop(z, i)),
      el('<div class="gate end"><span aria-hidden="true">🏁</span><b class="zy">出口</b><small class="zy">逛完 ' + done + " / " + zones.length + " 區，看過 " + total + " 種動物</small></div>")
    );
  }
  function stop(z, i) {
    const n = seenOf(z), all = z.list.length, full = n === all;
    const b = el(
      '<button class="stop ' + (i % 2 ? "r" : "l") + (full ? " full" : "") + '" style="--c:' + z.color + '" aria-label="' + esc(z.name + "，看過 " + n + " 種，共 " + all + " 種") + '">' +
      '<span class="cover"></span><span class="txt"><b class="zy">' + z.ico + " " + esc(z.name) + "</b>" +
      '<small class="zy">看過 ' + n + " / " + all + " 種" + (full ? " ✅" : "") + '</small><span class="bar"><i style="width:' + Math.round((n / all) * 100) + '%"></i></span></span></button>'
    );
    b.querySelector(".cover").appendChild(photo(z.cover));
    b.onclick = () => open(z);
    return b;
  }

  function open(z) {
    history.replaceState(null, "", "#z=" + z.key);
    const n = seenOf(z);
    body.innerHTML =
      '<div class="dlg-bar"><button class="btn" id="zx">關閉 ✕</button></div>' +
      '<h2 style="margin-top:0;color:' + z.color + '" id="zname"><span class="zy">' + z.ico + " " + esc(z.name) + "</span></h2>" +
      '<p class="zy" id="zsay">' + esc(z.say) + "　這裡有 " + z.list.length + " 種動物，你看過 " + n + " 種。</p>" +
      '<div class="grid" id="zgrid"></div>';
    body.querySelector("#zname").append(Speak.btn(() => [[z.name + "。" + z.say, body.querySelector("#zsay")]], "念館區介紹"));
    const s = Progress.get().seen;
    body.querySelector("#zgrid").append(...z.list.map((a) => {
      const c = el('<a class="acard' + (s[a.id] ? " seen" : "") + '" href="/animals#' + encodeURIComponent(a.id) + '"><div class="info"><b class="zy">' + esc(a.name) + "</b><small>" + (s[a.id] ? "✅ 看過了" : a.groupInfo.emoji + " " + esc(a.groupInfo.name)) + "</small></div></a>");
      c.prepend(photo(a));
      return c;
    }));
    body.querySelector("#zx").onclick = () => dlg.close();
    if (!dlg.open) dlg.showModal();
    body.parentElement.scrollTop = 0;
  }
  dlg.addEventListener("close", () => { Speak.stop(); history.replaceState(null, "", location.pathname); });
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  // 從小百科按上一頁回來時，瀏覽器可能直接拿舊畫面，重畫一次才會更新「看過」
  addEventListener("pageshow", (e) => { if (e.persisted) draw(); });

  draw();
  const want = Zoo.hashParams().z;
  const hit = want && zones.find((z) => z.key === want);
  if (hit) open(hit);
});
