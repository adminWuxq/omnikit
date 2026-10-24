import { useEffect, useRef, useState } from 'react';
import { Download, Eraser, Brush, Crop, Trash2, Wand2 } from 'lucide-react';
import { Btn, Card, Dropzone, Seg, Slider, toast } from '../ui';
import { bmpSize, encodeCanvas, loadBitmap, makeCanvas } from '../../lib/image';
import { inpaint } from '../../lib/inpaint';
import { saveBlob } from '../../lib/save';

/**
 * 去水印：涂抹水印区域 → 多尺度扩散修复算法填充。
 * 适合文字 / 半透明水印、背景相对平缓的场景；复杂纹理建议分多次小范围涂抹。
 */
export default function WatermarkRemover() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'brush' | 'rect'>('brush');
  const [brush, setBrush] = useState(28);
  const [busy, setBusy] = useState(false);
  const [hasMask, setHasMask] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseRef = useRef<HTMLCanvasElement | null>(null);   // 当前图像（可多轮修复）
  const maskRef = useRef<HTMLCanvasElement | null>(null);   // 涂抹蒙版
  const drawing = useRef(false);
  const rectStart = useRef<{ x: number; y: number } | null>(null);
  const lastPt = useRef<{ x: number; y: number } | null>(null);
  const origType = useRef<string>('image/png');

  const drawView = () => {
    const c = canvasRef.current, base = baseRef.current, mask = maskRef.current;
    if (!c || !base) return;
    c.width = base.width; c.height = base.height;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(base, 0, 0);
    if (mask) {
      // 蒙版以半透明品红显示
      ctx.save();
      ctx.globalAlpha = 0.45;
      const tint = makeCanvas(mask.width, mask.height);
      const tctx = tint.getContext('2d')!;
      tctx.drawImage(mask, 0, 0);
      tctx.globalCompositeOperation = 'source-in';
      tctx.fillStyle = '#e879f9';
      tctx.fillRect(0, 0, tint.width, tint.height);
      ctx.drawImage(tint, 0, 0);
      ctx.restore();
    }
  };

  const load = async (f: File) => {
    try {
      const bmp = await loadBitmap(f);
      const { w, h } = bmpSize(bmp);
      const scale = Math.min(1, 1600 / Math.max(w, h));
      const base = makeCanvas(w * scale, h * scale);
      base.getContext('2d')!.drawImage(bmp as CanvasImageSource, 0, 0, base.width, base.height);
      baseRef.current = base;
      maskRef.current = makeCanvas(base.width, base.height);
      origType.current = f.type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
      setFile(f);
      setHasMask(false);
      setTimeout(drawView, 0);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  useEffect(() => { drawView(); }, [file]);

  const canvasPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * c.width, y: ((e.clientY - rect.top) / rect.height) * c.height };
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const mask = maskRef.current;
    if (!mask) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drawing.current = true;
    const p = canvasPos(e);
    lastPt.current = p;
    rectStart.current = p;
    if (mode === 'brush') {
      const ctx = mask.getContext('2d')!;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, brush, 0, Math.PI * 2);
      ctx.fill();
      setHasMask(true);
      drawView();
    }
  };

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !maskRef.current) return;
    const p = canvasPos(e);
    const ctx = maskRef.current.getContext('2d')!;
    if (mode === 'brush') {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = brush * 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(lastPt.current!.x, lastPt.current!.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      lastPt.current = p;
      drawView();
    } else {
      // 拖拽矩形实时预览
      drawView();
      const c = canvasRef.current!;
      const vctx = c.getContext('2d')!;
      const s = rectStart.current!;
      vctx.save();
      vctx.strokeStyle = '#e879f9';
      vctx.lineWidth = 2;
      vctx.setLineDash([6, 4]);
      vctx.strokeRect(s.x, s.y, p.x - s.x, p.y - s.y);
      vctx.restore();
    }
  };

  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !maskRef.current) return;
    drawing.current = false;
    if (mode === 'rect') {
      const p = canvasPos(e);
      const s = rectStart.current!;
      const x = Math.min(s.x, p.x), y = Math.min(s.y, p.y);
      const w = Math.abs(p.x - s.x), h = Math.abs(p.y - s.y);
      if (w > 4 && h > 4) {
        const ctx = maskRef.current.getContext('2d')!;
        ctx.fillStyle = '#fff';
        ctx.fillRect(x, y, w, h);
        setHasMask(true);
      }
    }
    drawView();
  };

  const run = () => {
    const base = baseRef.current, mask = maskRef.current;
    if (!base || !mask) return;
    setBusy(true);
    setTimeout(() => {
      try {
        const ctx = base.getContext('2d')!;
        const img = ctx.getImageData(0, 0, base.width, base.height);
        const md = mask.getContext('2d')!.getImageData(0, 0, base.width, base.height).data;
        const m = new Uint8Array(base.width * base.height);
        let count = 0;
        for (let i = 0; i < m.length; i++) {
          if (md[i * 4 + 3] > 10) { m[i] = 1; count++; }
        }
        if (!count) { toast.info('请先涂抹要去除的水印区域'); setBusy(false); return; }
        const out = inpaint(img, m);
        ctx.putImageData(out, 0, 0);
        mask.getContext('2d')!.clearRect(0, 0, mask.width, mask.height);
        setHasMask(false);
        drawView();
        toast.success('修复完成，可继续涂抹二次修复');
      } catch (e) {
        toast.error((e as Error).message);
      }
      setBusy(false);
    }, 30);
  };

  const save = async () => {
    const base = baseRef.current;
    if (!base) return;
    const blob = await encodeCanvas(base, origType.current === 'image/jpeg' ? 'jpeg' : 'png', 0.94);
    const ext = blob.type === 'image/jpeg' ? 'jpg' : 'png';
    await saveBlob((file?.name.replace(/\.[^.]+$/, '') ?? 'image') + `-clean.${ext}`, blob);
    toast.success('已保存');
  };

  return (
    <div className="grid-2">
      <div className="grid-side">
        <Card>
          {file ? (
            <>
              <div className="canvas-box"><canvas ref={canvasRef} style={{ width: '100%', touchAction: 'none' }} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} /></div>
              <div className="flex gap-2 mt-3 flex-wrap">
                <Btn variant="primary" icon={Wand2} loading={busy} disabled={!hasMask} onClick={run}>开始修复</Btn>
                <Btn icon={Trash2} onClick={() => { maskRef.current?.getContext('2d')!.clearRect(0, 0, maskRef.current!.width, maskRef.current!.height); setHasMask(false); drawView(); }}>清除涂抹</Btn>
                <Btn icon={Download} onClick={save}>保存图片</Btn>
                <Btn onClick={() => setFile(null)}>更换图片</Btn>
              </div>
            </>
          ) : (
            <Dropzone accept="image/*" onFiles={(fs) => load(fs[0])} main="选择要去水印的图片" sub="涂抹水印区域，算法自动修复填充" />
          )}
        </Card>
      </div>

      <Card>
        <div className="field">
          <div className="field-label"><span>涂抹工具</span></div>
          <Seg
            value={mode} onChange={setMode}
            options={[{ value: 'brush', label: <span className="flex items-center gap-1.5"><Brush size={13} /> 画笔</span> }, { value: 'rect', label: <span className="flex items-center gap-1.5"><Crop size={13} /> 矩形框选</span> }]}
          />
        </div>
        {mode === 'brush' && <Slider label="画笔大小" min={6} max={90} value={brush} onChange={setBrush} fmt={(v) => `${v} px`} />}
        <div className="glass" style={{ padding: '12px 14px', fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.8 }}>
          <div className="flex items-center gap-1.5 mb-1" style={{ color: '#c4b5fd', fontWeight: 700 }}><Eraser size={13} /> 使用建议</div>
          <div>1. 用画笔 / 矩形涂抹覆盖水印区域（粉色部分）</div>
          <div>2. 点击「开始修复」自动填充背景</div>
          <div>3. 效果不满意可缩小画笔，小范围多次修复</div>
          <div style={{ opacity: 0.8 }}>文字、半透明水印 & 背景平缓的图片效果最好；复杂纹理会有涂抹感。</div>
        </div>
      </Card>
    </div>
  );
}
