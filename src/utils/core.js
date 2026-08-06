export const DEFAULT_GOAL_ML = 2000;
export const MIN_GOAL_ML = 250;
export const MAX_GOAL_ML = 10000;
export const ENTRY_MIN_ML = 1;
export const ENTRY_MAX_ML = 20000;

export function normalisePositiveMl(value, fallback = null, min = ENTRY_MIN_ML, max = ENTRY_MAX_ML) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return fallback;
  return parsed;
}

export function normaliseGoalMl(value, fallback = DEFAULT_GOAL_ML) {
  return normalisePositiveMl(value, fallback, MIN_GOAL_ML, MAX_GOAL_ML);
}

export function dateKey(date = new Date()) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

export function addDays(dateKeyStr, delta) {
  const d = new Date(`${dateKeyStr}T00:00:00`);
  d.setDate(d.getDate() + delta);
  return dateKey(d);
}

export function createGoalSnapshot(baseGoalMl, extraMl = 0) {
  const base = normaliseGoalMl(baseGoalMl);
  const extra = normalisePositiveMl(extraMl, 0, 0, 5000);
  return { baseGoalMl: base, extraMl: extra, targetMl: base + extra };
}

export function countConsecutiveGoals(records) {
  if (!Array.isArray(records) || records.length === 0) return 0;
  let streak = records[0].totalMl >= records[0].goalMl ? 1 : 0;
  for (let index = 1; index < records.length; index += 1) {
    if (records[index].totalMl >= records[index].goalMl) streak += 1;
    else break;
  }
  return streak;
}

export function parseVolumeToMl(quantityStr) {
  if (!quantityStr) return null;
  const cleaned = quantityStr.toLowerCase().replace(/\s+/g, '');
  const match = cleaned.match(/([\d.]+)(ml|cl|l)\b/);
  if (!match) return null;
  const [, num, unit] = match;
  const value = Number.parseFloat(num);
  if (!Number.isFinite(value) || value <= 0) return null;
  if (unit === 'ml') return Math.round(value);
  if (unit === 'cl') return Math.round(value * 10);
  if (unit === 'l') return Math.round(value * 1000);
  return null;
}

export function recommendExtraMl(todayMaxC) {
  if (todayMaxC == null) return 0;
  if (todayMaxC >= 35) return 1000;
  if (todayMaxC >= 30) return 700;
  if (todayMaxC >= 25) return 400;
  return 0;
}

export function heatMessage(todayMaxC) {
  if (todayMaxC == null) return '';
  if (todayMaxC >= 35) return `Extreme heat today (${Math.round(todayMaxC)}°C) — drink well above usual 🥵`;
  if (todayMaxC >= 30) return `Heatwave conditions (${Math.round(todayMaxC)}°C) — bump up your intake 🌡️`;
  if (todayMaxC >= 25) return `Warm day ahead (${Math.round(todayMaxC)}°C) — a bit extra water helps`;
  return '';
}

export const REMINDER_SERVING_MIN_ML = 100;
export const REMINDER_SERVING_MAX_ML = 1000;

export const DEFAULT_REMINDER_SETTINGS = {
  enabled: false,
  dynamic: true,
  intervalHours: 2,
  startHour: 8,
  endHour: 20,
  servingMl: 300,
};

function integer(value) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

// Reminder interval now supports 0.5-hour steps (e.g. 1.5, 2, 2.5) rather
// than only whole hours — rounds to the nearest half hour so stray decimal
// input (e.g. from a text field) still lands on a clean step.
function halfHourStep(value) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed * 2) / 2;
}

