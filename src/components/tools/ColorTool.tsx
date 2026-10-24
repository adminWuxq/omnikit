import { useMemo, useState } from 'react';
import { Droplets, Pipette, Shuffle, Trash2 } from 'lucide-react';
import { Btn, Card, CopyBtn, Field, Input, Seg, Slider, toast } from '../ui';
import { hexToHsl, hexToRgb, hslToHex, randomGradientStops, readableText, rgbToHex, rgbToHsl, shadesOf, hslToRgb } from '../../lib/color';

type Tab = 'convert' | 'gradient' | 'picker';

export default function ColorTool() {
  const [tab, setTab] = useState<Tab>('convert');
  return (
    <div>
      <div className="mb-4">
        <Seg
          value={tab} onChange={setTab}
          options={[{ value: 'convert', label: '色值转换' }, { value: 'gradient', label: '渐变生成' }, { value: 'picker', label: '屏幕取色' }]}
        />
      </div>
      {tab === 'convert' && <Convert />}
      {tab === 'gradient' && <Gradient />}
      {tab === 'picker' && <Picker />}
    </div>
  );
}

/* ---------------- 色值转换 ---------------- */
function Convert() {
  const [hex, setHex] = useState('#8b5cf6');
  const rgb = hexToRgb(hex);
  const hsl = rgb ? rgbToHsl(rgb) : null;
  const shades = useMemo(() => shadesOf(hex), [hex]);

  return (
    <div className="grid-2" style={{ gridTemplateColumns: '1fr 340px' }}>
      <Card>
        <div className="swatch-lg mb-4 flex items-center justify-center" style={{ background: rgb ? hex : '#333' }}>
          <span style={{ color: rgb ? readableText(rgb) : '#888', fontWeight: 800, fontSize: 18, letterSpacing: 1 }}>{hex.toUpperCase()}</span>
        </div>
        <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="HEX">
            <div className="flex gap-2">
              <input type="color" className="input" style={{ width: 46, padding: 2, height: 37 }} value={rgb ? hex : '#8b5cf6'} onChange={(e) => setHex(e.target.value)} />
              <Input className="mono" value={hex} onChange={(e) => setHex(e.target.value)} />
            </div>
          </Field>
          <Field label="选择器">
            <Input type="color" style={{ height: 37 }} value={rgb ? hex : '#8b5cf6'} onChange={(e) => setHex(e.target.value)} />
          </Field>
        </div>
        {rgb && hsl && (
          <>
            <Field label="RGB"><Input className="mono" readOnly value={`rgb(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)})`} /></Field>
            <Field label="HSL"><Input className="mono" readOnly value={`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`} /></Field>
            <div className="flex gap-2">
              <CopyBtn text={hex} />
              <CopyBtn text={`rgb(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)})`} />
              <CopyBtn text={`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`} />
            </div>
          </>
        )}
        {!rgb && <div className="tag-bad" style={{ fontSize: 13 }}>请输入合法的 HEX 颜色（#fff 或 #ffffff）</div>}
      </Card>
      <Card>
        <div className="font-bold text-[13px] mb-3">明暗梯度（点击复制）</div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {shades.map((s) => (
            <div key={s.ratio} className="shade" style={{ background: s.hex }} title={s.hex}
              onClick={() => { navigator.clipboard.writeText(s.hex); toast.success(`已复制 ${s.hex}`); }}>
              <span>{s.ratio > 0 ? `+${s.ratio}` : s.ratio}</span>
            </div>
          ))}
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>从压暗 50% 到提亮 50% 的 11 档梯度，适合做主题色阶。</p>
      </Card>
    </div>
  );
}

/* ---------------- 渐变生成 ---------------- */
function Gradient() {
  const [type, setType] = useState<'linear' | 'radial'>('linear');
  const [angle, setAngle] = useState(135);
  const [stops, setStops] = useState(['#8b5cf6', '#6366f1', '#22d3ee']);

  const css = useMemo(() => {
    const body = stops.join(', ');
    return type === 'linear' ? `linear-gradient(${angle}deg, ${body})` : `radial-gradient(circle at center, ${body})`;
  }, [type, angle, stops]);

  const setStop = (i: number, v: string) => setStops((s) => s.map((x, j) => (j === i ? v : x)));

  return (
    <div className="grid-2" style={{ gridTemplateColumns: '1fr 340px' }}>
      <Card>
        <div className="swatch-lg" style={{ height: 240, background: css, marginBottom: 16 }} />
        <div className="glass mono" style={{ padding: '12px 14px', fontSize: 13, color: '#b8e8f7', wordBreak: 'break-all' }}>background: {css};</div>
        <div className="flex gap-2 mt-3">
          <CopyBtn text={`background: ${css};`} />
          <Btn size="sm" icon={Shuffle} onClick={() => { setStops(randomGradientStops(stops.length)); toast.success('已随机'); }}>随机配色</Btn>
        </div>
      </Card>
      <Card>
        <Field label="渐变类型">
          <Seg value={type} onChange={setType} options={[{ value: 'linear', label: '线性' }, { value: 'radial', label: '径向' }]} />
        </Field>
        {type === 'linear' && <Slider label="角度" min={0} max={360} value={angle} onChange={setAngle} fmt={(v) => `${v}°`} />}
        <div className="field">
          <div className="field-label"><span>色标（{stops.length} 个）</span>
            <span className="flex gap-1.5">
              {stops.length < 5 && <button className="btn btn-ghost btn-sm" onClick={() => setStops((s) => [...s, hslToHex({ h: Math.random() * 360, s: 70, l: 55 })])}>+ 添加</button>}
              {stops.length > 2 && <button className="btn btn-ghost btn-sm" onClick={() => setStops((s) => s.slice(0, -1))}>− 删除</button>}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {stops.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="color" className="input" style={{ width: 44, padding: 2, height: 36 }} value={s} onChange={(e) => setStop(i, e.target.value)} />
                <Input className="mono" value={s} onChange={(e) => setStop(i, e.target.value)} />
                <CopyBtn text={s} />
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ---------------- 屏幕取色 ---------------- */
function Picker() {
  const supported = typeof window !== 'undefined' && 'EyeDropper' in window;
  const [recent, setRecent] = useState<string[]>(['#22d3ee', '#f472b6']);

  const pickColor = async () => {
    if (!supported) return toast.error('当前环境不支持 EyeDropper API');
    try {
      const dropper = new window.EyeDropper!();
      const { sRGBHex } = await dropper.open();
      setRecent((v) => [sRGBHex, ...v.filter((c) => c !== sRGBHex)].slice(0, 12));
      toast.success(`已取色 ${sRGBHex}`);
    } catch {
      /* 用户取消 */
    }
  };

  return (
    <div className="grid-2" style={{ gridTemplateColumns: '380px 1fr' }}>
      <Card>
        <div className="flex flex-col items-center gap-4" style={{ padding: '26px 0' }}>
          <div style={{
            width: 120, height: 120, borderRadius: 28, background: 'var(--grad)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 14px 40px rgba(99,102,241,.4)',
          }}>
            <Pipette size={44} color="#fff" />
          </div>
          <Btn variant="primary" icon={Pipette} onClick={pickColor} disabled={!supported} style={{ padding: '10px 28px' }}>打开屏幕取色器</Btn>
          {!supported && <span className="tag-warn" style={{ fontSize: 12 }}>需要 Chromium 95+ 环境（Tauri WebView2 / Chrome / Edge 均支持）</span>}
        </div>
      </Card>
      <Card>
        <div className="flex items-center justify-between mb-3">
          <span className="font-bold text-[13px] flex items-center gap-1.5"><Droplets size={14} /> 最近选取</span>
          {recent.length > 0 && <Btn size="sm" icon={Trash2} onClick={() => setRecent([])}>清空</Btn>}
        </div>
        {recent.length === 0 ? (
          <p className="muted" style={{ fontSize: 13 }}>点击左侧按钮，从屏幕任意位置取色（支持取 Tauri 窗口外的颜色）。</p>
        ) : (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: 10 }}>
            {recent.map((c) => {
              const rgb = hexToRgb(c);
              return (
                <div key={c} className="glass" style={{ padding: 8, textAlign: 'center', cursor: 'pointer' }}
                  onClick={() => { navigator.clipboard.writeText(c); toast.success(`已复制 ${c}`); }}>
                  <div style={{ height: 46, borderRadius: 8, background: c, marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 10, color: rgb ? readableText(rgb) : '#fff', fontFamily: 'Consolas, monospace' }}>COPY</span>
                  </div>
                  <div className="mono" style={{ fontSize: 11 }}>{c}</div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
