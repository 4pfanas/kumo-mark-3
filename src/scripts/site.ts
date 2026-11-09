import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { clock, num } from '../lib/format';
import { fuzzyIn, norm, prepare, read, suggest, type BootItem } from './cloud';

type Lang = 'en' | 'ar';
const boot = JSON.parse(document.getElementById('kumo-boot')?.textContent || '{}') as {
  lang: Lang;
  items: BootItem[];
  site: { hours: { open: number; close: number }[]; cafeWindow: { start: number; end: number }; mainStart: number; tz: string };
  t: any;
};
gsap.registerPlugin(ScrollTrigger);
const lang = boot.lang;
const T = boot.t;
const root = document.documentElement;
const $ = <E extends Element = HTMLElement>(s: string, el: ParentNode = document) => el.querySelector<E>(s as any) as E | null;
const $$ = <E extends Element = HTMLElement>(s: string, el: ParentNode = document) => [...el.querySelectorAll<E>(s as any)] as E[];
const store = {
  get(k: string) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};
const items = prepare(boot.items);
const byId = new Map(items.map((i) => [i.id, i]));
const aed = (n: number) => `${T.currency} ${num(n, lang)}`;

/* ───────── Time in Dubai ───────── */
function dubaiNow() {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: boot.site.tz, weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? '0';
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(g('weekday'));
  return { day, min: Number(g('hour')) * 60 + Number(g('minute')) };
}
function state() {
  const { day, min } = dubaiNow();
  const h = boot.site.hours[day];
  const open = min >= h.open && min < h.close;
  const cafe = open && min >= boot.site.cafeWindow.start && min < boot.site.cafeWindow.end;
  const main = open && min >= boot.site.mainStart;
  return { day, min, open, cafe, main, close: h.close };
}
const availableNow = (it: { m: string[] }) => {
  const s = state();
  return (s.cafe && it.m.includes('cafe')) || (s.main && it.m.includes('main'));
};

function paintStatus() {
  const s = state();
  const S = T.status;
  let text: string;
  if (s.cafe && s.main) text = `${S.both}`;
  else if (s.cafe) text = `${S.cafe} ${S.until} ${clock(boot.site.cafeWindow.end, lang)}`;
  else if (s.main) text = `${S.main} ${S.until} ${clock(s.close, lang)}`;
  else text = S.closed;
  const now = `${S.nowIn} ${clock(s.min, lang)}`;
  $$('[data-status]').forEach((el) => { el.textContent = `${text} · ${now}`; el.closest('.status-pill')?.setAttribute('data-open', String(s.open)); });
  $$('[data-status-short]').forEach((el) => (el.textContent = s.open ? `● ${text}` : text));
  $$('[data-daycard]').forEach((el) => el.classList.toggle('is-now', (el.dataset.daycard === 'cafe' && s.cafe) || (el.dataset.daycard === 'main' && s.main)));
  $$('[data-day]').forEach((el) => el.classList.toggle('is-today', Number(el.dataset.day) === s.day));
}
paintStatus();
setInterval(paintStatus, 30_000);

/* ───────── Mood (朝 / 夜) ───────── */
$('[data-mood-toggle]')?.addEventListener('click', () => {
  const next = root.dataset.mood === 'morning' ? 'evening' : 'morning';
  root.dataset.mood = next;
  store.set('kumo-mood', next);
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute('content', next === 'morning' ? '#EEF0E2' : '#F3EDE2');
});

/* ───────── Header + mobile nav ───────── */
const header = $('[data-header]');
const mobileNav = $('[data-mobile-nav]');
const navBtn = $('[data-nav-open]');
function setNav(open: boolean) {
  mobileNav?.classList.toggle('is-open', open);
  navBtn?.setAttribute('aria-expanded', String(open));
  document.body.style.overflow = open ? 'hidden' : '';
  open ? lenis?.stop() : lenis?.start();
}
navBtn?.addEventListener('click', () => setNav(!mobileNav?.classList.contains('is-open')));
$$('[data-nav-close]').forEach((a) => a.addEventListener('click', () => setNav(false)));
let lastY = 0;
function onScroll(y: number) {
  header?.classList.toggle('is-scrolled', y > 30);
  const menuOpen = mobileNav?.classList.contains('is-open');
  header?.classList.toggle('is-hidden', !menuOpen && y > 640 && y > lastY + 4);
  if (y < lastY - 4) header?.classList.remove('is-hidden');
  lastY = y;
}

