import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy, Info, Loader2, UploadCloud, X } from 'lucide-react';

export const cx = (...a: Array<string | false | null | undefined>) => a.filter(Boolean).join(' ');

/* ================= Toast ================= */
type ToastItem = { id: number; kind: 'success' | 'error' | 'info'; msg: string };
let toastPush: ((t: ToastItem) => void) | null = null;
export const toast = {
  success: (msg: string) => toastPush?.({ id: Date.now() + Math.random(), kind: 'success', msg }),
  error: (msg: string) => toastPush?.({ id: Date.now() + Math.random(), kind: 'error', msg }),
  info: (msg: string) => toastPush?.({ id: Date.now() + Math.random(), kind: 'info', msg }),
};

export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => {
    toastPush = (t) => {
      setItems((v) => [...v, t]);
      setTimeout(() => setItems((v) => v.filter((x) => x.id !== t.id)), 3200);
    };
    return () => { toastPush = null; };
  }, []);
  return (
    <div className="toast-host">
      {items.map((t) => (
        <div key={t.id} className={cx('toast', t.kind)}>
          {t.kind === 'success' ? <Check size={15} /> : t.kind === 'error' ? <X size={15} /> : <Info size={15} />}
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

/* ================= 基础控件 ================= */
export type IconType = React.ComponentType<{
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
}>;

export function Btn({
  variant = 'ghost', size = 'md', loading, icon: Icon, children, className, ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger' | 'soft';
  size?: 'sm' | 'md';
  loading?: boolean;
  icon?: IconType;
}) {
  return (
    <button
      className={cx('btn', `btn-${variant}`, size === 'sm' && 'btn-sm', loading && 'is-loading', className)}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading ? <Loader2 size={15} className="spin" /> : Icon ? <Icon size={15} /> : null}
      {children}
    </button>
  );
}

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('glass card', className)} {...rest}>{children}</div>;
}

export function Field({ label, hint, children, style }: { label: React.ReactNode; hint?: React.ReactNode; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="field" style={style}>
      <div className="field-label">
        <span>{label}</span>
        {hint ? <span className="muted" style={{ fontWeight: 400 }}>{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return <input className={cx('input', className)} {...rest} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className, ...rest } = props;
  return <textarea className={cx('input textarea', className)} {...rest} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, children, ...rest } = props;
  return <select className={cx('select', className)} {...rest}>{children}</select>;
}

export function Seg<T extends string>({ value, options, onChange }: {
  value: T;
  options: { value: T; label: React.ReactNode }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={o.value} type="button" className={cx('seg-item', o.value === value && 'on')} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: React.ReactNode }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="track" />
      <span>{label}</span>
    </label>
  );
}

export function Slider({ label, value, onChange, min, max, step, fmt }: {
  label: React.ReactNode; value: number; onChange: (v: number) => void;
  min: number; max: number; step?: number; fmt?: (v: number) => string;
}) {
  return (
    <div className="slider-row">
      <div className="lab"><span>{label}</span><span className="val">{fmt ? fmt(value) : value}</span></div>
      <input type="range" min={min} max={max} step={step ?? 1} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

export function Dropzone({ accept, multiple, onFiles, main, sub }: {
  accept?: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  main?: React.ReactNode;
  sub?: React.ReactNode;
}) {
  const [over, setOver] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div
      className={cx('dropzone', over && 'over')}
      onClick={() => ref.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault(); setOver(false);
        const fs = Array.from(e.dataTransfer.files);
        if (fs.length) onFiles(multiple ? fs : fs.slice(0, 1));
      }}
    >
      <input
        ref={ref} type="file" hidden accept={accept} multiple={multiple}
        onChange={(e) => {
          const fs = Array.from(e.target.files ?? []);
          if (fs.length) onFiles(fs);
          e.target.value = '';
        }}
      />
      <UploadCloud size={30} className="dz-icon" />
      <div className="dz-main">{main ?? '点击选择 或 拖拽文件到此处'}</div>
      <div className="dz-sub">{sub}</div>
    </div>
  );
}

export function Progress({ value }: { value: number }) {
  return (
    <div className="progress">
      <div style={{ width: `${Math.min(100, Math.max(0, value * 100)).toFixed(1)}%` }} />
    </div>
  );
}

export function CopyBtn({ text, size = 'sm' }: { text: string; size?: 'sm' | 'md' }) {
  const [ok, setOk] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); ta.remove();
    }
    setOk(true);
    setTimeout(() => setOk(false), 1500);
  };
  return (
    <button type="button" className={cx('btn btn-ghost', size === 'sm' && 'btn-sm')} onClick={copy}>
      {ok ? <Check size={14} /> : <Copy size={14} />}{ok ? '已复制' : '复制'}
    </button>
  );
}

export const fmtSize = (n: number) =>
  n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(2)} MB`;

export function FileRow({ name, size, onRemove, right }: {
  name: string; size?: number; onRemove?: () => void; right?: React.ReactNode;
}) {
  return (
    <div className="file-row">
      {onRemove && (
        <button type="button" className="del" onClick={onRemove} title="移除"><X size={13} /></button>
      )}
      <span className="nm" title={name}>{name}</span>
      {size !== undefined && <span className="sz">{fmtSize(size)}</span>}
      {right}
    </div>
  );
}

export function Empty({ icon: Icon, text }: { icon?: IconType; text: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '34px 0', color: 'var(--muted)', fontSize: 13 }}>
      {Icon ? <Icon size={34} style={{ opacity: 0.35, marginBottom: 8 }} /> : null}
      <div>{text}</div>
    </div>
  );
}
