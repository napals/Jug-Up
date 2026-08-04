import AsyncStorage from '@react-native-async-storage/async-storage';
import { GLASS_SIZE_ML } from '../constants/theme';
import { effectiveMlForEntry, isValidDrinkType } from '../constants/drinkTypes';
import {
  addDays,
  createGoalSnapshot,
  dateKey,
  DEFAULT_GOAL_ML,
  ENTRY_MAX_ML,
  ENTRY_MIN_ML,
  MAX_GOAL_ML,
  MIN_GOAL_ML,
  normaliseGoalMl,
  normalisePositiveMl,
  timestampForDateAndTime,
} from './core';

export {
  addDays,
  dateKey,
  DEFAULT_GOAL_ML,
  ENTRY_MAX_ML,
  ENTRY_MIN_ML,
  MAX_GOAL_ML,
  MIN_GOAL_ML,
  normaliseGoalMl,
  normalisePositiveMl,
  timestampForDateAndTime,
} from './core';

const ENTRIES_KEY = 'hydrate:entries';
const GOAL_KEY = 'hydrate:dailyGoalMl';
const GOAL_HISTORY_KEY = 'hydrate:goalHistory:v2';
const INSTALL_DATE_KEY = 'hydrate:installDate';
const DEFAULT_ENTRY_COLOR = '#1E90FF';const VALID_SOURCES = new Set(['cup', 'barcode', 'manual', 'history', 'legacy']);
const VALID_VESSEL_TYPES = new Set(['glass', 'bottle', 'mug', 'cup', 'other']);

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function safeParseJson(raw, fallback) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch (_error) {
    return fallback;
  }
}

async function safeGetItem(key) {
  try {
    return await AsyncStorage.getItem(key);
  } catch (_error) {
    return null;
  }
}

async function safeSetItem(key, value) {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (error) {
    throw new Error(`Could not save local data for ${key}: ${error.message}`);
  }
}

function safeText(value, fallback, maxLength = 80) {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : fallback;
}

function safeColor(value) {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)
    ? value.toUpperCase()
    : DEFAULT_ENTRY_COLOR;
}

function inferVesselType(name, source) {
  const lowerName = String(name || '').toLowerCase();
  if (source === 'barcode' || lowerName.includes('bottle')) return 'bottle';
  if (lowerName.includes('mug')) return 'mug';
  if (lowerName.includes('glass')) return 'glass';
  if (lowerName.includes('cup')) return 'cup';
  return 'other';
}

function sanitiseEntryDetails(details = {}, amountMl) {
  const source = VALID_SOURCES.has(details.source) ? details.source : 'manual';
  const defaultName = source === 'barcode' ? 'Scanned bottle' : `Water (${amountMl}ml)`;
  const vesselName = safeText(details.vesselName ?? details.name, defaultName, 80);
  const vesselType = VALID_VESSEL_TYPES.has(details.vesselType)
    ? details.vesselType
    : inferVesselType(vesselName, source);
  return {
    vesselName,
    vesselType,
    emoji: safeText(details.emoji, vesselType === 'bottle' ? '🍶' : '🥤', 8),
    color: safeColor(details.color),
    source,
    barcode: safeText(details.barcode, '', 40),
    drinkType: isValidDrinkType(details.drinkType) ? details.drinkType : 'water',
  };
}


function legacyVesselDetails(amountMl) {
  const known = {
    150: { vesselName: 'Small glass', vesselType: 'glass', emoji: '🥃', color: '#60A5FA' },
    250: { vesselName: 'Glass', vesselType: 'glass', emoji: '🥤', color: '#1E90FF' },
    350: { vesselName: 'Mug', vesselType: 'mug', emoji: '☕', color: '#0B5ED7' },
    500: { vesselName: 'Bottle', vesselType: 'bottle', emoji: '🍶', color: '#0B2545' },
  };
  return known[amountMl] || {
    vesselName: `Water (${amountMl}ml)`,
    vesselType: 'other',
    emoji: '🥤',
    color: DEFAULT_ENTRY_COLOR,
  };
}

function sanitiseEntry(entry) {
  if (!isPlainObject(entry)) return null;
  const amountMl = normalisePositiveMl(entry.amountMl);
  const timestamp = new Date(entry.timestamp);
  if (!amountMl || Number.isNaN(timestamp.getTime())) return null;
  const legacy = legacyVesselDetails(amountMl);
  return {
    id: typeof entry.id === 'string' && entry.id ? entry.id : `${timestamp.getTime()}-${amountMl}`,
    amountMl,
    timestamp: timestamp.toISOString(),
    ...sanitiseEntryDetails(
      {
        ...legacy,
        ...entry,
        source: entry.source || 'legacy',
        vesselName: entry.vesselName || entry.name || legacy.vesselName,
      },
      amountMl
    ),
  };
}

// ---- entries ----
export async function getAllEntries() {
  const parsed = safeParseJson(await safeGetItem(ENTRIES_KEY), []);
  if (!Array.isArray(parsed)) return [];
  return parsed.map(sanitiseEntry).filter(Boolean);
}

