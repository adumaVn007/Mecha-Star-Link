# Cắt sheet thanh máu 256x240 thành từng sprite. Chạy: python3 tools/extract_bars.py
import json
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
from collections import Counter
from PIL import Image

SRC = os.path.join(ROOT, 'assets/ui/_source/healthbar-sheet-original.png')
OUT = os.path.join(ROOT, 'assets/ui/bars')
im = Image.open(SRC).convert('RGBA')

def crop(x, y, w, h):
    return im.crop((x, y, x + w, y + h))

# ---- thanh xéo 42x7: 6 màu x 5 mức (cột 0 = đầy, cột 4 = rỗng)
slant = ['cyan', 'green', 'steel', 'red', 'purple', 'maroon']
sy = [21, 37, 53, 69, 85, 101]
for c, y in zip(slant, sy):
    crop(3, y, 42, 7).save(f'{OUT}/slant/slant_{c}_full.png')
    crop(195, y, 42, 7).save(f'{OUT}/slant/slant_{c}_empty.png')

# ---- thanh viên: 4 màu, cỡ lớn 27x8 (cột 2 = đầy 6 đốt, cột 7 = rỗng), cỡ nhỏ 18x6
pill = ['orange', 'green', 'yellow', 'silver']
ly = [116, 148, 180, 212]
sy2 = [133, 165, 197, 229]
for c, y, y2 in zip(pill, ly, sy2):
    crop(66, y, 27, 8).save(f'{OUT}/pill/pill_{c}_lg_full.png')
    crop(226, y, 27, 8).save(f'{OUT}/pill/pill_{c}_lg_empty.png')
    full_sm = crop(71, y2, 18, 6)
    full_sm.save(f'{OUT}/pill/pill_{c}_sm_full.png')
    # cỡ nhỏ trong sheet không có bản rỗng -> tự tạo: giữ viền, tô ruột bằng màu nền rỗng của cỡ lớn
    emp_lg = crop(226, y, 27, 8)
    cnt = Counter(p for p in emp_lg.getdata()  # (Pillow mới cảnh báo deprecated, vẫn chạy) if p[3] > 0)
    (outline, _), (fill, _) = cnt.most_common(2)
    if sum(outline[:3]) > sum(fill[:3]):
        outline, fill = fill, outline
    emp_sm = full_sm.copy()
    px = emp_sm.load()
    for yy in range(emp_sm.height):
        for xx in range(emp_sm.width):
            p = px[xx, yy]
            if p[3] > 0 and p[:3] != outline[:3]:
                px[xx, yy] = fill
    emp_sm.save(f'{OUT}/pill/pill_{c}_sm_empty.png')
    print(c, 'outline', outline, 'fill', fill)

# ---- khung 5 đốt (hàng trên cùng): 6 frame 30x10, từ 5 đốt sáng -> 0
for i in range(6):
    crop(1 + 32 * i, 3, 30, 10).save(f'{OUT}/pips/pips5_{5 - i}.png')

manifest = {
    "_note": "Cắt từ healthbar-sheet-original.png (256x240). Pixel gốc, chỉ phóng to số nguyên.",
    "slant": {
        "size": [42, 7], "skew": 7, "slice": [0, 8, 0, 8],
        "states": ["full", "empty"], "colors": slant,
        "file": "slant/slant_{color}_{state}.png"
    },
    "pill_lg": {
        "size": [27, 8], "slice": [0, 4, 0, 4], "segments": 6,
        "states": ["full", "empty"], "colors": pill,
        "file": "pill/pill_{color}_lg_{state}.png"
    },
    "pill_sm": {
        "size": [18, 6], "slice": [0, 3, 0, 3], "segments": 5,
        "states": ["full", "empty"], "colors": pill,
        "file": "pill/pill_{color}_sm_{state}.png"
    },
    "pips5": {
        "size": [30, 10], "file": "pips/pips5_{n}.png", "n": [0, 1, 2, 3, 4, 5]
    },
    "roles": {
        "hp_ally": "slant:green", "hp_enemy": "slant:red", "shield": "slant:cyan",
        "hl": "slant:purple", "nl": "pill_lg:yellow", "atb": "pill_lg:silver",
        "atb_mini": "pill_sm:silver"
    }
}
json.dump(manifest, open(f'{OUT}/bars.json', 'w'), indent=2, ensure_ascii=False)
