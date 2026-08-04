import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

const VIEW_W = 240;
const VIEW_H = 260;

// Real illustrated Jubi artwork at seven hydration levels. Ratios are
// intentionally the exact breakpoints the artwork was generated for — the
// mascot crossfades smoothly between the two nearest stages as the day's
// percentage changes, rather than hard-cutting between them.
const STAGES = [
  { percent: 0, image: require('../../assets/jubi/stage-00.png') },
  { percent: 15, image: require('../../assets/jubi/stage-15.png') },
  { percent: 30, image: require('../../assets/jubi/stage-30.png') },
  { percent: 50, image: require('../../assets/jubi/stage-50.png') },
  { percent: 76, image: require('../../assets/jubi/stage-76.png') },
  { percent: 100, image: require('../../assets/jubi/stage-100.png') },
  { percent: 101, image: require('../../assets/jubi/stage-101.png') },
];
const MAX_STAGE_PERCENT = STAGES[STAGES.length - 1].percent;

// Given a live percent value, find the two nearest illustrated stages and
// how far between them we are (0 = fully "from", 1 = fully "to") — this is
// what drives the crossfade.
function getStageBlend(rawPercent) {
  const percent = Math.max(0, Math.min(rawPercent || 0, MAX_STAGE_PERCENT));
  if (percent <= STAGES[0].percent) return { fromIndex: 0, toIndex: 0, t: 0 };
  if (percent >= MAX_STAGE_PERCENT) return { fromIndex: STAGES.length - 1, toIndex: STAGES.length - 1, t: 0 };
  for (let i = 0; i < STAGES.length - 1; i += 1) {
    const from = STAGES[i];
    const to = STAGES[i + 1];
    if (percent >= from.percent && percent <= to.percent) {
      const span = to.percent - from.percent;
      const t = span > 0 ? (percent - from.percent) / span : 0;
      return { fromIndex: i, toIndex: i + 1, t };
    }
  }
  return { fromIndex: STAGES.length - 1, toIndex: STAGES.length - 1, t: 0 };
}

// Small seasonal props layered behind Jubi so the scene always reads as
// "this theme," regardless of hydration level. Kept deliberately light-touch
// — corners and edges only — so it never competes with the character.
function SeasonalAccents({ themeId, accent }) {
  switch (themeId) {
    case 'spring':
      return (
        <>
          {[24, 60, 200].map((cx, i) => (
            <Circle key={i} cx={cx} cy={16 + (i % 2) * 10} r={4} fill={i % 2 ? '#F28AB2' : '#FFD54F'} opacity={0.8} />
          ))}
        </>
      );
    case 'summer':
      return (
        <Path d="M 0 8 q 20 -6 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0" stroke={accent} strokeWidth={2} fill="none" opacity={0.35} />
      );
    case 'autumn':
      return (
        <>
          {[[18, 20], [210, 34], [200, 12]].map(([cx, cy], i) => (
            <Path key={i} d={`M ${cx} ${cy} q 5 -5 9 0 q -4 5 -9 0 Z`} fill="#D97706" opacity={0.85} />
          ))}
        </>
      );
    case 'winter':
      return (
        <>
          {[20, 60, 100, 150, 190, 220].map((cx, i) => (
            <Circle key={i} cx={cx} cy={10 + ((i * 37) % 40)} r={2.2} fill="#EDF5FF" opacity={0.9} />
          ))}
        </>
      );
    case 'halloween':
      return (
        <>
          <Path d="M 26 24 l 8 -3 l -2 4 l 6 -1 l -10 6 l -6 -1 l 4 -5 z" fill="#2D1943" opacity={0.85} />
          <Circle cx={206} cy={20} r={9} fill={accent} opacity={0.6} />
        </>
      );
    case 'christmas':
      return (
        <>
          {[24, 64, 176, 216].map((cx, i) => (
            <Circle key={i} cx={cx} cy={14 + (i % 2) * 10} r={3} fill={i % 2 ? '#FBBF24' : '#4ADE80'} opacity={0.9} />
          ))}
        </>
      );
    case 'newyear':
      return (
        <>
          {[[24, 20], [210, 16], [190, 40]].map(([cx, cy], i) => (
            <Path key={i} d={`M ${cx} ${cy} l 2 5 l 5 2 l -5 2 l -2 5 l -2 -5 l -5 -2 l 5 -2 z`} fill={accent} opacity={0.9} />
          ))}
        </>
      );
    case 'valentine':
      return (
        <>
          {[[22, 22], [214, 18]].map(([cx, cy], i) => (
            <Path
              key={i}
              d={`M ${cx} ${cy} C ${cx - 6} ${cy - 8} ${cx - 16} ${cy - 2} ${cx - 12} ${cy + 6} C ${cx - 8} ${cy + 12} ${cx} ${cy + 16} ${cx} ${cy + 16} C ${cx} ${cy + 16} ${cx + 8} ${cy + 12} ${cx + 12} ${cy + 6} C ${cx + 16} ${cy - 2} ${cx + 6} ${cy - 8} ${cx} ${cy} Z`}
              fill="#E11D70"
              opacity={0.8}
            />
          ))}
        </>
      );
    case 'birthday':
      return (
        <>
          {[[22, 18, accent], [200, 30, '#7C3AED'], [214, 12, '#38BDF8']].map(([cx, cy, c], i) => (
            <Rect key={i} x={cx} y={cy} width={5} height={5} fill={c} opacity={0.85} transform={`rotate(${i * 40} ${cx} ${cy})`} />
          ))}
        </>
      );
    case 'champion':
      return (
        <>
          {[24, 60, 190, 216].map((cx, i) => (
            <Path key={i} d={`M ${cx} ${12 + (i % 2) * 12} l 1.6 4 l 4 1.6 l -4 1.6 l -1.6 4 l -1.6 -4 l -4 -1.6 l 4 -1.6 z`} fill="#F5C451" opacity={0.9} />
          ))}
        </>
      );
    default:
      return null;
  }
}

