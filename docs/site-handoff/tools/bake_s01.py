# Bake the home S01 hero (Figma 1385:283) at scale K: olive gradient + desaturated waves (linear burn) + mirrored cut-out + bottom shade.
# usage: bake_s01.py <waves.png> <cutout_rgba.png> <K> <out.png>
import sys, numpy as np
from PIL import Image
waves_p, cut_p, K, out_p = sys.argv[1], sys.argv[2], float(sys.argv[3]), sys.argv[4]
W, H = int(1440 * K), int(900 * K)
t = np.linspace(0, 1, H)[:, None, None]
top, bot = np.array([0.26, 0.292, 0.228]), np.array([0.129, 0.145, 0.114])
base = np.broadcast_to(top + (bot - top) * t, (H, W, 3)).copy()
wv = Image.open(waves_p).convert('RGB').resize((W, int(1080 * K)), Image.LANCZOS)
wv = np.asarray(wv).astype(float) / 255
grey = (wv @ np.array([0.299, 0.587, 0.114]))[..., None]          # Figma saturation -1
y0 = int(round(55 * K)); grey = grey[y0:y0 + H]
base = np.clip(base + grey - 1, 0, 1)                                # linear burn
cut = Image.open(cut_p).convert('RGBA').transpose(Image.FLIP_LEFT_RIGHT).resize((int(round(1106 * K)), int(round(843 * K))), Image.LANCZOS)
c = np.asarray(cut).astype(float) / 255
x0, yy = int(round(157 * K)), int(round(57 * K))
h, w = min(c.shape[0], H - yy), c.shape[1]
a = c[:h, :, 3:4]
base[yy:yy + h, x0:x0 + w] = base[yy:yy + h, x0:x0 + w] * (1 - a) + c[:h, :, :3] * a
ys = int(round(563 * K)); sh = np.linspace(0, 0.2 * 0.1, H - ys)[:, None, None]
base[ys:] *= (1 - sh)
rng = np.random.default_rng(1); base = base * 255 + (rng.random(base.shape) - rng.random(base.shape)) * 0.75  # TPDF dither vs banding
Image.fromarray(np.clip(base + 0.5, 0, 255).astype(np.uint8)).save(out_p)