export function validateReminderSettings(input = {}) {
  const intervalHours = halfHourStep(input.intervalHours);
  const startHour = integer(input.startHour);
  const endHour = integer(input.endHour);
  const servingMl = integer(input.servingMl ?? DEFAULT_REMINDER_SETTINGS.servingMl);

  if (intervalHours == null || intervalHours < 0.5 || intervalHours > 12) {
    return { valid: false, error: 'Reminder interval must be from 0.5 to 12 hours.' };
  }
  if (startHour == null || startHour < 0 || startHour > 23) {
    return { valid: false, error: 'Start hour must be from 0 to 23.' };
  }
  if (endHour == null || endHour < 0 || endHour > 23) {
    return { valid: false, error: 'End hour must be from 0 to 23.' };
  }
  if (endHour <= startHour) {
    return { valid: false, error: 'End hour must be later than start hour.' };
  }
  if (servingMl == null || servingMl < REMINDER_SERVING_MIN_ML || servingMl > REMINDER_SERVING_MAX_ML) {
    return { valid: false, error: `Reminder drink size must be from ${REMINDER_SERVING_MIN_ML}ml to ${REMINDER_SERVING_MAX_ML}ml.` };
  }

  return {
    valid: true,
    settings: {
      enabled: Boolean(input.enabled),
      dynamic: input.dynamic !== false,
      intervalHours,
      startHour,
      endHour,
      servingMl,
    },
  };
}

export function computeReminderHours(settings) {
  const validation = validateReminderSettings(settings);
  if (!validation.valid) return [];
  const { intervalHours, startHour, endHour } = validation.settings;
  const hours = [];
  for (let hour = startHour; hour <= endHour; hour += intervalHours) hours.push(hour);
  return hours;
}

function roundUpToTen(value) {
  return Math.ceil(value / 10) * 10;
}

// Builds one-off reminders for the rest of today. The desired number of prompts
// is based on remaining volume / typical serving, capped by the available time
// slots and the user's minimum gap. Each planned message carries an updated
// projected remaining amount; logging or editing a drink recalculates the plan.
export function computeDynamicReminderPlan({ now = new Date(), totalMl, goalMl, settings }) {
  const validation = validateReminderSettings(settings);
  if (!validation.valid || !validation.settings.enabled) return [];

  const current = new Date(now);
  if (Number.isNaN(current.getTime())) return [];
  const validTotal = normalisePositiveMl(totalMl, 0, 0, MAX_GOAL_ML * 3);
  const validGoal = normalisePositiveMl(goalMl, null, 1, MAX_GOAL_ML + 5000);
  if (!validGoal) return [];

  const remainingMl = Math.max(validGoal - validTotal, 0);
  if (remainingMl === 0) return [];

  const { startHour, endHour, intervalHours, servingMl } = validation.settings;
  const start = new Date(current);
  start.setHours(startHour, 0, 0, 0);
  const end = new Date(current);
  end.setHours(endHour, 0, 0, 0);
  if (current >= end) return [];

  const minimumGapMs = intervalHours * 60 * 60 * 1000;
  const earliest = current < start
    ? start
    : new Date(current.getTime() + minimumGapMs);
  if (earliest > end) return [];

  const availableSlots = Math.floor((end.getTime() - earliest.getTime()) / minimumGapMs) + 1;
  const volumeSlots = Math.max(1, Math.ceil(remainingMl / servingMl));
  const count = Math.max(1, Math.min(availableSlots, volumeSlots));
  const spacingMs = count === 1 ? 0 : (end.getTime() - earliest.getTime()) / (count - 1);
  const plan = [];

  // remainingMl is intentionally the same true figure (as of right now, when
  // this plan was computed) for every prompt in the batch. Local
  // notifications can't re-check your actual data at the moment they fire,
  // so projecting a decreasing total across the day would silently assume
  // every earlier suggested serving got drunk — misleading if it didn't.
  // suggestedMl still paces sensibly across however many check-ins remain,
  // without ever implying water was logged that wasn't.
  for (let index = 0; index < count; index += 1) {
    const remainingPrompts = count - index;
    const suggestedMl = Math.min(remainingMl, roundUpToTen(remainingMl / remainingPrompts));
    plan.push({
      fireDate: new Date(earliest.getTime() + spacingMs * index),
      remainingMl,
      suggestedMl,
    });
  }

  return plan;
}

export function timestampForDateAndTime(dateKeyStr, timeText = '12:00') {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateKeyStr))) return null;
  const match = String(timeText).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number.parseInt(match[1], 10);
  const minute = Number.parseInt(match[2], 10);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  const timestamp = new Date(`${dateKeyStr}T00:00:00`);
  timestamp.setHours(hour, minute, 0, 0);
  if (Number.isNaN(timestamp.getTime()) || dateKey(timestamp) !== dateKeyStr) return null;
  return timestamp;
}