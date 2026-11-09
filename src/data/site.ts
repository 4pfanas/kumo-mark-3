// KUMO site constants. Hours from Google (Nov 2026); menu windows from the restaurant.
export type Lang = 'en' | 'ar';

export const site = {
  /** Proposal mode: noindex + "Concept preview" tag + footer note. Set false once approved. */
  isConcept: true,
  brand: { en: 'KUMO', ar: 'كومو' },
  tz: 'Asia/Dubai',
  phone: '+971600555551',
  phoneDisplay: '600 555 551',
  bookUrl: 'https://indpt.restroengage.com/explore/uae+kmuae001+kumo01/reservations/create',
  instagram: 'https://www.instagram.com/kumo.uae/',
  instagramHandle: '@kumo.uae',
  mapsUrl:
    'https://www.google.com/maps/search/?api=1&query=KUMO%20Al%20Wasl%20Dubai&query_place_id=ChIJw4UaeHRpXz4RKZnMC_jO4Bw',
  geo: { lat: 25.1782794, lng: 55.2340979 },
  rating: { value: 4.6, count: 2185 },
  /** Opening hours per weekday (0 = Sunday), in minutes from midnight; close may pass midnight (24*60). */
  hours: [
    { open: 8 * 60, close: 24 * 60 }, // Sun
    { open: 8 * 60, close: 23 * 60 }, // Mon
    { open: 8 * 60, close: 23 * 60 }, // Tue
    { open: 8 * 60, close: 23 * 60 }, // Wed
    { open: 8 * 60, close: 23 * 60 }, // Thu
    { open: 8 * 60, close: 24 * 60 }, // Fri
    { open: 8 * 60, close: 24 * 60 }, // Sat
  ],
  /** Café Kumo menu 8 AM – 1 PM; main menu from 12 PM until close. */
  cafeWindow: { start: 8 * 60, end: 13 * 60 },
  mainStart: 12 * 60,
  themeColor: '#F3EDE2',
} as const;

export const pathFor = (lang: Lang) => (lang === 'ar' ? '/ar/' : '/');
