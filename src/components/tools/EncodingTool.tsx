import { useMemo, useState } from 'react';
import { ArrowUpDown, Binary, Lock, Unlock } from 'lucide-react';
import { Card, CopyBtn, Seg, TextArea, Toggle, toast } from '../ui';
import { b64Decode, b64Encode, hexDecode, hexEncode, unicodeDecode, unicodeEncode, urlDecode, urlEncode } from '../../lib/encoding';

type Kind = 'url' | 'base64' | 'unicode' | 'hex';

const SAMPLE = '你好，World！https://example.com/?q=测试';

const FNS: Record<Kind, { enc: (s: string, whole: boolean) => string; dec: (s: string) => string }> = {
  url: { enc: (s, whole) => urlEncode(s, !whole), dec: urlDecode },
  base64: { enc: (s) => b64Encode(s), dec: (s) => b64Decode(s) },
  unicode: { enc: (s) => unicodeEncode(s), dec: (s) => unicodeDecode(s) },
  hex: { enc: (s) => hexEncode(s).replace(/(..)/g, '$1 ').trim(), dec: (s) => hexDecode(s) },
};

export default function EncodingTool() {
  const [kind, setKind] = useState<Kind>('base64');
  const [input, setInput] = useState(SAMPLE);
  const [whole, setWhole] = useState(false); // url: encodeURI 模式
  const [lastDir, setLastDir] = useState<'enc' | 'dec'>('enc');

  const { output, error } = useMemo(() => {
    if (!input.trim()) return { output: '', error: '' };
    try {
      const fn = FNS[kind];
      return { output: lastDir === 'enc' ? fn.enc(input, whole) : fn.dec(input), error: '' };
    } catch {
      return { output: '', error: lastDir === 'enc' ? '编码失败：输入包含非法字符' : '解码失败：内容格式不正确' };
    }
  }, [input, kind, lastDir, whole]);

  const encode = () => setLastDir('enc');
  const decode = () => setLastDir('dec');
  const swap = () => {
    if (output && !error) { setInput(output); setLastDir(lastDir === 'enc' ? 'dec' : 'enc'); }
    else toast.info('先进行一次编码 / 解码，再交换');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <Seg
          value={kind} onChange={(v) => { setKind(v); }}
          options={[
            { value: 'url', label: 'URL' },
            { value: 'base64', label: 'Base64' },
            { value: 'unicode', label: 'Unicode' },
            { value: 'hex', label: 'Hex' },
          ]}
        />
        <span className="muted" style={{ fontSize: 12 }}>当前动作：<b className="grad-text-span">{lastDir === 'enc' ? '编码 ▲' : '解码 ▼'}</b></span>
      </div>

      {kind === 'url' && (
        <div className="mb-4"><Toggle checked={whole} onChange={setWhole} label="整 URI 模式（保留 ://?&= 等 URL 结构字符）" /></div>
      )}

      <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <Card>
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-[13px]">输入</span>
            <button className="btn btn-ghost btn-sm" onClick={swap}><ArrowUpDown size={13} /> 与输出交换</button>
          </div>
          <TextArea value={input} onChange={(e) => setInput(e.target.value)} style={{ minHeight: 300 }} />
          <div className="flex gap-2 mt-3">
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={encode}><Lock size={14} /> 编码</button>
            <button className="btn btn-soft" style={{ flex: 1 }} onClick={decode}><Unlock size={14} /> 解码</button>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-[13px]">输出</span>
            <CopyBtn text={error ? '' : output} />
          </div>
          {error ? <div style={{ color: '#fda4af', fontSize: 13 }}>✕ {error}</div> : <TextArea readOnly value={output} style={{ minHeight: 340 }} />}
          <p className="muted flex items-center gap-1.5" style={{ fontSize: 12, marginTop: 8 }}>
            <Binary size={12} /> Base64 / Hex 均按 UTF-8 处理，中文不会乱码
          </p>
        </Card>
      </div>
    </div>
  );
}
