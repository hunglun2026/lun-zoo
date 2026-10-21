// 用真實 CSV 檢查棲地／食性分類規則（不連網）：npm run test:classify
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { parseCsv, toAnimals } from "../src/csv.ts";

const win: any = {};
vm.runInNewContext(readFileSync("public/js/data.js", "utf8"), { window: win, document: {}, localStorage: {}, fetch: () => {}, Image: class {} });
const Z = win.Zoo;
const animals = toAnimals(parseCsv(readFileSync("animals.csv", "utf8"))).map((a: any) => {
  a.pics = JSON.parse(a.pics); a.voices = JSON.parse(a.voices); return Z.enrich(a);
});
const tally = (f: (a: any) => string) => {
  const m: Record<string, number> = {};
  animals.forEach((a: any) => { const k = f(a); m[k] = (m[k] || 0) + 1; });
  return m;
};
console.log("類別", tally((a) => a.groupInfo.name));
console.log("棲地", tally((a) => a.habitatInfo?.name ?? "(無)"));
console.log("食性", tally((a) => a.dietInfo?.name ?? "(無)"));
console.log("好線索", animals.filter((a: any) => a.goodClue).length, "猜謎可用", animals.filter((a: any) => a.quizReady && a.hasPhoto && a.goodClue).length); console.log("棲地明確", animals.filter((a: any) => a.habitatClear).length); console.log("可出題", animals.filter((a: any) => a.quizReady).length, "/", animals.length, " 有照片", animals.filter((a: any) => a.hasPhoto).length);
for (const n of ["大貓熊", "雲豹", "企鵝", "國王企鵝", "非洲象", "斯文豪氏赤蛙", "鈷藍箭毒蛙", "紅鶴", "黑猩猩"]) {
  const a: any = animals.find((x: any) => x.nameClean.includes(n));
  if (a) console.log(a.nameClean, "|", a.habitatInfo?.name, "|", a.dietInfo?.name, "|", a.habitat.slice(0, 30).replace(/\n/g, " "), "|", a.diet.slice(0, 25).replace(/\n/g, " "));
}
for (const a of animals.filter((x: any) => !x.habitatInfo).slice(0, 5)) console.log("無棲地:", a.nameClean, "|", a.habitat.slice(0, 40));
console.log(animals.find((a: any) => a.nameClean === "大貓熊").simple);
