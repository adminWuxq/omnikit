import { Github, Home } from 'lucide-react';
import { CATS, TOOLS } from '../tools';
import { REPO_URL } from '../lib/repo';
import { Logo } from './Logo';
import { cx } from './ui';

export function Sidebar({ current, onNav }: { current: string; onNav: (v: string) => void }) {
  return (
    <aside className="side">
      <button className="side-logo" onClick={() => onNav('home')}>
        <Logo size={34} />
        <div>
          <div className="logo-name">OmniKit</div>
          <div className="logo-sub">效率工具箱</div>
        </div>
      </button>

      <nav className="side-nav">
        <button className={cx('side-item', current === 'home' && 'on')} onClick={() => onNav('home')}>
          <Home size={16} /> 首页
        </button>
        {CATS.map((cat) => (
          <div className="side-group" key={cat.id}>
            <div className="side-cat">{cat.name}</div>
            {TOOLS.filter((t) => t.cat === cat.id).map((t) => (
              <button key={t.id} className={cx('side-item', current === t.id && 'on')} onClick={() => onNav(t.id)}>
                <t.icon size={15} /> {t.name}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="side-foot">
        <a href={REPO_URL} target="_blank" rel="noreferrer" className="side-item as-a">
          <Github size={15} /> GitHub 仓库
        </a>
        <span style={{ padding: '4px 10px' }}>v1.0.0 · 100% 本地处理 ⚡</span>
      </div>
    </aside>
  );
}
