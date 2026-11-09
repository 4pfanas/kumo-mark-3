// Kumo menus, transcribed from the in-restaurant digital menu (November 2026). Prices in AED.
// Tags: S = spicy, R = raw, V = vegetarian (Kumo's own markers).
// `k` = extra keywords used by the Mood Finder (taste, temperature, protein, texture).

export type Tag = 'S' | 'R' | 'V';
export type Item = { id: string; name: string; desc?: string; price: number; tags?: Tag[]; k?: string };
export type Section = { id: string; title: string; jp: string; tagline?: string; note?: string; items: Item[] };
export type Chapter = { id: string; title: string; jp: string; sections: Section[] };

const raw: Section = {
  id: 'raw', title: 'Raw', jp: 'なまもの', tagline: 'Sliced clean, served loud',
  items: [
    { id: 'salmon-tiradito', name: 'Salmon Tiradito', desc: 'Thinly sliced salmon, ponzu, sesame', price: 59, tags: ['R'], k: 'fish light fresh citrus cold sashimi' },
    { id: 'yellowtail-tiradito', name: 'Yellowtail Tiradito', desc: 'Yuzu truffle sauce', price: 61, tags: ['R'], k: 'fish hamachi light fresh citrus truffle cold' },
    { id: 'wagyu-tataki', name: 'Wagyu Tataki', desc: 'Japanese A5 wagyu, umami citrus glaze', price: 99, k: 'beef meat luxury premium seared' },
    { id: 'akami-tataki', name: 'Akami Tataki', desc: 'Ponzu, crispy garlic', price: 70, k: 'tuna fish seared garlic light' },
  ],
};
const salads: Section = {
  id: 'salads', title: 'Salads', jp: 'サラダ', tagline: 'Light, layered, full of texture',
  items: [
    { id: 'baby-spinach-salad', name: 'Baby Spinach Salad', desc: 'Crispy shiitake, goma sauce', price: 59, tags: ['V'], k: 'light healthy green fresh mushroom crunchy' },
    { id: 'kale-salad', name: 'Kale Salad', desc: 'Crispy quinoa, radish, edamame, citrus soy', price: 65, tags: ['V'], k: 'light healthy green fresh crunchy citrus' },
  ],
};
const hotStarters: Section = {
  id: 'hot-starters', title: 'Hot Starters', jp: '温前菜', tagline: 'Elevated heat, bold beginnings',
  items: [
    { id: 'edamame', name: 'Edamame', desc: 'Lemon zest, sea salt', price: 25, tags: ['V'], k: 'light snack share warm healthy' },
    { id: 'spicy-edamame', name: 'Spicy Edamame', desc: 'Chili glaze, sea salt', price: 29, tags: ['S', 'V'], k: 'snack share warm' },
    { id: 'baby-squid', name: 'Baby Squid', desc: 'Salt & vinegar, aji verde sauce', price: 67, k: 'seafood crispy fried tangy' },
    { id: 'prawn-tempura', name: 'Prawn Tempura', desc: 'Japanese seven spice, tentsuyu sauce', price: 71, k: 'seafood shrimp crispy fried warm' },
    { id: 'crispy-prawn-gyoza', name: 'Crispy Prawn Gyoza', desc: 'Ponzu rayu, citrus soy, chili oil', price: 87, k: 'seafood shrimp dumpling crispy warm' },
    { id: 'crispy-beef-gyoza', name: 'Crispy Beef Gyoza', desc: 'Truffle goma', price: 89, k: 'beef meat dumpling crispy truffle warm' },
    { id: 'spicy-chicken-karaage', name: 'Spicy Chicken Karaage', desc: 'Hot sauce, Japanese seven spice', price: 59, tags: ['S'], k: 'chicken crispy fried comfort warm' },
    { id: 'wagyu-potato-taco', name: 'Wagyu Potato Taco', desc: 'Crispy sweet potato, wagyu, smoked chili', price: 67, tags: ['S'], k: 'beef meat crispy smoky' },
    { id: 'salmon-crispy-rice', name: 'Salmon Crispy Rice', desc: 'Spicy kimchi, avocado', price: 45, tags: ['S', 'R'], k: 'fish crispy rice' },
    { id: 'tuna-crispy-rice', name: 'Tuna Crispy Rice', desc: 'Spicy kimchi, avocado', price: 49, tags: ['S', 'R'], k: 'fish crispy rice' },
  ],
};
const nigiri: Section = {
  id: 'nigiri', title: 'Signature Nigiri', jp: '自慢のにぎり', tagline: 'Crafted bites, signature toppings, 2 pcs',
  note: 'Classic nigiri available upon request.',
  items: [
    { id: 'nigiri-salmon', name: 'Salmon', desc: 'Truffle, yuzu', price: 40, tags: ['R'], k: 'sushi fish light' },
    { id: 'nigiri-salmon-belly-aburi', name: 'Salmon Belly Aburi', desc: 'Sweet soya, sea salt', price: 48, tags: ['R'], k: 'sushi fish seared rich' },
    { id: 'nigiri-wagyu', name: 'Wagyu', desc: 'Japanese A5 wagyu, togarashi butter', price: 79, tags: ['R'], k: 'sushi beef meat luxury rich' },
    { id: 'nigiri-langoustine', name: 'Langoustine', desc: 'Rocoto butter', price: 59, k: 'sushi seafood rich' },
    { id: 'nigiri-hamachi', name: 'Hamachi', desc: 'Soy chilli, crispy garlic', price: 47, tags: ['R'], k: 'sushi fish yellowtail' },
    { id: 'nigiri-chutoro', name: 'Chutoro', desc: 'Japanese bluefin tuna, sweet soy', price: 70, tags: ['R'], k: 'sushi fish tuna luxury rich' },
    { id: 'nigiri-o-toro', name: 'O-Toro', desc: 'Japanese bluefin tuna, ponzu, yuzu kosho', price: 79, tags: ['R'], k: 'sushi fish tuna luxury rich' },
    { id: 'nigiri-scallop', name: 'Scallop', desc: 'Truffle, yuzu', price: 57, tags: ['R'], k: 'sushi seafood light' },
  ],
};
const handrolls: Section = {
  id: 'handrolls', title: 'Handrolls', jp: '手巻き', tagline: 'Crispy nori, rolled to order, 1 pc',
  items: [
    { id: 'handroll-salmon', name: 'Salmon Handroll', desc: 'Kimchi, cucumber, crispy onion', price: 35, tags: ['R'], k: 'sushi fish crispy' },
    { id: 'handroll-tuna', name: 'Tuna Handroll', desc: 'Kimchi, cucumber, crispy onion', price: 50, tags: ['R'], k: 'sushi fish crispy' },
  ],
};
const maki: Section = {
  id: 'maki', title: 'Kumo Maki', jp: '巻きもの', tagline: 'Signature rolls, house sauces',
  items: [
    { id: 'maki-dragon', name: 'Dragon', desc: 'Shrimp tempura, avocado, cucumber, white sesame, dragon sauce · 8 pcs', price: 59, k: 'sushi roll seafood shrimp crispy share' },
    { id: 'maki-kumo-roll', name: 'Kumo Roll', desc: 'Shrimp tempura, avocado, gochujang, crispy quinoa · 6 pcs', price: 67, tags: ['S'], k: 'sushi roll seafood shrimp crispy signature' },
    { id: 'maki-volcano', name: 'Volcano', desc: 'Shrimp tempura, salmon tartar, cucumber, asparagus, togarashi · 5 pcs', price: 69, tags: ['S', 'R'], k: 'sushi roll seafood fish' },
    { id: 'maki-spicy-tuna', name: 'Spicy Tuna', desc: 'Tuna, avocado, cucumber, kimchi sauce, togarashi · 5 pcs', price: 65, tags: ['S', 'R'], k: 'sushi roll fish' },
  ],
};
const buns: Section = {
  id: 'buns', title: 'Buns & Sandos', jp: 'パンズ', tagline: 'Soft, steamy, flavor-packed',
  items: [
    { id: 'japanese-burger', name: 'Japanese Burger', desc: 'A5 patty, melted provolone, kimchi aioli, tonkatsu sauce, Japanese milk bun', price: 98, k: 'beef meat burger hearty comfort cheese filling' },
    { id: 'shabu-shabu-bun', name: 'Shabu Shabu Bun', desc: 'A5 shabu shabu, truffle-infused Japanese bun', price: 105, k: 'beef meat bun hearty truffle' },
    { id: 'wagyu-sando', name: 'Wagyu Sando', desc: 'Wagyu tenderloin, ponzu yuzu sauce, charcoal-grilled sourdough, provolone', price: 159, tags: ['S'], k: 'beef meat sandwich luxury hearty cheese' },
    { id: 'chicken-sando', name: 'Chicken Sando', desc: 'Chicken fillet, aji verde sauce, charcoal-grilled sourdough, provolone', price: 73, tags: ['S'], k: 'chicken sandwich hearty cheese crispy' },
    { id: 'bluefin-tuna-sando', name: 'Bluefin Tuna Sando', desc: 'Bluefin tuna, togarashi butter, charcoal-grilled sourdough, provolone', price: 117, k: 'fish tuna sandwich hearty cheese' },
  ],
};
const robata: Section = {
  id: 'robata', title: 'Robata', jp: '炉端焼き', tagline: 'Smokey, tender, off the charcoal',
  items: [
    { id: 'wagyu-mb9', name: 'Wagyu Tenderloin MB9', desc: 'Goma truffle, sesame', price: 310, k: 'beef meat steak grilled smoky luxury hearty' },
    { id: 'wagyu-mb7', name: 'Wagyu Tenderloin MB7', desc: 'Goma truffle, sesame', price: 299, k: 'beef meat steak grilled smoky luxury hearty' },
    { id: 'robata-seabass', name: 'Chilean Seabass', desc: 'Grapefruit miso, gochujang sauce', price: 179, k: 'fish grilled smoky miso' },
    { id: 'chicken-skewers', name: 'Chicken Skewers', desc: 'Tofu-marinated chicken, aji verde', price: 61, k: 'chicken grilled smoky light skewer' },
  ],
};
const sides: Section = {
  id: 'robata-sides', title: 'Robata Sides', jp: '炉端焼きのおつまみ', tagline: 'Grilled, glazed to perfection',
  items: [
    { id: 'maitake', name: 'Maitake', desc: 'Japanese mushroom, goma kosho, sweet yuzu', price: 75, tags: ['V'], k: 'mushroom grilled smoky side' },
    { id: 'broccolini', name: 'Broccolini', desc: 'Goma kosho, sweet yuzu', price: 49, tags: ['V'], k: 'green grilled side light healthy' },
    { id: 'crispy-potato', name: 'Crispy Potato', desc: 'Japanese herb sour cream', price: 53, k: 'side crispy comfort potato' },
    { id: 'kumo-baked-potato', name: 'Kumo Baked Potato', desc: 'Yuzu, shiso, red yuzu kosho', price: 55, tags: ['V'], k: 'side comfort potato warm' },
    { id: 'grilled-corn', name: 'Grilled Corn', desc: 'Lime butter, togarashi, sour cream lime dip', price: 51, tags: ['V'], k: 'side grilled smoky' },
    { id: 'padron-pepper', name: 'Padron Pepper', desc: 'Yuzu teriyaki, togarashi', price: 43, tags: ['V'], k: 'side grilled light' },
  ],
};
const ricePots: Section = {
  id: 'rice-pots', title: 'Rice Pots', jp: '釜飯', tagline: 'Rice base, layered toppings',
  items: [
    { id: 'rice-truffle-mushroom', name: 'Truffle Mushroom Rice Pot', desc: 'Soy, Japanese mushrooms', price: 149, k: 'rice hearty comfort truffle warm share vegetarian-friendly' },
    { id: 'rice-seabass', name: 'Chilean Seabass Rice Pot', desc: 'Yuzu teriyaki', price: 177, k: 'rice fish hearty comfort warm share' },
  ],
};
const desserts: Section = {
  id: 'desserts', title: 'Desserts', jp: 'デザート', tagline: 'Sweet endings, crafted with a Kyoto soul',
  items: [
    { id: 'churros', name: 'Churros', desc: 'Dulce de leche, dark chocolate', price: 71, k: 'sweet dessert chocolate warm share' },
    { id: 'kumo-cloud', name: 'Kumo Cloud', desc: 'Coffee miso ice cream, Oreo crumbs, chocolate shell', price: 75, k: 'sweet dessert chocolate coffee cold signature ice cream' },
    { id: 'matcha-yogurt', name: 'Matcha Yogurt', desc: 'Ice cream, strawberry, biscuit crumble', price: 71, k: 'sweet dessert matcha fruity cold ice cream' },
    { id: 'sesame-fondant', name: 'Sesame Chocolate Fondant', desc: 'Coconut vanilla ice cream', price: 65, k: 'sweet dessert chocolate warm rich' },
    { id: 'yuzu-cheesecake', name: 'Yuzu Cheesecake', desc: 'Dulce de leche, yuzu', price: 55, k: 'sweet dessert citrus creamy' },
  ],
};
const mocktails: Section = {
  id: 'mocktails', title: 'Kumo Mocktails', jp: 'モクテル',
  items: [
    { id: 'cherry-blossom', name: 'Cherry Blossom', desc: 'Cherry, lychee, pink flower', price: 39, k: 'drink cold fruity sweet refreshing floral' },
    { id: 'passionfruit-mojito', name: 'Passionfruit Mojito', desc: 'Passionfruit, yuzu, passionfruit bites', price: 39, k: 'drink cold fruity refreshing citrus' },
    { id: 'strawberry-mojito', name: 'Strawberry Mojito', desc: 'Strawberry, yuzu, mint', price: 35, k: 'drink cold fruity refreshing' },
    { id: 'yuzu-lemonade', name: 'Yuzu Lemonade', desc: 'Yuzu, lemonade', price: 35, k: 'drink cold citrus refreshing light' },
  ],
};
const matcha: Section = {
  id: 'matcha', title: 'Matcha Selection', jp: '抹茶セレクション',
  items: [
    { id: 'salted-vanilla-cloud-matcha', name: 'Salted Vanilla Cloud Matcha', desc: 'Vanilla, matcha, fresh milk, sugar, cream', price: 39, k: 'drink matcha creamy sweet signature cloud' },
    { id: 'kinako-matcha', name: 'Kinako Matcha', desc: 'Kinako, oat milk, sugar, cream', price: 39, k: 'drink matcha creamy nutty' },
    { id: 'dark-chocolate-matcha', name: 'Dark Chocolate Matcha', desc: 'Dark chocolate, vanilla, fresh milk', price: 39, k: 'drink matcha chocolate sweet creamy' },
    { id: 'strawberry-cloud-matcha', name: 'Strawberry Cloud Matcha', desc: 'Strawberry syrup, cream, fresh milk & matcha', price: 41, k: 'drink matcha fruity sweet creamy cloud' },
    { id: 'mango-cloud-matcha', name: 'Mango Cloud Matcha', desc: 'Mango puree, fresh milk cream & matcha', price: 41, k: 'drink matcha fruity sweet creamy cloud' },
    { id: 'coconut-cloud-matcha', name: 'Coconut Cloud Matcha', desc: 'Matcha tea, coconut water', price: 39, k: 'drink matcha light refreshing cold cloud' },
    { id: 'matcha-latte', name: 'Matcha Latte', desc: 'Matcha tea, milk', price: 35, k: 'drink matcha classic creamy' },
  ],
};
const coffee: Section = {
  id: 'coffee', title: 'Coffee Selection', jp: 'コーヒーセレクション',
  items: [
    { id: 'espresso', name: 'Espresso', price: 17, k: 'drink coffee strong hot' },
    { id: 'espresso-macchiato', name: 'Espresso Macchiato', price: 18, k: 'drink coffee strong hot' },
    { id: 'cortado', name: 'Cortado', price: 20, k: 'drink coffee hot milk' },
    { id: 'piccolo', name: 'Piccolo', price: 19, k: 'drink coffee hot milk' },
    { id: 'flat-white', name: 'Flat White', price: 25, k: 'drink coffee hot milk creamy' },
    { id: 'cappuccino', name: 'Cappuccino', price: 25, k: 'drink coffee hot milk creamy' },
    { id: 'latte', name: 'Latte', price: 25, k: 'drink coffee milk creamy' },
    { id: 'spanish-latte', name: 'Spanish Latte', price: 25, k: 'drink coffee milk sweet creamy' },
    { id: 'americano', name: 'Americano', price: 18, k: 'drink coffee strong' },
    { id: 'v60', name: 'V60', price: 33, k: 'drink coffee filter slow pour-over' },
  ],
};
const tea: Section = {
  id: 'tea', title: 'Tea Selection', jp: '茶のセレクション',
  items: [
    { id: 'lemon-black-tea', name: 'Lemon Black Tea', price: 33, k: 'drink tea citrus' },
    { id: 'strawberry-sencha', name: 'Strawberry Sencha Tea', price: 33, k: 'drink tea fruity green' },
    { id: 'japanese-earl-grey', name: 'Japanese Earl Grey Tea', price: 33, k: 'drink tea' },
    { id: 'fukamushi-sencha', name: 'Fukamushi Sencha Tea', price: 33, k: 'drink tea green' },
  ],
};
const water: Section = {
  id: 'water', title: 'Water & Soft Drinks', jp: '水',
  items: [
    { id: 'fiji-small', name: 'Fiji Still (small)', price: 16, k: 'drink water' },
    { id: 'fiji-large', name: 'Fiji Still (large)', price: 25, k: 'drink water' },
    { id: 'pellegrino', name: 'San Pellegrino Sparkling (small)', price: 18, k: 'drink water sparkling' },
    { id: 'ginger-ale', name: 'Ginger Ale', price: 21, k: 'drink soda cold' },
    { id: 'soft-drinks', name: 'Soft Drinks', desc: 'Coke, Coke Zero / Light, Fanta, Sprite', price: 21, k: 'drink soda cold' },
  ],
};
const eggSando: Section = {
  id: 'egg-sando', title: 'Egg Sando', jp: 'たまごサンド',
  items: [
    { id: 'kumo-egg-sando', name: 'Kumo Egg Sando', desc: 'Japanese milk bread layered with Mornay sauce and Japanese-style eggs', price: 47, k: 'breakfast egg sandwich creamy comfort signature' },
    { id: 'japanese-egg-sando', name: 'Japanese Egg Sando', desc: 'Japanese milk bread layered with sesame furikake and Japanese-style eggs', price: 47, k: 'breakfast egg sandwich comfort' },
    { id: 'avocado-sando', name: 'Avocado Sando', desc: 'Hokkaido milk bread, smashed avocado, Japanese-style eggs', price: 49, k: 'breakfast egg sandwich avocado fresh' },
  ],
};
const morningDessert: Section = {
  id: 'morning-dessert', title: 'Morning Dessert', jp: '朝スイーツ',
  items: [
    { id: 'honey-toast', name: 'Honey Toast', desc: 'Hokkaido milk bread topped with honey and butter', price: 47, k: 'breakfast sweet toast warm comfort' },
    { id: 'crispy-croissant', name: 'Crispy Croissant', desc: 'Fresh-baked croissant with honey butter, honeycomb, coffee', price: 45, k: 'breakfast sweet pastry warm buttery' },
    { id: 'miso-butter-pancakes', name: 'Miso Butter Pancakes', desc: 'Japanese pancake with miso honey butter', price: 55, k: 'breakfast sweet pancake warm comfort fluffy' },
  ],
};

