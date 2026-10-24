import { useEffect, useState } from 'react';
import { AudioLines, ImageDown, Play, Trash2 } from 'lucide-react';
import { Btn, Card, Dropzone, Field, FileRow, fmtSize, Progress, Select, toast } from '../ui';
import { AUDIO_FORMATS, convertAudio, getFFmpeg, onLog, type AudioFmt } from '../../lib/media';
import { saveBlob, saveZipFiles } from '../../lib/save';

export default function AudioConvert() {
  const [files, setFiles] = useState<File[]>([]);
  const [target, setTarget] = useState<AudioFmt>('mp3');
  const [bitrate, setBitrate] = useState('192');
  const [engineLoading, setEngineLoading] = useState(false);
  const [engineReady, setEngineReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [prog, setProg] = useState(0);
  const [results, setResults] = useState<{ name: string; blob: Blob }[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  // 预热引擎 & 订阅日志
  useEffect(() => {
    const off = onLog(() => setLogs((l) => l.length > 60 ? l.slice(-30) : [...l]));
    setEngineLoading(true);
    getFFmpeg()
      .then(() => { setEngineReady(true); toast.success('解码引擎已就绪'); })
      .catch((e) => toast.error(`引擎加载失败：${(e as Error).message}`))
      .finally(() => setEngineLoading(false));
    return () => { off(); };
  }, []);

  const run = async () => {
    if (!files.length) return toast.info('请先添加音频文件');
    setBusy(true);
    setResults([]);
    const out: { name: string; blob: Blob }[] = [];
    for (let i = 0; i < files.length; i++) {
      try {
        const r = await convertAudio(files[i], target, Number(bitrate), (p) =>
          setProg((i + p) / files.length));
        out.push(r);
      } catch (e) {
        toast.error(`${files[i].name}：${(e as Error).message}`);
      }
      setResults([...out]);
    }
    setBusy(false);
    if (out.length) toast.success(`已转换 ${out.length} 个文件`);
  };

  return (
    <div className="grid-2">
      <div className="grid-side">
        <Card>
          <Dropzone
            accept="audio/*,.mp3,.wav,.flac,.ogg,.m4a,.aac,.wma,.opus" multiple
            onFiles={(fs) => setFiles((v) => [...v, ...fs])}
            main="点击选择或拖入音频（支持批量）"
            sub="MP3 / WAV / FLAC / OGG / M4A / WMA 等 · ffmpeg 本地转换"
          />
        </Card>
        {files.length > 0 && (
          <Card>
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-[13px]">已添加 {files.length} 个文件</span>
              <Btn size="sm" icon={Trash2} onClick={() => { setFiles([]); setResults([]); }}>清空</Btn>
            </div>
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {files.map((f, i) => (
                <FileRow key={`${f.name}-${i}`} name={f.name} size={f.size} onRemove={() => setFiles((v) => v.filter((_, j) => j !== i))} />
              ))}
            </div>
          </Card>
        )}
        {results.length > 0 && (
          <Card>
            <div className="flex items-center justify-between mb-3">
              <span className="chip">已转换 <b>{results.length}</b> 个</span>
              {results.length > 1 && (
                <Btn variant="primary" size="sm" icon={ImageDown} onClick={() => saveZipFiles('omnikit-audio.zip', results)}>打包下载 (ZIP)</Btn>
              )}
            </div>
            {results.map((r, i) => (
              <FileRow
                key={`${r.name}-${i}`} name={r.name}
                right={
                  <span className="sz mono flex items-center gap-2">
                    {fmtSize(r.blob.size)}
                    <button className="btn btn-ghost btn-sm" onClick={() => saveBlob(r.name, r.blob)}>保存</button>
                  </span>
                }
              />
            ))}
          </Card>
        )}
      </div>

      <Card>
        <Field label="目标格式">
          <Select value={target} onChange={(e) => setTarget(e.target.value as AudioFmt)}>
            {Object.entries(AUDIO_FORMATS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </Select>
        </Field>
        {(target === 'mp3' || target === 'm4a') && (
          <Field label="比特率">
            <Select value={bitrate} onChange={(e) => setBitrate(e.target.value)}>
              <option value="128">128 kbps（较小）</option>
              <option value="192">192 kbps（推荐）</option>
              <option value="320">320 kbps（最高）</option>
            </Select>
          </Field>
        )}

        <div className="glass" style={{ padding: '10px 13px', fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
          {engineLoading && <span className="flex items-center gap-2"><span className="spin inline-block">⟳</span> 正在加载 ffmpeg 解码引擎（约 30MB，首次稍慢）…</span>}
          {engineReady && <span className="tag-ok">✓ 引擎已就绪（已内置本地内核，离线可用）</span>}
        </div>

        {busy && <div className="mb-3"><Progress value={prog} /></div>}
        <Btn variant="primary" icon={AudioLines} loading={busy} disabled={engineLoading || !files.length} onClick={run} style={{ width: '100%' }}>
          {busy ? `转换中 ${(prog * 100).toFixed(0)}%` : `全部转换为 ${AUDIO_FORMATS[target].label}`}
        </Btn>

        {logs.length > 0 && (
          <details className="mt-4">
            <summary style={{ fontSize: 12, color: 'var(--muted)', cursor: 'pointer' }}>ffmpeg 日志（最近 {Math.min(logs.length, 8)} 条）</summary>
            <pre className="mono" style={{ fontSize: 10.5, color: '#7dd3fc', maxHeight: 140, overflow: 'auto', marginTop: 8, whiteSpace: 'pre-wrap' }}>
              {logs.slice(-8).join('\n')}
            </pre>
          </details>
        )}
        <p className="muted flex items-center gap-1.5" style={{ fontSize: 12, marginTop: 10 }}>
          <Play size={12} /> 全程本地运行，音频不会上传到任何服务器
        </p>
      </Card>
    </div>
  );
}
