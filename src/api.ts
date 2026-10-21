import type { Env } from "./env";

const json = (data: unknown, cache: string) =>
  new Response(JSON.stringify(data), {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": cache },
  });

// 邊緣快取：同一個機房的請求直接回存好的結果，不查 D1（D1 查一次要 0.3～1 秒）。
// 快取鍵帶 APP_VERSION（部署新版自動換新）與前端傳的 m（meta 的 syncedAt＝最後一次成功匯入時間），
// 同步（含手動強制同步）後前端拿到新的 syncedAt，抓資料時就是新的鍵，不會拿到舊資料卻當成新的存起來。
async function edge(url: URL, env: Env, ctx: ExecutionContext, cache: string, build: () => Promise<unknown>) {
  const key = new Request(`${url.origin}${url.pathname}?app=${encodeURIComponent(env.APP_VERSION)}&m=${encodeURIComponent(url.searchParams.get("m") ?? "")}`);
  const hit = await caches.default.match(key);
  if (hit) return hit;
  const res = json(await build(), cache);
  ctx.waitUntil(caches.default.put(key, res.clone()));
  return res;
}

export async function handleApi(url: URL, env: Env, ctx: ExecutionContext): Promise<Response> {
  if (url.pathname === "/api/meta") {
    // 瀏覽器 60 秒、機房 5 分鐘：同步完最晚 5 分鐘大家就會看到新日期
    return edge(url, env, ctx, "public, max-age=60, s-maxage=300", async () => {
      const last = await env.DB.prepare("SELECT modified_date, ran_at, animal_count FROM sync_log WHERE status='ok' ORDER BY id DESC LIMIT 1").first();
      const n = await env.DB.prepare("SELECT count(*) AS n FROM animals WHERE active=1").first<{ n: number }>();
      return { version: env.APP_VERSION, modifiedDate: last?.modified_date ?? null, syncedAt: last?.ran_at ?? null, count: n?.n ?? 0 };
    });
  }
  if (url.pathname === "/api/animals") {
    // 一次回全部（約 270 種，壓縮後約 130 KB）：各教學工具共用，前端存起來就不用重抓
    return edge(url, env, ctx, "public, max-age=3600, s-maxage=86400", async () => {
      const { results } = await env.DB.prepare(
        `SELECT a.*, e.simple_text, e.habitat_tag, e.diet_tag, e.level, e.curriculum, e.art_url
         FROM animals a LEFT JOIN animal_extra e ON e.id = a.id
         WHERE a.active = 1 ORDER BY a.class, a.ord, a.name_ch`,
      ).all();
      return { animals: results.map((r: any) => ({ ...r, pics: JSON.parse(r.pics || "[]"), voices: JSON.parse(r.voices || "[]") })) };
    });
  }
  return json({ error: "not found" }, "no-store");
}
