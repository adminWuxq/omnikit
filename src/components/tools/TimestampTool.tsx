import { useEffect, useMemo, useState } from 'react';
import { Clock, Download } from 'lucide-react';
import { Btn, Card, CopyBtn, Field, Input, TextArea, toast } from '../ui';
import { fmtLocal, parseTimestamp, relTime } from '../../lib/time';
import { saveText } from '../../lib/save';

export default function TimestampTool() {
  const [now, setNow] = useState(Date.now());
  const [tsInput, setTsInput] = useState(String(Math.floor(Date.now() / 1000)));
  const [dateInput, setDateInput] = useState(() => new Date().toISOString().slice(0, 16));
  const [batch, setBatch] = useState('1700000000\n1700000000000\n1735689600000');

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const parsed = useMemo(() => parseTimestamp(tsInput), [tsInput]);
  const dateParsed = useMemo(() => {
    const d = new Date(dateInput);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [dateInput]);

  const batchOut = useMemo(() => {
    return batch.split(/\r?\n/).map((line) => {
      const t = line.trim();
      if (!t) return '';
      const d = parseTimestamp(t);
      return d ? `${t}  →  ${fmtLocal(d)}` : `${t}  →  ✕ 无法识别`;
    }).filter(Boolean).join('\n');
  }, [batch]);

  return (
    <div className="grid-2">
      <div className="grid-side">
        <Card>
          <div className="flex items-center gap-2 mb-2"><Clock size={16} style={{ color: '#a78bfa' }} /><span className="font-bold text-[13px]">当前时间</span></div>
          <div style={{ fontSize: 22, fontWeight: 800 }} className="grad-text-span">{fmtLocal(new Date(now))}</div>
          <div className="flex gap-2 mt-3 flex-wrap">
            <span className="chip">秒 <b>{Math.floor(now / 1000)}</b> <CopyBtn text={String(Math.floor(now / 1000))} /></span>
            <span className="chip">毫秒 <b>{now}</b> <CopyBtn text={String(now)} /></span>
          </div>
        </Card>

        <Card>
          <Field label="时间戳 → 日期" hint="支持秒/毫秒，自动识别位数，也可输入日期字符串">
            <Input className="mono" value={tsInput} onChange={(e) => setTsInput(e.target.value)} placeholder="1700000000 或 1700000000000" />
          </Field>
          {parsed ? (
            <div className="glass" style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{fmtLocal(parsed)}</div>
              <div className="muted mono" style={{ fontSize: 12, marginTop: 4 }}>ISO: {parsed.toISOString()}</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>相对：{relTime(parsed)} · 星期{'日一二三四五六'[parsed.getDay()]}</div>
            </div>
          ) : (
            <div className="tag-bad" style={{ fontSize: 13 }}>无法识别的时间戳</div>
          )}
        </Card>

        <Card>
          <Field label="日期 → 时间戳">
            <Input type="datetime-local" value={dateInput} onChange={(e) => setDateInput(e.target.value)} />
          </Field>
          {dateParsed && (
            <div className="flex gap-2 flex-wrap">
              <span className="chip">秒 <b>{Math.floor(dateParsed.getTime() / 1000)}</b></span>
              <span className="chip">毫秒 <b>{dateParsed.getTime()}</b></span>
            </div>
          )}
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-[13px]">批量转换</span>
          <div className="flex gap-2">
            <CopyBtn text={batchOut} />
            <Btn size="sm" icon={Download} onClick={() => { saveText('omnikit-timestamps.txt', batchOut); toast.success('已保存'); }} disabled={!batchOut}>保存</Btn>
          </div>
        </div>
        <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>每行一个时间戳（秒 / 毫秒自动判断）</p>
        <TextArea value={batch} onChange={(e) => setBatch(e.target.value)} style={{ minHeight: 150 }} />
        <div className="muted" style={{ textAlign: 'center', margin: '6px 0' }}>↓</div>
        <TextArea readOnly value={batchOut} style={{ minHeight: 150 }} />
      </Card>
    </div>
  );
}
