import { useMemo, useState } from 'react';
import { Regex, Replace } from 'lucide-react';
import { Card, CopyBtn, Field, Input, Seg, TextArea, toast } from '../ui';
import { REGEX_PRESETS } from '../../lib/jsonlib';
import { saveText } from '../../lib/save';
import { Btn } from '../ui';

type Mode = 'extract' | 'replace';

const SAMPLE = `联系方式：13812345678，备用 15987654321
邮箱：zhang.wei@example.com 与 lina123@test.cn
官网 https://example.com/path?a=1 文档 http://docs.example.com
订单号 #FFA8C21 创建于 2024-03-15`;

export default function RegexTool() {
  const [pattern, setPattern] = useState(REGEX_PRESETS[0].pattern);
  const [flags, setFlags] = useState({ g: true, i: false, m: true, s: false });
  const [mode, setMode] = useState<Mode>('extract');
  const [replacement, setReplacement] = useState('[手机号]');
  const [input, setInput] = useState(SAMPLE);

  const { output, error, count } = useMemo(() => {
    const f = ['g', 'i', 'm', 's'].filter((k) => (flags as Record<string, boolean>)[k]).join('');
    try {
      const re = new RegExp(pattern, f);
      if (mode === 'extract') {
        const matches = input.match(new RegExp(pattern, f.includes('g') ? f : f + 'g'));
        return { output: (matches ?? []).join('\n'), error: '', count: matches?.length ?? 0 };
      }
      const out = input.replace(new RegExp(pattern, f.includes('g') ? f : f + 'g'), replacement);
      const matches = input.match(new RegExp(pattern, f.includes('g') ? f : f + 'g'));
      return { output: out, error: '', count: matches?.length ?? 0 };
    } catch (e) {
      return { output: '', error: (e as Error).message, count: 0 };
    }
  }, [pattern, flags, mode, replacement, input]);

  const toggleFlag = (k: keyof typeof flags) => setFlags((v) => ({ ...v, [k]: !v[k] }));

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {REGEX_PRESETS.map((p) => (
          <button key={p.name} className={`chip ${pattern === p.pattern ? '' : 'hover:opacity-80'}`}
            style={pattern === p.pattern ? { borderColor: 'rgba(139,92,246,.6)', background: 'var(--grad-soft)', color: '#ddd6fe' } : undefined}
            onClick={() => setPattern(p.pattern)}>
            {p.name}
          </button>
        ))}
      </div>

      <Card className="mb-4">
        <div className="grid-2" style={{ gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end' }}>
          <Field label="正则表达式" hint={error ? <span className="tag-bad">语法错误</span> : <span className="tag-ok">匹配 {count} 处</span>}>
            <Input className="mono" value={pattern} onChange={(e) => setPattern(e.target.value)} placeholder="例如 1[3-9]\d{9}" />
          </Field>
          <div className="flex gap-1.5 pb-1">
            {(['g', 'i', 'm', 's'] as const).map((k) => (
              <button key={k} onClick={() => toggleFlag(k)} className={`chip mono ${flags[k] ? 'on' : ''}`}
                style={flags[k] ? { borderColor: 'rgba(139,92,246,.6)', background: 'var(--grad-soft)', color: '#ddd6fe' } : undefined}>
                {k}
              </button>
            ))}
          </div>
        </div>
        <Field label="模式">
          <Seg value={mode} onChange={setMode}
            options={[{ value: 'extract', label: <span className="flex items-center gap-1.5"><Regex size={13} /> 提取匹配</span> }, { value: 'replace', label: <span className="flex items-center gap-1.5"><Replace size={13} /> 批量替换</span> }]} />
        </Field>
        {mode === 'replace' && (
          <Field label="替换为" hint="支持 $1 $2 分组引用">
            <Input className="mono" value={replacement} onChange={(e) => setReplacement(e.target.value)} />
          </Field>
        )}
      </Card>

      <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <Card>
          <Field label="输入文本"><TextArea value={input} onChange={(e) => setInput(e.target.value)} style={{ minHeight: 300 }} /></Field>
        </Card>
        <Card>
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-[13px]">{mode === 'extract' ? '提取结果' : '替换结果'}</span>
            <div className="flex gap-2">
              <CopyBtn text={output} />
              <Btn size="sm" onClick={() => { saveText('omnikit-regex.txt', output); toast.success('已保存'); }} disabled={!output}>保存</Btn>
            </div>
          </div>
          {error ? <div style={{ color: '#fda4af', fontSize: 13 }}>✕ {error}</div> : <TextArea readOnly value={output} style={{ minHeight: 300 }} />}
        </Card>
      </div>
    </div>
  );
}
