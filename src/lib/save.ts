import { save as dialogSave } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import JSZip from 'jszip';

/** 是否运行在 Tauri 桌面端（否则为浏览器，保存走下载） */
export const inTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export async function saveBlob(defaultName: string, blob: Blob): Promise<boolean> {
  if (inTauri) {
    try {
      const ext = defaultName.split('.').pop()?.toLowerCase();
      const path = await dialogSave({
        defaultPath: defaultName,
        filters: ext ? [{ name: ext.toUpperCase(), extensions: [ext] }] : undefined,
      });
      if (!path) return false;
      await writeFile(path, new Uint8Array(await blob.arrayBuffer()));
      return true;
    } catch (e) {
      console.error('tauri save failed', e);
    }
  }
  // 浏览器回退：触发下载
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = defaultName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return true;
}

export function saveText(name: string, text: string) {
  return saveBlob(name, new Blob([text], { type: 'text/plain;charset=utf-8' }));
}

/** 打包多个文件为 zip 后保存（自动重名去重） */
export async function saveZipFiles(zipName: string, files: { name: string; blob: Blob }[]) {
  const zip = new JSZip();
  const used = new Set<string>();
  for (const f of files) {
    let n = f.name;
    if (used.has(n)) {
      const dot = n.lastIndexOf('.');
      const base = dot > 0 ? n.slice(0, dot) : n;
      const ext = dot > 0 ? n.slice(dot) : '';
      let i = 2;
      while (used.has(`${base}-${i}${ext}`)) i++;
      n = `${base}-${i}${ext}`;
    }
    used.add(n);
    zip.file(n, f.blob);
  }
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  return saveBlob(zipName, blob);
}