/* ───────── Menu explorer ───────── */
const tabs = $$<HTMLButtonElement>('[data-tab]');
const panels = $$('[data-panel]');
function selectTab(key: string, focus = false) {
  tabs.forEach((t) => {
    const on = t.dataset.tab === key;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    if (on && focus) t.focus();
  });
  panels.forEach((p) => (p.hidden = p.dataset.panel !== key));
  applyFilters();
  ScrollTrigger.refresh();
}
tabs.forEach((t, i) => {
  t.addEventListener('click', () => selectTab(t.dataset.tab!));
  t.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const n = tabs[(i + 1) % tabs.length];
    selectTab(n.dataset.tab!, true);
  });
});

$$('[data-open-menu]').forEach((a) => a.addEventListener('click', () => selectTab(a.dataset.openMenu!)));

const search = $<HTMLInputElement>('[data-menu-search]');
const filterBtns = $$<HTMLButtonElement>('[data-filter]');
const active = new Set<string>();
filterBtns.forEach((b) => b.addEventListener('click', () => {
  const f = b.dataset.filter!;
  if (active.has(f)) active.delete(f); else {
    active.add(f);
    if (f === 'R') active.delete('noRaw');
    if (f === 'noRaw') active.delete('R');
  }
  filterBtns.forEach((x) => x.setAttribute('aria-pressed', String(active.has(x.dataset.filter!))));
  applyFilters();
}));

function matches(hay: string, q: string[]) {
  return q.every((t) => hay.includes(t) || (t.length >= 4 && fuzzyIn(hay, t)));
}
const activeCh: Record<string, string> = {};
panels.forEach((p) => (activeCh[p.dataset.panel!] = `ch-${p.dataset.panel}-${p.dataset.firstChapter}`));
function applyFilters() {
  const q = norm(search?.value ?? '').split(' ').filter(Boolean);
  const panel = panels.find((p) => !p.hidden);
  if (!panel) return;
  const filtering = q.length > 0 || active.size > 0;
  panel.classList.toggle('is-filtering', filtering);
  const cur = activeCh[panel.dataset.panel!];
  let shown = 0;
  $$('[data-chapter]', panel).forEach((ch) => {
    let chShown = 0;
    $$('[data-section]', ch).forEach((sec) => {
      let secShown = 0;
      $$<HTMLLIElement>('.menu-item', sec).forEach((li) => {
        const it = byId.get(li.dataset.id!)!;
        const tags = it.t;
        let ok = true;
        for (const f of active) {
          if (f === 'noRaw') { if (tags.includes('R')) ok = false; }
          else if (!tags.includes(f)) ok = false;
        }
        if (ok && q.length) ok = matches(it.hay, q);
        li.hidden = !ok;
        li.classList.toggle('is-hit', ok && q.length > 0);
        if (ok) secShown++;
      });
      sec.hidden = secShown === 0;
      chShown += secShown;
    });
    ch.hidden = chShown === 0 || (!filtering && ch.id !== cur);
    shown += chShown;
  });
  $('[data-menu-empty]', panel)?.classList.toggle('is-shown', shown === 0);
  $$('[data-chapter-link]:not([data-next])', panel).forEach((a) => {
    a.classList.toggle('is-active', !filtering && a.getAttribute('href') === `#${cur}`);
  });
}
{ const s = state(); selectTab(s.open && s.min < boot.site.mainStart ? 'cafe' : 'main'); }
document.addEventListener('click', (e) => {
  const a = (e.target as Element).closest<HTMLAnchorElement>('[data-chapter-link]');
  if (!a) return;
  e.preventDefault();
  const panel = a.closest<HTMLElement>('[data-panel]')!;
  activeCh[panel.dataset.panel!] = a.getAttribute('href')!.slice(1);
  if (search) search.value = '';
  active.clear();
  filterBtns.forEach((x) => x.setAttribute('aria-pressed', 'false'));
  applyFilters();
  const chip = panel.querySelector<HTMLElement>(`.chapter-chips a[href="#${activeCh[panel.dataset.panel!]}"]`);
  chip?.scrollIntoView({ block: 'nearest', inline: 'center' });
  const top = panel.getBoundingClientRect().top;
  if (top < 0 || a.hasAttribute('data-next')) {
    lenis ? lenis.scrollTo(panel, { offset: -170 }) : scrollTo({ top: scrollY + top - 170 });
  }
  ScrollTrigger.refresh();
});
let searchT = 0;
search?.addEventListener('input', () => { clearTimeout(searchT); searchT = window.setTimeout(applyFilters, 90); });

