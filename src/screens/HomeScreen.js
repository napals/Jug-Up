import React, { useCallback, useState, useMemo } from 'react';
import { Dimensions, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ProgressRing from '../components/ProgressRing';
import { ENCOURAGEMENT, EMPTY_STATE_MESSAGES, progressMessage, randomFrom, streakMessage } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { estimateCompletionTime } from '../utils/analytics';
import {
  calculateStreak,
  dateKey,
  getDaySummary,
  logEntry,
  setGoalAdjustmentForDate,
} from '../utils/storage';
import { getCups } from '../utils/cups';
import { getCurrentTemperatureC, heatMessage, recommendExtraMl } from '../utils/weather';
import { refreshReminderSchedule } from '../utils/notifications';
import { formatVolume } from '../utils/units';
import HydrationMascot from '../components/HydrationMascot';
import ThemeWaterScene from '../components/ThemeWaterScene';
import { ACCESS } from '../constants/themes';

const SCREEN_WIDTH = Dimensions.get('window').width;
const BANNER_WIDTH = SCREEN_WIDTH - 40;

export default function HomeScreen({ navigation }) {
  const { colors, theme, premium, previewing, prefs, refresh: refreshTheme } = useTheme();
  const unit = prefs.unit || 'ml';
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [baseGoalMl, setBaseGoalMl] = useState(2000);
  const [targetGoalMl, setTargetGoalMl] = useState(2000);
  const [todayMl, setTodayMl] = useState(0);
  const [message, setMessage] = useState('');
  const [streak, setStreak] = useState(0);
  const [cups, setCups] = useState([]);
  const [weather, setWeather] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [forecast, setForecast] = useState('');

  const refresh = useCallback(async () => {
    setLoadError('');
    try {
      const [summary, cupList] = await Promise.all([
        getDaySummary(dateKey()),
        getCups(),
      ]);
      const streakResult = await calculateStreak();
      setBaseGoalMl(summary.baseGoalMl);
      setTargetGoalMl(summary.goalMl);
      setTodayMl(summary.totalMl);
      setStreak(streakResult.streak);
      setCups(cupList);
      setMessage(summary.totalMl === 0 ? randomFrom(EMPTY_STATE_MESSAGES) : '');
      setForecast(estimateCompletionTime(summary.entries, summary.goalMl).label);

      // If weather-based adjustment isn't opted into, make sure today's goal
      // reflects exactly what the user set — clearing out any bump that may
      // have been applied automatically before this became opt-in.
      if (!prefs.weatherAdjustEnabled) {
        if (summary.extraGoalMl > 0) {
          const cleared = await setGoalAdjustmentForDate(dateKey(), 0);
          setBaseGoalMl(cleared.baseGoalMl);
          setTargetGoalMl(cleared.targetMl);
        }
        setWeather(null);
      }
    } catch (_error) {
      setLoadError('Some saved data could not be loaded. You can still try again.');
    }

    // Weather is intentionally non-blocking, and only runs at all if the user
    // has opted into weather-based goal adjustment. Once available, its
    // adjustment is persisted into today's target so Home, History and
    // streaks all agree.
    if (!prefs.weatherAdjustEnabled) return;
    getCurrentTemperatureC().then(async (result) => {
      if (!result.available || result.todayMaxC == null) return;
      const extraMl = recommendExtraMl(result.todayMaxC);
      try {
        const target = await setGoalAdjustmentForDate(dateKey(), extraMl);
        const streakResult = await calculateStreak();
        setBaseGoalMl(target.baseGoalMl);
        setTargetGoalMl(target.targetMl);
        setStreak(streakResult.streak);
        setWeather({
          todayMaxC: result.todayMaxC,
          extraMl,
          message: heatMessage(result.todayMaxC),
        });
        await refreshReminderSchedule().catch(() => null);
      } catch (_error) {
        // Weather remains optional; a storage failure should not block logging.
      }
    });
  }, [prefs.weatherAdjustEnabled]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const handleAdd = async (cup) => {
    try {
      await logEntry(cup.amountMl, {
        vesselName: cup.name,
        vesselType: cup.name.toLowerCase().includes('bottle') ? 'bottle' : 'cup',
        emoji: cup.emoji,
        color: cup.color,
        source: 'cup',
        drinkType: cup.drinkType,
      });
      await refreshReminderSchedule().catch(() => null);
      const summary = await getDaySummary(dateKey());
      const streakResult = await calculateStreak();
      setTodayMl(summary.totalMl);
      setBaseGoalMl(summary.baseGoalMl);
      setTargetGoalMl(summary.goalMl);
      setStreak(streakResult.streak);
      setMessage(randomFrom(ENCOURAGEMENT));
      setForecast(estimateCompletionTime(summary.entries, summary.goalMl).label);
      await refreshTheme();
      setLoadError('');
    } catch (_error) {
      setLoadError('That drink could not be saved. Please try again.');
    }
  };

  const percent = targetGoalMl ? (todayMl / targetGoalMl) * 100 : 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollFlex} contentContainerStyle={styles.scroll}>
        {(premium || previewing) && theme.access !== ACCESS.FREE ? (
          <View style={styles.themeBannerCard}>
            <ThemeWaterScene themeId={theme.id} colors={colors} width={BANNER_WIDTH} />
          </View>
        ) : null}
        <TouchableOpacity onPress={() => navigation.navigate('Themes')}>
          <Text style={styles.header}>{theme.emoji} Jug Up</Text>
          <Text style={styles.themeName}>{theme.name}</Text>
        </TouchableOpacity>

        {streak > 0 && (
          <View style={styles.streakBadge}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <View>
              <Text style={styles.streakCount}>{streak}-day streak</Text>
              <Text style={styles.streakSub}>{streakMessage(streak)}</Text>
            </View>
          </View>
        )}

        {weather?.message ? (
          <View style={styles.weatherBanner}>
            <Text style={styles.weatherText}>{weather.message}</Text>
            {weather.extraMl > 0 && (
              <Text style={styles.weatherSub}>
                Goal bumped from {formatVolume(baseGoalMl, unit)} to {formatVolume(targetGoalMl, unit)} today
              </Text>
            )}
          </View>
        ) : null}

        {loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}

        <View style={styles.ringWrap}>
          {premium || previewing ? (
            <View style={styles.mascotLayer} pointerEvents="none">
              <HydrationMascot percent={percent} size={230} themeId={theme.id} colors={colors} />
            </View>
          ) : null}
          <ProgressRing percent={percent} sizeMl={todayMl} goalMl={targetGoalMl} unit={unit} />
        </View>

        <Text style={styles.message}>{message || progressMessage(percent)}</Text>
        {premium ? <Text style={styles.forecast}>{forecast}</Text> : <TouchableOpacity onPress={() => navigation.navigate('Premium')}><Text style={styles.forecastLocked}>✨ Unlock completion forecasts</Text></TouchableOpacity>}

        <View style={styles.buttonsGrid}>
          {cups.map((cup) => (
            <TouchableOpacity
              key={cup.id}
              accessibilityRole="button"
              accessibilityLabel={`Add ${cup.amountMl} millilitres from ${cup.name}`}
              style={[styles.addButton, { borderColor: cup.color, borderWidth: 2 }]}
              onPress={() => handleAdd(cup)}
            >
              <Text style={styles.addButtonEmoji}>{cup.emoji || '🥤'}</Text>
              <Text style={[styles.addButtonText, { color: cup.color }]}>{cup.name}</Text>
              <Text style={styles.addButtonMl}>{formatVolume(cup.amountMl, unit)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.manageCupsLink} onPress={() => navigation.navigate('ManageCups')}>
          <Text style={styles.manageCupsLinkText}>Manage cups</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.scanButton} onPress={() => navigation.navigate('Scan')}>
          <Text style={styles.scanButtonEmoji}>📷</Text>
          <Text style={styles.scanButtonText}>Scan a bottle</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollFlex: { flex: 1 },
  themeBannerCard: { borderRadius: 18, overflow: 'hidden', marginBottom: 14, borderWidth: 1, borderColor: colors.border },
  scroll: { alignItems: 'center', paddingTop: 16, paddingBottom: 40 },
  header: { fontSize: 26, fontWeight: '800', color: colors.text, textAlign: 'center', textShadowColor: 'rgba(255,255,255,0.65)', textShadowRadius: 5, textShadowOffset: { width: 0, height: 0 } },
  themeName: { fontSize: 11, fontWeight: '700', color: colors.primaryDark, textAlign: 'center', marginBottom: 8 },
  streakBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3E0', borderRadius: 14,
    paddingVertical: 10, paddingHorizontal: 16, marginBottom: 8, gap: 10,
  },
  streakEmoji: { fontSize: 24 },
  streakCount: { fontSize: 15, fontWeight: '800', color: '#B45309' },
  streakSub: { fontSize: 12, color: '#92610F', marginTop: 1 },
  weatherBanner: {
    backgroundColor: '#FEE2E2', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 16,
    marginBottom: 8, marginHorizontal: 20, alignItems: 'center',
  },
  weatherText: { fontSize: 13, fontWeight: '700', color: '#991B1B', textAlign: 'center' },
  weatherSub: { fontSize: 12, color: '#991B1B', marginTop: 2 },
  errorText: { color: '#B91C1C', marginHorizontal: 24, textAlign: 'center', fontSize: 13 },
  ringWrap: { width: 220, height: 220, marginVertical: 12, alignItems: 'center', justifyContent: 'center' },
  mascotLayer: {
    position: 'absolute', top: -5, left: -5,
    width: 230, height: 230,
    borderRadius: 115, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    opacity: 0.9,
  },
  message: { fontSize: 15, color: colors.textMuted, marginBottom: 5, textAlign: 'center', paddingHorizontal: 24 },
  forecast: { color: colors.primaryDark, fontSize: 12, fontWeight: '700', marginBottom: 17 },
  forecastLocked: { color: colors.warning, fontSize: 12, fontWeight: '800', marginBottom: 17 },
  buttonsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, paddingHorizontal: 20 },
  addButton: {
    backgroundColor: colors.card, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16,
    alignItems: 'center', width: 96, shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  addButtonEmoji: { fontSize: 20, marginBottom: 4 },
  addButtonText: { fontWeight: '700', fontSize: 12, textAlign: 'center' },
  addButtonMl: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  manageCupsLink: { marginTop: 16 },
  manageCupsLinkText: { color: colors.primaryDark, fontWeight: '600', fontSize: 13 },
  scanButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20,
    backgroundColor: colors.primaryDark, borderRadius: 14, paddingVertical: 14,
    paddingHorizontal: 28, gap: 8,
  },
  scanButtonEmoji: { fontSize: 18 },
  scanButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
