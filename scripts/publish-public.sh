#!/usr/bin/env bash
# 把 school/lun-zoo 的「公開部分」同步到 GitHub hunglun2026/lun-zoo（白名單複製、掃機密、推 main）。
# 為什麼不用 subtree：專案裡有 進度.md、學習筆記.md、.prod.secrets 等內部檔，不能公開。
# 用法：bash scripts/publish-public.sh "commit 訊息"
# 憑證：只讀 steve0802 的 PAT，放程序內變數，不切換全機 gh 登入。
# 已知限制：這把 PAT 沒有 workflow 權限，.github/workflows/ 推不上去（見 README「部署」），所以這裡不複製它。
set -euo pipefail
MSG="${1:-更新}"
SRC="$(cd "$(dirname "$0")/.." && pwd)"
STG="$(mktemp -d)"
trap 'rm -rf "$STG"' EXIT
PAT="$(grep '^hunglun2026=' /d/ClaudeOnly/steve0802/gh-tokens.txt | cut -d= -f2- | tr -d '\r\n ')"
B64="$(printf 'x-access-token:%s' "$PAT" | base64 -w0)"
GIT_AUTH=(-c "http.https://github.com/.extraheader=AUTHORIZATION: basic $B64")

# 取遠端現況（保留歷史），再用白名單覆蓋
git "${GIT_AUTH[@]}" clone -q https://github.com/hunglun2026/lun-zoo.git "$STG/repo"
cd "$STG/repo"
git ls-files | grep -v '^\.github/' | xargs -r rm -f
cd "$SRC"
cp -r src public migrations package.json package-lock.json wrangler.jsonc README.md .gitignore animals.csv "$STG/repo/"
mkdir -p "$STG/repo/scripts"; cp scripts/*.ts scripts/*.py scripts/*.sh "$STG/repo/scripts/"

# 掃機密：prod 密鑰、Cloudflare／GitHub token 內容
python -X utf8 - "$STG/repo" <<'PYEOF'
import json,os,re,sys
root=sys.argv[1]
sec=json.load(open(r'D:\ClaudeOnly\school\lun-zoo\.prod.secrets',encoding='utf-8'))
vals=[sec['ADMIN_TOKEN'],sec['NTFY_TOPIC']]
for f in ('cf-tokens.txt','gh-tokens.txt'):
    for l in open(os.path.join(r'D:\ClaudeOnly\steve0802',f),encoding='utf-8'):
        if '=' in l and not l.startswith('#'): vals.append(l.split('=',1)[1].strip())
vals=[v for v in vals if len(v)>=12]
hit=0
for d,_,fs in os.walk(root):
    if '.git' in d.split(os.sep): continue
    for fn in fs:
        p=os.path.join(d,fn); t=open(p,encoding='utf-8',errors='ignore').read()
        if any(v in t for v in vals) or re.search('(' + 'gh' + 'p_|github' + '_pat_)',t): print('機密命中',p); hit+=1
print('機密掃描：命中',hit); sys.exit(1 if hit else 0)
PYEOF

cd "$STG/repo"
git config user.name hunglun2026; git config user.email hunglun2026@gmail.com
git add -A
if git diff --cached --quiet; then echo "沒有變更，不推送"; exit 0; fi
git commit -q -m "$MSG"
git "${GIT_AUTH[@]}" push -q origin main
echo "已推送：$(git rev-parse --short HEAD) $MSG"
