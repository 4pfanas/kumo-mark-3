// Merges the Arabic menu (src/data/menu-ar.json, when present) over the English source.
// Anything missing in Arabic falls back to English, so the build never breaks.
import type { Lang } from '../data/site';
import { menus, allItems, type Item, type Section, type Chapter } from '../data/menu';

type Loose = Record<string, any>;
const files = import.meta.glob<{ default: Loose }>('/src/data/menu-ar.json', { eager: true });
const AR: Loose = Object.values(files)[0]?.default ?? {};

const pick = (v: any, key: string) => (typeof v === 'string' ? (key === 'name' || key === 'title' ? v : undefined) : v?.[key]);

export function itemText(it: Item, lang: Lang) {
  if (lang === 'en') return { name: it.name, desc: it.desc ?? '' };
  const a = AR.items?.[it.id];
  return { name: pick(a, 'name') || it.name, desc: pick(a, 'desc') ?? it.desc ?? '' };
}
export function sectionText(s: Section, lang: Lang) {
  if (lang === 'en') return { title: s.title, tagline: s.tagline ?? '', note: s.note ?? '' };
  const a = AR.sections?.[s.id];
  return {
    title: pick(a, 'title') || s.title,
    tagline: pick(a, 'tagline') ?? s.tagline ?? '',
    note: pick(a, 'note') ?? s.note ?? '',
  };
}
export function chapterText(c: Chapter, lang: Lang) {
  if (lang === 'en') return c.title;
  return pick(AR.chapters?.[c.id], 'title') || c.title;
}
export const hasArabicMenu = Object.keys(AR.items ?? {}).length > 0;

/** Compact data for the client: search, tray and the "Ask the cloud" finder. */
export function clientMenu(lang: Lang) {
  const sec = new Map<string, Section>();
  for (const k of ['main', 'cafe'] as const) for (const ch of menus[k].chapters) for (const s of ch.sections) sec.set(s.id, s);
  return allItems().map((it) => {
    const en = itemText(it, 'en');
    const ar = itemText(it, 'ar');
    const s = sec.get(it.section)!;
    return {
      id: it.id,
      n: lang === 'ar' ? ar.name : en.name,
      d: lang === 'ar' ? ar.desc : en.desc,
      st: sectionText(s, lang).title,
      s: it.section,
      p: it.price,
      t: it.tags ?? [],
      m: it.menus,
      // haystack for search + NLP: both languages, so Arabic queries can find English names and vice versa
      h: [en.name, en.desc, ar.name, ar.desc, it.k ?? '', s.title, s.id].join(' '),
    };
  });
}
export type ClientItem = ReturnType<typeof clientMenu>[number];