/* ───────── Tray (planning list, kept on this device) ───────── */
let tray: Record<string, number> = {};
try { tray = JSON.parse(store.get('kumo-tray') || '{}'); } catch { tray = {}; }
for (const id of Object.keys(tray)) if (!byId.has(id) || !(tray[id] > 0)) delete tray[id];
const dialog = $<HTMLDialogElement>('[data-tray]');
const fab = $<HTMLButtonElement>('[data-tray-open]');

function renderTray(bump = false) {
  store.set('kumo-tray', JSON.stringify(tray));
  const ids = Object.keys(tray);
  const count = ids.reduce((a, id) => a + tray[id], 0);
  const total = ids.reduce((a, id) => a + tray[id] * byId.get(id)!.p, 0);
  if (fab) {
    fab.hidden = count === 0;
    $('[data-tray-count]', fab)!.textContent = num(count, lang);
    $('[data-tray-total-fab]', fab)!.textContent = aed(total);
    if (bump) { fab.classList.remove('bump'); void fab.offsetWidth; fab.classList.add('bump'); }
  }
  $$<HTMLButtonElement>('[data-tray-add]').forEach((b) => {
    const id = b.dataset.trayAdd!;
    const on = !!tray[id];
    b.setAttribute('aria-pressed', String(on));
    const name = byId.get(id)?.n ?? '';
    b.setAttribute('aria-label', `${on ? T.remove : T.add}: ${name}`);
  });
  const list = $('[data-tray-list]');
  if (list) {
    list.replaceChildren(...ids.map((id) => {
      const it = byId.get(id)!;
      const li = document.createElement('li');
      li.className = 'flex items-center gap-3 border-b border-line py-4';
      li.innerHTML = `<div class="min-w-0 flex-1"><p class="font-semibold"></p><p class="text-[0.8rem] text-sumi-soft"></p></div>
        <div class="flex items-center gap-1 rounded-full border-[1.5px] border-line p-0.5">
          <button type="button" class="grid h-7 w-7 place-items-center rounded-full hover:bg-washi-2" data-q="-1" aria-label="−">−</button>
          <span class="w-6 text-center text-sm font-semibold"></span>
          <button type="button" class="grid h-7 w-7 place-items-center rounded-full hover:bg-washi-2" data-q="1" aria-label="+">+</button>
        </div>`;
      li.querySelector('p')!.textContent = it.n;
      li.querySelectorAll('p')[1].textContent = `${aed(it.p)} · ${it.st}`;
      li.querySelector('span')!.textContent = num(tray[id], lang);
      li.querySelectorAll<HTMLButtonElement>('[data-q]').forEach((b) => b.addEventListener('click', () => {
        tray[id] = (tray[id] || 0) + Number(b.dataset.q);
        if (tray[id] <= 0) delete tray[id];
        renderTray();
      }));
      return li;
    }));
  }
  $('[data-tray-empty]')?.classList.toggle('hidden', count > 0);
  $('[data-tray-empty]')?.classList.toggle('flex', count === 0);
  const tt = $('[data-tray-total]');
  if (tt) tt.textContent = aed(total);
}
document.addEventListener('click', (e) => {
  const b = (e.target as Element).closest<HTMLButtonElement>('[data-tray-add]');
  if (!b) return;
  const id = b.dataset.trayAdd!;
  if (tray[id]) delete tray[id]; else tray[id] = 1;
  renderTray(true);
});
fab?.addEventListener('click', () => { dialog?.showModal(); lenis?.stop(); });
$('[data-tray-close]')?.addEventListener('click', () => dialog?.close());
dialog?.addEventListener('close', () => lenis?.start());
dialog?.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
$('[data-tray-clear]')?.addEventListener('click', () => { tray = {}; renderTray(); });
$('[data-tray-copy]')?.addEventListener('click', async (e) => {
  const b = e.currentTarget as HTMLButtonElement;
  const ids = Object.keys(tray);
  const lines = ids.map((id) => `${tray[id]} × ${byId.get(id)!.n} · ${aed(tray[id] * byId.get(id)!.p)}`);
  const total = ids.reduce((a, id) => a + tray[id] * byId.get(id)!.p, 0);
  const text = `KUMO 雲 · ${T.tray.title}\n${lines.join('\n')}\n${T.tray.total}: ${aed(total)}`;
  try { await navigator.clipboard.writeText(text); } catch {
    const ta = Object.assign(document.createElement('textarea'), { value: text });
    document.body.append(ta); ta.select(); document.execCommand('copy'); ta.remove();
  }
  b.textContent = b.dataset.done!;
  setTimeout(() => (b.textContent = b.dataset.label!), 1600);
});
renderTray();

