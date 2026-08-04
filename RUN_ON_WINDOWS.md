# Hydrate v1.3.1 — Windows setup

## Install and verify

```powershell
npm install
npm run lint
npm run test:all
npx expo-doctor
npx expo start --clear --web
```

## Test premium UI without stores

Open **Settings → Upgrade to Hydrate Plus** and enable **Developer demo entitlement**. This is only available in development and lets you test themes, analytics, challenges, custom themes and exports on web/Expo Go.

## Test real purchases

1. Follow `PREMIUM_SETUP.md` and create the RevenueCat entitlement/products.
2. Copy `.env.example` to `.env` and add the public RevenueCat SDK keys.
3. Use a native development build; purchases do not run in Expo Go:

```powershell
npx expo prebuild --clean
npx expo run:android
```

## Premium regression checklist

- Free users remain on Hydrate Blue or Midnight and can use fixed reminders.
- Locked themes preview for 30 seconds and open the paywall when selected.
- Hydrate Plus enables seasonal auto-switching and adaptive reminders.
- Halloween overrides Autumn from 15 October through 2 November.
- Christmas runs 1–26 December; New Year runs 27 December–7 January.
- Birthday theme uses the saved month/day.
- Champion theme unlocks at a 30-day streak.
- Analytics loads 7, 30 and 90-day views.
- Challenges calculate from saved drink/goal history.
- CSV, PDF and JSON backup/export actions work.
- Restore purchases refreshes entitlement state.
