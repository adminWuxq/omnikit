import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, ImageDown, Stamp } from 'lucide-react';
import { Btn, Card, Dropzone, Field, Seg, Select, Slider, toast, Toggle } from '../ui';
import { bmpSize, encodeCanvas, loadBitmap, makeCanvas, type Bitmap } from '../../lib/image';
import { saveBlob, saveZipFiles } from '../../lib/save';

type Pos = 'tl' | 't' | 'tr' | 'l' | 'c' | 'r' | 'bl' | 'b' | 'br';

interface WmOpts {
  type: 'text' | 'image';
  text: string;
  fontPct: number;    // 字号 = 图片宽 * pct/100
  color: string;
  opacity: number;    // 0~1
  rotate: number;     // 角
  tile: boolean;
  spacing: number;    // 平铺间距倍数
  pos: Pos;
  marginPct: number;  // 边距 %
  wmScalePct: number; // 图片水印宽度相对主图宽 %
}

const defaultOpts: WmOpts = {
  type: 'text', text: '@ OmniKit', fontPct: 5, color: '#ffffff', opacity: 0.45,
  rotate: -30, tile: true, spacing: 2.4, pos: 'br', marginPct: 3, wmScalePct: 25,
};

const POS_CELL: { key: Pos; cls: string }[] = [
  { key: 'tl', cls: 'justify-start items-start' }, { key: 't', cls: 'justify-center items-start' }, { key: 'tr', cls: 'justify-end items-start' },
  { key: 'l', cls: 'justify-start items-center' }, { key: 'c', cls: 'justify-center items-center' }, { key: 'r', cls: 'justify-end items-center' },
  { key: 'bl', cls: 'justify-start items-end' }, { key: 'b', cls: 'justify-center items-end' }, { key: 'br', cls: 'justify-end items-end' },
];

function drawWatermark(canvas: HTMLCanvasElement, opts: WmOpts, wmImg?: Bitmap | null) {
  const W = canvas.width, H = canvas.height;
  const ctx = canvas.getContext('2d')!;
  ctx.save();
  ctx.globalAlpha = opts.opacity;

  const place = (dw: number, dh: number) => {
    const m = Math.min(W, H) * (opts.marginPct / 100);
    const v = opts.pos[0] === 't' ? m : opts.pos[0] === 'b' ? H - dh - m : (H - dh) / 2;
    const hz = opts.pos.endsWith('l') ? m : opts.pos.endsWith('r') ? W - dw - m : (W - dw) / 2;
    return { x: hz, y: v };
  };

  if (opts.type === 'text') {
    const fs = Math.max(10, W * (opts.fontPct / 100));
    ctx.font = `700 ${fs}px "PingFang SC", "Microsoft YaHei", sans-serif`;
    ctx.fillStyle = opts.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (opts.tile) {
      const tw = ctx.measureText(opts.text).width;
      const tileW = (tw + fs * opts.spacing) | 0;
      const tileH = (fs + fs * opts.spacing) | 0;
      const tile = makeCanvas(tileW, tileH);
      const tc = tile.getContext('2d')!;
      tc.font = ctx.font;
      tc.fillStyle = opts.color;
      tc.textAlign = 'center';
      tc.textBaseline = 'middle';
      tc.translate(tileW / 2, tileH / 2);
      tc.rotate((opts.rotate * Math.PI) / 180);
      tc.fillText(opts.text, 0, 0);
      const pat = ctx.createPattern(tile, 'repeat')!;
      ctx.fillStyle = pat;
      ctx.fillRect(0, 0, W, H);
    } else {
      const tw = ctx.measureText(opts.text).width;
      const { x, y } = place(tw, fs);
      ctx.translate(x + tw / 2, y + fs / 2);
      ctx.rotate((opts.rotate * Math.PI) / 180);
      ctx.fillText(opts.text, 0, 0);
    }
  } else if (wmImg) {
    const s = bmpSize(wmImg);
    const dw = W * (opts.wmScalePct / 100);
    const dh = dw * (s.h / s.w);
    const drawOne = (dx: number, dy: number) => {
      ctx.save();
      ctx.translate(dx + dw / 2, dy + dh / 2);
      ctx.rotate((opts.rotate * Math.PI) / 180);
      ctx.drawImage(wmImg as CanvasImageSource, -dw / 2, -dh / 2, dw, dh);
      ctx.restore();
    };
    if (opts.tile) {
      const stepX = dw + dw * opts.spacing * 0.5;
      const stepY = dh + dh * opts.spacing * 0.5;
      for (let y = -dh; y < H + dh; y += stepY) {
        for (let x = -dw; x < W + dw; x += stepX) drawOne(x, y);
      }
    } else {
      const { x, y } = place(dw, dh);
      drawOne(x, y);
    }
  }
  ctx.restore();
}

