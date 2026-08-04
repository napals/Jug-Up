import React, { useCallback, useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { getCups } from '../utils/cups';
import {
  dateKey,
  deleteEntry,
  ENTRY_MAX_ML,
  ENTRY_MIN_ML,
  getDaySummary,
  logEntry,
  timestampForDateAndTime,
  updateEntry,
} from '../utils/storage';
import { refreshReminderSchedule } from '../utils/notifications';
import { formatVolume, mlToUnitInput, unitInputToMl, unitLabel } from '../utils/units';
import { DRINK_TYPES } from '../constants/drinkTypes';

function timeText(timestamp) {
  const date = new Date(timestamp);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

const VESSEL_TYPES = [
  { id: 'glass', label: 'Glass', emoji: '🥤' },
  { id: 'bottle', label: 'Bottle', emoji: '🍶' },
  { id: 'mug', label: 'Mug', emoji: '☕' },
  { id: 'other', label: 'Other', emoji: '💧' },
];

function defaultTimeForDate(dayKey) {
  const now = new Date();
  return dayKey === dateKey(now)
    ? `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    : '12:00';
}

export default function HistoryDayScreen({ route }) {
  const { colors: COLORS, prefs, premium } = useTheme();
  const unit = prefs.unit || 'ml';
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const dayKey = route.params?.dateKey || dateKey();
  const dayLabel = route.params?.label || dayKey;
  const [summary, setSummary] = useState(null);
  const [cups, setCups] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [formVisible, setFormVisible] = useState(false);
  const [name, setName] = useState('Glass');
  const [amountInput, setAmountInput] = useState(mlToUnitInput(250, unit));
  const [time, setTime] = useState(defaultTimeForDate(dayKey));
  const [emoji, setEmoji] = useState('🥤');
  const [color, setColor] = useState(COLORS.primary);
  const [vesselType, setVesselType] = useState('glass');
  const [source, setSource] = useState('history');
  const [drinkType, setDrinkType] = useState('water');
  const [selectedCupId, setSelectedCupId] = useState(null);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [nextSummary, cupList] = await Promise.all([getDaySummary(dayKey), getCups()]);
      setSummary(nextSummary);
      setCups(cupList);
      setError('');
    } catch (_error) {
      setError('This day could not be loaded.');
    }
  }, [dayKey]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const title = useMemo(() => {
    const parsed = new Date(`${dayKey}T00:00:00`);
    const fullDate = parsed.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
    return `${dayLabel} · ${fullDate}`;
  }, [dayKey, dayLabel]);

  const resetForm = () => {
    setEditingId(null);
    setName('Glass');
    setAmountInput(mlToUnitInput(250, unit));
    setTime(defaultTimeForDate(dayKey));
    setEmoji('🥤');
    setColor(COLORS.primary);
    setVesselType('glass');
    setSource('history');
    setDrinkType('water');
    setSelectedCupId(null);
    setError('');
  };

  const chooseCup = (cup) => {
    setName(cup.name);
    setAmountInput(mlToUnitInput(cup.amountMl, unit));
    setEmoji(cup.emoji || '🥤');
    setColor(cup.color || COLORS.primary);
    setVesselType(cup.name.toLowerCase().includes('bottle') ? 'bottle' : 'cup');
    setSource('cup');
    setDrinkType(cup.drinkType || 'water');
    setSelectedCupId(cup.id);
    setFormVisible(true);
  };

  const beginAdd = () => {
    resetForm();
    setFormVisible(true);
  };

  const beginEdit = (entry) => {
    setEditingId(entry.id);
    setName(entry.vesselName);
    setAmountInput(mlToUnitInput(entry.amountMl, unit));
    setTime(timeText(entry.timestamp));
    setEmoji(entry.emoji);
    setColor(entry.color);
    setVesselType(entry.vesselType);
    setSource(entry.source);
    setDrinkType(entry.drinkType || 'water');
    const matchingCup = cups.find((cup) => cup.name === entry.vesselName && cup.amountMl === entry.amountMl);
    setSelectedCupId(matchingCup ? matchingCup.id : null);
    setError('');
    setFormVisible(true);
  };

  const refreshTodayReminders = async () => {
    if (dayKey === dateKey()) await refreshReminderSchedule().catch(() => null);
  };

  const handleSave = async () => {
    setError('');
    if (!name.trim()) {
      setError('Enter the glass or bottle name.');
      return;
    }
    const timestamp = timestampForDateAndTime(dayKey, time);
    if (!timestamp) {
      setError('Enter time as HH:MM, for example 09:30.');
      return;
    }
    const amountMl = unitInputToMl(amountInput, unit);
    if (!amountMl) {
      setError(`Enter a valid amount in ${unitLabel(unit)}.`);
      return;
    }
    if (amountMl < ENTRY_MIN_ML || amountMl > ENTRY_MAX_ML) {
      setError(`Enter an amount between ${formatVolume(ENTRY_MIN_ML, unit)} and ${formatVolume(ENTRY_MAX_ML, unit)}.`);
      return;
    }
    try {
      const details = { vesselName: name, vesselType, emoji, color, source, drinkType: premium ? drinkType : 'water' };
      if (editingId) {
        await updateEntry(editingId, { amountMl, timestamp, ...details });
      } else {
        await logEntry(amountMl, details, timestamp);
      }
      await refreshTodayReminders();
      await load();
      resetForm();
      setFormVisible(false);
    } catch (saveError) {
      setError(saveError.message || 'That drink could not be saved.');
    }
  };

  const performDelete = async (entry) => {
    try {
      await deleteEntry(entry.id);
      await refreshTodayReminders();
      await load();
      if (editingId === entry.id) {
        resetForm();
        setFormVisible(false);
      }
    } catch (deleteError) {
      setError(deleteError.message || 'That drink could not be deleted.');
    } finally {
      setPendingDeleteId(null);
    }
  };

  const confirmDelete = (entry) => {
    setError('');
    setPendingDeleteId(entry.id);
  };

  const cancelDelete = () => setPendingDeleteId(null);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.header}>{title}</Text>
        {summary ? (
          <View style={styles.totalCard}>
            <Text style={styles.total}>{formatVolume(summary.totalMl, unit)}</Text>
            <Text style={styles.totalSub}>
              {summary.drinkCount} {summary.drinkCount === 1 ? 'drink' : 'drinks'} · target {formatVolume(summary.goalMl, unit)} · {summary.metGoal ? 'goal met ✓' : `${formatVolume(Math.max(summary.goalMl - summary.totalMl, 0), unit)} left`}
            </Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Recorded drinks</Text>
        {!summary?.entries.length ? <Text style={styles.empty}>No drinks recorded for this day.</Text> : null}
        {summary?.entries.map((entry) => (
          <View key={entry.id} style={styles.entryRow}>
            <View style={[styles.entryIcon, { borderColor: entry.color }]}>
              <Text style={styles.entryEmoji}>{entry.emoji}</Text>
            </View>
            <View style={styles.entryInfo}>
              <Text style={styles.entryName}>{entry.vesselName}</Text>
              <Text style={styles.entryMeta}>
                {formatVolume(entry.amountMl, unit)} · {timeText(entry.timestamp)}
                {entry.drinkType && entry.drinkType !== 'water' ? ` · ${DRINK_TYPES.find((d) => d.id === entry.drinkType)?.label || entry.drinkType}` : ''}
              </Text>
            </View>
            {pendingDeleteId === entry.id ? (
              <>
                <TouchableOpacity style={styles.rowAction} onPress={cancelDelete}>
                  <Text style={styles.cancelDeleteText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.rowAction} onPress={() => performDelete(entry)}>
                  <Text style={styles.confirmDeleteText}>Confirm</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity style={styles.rowAction} onPress={() => beginEdit(entry)}>
                  <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.rowAction} onPress={() => confirmDelete(entry)}>
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        ))}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!formVisible ? (
          <TouchableOpacity style={styles.addButton} onPress={beginAdd}>
            <Text style={styles.addButtonText}>+ Add a missed drink</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.form}>
            <Text style={styles.formTitle}>{editingId ? 'Edit drink' : 'Add missed drink'}</Text>
            <Text style={styles.label}>Use a saved vessel</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cupStrip}>
              {cups.map((cup) => (
                <TouchableOpacity
                  key={cup.id}
                  style={[
                    styles.cupChoice,
                    { borderColor: cup.color },
                    selectedCupId === cup.id && styles.cupChoiceSelected,
                  ]}
                  onPress={() => chooseCup(cup)}
                >
                  <Text style={styles.cupEmoji}>{cup.emoji}</Text>
                  <Text style={styles.cupName} numberOfLines={1}>{cup.name}</Text>
                  <Text style={styles.cupMl}>{formatVolume(cup.amountMl, unit)}</Text>
                  {selectedCupId === cup.id ? <Text style={styles.cupSelectedCheck}>✓</Text> : null}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Vessel type</Text>
            <View style={styles.typeRow}>
              {VESSEL_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[styles.typeChoice, vesselType === type.id && styles.typeChoiceSelected]}
                  onPress={() => { setVesselType(type.id); setEmoji(type.emoji); }}
                >
                  <Text style={styles.typeEmoji}>{type.emoji}</Text>
                  <Text style={[styles.typeText, vesselType === type.id && styles.typeTextSelected]}>{type.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Glass or bottle name</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} maxLength={80} />
            <View style={styles.twoColumns}>
              <View style={styles.column}>
                <Text style={styles.label}>Volume ({unitLabel(unit)})</Text>
                <TextInput style={styles.input} keyboardType="decimal-pad" value={amountInput} onChangeText={setAmountInput} />
              </View>
              <View style={styles.column}>
                <Text style={styles.label}>Time (HH:MM)</Text>
                <TextInput style={styles.input} keyboardType="numbers-and-punctuation" value={time} onChangeText={setTime} maxLength={5} />
              </View>
            </View>

            {premium ? (
              <>
                <Text style={styles.label}>Drink type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.drinkTypeStrip}>
                  {DRINK_TYPES.map((d) => (
                    <TouchableOpacity
                      key={d.id}
                      style={[styles.drinkTypeChip, drinkType === d.id && styles.drinkTypeChipSelected]}
                      onPress={() => setDrinkType(d.id)}
                    >
                      <Text style={styles.drinkTypeEmoji}>{d.emoji}</Text>
                      <Text style={[styles.drinkTypeLabel, drinkType === d.id && styles.drinkTypeLabelSelected]}>{d.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {drinkType !== 'water' ? (
                  <Text style={styles.drinkTypeHint}>
                    Counts as ~{Math.round((DRINK_TYPES.find((d) => d.id === drinkType)?.ratio || 1) * 100)}% toward your goal, based on published hydration research.
                  </Text>
                ) : null}
              </>
            ) : null}

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>{editingId ? 'Save changes' : 'Add drink'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => { resetForm(); setFormVisible(false); }}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (COLORS) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 20, paddingBottom: 48 },
  header: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 14 },
  totalCard: { backgroundColor: COLORS.primary, borderRadius: 16, padding: 18, marginBottom: 22 },
  total: { color: '#FFFFFF', fontSize: 30, fontWeight: '800' },
  totalSub: { color: '#DCEEFF', fontSize: 13, marginTop: 4, lineHeight: 18 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 10 },
  empty: { color: COLORS.textMuted, fontSize: 13, marginBottom: 14 },
  entryRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 12, padding: 12, marginBottom: 9 },
  entryIcon: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  entryEmoji: { fontSize: 19 },
  entryInfo: { flex: 1, marginLeft: 10 },
  entryName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  entryMeta: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  rowAction: { paddingVertical: 8, paddingLeft: 10 },
  editText: { color: COLORS.primaryDark, fontWeight: '700', fontSize: 12 },
  deleteText: { color: '#DC2626', fontWeight: '700', fontSize: 12 },
  cancelDeleteText: { color: COLORS.textMuted, fontWeight: '700', fontSize: 12 },
  confirmDeleteText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12, backgroundColor: '#DC2626', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overflow: 'hidden' },
  addButton: { backgroundColor: COLORS.primaryDark, borderRadius: 12, alignItems: 'center', paddingVertical: 14, marginTop: 10 },
  addButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  form: { marginTop: 18, borderTopWidth: 1, borderTopColor: '#DCE9F5', paddingTop: 20 },
  formTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted, marginBottom: 6, marginTop: 10 },
  cupStrip: { gap: 9, paddingBottom: 4 },
  cupChoice: { width: 92, backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 2, padding: 10, alignItems: 'center' },
  drinkTypeStrip: { gap: 8, paddingBottom: 4 },
  drinkTypeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.card, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.border, paddingVertical: 8, paddingHorizontal: 12 },
  drinkTypeChipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  drinkTypeEmoji: { fontSize: 15 },
  drinkTypeLabel: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  drinkTypeLabelSelected: { color: COLORS.onPrimary },
  drinkTypeHint: { color: COLORS.textMuted, fontSize: 12, marginTop: 6, marginBottom: 4 },
  cupChoiceSelected: { backgroundColor: '#E1F1FF', borderWidth: 3 },
  cupSelectedCheck: { position: 'absolute', top: 6, right: 8, color: COLORS.primaryDark, fontWeight: '800', fontSize: 12 },
  cupEmoji: { fontSize: 19 },
  cupName: { fontSize: 11, fontWeight: '700', color: COLORS.text, marginTop: 3, maxWidth: 72 },
  cupMl: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeChoice: { flex: 1, backgroundColor: COLORS.card, borderRadius: 10, paddingVertical: 9, alignItems: 'center', borderWidth: 1, borderColor: '#DCE9F5' },
  typeChoiceSelected: { borderColor: COLORS.primary, backgroundColor: '#E1F1FF' },
  typeEmoji: { fontSize: 17 },
  typeText: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, marginTop: 2 },
  typeTextSelected: { color: COLORS.primaryDark },
  input: { backgroundColor: COLORS.card, color: COLORS.text, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 11, fontSize: 16 },
  twoColumns: { flexDirection: 'row', gap: 12 },
  column: { flex: 1 },
  error: { color: '#B91C1C', fontSize: 13, marginTop: 12 },
  saveButton: { backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 18 },
  saveButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  cancelButton: { alignItems: 'center', paddingVertical: 13 },
  cancelText: { color: COLORS.textMuted, fontWeight: '600' },
});
