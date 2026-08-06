import AsyncStorage from '@react-native-async-storage/async-storage';

const COMPLETED_KEY = 'hydrate:completedAchievements';

// Fixed progression order for alt-background unlocks — matches the 10 real
// banner scenes in ThemeWaterScene.js (standard/midnight have no banner at
// all, so they're not part of this track). One theme's alt background
// unlocks per achievement completed, in this order, regardless of which
// specific achievement it was — deliberately not tied to individual
// achievements, since there's no natural thematic link between e.g. "Scan
// Squad" and "Halloween".
export const ALT_BACKGROUND_THEME_ORDER = [
  'spring', 'summer', 'autumn', 'winter', 'halloween',
  'christmas', 'newyear', 'valentine', 'birthday', 'champion',
];

function safeParseIds(raw) {
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch (_error) {
    return [];
  }
}

export async function getCompletedAchievementIds() {
  try {
    const raw = await AsyncStorage.getItem(COMPLETED_KEY);
    return safeParseIds(raw);
  } catch (_error) {
    return [];
  }
}

// Once an achievement is completed it stays completed permanently, even if
// later data changes would make the live calculation say otherwise (e.g.
// editing old entries) — this is a one-way record, not a live recheck.
export async function markAchievementCompleted(id) {
  if (typeof id !== 'string' || !id) return getCompletedAchievementIds();
  const current = await getCompletedAchievementIds();
  if (current.includes(id)) return current;
  const updated = [...current, id];
  try {
    await AsyncStorage.setItem(COMPLETED_KEY, JSON.stringify(updated));
  } catch (_error) {
    // storage write failed silently — the in-memory list still reflects
    // this session accurately, next successful write will catch up
  }
  return updated;
}

export function getUnlockedAltThemeIds(completedCount) {
  const count = Math.max(0, Math.min(completedCount || 0, ALT_BACKGROUND_THEME_ORDER.length));
  return ALT_BACKGROUND_THEME_ORDER.slice(0, count);
}

export function isAltBackgroundUnlocked(themeId, completedCount) {
  return getUnlockedAltThemeIds(completedCount).includes(themeId);
}