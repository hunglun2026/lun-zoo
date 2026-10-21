# 動物探險家

用臺北市立動物園的開放資料做的國小動物教學網站：<https://zoo.hunglun.com>

給老師課堂使用，免註冊、免安裝。八個工具：動物小百科（含比一比）、分類闖關、誰住哪裡、猜猜我是誰、翻牌配對、保育小教室、探險護照、老師專區（四個課程包、學習單、出題投影、搶答計分板）。

## 資料來源與授權

- 資料集：[臺北市立動物園_動物資料](https://data.gov.tw/dataset/121197)，依政府資料開放授權條款第 1 版使用。
- 該授權只開放**文字**；照片、音訊、影片著作權屬臺北市立動物園。詳情頁大圖、音訊、影片直接連動物園原檔；列表與遊戲用的小圖（`public/img/thumbs/`）由本站依原照片縮小後放在本站，用於教學並標示來源。
- 原照片失效的動物改用維基共享資源的自由授權照片（作者與授權見 `public/js/img-fallback.json`，詳情頁有標示），找不到的用 AI 示意插圖並標「AI 繪製」。

## 架構

一支 Cloudflare Worker 同時提供網頁（`public/`）、API（`src/api.ts`）與每日排程（`src/sync.ts`）。

| 路徑 | 負責 |
|---|---|
| `src/index.ts` | 路由入口（fetch、scheduled） |
| `src/api.ts` | `/api/meta`、`/api/animals` |
| `src/sync.ts` | 每天檢查資料集 `modifiedDate`，比較新才重新匯入；失敗保留舊資料並用 ntfy 通知 |
| `src/csv.ts` | CSV 解析、去重（以拉丁學名為唯一鍵，同義學名先合併）、保育等級正規化 |
| `src/notify.ts` | ntfy 通知 |
| `migrations/` | D1 資料表 |
| `public/` | 前端（純 HTML／CSS／JS，無需打包）；`public/img/thumbs/` 是本站依原照片縮小的小圖 |
| `scripts/` | 離線測試、字型子集、簡體字檢查、端對端腳本 |

## 開發

```
npm install
npm run db:local           # 建本機資料庫
npx wrangler dev           # 本機啟動
curl -X POST -H "Authorization: Bearer <ADMIN_TOKEN>" "http://127.0.0.1:8787/admin/sync?force=1"   # 匯入資料
npm test                   # 離線檢查解析與分類規則
python scripts/build-font.py --check    # 資料更新後檢查字型有沒有缺字
python scripts/build-thumbs.py          # 資料更新後補做新動物的縮圖（卡片與遊戲用，原照片太大）
```

本機 `.dev.vars` 寫 `ADMIN_TOKEN=...`；正式環境的 `NTFY_TOPIC`、`ADMIN_TOKEN` 是 Worker 密鑰，不放在 repo。
