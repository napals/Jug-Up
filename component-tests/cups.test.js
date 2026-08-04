import AsyncStorage from '@react-native-async-storage/async-storage';
import { addCup, DEFAULT_CUPS, deleteCup, getCups, updateCup } from '../src/utils/cups';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

beforeEach(async () => {
  await AsyncStorage.clear();
});

test('adding the first custom cup keeps the default cups instead of replacing them', async () => {
  const before = await getCups();
  expect(before).toEqual(DEFAULT_CUPS);

  const after = await addCup({ name: 'Travel Mug', amountMl: 400, color: DEFAULT_CUPS[0].color, emoji: '☕' });

  expect(after).toHaveLength(DEFAULT_CUPS.length + 1);
  for (const defaultCup of DEFAULT_CUPS) {
    expect(after.find((cup) => cup.id === defaultCup.id)).toMatchObject({
      name: defaultCup.name,
      amountMl: defaultCup.amountMl,
    });
  }
  expect(after.find((cup) => cup.name === 'Travel Mug')).toMatchObject({ amountMl: 400 });
});

test('adding a second custom cup keeps everything already saved', async () => {
  await addCup({ name: 'Travel Mug', amountMl: 400, color: DEFAULT_CUPS[0].color, emoji: '☕' });
  const after = await addCup({ name: 'Big Bottle', amountMl: 1000, color: DEFAULT_CUPS[0].color, emoji: '🍾' });

  expect(after).toHaveLength(DEFAULT_CUPS.length + 2);
  expect(after.find((cup) => cup.name === 'Travel Mug')).toBeDefined();
  expect(after.find((cup) => cup.name === 'Big Bottle')).toBeDefined();
});

test('editing a default cup keeps the other defaults intact', async () => {
  const target = DEFAULT_CUPS[0];
  const after = await updateCup(target.id, { name: 'My Small Glass', amountMl: 180, color: target.color, emoji: target.emoji });

  expect(after).toHaveLength(DEFAULT_CUPS.length);
  expect(after.find((cup) => cup.id === target.id)).toMatchObject({ name: 'My Small Glass', amountMl: 180 });
  for (const defaultCup of DEFAULT_CUPS.slice(1)) {
    expect(after.find((cup) => cup.id === defaultCup.id)).toMatchObject({ name: defaultCup.name });
  }
});

test('deleting a default cup keeps the remaining defaults', async () => {
  const target = DEFAULT_CUPS[0];
  const after = await deleteCup(target.id);

  expect(after).toHaveLength(DEFAULT_CUPS.length - 1);
  expect(after.find((cup) => cup.id === target.id)).toBeUndefined();
  for (const defaultCup of DEFAULT_CUPS.slice(1)) {
    expect(after.find((cup) => cup.id === defaultCup.id)).toBeDefined();
  }
});
