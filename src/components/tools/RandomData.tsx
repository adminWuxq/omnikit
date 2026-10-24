import { useState } from 'react';
import { Copy, Dices, Download, Phone, Plus, Fingerprint, Trash2, Braces } from 'lucide-react';
import { Btn, Card, CopyBtn, Field, Input, Seg, Select, TextArea, toast } from '../ui';
import { generateMockJson, MOCK_TYPES, randomId, randomPhone, randomUuid, type MockField } from '../../lib/random';
import { saveText } from '../../lib/save';

type Tab = 'phone' | 'uuid' | 'id' | 'mock';

const defaultFields: MockField[] = [
  { key: 'id', type: 'increment', min: 0, max: 100, len: 8, options: '' },
  { key: 'name', type: 'name', min: 0, max: 100, len: 8, options: '' },
  { key: 'phone', type: 'phone', min: 0, max: 100, len: 8, options: '' },
  { key: 'email', type: 'email', min: 0, max: 100, len: 8, options: '' },
  { key: 'created_at', type: 'date', min: 0, max: 100, len: 8, options: '' },
];

export default function RandomData() {
  const [tab, setTab] = useState<Tab>('mock');
  const [count, setCount] = useState(10);
  const [out, setOut] = useState('');

  // 自定义 ID
  const [prefix, setPrefix] = useState('');
  const [idLen, setIdLen] = useState(16);
  const [cs, setCs] = useState({ lower: true, upper: true, digits: true, safe: false });

  // Mock
  const [fields, setFields] = useState<MockField[]>(defaultFields);
  const [rows, setRows] = useState(10);

  const setField = (i: number, patch: Partial<MockField>) =>
    setFields((v) => v.map((f, j) => (j === i ? { ...f, ...patch } : f)));

  const gen = () => {
    try {
      if (tab === 'phone') setOut(Array.from({ length: count }, randomPhone).join('\n'));
      else if (tab === 'uuid') setOut(Array.from({ length: count }, randomUuid).join('\n'));
      else if (tab === 'id') {
        if (!cs.lower && !cs.upper && !cs.digits) return toast.error('请至少选择一种字符集');
        setOut(Array.from({ length: count }, () => prefix + randomId(idLen, cs.lower, cs.upper, cs.digits, cs.safe)).join('\n'));
      } else {
        const valid = fields.filter((f) => f.key.trim());
        if (!valid.length) return toast.error('请至少配置一个字段');
        setOut(generateMockJson(valid, rows));
      }
      toast.success('已生成');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <Seg
          value={tab} onChange={setTab}
          options={[
            { value: 'phone', label: <span className="flex items-center gap-1.5"><Phone size={13} /> 随机手机号</span> },
            { value: 'uuid', label: 'UUID' },
            { value: 'id', label: <span className="flex items-center gap-1.5"><Fingerprint size={13} /> 自定义 ID</span> },
            { value: 'mock', label: <span className="flex items-center gap-1.5"><Braces size={13} /> Mock JSON</span> },
          ]}
        />
        <Btn variant="primary" icon={Dices} onClick={gen}>生成</Btn>
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: '360px 1fr' }}>
        <Card>
          {tab === 'mock' ? (
            <>
              <Field label="数据条数"><Input type="number" min={1} max={2000} value={rows} onChange={(e) => setRows(Math.min(2000, Math.max(1, Number(e.target.value) || 1)))} /></Field>
              <div className="field">
                <div className="field-label"><span>字段定义</span>
                  <Btn size="sm" icon={Plus} onClick={() => setFields((v) => [...v, { key: `field_${v.length + 1}`, type: 'str', min: 0, max: 100, len: 8, options: '' }])}>添加</Btn>
                </div>
                <div className="flex flex-col gap-2" style={{ maxHeight: 380, overflowY: 'auto' }}>
                  {fields.map((f, i) => (
                    <div key={i} className="glass" style={{ padding: '8px 10px', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <input className="input" style={{ width: 100, padding: '5px 8px' }} placeholder="字段名" value={f.key} onChange={(e) => setField(i, { key: e.target.value })} />
                      <select className="select" style={{ width: 122, padding: '5px 24px 5px 8px' }} value={f.type} onChange={(e) => setField(i, { type: e.target.value as MockField['type'] })}>
                        {MOCK_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                      {f.type === 'pick' && <input className="input" style={{ width: 130, padding: '5px 8px' }} placeholder="候选,逗号分隔" value={f.options} onChange={(e) => setField(i, { options: e.target.value })} />}
                      {(f.type === 'int' || f.type === 'float') && (
                        <>
                          <input className="input mono" style={{ width: 62, padding: '5px 8px' }} type="number" value={f.min} onChange={(e) => setField(i, { min: Number(e.target.value) })} />
                          <span className="muted">~</span>
                          <input className="input mono" style={{ width: 62, padding: '5px 8px' }} type="number" value={f.max} onChange={(e) => setField(i, { max: Number(e.target.value) })} />
                        </>
                      )}
                      {f.type === 'str' && <input className="input mono" style={{ width: 62, padding: '5px 8px' }} type="number" value={f.len} title="长度" onChange={(e) => setField(i, { len: Number(e.target.value) })} />}
                      <button className="del" style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }} onClick={() => setFields((v) => v.filter((_, j) => j !== i))}><Trash2 size={13} /></button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              {tab !== 'id' && <Field label="生成数量" hint="1 ~ 1000"><Input type="number" min={1} max={1000} value={count} onChange={(e) => setCount(Math.min(1000, Math.max(1, Number(e.target.value) || 1)))} /></Field>}
              {tab === 'id' && (
                <>
                  <Field label="生成数量"><Input type="number" min={1} max={1000} value={count} onChange={(e) => setCount(Math.min(1000, Math.max(1, Number(e.target.value) || 1)))} /></Field>
                  <Field label="前缀（可选）"><Input value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="如 user_" /></Field>
                  <Field label="长度" hint={`${prefix.length + idLen} 位`}><input type="range" min={4} max={32} value={idLen} style={{ width: '100%' }} onChange={(e) => setIdLen(Number(e.target.value))} /></Field>
                  <div className="flex gap-3 flex-wrap mb-2" style={{ fontSize: 13 }}>
                    {([['lower', '小写'], ['upper', '大写'], ['digits', '数字'], ['safe', '去除易混淆']] as const).map(([k, label]) => (
                      <label key={k} className="toggle">
                        <input type="checkbox" checked={cs[k]} onChange={(e) => setCs((v) => ({ ...v, [k]: e.target.checked }))} />
                        <span className="track" /><span>{label}</span>
                      </label>
                    ))}
                  </div>
                </>
              )}
              {tab === 'phone' && <p className="muted" style={{ fontSize: 12 }}>生成符合大陆号段规则的手机号（1[3-9] 开头共 11 位）。</p>}
              {tab === 'uuid' && <p className="muted" style={{ fontSize: 12 }}>使用 crypto.randomUUID() 生成标准 UUID v4。</p>}
            </>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-[13px]">结果</span>
            <div className="flex gap-2">
              <CopyBtn text={out} />
              <Btn size="sm" icon={Download} disabled={!out} onClick={() => { saveText(`omnikit-${tab}.txt`, out); toast.success('已保存'); }}>保存</Btn>
            </div>
          </div>
          <TextArea readOnly value={out} style={{ minHeight: 480 }} placeholder="点击左上角「生成」查看结果…" />
        </Card>
      </div>
    </div>
  );
}
