import { useMemo, useState } from 'react';
import { Braces, Download, FileText, Table } from 'lucide-react';
import { Btn, Card, CopyBtn, Field, Seg, Select, TextArea, Toggle, toast } from '../ui';
import { csvToJson, formatJson, jsonToCsv } from '../../lib/jsonlib';
import { saveText } from '../../lib/save';

type Tab = 'fmt' | 'j2c' | 'c2j';

const SAMPLE_JSON = `[
  { "name": "张伟", "age": 28, "city": "北京", "tags": ["vip", "active"] },
  { "name": "李娜", "age": 34, "city": "上海", "tags": ["normal"] }
]`;

export default function JsonTool() {
  const [tab, setTab] = useState<Tab>('fmt');
  const [input, setInput] = useState(SAMPLE_JSON);
  const [indent, setIndent] = useState<'2' | '4' | 'tab' | 'min'>('2');
  const [delim, setDelim] = useState(',');
  const [hasHeader, setHasHeader] = useState(true);
  const [typed, setTyped] = useState(true);

  const { output, error } = useMemo(() => {
    if (!input.trim()) return { output: '', error: '' };
    try {
      if (tab === 'fmt') return { output: formatJson(input, indent), error: '' };
      if (tab === 'j2c') return { output: jsonToCsv(input, delim), error: '' };
      return { output: csvToJson(input, delim, hasHeader, typed), error: '' };
    } catch (e) {
      return { output: '', error: (e as Error).message };
    }
  }, [input, tab, indent, delim, hasHeader, typed]);

  const dl = () => {
    const name = tab === 'fmt' ? 'omnikit.json' : tab === 'j2c' ? 'omnikit.csv' : 'omnikit.json';
    saveText(name, output);
    toast.success('已保存');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <Seg
          value={tab} onChange={setTab}
          options={[
            { value: 'fmt', label: <span className="flex items-center gap-1.5"><Braces size={13} /> 格式化 / 压缩</span> },
            { value: 'j2c', label: <span className="flex items-center gap-1.5"><Table size={13} /> JSON → CSV</span> },
            { value: 'c2j', label: <span className="flex items-center gap-1.5"><FileText size={13} /> CSV → JSON</span> },
          ]}
        />
        <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
          载入文件
          <input type="file" hidden accept=".json,.csv,.txt" onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) { const r = new FileReader(); r.onload = () => setInput(String(r.result ?? '')); r.readAsText(f); }
            e.target.value = '';
          }} />
        </label>
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <Card>
          <Field label="输入" hint={`${input.length} 字符`}>
            <TextArea value={input} onChange={(e) => setInput(e.target.value)} style={{ minHeight: 400 }}
              placeholder={tab === 'c2j' ? '粘贴 CSV（首行表头）…' : '粘贴 JSON…'} />
          </Field>
          {error && <div className="glass" style={{ padding: '10px 13px', fontSize: 12.5, color: '#fda4af', borderColor: 'rgba(239,68,68,.35)' }}>✕ {error}</div>}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <span className="font-bold text-[13px]">输出</span>
            <div className="flex gap-2 flex-wrap">
              <CopyBtn text={output} />
              <Btn size="sm" icon={Download} onClick={dl} disabled={!output}>保存</Btn>
            </div>
          </div>

          {tab === 'fmt' && (
            <Field label="缩进">
              <Seg
                value={indent} onChange={setIndent}
                options={[{ value: '2', label: '2 空格' }, { value: '4', label: '4 空格' }, { value: 'tab', label: 'Tab' }, { value: 'min', label: '压缩' }]}
              />
            </Field>
          )}
          {(tab === 'j2c' || tab === 'c2j') && (
            <div className="flex gap-4 flex-wrap mb-3">
              <Field label="分隔符" style={{ width: 130, marginBottom: 0 }}>
                <Select value={delim} onChange={(e) => setDelim(e.target.value)}>
                  <option value=",">逗号 ,</option>
                  <option value=";">分号 ;</option>
                  <option value={'\t'}>Tab</option>
                </Select>
              </Field>
              {tab === 'c2j' && (
                <div className="flex flex-col gap-2 justify-end pb-1">
                  <Toggle checked={hasHeader} onChange={setHasHeader} label="首行为表头" />
                  <Toggle checked={typed} onChange={setTyped} label="自动类型推断" />
                </div>
              )}
            </div>
          )}

          <TextArea readOnly value={output} style={{ minHeight: tab === 'fmt' ? 340 : 300 }} />
          {tab === 'j2c' && !error && output && (
            <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>嵌套字段已按「点分路径」展开，数组字段序列化为 JSON 字符串。</p>
          )}
        </Card>
      </div>
    </div>
  );
}