/* ───────── Ask the cloud ───────── */
const askForm = $<HTMLFormElement>('[data-ask-form]');
const askInput = $<HTMLTextAreaElement>('[data-ask-input]');
const askOut = $('[data-ask-out]');
const thought = $('[data-ask-thought]');
const tpl = $<HTMLTemplateElement>('[data-ask-card]');
const W = T.ask.words as Record<string, string>;
let askTimer = 0;

function ask(text: string) {
  if (!askOut) return;
  const r = read(text);
  thought?.classList.add('is-on');
  askOut.innerHTML = `<p class="t-label text-washi/80">${T.ask.thinking}</p>`;
  clearTimeout(askTimer);
  askTimer = window.setTimeout(() => {
    thought?.classList.remove('is-on');
    const picks = suggest(items, r, availableNow);
    askOut.replaceChildren();
    const heard = document.createElement('div');
    heard.className = 'ask-heard';
    const chips = [
      ...r.include.map((k) => W[k] ?? k),
      ...r.exclude.map((k) => `${W.not} ${W[k] ?? k}`),
      ...(r.budget ? [`${T.ask.budget} ${num(r.budget, lang)}`] : []),
      ...r.free.slice(0, 4).map((f) => `“${f}”`),
    ];
    if (!chips.length && !picks.length) {
      askOut.innerHTML = `<p class="t-body text-washi/80"></p>`;
      askOut.firstElementChild!.textContent = T.ask.nothingHeard;
      return;
    }
    const lab = document.createElement('span');
    lab.className = 't-label text-washi/75 me-1';
    lab.textContent = T.ask.heard;
    heard.append(lab, ...chips.map((c) => Object.assign(document.createElement('span'), { className: 'pill', textContent: c })));
    askOut.append(heard);
    if (!picks.length) {
      const p = document.createElement('p');
      p.className = 't-body mt-8 text-washi/85';
      p.textContent = T.ask.none;
      askOut.append(p);
      return;
    }
    const h = document.createElement('p');
    h.className = 't-label mt-8 text-washi';
    h.textContent = T.ask.picks;
    const ul = document.createElement('ul');
    ul.className = 'mt-4 grid gap-3 md:grid-cols-3';
    picks.forEach((pk, i) => {
      const li = tpl!.content.firstElementChild!.cloneNode(true) as HTMLLIElement;
      const f = (k: string) => li.querySelector<HTMLElement>(`[data-f="${k}"]`)!;
      f('section').textContent = pk.item.st;
      f('name').textContent = pk.item.n;
      f('desc').textContent = pk.item.d;
      f('price').textContent = aed(pk.item.p);
      const why = pk.why.map((k) => W[k] ?? k);
      if (pk.later) why.push(pk.item.m.includes('cafe') && !pk.item.m.includes('main') ? T.ask.notAvailableNow : T.ask.mainOnly);
      if (!why.length && r.free.length) why.push(`“${r.free[0]}”`);
      f('why').textContent = why.join(' · ');
      li.querySelector<HTMLElement>('[data-tray-add]')!.dataset.trayAdd = pk.item.id;
      ul.append(li);
      setTimeout(() => li.classList.add('in'), 80 + i * 140);
    });
    askOut.append(h, ul);
    renderTray();
  }, 650);
}
askForm?.addEventListener('submit', (e) => { e.preventDefault(); if (askInput?.value.trim()) ask(askInput.value); });
askInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); askForm?.requestSubmit(); } });
$$<HTMLButtonElement>('[data-ask-example]').forEach((b) => b.addEventListener('click', () => {
  if (askInput) askInput.value = b.textContent!.trim();
  ask(b.textContent!.trim());
}));

