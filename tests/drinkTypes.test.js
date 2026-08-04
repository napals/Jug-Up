import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DRINK_TYPES,
  effectiveMlForEntry,
  guessDrinkTypeFromCategories,
  isValidDrinkType,
  ratioForDrinkType,
} from '../src/constants/drinkTypes.js';

test('every drink type has a valid id, label, emoji, and ratio', () => {
  assert.ok(DRINK_TYPES.length >= 10);
  for (const d of DRINK_TYPES) {
    assert.equal(typeof d.id, 'string');
    assert.equal(typeof d.label, 'string');
    assert.equal(typeof d.emoji, 'string');
    assert.equal(typeof d.ratio, 'number');
    assert.ok(d.ratio > 0 && d.ratio <= 2);
  }
});

test('water and other research-confirmed 1.0 drinks count fully toward the goal', () => {
  for (const id of ['water', 'sparkling', 'tea', 'coffee', 'soda', 'juice', 'sports']) {
    assert.equal(ratioForDrinkType(id), 1.0);
  }
});

test('milk counts as more than its raw volume, alcohol counts as less', () => {
  assert.ok(ratioForDrinkType('milk') > 1.0);
  assert.ok(ratioForDrinkType('beer') < 1.0);
  assert.ok(ratioForDrinkType('wine') < ratioForDrinkType('beer'));
  assert.ok(ratioForDrinkType('spirits') < ratioForDrinkType('wine'));
});

test('unknown or missing drink type falls back to the water ratio, never breaks', () => {
  assert.equal(ratioForDrinkType('made-up-drink'), 1.0);
  assert.equal(ratioForDrinkType(undefined), 1.0);
  assert.equal(isValidDrinkType('made-up-drink'), false);
  assert.equal(isValidDrinkType('coffee'), true);
});

test('effectiveMlForEntry applies the ratio to the raw logged amount', () => {
  assert.equal(effectiveMlForEntry({ amountMl: 250, drinkType: 'water' }), 250);
  assert.equal(effectiveMlForEntry({ amountMl: 250, drinkType: 'milk' }), 350); // 250 * 1.4
  assert.equal(effectiveMlForEntry({ amountMl: 500, drinkType: 'spirits' }), 300); // 500 * 0.6
  // an entry with no drinkType at all (legacy data) must still work, defaulting to water
  assert.equal(effectiveMlForEntry({ amountMl: 200 }), 200);
});

test('guessDrinkTypeFromCategories recognises common Open Food Facts category tags', () => {
  assert.equal(guessDrinkTypeFromCategories(['en:beverages', 'en:beers', 'en:lagers']), 'beer');
  assert.equal(guessDrinkTypeFromCategories(['en:energy-drinks']), 'energy');
  assert.equal(guessDrinkTypeFromCategories(['en:beverages', 'en:hot-beverages', 'en:coffees']), 'coffee');
  assert.equal(guessDrinkTypeFromCategories(['en:alcoholic-beverages', 'en:spirits', 'en:whiskies']), 'spirits');
  assert.equal(guessDrinkTypeFromCategories(['en:wines', 'en:red-wines']), 'wine');
  assert.equal(guessDrinkTypeFromCategories(['en:sodas', 'en:colas']), 'soda');
  assert.equal(guessDrinkTypeFromCategories(['en:dairy-drinks', 'en:milks']), 'milk');
});

test('guessDrinkTypeFromCategories returns null when nothing matches or no tags exist, never breaks', () => {
  assert.equal(guessDrinkTypeFromCategories(['en:snacks', 'en:biscuits']), null);
  assert.equal(guessDrinkTypeFromCategories([]), null);
  assert.equal(guessDrinkTypeFromCategories(undefined), null);
  assert.equal(guessDrinkTypeFromCategories(null), null);
});
