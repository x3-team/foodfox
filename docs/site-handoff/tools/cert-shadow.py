# Rebuild certificate fan shadow layers from the Figma 2x export of each paper frame (rendered over the parent's solid fill).
import sys, numpy as np
from PIL import Image, ImageFilter
F = '/home/user/foodfox/apps/site/public/figma/certificates/fan/'
B = np.array([0.965, 0.984, 0.784]) * 255          # parent fill 1275:590
Sc = np.array([0.043, 0.047, 0.031]) * 255          # shadow colour
for n, f in [(1, 'p1-full.png'), (2, 'a604.png'), (3, 'a616.png')]:
    full = np.asarray(Image.open(sys.argv[1] + '/' + f).convert('RGB')).astype(float)
    flat = np.asarray(Image.open(F + f'p{n}-flat.png').convert('RGBA')).astype(float)
    old = np.asarray(Image.open(F + f'p{n}-shadow.png').convert('RGBA'))
    a = ((B - full) / (B - Sc)).mean(-1).clip(0, 1)
    inside = flat[..., 3] > 0
    # under the sheet: keep the shadow solid so antialiased sheet edges never show a light seam
    a_in = np.asarray(Image.fromarray((old[..., 3]).astype(np.uint8)).resize(a.shape[::-1], Image.LANCZOS)).astype(float) / 255
    a = np.where(inside, np.maximum(a, a_in), a)
    out = np.zeros(a.shape + (4,), np.uint8)
    out[..., :3] = Sc.round().astype(np.uint8); out[..., 3] = (a * 255).round().astype(np.uint8)
    # keep the old layer's interior colour (grey) under the sheet
    oldrgb = np.asarray(Image.fromarray(old).convert('RGBA').resize(a.shape[::-1], Image.LANCZOS))[..., :3]
    out[inside, :3] = oldrgb[inside]
    Image.fromarray(out).save(sys.argv[2] + f'/p{n}-shadow.png', optimize=True)
    print(n, out.shape, 'outside alpha mean new', a[~inside].mean().round(4), 'old', (old[..., 3] / 255).mean().round(4))
