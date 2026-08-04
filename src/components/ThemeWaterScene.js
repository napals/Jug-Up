import React from 'react';
import Svg, { Circle, Ellipse, Image, Path, Rect } from 'react-native-svg';

const VIEW_W = 220;
const VIEW_H = 140;

// The real illustrated mascot artwork, one PNG per theme. Each already has
// its own baked-in styling (colours, outfit, props) so — unlike the vector
// fallback these replaced — these don't need bodyColor/accentColor props.
const MASCOT_IMAGES = {
  spring: require('../../assets/mascots/spring.png'),
  summer: require('../../assets/mascots/summer.png'),
  autumn: require('../../assets/mascots/autumn.png'),
  winter: require('../../assets/mascots/winter.png'),
  halloween: require('../../assets/mascots/halloween.png'),
  christmas: require('../../assets/mascots/christmas.png'),
  newyear: require('../../assets/mascots/newyear.png'),
  valentine: require('../../assets/mascots/valentine.png'),
  birthday: require('../../assets/mascots/birthday.png'),
  champion: require('../../assets/mascots/champion.png'),
};

function Mascot({ themeId, x, y, width, height }) {
  const source = MASCOT_IMAGES[themeId];
  if (!source) return null;
  return <Image href={source} x={x} y={y} width={width} height={height} preserveAspectRatio="xMidYMax meet" />;
}