export async function logEntry(amountMl, details = {}, timestamp = new Date()) {
  const validAmount = normalisePositiveMl(amountMl);
  if (!validAmount) throw new Error('Water amount must be between 1ml and 20,000ml.');

  const validTimestamp = new Date(timestamp);
  if (Number.isNaN(validTimestamp.getTime())) throw new Error('Drink time is invalid.');
  if (validTimestamp.getTime() > Date.now() + 60 * 1000) {
    throw new Error('A drink cannot be logged in the future.');
  }

  const entries = await getAllEntries();
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    amountMl: validAmount,
    timestamp: validTimestamp.toISOString(),
    ...sanitiseEntryDetails(details, validAmount),
  };
  entries.push(entry);
  await safeSetItem(ENTRIES_KEY, JSON.stringify(entries));
  await getGoalForDate(dateKey(entry.timestamp));
  return entry;
}

export async function updateEntry(id, changes = {}) {
  const entries = await getAllEntries();
  const index = entries.findIndex((entry) => entry.id === id);
  if (index < 0) throw new Error('That drink no longer exists.');

  const current = entries[index];
  const amountMl = normalisePositiveMl(changes.amountMl ?? current.amountMl);
  if (!amountMl) throw new Error('Water amount must be between 1ml and 20,000ml.');
  const timestamp = new Date(changes.timestamp ?? current.timestamp);
  if (Number.isNaN(timestamp.getTime())) throw new Error('Drink time is invalid.');
  if (timestamp.getTime() > Date.now() + 60 * 1000) {
    throw new Error('A drink cannot be logged in the future.');
  }

  const updated = {
    ...current,
    ...sanitiseEntryDetails({ ...current, ...changes }, amountMl),
    amountMl,
    timestamp: timestamp.toISOString(),
    id: current.id,
  };
  entries[index] = updated;
  await safeSetItem(ENTRIES_KEY, JSON.stringify(entries));
  await getGoalForDate(dateKey(updated.timestamp));
  return updated;
}

export async function deleteEntry(id) {
  const entries = await getAllEntries();
  const filtered = entries.filter((entry) => entry.id !== id);
  if (filtered.length === entries.length) throw new Error('That drink no longer exists.');
  await safeSetItem(ENTRIES_KEY, JSON.stringify(filtered));
}

export async function getEntriesForDate(dateKeyStr) {
  const entries = await getAllEntries();
  return entries.filter((entry) => dateKey(entry.timestamp) === dateKeyStr);
}

function sanitiseGoalSnapshot(value, fallbackBaseGoal) {
  if (!isPlainObject(value)) return null;
  const baseGoalMl = normaliseGoalMl(value.baseGoalMl, fallbackBaseGoal);
  const extraMl = normalisePositiveMl(value.extraMl, 0, 0, 5000);
  return {
    baseGoalMl,
    extraMl,
    targetMl: baseGoalMl + extraMl,
  };
}

async function getGoalHistory() {
  const parsed = safeParseJson(await safeGetItem(GOAL_HISTORY_KEY), {});
  return isPlainObject(parsed) ? parsed : {};
}

async function saveGoalHistory(history) {
  await safeSetItem(GOAL_HISTORY_KEY, JSON.stringify(history));
}

async function mergeGoalHistory(changes) {
  const latest = await getGoalHistory();
  const merged = { ...latest, ...changes };
  await saveGoalHistory(merged);
  return merged;
}

export async function getDailyGoal() {
  const raw = await safeGetItem(GOAL_KEY);
  return normaliseGoalMl(raw, DEFAULT_GOAL_ML);
}

export async function getGoalForDate(dateKeyStr) {
  const currentBaseGoal = await getDailyGoal();
  const history = await getGoalHistory();
  const existing = sanitiseGoalSnapshot(history[dateKeyStr], currentBaseGoal);
  if (existing) return existing;

  const snapshot = createGoalSnapshot(currentBaseGoal, 0);
  const latest = await getGoalHistory();
  const concurrent = sanitiseGoalSnapshot(latest[dateKeyStr], currentBaseGoal);
  if (concurrent) return concurrent;
  await mergeGoalHistory({ [dateKeyStr]: snapshot });
  return snapshot;
}

export async function setDailyGoal(ml) {
  const validGoal = normaliseGoalMl(ml, null);
  if (!validGoal) {
    throw new Error(`Daily goal must be between ${MIN_GOAL_ML}ml and ${MAX_GOAL_ML}ml.`);
  }

  const previousGoal = await getDailyGoal();
  const [entries, history] = await Promise.all([getAllEntries(), getGoalHistory()]);
  const changes = {};

  for (const entry of entries) {
    const key = dateKey(entry.timestamp);
    if (!sanitiseGoalSnapshot(history[key], previousGoal) && !changes[key]) {
      changes[key] = createGoalSnapshot(previousGoal, 0);
    }
  }

  const today = dateKey();
  const current = sanitiseGoalSnapshot(history[today] ?? changes[today], previousGoal);
  changes[today] = createGoalSnapshot(validGoal, current?.extraMl ?? 0);

  await safeSetItem(GOAL_KEY, String(validGoal));
  await mergeGoalHistory(changes);
  return changes[today];
}

