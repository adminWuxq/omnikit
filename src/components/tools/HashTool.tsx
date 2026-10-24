import { useEffect, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { Card, CopyBtn, Field, Input, TextArea, Toggle } from '../ui';
import { hmacHex, md5Hex, shaHex } from '../../lib/crypto';

export default function HashTool() {
  const [text, setText] = useState('hello omnikit');
  const [key, setKey] = useState('my-secret-key');
  const [upper, setUpper] = useState(false);
  const [res, setRes] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const t = text;
      try {
        const [sha1, sha256, sha512, h1, h256, h512] = await Promise.all([
          shaHex('SHA-1', t), shaHex('SHA-256', t), shaHex('SHA-512', t),
          hmacHex('SHA-1', key, t).catch(() => ''),
          hmacHex('SHA-256', key, t).catch(() => ''),
          hmacHex('SHA-512', key, t).catch(() => ''),
        ]);
        if (!cancelled) {
          setRes({
            MD5: md5Hex(t), 'SHA-1': sha1, 'SHA-256': sha256, 'SHA-512': sha512,
            'HMAC-SHA1': h1, 'HMAC-SHA256': h256, 'HMAC-SHA512': h512,
          });
        }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [text, key]);

  const fmt = (s: string) => (upper ? s.toUpperCase() : s);

  return (
    <div className="grid-2" style={{ gridTemplateColumns: '400px 1fr' }}>
      <Card>
        <Field label="待计算内容（输入即实时计算）">
          <TextArea value={text} onChange={(e) => setText(e.target.value)} style={{ minHeight: 180 }} placeholder="输入任意文本…" />
        </Field>
        <Field label="HMAC 密钥（仅 HMAC 需要）">
          <div className="flex items-center gap-2">
            <KeyRound size={15} style={{ color: '#a78bfa', flexShrink: 0 }} />
            <Input className="mono" value={key} onChange={(e) => setKey(e.target.value)} placeholder="secret" />
          </div>
        </Field>
        <Toggle checked={upper} onChange={setUpper} label="结果大写显示" />
        <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
          MD5 / SHA 常用于文件校验与缓存 key；HMAC 用于接口签名（如云服务 API 签名），均为本地计算。
        </p>
      </Card>

      <Card>
        {Object.entries(res).map(([k, v]) => (
          <div className="hash-row" key={k}>
            <span className="k">{k}</span>
            <span className="v">{fmt(v)}</span>
            <CopyBtn text={fmt(v)} />
          </div>
        ))}
        {!text && <p className="muted" style={{ fontSize: 13 }}>在左侧输入内容后，此处显示全部哈希结果。</p>}
      </Card>
    </div>
  );
}
