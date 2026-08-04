// Hydration ratios below are drawn from real research, not folk wisdom —
// most notably Maughan et al.'s Beverage Hydration Index trial (a
// randomized controlled trial, American Journal of Clinical Nutrition,
// 2016), cross-checked against independent studies on caffeine (Killer et
// al., PLOS ONE 2014; a 2017 dose-response trial; a 2003 systematic review)
// and alcohol (two independent randomized crossover trials comparing
// alcoholic beverages against matched non-alcoholic controls).
//
// The headline, counter-intuitive finding: tea, coffee, soda, juice, and
// standard-strength beer all showed no statistically meaningful hydration
// difference from plain water in controlled trials — the "coffee
// dehydrates you" and "beer barely counts" assumptions built into most
// competing apps aren't well supported. Milk and oral-rehydration-style
// drinks measurably outperform water, thanks to their electrolyte content.
// Wine and spirits are the beverages with genuinely confirmed reductions,
// scaling with alcohol concentration.
//
// A ratio only ever adjusts how much of a logged volume counts toward the
// daily goal — the raw amountMl a person actually drank is always stored
// and displayed unchanged.
export const DRINK_TYPES = [
  { id: 'water', label: 'Water', emoji: '💧', ratio: 1.0 },
  { id: 'sparkling', label: 'Sparkling water', emoji: '🫧', ratio: 1.0 },
  { id: 'tea', label: 'Tea', emoji: '🍵', ratio: 1.0 },
  { id: 'coffee', label: 'Coffee', emoji: '☕', ratio: 1.0 },
  { id: 'soda', label: 'Soda', emoji: '🥤', ratio: 1.0 },
  { id: 'juice', label: 'Juice', emoji: '🧃', ratio: 1.0 },
  { id: 'sports', label: 'Sports drink', emoji: '🏃', ratio: 1.0 },
  { id: 'milk', label: 'Milk', emoji: '🥛', ratio: 1.4 },
  { id: 'energy', label: 'Energy drink', emoji: '⚡', ratio: 0.9 },
  { id: 'beer', label: 'Beer', emoji: '🍺', ratio: 0.95 },
  { id: 'wine', label: 'Wine', emoji: '🍷', ratio: 0.8 },
  { id: 'spirits', label: 'Spirits', emoji: '🥃', ratio: 0.6 },
];

const RATIO_BY_ID = Object.fromEntries(DRINK_TYPES.map((d) => [d.id, d.ratio]));
const VALID_IDS = new Set(DRINK_TYPES.map((d) => d.id));

export function isValidDrinkType(id) {
  return VALID_IDS.has(id);
}

export function ratioForDrinkType(id) {
  return RATIO_BY_ID[id] ?? 1.0;
}

// The ratio-adjusted contribution of a logged entry toward the daily goal.
// Always derived at read time from the entry's own drinkType, so retuning a
// ratio later automatically applies to every existing entry — nothing gets
// baked in and stale.
export function effectiveMlForEntry(entry) {
  const ratio = ratioForDrinkType(entry?.drinkType);
  return Math.round((entry?.amountMl || 0) * ratio);
}

// Open Food Facts returns category tags like "en:beers", "en:energy-drinks",
// "en:coffees" on most scanned products. This maps those onto our own drink
// types so a scanned can of beer or energy drink can suggest the right
// hydration ratio automatically, instead of always defaulting to water.
// Order matters — more specific categories are checked before broader ones
// (e.g. "spirits" before generic "alcoholic-beverages").
const CATEGORY_MATCHERS = [
  { id: 'spirits', patterns: ['spirit', 'whisky', 'whiskey', 'vodka', 'rum', 'gin', 'liquor', 'tequila', 'brandy'] },
  { id: 'wine', patterns: ['wine', 'champagne', 'prosecco'] },
  { id: 'beer', patterns: ['beer', 'lager', 'cider', 'ale'] },
  { id: 'energy', patterns: ['energy-drink', 'energy drink'] },
  { id: 'sports', patterns: ['sport', 'isotonic'] },
  { id: 'coffee', patterns: ['coffee'] },
  { id: 'tea', patterns: ['tea', 'iced-tea'] },
  { id: 'milk', patterns: ['milk', 'dairy-drink'] },
  { id: 'juice', patterns: ['juice', 'nectar', 'smoothie'] },
  { id: 'soda', patterns: ['soda', 'cola', 'carbonated-drink', 'fizzy-drink'] },
  { id: 'sparkling', patterns: ['sparkling-water', 'mineral-water', 'sparkling water'] },
];

export function guessDrinkTypeFromCategories(categoriesTags) {
  if (!Array.isArray(categoriesTags) || !categoriesTags.length) return null;
  const haystack = categoriesTags.join(' ').toLowerCase();
  for (const matcher of CATEGORY_MATCHERS) {
    if (matcher.patterns.some((pattern) => haystack.includes(pattern))) return matcher.id;
  }
  return null;
}
