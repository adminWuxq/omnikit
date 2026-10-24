/* JSON 格式化 / JSON ↔ CSV 互转 */

export function formatJson(src: string, mode: '2' | '4' | 'tab' | 'min'): string {
  const obj = JSON.parse(src); // 抛错由调用方捕获
  const space = mode === 'tab' ? '\t' : mode === 'min' ? undefined : Number(mode);
  return JSON.stringify(obj, null, space as never);
}

/** 将嵌套对象扁平化（点分路径），数组序列化为 JSON 字符串 */
function flatten(v: unknown, prefix: string, out: Record<string, unknown>) {
  if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
    for (const k of Object.keys(v as Record<string, unknown>)) {
      flatten((v as Record<string, unknown>)[k], prefix ? `${prefix}.${k}` : k, out);
    }
  } else {
    out[prefix || 'value'] = Array.isArray(v) ? JSON.stringify(v) : (v ?? '');
  }
}

function csvCell(v: unknown, delim: string): string {
  const s = v === null || v === undefined ? '' : String(v);
  if (s.includes('"') || s.includes('\n') || s.includes(delim)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function jsonToCsv(src: string, delim = ','): string {
  const obj = JSON.parse(src);
  let rows: Record<string, unknown>[];
  if (Array.isArray(obj)) {
    rows = obj.map((r) => {
      const out: Record<string, unknown> = {};
      flatten(r, '', out);
      return out;
    });
  } else if (obj && typeof obj === 'object') {
    // 单对象或对象里包着数组字段：找第一个数组字段展开
    const firstArray = Object.values(obj as Record<string, unknown>).find((v) => Array.isArray(v));
    if (firstArray && typeof firstArray[0] === 'object') return jsonToCsv(JSON.stringify(firstArray), delim);
    const out: Record<string, unknown> = {};
    flatten(obj, '', out);
    rows = [out];
  } else {
    throw new Error('JSON 顶层必须是对象或对象数组');
  }
  const headers: string[] = [];
  for (const r of rows) {
    for (const k of Object.keys(r)) if (!headers.includes(k)) headers.push(k);
  }
  const lines = [headers.map((h) => csvCell(h, delim)).join(delim)];
  for (const r of rows) lines.push(headers.map((h) => csvCell(r[h], delim)).join(delim));
  return lines.join('\n');
}

export function parseCsv(text: string, delim: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let q = false;
  const s = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"') {
        if (s[i + 1] === '"') { cur += '"'; i++; }
        else q = false;
      } else cur += c;
    } else if (c === '"') q = true;
    else if (c === delim) { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(cur); cur = '';
      rows.push(row); row = [];
    } else cur += c;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ''));
}

function coerce(v: string): unknown {
  const t = v.trim();
  if (t === 'true') return true;
  if (t === 'false') return false;
  if (t === 'null') return null;
  if (t !== '' && /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(t) && !(t.length > 1 && t[0] === '0' && !t.includes('.'))) {
    return Number(t);
  }
  return v;
}

export function csvToJson(src: string, delim = ',', hasHeader = true, typed = true): string {
  const rows = parseCsv(src, delim);
  if (!rows.length) throw new Error('CSV 为空');
  if (!hasHeader) {
    return JSON.stringify(rows.map((r) => r.map(typed ? coerce : (v) => v)), null, 2);
  }
  const header = rows[0].map((h, i) => h.trim() || `col${i + 1}`);
  const out = rows.slice(1).map((r) => {
    const o: Record<string, unknown> = {};
    header.forEach((h, i) => { o[h] = typed ? coerce(r[i] ?? '') : (r[i] ?? ''); });
    return o;
  });
  return JSON.stringify(out, null, 2);
}

/* ================= 常用正则预设 ================= */
export const REGEX_PRESETS: { name: string; pattern: string }[] = [
  { name: '手机号', pattern: '1[3-9]\\d{9}' },
  { name: '邮箱', pattern: '[\\w.+-]+@[\\w-]+\\.[\\w.]+' },
  { name: 'URL 链接', pattern: 'https?://[^\\s<>"]+' },
  { name: 'IPv4', pattern: '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b' },
  { name: '十六进制颜色', pattern: '#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\\b' },
  { name: '身份证号', pattern: '\\b\\d{15}(?:\\d{2}[0-9Xx])?\\b' },
  { name: '日期', pattern: '\\d{4}[-/]\\d{1,2}[-/]\\d{1,2}' },
  { name: '中文字符', pattern: '[\\u4e00-\\u9fa5]+' },
];
