import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  dateKey,
  getAllEntries,
  getGoalForDate,
  getDaySummary,
  getHistoryDaySummaries,
  getInstallDateKey,
  logEntry,
  setDailyGoal,
  setGoalAdjustmentForDate,
  updateEntry,
} from '../src/utils/storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

beforeEach(async () => {
  await AsyncStorage.clear();
});

test('corrupt entry JSON is treated as an empty list', async () => {
  await AsyncStorage.setItem('hydrate:entries', '{broken json');
  await expect(getAllEntries()).resolves.toEqual([]);
});

test('changing the current goal preserves a past date target', async () => {
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = dateKey(yesterdayDate);

  await setDailyGoal(2000);
  await getGoalForDate(yesterday);
  await setDailyGoal(3000);

  await expect(getGoalForDate(yesterday)).resolves.toEqual({
    baseGoalMl: 2000,
    extraMl: 0,
    targetMl: 2000,
  });
});

test('weather adjustment is persisted in the date-specific target', async () => {
  await setDailyGoal(2000);
  await setGoalAdjustmentForDate(dateKey(), 700);
  await expect(getGoalForDate(dateKey())).resolves.toEqual({
    baseGoalMl: 2000,
    extraMl: 700,
    targetMl: 2700,
  });
});


test('stores the exact vessel snapshot and supports a backdated edit', async () => {
  const timestamp = new Date();
  timestamp.setDate(timestamp.getDate() - 2);
  timestamp.setHours(9, 30, 0, 0);
  const key = dateKey(timestamp);

  const entry = await logEntry(500, {
    vesselName: 'Gym bottle',
    vesselType: 'bottle',
    emoji: '🍶',
    color: '#0B5ED7',
    source: 'cup',
  }, timestamp);

  await expect(getDaySummary(key)).resolves.toMatchObject({
    totalMl: 500,
    drinkCount: 1,
    entries: [expect.objectContaining({
      id: entry.id,
      vesselName: 'Gym bottle',
      vesselType: 'bottle',
      amountMl: 500,
    })],
  });

  await updateEntry(entry.id, {
    amountMl: 750,
    vesselName: 'Large gym bottle',
    timestamp,
  });

  await expect(getDaySummary(key)).resolves.toMatchObject({
    totalMl: 750,
    drinkCount: 1,
    entries: [expect.objectContaining({
      vesselName: 'Large gym bottle',
      amountMl: 750,
    })],
  });
});

test('legacy entries infer the old default vessel when possible', async () => {
  const timestamp = new Date();
  timestamp.setDate(timestamp.getDate() - 1);
  await AsyncStorage.setItem('hydrate:entries', JSON.stringify([{
    id: 'legacy-500',
    amountMl: 500,
    timestamp: timestamp.toISOString(),
  }]));

  await expect(getAllEntries()).resolves.toEqual([
    expect.objectContaining({
      vesselName: 'Bottle',
      vesselType: 'bottle',
      source: 'legacy',
    }),
  ]);
});


test('history includes an older recorded day beyond the recent empty window', async () => {
  const oldDate = new Date();
  oldDate.setDate(oldDate.getDate() - 30);
  oldDate.setHours(10, 0, 0, 0);
  const oldKey = dateKey(oldDate);
  await logEntry(350, { vesselName: 'Office mug', vesselType: 'mug', emoji: '☕', source: 'history' }, oldDate);

  const history = await getHistoryDaySummaries(14);
  expect(history.find((day) => day.dateKey === oldKey)).toMatchObject({
    totalMl: 350,
    drinkCount: 1,
    entries: [expect.objectContaining({ vesselName: 'Office mug' })],
  });
});

test('empty placeholder days never reach further back than the install date', async () => {
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  await AsyncStorage.setItem('hydrate:installDate', dateKey(threeDaysAgo));

  const history = await getHistoryDaySummaries(14);
  const fiveDaysAgo = new Date();
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
  expect(history.find((day) => day.dateKey === dateKey(fiveDaysAgo))).toBeUndefined();
  expect(history.find((day) => day.dateKey === dateKey(threeDaysAgo))).toBeDefined();
  await expect(getInstallDateKey()).resolves.toEqual(dateKey(threeDaysAgo));
});

test('a real logged entry still shows even if somehow dated before the stored install date', async () => {
  const sixDaysAgo = new Date();
  sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
  sixDaysAgo.setHours(9, 0, 0, 0);
  await AsyncStorage.setItem('hydrate:installDate', dateKey(new Date()));
  await logEntry(200, { vesselName: 'Backfilled', vesselType: 'cup', emoji: '🥤', source: 'history' }, sixDaysAgo);

  const history = await getHistoryDaySummaries(14);
  expect(history.find((day) => day.dateKey === dateKey(sixDaysAgo))).toMatchObject({ totalMl: 200 });
});
