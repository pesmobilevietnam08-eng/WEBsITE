import {
  CfgSchema,
  LessonBundleSchema,
  ScaleSchema,
  type CfgData,
  type ScaleMap,
} from './schema';
import { normalizeLessonBundle, type LessonData } from './normalize';

export interface CatalogItem {
  readonly id: string;
  readonly kind: 'pic' | 'free' | 'read';
  readonly bai: number;
  readonly index: number;
  readonly title: string;
  readonly jp: string;
  readonly vn: string;
  readonly pic?: string;
  readonly topic?: string;
  readonly keywords: string;
}

export interface CatalogData {
  readonly bais: readonly number[];
  readonly counts: Readonly<Record<string, { readonly pic: number; readonly free: number; readonly read: number }>>;
  readonly items: readonly CatalogItem[];
}

export interface ImageDimensions {
  readonly width: number;
  readonly height: number;
}

let cfgCache: CfgData | null = null;
let scaleCache: ScaleMap | null = null;
let catalogCache: CatalogData | null = null;
let imageMetaCache: Readonly<Record<string, ImageDimensions>> | null = null;
const lessonCache = new Map<number, LessonData>();

export async function loadCfg(): Promise<CfgData> {
  if (cfgCache) return cfgCache;
  const mod = await import('./generated/cfg.json');
  cfgCache = CfgSchema.parse(mod.default);
  return cfgCache;
}

export async function loadScale(): Promise<ScaleMap> {
  if (scaleCache) return scaleCache;
  const mod = await import('./generated/scale.json');
  scaleCache = ScaleSchema.parse(mod.default);
  return scaleCache;
}

export async function loadCatalog(): Promise<CatalogData> {
  if (catalogCache) return catalogCache;
  const mod = await import('./generated/catalog.json');
  catalogCache = mod.default as CatalogData;
  return catalogCache;
}

export async function loadImageMeta(): Promise<Readonly<Record<string, ImageDimensions>>> {
  if (imageMetaCache) return imageMetaCache;
  const mod = await import('./generated/image-meta.json');
  imageMetaCache = mod.default as Readonly<Record<string, ImageDimensions>>;
  return imageMetaCache;
}

export async function loadLesson(bai: number): Promise<LessonData> {
  const cached = lessonCache.get(bai);
  if (cached) return cached;

  let raw: unknown;
  if (bai === 1) {
    raw = (await import('./generated/bai-1.json')).default;
  } else if (bai === 2) {
    raw = (await import('./generated/bai-2.json')).default;
  } else if (bai === 3) {
    raw = (await import('./generated/bai-3.json')).default;
  } else {
    throw new Error(`Không tìm thấy dữ liệu cho Bài ${bai}`);
  }

  const parsed = LessonBundleSchema.parse(raw);
  const normalized = normalizeLessonBundle(parsed);
  lessonCache.set(bai, normalized);
  return normalized;
}

export async function loadAllLessons(): Promise<readonly LessonData[]> {
  const cfg = await loadCfg();
  return Promise.all(cfg.bais.map((b) => loadLesson(b)));
}
