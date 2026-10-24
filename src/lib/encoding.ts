/* URL / Base64 / Unicode / Hex 编码转换 */

const te = new TextEncoder();
const td = new TextDecoder('utf-8');

export function urlEncode(s: string, component = true): string {
  return component ? encodeURIComponent(s) : encodeURI(s);
}

export function urlDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    throw new Error('% 序列不合法，无法解码');
  }
}

export function b64Encode(s: string): string {
  const bytes = te.encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export function b64Decode(s: string): string {
  const clean = s.replace(/\s+/g, '');
  try {
    const bin = atob(clean);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return td.decode(bytes);
  } catch {
    throw new Error('不是合法的 Base64 字符串');
  }
}

export function unicodeEncode(s: string): string {
  let out = '';
  for (const ch of s) {
    for (const unit of ch) {
      out += '\\u' + unit.charCodeAt(0).toString(16).padStart(4, '0');
    }
  }
  return out;
}

export function unicodeDecode(s: string): string {
  try {
    return s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  } catch {
    throw new Error('无法解码 Unicode 转义');
  }
}

export function hexEncode(s: string): string {
  return Array.from(te.encode(s), (b) => b.toString(16).padStart(2, '0')).join('');
}

export function hexDecode(s: string): string {
  const clean = s.replace(/[^0-9a-fA-F]/g, '');
  if (clean.length % 2) throw new Error('十六进制长度必须为偶数');
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return td.decode(bytes);
}