export async function setGoalAdjustmentForDate(dateKeyStr, extraMl) {
  const validExtra = normalisePositiveMl(extraMl, null, 0, 5000);
  if (validExtra == null) throw new Error('Daily goal adjustment must be between 0ml and 5,000ml.');

  const currentBaseGoal = await getDailyGoal();
  const history = await getGoalHistory();
  const existing = sanitiseGoalSnapshot(history[dateKeyStr], currentBaseGoal);
  const baseGoalMl = existing?.baseGoalMl ?? currentBaseGoal;
  const snapshot = createGoalSnapshot(baseGoalMl, validExtra);
  await mergeGoalHistory({ [dateKeyStr]: snapshot });
  return snapshot;
}

// Records the first date this app was ever opened on this device (best
// available proxy for "install date" without native APIs). Used to stop
// History from letting someone add/edit entries for dates before the app
// existed on their device.
export async function getInstallDateKey() {
  try {
    const existing = await AsyncStorage.getItem(INSTALL_DATE_KEY);
    if (existing && /^\d{4}-\d{2}-\d{2}$/.test(existing)) return existing;
  } catch (_error) {
    // fall through to set a fresh one below
  }
  const today = dateKey();
  try {
    await AsyncStorage.setItem(INSTALL_DATE_KEY, today);
  } catch (_error) {
    // best-effort — if this can't persist, treat today as the floor anyway
  }
  return today;
}

export async function getDaySummary(dateKeyStr, glassSizeMl = GLASS_SIZE_ML) {
  const [dayEntries, goal] = await Promise.all([
    getEntriesForDate(dateKeyStr),
    getGoalForDate(dateKeyStr),
  ]);
  const totalMl = dayEntries.reduce((sum, entry) => sum + effectiveMlForEntry(entry), 0);
  return {
    totalMl,
    glasses: Math.round(totalMl / glassSizeMl),
    drinkCount: dayEntries.length,
    entries: dayEntries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)),
    goalMl: goal.targetMl,
    baseGoalMl: goal.baseGoalMl,
    extraGoalMl: goal.extraMl,
    metGoal: totalMl >= goal.targetMl,
  };
}

export async function getRecentDaySummaries(numDays = 14, glassSizeMl = GLASS_SIZE_ML) {
  const today = dateKey();
  const results = [];
  for (let i = 0; i < numDays; i += 1) {
    const key = addDays(today, -i);
    // eslint-disable-next-line no-await-in-loop
    const summary = await getDaySummary(key, glassSizeMl);
    results.push({ dateKey: key, label: labelForDateKey(key), ...summary });
  }
  return results;
}

// Includes every date that contains a saved drink, plus a recent empty window
// so users can add something they forgot even when that day had no prior entry.
export async function getHistoryDaySummaries(minRecentDays = 14, glassSizeMl = GLASS_SIZE_ML) {
  const today = dateKey();
  const installDate = await getInstallDateKey();
  const allEntries = await getAllEntries();
  const entriesByDate = new Map();
  for (const entry of allEntries) {
    const key = dateKey(entry.timestamp);
    if (key > today) continue;
    if (!entriesByDate.has(key)) entriesByDate.set(key, []);
    entriesByDate.get(key).push(entry);
  }

  const dateKeys = new Set(entriesByDate.keys());
  for (let i = 0; i < minRecentDays; i += 1) {
    const key = addDays(today, -i);
    if (key < installDate) break;
    dateKeys.add(key);
  }
  const sortedKeys = [...dateKeys].sort((a, b) => b.localeCompare(a));
  const results = [];

  for (const key of sortedKeys) {
    const entries = (entriesByDate.get(key) || [])
      .slice()
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    // eslint-disable-next-line no-await-in-loop
    const goal = await getGoalForDate(key);
    const totalMl = entries.reduce((sum, entry) => sum + effectiveMlForEntry(entry), 0);
    results.push({
      dateKey: key,
      label: labelForDateKey(key),
      totalMl,
      glasses: Math.round(totalMl / glassSizeMl),
      drinkCount: entries.length,
      entries,
      goalMl: goal.targetMl,
      baseGoalMl: goal.baseGoalMl,
      extraGoalMl: goal.extraMl,
      metGoal: totalMl >= goal.targetMl,
    });
  }
  return results;
}

function labelForDateKey(key) {
  const today = dateKey();
  if (key === today) return 'Today';
  if (key === addDays(today, -1)) return 'Yesterday';
  const d = new Date(`${key}T00:00:00`);
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export async function calculateStreak(maxLookbackDays = 365) {
  const today = dateKey();
  const todaySummary = await getDaySummary(today);
  let streak = todaySummary.metGoal ? 1 : 0;

  for (let i = 1; i < maxLookbackDays; i += 1) {
    const key = addDays(today, -i);
    // eslint-disable-next-line no-await-in-loop
    const summary = await getDaySummary(key);
    if (summary.metGoal) streak += 1;
    else break;
  }

  return {
    streak,
    todayMet: todaySummary.metGoal,
    goal: todaySummary.goalMl,
  };
}
