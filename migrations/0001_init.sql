-- animals：只放「動物園原始資料」，每次同步都會被覆寫
CREATE TABLE animals (
  id            TEXT PRIMARY KEY,      -- 拉丁學名轉成網址用字串（缺學名才用中文名雜湊）
  name_ch       TEXT NOT NULL,
  name_en       TEXT,
  name_latin    TEXT,
  also_known    TEXT,
  phylum        TEXT,
  class         TEXT,
  ord           TEXT,                  -- order 是 SQL 保留字
  family        TEXT,
  cons_raw      TEXT,                  -- 原文保育等級
  cons_code     TEXT,                  -- 正規化：CR EN VU NT LC DD NE EW 或空字串
  distribution  TEXT,
  habitat       TEXT,
  feature       TEXT,
  behavior      TEXT,
  diet          TEXT,
  crisis        TEXT,
  location      TEXT,
  pics          TEXT,                  -- JSON：[{alt,url}]，網址已改 https
  videos        TEXT,                  -- 影片網址（YouTube）
  voices        TEXT,                  -- JSON：[{alt,url}]
  name_suspect  INTEGER NOT NULL DEFAULT 0,  -- 中文名含「?」（來源檔編碼損壞）且沒有修正表可用
  active        INTEGER NOT NULL DEFAULT 1,  -- 這次資料沒出現就設 0，不刪
  synced_at     TEXT
);
CREATE INDEX idx_animals_active ON animals(active);

-- animal_extra：我們自己加的內容，同步絕不碰這張表
CREATE TABLE animal_extra (
  id           TEXT PRIMARY KEY REFERENCES animals(id),
  simple_text  TEXT,    -- 低年級簡易版介紹
  habitat_tag  TEXT,    -- 棲地分類（森林、沙漠、海洋…）
  diet_tag     TEXT,    -- 食性分類（肉食、草食、雜食…）
  level        INTEGER, -- 難易度 1~3
  curriculum   TEXT,    -- 課綱領域
  art_url      TEXT     -- 預生插畫路徑
);

-- sync_log：每次檢查一列，出問題時回頭查
CREATE TABLE sync_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  ran_at        TEXT NOT NULL,
  modified_date TEXT,   -- data.gov.tw 回報的 modifiedDate
  status        TEXT NOT NULL,   -- ok / skipped / error
  row_count     INTEGER,
  animal_count  INTEGER,
  message       TEXT
);
