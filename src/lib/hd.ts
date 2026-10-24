import { bmpSize, encodeCanvas, fmtFromType, loadBitmap, makeCanvas, type Fmt } from './image';

function drawScaled(src: CanvasImageSource, tw: number, th: number): HTMLCanvasElement {
  const c = makeCanvas(tw, th);
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, tw, th);
  return c;
}

/** 可分离高斯近似模糊（[1,2,1] 核，横向+纵向两遍） */
function blurRGB(data: Uint8ClampedArray, w: number, h: number): Float32Array {
  const tmp = new Float32Array(w * h * 3);
  const out = new Float32Array(w * h * 3);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const xm = Math.max(0, x - 1), xp = Math.min(w - 1, x + 1);
      for (let ch = 0; ch < 3; ch++) {
        tmp[(y * w + x) * 3 + ch] =
          (data[(y * w + xm) * 4 + ch] + 2 * data[(y * w + x) * 4 + ch] + data[(y * w + xp) * 4 + ch]) / 4;
      }
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ym = Math.max(0, y - 1), yp = Math.min(h - 1, y + 1);
      for (let ch = 0; ch < 3; ch++) {
        out[(y * w + x) * 3 + ch] =
          (tmp[(ym * w + x) * 3 + ch] + 2 * tmp[(y * w + x) * 3 + ch] + tmp[(yp * w + x) * 3 + ch]) / 4;
      }
    }
  }
  return out;
}

/** Unsharp Mask 锐化：out = orig + amount × (orig − blur) */
function unsharp(canvas: HTMLCanvasElement, amount: number) {
  const ctx = canvas.getContext('2d')!;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  const blurred = blurRGB(d, canvas.width, canvas.height);
  for (let i = 0; i < canvas.width * canvas.height; i++) {
    for (let ch = 0; ch < 3; ch++) {
      const o = d[i * 4 + ch];
      d[i * 4 + ch] = o + amount * (o - blurred[i * 3 + ch]);
    }
  }
  ctx.putImageData(img, 0, 0);
}

/**
 * 图片高清放大：渐进式 ×2 插值（相比一步放大保留更多边缘过渡）+ 锐化增强。
 * 纯 Canvas 本地算法，非 AI 超分——适合截图、插画、文档类图片 2~4 倍放大。
 */
export async function upscaleHD(
  file: File,
  opts: {
    factor: number;            // 放大倍数
    sharpen: number;           // 锐化强度 0~100
    maxSide?: number;          // 输出最长边上限（防内存爆炸）
    fmt?: Fmt | 'keep';
    quality?: number;
  }
): Promise<{ name: string; blob: Blob; w: number; h: number }> {
  const bmp = await loadBitmap(file);
  const { w, h } = bmpSize(bmp);
  let factor = opts.factor;
  if (opts.maxSide && Math.max(w, h) * factor > opts.maxSide) {
    factor = opts.maxSide / Math.max(w, h);
  }
  if (factor < 1) factor = 1;
  const tw = Math.max(1, Math.round(w * factor));
  const th = Math.max(1, Math.round(h * factor));

  // 渐进式放大：逐级 ×2 直到接近目标（比一步到位保留更多边缘过渡），最后一步落到精确尺寸
  let cur = drawScaled(bmp as CanvasImageSource, w, h);
  while (cur.width * 2 <= tw) {
    cur = drawScaled(cur, cur.width * 2, cur.height * 2);
  }
  if (cur.width !== tw || cur.height !== th) {
    cur = drawScaled(cur, tw, th);
  }
  if (opts.sharpen > 0) unsharp(cur, (opts.sharpen / 100) * 1.6);

  const fmt: Fmt = opts.fmt && opts.fmt !== 'keep' ? opts.fmt : (fmtFromType(file.type) ?? 'png');
  if (fmt === 'jpeg') {
    const c2 = makeCanvas(cur.width, cur.height);
    const x2 = c2.getContext('2d')!;
    x2.fillStyle = '#ffffff';
    x2.fillRect(0, 0, c2.width, c2.height);
    x2.drawImage(cur, 0, 0);
    cur = c2;
  }
  const blob = await encodeCanvas(cur, fmt, opts.quality ?? 0.92);
  const base = file.name.replace(/\.[^.]+$/, '') || 'image';
  return { name: `${base}-hd.${fmt === 'jpeg' ? 'jpg' : fmt}`, blob, w: tw, h: th };
}
