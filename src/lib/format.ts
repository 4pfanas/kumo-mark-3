import type { Lang } from '../data/site';

const nf = { en: new Intl.NumberFormat('en'), ar: new Intl.NumberFormat('ar-u-nu-arab') };
export const num = (n: number, lang: Lang) => nf[lang].format(n);

/** Minutes from midnight → "8 AM" / "٨ صباحًا"; 24*60 → "Midnight". */
export function clock(min: number, lang: Lang) {
  if (min >= 24 * 60) return lang === 'ar' ? 'منتصف الليل' : 'Midnight';
  const h = Math.floor(min / 60), m = min % 60;
  const h12 = ((h + 11) % 12) + 1;
  const mm = m ? `:${String(m).padStart(2, '0')}` : '';
  if (lang === 'ar') {
    const suffix = h < 12 ? 'صباحًا' : h < 17 ? 'ظهرًا' : 'مساءً';
    return `${num(h12, 'ar')}${m ? ':' + num(m, 'ar').padStart(2, '٠') : ''} ${suffix}`;
  }
  return `${h12}${mm} ${h < 12 ? 'AM' : 'PM'}`;
}
