import React from 'react';
import { Circle, Ellipse, Line, Path, Rect } from 'react-native-svg';

// A small, consistent character used across every theme background so the
// premium scenes read as one continuing mascot rather than ten unrelated
// illustrations. Styled after the "Hydr8 Squad" reference art: a round,
// chibi-proportioned jug with a black flip-top cap and bent straw, a white
// brow band, big sparkly eyes with lashes, blush cheeks, white mitten
// hands, and a front measurement window with tick marks. Body colour comes
// from the active theme's own palette; `accessory` swaps in a per-theme
// hat/prop matching that theme's outfit.
export default function ReusableCupMascot({ x = 0, y = 0, scale = 1, bodyColor = '#1E90FF', accentColor = '#4FD1E9', accessory = 'spring' }) {
  const t = `translate(${x} ${y}) scale(${scale})`;
  return (
    <React.Fragment>
      {/* round chibi body */}
      <Rect transform={t} x={-22} y={-6} width={44} height={50} rx={20} fill={bodyColor} />
      <Rect transform={t} x={-22} y={-6} width={15} height={50} rx={20} fill="#FFFFFF" opacity={0.15} />

      {/* neck + black flip-top cap */}
      <Rect transform={t} x={-9} y={-13} width={18} height={8} rx={3} fill={bodyColor} />
      <Rect transform={t} x={-11} y={-25} width={22} height={13} rx={5} fill="#1B1F27" />
      {/* bent straw */}
      <Path transform={t} d="M -6 -25 L -6 -35 Q -6 -39 -10 -39" stroke={accentColor} strokeWidth={4} strokeLinecap="round" fill="none" />
      <Circle transform={t} cx={-10} cy={-39} r={2.2} fill={accentColor} />
      {/* small carry loop at the side of the cap */}
      <Path transform={t} d="M 9 -21 Q 16 -21 16 -15" stroke={bodyColor} strokeWidth={2.4} strokeLinecap="round" fill="none" />
      <Ellipse transform={t} cx={16} cy={-11} rx={3.4} ry={4.2} fill="none" stroke={bodyColor} strokeWidth={2.4} />

      {/* white brow band across the top of the head */}
      <Rect transform={t} x={-22} y={1} width={44} height={7} fill="#FFFFFF" opacity={0.92} />

      {/* face */}
      <Circle transform={t} cx={-8} cy={13} r={5} fill="#FFFFFF" />
      <Circle transform={t} cx={8} cy={13} r={5} fill="#FFFFFF" />
      <Circle transform={t} cx={-8} cy={13} r={3.3} fill="#12203A" />
      <Circle transform={t} cx={8} cy={13} r={3.3} fill="#12203A" />
      <Circle transform={t} cx={-6.4} cy={11.2} r={1.1} fill="#FFFFFF" />
      <Circle transform={t} cx={9.6} cy={11.2} r={1.1} fill="#FFFFFF" />
      <Path transform={t} d="M -13 8 Q -8 5 -3 8" stroke="#12203A" strokeWidth={1.4} strokeLinecap="round" fill="none" />
      <Path transform={t} d="M 3 8 Q 8 5 13 8" stroke="#12203A" strokeWidth={1.4} strokeLinecap="round" fill="none" />
      <Circle transform={t} cx={-14} cy={19} r={3.2} fill="#FFB0C0" opacity={0.65} />
      <Circle transform={t} cx={14} cy={19} r={3.2} fill="#FFB0C0" opacity={0.65} />
      <Path transform={t} d="M -6 20 Q 0 25 6 20" stroke="#12203A" strokeWidth={2} strokeLinecap="round" fill="none" />

      {/* measurement window with tick marks */}
      <Rect transform={t} x={-15} y={23} width={30} height={17} rx={4} fill="#FFFFFF" opacity={0.28} />
      <Line transform={t} x1={-15} y1={28} x2={-12} y2={28} stroke="#FFFFFF" strokeWidth={1.4} opacity={0.85} />
      <Line transform={t} x1={-15} y1={33} x2={-12} y2={33} stroke="#FFFFFF" strokeWidth={1.4} opacity={0.85} />
      <Line transform={t} x1={-15} y1={38} x2={-12} y2={38} stroke="#FFFFFF" strokeWidth={1.4} opacity={0.85} />

      {/* stubby arms with round mitten hands */}
      <Path transform={t} d="M -22 26 Q -33 28 -34 36" stroke={bodyColor} strokeWidth={6} strokeLinecap="round" fill="none" />
      <Path transform={t} d="M 22 26 Q 33 28 34 36" stroke={bodyColor} strokeWidth={6} strokeLinecap="round" fill="none" />
      <Circle transform={t} cx={-34} cy={38} r={6} fill="#FFFFFF" />
      <Circle transform={t} cx={34} cy={38} r={6} fill="#FFFFFF" />

      <CupAccessory x={x} y={y} scale={scale} accentColor={accentColor} kind={accessory} />
    </React.Fragment>
  );
}

