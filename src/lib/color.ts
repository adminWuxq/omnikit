/* 颜色转换与渐变工具 */

export interface RGB { r: number; g: number; b: number }
export interface HSL { h: number; s: number; l: number }

const clamp = (n: number, min = 0, max = 255) => Math.min(max, Math.max(min, n));

export function hexToRgb(hex: string): RGB | null {
  let h = hex.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(h)) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

export const rgbToHex = ({ r, g, b }: RGB) =>
  '#' + [r, g, b].map((v) => clamp(Math.round(v)).toString(16).padStart(2, '0')).join('');

export function rgbToHsl({ r, g, b }: RGB): HSL {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslToRgb({ h, s, l }: HSL): RGB {
  h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

export function hexToHsl(hex: string): HSL | null {
  const rgb = hexToRgb(hex);
  return rgb ? rgbToHsl(rgb) : null;
}

export function hslToHex(hsl: HSL): string {
  return rgbToHex(hslToRgb(hsl));
}

/** 与黑/白文字的对比度，返回更可读的文字色 */
export function readableText(rgb: RGB): '#000000' | '#ffffff' {
  const { r, g, b } = rgb;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? '#000000' : '#ffffff';
}

/** 颜色明暗梯度（向白色/黑色混合，共 11 档） */
export function shadesOf(hex: string): { hex: string; ratio: number }[] {
  const rgb = hexToRgb(hex);
  if (!rgb) return [];
  const out: { hex: string; ratio: number }[] = [];
  for (let t = -0.5; t <= 0.5001; t += 0.1) {
    const f = Math.round(t * 10) / 10;
    const mix = (v: number) => (f < 0 ? v * (1 + f) : v + (255 - v) * f);
    out.push({ hex: rgbToHex({ r: mix(rgb.r), g: mix(rgb.g), b: mix(rgb.b) }), ratio: f });
  }
  return out;
}

/** 随机生成一组好看的渐变色（同类色 + 邻近色策略） */
export function randomGradientStops(n = 3): string[] {
  const baseHue = Math.floor(Math.random() * 360);
  const dir = Math.random() > 0.5 ? 1 : -1;
  return Array.from({ length: n }, (_, i) =>
    hslToHex({
      h: (baseHue + dir * i * rand(18, 42) + 360) % 360,
      s: rand(62, 88),
      l: rand(48, 68),
    })
  );
}

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
