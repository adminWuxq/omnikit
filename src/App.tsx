import { useState } from 'react';
import { ToastHost } from './components/ui';
import { Sidebar } from './components/Sidebar';
import { Home } from './components/Home';
import { TOOLS } from './tools';

export default function App() {
  const [view, setView] = useState('home');
  const tool = TOOLS.find((t) => t.id === view);

  return (
    <>
      <div className="bg-decor" />
      <div className="app-shell">
        <Sidebar current={view} onNav={setView} />
        <div className="main-wrap">
          {tool ? (
            <div key={tool.id} className="fade-up" style={{ maxWidth: 1180, margin: '0 auto' }}>
              <header className="tool-head">
                <div className={`tool-ico grad-${tool.cat}`}><tool.icon size={21} /></div>
                <div>
                  <h2>{tool.name}</h2>
                  <p>{tool.desc}</p>
                </div>
              </header>
              <tool.component />
            </div>
          ) : (
            <Home onNav={setView} />
          )}
        </div>
      </div>
      <ToastHost />
    </>
  );
}
