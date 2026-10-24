import { useState } from 'react';
import { ImageDown, Sparkles, Trash2 } from 'lucide-react';
import { Btn, Card, Dropzone, Field, FileRow, fmtSize, Progress, Select, toast } from '../ui';
import { transformImage, type Fmt } from '../../lib/image';
import { saveBlob, saveZipFiles } from '../../lib/save';

interface Result { name: string; blob: Blob; origSize: number }

export default function ImageConvert() {
  const [files, setFiles] = useState<File[]>([]);
  const [fmt, setFmt] = useState<'keep' | Fmt>('webp');
  const [quality, setQuality] = useState(80);
  const [maxSide, setMaxSide] = useState('0');
  const [busy, setBusy] = useState(false);
  const [prog, setProg] = useState(0);
  const [results, setResults] = useState<Result[]>([]);

  const run = async () => {
    if (!files.length) return toast.info('请先添加图片');
    setBusy(true);
    setResults([]);
    const out: Result[] = [];
    const limit = Number(maxSide) || 0;
    for (let i = 0; i < files.length; i++) {
      try {
        const r = await transformImage(files[i], {
          fmt,
          quality: quality / 100,
          size: limit
            ? (w, h) => {
                const s = Math.min(1, limit / Math.max(w, h));
                return { w: Math.round(w * s), h: Math.round(h * s) };
              }
            : undefined,
        });
        out.push({ name: r.name, blob: r.blob, origSize: files[i].size });
      } catch (e) {
        toast.error(`${files[i].name}：${(e as Error).message}`);
      }
      setProg((i + 1) / files.length);
      setResults([...out]);
    }
    setBusy(false);
    const total = out.reduce((s, r) => s + r.origSize, 0);
    const now = out.reduce((s, r) => s + r.blob.size, 0);
    if (out.length) toast.success(`完成 ${out.length} 张，体积 ${fmtSize(total)} → ${fmtSize(now)}`);
  };

  const totalOrig = results.reduce((s, r) => s + r.origSize, 0);
  const totalNew = results.reduce((s, r) => s + r.blob.size, 0);

  return (
    <div className="grid-2">
      <div className="grid-side">
        <Card>
          <Dropzone
            accept="image/*" multiple
            onFiles={(fs) => setFiles((v) => [...v, ...fs])}
            main="点击选择或拖入图片（支持批量）"
            sub="PNG / JPG / WebP / GIF / BMP · 全部本地处理，不上传"
          />
        </Card>
        {files.length > 0 && (
          <Card>
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-[13px]">已添加 {files.length} 个文件</span>
              <Btn size="sm" icon={Trash2} onClick={() => { setFiles([]); setResults([]); }}>清空</Btn>
            </div>
            <div style={{ maxHeight: 260, overflowY: 'auto' }}>
              {files.map((f, i) => (
                <FileRow key={`${f.name}-${i}`} name={f.name} size={f.size} onRemove={() => setFiles((v) => v.filter((_, j) => j !== i))} />
              ))}
            </div>
          </Card>
        )}
        {results.length > 0 && (
          <Card>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex gap-2 flex-wrap">
                <span className="chip">共 <b>{results.length}</b> 张</span>
                <span className="chip">{fmtSize(totalOrig)} → <b>{fmtSize(totalNew)}</b></span>
                {totalOrig > 0 && (
                  <span className={`chip ${totalNew <= totalOrig ? 'good' : ''}`}>
                    {totalNew <= totalOrig ? '节省' : '增大'} <b>{Math.abs(Math.round((1 - totalNew / totalOrig) * 100))}%</b>
                  </span>
                )}
              </div>
              <Btn variant="primary" size="sm" icon={ImageDown} onClick={() => saveZipFiles('omnikit-images.zip', results.map((r) => ({ name: r.name, blob: r.blob })))}>
                保存全部 (ZIP)
              </Btn>
            </div>
            {results.map((r, i) => (
              <FileRow
                key={`${r.name}-${i}`} name={r.name}
                right={
                  <span className="sz mono">
                    {fmtSize(r.origSize)} → <span className={r.blob.size <= r.origSize ? 'tag-ok' : 'tag-warn'}>{fmtSize(r.blob.size)}</span>
                    <button className="btn btn-ghost btn-sm" style={{ marginLeft: 8 }} onClick={() => saveBlob(r.name, r.blob)}>保存</button>
                  </span>
                }
              />
            ))}
          </Card>
        )}
      </div>

      <Card>
        <Field label="输出格式">
          <Select value={fmt} onChange={(e) => setFmt(e.target.value as typeof fmt)}>
            <option value="keep">保持原格式</option>
            <option value="webp">WebP（体积最小，推荐）</option>
            <option value="jpeg">JPG（兼容性最好）</option>
            <option value="png">PNG（无损 / 透明）</option>
          </Select>
        </Field>
        <Field label="压缩质量" hint={`${quality}%`}>
          <input type="range" min={30} max={100} value={quality} style={{ width: '100%' }} onChange={(e) => setQuality(Number(e.target.value))} />
        </Field>
        <Field label="最长边限制" hint="超出将等比缩小">
          <Select value={maxSide} onChange={(e) => setMaxSide(e.target.value)}>
            <option value="0">不限制</option>
            <option value="4096">4096 px</option>
            <option value="2048">2048 px</option>
            <option value="1280">1280 px</option>
            <option value="800">800 px</option>
          </Select>
        </Field>
        {busy && <div className="mb-3"><Progress value={prog} /></div>}
        <Btn variant="primary" icon={Sparkles} loading={busy} onClick={run} style={{ width: '100%' }}>
          {busy ? `转换中 ${(prog * 100).toFixed(0)}%` : '开始转换'}
        </Btn>
        <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
          WebP 通常比 JPG 小 25%~50%；GIF/BMP 等格式会自动转为 PNG。JPG 不支持透明通道，会自动铺白底。
        </p>
      </Card>
    </div>
  );
}
