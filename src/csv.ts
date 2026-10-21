// CSV 解析與欄位清洗。不靠外部套件：來源檔有跨行欄位與雙引號，用小型狀態機處理。

export function parseCsv(text: string): Record<string, string>[] {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else inQ = false;
      } else cell += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  const head = rows.shift() ?? [];
  return rows.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? "").trim()])));
}

// 保育等級原文有 30 幾種寫法，統一成 IUCN 代碼
export function consCode(raw: string): string {
  const s = raw.replace(/\s/g, "");
  const byLetters = s.match(/(CR|EN|VU|NT|LC|DD|NE|EW)/);
  if (byLetters) return byLetters[1];
  if (s.includes("極危")) return "CR";
  if (s.includes("瀕危")) return "EN";
  if (s.includes("易危")) return "VU";
  if (s.includes("近危") || s.includes("接近受威脅")) return "NT";
  if (s.includes("暫無危機") || s.includes("無危")) return "LC";
  if (s.includes("資料不足")) return "DD";
  if (s.includes("未評估")) return "NE";
  if (s.includes("野外滅絕")) return "EW";
  return "";
}

// 來源檔把 Big5 打不出來的字變成「?」（如 狐獴→狐?）。只收確定的，不確定的標 name_suspect
export const NAME_FIXES: Record<string, string> = {
  "herpestes urva": "食蟹獴",
  "suricata suricatta": "狐獴",
  "eudocimus ruber": "美洲紅䴉",
  "threskiornis aethiopicus": "埃及聖䴉",
  "dromaius novaehollandiae": "鴯鶓",
};

function hash(s: string): string {
  let h = 5381;
  for (const ch of s) h = ((h << 5) + h + ch.codePointAt(0)!) >>> 0;
  return h.toString(36);
}

export function animalId(latin: string, nameCh: string): string {
  const l = latin.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return l || "zh-" + hash(nameCh);
}

export function https(u: string): string {
  return u.trim().replace(/^http:\/\//i, "https://");
}

export interface Animal {
  id: string; name_ch: string; name_en: string; name_latin: string; also_known: string;
  phylum: string; class: string; ord: string; family: string;
  cons_raw: string; cons_code: string;
  distribution: string; habitat: string; feature: string; behavior: string; diet: string; crisis: string;
  location: string; pics: string; videos: string; voices: string; name_suspect: number;
}

const textLen = (r: Record<string, string>) =>
  ["A_Feature", "A_Behavior", "A_Diet", "A_Habitat", "A_Distribution", "A_Crisis"].reduce((n, k) => n + (r[k]?.length ?? 0), 0);

// 把 CSV 列轉成「一種動物一筆」：同學名的重複列只留內容最多的那列
export function toAnimals(rows: Record<string, string>[]): Animal[] {
  const best = new Map<string, Record<string, string>>();
  for (const r of rows) {
    if (!r.A_Name_Ch) continue;
    const id = animalId(r.A_Name_Latin ?? "", r.A_Name_Ch);
    const cur = best.get(id);
    if (!cur || textLen(r) > textLen(cur)) best.set(id, r);
  }
  return [...best].map(([id, r]) => {
    const latinKey = (r.A_Name_Latin ?? "").trim().toLowerCase();
    let name = r.A_Name_Ch;
    let suspect = 0;
    if (/[?？�]/.test(name)) {
      if (NAME_FIXES[latinKey]) name = NAME_FIXES[latinKey];
      else suspect = 1;
    }
    const pics = [1, 2, 3, 4]
      .map((n) => ({ alt: r[`A_Pic0${n}_ALT`] ?? "", url: https(r[`A_Pic0${n}_URL`] ?? "") }))
      .filter((p) => p.url !== "");
    const voices = [1, 2, 3]
      .map((n) => ({ alt: r[`A_Voice0${n}_ALT`] ?? "", url: https(r[`A_Voice0${n}_URL`] ?? "") }))
      .filter((p) => p.url !== "");
    return {
      id, name_ch: name, name_en: r.A_Name_En ?? "", name_latin: r.A_Name_Latin ?? "",
      also_known: r.A_AlsoKnown ?? "", phylum: r.A_Phylum ?? "", class: r.A_Class ?? "",
      ord: r.A_Order ?? "", family: r.A_Family ?? "",
      cons_raw: r.A_Conservation ?? "", cons_code: consCode(r.A_Conservation ?? ""),
      distribution: r.A_Distribution ?? "", habitat: r.A_Habitat ?? "", feature: r.A_Feature ?? "",
      behavior: r.A_Behavior ?? "", diet: r.A_Diet ?? "", crisis: r.A_Crisis ?? "",
      location: r.A_Location ?? "", pics: JSON.stringify(pics), videos: https(r.A_Vedio_URL ?? ""),
      voices: JSON.stringify(voices), name_suspect: suspect,
    };
  });
}
