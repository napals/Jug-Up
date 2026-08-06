import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays,
  computeDynamicReminderPlan,
  computeReminderHours,
  countConsecutiveGoals,
  createGoalSnapshot,
  dateKey,
  heatMessage,
  normaliseGoalMl,
  normalisePositiveMl,
  parseVolumeToMl,
  recommendExtraMl,
  timestampForDateAndTime,
  validateReminderSettings,
} from '../src/utils/core.js';
import { progressMessage } from '../src/constants/theme.js';

test('parses common package volumes', () => {
  assert.equal(parseVolumeToMl('500 ml'), 500);
  assert.equal(parseVolumeToMl('1.5L'), 1500);
  assert.equal(parseVolumeToMl('33 cl'), 330);
  assert.equal(parseVolumeToMl('0 ml'), null);
  assert.equal(parseVolumeToMl('two litres'), null);
});

test('validates hydration amounts and goals', () => {
  assert.equal(normaliseGoalMl('2500'), 2500);
  assert.equal(normaliseGoalMl('100'), 2000);
  assert.equal(normalisePositiveMl('500', null, 1, 5000), 500);
  assert.equal(normalisePositiveMl('6000', null, 1, 5000), null);
});

test('creates a weather-adjusted daily target', () => {
  assert.deepEqual(createGoalSnapshot(2000, 700), {
    baseGoalMl: 2000,
    extraMl: 700,
    targetMl: 2700,
  });
  assert.equal(recommendExtraMl(24.9), 0);
  assert.equal(recommendExtraMl(25), 400);
  assert.equal(recommendExtraMl(30), 700);
  assert.equal(recommendExtraMl(35), 1000);
  assert.match(heatMessage(30), /Heatwave/);
});

test('counts streaks against each date-specific target', () => {
  assert.equal(countConsecutiveGoals([
    { totalMl: 3000, goalMl: 3000 },
    { totalMl: 2100, goalMl: 2000 },
    { totalMl: 1900, goalMl: 2000 },
  ]), 2);

  // An unfinished today does not erase the completed streak through yesterday.
  assert.equal(countConsecutiveGoals([
    { totalMl: 500, goalMl: 3000 },
    { totalMl: 2100, goalMl: 2000 },
    { totalMl: 2000, goalMl: 2000 },
  ]), 2);
});

test('validates and computes reminder hours', () => {
  const valid = validateReminderSettings({ enabled: true, intervalHours: 3, startHour: 8, endHour: 20 });
  assert.equal(valid.valid, true);
  assert.deepEqual(computeReminderHours(valid.settings), [8, 11, 14, 17, 20]);
  assert.equal(validateReminderSettings({ intervalHours: 0, startHour: 8, endHour: 20 }).valid, false);
  assert.equal(validateReminderSettings({ intervalHours: 2, startHour: 20, endHour: 8 }).valid, false);
});

test('reminder interval supports half-hour steps, not just whole hours', () => {
  const half = validateReminderSettings({ enabled: true, intervalHours: 1.5, startHour: 8, endHour: 12 });
  assert.equal(half.valid, true);
  assert.equal(half.settings.intervalHours, 1.5);
  assert.deepEqual(computeReminderHours(half.settings), [8, 9.5, 11]);

  // the smallest allowed step is 0.5 hours
  const min = validateReminderSettings({ enabled: true, intervalHours: 0.5, startHour: 8, endHour: 9 });
  assert.equal(min.valid, true);
  assert.deepEqual(computeReminderHours(min.settings), [8, 8.5, 9]);

  // below 0.5 is still rejected (0.2 rounds down to 0, not up to 0.5)
  assert.equal(validateReminderSettings({ intervalHours: 0.2, startHour: 8, endHour: 20 }).valid, false);

  // stray decimal input rounds to the nearest half hour rather than failing
  const rounded = validateReminderSettings({ enabled: true, intervalHours: 1.7, startHour: 8, endHour: 20 });
  assert.equal(rounded.valid, true);
  assert.equal(rounded.settings.intervalHours, 1.5);
});

test('handles date boundaries and progress copy', () => {
  assert.equal(addDays('2026-01-01', -1), '2025-12-31');
  assert.match(dateKey(new Date('2026-07-14T12:00:00')), /^2026-07-14$/);
  assert.match(progressMessage(100), /Goal smashed/);
  assert.match(progressMessage(50), /Halfway/);
});


test('builds smart reminders from the remaining volume', () => {
  const plan = computeDynamicReminderPlan({
    now: new Date('2026-07-14T08:00:00'),
    totalMl: 500,
    goalMl: 2000,
    settings: {
      enabled: true,
      dynamic: true,
      intervalHours: 2,
      startHour: 8,
      endHour: 20,
      servingMl: 300,
    },
  });

  assert.equal(plan.length, 5);
  // remainingMl is the same true figure across every prompt — it must never
  // decrease within a batch, since that would silently assume each earlier
  // suggested serving actually got drunk, which a local notification has no
  // way to verify at the moment it fires. suggestedMl correctly rises across
  // the batch instead: same true total, paced across fewer remaining slots.
  assert.deepEqual(plan.map((item) => item.remainingMl), [1500, 1500, 1500, 1500, 1500]);
  assert.deepEqual(plan.map((item) => item.suggestedMl), [300, 380, 500, 750, 1500]);
  assert.equal(plan[0].fireDate.getHours(), 10);
  assert.equal(plan.at(-1).fireDate.getHours(), 20);

  assert.deepEqual(computeDynamicReminderPlan({
    now: new Date('2026-07-14T08:00:00'),
    totalMl: 2000,
    goalMl: 2000,
    settings: { enabled: true, intervalHours: 2, startHour: 8, endHour: 20, servingMl: 300 },
  }), []);
});

test('creates a local timestamp for backdated history edits', () => {
  const timestamp = timestampForDateAndTime('2026-07-10', '09:35');
  assert.ok(timestamp instanceof Date);
  assert.equal(dateKey(timestamp), '2026-07-10');
  assert.equal(timestamp.getHours(), 9);
  assert.equal(timestamp.getMinutes(), 35);
  assert.equal(timestampForDateAndTime('2026-07-10', '25:00'), null);
  assert.equal(timestampForDateAndTime('not-a-date', '09:00'), null);
  assert.equal(timestampForDateAndTime('2026-02-31', '09:00'), null);
});

import { seasonalThemeId, resolveThemeId } from '../src/constants/themes.js';

test('resolves holiday and seasonal premium themes', () => {
  assert.equal(seasonalThemeId(new Date('2026-10-20T12:00:00'), '', () => true), 'halloween');
  assert.equal(seasonalThemeId(new Date('2026-12-20T12:00:00'), '', () => true), 'christmas');
  assert.equal(seasonalThemeId(new Date('2026-07-14T12:00:00'), '', () => true), 'summer');
  assert.equal(resolveThemeId({ selected: 'christmas', hasAccess: () => false }), 'standard');
  assert.equal(resolveThemeId({ selected: 'christmas', hasAccess: () => true }), 'christmas');
});

test('birthday and champion themes observe their unlock rules', () => {
  assert.equal(seasonalThemeId(new Date('2026-05-24T12:00:00'), '1990-05-24', () => true), 'birthday');
  assert.notEqual(resolveThemeId({ selected: 'champion', date: new Date('2026-05-24T12:00:00'), hasAccess: () => true, streak: 12 }), 'champion');
  assert.equal(resolveThemeId({ selected: 'champion', date: new Date('2026-05-24T12:00:00'), hasAccess: () => true, streak: 30 }), 'champion');
});