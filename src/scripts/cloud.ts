// "Ask the cloud": a small, private, in-browser language reader (EN + AR).
// No network calls: it normalises the text, finds concepts (with negation), a budget,
// and free words, then ranks KUMO's dishes and explains why.

export type BootItem = { id: string; n: string; d: string; st: string; s: string; p: number; t: string[]; m: string[]; h: string };
type Prepared = BootItem & { hay: string };

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
export function norm(s: string) {
  return s
    .toLowerCase()
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)))
    .replace(/[ً-ْـ]/g, '') // tashkeel, tatweel
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[’'`]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

const DRINKS = ['mocktails', 'matcha', 'coffee', 'tea', 'water'];
type Concept = { q: string[]; match: (it: Prepared) => boolean };
const has = (...w: string[]) => (it: Prepared) => w.some((x) => it.hay.includes(x));
const sec = (...s: string[]) => (it: Prepared) => s.includes(it.s);
const or = (...f: ((it: Prepared) => boolean)[]) => (it: Prepared) => f.some((g) => g(it));
const isFood = (it: Prepared) => !DRINKS.includes(it.s);

const C: Record<string, Concept> = {
  spicy: { q: ['spicy', 'spice', 'hot', 'chili', 'chilli', 'fiery', 'heat', 'kick', 'حار', 'حاره', 'سبايسي', 'شطه', 'فلفل'], match: (it) => it.t.includes('S') },
  raw: { q: ['raw', 'sashimi', 'uncooked', 'tartare', 'نيء', 'ني', 'نيي', 'ساشيمي'], match: (it) => it.t.includes('R') },
  veg: { q: ['vegetarian', 'veggie', 'veg', 'vegan', 'plant', 'meatless', 'نباتي', 'نباتيه', 'خضار', 'خضروات'], match: (it) => it.t.includes('V') },
  sweet: { q: ['sweet', 'dessert', 'desserts', 'sugar', 'cake', 'pastry', 'حلو', 'حلى', 'حلا', 'حلويات', 'حلي', 'سكر'], match: or(sec('desserts', 'morning-dessert'), (it) => !isFood(it) && it.hay.includes('sweet')) },
  light: { q: ['light', 'fresh', 'healthy', 'clean', 'lean', 'refreshing', 'salad', 'خفيف', 'منعش', 'صحي', 'سلطه'], match: has('light', 'fresh', 'healthy', 'refreshing') },
  hearty: { q: ['hearty', 'hungry', 'starving', 'filling', 'big', 'comfort', 'heavy', 'جوعان', 'جيعان', 'جائع', 'مشبع', 'دسم'], match: or(has('comfort', 'hearty'), (it) => isFood(it) && sec('buns', 'robata', 'rice-pots')(it)) },
  drink: { q: ['drink', 'drinks', 'beverage', 'thirsty', 'sip', 'مشروب', 'مشروبات', 'عطشان', 'اشرب'], match: (it) => DRINKS.includes(it.s) },
  coffee: { q: ['coffee', 'espresso', 'latte', 'cappuccino', 'cortado', 'americano', 'caffeine', 'قهوه', 'كوفي', 'اسبريسو', 'لاتيه', 'كابتشينو'], match: sec('coffee') },
  matcha: { q: ['matcha', 'ماتشا'], match: has('matcha') },
  tea: { q: ['tea', 'sencha', 'شاي'], match: sec('tea') },
  cold: { q: ['cold', 'iced', 'chilled', 'cool', 'بارد', 'مثلج', 'ايس'], match: or(has('cold', 'iced'), sec('mocktails')) },
  warm: { q: ['warm', 'cozy', 'cosy', 'دافي', 'دافيء', 'ساخن'], match: has('warm') },
  chicken: { q: ['chicken', 'دجاج'], match: has('chicken') },
  beef: { q: ['beef', 'wagyu', 'steak', 'meat', 'burger', 'لحم', 'واغيو', 'واجيو', 'ستيك', 'برجر', 'برغر'], match: has('beef', 'wagyu', 'meat') },
  fish: { q: ['fish', 'salmon', 'tuna', 'hamachi', 'yellowtail', 'toro', 'seabass', 'سمك', 'سلمون', 'تونه'], match: has('fish', 'salmon', 'tuna') },
  seafood: { q: ['seafood', 'prawn', 'prawns', 'shrimp', 'squid', 'scallop', 'langoustine', 'بحري', 'بحريه', 'روبيان', 'جمبري', 'ربيان', 'حبار'], match: has('seafood', 'shrimp', 'prawn', 'squid', 'scallop', 'langoustine') },
  sushi: { q: ['sushi', 'nigiri', 'maki', 'roll', 'rolls', 'handroll', 'سوشي', 'نيجيري', 'ماكي', 'رول'], match: sec('nigiri', 'handrolls', 'maki') },
  share: { q: ['share', 'sharing', 'friends', 'group', 'family', 'together', 'table', 'مشاركه', 'نتشارك', 'اصدقاء', 'اصحاب', 'ربع', 'عائله', 'مجموعه'], match: or(has('share'), sec('hot-starters', 'maki')) },
  luxury: { q: ['luxury', 'treat', 'fancy', 'special', 'splurge', 'indulge', 'celebrate', 'premium', 'best', 'signature', 'ادلل', 'دلل', 'فخم', 'مميز', 'احتفال', 'افضل'], match: (it) => isFood(it) && (it.p >= 79 || it.hay.includes('luxury') || it.hay.includes('premium') || it.hay.includes('signature')) },
  breakfast: { q: ['breakfast', 'morning', 'brunch', 'فطور', 'ريوق', 'صباح', 'الصباح'], match: sec('egg-sando', 'morning-dessert') },
  crispy: { q: ['crispy', 'crunchy', 'crunch', 'fried', 'مقرمش', 'مقرمشه', 'مقلي'], match: has('crispy', 'crunchy', 'fried') },
  chocolate: { q: ['chocolate', 'choc', 'cocoa', 'شوكولا', 'شوكولاته', 'شوكلت'], match: has('chocolate') },
  fruity: { q: ['fruity', 'fruit', 'strawberry', 'mango', 'passionfruit', 'cherry', 'coconut', 'berry', 'فواكه', 'فاكهه', 'فراوله', 'مانجو', 'جوز الهند'], match: has('fruity', 'strawberry', 'mango', 'passion', 'cherry', 'coconut') },
  citrus: { q: ['citrus', 'yuzu', 'lemon', 'lime', 'zesty', 'tangy', 'حمضيات', 'ليمون', 'يوزو'], match: has('citrus', 'yuzu', 'lemon') },
  creamy: { q: ['creamy', 'cream', 'rich', 'milky', 'كريمي', 'كريمه'], match: has('creamy') },
  smoky: { q: ['smoky', 'smokey', 'grilled', 'charcoal', 'robata', 'bbq', 'مدخن', 'مشوي', 'فحم', 'روباتا'], match: or(has('smoky', 'grilled'), sec('robata')) },
  truffle: { q: ['truffle', 'كماه', 'ترافل', 'ترفل'], match: has('truffle') },
  rice: { q: ['rice', 'رز', 'ارز'], match: or(has('rice'), sec('rice-pots')) },
  sandwich: { q: ['sando', 'sandwich', 'bun', 'buns', 'toast', 'ساندو', 'ساندويش', 'ساندوتش', 'سندويش'], match: sec('buns', 'egg-sando') },
};
const TRIGGER = new Map<string, string>();
for (const [k, v] of Object.entries(C)) for (const w of v.q) TRIGGER.set(norm(w), k);

const NEG = new Set(['no', 'not', 'without', 'avoid', 'except', 'nothing', 'non', 'dont', 'never', 'hate', 'allergic', 'minus', 'zero', 'skip', 'بدون', 'لا', 'غير', 'بلا', 'مش', 'ما', 'ماعدا', 'الا', 'مو']);
const NEG_REAL = NEG;
const STOP = new Set(['and', 'but', 'or', 'with', 'something', 'some', 'want', 'like', 'would', 'please', 'give', 'me', 'i', 'im', 'a', 'an', 'the', 'to', 'for', 'of', 'in', 'on', 'it', 'is', 'very', 'really', 'too', 'feel', 'feeling', 'mood', 'today', 'tonight', 'now', 'can', 'could', 'have', 'get', 'eat', 'food', 'dish', 'kind', 'that', 'this', 'more', 'less', 'than', 'under', 'below', 'aed', 'dhs', 'dirham', 'dirhams', 'myself', 'my', 'we', 'us', 'our', 'what', 'which', 'any', 'good', 'nice', 'little', 'bit', 'also', 'maybe', 'up', 'max',
  'و', 'او', 'مع', 'شي', 'شيء', 'اريد', 'ابغى', 'ابغي', 'ابي', 'عطني', 'اعطني', 'انا', 'في', 'من', 'على', 'الى', 'عن', 'جدا', 'مره', 'اليوم', 'الليله', 'الحين', 'اكل', 'طبق', 'اقل', 'تحت', 'درهم', 'لكن', 'بس', 'نفسي', 'شيئا', 'حاجه', 'يكون', 'كثير']);
const BREAK = new Set(['but', 'and', 'or', 'with', 'لكن', 'بس', 'و', 'مع', 'او']);
const MILD = new Set(['mild', 'gentle', 'kids']);

export function lev1(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, e = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++e > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return e + (a.length - i) + (b.length - j) <= 1;
}
/** one-typo tolerant: "salmn" → salmon, "wagu" → wagyu */
export function fuzzyIn(hay: string, t: string) {
  return hay.split(' ').some((w) => w.length >= 3 && (lev1(w, t) || (w.length > t.length && lev1(w.slice(0, t.length), t))));
}

export type Reading = { include: string[]; exclude: string[]; budget?: number; cheap: boolean; free: string[] };

function lookup(tok: string): string | undefined {
  if (TRIGGER.has(tok)) return TRIGGER.get(tok);
  // Arabic clitics: و / ب / ال / بال / وال / لل
  for (const p of ['وال', 'بال', 'لل', 'ال', 'و', 'ب']) if (tok.startsWith(p) && tok.length - p.length >= 2) {
    const t = tok.slice(p.length);
    if (TRIGGER.has(t)) return TRIGGER.get(t);
  }
  // English plural
  if (tok.endsWith('s') && TRIGGER.has(tok.slice(0, -1))) return TRIGGER.get(tok.slice(0, -1));
  return undefined;
}

export function read(text: string): Reading {
  let t = norm(text);
  let budget: number | undefined;
  const bud = t.match(/(?:under|below|less than|cheaper than|max(?:imum)?|up to|within|budget(?: of)?|اقل من|تحت|حدود|لحد|حتي|ميزانيه|ما يتجاوز|لا يتجاوز)\s*(?:aed|dhs|درهم)?\s*(\d{2,3})/) ||
    t.match(/(\d{2,3})\s*(?:aed|dhs|dirhams?|درهم)?\s*(?:or less|max|and under|او اقل)/);
  if (bud) { budget = Number(bud[1]); t = t.replace(bud[0], ' '); }
  const cheap = /\b(cheap|budget|affordable|inexpensive)\b|رخيص|اقتصادي/.test(t);

  const toks = t.split(/\s+/).filter(Boolean);
  const include = new Set<string>(), exclude = new Set<string>(), free: string[] = [];
  let negLeft = 0;
  for (let i = 0; i < toks.length; i++) {
    const w = toks[i];
    if (BREAK.has(w)) { negLeft = 0; continue; }
    if (NEG_REAL.has(w)) { negLeft = 3; continue; }
    if (MILD.has(w)) { exclude.add('spicy'); continue; }
    // "hot" next to drink words means temperature, not chili
    let c = lookup(w);
    if (c === 'spicy' && w === 'hot' && /coffee|tea|drink|latte|matcha|قهوه|شاي/.test(t)) c = 'warm';
    if (c) {
      (negLeft > 0 ? exclude : include).add(c);
      if (negLeft > 0) negLeft--; // "no raw fish" excludes both
      continue;
    }
    if (negLeft > 0) negLeft--;
    if (!STOP.has(w) && !/^\d+$/.test(w) && w.length >= 3) free.push(w);
  }
  for (const e of exclude) include.delete(e);
  return { include: [...include], exclude: [...exclude], budget, cheap, free };
}

export function prepare(items: BootItem[]): Prepared[] {
  return items.map((it) => ({ ...it, hay: ' ' + norm(it.h) + ' ' }));
}

export type Pick = { item: Prepared; why: string[]; later: boolean; score: number };

export function suggest(items: Prepared[], r: Reading, availableNow: (it: Prepared) => boolean): Pick[] {
  const asks = r.include.length + r.free.length;
  if (!asks && !r.exclude.length && !r.budget && !r.cheap) return [];
  const scored: Pick[] = [];
  for (const it of items) {
    if (r.exclude.some((e) => C[e].match(it))) continue;
    if (r.budget && it.p > r.budget) continue;
    const why = r.include.filter((k) => C[k].match(it));
    let score = why.length * 3;
    const name = ' ' + norm(it.n) + ' ';
    let freeHit = false;
    for (const f of r.free) {
      if (it.hay.includes(f)) { score += name.includes(f) ? 5 : 3; freeHit = true; }
      else if (f.length >= 4 && fuzzyIn(it.hay, f)) { score += 3; freeHit = true; }
    }
    if (asks && score === 0) continue;
    // Every requested concept matched is worth more than many partial matches
    if (r.include.length > 1 && why.length === r.include.length) score += 2;
    if (it.hay.includes('signature')) score += 0.6;
    if (r.cheap) score += (100 - Math.min(it.p, 100)) / 40;
    // Food/drink coherence: a food request shouldn't be answered with a water
    const wantsDrink = r.include.some((k) => ['drink', 'coffee', 'tea'].includes(k));
    const drinkish = wantsDrink || r.include.includes('matcha') || r.include.includes('cold');
    if (!freeHit) {
      if (wantsDrink && isFood(it)) continue;
      if (!drinkish && !isFood(it)) score -= 2;
      if (it.s === 'water') score -= 2.5;
    }
    const later = !availableNow(it);
    if (later) score -= 1.2;
    scored.push({ item: it, why, later, score });
  }
  scored.sort((a, b) => b.score - a.score || a.item.p - b.item.p);
  // Variety: prefer three different sections
  const out: Pick[] = [], used = new Set<string>();
  for (const p of scored) { if (out.length < 3 && !used.has(p.item.s)) { out.push(p); used.add(p.item.s); } }
  for (const p of scored) { if (out.length >= 3) break; if (!out.includes(p)) out.push(p); }
  return out.slice(0, 3);
}
