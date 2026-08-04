import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Updates from 'expo-updates';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { getDailyGoal, MAX_GOAL_ML, MIN_GOAL_ML, setDailyGoal } from '../utils/storage';
import {
  applyReminderSchedule,
  getReminderSettings,
  refreshReminderSchedule,
  saveReminderSettings,
} from '../utils/notifications';
import { REMINDER_SERVING_MAX_ML, REMINDER_SERVING_MIN_ML, validateReminderSettings } from '../utils/reminderSettings';
import { formatVolume, mlToUnitInput, unitInputToMl, unitLabel } from '../utils/units';

export default function SettingsScreen({ navigation }) {
  const { colors: COLORS, premium, theme, prefs, updatePrefs } = useTheme();
  const unit = prefs.unit || 'ml';
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const [goalMl, setGoalMl] = useState(2000);
  const [goalInput, setGoalInput] = useState('2000');
  const [goalStatus, setGoalStatus] = useState('');
  const [goalError, setGoalError] = useState('');
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [dynamicReminders, setDynamicReminders] = useState(true);
  const [intervalHours, setIntervalHours] = useState('2');
  const [startHour, setStartHour] = useState('8');
  const [endHour, setEndHour] = useState('20');
  const [servingMlValue, setServingMlValue] = useState(300);
  const [servingMl, setServingMl] = useState('300');
  const [updateCheckStatus, setUpdateCheckStatus] = useState('');
  const [reminderStatus, setReminderStatus] = useState('');
  const [reminderError, setReminderError] = useState('');

  useFocusEffect(
    useCallback(() => {
      Promise.all([getDailyGoal(), getReminderSettings()])
        .then(([goal, settings]) => {
          setGoalMl(goal);
          setGoalInput(mlToUnitInput(goal, unit));
          setRemindersEnabled(settings.enabled);
          setDynamicReminders(premium ? settings.dynamic !== false : false);
          setIntervalHours(String(settings.intervalHours));
          setStartHour(String(settings.startHour));
          setEndHour(String(settings.endHour));
          setServingMlValue(settings.servingMl);
          setServingMl(mlToUnitInput(settings.servingMl, unit));
        })
        .catch(() => setGoalError('Settings could not be loaded.'));
    }, [unit])
  );

  // Reformat the displayed numbers (not the underlying ml values) whenever the
  // unit preference changes, so switching units never re-triggers a save.
  useEffect(() => {
    setGoalInput(mlToUnitInput(goalMl, unit));
    setServingMl(mlToUnitInput(servingMlValue, unit));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit]);

  const handleSaveGoal = async () => {
    setGoalError('');
    setGoalStatus('');
    const parsedMl = unitInputToMl(goalInput, unit);
    if (parsedMl == null) {
      setGoalError(`Enter a valid amount in ${unitLabel(unit)}.`);
      return;
    }
    if (parsedMl < MIN_GOAL_ML || parsedMl > MAX_GOAL_ML) {
      setGoalError(`Daily goal must be between ${formatVolume(MIN_GOAL_ML, unit)} and ${formatVolume(MAX_GOAL_ML, unit)}.`);
      return;
    }
    try {
      const saved = await setDailyGoal(parsedMl);
      setGoalMl(saved.baseGoalMl);
      await refreshReminderSchedule().catch(() => null);
      setGoalStatus('Saved ✓');
      setTimeout(() => setGoalStatus(''), 1500);
    } catch (error) {
      setGoalError(error.message);
    }
  };

  const formReminderSettings = (enabled = remindersEnabled) => ({
    enabled,
    dynamic: premium ? dynamicReminders : false,
    intervalHours,
    startHour,
    endHour,
    servingMl: unitInputToMl(servingMl, unit) ?? servingMlValue,
  });

  // Checked before validateReminderSettings so an out-of-range serving size
  // shows an error in the user's own unit instead of the ml-only fallback
  // message that lower-level validation returns.
  const servingSizeOutOfRange = () => {
    const parsedMl = unitInputToMl(servingMl, unit);
    if (parsedMl == null) return `Enter a valid amount in ${unitLabel(unit)}.`;
    if (parsedMl < REMINDER_SERVING_MIN_ML || parsedMl > REMINDER_SERVING_MAX_ML) {
      return `Typical drink per reminder must be from ${formatVolume(REMINDER_SERVING_MIN_ML, unit)} to ${formatVolume(REMINDER_SERVING_MAX_ML, unit)}.`;
    }
    return null;
  };

  const scheduleAndReport = async (settings) => {
    const saved = await saveReminderSettings(settings);
    const result = await applyReminderSchedule(saved);
    if (result.status === 'permission_denied') {
      await saveReminderSettings({ ...saved, enabled: false });
      setRemindersEnabled(false);
      setReminderStatus('');
      setReminderError('Notification permission was denied. Enable it in system settings.');
    } else if (result.status === 'unsupported_web') {
      await saveReminderSettings({ ...saved, enabled: false });
      setRemindersEnabled(false);
      setReminderStatus('');
      setReminderError('Scheduled reminders require the Android or iOS app.');
    } else if (result.status === 'goal_met') {
      setRemindersEnabled(true);
      setReminderStatus('Goal already met — no more reminders today ✓');
    } else if (result.status === 'no_window') {
      setRemindersEnabled(true);
      setReminderStatus(`${formatVolume(result.remainingMl, unit)} left, but today’s reminder window has ended.`);
    } else if (result.status === 'scheduled') {
      setRemindersEnabled(true);
      setReminderStatus(
        result.mode === 'dynamic'
          ? `${result.todayScheduledCount} smart reminder${result.todayScheduledCount === 1 ? '' : 's'} planned today for ${formatVolume(result.remainingMl, unit)} left ✓`
          : `${result.scheduledCount} daily reminders scheduled ✓`
      );
    } else {
      setRemindersEnabled(false);
      setReminderStatus('Reminders off');
    }
    return result;
  };

  const handleToggleReminders = async (value) => {
    setReminderError('');
    setReminderStatus('Updating…');

    try {
      if (!value) {
        const current = await getReminderSettings();
        await scheduleAndReport({ ...current, enabled: false });
        setRemindersEnabled(false);
        return;
      }

      const rangeError = servingSizeOutOfRange();
      if (rangeError) {
        setReminderStatus('');
        setReminderError(rangeError);
        return;
      }

      const validation = validateReminderSettings(formReminderSettings(true));
      if (!validation.valid) {
        setReminderStatus('');
        setReminderError(validation.error);
        return;
      }
      await scheduleAndReport(validation.settings);
    } catch (error) {
      setRemindersEnabled(false);
      setReminderStatus('');
      setReminderError(error.message || 'Reminders could not be updated.');
    }
  };

  const handleSaveReminderTiming = async () => {
    setReminderError('');
    setReminderStatus('Updating…');
    const rangeError = servingSizeOutOfRange();
    if (rangeError) {
      setReminderStatus('');
      setReminderError(rangeError);
      return;
    }
    const validation = validateReminderSettings(formReminderSettings());
    if (!validation.valid) {
      setReminderStatus('');
      setReminderError(validation.error);
      return;
    }
    try {
      await scheduleAndReport(validation.settings);
      setServingMlValue(validation.settings.servingMl);
    } catch (error) {
      setReminderStatus('');
      setReminderError(error.message || 'Reminder times could not be saved.');
    }
  };

  const handleCheckForUpdate = async () => {
    if (Platform.OS === 'web' || !Updates.isEnabled) {
      setUpdateCheckStatus('OTA updates are not active in this build (dev/web mode).');
      return;
    }
    setUpdateCheckStatus('Checking…');
    try {
      const result = await Updates.checkForUpdateAsync();
      if (!result.isAvailable) {
        setUpdateCheckStatus('You already have the latest update for this channel ✓');
        return;
      }
      setUpdateCheckStatus('Update found — downloading…');
      await Updates.fetchUpdateAsync();
      setUpdateCheckStatus('Downloaded ✓ Restarting to apply…');
      await Updates.reloadAsync();
    } catch (error) {
      setUpdateCheckStatus(error.message || 'Could not check for updates.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.header}>Settings</Text>

        <Text style={styles.label}>Units</Text>
        <View style={styles.unitRow}>
          {['ml', 'oz'].map((u) => (
            <TouchableOpacity
              key={u}
              style={[styles.unitChoice, unit === u && styles.unitChoiceSelected]}
              onPress={() => updatePrefs({ unit: u })}
            >
              <Text style={[styles.unitChoiceText, unit === u && styles.unitChoiceTextSelected]}>
                {u === 'ml' ? 'Millilitres (ml)' : 'Fluid ounces (oz)'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Daily goal ({unitLabel(unit)})</Text>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          value={goalInput}
          onChangeText={setGoalInput}
          accessibilityHint={`Enter a value from ${formatVolume(MIN_GOAL_ML, unit)} to ${formatVolume(MAX_GOAL_ML, unit)}`}
        />
        {goalError ? <Text style={styles.error}>{goalError}</Text> : null}
        <TouchableOpacity style={styles.button} onPress={handleSaveGoal}>
          <Text style={styles.buttonText}>{goalStatus || 'Save goal'}</Text>
        </TouchableOpacity>

        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleTitle}>Adjust goal for hot weather</Text>
            <Text style={styles.toggleSub}>
              Off by default — your goal always stays exactly what you set above. Turn this on to let Jug Up
              automatically add extra ml on hot days based on local weather.
            </Text>
          </View>
          <Switch
            value={Boolean(prefs.weatherAdjustEnabled)}
            onValueChange={(v) => updatePrefs({ weatherAdjustEnabled: v })}
            trackColor={{ true: COLORS.primary }}
          />
        </View>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('ManageCups')}>
          <Text style={styles.secondaryButtonText}>Manage cups</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <View style={styles.reminderHeaderRow}>
          <Text style={styles.sectionTitle}>Water reminders</Text>
          <Switch
            value={remindersEnabled}
            onValueChange={handleToggleReminders}
            trackColor={{ true: COLORS.primary }}
          />
        </View>

        {remindersEnabled && (
          <View style={styles.reminderFields}>
            <View style={styles.smartRow}>
              <View style={styles.smartCopy}>
                <Text style={styles.smartTitle}>Adapt to water left</Text>
                <Text style={styles.smartText}>Recalculates after every added, edited, or deleted drink.</Text>
              </View>
              <Switch
                value={dynamicReminders}
                onValueChange={(value) => premium ? setDynamicReminders(value) : navigation.navigate('Premium')}
                trackColor={{ true: COLORS.primary }}
              />
            </View>

            <Text style={styles.label}>
              {dynamicReminders ? 'Minimum gap between reminders (1–12 hours)' : 'Remind me every 1–12 hours'}
            </Text>
            <TextInput style={styles.input} keyboardType="number-pad" value={intervalHours} onChangeText={setIntervalHours} />

            {dynamicReminders && (
              <>
                <Text style={styles.label}>
                  Typical drink per reminder ({formatVolume(100, unit)}–{formatVolume(1000, unit)})
                </Text>
                <TextInput style={styles.input} keyboardType="decimal-pad" value={servingMl} onChangeText={setServingMl} />
              </>
            )}

            <View style={styles.rangeRow}>
              <View style={styles.rangeField}>
                <Text style={styles.label}>From (0–23)</Text>
                <TextInput style={styles.input} keyboardType="number-pad" value={startHour} onChangeText={setStartHour} />
              </View>
              <View style={styles.rangeField}>
                <Text style={styles.label}>Until (0–23)</Text>
                <TextInput style={styles.input} keyboardType="number-pad" value={endHour} onChangeText={setEndHour} />
              </View>
            </View>

            {reminderError ? <Text style={styles.error}>{reminderError}</Text> : null}
            <TouchableOpacity style={styles.button} onPress={handleSaveReminderTiming}>
              <Text style={styles.buttonText}>{reminderStatus || 'Update reminders'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {!remindersEnabled && reminderError ? <Text style={styles.error}>{reminderError}</Text> : null}
        {!remindersEnabled && reminderStatus ? <Text style={styles.status}>{reminderStatus}</Text> : null}

        <View style={styles.divider} />
        <Text style={styles.sectionTitle}>Personalisation</Text>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Themes')}>
          <Text style={styles.secondaryButtonText}>{theme.emoji} Themes · {theme.name}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Premium')}>
          <Text style={styles.secondaryButtonText}>{premium ? '✓ Jug Up Plus active' : '✨ Upgrade to Jug Up Plus'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Challenges')}>
          <Text style={styles.secondaryButtonText}>🏅 Hydration challenges</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Analytics')}>
          <Text style={styles.secondaryButtonText}>📊 Premium analytics {premium ? '' : '🔒'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('DataExport')}>
          <Text style={styles.secondaryButtonText}>💾 Export & backup {premium ? '' : '🔒'}</Text>
        </TouchableOpacity>

        <View style={styles.divider} />
        <Text style={styles.sectionTitle}>Build & updates</Text>
        {Platform.OS === 'web' ? (
          <Text style={styles.note}>Over-the-air updates only apply to installed native builds, not the web preview.</Text>
        ) : (
          <View style={styles.buildInfo}>
            <Text style={styles.buildInfoRow}>Channel: {Updates.channel || '(none — this build predates channel setup)'}</Text>
            <Text style={styles.buildInfoRow}>Runtime version: {Updates.runtimeVersion || 'unknown'}</Text>
            <Text style={styles.buildInfoRow}>
              Running: {Updates.isEmbeddedLaunch ? 'the version built into this install' : 'a downloaded OTA update'}
            </Text>
            {!Updates.isEmbeddedLaunch && Updates.updateId ? (
              <Text style={styles.buildInfoRow}>Update ID: {Updates.updateId.slice(0, 8)}…</Text>
            ) : null}
            <TouchableOpacity style={styles.secondaryButton} onPress={handleCheckForUpdate}>
              <Text style={styles.secondaryButtonText}>🔄 Check for update now</Text>
            </TouchableOpacity>
            {updateCheckStatus ? <Text style={styles.status}>{updateCheckStatus}</Text> : null}
          </View>
        )}

        <Text style={styles.note}>
          Smart reminders are rebuilt when the app opens and whenever today’s water or goal changes. Hydration data stays on your device.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (COLORS) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 20, paddingBottom: 40 },
  header: { fontSize: 26, fontWeight: '800', color: COLORS.text, marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted, marginBottom: 8 },
  input: { backgroundColor: COLORS.card, color: COLORS.text, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 18, marginBottom: 16 },
  unitRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  unitChoice: { flex: 1, backgroundColor: COLORS.card, borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  unitChoiceSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  unitChoiceText: { color: COLORS.textMuted, fontWeight: '700', fontSize: 13 },
  unitChoiceTextSelected: { color: COLORS.onPrimary },
  button: { backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  buttonText: { color: COLORS.onPrimary, fontWeight: '700', fontSize: 16, textAlign: 'center', paddingHorizontal: 8 },
  secondaryButton: { backgroundColor: COLORS.card, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 12, borderWidth: 1, borderColor: COLORS.primary },
  secondaryButtonText: { color: COLORS.primaryDark, fontWeight: '700', fontSize: 15 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  reminderHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  reminderFields: { marginTop: 4 },
  smartRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 12, padding: 14, marginBottom: 18 },
  smartCopy: { flex: 1, paddingRight: 12 },
  smartTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  smartText: { fontSize: 12, color: COLORS.textMuted, marginTop: 3, lineHeight: 17 },
  rangeRow: { flexDirection: 'row', gap: 12 },
  rangeField: { flex: 1 },
  error: { color: '#B91C1C', fontSize: 13, marginTop: -8, marginBottom: 12 },
  status: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center', marginTop: 12 },
  buildInfo: { backgroundColor: COLORS.card, borderRadius: 12, padding: 14, marginBottom: 4 },
  buildInfoRow: { fontSize: 12, color: COLORS.textMuted, marginBottom: 4 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 12, padding: 14, marginTop: 16 },
  toggleTitle: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
  toggleSub: { color: COLORS.textMuted, fontSize: 12, marginTop: 4, lineHeight: 17 },
  note: { marginTop: 24, fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 18 },
});
