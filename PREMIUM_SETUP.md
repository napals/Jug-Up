# Hydrate Plus store setup

## RevenueCat

1. Create iOS and Android apps in RevenueCat.
2. Create an entitlement named `premium`.
3. Create products in App Store Connect / Google Play:
   - `hydrate_plus_monthly`
   - `hydrate_plus_annual`
   - `hydrate_plus_lifetime`
   - `hydrate_themes_seasons`
   - `hydrate_themes_holidays`
4. Attach the subscription/lifetime products to a RevenueCat offering and make it current.
5. Copy `.env.example` to `.env` and set the public SDK keys.
6. Build a development client. Purchases cannot be tested in Expo Go:

```powershell
npx expo install react-native-purchases
npx expo prebuild --clean
npx expo run:android
```

The web build and Expo Go expose a developer demo entitlement in the Hydrate Plus screen. This is for UI testing only and is not used as production purchase verification.

## Pricing defaults

- Monthly: £1.99
- Annual: £14.99
- Lifetime launch: £29.99
- Seasonal pack: £2.49
- Holiday pack: £2.49

The UI should ultimately display localized prices supplied by the store offering. Current text is a fallback until RevenueCat products are configured.
