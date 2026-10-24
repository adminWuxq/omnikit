/* 哈希 / 签名计算：MD5 (js-md5)，SHA / HMAC (Web Crypto) */
import { md5 } from 'js-md5';

const te = new TextEncoder();

export const toHex = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');

export function md5Hex(s: string): string {
  return md5(s);
}

export async function shaHex(alg: 'SHA-1' | 'SHA-256' | 'SHA-512', s: string): Promise<string> {
  const digest = await crypto.subtle.digest(alg, te.encode(s));
  return toHex(digest);
}

export async function hmacHex(
  alg: 'SHA-1' | 'SHA-256' | 'SHA-512',
  key: string,
  msg: string
): Promise<string> {
  if (!key) throw new Error('HMAC 需要密钥');
  const k = await crypto.subtle.importKey('raw', te.encode(key), { name: 'HMAC', hash: alg }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, te.encode(msg));
  return toHex(sig);
}
