import type { Env } from "./env";
import { parseCsv, toAnimals, type Animal } from "./csv";
import { notifyError } from "./notify";

const META_URL = (id: string) => `https://data.gov.tw/api/v2/rest/dataset/${id}`;
const MIN_ROWS = 100; // 低於這個筆數視為來源異常，保留舊資料
// 來源伺服器卡住時不要無限等：逾時就當失敗，走 ntfy 通知
const get = (url: string) =>
  fetch(url, { headers: { "User-Agent": "Mozilla/5.0 zoo-explorer" }, signal: AbortSignal.timeout(20000) });

export interface SyncResult { status: "ok" | "skipped" | "error"; message: string; modified?: string; animals?: number }

async function log(env: Env, r: SyncResult, rows: number | null) {
  await env.DB.prepare(
    "INSERT INTO sync_log (ran_at, modified_date, status, row_count, animal_count, message) VALUES (?,?,?,?,?,?)",
  ).bind(new Date().toISOString(), r.modified ?? null, r.status, rows, r.animals ?? null, r.message).run();
}

// force=true：不管日期有沒有變都重匯入（手動補跑用）
export async function runSync(env: Env, force = false): Promise<SyncResult> {
  let rows: number | null = null;
  let res: SyncResult;
  try {
    const meta: any = await (await get(META_URL(env.DATASET_ID))).json();
    const r = meta.result ?? meta;
    const modified: string = r.modifiedDate;
    if (!modified) throw new Error("中繼資料沒有 modifiedDate，來源格式可能改版");
    const csvUrl: string | undefined = (r.distribution ?? []).find((d: any) => /csv/i.test(d.resourceFormat))?.resourceDownloadUrl;
    if (!csvUrl) throw new Error("中繼資料找不到 CSV 下載網址");

    const last = await env.DB.prepare("SELECT modified_date FROM sync_log WHERE status='ok' ORDER BY id DESC LIMIT 1").first<{ modified_date: string }>();
    if (!force && last?.modified_date === modified) {
      res = { status: "skipped", message: "資料沒有更新", modified };
      await log(env, res, null);
      return res;
    }

    const resp = await get(csvUrl);
    if (!resp.ok) throw new Error(`下載 CSV 失敗：HTTP ${resp.status}`);
    const parsed = parseCsv(await resp.text());
    rows = parsed.length;
    if (rows < MIN_ROWS) throw new Error(`CSV 只有 ${rows} 列（少於 ${MIN_ROWS}），疑似來源異常，已保留舊資料`);
    if (!("A_Name_Ch" in parsed[0]) || !("A_Name_Latin" in parsed[0])) throw new Error("CSV 缺少 A_Name_Ch／A_Name_Latin 欄位，欄位可能改版");

    const animals = toAnimals(parsed);
    await importAnimals(env, animals);
    res = { status: "ok", message: `匯入 ${animals.length} 種（CSV ${rows} 列）`, modified, animals: animals.length };
    await log(env, res, rows);
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res = { status: "error", message: msg };
    try { await log(env, res, rows); } catch { /* log 寫不進去也要繼續通知 */ }
    await notifyError(env, "動物探險家：資料同步失敗", msg);
    return res;
  }
}

const COLS = [
  "id", "name_ch", "name_en", "name_latin", "also_known", "phylum", "class", "ord", "family",
  "cons_raw", "cons_code", "distribution", "habitat", "feature", "behavior", "diet", "crisis",
  "location", "pics", "videos", "voices", "name_suspect",
] as const;

// 一個 batch ＝ 一個交易：先全部設為下架，再逐筆 upsert 設回上架。
// 任何一步失敗整批回滾，網站不會看到半套資料。
async function importAnimals(env: Env, animals: Animal[]) {
  const now = new Date().toISOString();
  const sql =
    `INSERT INTO animals (${COLS.join(",")}, active, synced_at) VALUES (${COLS.map(() => "?").join(",")}, 1, ?) ` +
    `ON CONFLICT(id) DO UPDATE SET ${COLS.filter((c) => c !== "id").map((c) => `${c}=excluded.${c}`).join(",")}, active=1, synced_at=excluded.synced_at`;
  const stmts = [env.DB.prepare("UPDATE animals SET active=0")];
  for (const a of animals) stmts.push(env.DB.prepare(sql).bind(...COLS.map((c) => (a as any)[c]), now));
  await env.DB.batch(stmts);
}
