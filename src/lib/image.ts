export type Fmt = 'png' | 'jpeg' | 'webp';

export const extOf = (f: Fmt) => (f === 'jpeg' ? 'jpg' : f);
export const mimeOf = (f: Fmt) => `image/${f}`;

export function fmtFromType(t: string): Fmt | null {
  if (t === 'image/png') return 'png';
  if (t === 'image/jpeg') return 'jpeg';
  if (t === 'image/webp') return 'webp';
  return null;
}

export type Bitmap = ImageBitmap | HTMLImageElement;

export async function loadBitmap(file: File | Blob): Promise<Bitmap> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      /* 回退到 Image 元素 */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise((res, rej) => {
      img.onload = () => res(null);
      img.onerror = () => rej(new Error('图片解码失败'));
      img.src = url;
    });
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export function bmpSize(b: Bitmap): { w: number; h: number } {
  return b instanceof HTMLImageElement
    ? { w: b.naturalWidth, h: b.naturalHeight }
    : { w: b.width, h: b.height };
}

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

export function encodeCanvas(c: HTMLCanvasElement, fmt: Fmt, quality = 0.9): Promise<Blob> {
  return new Promise((res, rej) =>
    c.toBlob((b) => (b ? res(b) : rej(new Error('图片编码失败'))), mimeOf(fmt), quality)
  );
}

export interface TransformOpts {
  fmt?: Fmt | 'keep';
  quality?: number;
  /** 目标尺寸计算函数 */
  size?: (w: number, h: number) => { w: number; h: number };
}

/** 图片转码 / 缩放统一入口（浏览器原生 canvas，纯本地处理） */
export async function transformImage(
  file: File,
  opts: TransformOpts
): Promise<{ name: string; blob: Blob; w: number; h: number }> {
  const bmp = await loadBitmap(file);
  const { w: ow, h: oh } = bmpSize(bmp);
  const target = opts.size ? opts.size(ow, oh) : { w: ow, h: oh };
  const c = makeCanvas(target.w, target.h);
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const fmt: Fmt = opts.fmt && opts.fmt !== 'keep' ? opts.fmt : fmtFromType(file.type) ?? 'png';
  if (fmt === 'jpeg') {
    // JPG 不支持透明，先铺白底
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);
  }
  ctx.drawImage(bmp as CanvasImageSource, 0, 0, c.width, c.height);
  const blob = await encodeCanvas(c, fmt, opts.quality ?? 0.9);
  const base = file.name.replace(/\.[^.]+$/, '') || 'image';
  return { name: `${base}.${extOf(fmt)}`, blob, w: c.width, h: c.height };
}

export async function imageSize(file: File): Promise<{ w: number; h: number }> {
  const bmp = await loadBitmap(file);
  return bmpSize(bmp);
}
