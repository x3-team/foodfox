"""Re-render the S05 symptom cards without the non-uniform Figma CROP stretch.

For each card: warp the raw cut-out exactly as Figma does (imageTransform, CROP) -> check it lines up with the current
export; learn the export's colour grading (Figma image filters + card glass + bottom gradient) as a polynomial in
(r,g,b,y) on the photo pixels; then warp again with an equal scale (same vertical span, same horizontal centre),
apply the learnt grading and composite over the export's own background rows.
"""
import sys, json
import numpy as np
from PIL import Image

SRC = "/home/claude/foodfox/apps/site/public/figma/symptoms/"
OUT = sys.argv[1]

def load_rgba(path, alpha_from=None, size=None):
    im = Image.open(path).convert("RGBA")
    if alpha_from:
        a = Image.open(alpha_from).convert("RGBA").split()[3].resize(im.size, Image.LANCZOS)
        im.putalpha(a)
    return np.asarray(im).astype(np.float32) / 255.0

def warp(img, a, tx, d, ty, W, H):
    """node pixel (x,y) -> image u = a*x/W + tx, v = d*y/H + ty; bilinear; outside -> alpha 0"""
    ih, iw = img.shape[:2]
    xs = (np.arange(W) + 0.5) / W
    ys = (np.arange(H) + 0.5) / H
    u = a * xs[None, :] + tx
    v = d * ys[:, None] + ty
    px = u * iw - 0.5
    py = v * ih - 0.5
    px = np.broadcast_to(px, (H, W)); py = np.broadcast_to(py, (H, W))
    inside = (px >= -0.5) & (px <= iw - 0.5) & (py >= -0.5) & (py <= ih - 0.5)
    x0 = np.clip(np.floor(px).astype(int), 0, iw - 1); y0 = np.clip(np.floor(py).astype(int), 0, ih - 1)
    x1 = np.clip(x0 + 1, 0, iw - 1); y1 = np.clip(y0 + 1, 0, ih - 1)
    fx = np.clip(px - np.floor(px), 0, 1)[..., None]; fy = np.clip(py - np.floor(py), 0, 1)[..., None]
    out = (img[y0, x0] * (1 - fx) * (1 - fy) + img[y0, x1] * fx * (1 - fy) + img[y1, x0] * (1 - fx) * fy + img[y1, x1] * fx * fy)
    out[~inside] = 0
    return out

def feats(rgb, yy):
    r, g, b = rgb[:, 0], rgb[:, 1], rgb[:, 2]
    one = np.ones_like(r)
    base = [one, r, g, b, r * r, g * g, b * b, r * g, g * b, r * b, r ** 3, g ** 3, b ** 3]
    return np.stack(base + [yy, yy * yy] + [yy * t for t in (r, g, b)] + [yy * yy * t for t in (r, g, b)], 1)

CARDS = {
    # name: raw, alpha source, Figma imageTransform (1385:610 / 1385:621 / 1385:636)
    "skin": dict(raw="s7.png", alpha=None, tr=[[1.2041949033737183, 0, -0.025974320247769356], [0, 0.954544723033905, 0.028934331610798836]]),
    "gut": dict(raw="s1.png", alpha="gut1.png", tr=[[0.8418211936950684, 0, 0.07851788401603699], [0, 1.0006554126739502, -0.0006554335122928023]]),
    "well": dict(raw="s12.png", alpha=None, tr=[[0.7878803014755249, 0, -0.18750469386577606], [0, 0.9365369081497192, 0.06303613632917404]]),
}
W, H = 648, 1040
report = {}
for name, c in CARDS.items():
    raw = load_rgba(SRC + c["raw"], SRC + c["alpha"] if c["alpha"] else None)
    ih, iw = raw.shape[:2]
    (a, _, tx), (_, d, ty) = c["tr"]
    exp = np.asarray(Image.open(SRC + f"{name}-card@2x.webp").convert("RGB")).astype(np.float32) / 255.0
    old = warp(raw, a, tx, d, ty, W, H)
    alpha = old[..., 3]
    yy = np.broadcast_to(((np.arange(H) + 0.5) / H)[:, None], (H, W))
    # background rows: the export where the photo is absent
    bg = np.zeros((H, 3), np.float32)
    for y in range(H):
        m = alpha[y] < 0.02
        bg[y] = np.median(exp[y][m], 0) if m.sum() > 8 else np.nan
    idx = np.arange(H); ok = ~np.isnan(bg[:, 0])
    for ch in range(3): bg[:, ch] = np.interp(idx, idx[ok], bg[ok, ch])
    # fit photo grading on opaque pixels
    m = alpha > 0.98
    X = feats(old[..., :3][m], yy[m]); Y = exp[m]
    coef, *_ = np.linalg.lstsq(X, Y, rcond=None)
    pred = np.clip(X @ coef, 0, 1)
    err_fit = float(np.abs(pred - Y).mean() * 255)
    # full reconstruction of the current export (sanity: the model explains it)
    allX = feats(old[..., :3].reshape(-1, 3), yy.reshape(-1))
    photo = np.clip(allX @ coef, 0, 1).reshape(H, W, 3)
    recon = photo * alpha[..., None] + bg[:, None, :] * (1 - alpha[..., None])
    err_recon = float(np.abs(recon - exp).mean() * 255)
    # equal-scale crop: keep the vertical span (d, ty), keep the horizontal centre
    a2 = d * ih * (W / H) / iw
    tx2 = (a * 0.5 + tx) - a2 * 0.5
    new = warp(raw, a2, tx2, d, ty, W, H)
    al2 = new[..., 3]
    nX = feats(new[..., :3].reshape(-1, 3), yy.reshape(-1))
    photo2 = np.clip(nX @ coef, 0, 1).reshape(H, W, 3)
    out = photo2 * al2[..., None] + bg[:, None, :] * (1 - al2[..., None])
    img = Image.fromarray((out * 255 + 0.5).astype(np.uint8))
    img.save(f"{OUT}/{name}-card@2x.png")
    Image.fromarray((recon * 255 + 0.5).astype(np.uint8)).save(f"{OUT}/{name}-recon.png")
    report[name] = dict(stretch_y_over_x=round((ih * d and (1 / d) / ih) / ((1 / a) / iw), 3), a2=round(a2, 4), tx2=round(tx2, 4), err_fit=round(err_fit, 2), err_recon=round(err_recon, 2))
print(json.dumps(report, indent=1))
