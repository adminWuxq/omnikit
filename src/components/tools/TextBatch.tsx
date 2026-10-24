import { useMemo, useState } from 'react';
import { Download, Type } from 'lucide-react';
import { Btn, Card, CopyBtn, Field, Seg, TextArea, Toggle, toast } from '../ui';
import { defaultTextOps, processText, type TextOps } from '../../lib/text';
import { saveText } from '../../lib/save';

export default function TextBatch() {
  const [input, setInput] = useState('第一行\n\n第二行\n第二行\n  \n第三行  \nbanana\napple\nCherry');
  const [ops, setOps] = useState<TextOps>(defaultTextOps);
  const set = <K extends keyof TextOps,>(k: K, v: TextOps[K]) => setOps((o) => ({ ...o, [k]: v }));

  const { output, stats } = useMemo(() => processText(input, ops), [input, ops]);

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        <span className="chip">行数 <b>{stats.lines}</b></span>
        <span className="chip">字符 <b>{stats.chars}</b></span>
        {ops.removeEmpty && <span className="chip">去空行 <b>-{stats.emptyRemoved}</b></span>}
        {ops.dedupe && <span className="chip good">去重 <b>-{stats.removedDupes}</b></span>}
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: '1fr 300px' }}>
        <div className="grid-side">
          <Card>
            <Field label="输入文本"><TextArea value={input} onChange={(e) => setInput(e.target.value)} style={{ minHeight: 260 }} placeholder="粘贴要处理的文本…" /></Field>
          </Card>
          <Card>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-[13px]">处理结果（实时）</span>
              <div className="flex gap-2">
                <CopyBtn text={output} />
                <Btn size="sm" icon={Download} onClick={() => { saveText('omnikit-text.txt', output); toast.success('已保存'); }}>保存 .txt</Btn>
              </div>
            </div>
            <TextArea readOnly value={output} style={{ minHeight: 220 }} />
          </Card>
        </div>

        <Card>
          <div className="field"><div className="field-label"><span>清洗</span></div>
            <div className="flex flex-col gap-2.5">
              <Toggle checked={ops.trim} onChange={(v) => set('trim', v)} label="去行首尾空格" />
              <Toggle checked={ops.removeEmpty} onChange={(v) => set('removeEmpty', v)} label="删除空行" />
              <Toggle checked={ops.dedupe} onChange={(v) => set('dedupe', v)} label="删除重复行" />
            </div>
          </div>
          <Field label="排序">
            <Seg
              value={ops.sort} onChange={(v) => set('sort', v)}
              options={[{ value: 'none', label: '不排序' }, { value: 'asc', label: '升序' }, { value: 'desc', label: '降序' }]}
            />
          </Field>
          <Field label="大小写">
            <Seg
              value={ops.caseMode} onChange={(v) => set('caseMode', v)}
              options={[
                { value: 'none', label: '不变' }, { value: 'upper', label: 'AA' },
                { value: 'lower', label: 'aa' }, { value: 'capitalize', label: 'Aa' },
              ]}
            />
          </Field>
          <div className="glass" style={{ padding: '10px 13px', fontSize: 12, color: 'var(--muted)' }}>
            <Type size={12} className="inline mr-1" />
            所有操作实时生效；排序按中文拼音规则（localeCompare zh-Hans-CN）。
          </div>
        </Card>
      </div>
    </div>
  );
}
