import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ALT_BACKGROUND_THEME_ORDER,
  getCompletedAchievementIds,
  getUnlockedAltThemeIds,
  isAltBackgroundUnlocked,
  markAchievementCompleted,
} from '../src/utils/achievementUnlocks';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

beforeEach(async () => {
  await AsyncStorage.clear();
});

test('no achievements completed means no alt backgrounds unlocked', async () => {
  const ids = await getCompletedAchievementIds();
  expect(ids).toEqual([]);
  expect(getUnlockedAltThemeIds(0)).toEqual([]);
  expect(isAltBackgroundUnlocked('spring', 0)).toBe(false);
});

test('completing achievements unlocks alt backgrounds in the fixed order, one at a time', async () => {
  await markAchievementCompleted('reset7');
  let ids = await getCompletedAchievementIds();
  expect(ids).toEqual(['reset7']);
  expect(getUnlockedAltThemeIds(ids.length)).toEqual(['spring']);
  expect(isAltBackgroundUnlocked('spring', ids.length)).toBe(true);
  expect(isAltBackgroundUnlocked('summer', ids.length)).toBe(false);

  await markAchievementCompleted('workweek');
  ids = await getCompletedAchievementIds();
  expect(ids).toEqual(['reset7', 'workweek']);
  expect(getUnlockedAltThemeIds(ids.length)).toEqual(['spring', 'summer']);
});

test('marking the same achievement complete twice does not duplicate it or skip an unlock', async () => {
  await markAchievementCompleted('reset7');
  await markAchievementCompleted('reset7');
  const ids = await getCompletedAchievementIds();
  expect(ids).toEqual(['reset7']);
  expect(getUnlockedAltThemeIds(ids.length)).toEqual(['spring']);
});

test('unlock count never exceeds the number of real themed banners, even with more achievements than themes', () => {
  expect(getUnlockedAltThemeIds(999)).toEqual(ALT_BACKGROUND_THEME_ORDER);
  expect(getUnlockedAltThemeIds(999)).toHaveLength(10);
});

test('completion is permanent — persists across separate reads', async () => {
  await markAchievementCompleted('century');
  const firstRead = await getCompletedAchievementIds();
  const secondRead = await getCompletedAchievementIds();
  expect(firstRead).toEqual(secondRead);
  expect(firstRead).toEqual(['century']);
});