import type { ComponentType } from 'react';
import type { IconType } from './components/ui';
import {
  AudioLines, Binary, Braces, Clock, Dices, Eraser, FileText, Film,
  Image as ImageIcon, KeyRound, Palette, Regex, Scaling, Stamp, Type, Sparkles,
} from 'lucide-react';

import ImageConvert from './components/tools/ImageConvert';
import ImageResize from './components/tools/ImageResize';
import Watermark from './components/tools/Watermark';
import WatermarkRemover from './components/tools/WatermarkRemover';
import DocConvert from './components/tools/DocConvert';
import AudioConvert from './components/tools/AudioConvert';
import VideoFrames from './components/tools/VideoFrames';
import VideoGif from './components/tools/VideoGif';
import TextBatch from './components/tools/TextBatch';
import JsonTool from './components/tools/JsonTool';
import RegexTool from './components/tools/RegexTool';
import EncodingTool from './components/tools/EncodingTool';
import TimestampTool from './components/tools/TimestampTool';
import RandomData from './components/tools/RandomData';
import ColorTool from './components/tools/ColorTool';
import HashTool from './components/tools/HashTool';

export type CatId = 'image' | 'doc' | 'media' | 'text' | 'dev';

export const CATS: { id: CatId; name: string; desc: string; icon: IconType }[] = [
  { id: 'image', name: '图片工具', desc: '格式转换 · 压缩 · 加 / 去水印', icon: ImageIcon },
  { id: 'doc', name: '文档转换', desc: 'Markdown ↔ HTML ↔ 纯文本', icon: FileText },
  { id: 'media', name: '音视频', desc: 'ffmpeg.wasm 全本地处理', icon: Film },
  { id: 'text', name: '文本处理', desc: '批量清洗 · JSON · 正则 · 编码', icon: Type },
  { id: 'dev', name: '开发者', desc: '时间戳 · 随机数据 · 颜色 · 签名', icon: Sparkles },
];

export interface ToolMeta {
  id: string;
  name: string;
  desc: string;
  icon: IconType;
  cat: CatId;
  component: ComponentType;
  tags?: string[];
}

export const TOOLS: ToolMeta[] = [
  // 图片
  { id: 'image-convert', name: '格式转换 / 压缩', desc: 'WebP ↔ PNG ↔ JPG 互转、质量压缩、批量最长边限制', icon: ImageIcon, cat: 'image', component: ImageConvert, tags: ['webp', 'png', 'jpg', '压缩', 'convert'] },
  { id: 'image-resize', name: '批量改尺寸', desc: '按比例 / 指定宽高 / 最长边三种模式批量缩放', icon: Scaling, cat: 'image', component: ImageResize, tags: ['resize', '缩放', '尺寸'] },
  { id: 'watermark', name: '图片加水印', desc: '文字 / 图片水印，平铺防盗图，实时预览，批量导出', icon: Stamp, cat: 'image', component: Watermark, tags: ['水印', 'watermark'] },
  { id: 'watermark-remove', name: '去水印 / 修复', desc: '涂抹水印区域，多尺度扩散算法自动修复背景', icon: Eraser, cat: 'image', component: WatermarkRemover, tags: ['去水印', '修复', 'inpaint'] },

  // 文档
  { id: 'doc-convert', name: '文档转换', desc: 'Markdown → HTML（实时预览 / 独立文件导出）、HTML → Markdown / 纯文本', icon: FileText, cat: 'doc', component: DocConvert, tags: ['markdown', 'html', 'md'] },

  // 音视频
  { id: 'audio-convert', name: '音频格式转换', desc: 'MP3 / WAV / FLAC / OGG / M4A 互转，可调比特率', icon: AudioLines, cat: 'media', component: AudioConvert, tags: ['mp3', 'wav', 'flac', 'ffmpeg'] },
  { id: 'video-frames', name: '视频抽帧', desc: '按帧率或间隔批量导出视频帧图片', icon: Film, cat: 'media', component: VideoFrames, tags: ['抽帧', 'frames', 'ffmpeg'] },
  { id: 'video-gif', name: '视频转 GIF', desc: '两遍调色板法生成高质量 GIF，可调宽度帧率', icon: Film, cat: 'media', component: VideoGif, tags: ['gif', 'ffmpeg'] },

  // 文本
  { id: 'text-batch', name: '文本批量处理', desc: '去空行 / 去重 / 排序 / 大小写转换，实时生效', icon: Type, cat: 'text', component: TextBatch, tags: ['去重', '排序', '空行'] },
  { id: 'json-tool', name: 'JSON / CSV 工具', desc: 'JSON 格式化压缩、JSON ↔ CSV 双向互转', icon: Braces, cat: 'text', component: JsonTool, tags: ['json', 'csv', '格式化'] },
  { id: 'regex-tool', name: '正则替换 / 提取', desc: '批量替换、提取手机号 / 邮箱 / 链接等常用预设', icon: Regex, cat: 'text', component: RegexTool, tags: ['正则', 'regex', '手机号'] },
  { id: 'encoding', name: '编码转换', desc: 'URL / Base64 / Unicode / Hex 编码解码', icon: Binary, cat: 'text', component: EncodingTool, tags: ['base64', 'url', 'unicode', 'hex'] },

  // 开发者
  { id: 'timestamp', name: '时间戳转换', desc: '秒 / 毫秒时间戳 ↔ 日期，批量转换，实时时钟', icon: Clock, cat: 'dev', component: TimestampTool, tags: ['timestamp', '时间'] },
  { id: 'random-data', name: '随机数据生成', desc: '手机号 / UUID / 自定义 ID / Mock JSON 模拟数据', icon: Dices, cat: 'dev', component: RandomData, tags: ['uuid', 'mock', '随机'] },
  { id: 'color', name: '颜色工具箱', desc: 'HEX / RGB / HSL 互转、渐变生成、屏幕取色器', icon: Palette, cat: 'dev', component: ColorTool, tags: ['颜色', '取色', '渐变'] },
  { id: 'hash', name: '签名计算器', desc: 'MD5 / SHA-1 / SHA-256 / SHA-512 / HMAC 接口签名', icon: KeyRound, cat: 'dev', component: HashTool, tags: ['md5', 'sha256', 'hmac', '签名'] },
];