function Bubbles({ count = 4 }) {
  const anims = useRef([...Array(count)].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const loops = anims.map((value, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 550),
          Animated.timing(value, {
            toValue: 1,
            duration: 2600,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(value, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      )
    );
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [anims]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {anims.map((value, index) => {
        const translateY = value.interpolate({ inputRange: [0, 1], outputRange: [0, -90] });
        const opacity = value.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 0.8, 0.8, 0] });
        const left = 60 + index * 42 + (index % 2) * 14;
        return (
          <Animated.View
            key={`bubble-${index}`}
            style={{
              position: 'absolute',
              left,
              bottom: 20,
              width: 6 + (index % 3) * 2,
              height: 6 + (index % 3) * 2,
              borderRadius: 8,
              backgroundColor: '#EAF6FF',
              opacity,
              transform: [{ translateY }],
            }}
          />
        );
      })}
    </View>
  );
}

// Default palette used only if no theme colors are passed in.
const FALLBACK_COLORS = { soft: '#FBEBCF', accent: '#FFD54F' };

// Premium background mascot. Free users never see this — HomeScreen only
// mounts it when t.premium is true. `percent` is today's hydration
// percentage; the character crossfades smoothly between the two nearest of
// seven real illustrated stages as it changes, animating toward each new
// target rather than jump-cutting. `themeId`/`colors` come from the active
// theme so the backdrop and seasonal props match whatever theme is chosen.
export default function HydrationMascot({ percent, size = 220, themeId = 'standard', colors = FALLBACK_COLORS }) {
  const sky = colors.soft || FALLBACK_COLORS.soft;
  const accent = colors.accent || FALLBACK_COLORS.accent;

  // A single animated value tracks a smooth "virtual percent" that eases
  // toward the real percent whenever it changes, rather than snapping
  // instantly — this is what makes Jubi visibly animate filling up.
  const animatedPercent = useRef(new Animated.Value(percent || 0)).current;
  const [blend, setBlend] = useState(() => getStageBlend(percent));

  useEffect(() => {
    const listenerId = animatedPercent.addListener(({ value }) => {
      setBlend(getStageBlend(value));
    });
    return () => animatedPercent.removeListener(listenerId);
  }, [animatedPercent]);

  useEffect(() => {
    Animated.timing(animatedPercent, {
      toValue: percent || 0,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // this value drives non-transform state, not a native prop
    }).start();
  }, [percent, animatedPercent]);

  const breath = useRef(new Animated.Value(0)).current;
  const sway = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const breathLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 1900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breath, { toValue: 0, duration: 1900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const swayLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(sway, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(sway, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    breathLoop.start();
    swayLoop.start();
    return () => {
      breathLoop.stop();
      swayLoop.stop();
    };
  }, [breath, sway]);

  const scale = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] });
  const rotate = sway.interpolate({ inputRange: [0, 1], outputRange: ['-1.2deg', '1.2deg'] });

  const isOverflowing = blend.fromIndex === STAGES.length - 1 && blend.toIndex === STAGES.length - 1;

  return (
    <View pointerEvents="none" style={{ width: size, height: size * (VIEW_H / VIEW_W), alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ width: '100%', height: '100%', transform: [{ scale }, { rotate }] }}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} style={StyleSheet.absoluteFill}>
          <Rect x={0} y={0} width={VIEW_W} height={VIEW_H} fill={sky} />
          <SeasonalAccents themeId={themeId} accent={accent} />
        </Svg>
        <View style={StyleSheet.absoluteFill}>
          <Image
            source={STAGES[blend.fromIndex].image}
            resizeMode="contain"
            style={[StyleSheet.absoluteFill, { opacity: 1 - blend.t }]}
          />
          {blend.toIndex !== blend.fromIndex ? (
            <Image
              source={STAGES[blend.toIndex].image}
              resizeMode="contain"
              style={[StyleSheet.absoluteFill, { opacity: blend.t }]}
            />
          ) : null}
        </View>
      </Animated.View>
      {isOverflowing ? <Bubbles /> : null}
    </View>
  );
}
