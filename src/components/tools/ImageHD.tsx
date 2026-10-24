import { useState } from 'react';
import { ImageDown, Sparkles, Trash2, ZoomIn } from 'lucide-react';
import { Btn, Card, Dropzone, Field, FileRow, fmtSize, Progress, Seg, Select, Slider, toast } from '../ui';
import { imageSize } from '../../lib/image';
import { upscaleHD } from '../../lib/hd';
import { saveBlob, saveZipFiles } from '../../lib/save';

interface Result { name: string; blob: Blob; origW: number; origH: number; w: number; h: number }

export default function ImageHD() {
  const [files, setFiles] = useState<File[]>([]);
  const [factor, setFactor] = useState<2 | 3 | 4>(2);
  const [sharpen, setSharpen] = useState(40);
  const [maxSide, setMaxSide] = useState('4096');
  const [fmt, setFmt] = useState<'keep' | 'png' | 'jpeg' | 'webp'>('keep');
  const [quality, setQuality] = useState(92);
  const [busy, setBusy] = useState(false);
  const [prog, setProg] = useState(0);
  const [results, setResults] = useState<Result[]>([]);

  const run = async () => {
    if (!files.length) return toast.info('请先添加图片');
    setBusy(true);
    setResults([]);
    const out: Result[] = [];
    for (let i = 0; i < files.length; i++) {
      try {
        const cur = await imageSize(files[i]);
        const r = await upscaleHD(files[i], {
          factor,
          sharpen,
          maxSide: Number(maxSide) || undefined,
          fmt,
          quality: quality / 100,
        });
        out.push({ ...r, origW: cur.w, origH: cur.h });
      } catch (e) {
        toast.error(`${files[i].name}：${(e as Error).message}`);
      }
      setProg((i + 1) / files.length);
      setResults([...out]);
    }
    setBusy(false);
    if (out.length) toast.success(`已放大 ${out.length} 张`);
  };

  return (
    <div className="grid-2">
      <div className="grid-side">
        <Card>
          <Dropzone
            accept="image/*" multiple
            onFiles={(fs) => setFiles((v) => [...v, ...fs])}
            main="点击选择或拖入图片（支持批量）"
            sub="小图放大重灾区：截图 / 表情包 / 老照片 / 扫描文档"
          />
        </Card>
        {files.length > 0 && (
          <Card>
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-[13px]">已添加 {files.length} 个文件</span>
              <Btn size="sm" icon={Trash2} onClick={() => { setFiles([]); setResults([]); }}>清空</Btn>
            </div>
            <div style={{ maxHeight: 220, overflowY: 'auto' }}>
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
              <Btn variant="primary" size="sm" icon={ImageDown} onClick={() => saveZipFiles('omnikit-hd.zip', results.map((r) => ({ name: r.name, blob: r.blob })))}>
                保存全部 (ZIP)
              </Btn>
            </div>
            {results.map((r, i) => (
              <FileRow
                key={`${r.name}-${i}`} name={r.name}
                right={
                  <span className="sz mono">
                    {r.origW}×{r.origH} → <span className="tag-ok">{r.w}×{r.h}</span> · {fmtSize(r.blob.size)}
                    <button className="btn btn-ghost btn-sm" style={{ marginLeft: 8 }} onClick={() => saveBlob(r.name, r.blob)}>保存</button>
                  </span>
                }
              />
            ))}
          </Card>
        )}
      </div>

      <Card>
        <Field label="放大倍数">
          <Seg
            value={String(factor)} onChange={(v) => setFactor(Number(v) as 2 | 3 | 4)}
            options={[{ value: '2', label: '2×' }, { value: '3', label: '3×' }, { value: '4', label: '4×' }]}
          />
        </Field>
        <Slider label="锐化增强" min={0} max={100} value={sharpen} onChange={setSharpen} fmt={(v) => (v === 0 ? '关闭' : `${v}%`)} />
        <Field label="输出最长边上限" hint="防止内存占用过大">
          <Select value={maxSide} onChange={(e) => setMaxSide(e.target.value)}>
            <option value="2048">2048 px</option>
            <option value="4096">4096 px（推荐）</option>
            <option value="8192">8192 px（大图慎选）</option>
          </Select>
        </Field>
        <Field label="输出格式">
          <Select value={fmt} onChange={(e) => setFmt(e.target.value as typeof fmt)}>
            <option value="keep">保持原格式</option>
            <option value="png">PNG</option>
            <option value="jpeg">JPG</option>
            <option value="webp">WebP</option>
          </Select>
        </Field>
        {fmt !== 'png' && fmt !== 'keep' && (
          <Field label="质量" hint={`${quality}%`}>
            <input type="range" min={40} max={100} value={quality} style={{ width: '100%' }} onChange={(e) => setQuality(Number(e.target.value))} />
          </Field>
        )}
        {busy && <div className="mb-3"><Progress value={prog} /></div>}
        <Btn variant="primary" icon={factor >= 4 ? Sparkles : ZoomIn} loading={busy} onClick={run} style={{ width: '100%' }}>
          {busy ? `处理中 ${(prog * 100).toFixed(0)}%` : `开始高清放大 (${factor}×)`}
        </Btn>
        <p className="muted" style={{ fontSize: 12, marginTop: 10, lineHeight: 1.7 }}>
          渐进插值 + Unsharp Mask 锐化的纯本地算法，放大同时强化边缘清晰度，适合截图 / 插画 / 文档。
          照片类建议 2×；倍数越高越容易出现涂抹感，可配合调低锐化。
        </p>
      </Card>
    </div>
  );
}
