/* 随机数据生成：手机号 / UUID / 自定义 ID / 中文姓名 / Mock JSON */

const PHONE_PREFIXES = [
  '130', '131', '132', '133', '135', '136', '137', '138', '139',
  '150', '151', '152', '155', '156', '157', '158', '159', '166',
  '175', '176', '177', '178', '180', '181', '182', '183', '184',
  '185', '186', '187', '188', '189', '191', '193', '195', '198', '199',
];

export const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
export const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

export function randomPhone(): string {
  let tail = '';
  for (let i = 0; i < 8; i++) tail += randInt(0, 9);
  return pick(PHONE_PREFIXES) + tail;
}

export function randomUuid(): string {
  if (crypto.randomUUID) return crypto.randomUUID();
  // 手动 v4 回退
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x: number) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function randomId(len: number, lower = true, upper = true, digits = true, noAmbiguous = false): string {
  let pool = '';
  if (lower) pool += 'abcdefghijklmnopqrstuvwxyz';
  if (upper) pool += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (digits) pool += '0123456789';
  if (noAmbiguous) pool = pool.replace(/[0O1lI]/g, '');
  if (!pool) pool = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.getRandomValues(new Uint32Array(len));
  let out = '';
  for (let i = 0; i < len; i++) out += pool[bytes[i] % pool.length];
  return out;
}

const SURNAMES = '王李张刘陈杨黄赵吴周徐孙马朱胡郭何高林罗郑梁谢宋唐许韩冯邓曹彭曾肖田董潘袁蔡蒋余杜叶程苏魏吕丁任沈姚卢姜崔钟谭陆汪范金石廖贾夏韦付方白邹孟熊秦邱江尹薛闫段雷侯龙史陶黎贺顾毛郝龚邵万钱严覃武戴莫孔向汤'.split('');
const GIVEN = '伟芳娜秀英敏静丽强磊军洋勇艳杰娟涛明超霞平刚桂英华玉兰凤洁梅琳素云莲真环雪荣爱妹霞香月莺媛艳瑞凡佳嘉琼勤珍贞莉桂娣叶璧璐娅琦晶妍茜秋珊莎锦黛青倩婷姣婉娴瑾颖露瑶怡婵雁蓓纨仪荷丹蓉眉君琴蕊薇菁梦岚苑婕馨瑗琰韵融园艺咏卿聪澜纯毓悦昭冰爽琬茗羽希宁欣飘育滢馥筠柔竹霭凝晓欢霄枫芸菲寒伊亚宜可姬舒影荔枝思丽秀娟英华慧巧美娜静淑惠珠翠雅芝妍茜秋珊莎锦黛青倩婷'.split('');

export function cnName(): string {
  const g = GIVEN.filter(() => Math.random() > 0.35).slice(0, randInt(1, 2));
  return pick(SURNAMES) + (g.length ? g.join('') : pick(GIVEN));
}

export function randomEmail(): string {
  return `${randomId(randInt(5, 9), true, false, true)}@${pick(['qq.com', '163.com', '126.com', 'gmail.com', 'outlook.com', 'hotmail.com'])}`;
}

export function randomDate(): string {
  const start = new Date(2018, 0, 1).getTime();
  const d = new Date(start + Math.random() * (Date.now() - start));
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/* ---------- Mock JSON 字段生成器 ---------- */

export type MockFieldType =
  | 'increment' | 'uuid' | 'name' | 'phone' | 'email' | 'int' | 'float'
  | 'str' | 'bool' | 'date' | 'pick';

export interface MockField {
  key: string;
  type: MockFieldType;
  min: number;
  max: number;
  len: number;
  options: string; // pick 类型的候选（逗号分隔）
}

export const MOCK_TYPES: { value: MockFieldType; label: string }[] = [
  { value: 'increment', label: '自增 ID' },
  { value: 'uuid', label: 'UUID' },
  { value: 'name', label: '中文姓名' },
  { value: 'phone', label: '手机号' },
  { value: 'email', label: '邮箱' },
  { value: 'int', label: '整数 (min~max)' },
  { value: 'float', label: '小数 (min~max)' },
  { value: 'str', label: '随机字符串' },
  { value: 'bool', label: '布尔值' },
  { value: 'date', label: '日期时间' },
  { value: 'pick', label: '从列表选' },
];

export function generateMockJson(fields: MockField[], rows: number): string {
  const list: Record<string, unknown>[] = [];
  for (let i = 0; i < rows; i++) {
    const o: Record<string, unknown> = {};
    for (const f of fields) {
      switch (f.type) {
        case 'increment': o[f.key] = i + 1; break;
        case 'uuid': o[f.key] = randomUuid(); break;
        case 'name': o[f.key] = cnName(); break;
        case 'phone': o[f.key] = randomPhone(); break;
        case 'email': o[f.key] = randomEmail(); break;
        case 'int': o[f.key] = randInt(Math.round(f.min), Math.round(f.max)); break;
        case 'float': o[f.key] = Number((f.min + Math.random() * (f.max - f.min)).toFixed(2)); break;
        case 'str': o[f.key] = randomId(Math.max(1, Math.round(f.len))); break;
        case 'bool': o[f.key] = Math.random() > 0.5; break;
        case 'date': o[f.key] = randomDate(); break;
        case 'pick': {
          const opts = f.options.split(/[,，]/).map((s) => s.trim()).filter(Boolean);
          o[f.key] = opts.length ? pick(opts) : '';
          break;
        }
      }
    }
    list.push(o);
  }
  return JSON.stringify(list, null, 2);
}
