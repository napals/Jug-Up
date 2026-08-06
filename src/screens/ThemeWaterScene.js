import React from 'react';
import Svg, { Image } from 'react-native-svg';

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

// Real illustrated backdrop scenes, one per theme, pre-cropped to the exact
// VIEW_W:VIEW_H aspect ratio. These replace the old flat-colour/hand-drawn
// vector scenery entirely — each already has its own rich atmospheric detail
// (falling snow, fireworks, floating hearts, confetti, etc.) baked in.
const BACKGROUND_IMAGES = {
  spring: require('../../assets/theme-banners/spring.png'),
  summer: require('../../assets/theme-banners/summer.png'),
  autumn: require('../../assets/theme-banners/autumn.png'),
  winter: require('../../assets/theme-banners/winter.png'),
  halloween: require('../../assets/theme-banners/halloween.png'),
  christmas: require('../../assets/theme-banners/christmas.png'),
  newyear: require('../../assets/theme-banners/newyear.png'),
  valentine: require('../../assets/theme-banners/valentine.png'),
  birthday: require('../../assets/theme-banners/birthday.png'),
  champion: require('../../assets/theme-banners/champion.png'),
};

function Background({ themeId }) {
  const source = BACKGROUND_IMAGES[themeId];
  if (!source) return null;
  return <Image href={source} x={0} y={0} width={VIEW_W} height={VIEW_H} preserveAspectRatio="xMidYMid slice" />;
}

function Mascot({ themeId, x, y, width, height }) {
  const source = MASCOT_IMAGES[themeId];
  if (!source) return null;
  return <Image href={source} x={x} y={y} width={width} height={height} preserveAspectRatio="xMidYMax meet" />;
}

// Each premium theme shows its real illustrated backdrop scene plus Jubi,
// dressed for the occasion, positioned the same way as before.
function Scene({ themeId }) {
  switch (themeId) {
    case 'spring':
      return (
        <>
          <Background themeId="spring" />
          <Mascot themeId="spring" x={25} y={35} width={60} height={90} />
        </>
      );
    case 'summer':
      return (
        <>
          <Background themeId="summer" />
          <Mascot themeId="summer" x={121} y={50} width={57} height={85} />
        </>
      );
    case 'autumn':
      return (
        <>
          <Background themeId="autumn" />
          <Mascot themeId="autumn" x={80} y={40} width={60} height={90} />
        </>
      );
    case 'winter':
      return (
        <>
          <Background themeId="winter" />
          <Mascot themeId="winter" x={112} y={47} width={57} height={85} />
        </>
      );
    case 'halloween':
      return (
        <>
          <Background themeId="halloween" />
          <Mascot themeId="halloween" x={32} y={43} width={57} height={85} />
        </>
      );
    case 'christmas':
      return (
        <>
          <Background themeId="christmas" />
          <Mascot themeId="christmas" x={122} y={45} width={57} height={85} />
        </>
      );
    case 'newyear':
      return (
        <>
          <Background themeId="newyear" />
          <Mascot themeId="newyear" x={122} y={47} width={57} height={85} />
        </>
      );
    case 'valentine':
      return (
        <>
          <Background themeId="valentine" />
          <Mascot themeId="valentine" x={122} y={47} width={57} height={85} />
        </>
      );
    case 'birthday':
      return (
        <>
          <Background themeId="birthday" />
          <Mascot themeId="birthday" x={122} y={47} width={57} height={85} />
        </>
      );
    case 'champion':
      return (
        <>
          <Background themeId="champion" />
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
      <Scene themeId={themeId} />
    </Svg>
  );
}