# De-moire + 2x upscale of the ribbed-glass "Austria" photo.
# The ribs in the 1024 source are ~2.6-3.2 px (near Nyquist), so they alias into moire on any resampling.
# Split: base = horizontal low-pass (no ribs) -> clean 2x; ribs re-synthesised as a regular vertical
# profile at period P (2x px), modulated by the local rib contrast measured in the source; mullions kept.
# usage: austria.py <src.png> <out2x.png> [P=6] [gain=0.8] [base2x.png]
import sys, numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter1d, gaussian_filter
src, out = sys.argv[1], sys.argv[2]
P = float(sys.argv[3]) if len(sys.argv) > 3 else 6.0
gain = float(sys.argv[4]) if len(sys.argv) > 4 else 0.8
a = np.asarray(Image.open(src).convert('RGB'), float) / 255
H, W, _ = a.shape
L = a @ [0.299, 0.587, 0.114]
base = gaussian_filter1d(gaussian_filter1d(a, 1.4, axis=1, mode='nearest'), 0.85, axis=0, mode='nearest')  # also kills a 2 px row ripple
Lb = base @ [0.299, 0.587, 0.114]
rel = (L - Lb) / np.maximum(Lb, 0.03)
amp = np.sqrt(gaussian_filter(rel ** 2, 5))                      # local rib contrast
MUL = [173, 537, 905]                                             # glass mullions (1x px)
for m in MUL: amp[:, m - 4:m + 5] = gaussian_filter1d(amp, 6, axis=1)[:, m - 4:m + 5] * 0  # no ribs on the frame
amp = gaussian_filter(amp, 3)
if len(sys.argv) > 5:
    b2 = np.asarray(Image.open(sys.argv[5]).convert('RGB').resize((2 * W, 2 * H), Image.LANCZOS), float) / 255
else:
    b2 = np.asarray(Image.fromarray((base * 255 + .5).astype(np.uint8)).resize((2 * W, 2 * H), Image.LANCZOS), float) / 255
A2 = np.asarray(Image.fromarray(amp.astype(np.float32)).resize((2 * W, 2 * H), Image.BICUBIC))
x = np.arange(2 * W, dtype=float)
edges = [0] + [2 * m for m in MUL] + [2 * W]
phase = np.zeros(2 * W)
for i in range(len(edges) - 1): phase[edges[i]:edges[i + 1]] = x[edges[i]:edges[i + 1]] - edges[i] + 1.7 * i
prof = np.cos(2 * np.pi * phase / P) + 0.25 * np.cos(4 * np.pi * phase / P + 0.6)   # rounded rib, slight asymmetry
prof /= np.sqrt((prof ** 2).mean())
y = b2 * (1 + gain * A2[..., None] * prof[None, :, None])
# mullions: thin lines from the original, sharp (Lanczos of a narrow band only)
o2 = np.asarray(Image.open(src).convert('RGB').resize((2 * W, 2 * H), Image.LANCZOS), float) / 255
o2 = gaussian_filter1d(o2, 1.0, axis=0)
for m in MUL:
    xs = np.arange(2 * m - 5, 2 * m + 6)
    w = np.clip(1 - np.abs(xs - (2 * m + 0.5)) / 5, 0, 1)[None, :, None]
    # keep only the line itself: replace with low-pass-in-x base + original's line deviation
    y[:, xs] = y[:, xs] * (1 - w) + o2[:, xs] * w
rng = np.random.default_rng(3)
y = y * 255 + (rng.random(y.shape) - rng.random(y.shape)) * 0.75
Image.fromarray(np.clip(y + .5, 0, 255).astype(np.uint8)).save(out)
print('ok', y.shape, 'amp mean', amp.mean())
