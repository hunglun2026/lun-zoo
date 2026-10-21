"""產生自架中文字型子集 public/fonts/zoo-sans.woff2（Noto Sans TC，SIL OFL 1.1）。

為什麼自架：不自架的話，每台電腦會退回不同系統字型，字形不一致；Google Fonts 又多一次外部連線。
字元範圍（多收沒關係，少收才會退回系統字型）：
  1. 網站所有頁面與程式裡的文字
  2. animals.csv 全部文字
  （不再額外收 Big5 常用字：那樣檔案 1.6MB，教室網路太慢；資料更新出現新字時跑 --check 補切）
用法：
  python scripts/build-font.py           重新切字型
  python scripts/build-font.py --check   檢查現有資料與網站文字有沒有字不在字型裡（有就離場碼 1）
來源字型沿用 tools/web-design 的快取（~/.cache/web-design/fonts/），不用重新下載 12MB。
"""
import csv
import io
import re
import shutil
import sys
from pathlib import Path

sys.path.insert(0, r"D:\ClaudeOnly\tools\web-design")
from webdesign import fonts  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "fonts" / "zoo-sans.woff2"
EMOJI = re.compile("[\u2190-\u2bff\u3030\u303d\u3297\u3299\U0001f000-\U0001faff\ufe0f\u200d\u20e3]")


def big5_chars() -> str:
    out = []
    for hi in range(0xA4, 0xC7):  # 常用字 0xA440-0xC67E
        for lo in list(range(0x40, 0x7F)) + list(range(0xA1, 0xFF)):
            try:
                out.append(bytes([hi, lo]).decode("big5"))
            except UnicodeDecodeError:
                pass
    return "".join(out)


def site_text() -> str:
    parts = []
    for ext in ("html", "js", "css"):
        for p in (ROOT / "public").rglob(f"*.{ext}"):
            parts.append(p.read_text(encoding="utf-8"))
    csv_path = ROOT / "animals.csv"
    if csv_path.exists():
        parts.append(csv_path.read_text(encoding="utf-8-sig"))
    # 修正表裡手動補的罕用字（䴉、鶓…）也要進字型
    parts.append((ROOT / "src" / "csv.ts").read_text(encoding="utf-8"))
    return "".join(parts)


def needed() -> set:
    skip = "\r\n\t" + chr(0xFFFD)  # 0xFFFD 是 csv.ts 偵測來源壞字用的比對字元，不是要顯示的字
    return {c for c in site_text() if ord(c) >= 0x20 and c not in skip and not EMOJI.match(c)}


def main() -> int:
    if "--check" in sys.argv:
        from fontTools.ttLib import TTFont

        cmap = set(TTFont(OUT).getBestCmap())
        missing = sorted(c for c in needed() if ord(c) not in cmap)
        # 來源字型本身就沒有的字（超罕用）不算我們的錯，但要列出來
        print(f"字型含 {len(cmap)} 字；網站與資料用到 {len(needed())} 字；缺 {len(missing)} 字")
        if missing:
            print("缺字：", "".join(missing))
        return 1 if missing else 0

    # 只收實際用到的字（約 2400 字）：教室網路慢，字型檔小很多；新字罕見，缺了會自動退回系統字型
    chars = fonts.charset(["".join(sorted(needed()))])
    blob = fonts.subset_woff2("sans", chars)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_bytes(blob)
    lic = fonts.cache_dir() / "OFL-LICENSE.txt"
    if lic.exists():
        shutil.copy(lic, OUT.parent / "LICENSE-OFL.txt")
    print(f"寫出 {OUT}（{len(blob) / 1024:.0f} KB，{len(chars)} 字）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
