import React, { useMemo, useRef, useState } from 'react';
import { View, PanResponder, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

const BAR_HEIGHT = 40;
const THUMB_SIZE = 30;
// Fixed saturation/lightness so every point along the bar is a distinct,
// clearly readable colour — only hue changes as you drag.
const SATURATION = 70;
const LIGHTNESS = 55;

function hslToHex(h, s, l) {
  const sat = s / 100;
  const light = l / 100;
  const k = (n) => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n) => light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x) => Math.round(255 * x).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

// Rough inverse of the above, just enough to place the thumb correctly when
// an existing colour (e.g. one saved earlier) is loaded into the form.
function hexToHue(hex) {
  if (typeof hex !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(hex)) return 0;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  if (delta === 0) return 0;
  let hue;
  if (max === r) hue = ((g - b) / delta) % 6;
  else if (max === g) hue = (b - r) / delta + 2;
  else hue = (r - g) / delta + 4;
  hue *= 60;
  return hue < 0 ? hue + 360 : hue;
}

const GRADIENT_STOPS = [
  { offset: '0%', color: 'hsl(0,70%,55%)' },
  { offset: '16.6%', color: 'hsl(60,70%,55%)' },
  { offset: '33.3%', color: 'hsl(120,70%,55%)' },
  { offset: '50%', color: 'hsl(180,70%,55%)' },
  { offset: '66.6%', color: 'hsl(240,70%,55%)' },
  { offset: '83.3%', color: 'hsl(300,70%,55%)' },
  { offset: '100%', color: 'hsl(360,70%,55%)' },
];

// A draggable full-hue colour bar — tap or drag anywhere along it to pick
// any colour, rather than choosing from a small fixed set of swatches.
export default function ColorBar({ value, onChange, width = 280 }) {
  const barRef = useRef(null);
  const pageXRef = useRef(0);
  const [hue, setHue] = useState(() => hexToHue(value));

  const updateFromPageX = (pageX) => {
    const localX = Math.max(0, Math.min(pageX - pageXRef.current, width));
    const nextHue = (localX / width) * 360;
    setHue(nextHue);
    onChange(hslToHex(nextHue, SATURATION, LIGHTNESS));
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          if (barRef.current) {
            barRef.current.measure((_x, _y, _w, _h, px) => {
              pageXRef.current = px;
              updateFromPageX(evt.nativeEvent.pageX);
            });
          }
        },
        onPanResponderMove: (evt) => updateFromPageX(evt.nativeEvent.pageX),
      }),
    [width]
  );

  const thumbLeft = Math.max(0, Math.min((hue / 360) * width, width)) - THUMB_SIZE / 2;

  return (
    <View
      ref={barRef}
      style={[styles.wrap, { width }]}
      {...panResponder.panHandlers}
      accessibilityRole="adjustable"
      accessibilityLabel="Cup colour picker"
    >
      <Svg width={width} height={BAR_HEIGHT} style={styles.bar}>
        <Defs>
          <LinearGradient id="hueBar" x1="0" y1="0" x2="1" y2="0">
            {GRADIENT_STOPS.map((stop) => (
              <Stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
            ))}
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={BAR_HEIGHT} rx={BAR_HEIGHT / 2} fill="url(#hueBar)" />
      </Svg>
      <View
        pointerEvents="none"
        style={[
          styles.thumb,
          { left: thumbLeft, top: (BAR_HEIGHT - THUMB_SIZE) / 2, backgroundColor: hslToHex(hue, SATURATION, LIGHTNESS) },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: BAR_HEIGHT, justifyContent: 'center' },
  bar: { borderRadius: BAR_HEIGHT / 2, overflow: 'hidden' },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
});