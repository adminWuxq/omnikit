/**
 * 基于多尺度扩散（金字塔 + Gauss-Seidel 迭代）的图像修复算法。
 * 用于"去除水印"：将涂抹区域的像素用周围已知像素逐层插值填充，
 * 对文字/半透明水印等背景较平缓的场景效果良好。纯前端实现。
 */

type Level = { w: number; h: number; rgb: Float32Array; known: Uint8Array };

export function inpaint(img: ImageData, mask: Uint8Array): ImageData {
  const W = img.width;
  const H = img.height;
  const src = img.data;
  const levels: Level[] = [];

  // ---- 第 0 层：原始分辨率 ----
  {
    const rgb = new Float32Array(W * H * 3);
    const known = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) {
      if (!mask[i]) {
        known[i] = 1;
        rgb[i * 3] = src[i * 4];
        rgb[i * 3 + 1] = src[i * 4 + 1];
        rgb[i * 3 + 2] = src[i * 4 + 2];
      }
    }
    levels.push({ w: W, h: H, rgb, known });
  }

  // ---- 构建降采样金字塔（未知区域随层级扩大，直到全部覆盖或尺寸过小）----
  while (levels.length < 10) {
    const L = levels[levels.length - 1];
    const w = Math.ceil(L.w / 2);
    const h = Math.ceil(L.h / 2);
    if (w < 4 || h < 4) break;
    const rgb = new Float32Array(w * h * 3);
    const known = new Uint8Array(w * h);
    let anyUnknown = false;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let r = 0, g = 0, b = 0, n = 0;
        for (let dy = 0; dy < 2; dy++) {
          for (let dx = 0; dx < 2; dx++) {
            const sx = x * 2 + dx, sy = y * 2 + dy;
            if (sx >= L.w || sy >= L.h) continue;
            const si = sy * L.w + sx;
            if (L.known[si]) { r += L.rgb[si * 3]; g += L.rgb[si * 3 + 1]; b += L.rgb[si * 3 + 2]; n++; }
          }
        }
        const di = y * w + x;
        if (n > 0) { known[di] = 1; rgb[di * 3] = r / n; rgb[di * 3 + 1] = g / n; rgb[di * 3 + 2] = b / n; }
        else anyUnknown = true;
      }
    }
    if (!anyUnknown) break;
    levels.push({ w, h, rgb, known });
  }

  // ---- 最粗层：未知像素用已知均值初始化 ----
  const top = levels[levels.length - 1];
  {
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < top.w * top.h; i++) {
      if (top.known[i]) { r += top.rgb[i * 3]; g += top.rgb[i * 3 + 1]; b += top.rgb[i * 3 + 2]; n++; }
    }
    if (!n) n = 1;
    r /= n; g /= n; b /= n;
    for (let i = 0; i < top.w * top.h; i++) {
      if (!top.known[i]) { top.rgb[i * 3] = r; top.rgb[i * 3 + 1] = g; top.rgb[i * 3 + 2] = b; }
    }
  }

  // ---- 由粗到细：上采样 + 迭代扩散 ----
  for (let li = levels.length - 1; li >= 0; li--) {
    const L = levels[li];

    if (li < levels.length - 1) {
      const P = levels[li + 1]; // 更粗一层（已填充完整）
      const sample = (x: number, y: number, ch: number) => {
        const sx = Math.min(P.w - 1, Math.max(0, (x + 0.5) / 2 - 0.5));
        const sy = Math.min(P.h - 1, Math.max(0, (y + 0.5) / 2 - 0.5));
        const x0 = Math.floor(sx), y0 = Math.floor(sy);
        const x1 = Math.min(x0 + 1, P.w - 1), y1 = Math.min(y0 + 1, P.h - 1);
        const fx = sx - x0, fy = sy - y0;
        const p00 = P.rgb[(y0 * P.w + x0) * 3 + ch], p10 = P.rgb[(y0 * P.w + x1) * 3 + ch];
        const p01 = P.rgb[(y1 * P.w + x0) * 3 + ch], p11 = P.rgb[(y1 * P.w + x1) * 3 + ch];
        return p00 * (1 - fx) * (1 - fy) + p10 * fx * (1 - fy) + p01 * (1 - fx) * fy + p11 * fx * fy;
      };
      for (let y = 0; y < L.h; y++) {
        for (let x = 0; x < L.w; x++) {
          const di = y * L.w + x;
          if (L.known[di]) continue;
          L.rgb[di * 3] = sample(x, y, 0);
          L.rgb[di * 3 + 1] = sample(x, y, 1);
          L.rgb[di * 3 + 2] = sample(x, y, 2);
        }
      }
    }

    // Gauss-Seidel 迭代：未知像素取 8 邻域加权平均（对角权重低）
    const iters = li === 0 ? 48 : 32;
    for (let it = 0; it < iters; it++) {
      for (let y = 0; y < L.h; y++) {
        for (let x = 0; x < L.w; x++) {
          const di = y * L.w + x;
          if (L.known[di]) continue;
          let r = 0, g = 0, b = 0, wsum = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (!dx && !dy) continue;
              const nx = x + dx, ny = y + dy;
              if (nx < 0 || ny < 0 || nx >= L.w || ny >= L.h) continue;
              const ni = ny * L.w + nx;
              const wgt = dx && dy ? 0.7071 : 1;
              r += L.rgb[ni * 3] * wgt; g += L.rgb[ni * 3 + 1] * wgt; b += L.rgb[ni * 3 + 2] * wgt;
              wsum += wgt;
            }
          }
          if (wsum) {
            L.rgb[di * 3] = r / wsum;
            L.rgb[di * 3 + 1] = g / wsum;
            L.rgb[di * 3 + 2] = b / wsum;
          }
        }
      }
    }
  }

  // ---- 写回（只覆盖被涂抹的像素）----
  const out = new ImageData(new Uint8ClampedArray(src), W, H);
  const L0 = levels[0];
  for (let i = 0; i < W * H; i++) {
    if (!L0.known[i]) {
      out.data[i * 4] = Math.round(L0.rgb[i * 3]);
      out.data[i * 4 + 1] = Math.round(L0.rgb[i * 3 + 1]);
      out.data[i * 4 + 2] = Math.round(L0.rgb[i * 3 + 2]);
      out.data[i * 4 + 3] = 255;
    }
  }
  return out;
}
