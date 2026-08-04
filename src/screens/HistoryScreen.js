import React, { useCallback, useState, useMemo } from 'react';
import { FlatList, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { streakMessage } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { addDays, calculateStreak, dateKey, getHistoryDaySummaries, getInstallDateKey, timestampForDateAndTime } from '../utils/storage';
import { formatVolume } from '../utils/units';

function vesselSummary(entries) {
  if (!entries?.length) return 'No drinks recorded';
  const counts = new Map();
  for (const entry of entries) {
    const key = `${entry.emoji}\u0000${entry.vesselName}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const labels = [...counts.entries()].map(([key, count]) => {
    const separator = key.indexOf('\u0000');
    const emoji = key.slice(0, separator);
    const name = key.slice(separator + 1);
    return `${count > 1 ? `${count}× ` : ''}${emoji} ${name}`;
  });
  return labels.slice(0, 3).join(' · ') + (labels.length > 3 ? ` · +${labels.length - 3} more` : '');
}

export default function HistoryScreen({ navigation }) {
  const { colors: COLORS, prefs } = useTheme();
  const unit = prefs.unit || 'ml';
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const [days, setDays] = useState([]);
  const [streak, setStreak] = useState(0);
  const [error, setError] = useState('');
  const [dateInput, setDateInput] = useState(addDays(dateKey(), -1));
  const [dateError, setDateError] = useState('');
  const [installDate, setInstallDate] = useState(dateKey());

  useFocusEffect(
    useCallback(() => {
      setError('');
      const load = async () => {
        try {
          const [summaries, result, installKey] = await Promise.all([
            getHistoryDaySummaries(14),
            calculateStreak(),
            getInstallDateKey(),
          ]);
          setDays(summaries);
          setStreak(result.streak);
          setInstallDate(installKey);
        } catch (_error) {
          setError('History could not be loaded.');
        }
      };
      load();
    }, [])
  );

  const openDay = (day) => {
    if (day.dateKey < installDate) return;
    navigation.navigate('HistoryDay', {
      dateKey: day.dateKey,
      label: day.label,
    });
  };

  const openTypedDate = () => {
    setDateError('');
    const parsed = timestampForDateAndTime(dateInput, '12:00');
    if (!parsed) {
      setDateError('Enter a valid date as YYYY-MM-DD.');
      return;
    }
    if (dateKey(parsed) > dateKey()) {
      setDateError('Choose today or a past date.');
      return;
    }
    if (dateKey(parsed) < installDate) {
      setDateError(`Jug Up can only track dates from ${installDate} onward, when it was installed.`);
      return;
    }
    navigation.navigate('HistoryDay', { dateKey: dateKey(parsed), label: dateKey(parsed) });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>History</Text>
      <Text style={styles.subheader}>Open a day to add, edit, or remove individual drinks.</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.dateJumpCard}>
        <Text style={styles.dateJumpTitle}>Add or correct another date</Text>
        <View style={styles.dateJumpRow}>
          <TextInput
            style={styles.dateInput}
            value={dateInput}
            onChangeText={setDateInput}
            placeholder="YYYY-MM-DD"
            autoCapitalize="none"
            maxLength={10}
          />
          <TouchableOpacity style={styles.dateButton} onPress={openTypedDate}>
            <Text style={styles.dateButtonText}>Open</Text>
          </TouchableOpacity>
        </View>
        {dateError ? <Text style={styles.dateError}>{dateError}</Text> : null}
      </View>

      {streak > 0 && (
        <View style={styles.streakRow}>
          <Text style={styles.streakEmoji}>🔥</Text>
          <Text style={styles.streakText}>{streak}-day streak — {streakMessage(streak)}</Text>
        </View>
      )}

      <FlatList
        data={days}
        keyExtractor={(item) => item.dateKey}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.dayRow, item.label === 'Yesterday' && styles.yesterdayRow]}
            onPress={() => openDay(item)}
            accessibilityRole="button"
            accessibilityLabel={`Edit drinks for ${item.label}`}
          >
            <View style={styles.dayTopRow}>
              <View>
                <Text style={[styles.dayLabel, item.label === 'Yesterday' && styles.yesterdayText]}>{item.label}</Text>
                <Text style={[styles.goalStatus, item.metGoal && styles.goalMet, item.label === 'Yesterday' && styles.yesterdaySub]}>
                  {item.metGoal ? 'Goal met ✓' : `${formatVolume(item.totalMl, unit)} of ${formatVolume(item.goalMl, unit)}`}
                </Text>
              </View>
              <View style={styles.dayRight}>
                <Text style={[styles.drinkCount, item.label === 'Yesterday' && styles.yesterdayText]}>
                  {item.drinkCount} {item.drinkCount === 1 ? 'drink' : 'drinks'}
                </Text>
                <Text style={[styles.editHint, item.label === 'Yesterday' && styles.yesterdaySub]}>Edit ›</Text>
              </View>
            </View>
            <Text style={[styles.vesselSummary, item.label === 'Yesterday' && styles.yesterdaySub]} numberOfLines={2}>
              {vesselSummary(item.entries)}
            </Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const makeStyles = (COLORS) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingTop: 12 },
  header: { fontSize: 26, fontWeight: '800', color: COLORS.text, paddingHorizontal: 20 },
  subheader: { fontSize: 13, color: COLORS.textMuted, paddingHorizontal: 20, marginTop: 4, marginBottom: 12 },
  error: { color: '#B91C1C', paddingHorizontal: 20, marginBottom: 12 },
  dateJumpCard: { marginHorizontal: 20, marginBottom: 14, backgroundColor: COLORS.card, borderRadius: 12, padding: 12 },
  dateJumpTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  dateJumpRow: { flexDirection: 'row', gap: 8 },
  dateInput: { flex: 1, backgroundColor: COLORS.background, borderRadius: 9, paddingHorizontal: 11, paddingVertical: 9, fontSize: 14, color: COLORS.text },
  dateButton: { backgroundColor: COLORS.primaryDark, borderRadius: 9, paddingHorizontal: 16, justifyContent: 'center' },
  dateButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  dateError: { color: '#B91C1C', fontSize: 12, marginTop: 7 },
  streakRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 12, gap: 8 },
  streakEmoji: { fontSize: 18 },
  streakText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  list: { paddingHorizontal: 20, paddingBottom: 24 },
  dayRow: { backgroundColor: COLORS.card, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 10 },
  yesterdayRow: { backgroundColor: COLORS.primary },
  dayTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayLabel: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  goalStatus: { fontSize: 12, color: COLORS.textMuted, marginTop: 3 },
  goalMet: { color: COLORS.success, fontWeight: '700' },
  dayRight: { alignItems: 'flex-end' },
  drinkCount: { fontSize: 14, fontWeight: '700', color: COLORS.primaryDark },
  editHint: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  vesselSummary: { fontSize: 12, color: COLORS.textMuted, marginTop: 10, lineHeight: 17 },
  yesterdayText: { color: '#FFFFFF' },
  yesterdaySub: { color: '#DCEEFF' },
});