function CupAccessory({ x, y, scale, accentColor, kind }) {
  const t = `translate(${x} ${y}) scale(${scale})`;
  switch (kind) {
    case 'spring':
      // flower crown
      return (
        <React.Fragment>
          {[-13, -4, 5, 14].map((dx, i) => (
            <Circle key={i} transform={t} cx={dx} cy={-13 - (i % 2) * 3} r={4} fill={i % 2 ? '#F28AB2' : '#FFD54F'} />
          ))}
        </React.Fragment>
      );
    case 'summer':
      // straw sun hat + sunglasses
      return (
        <React.Fragment>
          <Ellipse transform={t} cx={0} cy={-15} rx={22} ry={5} fill="#D9A85C" />
          <Path transform={t} d="M -13 -15 Q 0 -27 13 -15 Z" fill="#E8BE7A" />
          <Rect transform={t} x={-13} y={11} width={10} height={6} rx={3} fill="#0B2545" />
          <Rect transform={t} x={3} y={11} width={10} height={6} rx={3} fill="#0B2545" />
          <Line transform={t} x1={-3} y1={14} x2={3} y2={14} stroke="#0B2545" strokeWidth={2} />
        </React.Fragment>
      );
    case 'autumn':
      // knit beanie + plaid scarf
      return (
        <React.Fragment>
          <Path transform={t} d="M -13 -13 Q 0 -30 13 -13 Z" fill="#D97706" />
          <Rect transform={t} x={-14} y={-15} width={28} height={5} rx={2.5} fill="#B45309" />
          <Circle transform={t} cx={0} cy={-30} r={3.6} fill="#EA9E2A" />
          <Path transform={t} d="M -18 5 L 18 5" stroke="#B45309" strokeWidth={6} strokeLinecap="round" />
        </React.Fragment>
      );
    case 'winter':
      // earmuffs + snowflake scarf
      return (
        <React.Fragment>
          <Path transform={t} d="M -16 6 Q -18 -14 0 -16 Q 18 -14 16 6" stroke="#4979C6" strokeWidth={3} fill="none" strokeLinecap="round" />
          <Circle transform={t} cx={-17} cy={9} r={6} fill="#EDF5FF" stroke="#9AD9EA" strokeWidth={2} />
          <Circle transform={t} cx={17} cy={9} r={6} fill="#EDF5FF" stroke="#9AD9EA" strokeWidth={2} />
          <Path transform={t} d="M -18 -2 L 16 5" stroke="#4979C6" strokeWidth={6} strokeLinecap="round" />
          <Circle transform={t} cx={-2} cy={2} r={1.6} fill="#FFFFFF" />
        </React.Fragment>
      );
    case 'halloween':
      // cape with a bat clasp, no hat
      return (
        <React.Fragment>
          <Path transform={t} d="M -19 0 Q 0 12 19 0 L 24 34 Q 0 44 -24 34 Z" fill="#2D1943" opacity={0.92} />
          <Circle transform={t} cx={0} cy={0} r={3} fill="#A855F7" />
          <Path transform={t} d="M -4 -1 Q -1 -4 0 -1 Q 1 -4 4 -1 Q 2 2 0 1 Q -2 2 -4 -1 Z" fill="#160D23" />
        </React.Fragment>
      );
    case 'christmas':
      // santa hat + a hint of string lights
      return (
        <React.Fragment>
          <Path transform={t} d="M -12 -13 Q -2 -32 16 -18 Q 10 -16 6 -13 Z" fill="#B91C1C" />
          <Ellipse transform={t} cx={-12} cy={-13} rx={14} ry={3.4} fill="#FFFFFF" />
          <Circle transform={t} cx={16} cy={-18} r={3.4} fill="#FFFFFF" />
          {[-16, -4, 8, 20].map((dx, i) => (
            <Circle key={i} transform={t} cx={dx} cy={30 + (i % 2) * 3} r={2} fill={i % 2 ? '#FBBF24' : '#4ADE80'} />
          ))}
        </React.Fragment>
      );
    case 'newyear':
      return (
        <React.Fragment>
          <Path transform={t} d="M -11 -14 L 11 -14 L 0 -34 Z" fill="#8B5CF6" />
          <Circle transform={t} cx={0} cy={-34} r={3} fill="#F4C95D" />
          {[[-23, -16], [23, -14], [0, -40]].map(([dx, dy], i) => (
            <Path key={i} transform={t} d={`M ${dx} ${dy} l 2 5 l 5 2 l -5 2 l -2 5 l -2 -5 l -5 -2 l 5 -2 z`} fill="#F4C95D" />
          ))}
        </React.Fragment>
      );
    case 'valentine':
      // bow on the head + a small heart held near one hand
      return (
        <React.Fragment>
          <Path transform={t} d="M -1 -14 L -10 -19 Q -13 -14 -10 -10 Z" fill="#E11D70" />
          <Path transform={t} d="M -1 -14 L 8 -19 Q 11 -14 8 -10 Z" fill="#E11D70" />
          <Circle transform={t} cx={-1} cy={-14} r={2.4} fill="#9D174D" />
          <Path transform={t} d="M 34 30 C 31 25 24 28 27 33 C 29 36 34 39 34 39 C 34 39 39 36 41 33 C 44 28 37 25 34 30 Z" fill="#FB7185" />
        </React.Fragment>
      );
    case 'birthday':
      // party hat + a held cupcake
      return (
        <React.Fragment>
          <Path transform={t} d="M -11 -14 L 11 -14 L 0 -36 Z" fill="#7C3AED" />
          <Circle transform={t} cx={0} cy={-36} r={3.5} fill="#F59E0B" />
          <Path transform={t} d="M 28 34 L 40 34 L 38 42 L 30 42 Z" fill="#F59E0B" />
          <Path transform={t} d="M 27 34 Q 34 26 41 34 Z" fill="#FFFFFF" />
          <Path transform={t} d="M 34 26 L 34 22" stroke="#F59E0B" strokeWidth={1.6} />
          <Circle transform={t} cx={34} cy={21} r={1.4} fill="#FBBF24" />
        </React.Fragment>
      );
    case 'champion':
      return (
        <React.Fragment>
          <Path transform={t} d="M -12 -16 L 12 -16 L 8 -26 L 0 -20 L -8 -26 Z" fill="#F5C451" />
          <Path transform={t} d="M -4 -6 L 4 -6 L 0 30 Z" fill={accentColor} opacity={0.5} />
          <Circle transform={t} cx={0} cy={30} r={7.5} fill="#F5C451" stroke="#FFE39A" strokeWidth={2} />
        </React.Fragment>
      );
    default:
      return null;
  }
}
