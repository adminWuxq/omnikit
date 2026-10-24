import { useMemo, useState } from 'react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import TurndownService from 'turndown';
import { Download, FileCode2, FileText } from 'lucide-react';
import { Btn, Card, CopyBtn, Field, Seg, TextArea, toast } from '../ui';
import { saveText } from '../../lib/save';

type Dir = 'md2html' | 'html2md' | 'html2txt';

const SAMPLE_MD = `# Hello OmniKit\n\n支持 **GFM** 语法：表格、任务列表、代码块……\n\n- [x] 支持表格\n- [ ] 支持导出独立 HTML\n\n\`\`\`js\nconsole.log("markdown → html");\n\`\`\``;

const SAMPLE_HTML = `<h1>标题一</h1>\n<p>这是一段 <strong>HTML</strong>，下面是列表：</p>\n<ul><li>苹果</li><li>香蕉</li></ul>`;

function htmlToText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script,style').forEach((n) => n.remove());
  doc.querySelectorAll('br').forEach((n) => n.replaceWith('\n'));
  doc.querySelectorAll('p,div,li,tr,h1,h2,h3,h4,h5,h6,section,article').forEach((n) => n.append('\n'));
  return (doc.body.textContent ?? '').replace(/\n{3,}/g, '\n\n').replace(/[ \t]+\n/g, '\n').trim();
}

function wrapStandaloneHtml(body: string, title: string): string {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  body { font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; max-width: 780px; margin: 40px auto; padding: 0 20px; color: #27272a; line-height: 1.8; }
  h1, h2 { border-bottom: 2px solid #ede9fe; padding-bottom: .3em; }
  code { background: #f5f3ff; color: #7c3aed; padding: .15em .4em; border-radius: 5px; }
  pre { background: #18181b; color: #e4e4e7; padding: 14px; border-radius: 10px; overflow-x: auto; }
  pre code { background: none; color: inherit; }
  blockquote { border-left: 4px solid #8b5cf6; margin: 0; padding: .2em 1em; color: #52525b; background: #faf5ff; }
  table { border-collapse: collapse; } th, td { border: 1px solid #e4e4e7; padding: 6px 12px; }
  img { max-width: 100%; }
</style>
</head>
<body>
${body}
</body>
</html>`;
}

export default function DocConvert() {
  const [dir, setDir] = useState<Dir>('md2html');
  const [input, setInput] = useState(SAMPLE_MD);
  const [view, setView] = useState<'preview' | 'code'>('preview');
  const [fileName, setFileName] = useState('document');

  const { output, error, html } = useMemo(() => {
    try {
      if (dir === 'md2html') {
        const raw = marked.parse(input, { async: false, gfm: true, breaks: true }) as string;
        return { html: DOMPurify.sanitize(raw), output: raw, error: '' };
      }
      if (dir === 'html2md') {
        const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-' });
        return { html: '', output: td.turndown(input), error: '' };
      }
      return { html: '', output: htmlToText(input), error: '' };
    } catch (e) {
      return { html: '', output: '', error: (e as Error).message };
    }
  }, [input, dir]);

  const loadFile = (f: File) => {
    const r = new FileReader();
    r.onload = () => setInput(String(r.result ?? ''));
    r.readAsText(f);
    setFileName(f.name.replace(/\.[^.]+$/, ''));
  };

  const dl = () => {
    if (dir === 'md2html') saveText(`${fileName}.html`, wrapStandaloneHtml(output, fileName));
    else if (dir === 'html2md') saveText(`${fileName}.md`, output);
    else saveText(`${fileName}.txt`, output);
    toast.success('已保存');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <Seg
          value={dir} onChange={setDir}
          options={[
            { value: 'md2html', label: 'Markdown → HTML' },
            { value: 'html2md', label: 'HTML → Markdown' },
            { value: 'html2txt', label: 'HTML → 纯文本' },
          ]}
        />
        <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
          <FileText size={14} /> 载入文件
          <input type="file" hidden accept=".md,.markdown,.html,.htm,.txt" onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f); e.target.value = ''; }} />
        </label>
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <Card>
          <Field label="输入" hint={`${input.length} 字符`}>
            <TextArea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              style={{ minHeight: 420 }}
              placeholder={dir === 'md2html' ? '在此粘贴 Markdown…' : '在此粘贴 HTML…'}
            />
          </Field>
        </Card>

        <Card>
          {dir === 'md2html' ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <Seg value={view} onChange={setView} options={[{ value: 'preview', label: '预览' }, { value: 'code', label: 'HTML 源码' }]} />
                <div className="flex gap-2"><CopyBtn text={output} /><Btn size="sm" icon={Download} onClick={dl}>导出 HTML</Btn></div>
              </div>
              {error ? (
                <div className="tag-bad" style={{ fontSize: 13 }}>解析出错：{error}</div>
              ) : view === 'preview' ? (
                <div className="md-preview" style={{ minHeight: 380 }} dangerouslySetInnerHTML={{ __html: html }} />
              ) : (
                <TextArea readOnly value={output} style={{ minHeight: 380 }} />
              )}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-[13px]">{dir === 'html2md' ? 'Markdown 输出' : '纯文本输出'}</span>
                <div className="flex gap-2">
                  <CopyBtn text={output} />
                  <Btn size="sm" icon={FileCode2} onClick={dl}>导出 {dir === 'html2md' ? '.md' : '.txt'}</Btn>
                </div>
              </div>
              {error ? <div className="tag-bad" style={{ fontSize: 13 }}>出错：{error}</div> : <TextArea readOnly value={output} style={{ minHeight: 380 }} />}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
