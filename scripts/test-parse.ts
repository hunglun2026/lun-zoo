// 用本機 animals.csv 驗證解析邏輯（不連網）。執行：npm test
import { readFileSync } from "node:fs";
import { parseCsv, toAnimals } from "../src/csv.ts";

const rows = parseCsv(readFileSync("animals.csv", "utf8"));
const animals = toAnimals(rows);
const fail: string[] = [];
const check = (ok: boolean, msg: string) => { if (!ok) fail.push(msg); };

check(rows.length === 313, `CSV 列數應為 313，實際 ${rows.length}`);
check(animals.length === 271, `去重後應為 271 種，實際 ${animals.length}`);
check(new Set(animals.map((a) => a.id)).size === animals.length, "id 有重複");
const codes = new Set(animals.map((a) => a.cons_code));
console.log("保育等級代碼分布：", Object.fromEntries([...codes].map((c) => [c || "(空)", animals.filter((a) => a.cons_code === c).length])));
check(!animals.some((a) => a.pics.includes("http://")), "照片網址還有 http://");
const suspects = animals.filter((a) => a.name_suspect).map((a) => `${a.name_ch}(${a.name_latin})`);
console.log("名字仍有「?」待人工確認：", suspects);
check(animals.some((a) => a.name_ch === "狐獴"), "狐獴 名字修正失敗");
check(animals.filter((a) => !a.cons_code).length < 60, "保育等級空白太多");
console.log(fail.length ? "FAIL\n" + fail.join("\n") : "PASS");
process.exit(fail.length ? 1 : 0);
