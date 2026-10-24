/**
 * ffmpeg.wasm 封装：音频格式转换 / 视频抽帧 / 视频转 GIF。
 * 核心文件已内置在 public/ffmpeg/，首次加载后完全离线运行。
 */
import { FFmpeg } from '@ffmpeg/ffmpeg';
// eslint-disable-next-line
import workerUrl from '@ffmpeg/ffmpeg/worker?url';

let inst: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;
let progressCb: ((p: number) => void) | null = null;

type LogListener = (line: string) => void;
const logLines: string[] = [];
const logListeners = new Set<LogListener>();

export function onLog(l: LogListener) {
  logListeners.add(l);
  return () => logListeners.delete(l);
}
export function getLogTail(n = 12) {
  return logLines.slice(-n);
}

async function create(): Promise<FFmpeg> {
  const f = new FFmpeg();
  f.on('log', ({ message }) => {
    logLines.push(message);
    if (logLines.length > 300) logLines.shift();
    logListeners.forEach((l) => l(message));
  });
  f.on('progress', ({ progress }) => {
    if (progressCb && Number.isFinite(progress)) progressCb(Math.min(1, Math.max(0, progress)));
  });
  await f.load({
    coreURL: '/ffmpeg/ffmpeg-core.js',
    wasmURL: '/ffmpeg/ffmpeg-core.wasm',
    classWorkerURL: workerUrl,
  });
  return f;
}

/** 获取（并按需加载）ffmpeg 实例；首次加载约需数秒 */
export function getFFmpeg(onProgress?: (p: number) => void): Promise<FFmpeg> {
  progressCb = onProgress ?? null;
  if (inst) return Promise.resolve(inst);
  if (!loadPromise) loadPromise = create().then((f) => { inst = f; return f; });
  return loadPromise;
}

async function withFF<T>(run: (f: FFmpeg) => Promise<T>, onProgress?: (p: number) => void): Promise<T> {
  const f = await getFFmpeg(onProgress);
  try {
    return await run(f);
  } finally {
    progressCb = null;
  }
}

async function clean(f: FFmpeg, names: string[]) {
  for (const n of names) {
    try { await f.deleteFile(n); } catch { /* ignore */ }
  }
}

/* ================= 音频转换 ================= */

export const AUDIO_FORMATS = {
  mp3: { ext: 'mp3', mime: 'audio/mpeg', label: 'MP3', codec: ['-c:a', 'libmp3lame', '-b:a', '192k'] },
  wav: { ext: 'wav', mime: 'audio/wav', label: 'WAV', codec: ['-c:a', 'pcm_s16le'] },
  flac: { ext: 'flac', mime: 'audio/flac', label: 'FLAC', codec: ['-c:a', 'flac'] },
  ogg: { ext: 'ogg', mime: 'audio/ogg', label: 'OGG', codec: ['-c:a', 'libvorbis', '-q:a', '5'] },
  m4a: { ext: 'm4a', mime: 'audio/mp4', label: 'M4A (AAC)', codec: ['-c:a', 'aac', '-b:a', '192k'] },
} as const;
export type AudioFmt = keyof typeof AUDIO_FORMATS;

export async function convertAudio(
  file: File,
  target: AudioFmt,
  bitrateKb?: number,
  onProgress?: (p: number) => void
): Promise<{ name: string; blob: Blob }> {
  return withFF(async (f) => {
    const srcExt = (file.name.split('.').pop() || 'bin').toLowerCase();
    const inName = `in.${srcExt}`;
    const cfg = AUDIO_FORMATS[target];
    const outName = `out.${cfg.ext}`;
    await f.writeFile(inName, new Uint8Array(await file.arrayBuffer()));
    const args: string[] = [...cfg.codec];
    if (bitrateKb && (target === 'mp3' || target === 'm4a')) {
      const bi = args.indexOf('-b:a');
      if (bi >= 0) args[bi + 1] = `${bitrateKb}k`;
      else args.push('-b:a', `${bitrateKb}k`);
    }
    await f.exec(['-i', inName, '-vn', ...args, outName]);
    const data = await f.readFile(outName);
    await clean(f, [inName, outName]);
    const base = file.name.replace(/\.[^.]+$/, '') || 'audio';
    return { name: `${base}.${cfg.ext}`, blob: new Blob([(data as Uint8Array).buffer as ArrayBuffer], { type: cfg.mime }) };
  }, onProgress);
}

/* ================= 视频抽帧 ================= */

export async function extractFrames(
  file: File,
  opts: { fps: number; format: 'png' | 'jpg'; everyNSeconds?: boolean },
  onProgress?: (p: number) => void
): Promise<{ name: string; blob: Blob }[]> {
  return withFF(async (f) => {
    const srcExt = (file.name.split('.').pop() || 'bin').toLowerCase();
    const inName = `in.${srcExt}`;
    const vf = opts.everyNSeconds ? `fps=1/${opts.fps}` : `fps=${opts.fps}`;
    await f.writeFile(inName, new Uint8Array(await file.arrayBuffer()));
    await f.exec(['-i', inName, '-vf', vf, `frame_%05d.${opts.format}`]);
    const frames: { name: string; blob: Blob }[] = [];
    const names: string[] = [inName];
    let misses = 0;
    for (let i = 1; i < 5000; i++) {
      const fn = `frame_${String(i).padStart(5, '0')}.${opts.format}`;
      try {
        const d = await f.readFile(fn);
        names.push(fn);
        frames.push({
          name: `frame-${String(i).padStart(4, '0')}.${opts.format}`,
          blob: new Blob([(d as Uint8Array).buffer as ArrayBuffer], { type: opts.format === 'png' ? 'image/png' : 'image/jpeg' }),
        });
        misses = 0;
      } catch {
        misses++;
        if (frames.length || misses > 6) break;
      }
    }
    await clean(f, names);
    return frames;
  }, onProgress);
}

/* ================= 视频转 GIF ================= */

export async function videoToGif(
  file: File,
  opts: { fps: number; width: number },
  onProgress?: (p: number) => void
): Promise<{ name: string; blob: Blob }> {
  return withFF(async (f) => {
    const srcExt = (file.name.split('.').pop() || 'bin').toLowerCase();
    const inName = `in.${srcExt}`;
    await f.writeFile(inName, new Uint8Array(await file.arrayBuffer()));
    const vf = `fps=${opts.fps},scale=${opts.width}:-1:flags=lanczos`;
    // 两遍法：先生成调色板再合成，色彩表现更好
    await f.exec(['-i', inName, '-vf', `${vf},palettegen`, 'palette.png']);
    await f.exec(['-i', inName, '-i', 'palette.png', '-lavfi',
      `${vf}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=4`, '-loop', '0', 'out.gif']);
    const data = await f.readFile('out.gif');
    await clean(f, [inName, 'palette.png', 'out.gif']);
    const base = file.name.replace(/\.[^.]+$/, '') || 'video';
    return { name: `${base}.gif`, blob: new Blob([(data as Uint8Array).buffer as ArrayBuffer], { type: 'image/gif' }) };
  }, onProgress);
}
