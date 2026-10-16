# usage: sr.py <weights.pth> <in.png> <out.png>  (tiled Real-ESRGAN via spandrel, CPU)
import sys, numpy as np, torch
from PIL import Image
from spandrel import ModelLoader
m = ModelLoader().load_from_file(sys.argv[1]).eval()
s = m.scale
a = np.asarray(Image.open(sys.argv[2]).convert('RGB'), np.float32) / 255
H, W, _ = a.shape
T, P = 256, 16
out = np.zeros((H*s, W*s, 3), np.float32)
with torch.no_grad():
    for y in range(0, H, T):
        for x in range(0, W, T):
            y0, x0 = max(y-P, 0), max(x-P, 0); y1, x1 = min(y+T+P, H), min(x+T+P, W)
            t = torch.from_numpy(a[y0:y1, x0:x1].transpose(2,0,1)[None].copy())
            r = m.model(t)[0].clamp(0,1).numpy().transpose(1,2,0)
            yy, xx = (y-y0)*s, (x-x0)*s
            h, w = (min(y+T,H)-y)*s, (min(x+T,W)-x)*s
            out[y*s:y*s+h, x*s:x*s+w] = r[yy:yy+h, xx:xx+w]
Image.fromarray((out*255+.5).astype(np.uint8)).save(sys.argv[3])
print('done', out.shape)
