/* 时间戳工具 */

const p = (n: number) => String(n).padStart(2, '0');

export function fmtLocal(d: Date): string {
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export const fmtMs = (ms: number) => fmtLocal(new Date(ms));

/** 解析时间戳字符串：纯数字按位数自动判断秒/毫秒（10 位→秒，13 位→毫秒），也支持 12s / 1700000000ms 写法 */
export function parseTimestamp(s: string): Date | null {
  const t = s.trim().toLowerCase();
  let m: RegExpMatchArray | null;
  if ((m = t.match(/^(\d{9,16})\s*(ms|毫秒)$/))) return new Date(Number(m[1]));
  if ((m = t.match(/^(\d{9,16})\s*(s|秒)$/))) return new Date(Number(m[1]) * 1000);
  if (/^\d{9,16}$/.test(t)) {
    const n = Number(t);
    return new Date(t.length >= 12 ? n : n * 1000);
  }
  const parsed = Date.parse(t);
  return Number.isNaN(parsed) ? null : new Date(parsed);
}

export function relTime(d: Date, now = new Date()): string {
  const diff = (now.getTime() - d.getTime()) / 1000;
  const abs = Math.abs(diff);
  const suffix = diff >= 0 ? '前' : '后';
  if (abs < 10) return '刚刚';
  if (abs < 60) return `${Math.round(abs)} 秒${suffix}`;
  if (abs < 3600) return `${Math.round(abs / 60)} 分钟${suffix}`;
  if (abs < 86400) return `${Math.round(abs / 3600)} 小时${suffix}`;
  if (abs < 86400 * 30) return `${Math.round(abs / 86400)} 天${suffix}`;
  if (abs < 86400 * 365) return `${Math.round(abs / 86400 / 30)} 个月${suffix}`;
  return `${Math.round(abs / 86400 / 365)} 年${suffix}`;
}