// Each premium theme gets a water feature that's symbolic of its time of
// year (a mountain spring for Spring, a frozen waterfall for Winter, a
// bubbling cauldron for Halloween, etc.) plus the real illustrated mascot
// dressed for the occasion. Water colours are pulled from the theme's own
// palette so the scene always matches the rest of that theme.
function Scene({ themeId, colors }) {
  const sky = colors.soft || colors.background;
  const water = colors.primary;
  const waterDark = colors.primaryDark;
  const accent = colors.accent;

  switch (themeId) {
    case 'spring':
      return (
        <>
          <Rect x={0} y={0} width={VIEW_W} height={VIEW_H} fill={sky} />
          <Path d="M 150 0 L 190 60 L 170 60 L 200 100 L 100 100 L 140 55 L 120 55 Z" fill="#BFD8C4" />
          <Path d="M 150 20 L 150 90" stroke="#FFFFFF" strokeWidth={7} opacity={0.85} />
          <Ellipse cx={150} cy={100} rx={70} ry={14} fill={water} />
          <Ellipse cx={150} cy={100} rx={70} ry={14} fill={waterDark} opacity={0.25} />
          {[30, 55, 80].map((cx, i) => (
            <Circle key={i} cx={cx} cy={122 - (i % 2) * 6} r={5} fill={i % 2 ? '#F28AB2' : '#FFD54F'} />
          ))}
          <Mascot themeId="spring" x={25} y={35} width={60} height={90} />
        </>
      );
    case 'summer':
      return (
        <>
          <Rect x={0} y={0} width={VIEW_W} height={90} fill={sky} />
          <Circle cx={185} cy={30} r={20} fill={accent} />
          <Rect x={0} y={90} width={VIEW_W} height={50} fill={water} />
          <Path d="M 0 90 q 18 -8 36 0 t 36 0 t 36 0 t 36 0 t 36 0 t 36 0 v 6 h -220 z" fill={waterDark} opacity={0.5} />
          <Mascot themeId="summer" x={121} y={50} width={57} height={85} />
        </>
      );
    case 'autumn':
      return (
        <>
          <Rect x={0} y={0} width={VIEW_W} height={95} fill={sky} />
          <Ellipse cx={110} cy={112} rx={100} ry={20} fill={water} />
          <Ellipse cx={110} cy={112} rx={100} ry={20} fill={waterDark} opacity={0.2} />
          {[[40, 55], [90, 35], [150, 60], [180, 40]].map(([cx, cy], i) => (
            <Path key={i} d={`M ${cx} ${cy} q 6 -6 10 0 q -4 6 -10 0 Z`} fill={i % 2 ? accent : water} />
          ))}
          <Mascot themeId="autumn" x={80} y={40} width={60} height={90} />
        </>
      );
    case 'winter':
      return (
        <>
          <Rect x={0} y={0} width={VIEW_W} height={VIEW_H} fill={sky} />
          <Path d="M 30 0 L 55 70 L 40 70 L 62 110 L 8 110 L 30 68 L 16 68 Z" fill="#DCEAF8" />
          <Path d="M 30 10 L 30 95" stroke="#FFFFFF" strokeWidth={6} opacity={0.9} />
          <Ellipse cx={130} cy={118} rx={90} ry={16} fill={water} />
          <Ellipse cx={130} cy={112} rx={70} ry={9} fill="#EDF5FF" opacity={0.8} />
          {[60, 100, 150, 190].map((cx, i) => (
            <Circle key={i} cx={cx} cy={20 + (i % 2) * 18} r={2.6} fill="#EDF5FF" />
          ))}
          <Mascot themeId="winter" x={112} y={47} width={57} height={85} />
        </>
      );
    case 'halloween':
      return (
        <>
          <Rect x={0} y={0} width={VIEW_W} height={VIEW_H} fill={sky} />
          <Circle cx={40} cy={30} r={16} fill={accent} opacity={0.6} />
          <Ellipse cx={110} cy={118} rx={95} ry={18} fill="#160D23" opacity={0.4} />
          <Path d="M 80 70 Q 110 55 140 70 L 148 108 Q 110 122 72 108 Z" fill={waterDark} />
          <Ellipse cx={110} cy={70} rx={34} ry={10} fill={water} />
          {[0, 1, 2].map((i) => (
            <Ellipse key={i} cx={92 + i * 18} cy={64 - (i % 2) * 4} rx={5} ry={3} fill={accent} opacity={0.8} />
          ))}
          <Path d="M 165 90 a 12 12 0 1 0 0.1 0" fill={accent} opacity={0.9} />
          <Mascot themeId="halloween" x={32} y={43} width={57} height={85} />
        </>
      );
    case 'christmas':
      return (
        <>
          <Rect x={0} y={0} width={VIEW_W} height={VIEW_H} fill={sky} />
          <Ellipse cx={110} cy={116} rx={95} ry={17} fill={accent} opacity={0.85} />
          <Ellipse cx={110} cy={116} rx={95} ry={17} fill="none" stroke="#FFFFFF" strokeWidth={2} opacity={0.6} />
          <Path d="M 20 8 L 34 8 L 27 26 Z" fill="#FFFFFF" opacity={0.9} />
          <Path d="M 190 4 L 204 4 L 197 22 Z" fill="#FFFFFF" opacity={0.9} />
          <Mascot themeId="christmas" x={122} y={45} width={57} height={85} />
        </>
      );
    case 'newyear':
      return (
        <>
          <Rect x={0} y={0} width={VIEW_W} height={VIEW_H} fill={sky} />
          <Ellipse cx={110} cy={118} rx={95} ry={16} fill={water} opacity={0.9} />
          <Path d="M 110 40 L 110 100" stroke={accent} strokeWidth={4} opacity={0.7} />
          <Ellipse cx={110} cy={40} rx={26} ry={8} fill={accent} opacity={0.8} />
          {[[40, 30], [180, 40], [60, 15], [160, 15]].map(([cx, cy], i) => (
            <Path key={i} d={`M ${cx} ${cy} l 2 6 l 6 2 l -6 2 l -2 6 l -2 -6 l -6 -2 l 6 -2 z`} fill={accent} />
          ))}
          <Mascot themeId="newyear" x={122} y={47} width={57} height={85} />
        </>
      );
    case 'valentine':
      return (
        <>
          <Rect x={0} y={0} width={VIEW_W} height={VIEW_H} fill={sky} />
          <Path
            d="M 110 60 C 96 44 68 58 78 78 C 88 96 110 112 110 112 C 110 112 132 96 142 78 C 152 58 124 44 110 60 Z"
            fill={water}
          />
          {[30, 60, 160, 190].map((cx, i) => (
            <Ellipse key={i} cx={cx} cy={20 + (i % 2) * 30} rx={5} ry={3} fill={accent} opacity={0.8} />
          ))}
          <Mascot themeId="valentine" x={122} y={47} width={57} height={85} />
        </>
      );
    case 'birthday':
      return (
        <>
          <Rect x={0} y={0} width={VIEW_W} height={VIEW_H} fill={sky} />
          <Ellipse cx={110} cy={118} rx={95} ry={16} fill={water} />
          {[[30, 30, accent], [70, 15, waterDark], [150, 20, accent], [190, 40, waterDark]].map(([cx, cy, c], i) => (
            <Rect key={i} x={cx} y={cy} width={5} height={5} fill={c} transform={`rotate(${i * 35} ${cx} ${cy})`} />
          ))}
          <Mascot themeId="birthday" x={122} y={47} width={57} height={85} />
        </>
      );
    case 'champion':
      return (
        <>
          <Rect x={0} y={0} width={VIEW_W} height={VIEW_H} fill={sky} />
          <Path d="M 90 30 L 130 30 L 150 60 L 110 130 L 70 60 Z" fill={accent} opacity={0.35} />
          <Ellipse cx={110} cy={118} rx={95} ry={16} fill={water} />
          <Ellipse cx={110} cy={112} rx={60} ry={7} fill={accent} opacity={0.7} />
          <Mascot themeId="champion" x={122} y={45} width={57} height={85} />
        </>
      );
    default:
      // Free themes (standard/midnight) and any unrecognized id have no
      // dedicated scene — render nothing rather than silently reusing
      // whichever case happened to sit last in this switch.
      return null;
  }
}

export default function ThemeWaterScene({ themeId, colors, width = 220 }) {
  const height = width * (VIEW_H / VIEW_W);
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}>
      <Scene themeId={themeId} colors={colors} />
    </Svg>
  );
}