/* ───────── Matcha bar ───────── */
const glass = $('[data-glass]');
const cupBtns = $$<HTMLButtonElement>('[data-cup]');
cupBtns.forEach((b, i) => b.addEventListener('click', () => {
  cupBtns.forEach((x) => x.setAttribute('aria-checked', String(x === b)));
  const [l1, l2, l3] = b.dataset.l!.split(',');
  glass?.style.setProperty('--l1', l1); glass?.style.setProperty('--l2', l2); glass?.style.setProperty('--l3', l3);
  $('[data-cup-name]')!.textContent = b.dataset.name!;
  $('[data-cup-desc]')!.textContent = b.dataset.desc!;
  $('[data-cup-price]')!.textContent = b.dataset.price!;
  $('[data-cup-quote]')?.classList.toggle('is-hidden', i !== 0);
}));
cupBtns.forEach((b, i) => b.addEventListener('keydown', (e) => {
  if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
  e.preventDefault();
  const rtl = lang === 'ar';
  const fwd = e.key === 'ArrowDown' || (e.key === 'ArrowRight' && !rtl) || (e.key === 'ArrowLeft' && rtl);
  const n = cupBtns[(i + (fwd ? 1 : cupBtns.length - 1)) % cupBtns.length];
  n.focus(); n.click();
}));
cupBtns.forEach((b, i) => (b.tabIndex = i === 0 ? 0 : -1));

/* ───────── Motion ───────── */
let lenis: Lenis | null = null;
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!reduce) {
  root.classList.add('motion-ok');
  lenis = new Lenis({ duration: 1.15, smoothWheel: true });
  lenis.on('scroll', (e: any) => { ScrollTrigger.update(); onScroll(e.scroll); });
  gsap.ticker.add((t) => lenis!.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  // Entrance: plays when the hero arrives (after the dragon intro, if there is one)
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' }, onComplete: () => root.classList.remove('js-motion') });
  tl.fromTo('[data-hero-line]', { yPercent: 105 }, { yPercent: 0, y: 0, duration: 1.4, stagger: 0.12 }, 0.15)
    .fromTo('[data-hero-fade]', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 1.1, stagger: 0.08 }, 0.5)
    .fromTo('[data-hero-cloud]', { opacity: 0 }, { opacity: 1, duration: 1.8, stagger: 0.1 }, 0.2)
    .from('.mascot', { scale: 0.6, y: 60, duration: 1.8, ease: 'elastic.out(1, 0.6)' }, 0.4);
  ScrollTrigger.create({ trigger: '.hero', start: 'top 70%', once: true, onEnter: () => tl.play() });

  // Dragon intro
  const intro = $('[data-intro]');
  if (intro) setupIntro(intro);

  // Pointer parallax on the sky
  if (window.matchMedia('(pointer: fine)').matches) {
    const layers = $$('[data-depth]').map((el) => ({ d: Number(el.dataset.depth), x: gsap.quickTo(el, 'x', { duration: 1.2, ease: 'power3' }), y: gsap.quickTo(el, 'y', { duration: 1.2, ease: 'power3' }) }));
    $('[data-hero]')?.addEventListener('pointermove', (e) => {
      const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
      layers.forEach((l) => { l.x(nx * 40 * l.d); l.y(ny * 30 * l.d); });
    });
  }

  // Clouds lift away as you scroll from the hero
  gsap.to('.hero .kanji', { yPercent: -18, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

  // Reveals
  gsap.set('[data-reveal]', { opacity: 0, y: 28 });
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 88%',
    once: true,
    onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 1.1, stagger: 0.08, ease: 'expo.out' }),
  });

  // Story: words light up as you read
  const words = $$('.lit-word');
  if (words.length) ScrollTrigger.create({
    trigger: '[data-lit]', start: 'top 80%', end: 'bottom 45%', scrub: true,
    onUpdate: (st) => { const n = Math.round(st.progress * words.length); words.forEach((w, i) => w.classList.toggle('is-lit', i < n)); },
  });

  // Image drift
  $$('[data-drift]').forEach((el) => gsap.fromTo(el, { yPercent: -6, scale: 1.12 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: el.parentElement!, start: 'top bottom', end: 'bottom top', scrub: true } }));

  // Footer wordmark rises
  gsap.from('[data-footer-mark]', { yPercent: 35, ease: 'none', scrollTrigger: { trigger: 'footer', start: 'top bottom', end: 'bottom bottom', scrub: true } });

  // Anchor links glide
  document.addEventListener('click', (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
    if (!a || a.hasAttribute('data-chapter-link')) return;
    const id = a.getAttribute('href')!;
    const el = id === '#top' ? document.body : document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    lenis!.scrollTo(el as HTMLElement, { offset: id.startsWith('#ch-') ? -170 : -60 });
    history.replaceState(null, '', id === '#top' ? location.pathname : id);
  });
} else {
  root.classList.remove('js-motion');
  const intro = $('[data-intro]');
  if (intro) setupIntro(intro, true);
  addEventListener('scroll', () => onScroll(scrollY), { passive: true });
}