export const menus: Record<'main' | 'cafe', { chapters: Chapter[] }> = {
  main: {
    chapters: [
      { id: 'starters', title: 'Starters', jp: '前菜', sections: [raw, salads, hotStarters] },
      { id: 'sushi', title: 'Sushi Bar', jp: '寿司処', sections: [nigiri, handrolls, maki] },
      { id: 'robata', title: 'Robata', jp: '炉端', sections: [buns, robata, sides, ricePots] },
      { id: 'dezato', title: 'Dezāto', jp: 'デザート', sections: [desserts] },
      { id: 'matcha-bar', title: 'Matcha Bar', jp: '抹茶処', sections: [mocktails, matcha, coffee, tea, water] },
    ],
  },
  cafe: {
    chapters: [
      { id: 'cafe-kumo', title: 'Café Kumo', jp: '喫茶雲', sections: [eggSando, morningDessert] },
      { id: 'cafe-matcha-bar', title: 'Matcha Bar', jp: '抹茶処', sections: [matcha, coffee, tea, water] },
    ],
  },
};

/** Every unique item with the menu(s) it belongs to. Used by search and the Mood Finder. */
export function allItems() {
  const seen = new Map<string, Item & { section: string; sectionJp: string; menus: ('main' | 'cafe')[] }>();
  for (const key of ['main', 'cafe'] as const) {
    for (const ch of menus[key].chapters) {
      for (const s of ch.sections) {
        for (const it of s.items) {
          const prev = seen.get(it.id);
          if (prev) {
            if (!prev.menus.includes(key)) prev.menus.push(key);
          } else seen.set(it.id, { ...it, section: s.id, sectionJp: s.jp, menus: [key] });
        }
      }
    }
  }
  return [...seen.values()];
}
