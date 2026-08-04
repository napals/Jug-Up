import React, { useState } from 'react';
import { Platform, View } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

// Real Android banner unit is live below. In __DEV__ builds this still uses
// Google's own test units — never interact with your real ads while
// developing/testing, even accidentally, or Google can flag the account for
// invalid activity.
const AD_UNIT_ID = __DEV__
  ? TestIds.BANNER
  : Platform.select({
      android: 'ca-app-pub-2914941028455030/1433416414',
      ios: 'ca-app-pub-2914941028455030/8704833551',
    });

// Free users see this; Jug Up Plus subscribers never do — ad-free is one of
// the actual perks of upgrading, alongside themes/analytics/etc.
// Rendered as a persistent global footer (sibling of the whole navigator in
// App.js), so it sits below every screen. Because it lives outside any
// individual screen's own SafeAreaView, it needs its own safe-area padding
// or it collides with Android's gesture/button nav bar or the iOS home
// indicator — hence useSafeAreaInsets() below.
export default function AdBanner() {
  const { premium, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [failed, setFailed] = useState(false);

  if (premium || Platform.OS === 'web' || failed) return null;

  return (
    <View
      style={{
        alignItems: 'center',
        paddingTop: 6,
        paddingBottom: Math.max(insets.bottom, 6),
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderTopColor: colors.border,
      }}
    >
      <BannerAd
        unitId={AD_UNIT_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdFailedToLoad={() => setFailed(true)}
      />
    </View>
  );
}