// Language switch: a soft fade between EN and AR
$$<HTMLAnchorElement>('[data-lang-switch]').forEach((a) => a.addEventListener('click', (e) => {
  if (reduce || e.metaKey || e.ctrlKey) return;
  e.preventDefault();
  root.classList.add('is-leaving');
  setTimeout(() => (location.href = a.href), 260);
}));
addEventListener('pageshow', () => root.classList.remove('is-leaving'));

/* ───────── Dragon intro (three.js, loaded only when needed) ───────── */
function setupIntro(intro: HTMLElement, reducedMotion = false) {
  const canvas = $<HTMLCanvasElement>('[data-intro-canvas]', intro)!;
  const flash = $('[data-intro-flash]', intro)!;
  const copy = $('[data-intro-copy]', intro), hint = $('[data-intro-hint]', intro), skip = $('[data-intro-skip]', intro);
  const white = $('[data-intro-whiteout]', intro)!, choose = $('[data-intro-choose]', intro)!;
  const sm = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  import('./intro').then(({ startIntro, webglOK }) => {
    if (!webglOK()) { root.classList.add('intro-static'); return; }
    const scene = startIntro({ canvas, flash, reduced: reducedMotion });
    if (reducedMotion) {
      root.classList.add('intro-static');
      scene.setProgress(0.32);
      return;
    }
    scene.start();
    root.classList.add('intro-active');
    const paint = (p: number) => {
      scene.setProgress(p);
      const fadeOut = 1 - sm(0.02, 0.16, p);
      if (copy) { copy.style.opacity = String(fadeOut); copy.style.transform = `translateY(${-40 * (1 - fadeOut)}px)`; }
      if (hint) hint.style.opacity = String(fadeOut);
      if (skip) skip.style.opacity = String(1 - sm(0.8, 0.88, p));
      white.style.opacity = String(sm(0.76, 0.92, p));
      const c = sm(0.86, 0.97, p);
      choose.style.opacity = String(c);
      choose.style.transform = `translateY(${(1 - c) * 50}px)`;
      choose.classList.toggle('is-on', c > 0.05);
      root.classList.toggle('intro-active', p < 0.9);
    };
    paint(0);
    ScrollTrigger.create({ trigger: intro, start: 'top top', end: 'bottom bottom', scrub: 0.6, onUpdate: (st) => paint(st.progress) });
    // only draw while the intro is on screen
    new IntersectionObserver(([e]) => (e.isIntersecting ? scene.play() : scene.pause())).observe(intro);
  }).catch((err) => { console.error('[kumo intro]', err); root.classList.add('intro-static'); });
}
