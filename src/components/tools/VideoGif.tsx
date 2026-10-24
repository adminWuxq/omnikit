import { useEffect, useState } from 'react';
import { Download, Film } from 'lucide-react';
import { Btn, Card, Dropzone, Field, FileRow, fmtSize, Progress, Slider, toast } from '../ui';
import { getFFmpeg, videoToGif } from '../../lib/media';
import { saveBlob } from '../../lib/save';

export default function VideoGif() {
  const [file, setFile] = useState<File | null>(null);
  const [width, setWidth] = useState(480);
  const [fps, setFps] = useState(12);
  const [busy, setBusy] = useState(false);
  const [prog, setProg] = useState(0);
  const [gif, setGif] = useState<{ name: string; url: string; blob: Blob } | null>(null);

  useEffect(() => { getFFmpeg().catch(() => undefined); }, []);

  const run = async () => {
    if (!file) return toast.info('请先选择视频');
    setBusy(true);
    setProg(0);
    try {
      const r = await videoToGif(file, { fps, width }, setProg);
      setGif({ ...r, url: URL.createObjectURL(r.blob) });
      toast.success('转换完成');
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
            <FileRow name={file.name} size={file.size} onRemove={() => { setFile(null); }} />
          ) : (
            <Dropzone accept="video/*" onFiles={(fs) => setFile(fs[0])} main="点击选择或拖入视频" sub="两遍调色板法，色彩还原更好" />
          )}
          {gif && (
            <div className="mt-4">
              <img src={gif.url} alt="gif 预览" style={{ width: '100%', borderRadius: 12, background: '#000' }} />
              <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                <span className="chip">大小 <b>{fmtSize(gif.blob.size)}</b></span>
                <Btn variant="primary" icon={Download} onClick={() => saveBlob(gif.name, gif.blob)}>保存 GIF</Btn>
              </div>
            </div>
          )}
        </Card>
      </div>

      <Card>
        <Slider label="GIF 宽度" min={160} max={800} step={20} value={width} onChange={setWidth} fmt={(v) => `${v} px`} />
        <Slider label="帧率" min={5} max={24} value={fps} onChange={setFps} fmt={(v) => `${v} fps`} />
        <div className="glass" style={{ padding: '10px 13px', fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
          提示：GIF 体积随宽度、帧率快速增长，表情包场景推荐 480px / 12fps。
        </div>
        {busy && <div className="mb-3"><Progress value={prog} /></div>}
        <Btn variant="primary" icon={Film} loading={busy} disabled={!file} onClick={run} style={{ width: '100%' }}>
          {busy ? `转换中 ${(prog * 100).toFixed(0)}%` : '转换为 GIF'}
        </Btn>
      </Card>
    </div>
  );
}
