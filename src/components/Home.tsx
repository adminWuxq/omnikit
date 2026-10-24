import { useState } from 'react';
import { ArrowRight, Search, ShieldCheck, Zap, WifiOff } from 'lucide-react';
import { CATS, TOOLS } from '../tools';
import { Logo } from './Logo';

export function Home({ onNav }: { onNav: (v: string) => void }) {
  const [q, setQ] = useState('');
  const kw = q.trim().toLowerCase();

  const match = (id: string, name: string, desc: string, tags?: string[]) =>
    !kw ||
    name.toLowerCase().includes(kw) ||
    desc.toLowerCase().includes(kw) ||
    id.includes(kw) ||
    (tags ?? []).some((t) => t.toLowerCase().includes(kw));

  const cats = CATS.map((c) => ({
    ...c,
    tools: TOOLS.filter((t) => t.cat === c.id && match(t.id, t.name, t.desc, t.tags)),
  })).filter((c) => c.tools.length > 0);

  return (
    <div className="fade-up" style={{ maxWidth: 1180, margin: '0 auto' }}>
      <div className="hero">
        <Logo size={64} />
        <h1>
          你的桌面<span className="grad-text-span">效率百宝箱</span>
        </h1>
        <p className="sub">
          图片 / 文档 / 音视频 / 文本 / 开发者工具，一站式搞定 —— 基于 Tauri + ffmpeg.wasm，100% 本地运行
        </p>
        <div className="search-box">
          <Search size={16} />
          <input className="input" placeholder="搜索工具：如 webp、水印、json、时间戳…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="hero-badges">
          <span className="chip"><Zap size={12} /> <b>{TOOLS.length}</b> 个工具开箱即用</span>
          <span className="chip"><ShieldCheck size={12} /> 文件不出本机</span>
          <span className="chip"><WifiOff size={12} /> 离线可用</span>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: 16 }}>
        {cats.map((cat) => (
          <div className="glass cat-card" key={cat.id}>
            <div className="cat-head">
              <div className={`tool-ico grad-${cat.id}`} style={{ width: 38, height: 38, borderRadius: 11 }}>
                <cat.icon size={18} />
              </div>
              <div>
                <div className="nm">{cat.name}</div>
                <div className="ds">{cat.desc}</div>
              </div>
            </div>
            {cat.tools.map((t) => (
              <button className="tool-pill" key={t.id} onClick={() => onNav(t.id)}>
                <t.icon size={15} style={{ opacity: 0.8, flexShrink: 0 }} />
                <span>{t.name}</span>
                <ArrowRight size={14} className="arr" />
              </button>
            ))}
          </div>
        ))}
      </div>

      {cats.length === 0 && (
        <p className="muted" style={{ textAlign: 'center', padding: 40 }}>
          没有找到匹配「{q}」的工具，换个关键词试试～
        </p>
      )}
    </div>
  );
}
