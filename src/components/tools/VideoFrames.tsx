import { useEffect, useRef, useState } from 'react';
import { Film, ImageDown } from 'lucide-react';
import { Btn, Card, Dropzone, Field, FileRow, fmtSize, Progress, Seg, Select, toast } from '../ui';
import { extractFrames, getFFmpeg } from '../../lib/media';
import { saveBlob, saveZipFiles } from '../../lib/save';

export default function VideoFrames() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'fps' | 'interval'>('fps');
  const [fps, setFps] = useState('2');
  const [format, setFormat] = useState<'png' | 'jpg'>('jpg');
  const [busy, setBusy] = useState(false);
  const [prog, setProg] = useState(0);
  const [frames, setFrames] = useState<{ name: string; url: string; blob: Blob }[]>([]);
  const urlsRef = useRef<string[]>([]);

  useEffect(() => { getFFmpeg().catch(() => undefined); }, []);
  useEffect(() => () => urlsRef.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const run = async () => {
    if (!file) return toast.info('请先选择视频');
    setBusy(true);
    setProg(0);
    frames.forEach((f) => URL.revokeObjectURL(f.url));
    setFrames([]);
    try {
      const v = Number(fps) || 1;
      const list = await extractFrames(file, { fps: v, format, everyNSeconds: mode === 'interval' }, (p) => setProg(p));
      if (!list.length) throw new Error('没有抽出帧，请检查抽帧频率');
      setFrames(list.map((f) => ({ ...f, url: URL.createObjectURL(f.blob) })));
      toast.success(`共抽出 ${list.length} 帧`);
    } catch (e) {
      toast.error((e as Error).message);
    }
    setBusy(false);
  };

  return (
    <div className="grid-2">
      <div className="grid-side">
        <Card>
          {file ? (
            <div>
              <FileRow name={file.name} size={file.size} onRemove={() => setFile(null)} />
              <video src={URL.createObjectURL(file)} controls style={{ width: '100%', borderRadius: 12, marginTop: 10, background: '#000' }} />
            </div>
          ) : (
            <Dropzone
              accept="video/*" onFiles={(fs) => setFile(fs[0])}
              main="点击选择或拖入视频"
              sub="MP4 / MOV / MKV / WEBM · ffmpeg.wasm 本地抽帧"
            />
          )}
        </Card>
        {frames.length > 0 && (
          <Card>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <span className="chip">共 <b>{frames.length}</b> 帧</span>
              <Btn variant="primary" size="sm" icon={ImageDown} onClick={() => saveZipFiles('omnikit-frames.zip', frames.map((f) => ({ name: f.name, blob: f.blob })))}>
                全部打包下载 (ZIP)
              </Btn>
            </div>
            <div className="thumb-grid">
              {frames.map((f, i) => (
                <div className="thumb" key={f.name + i}>
                  <img src={f.url} alt={f.name} loading="lazy" />
                  <span className="no">{i + 1}</span>
                  <button className="btn btn-primary btn-sm save" onClick={() => saveBlob(f.name, f.blob)}>保存</button>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      <Card>
        <Field label="抽帧模式">
          <Seg value={mode} onChange={setMode} options={[{ value: 'fps', label: '每秒 N 帧' }, { value: 'interval', label: '每 N 秒 1 帧' }]} />
        </Field>
        <Field label={mode === 'fps' ? '每秒帧数' : '间隔秒数'}>
          <Select value={fps} onChange={(e) => setFps(e.target.value)}>
            {mode === 'fps'
              ? ['0.5', '1', '2', '4', '6', '8', '12', '24'].map((v) => <option key={v} value={v}>{v} 帧/秒</option>)
              : ['0.5', '1', '2', '3', '5', '10', '15', '30', '60'].map((v) => <option key={v} value={v}>每 {v} 秒 1 帧</option>)}
          </Select>
        </Field>
        <Field label="输出格式">
          <Select value={format} onChange={(e) => setFormat(e.target.value as 'png' | 'jpg')}>
            <option value="jpg">JPG（体积小）</option>
            <option value="png">PNG（无损）</option>
          </Select>
        </Field>
        {busy && <div className="mb-3"><Progress value={prog} /></div>}
        <Btn variant="primary" icon={Film} loading={busy} disabled={!file} onClick={run} style={{ width: '100%' }}>
          {busy ? `抽帧中 ${(prog * 100).toFixed(0)}%` : '开始抽帧'}
        </Btn>
        <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
          视频较长且帧率较高时帧数会很多，建议先用低频率试跑。所有处理均在本地完成。
        </p>
      </Card>
    </div>
  );
}
