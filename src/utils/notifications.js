import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  computeDynamicReminderPlan,
  computeReminderHours,
  DEFAULT_REMINDER_SETTINGS,
  validateReminderSettings,
} from './reminderSettings';
import { addDays, dateKey, getDailyGoal, getDaySummary } from './storage';

const SETTINGS_KEY = 'hydrate:reminderSettings';
const SCHEDULED_IDS_KEY = 'hydrate:scheduledNotificationIds';
const MAX_DYNAMIC_SCHEDULED = 60;

const REMINDER_MESSAGES = [
  'Time for a water break 💧',
  "Your body's asking nicely — go grab a drink",
  'Quick reminder: sip some water 🥤',
  "Hydration check! How's it going?",
  'A little water goes a long way right now',
];

function safeParse(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch (_error) {
    return fallback;
  }
}

export async function getReminderSettings() {
  let parsed = DEFAULT_REMINDER_SETTINGS;
  try {
    parsed = safeParse(await AsyncStorage.getItem(SETTINGS_KEY), DEFAULT_REMINDER_SETTINGS);
  } catch (_error) {
    parsed = DEFAULT_REMINDER_SETTINGS;
  }
  const validation = validateReminderSettings({ ...DEFAULT_REMINDER_SETTINGS, ...parsed });
  return validation.valid ? validation.settings : DEFAULT_REMINDER_SETTINGS;
}

export async function saveReminderSettings(settings) {
  const validation = validateReminderSettings(settings);
  if (!validation.valid) throw new Error(validation.error);
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(validation.settings));
  return validation.settings;
}

export async function requestNotificationPermissions() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

async function cancelAllScheduled() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (_error) {
    let ids = [];
    try {
      ids = safeParse(await AsyncStorage.getItem(SCHEDULED_IDS_KEY), []);
    } catch (_storageError) {
      ids = [];
    }
    if (!Array.isArray(ids)) ids = [];
    await Promise.allSettled(
      ids
        .filter((id) => typeof id === 'string')
        .map((id) => Notifications.cancelScheduledNotificationAsync(id))
    );
  }
  await AsyncStorage.removeItem(SCHEDULED_IDS_KEY);
}

async function prepareNativeNotifications() {
  const granted = await requestNotificationPermissions();
  if (!granted) return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Water reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  return true;
}

async function saveScheduledIds(scheduledIds) {
  await AsyncStorage.setItem(SCHEDULED_IDS_KEY, JSON.stringify(scheduledIds));
}

async function scheduleStaticReminders(validSettings) {
  const hours = computeReminderHours(validSettings);
  const scheduledIds = [];

  for (let i = 0; i < hours.length; i += 1) {
    const hour = hours[i];
    const message = REMINDER_MESSAGES[i % REMINDER_MESSAGES.length];
    // eslint-disable-next-line no-await-in-loop
    const id = await Notifications.scheduleNotificationAsync({
      content: { title: 'Jug Up', body: message, data: { kind: 'static-water-reminder' } },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute: 0,
        ...(Platform.OS === 'android' ? { channelId: 'reminders' } : {}),
      },
    });
    scheduledIds.push(id);
  }

  return scheduledIds;
}

async function scheduleDynamicPlan(plan, scheduledIds) {
  const remainingCapacity = Math.max(MAX_DYNAMIC_SCHEDULED - scheduledIds.length, 0);
  for (const item of plan.slice(0, remainingCapacity)) {
    const body = item.remainingMl === item.suggestedMl
      ? `Only ${item.remainingMl}ml left today — one last drink can finish your goal.`
      : `${item.remainingMl}ml left today. Aim for about ${item.suggestedMl}ml now.`;
    // eslint-disable-next-line no-await-in-loop
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Jug Up smart reminder',
        body,
        data: {
          kind: 'dynamic-water-reminder',
          remainingMl: item.remainingMl,
          suggestedMl: item.suggestedMl,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: item.fireDate,
        ...(Platform.OS === 'android' ? { channelId: 'reminders' } : {}),
      },
    });
    scheduledIds.push(id);
  }
}

async function scheduleDynamicReminders(validSettings, now = new Date()) {
  const todayKey = dateKey(now);
  const [summary, baseGoalMl] = await Promise.all([
    getDaySummary(todayKey),
    getDailyGoal(),
  ]);
  const remainingMl = Math.max(summary.goalMl - summary.totalMl, 0);
  const todayPlan = computeDynamicReminderPlan({
    now,
    totalMl: summary.totalMl,
    goalMl: summary.goalMl,
    settings: validSettings,
  });
  const scheduledIds = [];
  await scheduleDynamicPlan(todayPlan, scheduledIds);

  // Keep reminders alive if the app is not reopened tomorrow. Future plans use
  // the current base goal and are replaced whenever the app next opens or data
  // changes. The three-day horizon is capped at 60 pending notifications.
  for (let offset = 1; offset <= 2; offset += 1) {
    const futureKey = addDays(todayKey, offset);
    const futureNow = new Date(`${futureKey}T00:00:00`);
    const futurePlan = computeDynamicReminderPlan({
      now: futureNow,
      totalMl: 0,
      goalMl: baseGoalMl,
      settings: validSettings,
    });
    // eslint-disable-next-line no-await-in-loop
    await scheduleDynamicPlan(futurePlan, scheduledIds);
  }

  return {
    scheduledIds,
    remainingMl,
    todayPlan,
    todayScheduledCount: todayPlan.length,
  };
}

export async function applyReminderSchedule(settings, options = {}) {
  const validation = validateReminderSettings(settings);
  if (!validation.valid) throw new Error(validation.error);
  const validSettings = validation.settings;

  await cancelAllScheduled();
  if (!validSettings.enabled) return { status: 'disabled', scheduledCount: 0 };
  if (Platform.OS === 'web') return { status: 'unsupported_web', scheduledCount: 0 };

  const granted = await prepareNativeNotifications();
  if (!granted) return { status: 'permission_denied', scheduledCount: 0 };

  if (!validSettings.dynamic) {
    const scheduledIds = await scheduleStaticReminders(validSettings);
    await saveScheduledIds(scheduledIds);
    return { status: 'scheduled', mode: 'static', scheduledCount: scheduledIds.length };
  }

  const result = await scheduleDynamicReminders(validSettings, options.now ?? new Date());
  await saveScheduledIds(result.scheduledIds);
  if (result.remainingMl === 0) {
    return {
      status: 'goal_met',
      mode: 'dynamic',
      scheduledCount: result.scheduledIds.length,
      todayScheduledCount: 0,
      remainingMl: 0,
    };
  }
  if (result.todayScheduledCount === 0) {
    return {
      status: 'no_window',
      mode: 'dynamic',
      scheduledCount: result.scheduledIds.length,
      todayScheduledCount: 0,
      remainingMl: result.remainingMl,
    };
  }
  return {
    status: 'scheduled',
    mode: 'dynamic',
    scheduledCount: result.scheduledIds.length,
    todayScheduledCount: result.todayScheduledCount,
    remainingMl: result.remainingMl,
    nextReminderAt: result.todayPlan[0].fireDate.toISOString(),
  };
}

export async function refreshReminderSchedule(options = {}) {
  const settings = await getReminderSettings();
  if (!settings.enabled) return { status: 'disabled', scheduledCount: 0 };
  return applyReminderSchedule(settings, options);
}

export async function disableReminders() {
  await cancelAllScheduled();
  const settings = await getReminderSettings();
  await saveReminderSettings({ ...settings, enabled: false });
}