/** 在原始分辨率上渲染并输出 blob */
async function renderFull(file: File, opts: WmOpts, wmFile: File | null): Promise<Blob> {
  const bmp = await loadBitmap(file);
  const { w, h } = bmpSize(bmp);
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d')!;
  const isJpg = file.type === 'image/jpeg';
  if (isJpg) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); }
  ctx.drawImage(bmp as CanvasImageSource, 0, 0, w, h);
  const wmBmp = opts.type === 'image' && wmFile ? await loadBitmap(wmFile) : null;
  drawWatermark(c, opts, wmBmp);
  return encodeCanvas(c, isJpg ? 'jpeg' : 'png', 0.92);
}

export default function Watermark() {
  const [file, setFile] = useState<File | null>(null);
  const [opts, setOpts] = useState<WmOpts>(defaultOpts);
  const [wmFile, setWmFile] = useState<File | null>(null);
  const [wmPreview, setWmPreview] = useState<Bitmap | null>(null);
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const set = <K extends keyof WmOpts,>(k: K, v: WmOpts[K]) => setOpts((o) => ({ ...o, [k]: v }));

  // 预览渲染
  const render = useCallback(async () => {
    if (!file || !canvasRef.current) return;
    const bmp = await loadBitmap(file);
    const scale = Math.min(1, 1400 / Math.max(bmpSize(bmp).w, bmpSize(bmp).h));
    const w = Math.round(bmpSize(bmp).w * scale);
    const h = Math.round(bmpSize(bmp).h * scale);
    const c = canvasRef.current;
    c.width = w; c.height = h;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(bmp as CanvasImageSource, 0, 0, w, h);
    drawWatermark(c, opts, wmPreview);
  }, [file, opts, wmPreview]);

  useEffect(() => { render(); }, [render]);

  useEffect(() => {
    if (!wmFile) { setWmPreview(null); return; }
    loadBitmap(wmFile).then(setWmPreview).catch(() => toast.error('水印图片加载失败'));
  }, [wmFile]);

  const saveOne = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const blob = await renderFull(file, opts, wmFile);
      const ext = blob.type === 'image/jpeg' ? 'jpg' : 'png';
      const name = file.name.replace(/\.[^.]+$/, '') + `-watermarked.${ext}`;
      await saveBlob(name, blob);
      toast.success('已保存');
    } catch (e) { toast.error((e as Error).message); }
    setBusy(false);
  };

  const runBatch = async () => {
    if (!batchFiles.length) return toast.info('请先添加要批量处理的图片');
    setBusy(true);
    try {
      const out: { name: string; blob: Blob }[] = [];
      for (const f of batchFiles) {
        const blob = await renderFull(f, opts, wmFile);
        out.push({ name: f.name.replace(/\.[^.]+$/, '') + '-watermarked.' + (blob.type === 'image/jpeg' ? 'jpg' : 'png'), blob });
      }
      await saveZipFiles('omnikit-watermarked.zip', out);
      toast.success(`已处理 ${out.length} 张`);
    } catch (e) { toast.error((e as Error).message); }
    setBusy(false);
  };

  return (
    <div className="grid-2">
      <div className="grid-side">
        <Card>
          {file ? (
            <div className="canvas-box"><canvas ref={canvasRef} style={{ width: '100%' }} /></div>
          ) : (
            <Dropzone accept="image/*" onFiles={(fs) => setFile(fs[0])} main="选择要加水印的图片" sub="左侧实时预览 · 支持文字 / 图片水印" />
          )}
          {file && (
            <div className="flex gap-2 mt-3 flex-wrap">
              <Btn icon={Download} variant="primary" loading={busy} onClick={saveOne}>保存当前图片</Btn>
              <Btn onClick={() => { setFile(null); setBatchFiles([]); }}>更换图片</Btn>
            </div>
          )}
        </Card>
        <Card>
          <div className="font-bold text-[13px] mb-3">批量应用相同水印</div>
          <Dropzone accept="image/*" multiple onFiles={(fs) => setBatchFiles((v) => [...v, ...fs])} main="添加多张图片" sub={`已添加 ${batchFiles.length} 张`} />
          {batchFiles.length > 0 && (
            <Btn className="mt-3" icon={ImageDown} variant="soft" loading={busy} onClick={runBatch} style={{ width: '100%' }}>
              批量处理并打包下载 (ZIP)
            </Btn>
          )}
        </Card>
      </div>

      <Card>
        <Field label="水印类型">
          <Seg value={opts.type} onChange={(v) => set('type', v)} options={[{ value: 'text', label: '文字水印' }, { value: 'image', label: '图片水印' }]} />
        </Field>

        {opts.type === 'text' ? (
          <>
            <Field label="水印文字">
              <input className="input" value={opts.text} onChange={(e) => set('text', e.target.value)} maxLength={40} />
            </Field>
            <Field label="文字颜色"><input type="color" className="input" value={opts.color} onChange={(e) => set('color', e.target.value)} style={{ height: 38 }} /></Field>
            <Slider label="字号（相对图片宽度）" min={2} max={15} step={0.5} value={opts.fontPct} onChange={(v) => set('fontPct', v)} fmt={(v) => `${v}%`} />
          </>
        ) : (
          <>
            <Field label="水印图片（建议透明 PNG）">
              {wmFile ? (
                <div className="file-row"><span className="nm">{wmFile.name}</span><button className="del" onClick={() => setWmFile(null)}>✕</button></div>
              ) : (
                <Dropzone accept="image/png,image/webp,image/*" onFiles={(fs) => setWmFile(fs[0])} main="选择水印图片" sub="PNG 透明底效果最佳" />
              )}
            </Field>
            <Slider label="水印大小（相对图片宽度）" min={5} max={60} value={opts.wmScalePct} onChange={(v) => set('wmScalePct', v)} fmt={(v) => `${v}%`} />
          </>
        )}

        <Slider label="不透明度" min={5} max={100} value={Math.round(opts.opacity * 100)} onChange={(v) => set('opacity', v / 100)} fmt={(v) => `${v}%`} />
        <Slider label="旋转角度" min={-90} max={90} value={opts.rotate} onChange={(v) => set('rotate', v)} fmt={(v) => `${v}°`} />

        <div className="field">
          <div className="field-label"><span>平铺铺满</span></div>
          <Toggle checked={opts.tile} onChange={(v) => set('tile', v)} label="全图平铺（防盗图推荐）" />
        </div>
        {opts.tile ? (
          <Slider label="平铺间距" min={1} max={5} step={0.1} value={opts.spacing} onChange={(v) => set('spacing', v)} fmt={(v) => `${v}×`} />
        ) : (
          <>
            <div className="field">
              <div className="field-label"><span>位置</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5, width: 160 }}>
                {POS_CELL.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => set('pos', p.key)}
                    className={`flex ${p.cls}`}
                    style={{
                      height: 38, borderRadius: 8, border: `1px solid ${opts.pos === p.key ? 'rgba(139,92,246,.8)' : 'var(--border)'}`,
                      background: opts.pos === p.key ? 'var(--grad-soft)' : 'rgba(255,255,255,.03)', transition: 'all .15s',
                    }}
                  >
                    <span style={{ width: 5, height: 5, borderRadius: 3, background: opts.pos === p.key ? '#a78bfa' : '#555e70' }} />
                  </button>
                ))}
              </div>
            </div>
            <Slider label="边距" min={0} max={10} step={0.5} value={opts.marginPct} onChange={(v) => set('marginPct', v)} fmt={(v) => `${v}%`} />
          </>
        )}
      </Card>
    </div>
  );
}
