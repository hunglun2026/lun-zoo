import type { Env } from "./env";

const json = (data: unknown, cache = 300) =>
  new Response(JSON.stringify(data), {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": `public, max-age=${cache}` },
  });

export async function handleApi(url: URL, env: Env): Promise<Response> {
  if (url.pathname === "/api/meta") {
    const last = await env.DB.prepare("SELECT modified_date, ran_at, animal_count FROM sync_log WHERE status='ok' ORDER BY id DESC LIMIT 1").first();
    const n = await env.DB.prepare("SELECT count(*) AS n FROM animals WHERE active=1").first<{ n: number }>();
    return json({ version: env.APP_VERSION, modifiedDate: last?.modified_date ?? null, syncedAt: last?.ran_at ?? null, count: n?.n ?? 0 }, 60);
  }
  if (url.pathname === "/api/animals") {
    // 一次回全部（約 270 種，壓縮後約百 KB）：各教學工具共用，前端存起來就不用重抓
    const { results } = await env.DB.prepare(
      `SELECT a.*, e.simple_text, e.habitat_tag, e.diet_tag, e.level, e.curriculum, e.art_url
       FROM animals a LEFT JOIN animal_extra e ON e.id = a.id
       WHERE a.active = 1 ORDER BY a.class, a.ord, a.name_ch`,
    ).all();
    const animals = results.map((r: any) => ({ ...r, pics: JSON.parse(r.pics || "[]"), voices: JSON.parse(r.voices || "[]") }));
    return json({ animals }, 3600);
  }
  return json({ error: "not found" }, 0);
}
