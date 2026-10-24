import { useState } from 'react';
import { ImageDown, Scaling, Trash2 } from 'lucide-react';
import { Btn, Card, Dropzone, Field, FileRow, fmtSize, Input, Progress, Seg, Select, Slider, toast, Toggle } from '../ui';
import { imageSize, transformImage, type Fmt } from '../../lib/image';
import { saveBlob, saveZipFiles } from '../../lib/save';

type Mode = 'percent' | 'size' | 'fit';

interface Result { name: string; blob: Blob; orig: { w: number; h: number }; w: number; h: number }

export default function ImageResize() {
  const [files, setFiles] = useState<File[]>([]);
  const [mode, setMode] = useState<Mode>('percent');
  const [percent, setPercent] = useState(50);
  const [width, setWidth] = useState('1280');
  const [height, setHeight] = useState('720');
  const [keepRatio, setKeepRatio] = useState(true);
  const [fit, setFit] = useState('1080');
  const [fmt, setFmt] = useState<'keep' | Fmt>('keep');
  const [quality, setQuality] = useState(90);
  const [busy, setBusy] = useState(false);
  const [prog, setProg] = useState(0);
  const [results, setResults] = useState<Result[]>([]);

  const run = async () => {
    if (!files.length) return toast.info('请先添加图片');
    setBusy(true);
    setResults([]);
    const out: Result[] = [];
    const w = Number(width) || 0;
    const h = Number(height) || 0;
    const f = Number(fit) || 0;
    for (let i = 0; i < files.length; i++) {
      try {
        const cur = await imageSize(files[i]);
        const size = (ow: number, oh: number): { w: number; h: number } => {
          if (mode === 'percent') return { w: Math.round(ow * percent / 100), h: Math.round(oh * percent / 100) };
          if (mode === 'fit') {
            const s = Math.min(1, f / Math.max(ow, oh));
            return { w: Math.round(ow * s), h: Math.round(oh * s) };
          }
          if (keepRatio) {
            // 以填了的一边为锚点等比缩放；两边都填了则以宽度为准
            if (w > 0 && (!h || true)) return { w, h: Math.round(w * oh / ow) };
            return { w: Math.round(h * ow / oh), h };
          }
          return { w: w || ow, h: h || oh };
        };
        const r = await transformImage(files[i], { fmt, quality: quality / 100, size });
        out.push({ name: r.name, blob: r.blob, orig: cur, w: r.w, h: r.h });
      } catch (e) {
        toast.error(`${files[i].name}：${(e as Error).message}`);
      }
      setProg((i + 1) / files.length);
      setResults([...out]);
    }
    setBusy(false);
    if (out.length) toast.success(`已处理 ${out.length} 张`);
  };

  return (
    <div className="grid-2">
      <div className="grid-side">
        <Card>
          <Dropzone
            accept="image/*" multiple
            onFiles={(fs) => setFiles((v) => [...v, ...fs])}
            main="点击选择或拖入图片（支持批量）"
            sub="按比例 / 指定宽高 / 最长边 三种缩放模式"
          />
        </Card>
        {files.length > 0 && (
          <Card>
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-[13px]">已添加 {files.length} 个文件</span>
              <Btn size="sm" icon={Trash2} onClick={() => { setFiles([]); setResults([]); }}>清空</Btn>
            </div>
            <div style={{ maxHeight: 240, overflowY: 'auto' }}>
              {files.map((f, i) => (
                <FileRow key={`${f.name}-${i}`} name={f.name} size={f.size} onRemove={() => setFiles((v) => v.filter((_, j) => j !== i))} />
              ))}
            </div>
          </Card>
        )}
        {results.length > 0 && (
          <Card>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <span className="chip">共 <b>{results.length}</b> 张</span>
              <Btn variant="primary" size="sm" icon={ImageDown} onClick={() => saveZipFiles('omnikit-resized.zip', results.map((r) => ({ name: r.name, blob: r.blob })))}>
                保存全部 (ZIP)
              </Btn>
            </div>
            {results.map((r, i) => (
              <FileRow
                key={`${r.name}-${i}`} name={r.name}
                right={
                  <span className="sz mono">
                    {r.orig.w}×{r.orig.h} → <span className="tag-ok">{r.w}×{r.h}</span> · {fmtSize(r.blob.size)}
                    <button className="btn btn-ghost btn-sm" style={{ marginLeft: 8 }} onClick={() => saveBlob(r.name, r.blob)}>保存</button>
                  </span>
                }
              />
            ))}
          </Card>
        )}
      </div>

      <Card>
        <Field label="缩放模式">
          <Seg
            value={mode}
            onChange={setMode}
            options={[
              { value: 'percent', label: '按比例' },
              { value: 'size', label: '指定宽高' },
              { value: 'fit', label: '最长边' },
            ]}
          />
        </Field>
        {mode === 'percent' && (
          <Slider label="缩放比例" min={5} max={200} value={percent} onChange={setPercent} fmt={(v) => `${v}%`} />
        )}
        {mode === 'size' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="宽度 (px)">
                <Input type="number" min={1} value={width} onChange={(e) => setWidth(e.target.value)} />
              </Field>
              <Field label="高度 (px)">
                <Input type="number" min={1} value={height} onChange={(e) => setHeight(e.target.value)} disabled={keepRatio} />
              </Field>
            </div>
            <div className="mb-3"><Toggle checked={keepRatio} onChange={setKeepRatio} label="锁定宽高比（以宽度为准）" /></div>
          </>
        )}
        {mode === 'fit' && (
          <Field label="最长边不超过 (px)">
            <Select value={fit} onChange={(e) => setFit(e.target.value)}>
              <option value="4096">4096（4K）</option>
              <option value="1920">1920（1080P）</option>
              <option value="1280">1280</option>
              <option value="1080">1080</option>
              <option value="800">800</option>
              <option value="400">400（缩略图）</option>
            </Select>
          </Field>
        )}
        <Field label="输出格式">
          <Select value={fmt} onChange={(e) => setFmt(e.target.value as typeof fmt)}>
            <option value="keep">保持原格式</option>
            <option value="jpeg">JPG</option>
            <option value="png">PNG</option>
            <option value="webp">WebP</option>
          </Select>
        </Field>
        {fmt !== 'png' && (
          <Field label="质量" hint={`${quality}%`}>
            <input type="range" min={30} max={100} value={quality} style={{ width: '100%' }} onChange={(e) => setQuality(Number(e.target.value))} />
          </Field>
        )}
        {busy && <div className="mb-3"><Progress value={prog} /></div>}
        <Btn variant="primary" icon={Scaling} loading={busy} onClick={run} style={{ width: '100%' }}>
          {busy ? `处理中 ${(prog * 100).toFixed(0)}%` : '开始批量调整'}
        </Btn>
      </Card>
    </div>
  );
}
