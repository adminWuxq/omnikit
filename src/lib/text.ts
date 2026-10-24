/* 文本批量处理 */

export interface TextOps {
  trim: boolean;          // 去除每行首尾空格
  removeEmpty: boolean;   // 去空行
  dedupe: boolean;        // 去重复行
  sort: 'none' | 'asc' | 'desc';
  caseMode: 'none' | 'upper' | 'lower' | 'capitalize';
}

export const defaultTextOps: TextOps = {
  trim: true, removeEmpty: true, dedupe: false, sort: 'none', caseMode: 'none',
};

export interface TextResult {
  output: string;
  stats: { lines: number; chars: number; removedDupes: number; emptyRemoved: number };
}

export function processText(input: string, ops: TextOps): TextResult {
  let lines = input.split(/\r?\n/);
  if (ops.trim) lines = lines.map((l) => l.trim());
  let emptyRemoved = 0;
  if (ops.removeEmpty) {
    const before = lines.length;
    lines = lines.filter((l) => l !== '');
    emptyRemoved = before - lines.length;
  }
  let removedDupes = 0;
  if (ops.dedupe) {
    const seen = new Set<string>();
    const before = lines.length;
    lines = lines.filter((l) => (seen.has(l) ? false : (seen.add(l), true)));
    removedDupes = before - lines.length;
  }
  if (ops.sort === 'asc') lines = [...lines].sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
  if (ops.sort === 'desc') lines = [...lines].sort((a, b) => b.localeCompare(a, 'zh-Hans-CN'));
  if (ops.caseMode === 'upper') lines = lines.map((l) => l.toUpperCase());
  if (ops.caseMode === 'lower') lines = lines.map((l) => l.toLowerCase());
  if (ops.caseMode === 'capitalize') {
    lines = lines.map((l) => {
      const m = l.match(/^([\s]*)(\S)(.*)$/);
      // 只大写首字母，保留其余字符原有大小写
      return m ? m[1] + m[2].toUpperCase() + m[3] : l;
    });
  }
  const output = lines.join('\n');
  return {
    output,
    stats: {
      lines: lines.length,
      chars: output.length,
      removedDupes,
      emptyRemoved,
    },
  };
}
