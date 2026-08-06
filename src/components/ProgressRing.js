import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';

export default function ProgressRing({ percent, size = 220, strokeWidth = 18 }) {
  const { colors: COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const safePercent = Number.isFinite(percent) ? percent : 0;
  const clamped = Math.max(0, Math.min(safePercent, 100));
  const dashOffset = circumference - (circumference * clamped) / 100;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={COLORS.track || COLORS.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={COLORS.primary}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.percentWrap}>
        <Text style={styles.percentText}>{Math.max(0, Math.round(safePercent))}%</Text>
      </View>
    </View>
  );
}

const makeStyles = (COLORS) => StyleSheet.create({
  percentWrap: { position: 'absolute', bottom: 14, alignItems: 'center' },
  percentText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
    backgroundColor: COLORS.card,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    overflow: 'hidden',
  },
});