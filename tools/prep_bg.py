# Xử lý nền AI -> 640x360. Tọa độ vá logo (x2640-2766,y1365-1482) chỉ đúng với ảnh forest.png đã dùng.
# Chạy: python3 tools/prep_bg.py duong/dan/anh_goc.png [ten_dia_hinh]
import sys
from PIL import Image, ImageFilter
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1]   # ảnh nền gốc (bản AI 2816x1536)
OUT = os.path.join(ROOT, 'assets/combat-bg/' + (sys.argv[2] if len(sys.argv) > 2 else 'forest') + '.png')
im = Image.open(SRC).convert('RGB')

# 1) vá logo (x 2656-2752, y 1375-1472) bằng mảng lá liền kề bên trái
x0, y0, x1, y1 = 2640, 1365, 2766, 1482
w, h = x1 - x0, y1 - y0
patch = im.crop((x0 - 150, y0 - 6, x0 - 150 + w, y0 - 6 + h))
mask = Image.new('L', (w, h), 0)
mask.paste(255, (6, 6, w - 6, h - 6))
mask = mask.filter(ImageFilter.GaussianBlur(5))
im.paste(patch, (x0, y0), mask)

# 2) crop 16:9 giữa ảnh
cw = 1536 * 16 // 9            # 2730
ox = (im.width - cw) // 2
im = im.crop((ox, 0, ox + cw, 1536))

# 3) thu nhỏ về lưới 640x360 (lấy trung bình vùng), rồi gom palette để ra chất pixel art
small = im.resize((640, 360), Image.BOX)
# lọc đường lưới mờ trên sàn (vạch 1px): median 3x3 chỉ áp cho vùng sàn, chuyển dần để không lộ ranh
floor = small.crop((0, 225, 640, 360)).filter(ImageFilter.MedianFilter(3))
fm = Image.linear_gradient('L').resize((640, 135)).transpose(Image.FLIP_TOP_BOTTOM)
fm = fm.point(lambda v: 255 if v > 200 else int(v * 255 / 200)).transpose(Image.FLIP_TOP_BOTTOM)
fm = Image.linear_gradient('L').resize((640, 135)).point(lambda v: min(255, v * 3))
small.paste(floor, (0, 225), fm)
small = small.quantize(colors=96, method=Image.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
small.save(OUT, optimize=True)
print(small.size)
