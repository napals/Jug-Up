import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Platform } from 'react-native';
const PREFS='hydrate:premiumPrefs:v2'; const CACHE='hydrate:premiumEntitlements:v1';
export const PRODUCT_IDS={monthly:'jugup_plus_monthly',yearly:'jugup_plus_yearly',lifetime:'jugup_plus_lifetime',seasons:'jugup_themes_seasons',holidays:'jugup_themes_holidays'};
export const DISPLAY_PRICES={monthly:'£0.99 / month',yearly:'£7.99 / year',lifetime:'£6.99 one-off'};
const DEFAULT={selectedTheme:'auto',birthday:'',demoPremium:false,analyticsRange:30,customTheme:null,unit:'ml',weatherAdjustEnabled:false}; let configured=false;
export async function getPremiumPrefs(){try{return{...DEFAULT,...JSON.parse(await AsyncStorage.getItem(PREFS)||'{}')}}catch{return DEFAULT}}
export async function savePremiumPrefs(changes){const next={...(await getPremiumPrefs()),...changes};await AsyncStorage.setItem(PREFS,JSON.stringify(next));return next}
function apiKey(){if(Platform.OS==='ios')return process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY||'';if(Platform.OS==='android')return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY||'';return ''}
// Direct runtime proof of what this build actually has inlined — masked so
// it's safe to show on-screen, but unambiguous about presence/absence.
export function apiKeyDiagnostic(){const k=apiKey();if(!k)return 'EMPTY (not inlined into this build)';return `present, ${k.length} chars, starts "${k.slice(0,5)}…"`}
export function isRevenueCatConfigured(){return Boolean(apiKey())&&Platform.OS!=='web'}
async function sdk(){if(!isRevenueCatConfigured())return null;try{const loaded=require('react-native-purchases');return loaded.default||loaded}catch{return null}}
export async function initialisePurchases(){const Purchases=await sdk();if(!Purchases)return{configured:false};if(!configured){await Purchases.configure({apiKey:apiKey()});configured=true}return{configured:true}}
function idsFrom(info){return Object.keys(info?.entitlements?.active||{})}
async function cache(ids){await AsyncStorage.setItem(CACHE,JSON.stringify(ids)).catch(()=>null)}
async function cached(){try{const ids=JSON.parse(await AsyncStorage.getItem(CACHE)||'[]');return Array.isArray(ids)?ids:[]}catch{return[]}}
export async function getPremiumStatus(){const prefs=await getPremiumPrefs();if(__DEV__&&prefs.demoPremium)return{premium:true,accessIds:['premium','seasons','holidays'],source:'demo',prefs};const fallback=await cached();const Purchases=await sdk();if(!Purchases)return{premium:fallback.includes('premium'),accessIds:fallback,source:'unconfigured',prefs};try{await initialisePurchases();const info=await Purchases.getCustomerInfo();const accessIds=idsFrom(info);await cache(accessIds);return{premium:accessIds.includes('premium'),accessIds,source:'store',prefs,info}}catch{return{premium:fallback.includes('premium'),accessIds:fallback,source:'offline',prefs}}}
export async function getOfferings(){const Purchases=await sdk();if(!Purchases)return null;await initialisePurchases();return Purchases.getOfferings()}
export async function purchasePackage(pkg){const Purchases=await sdk();if(!Purchases)throw new Error('Store purchases require a configured Android or iOS development build.');const result=await Purchases.purchasePackage(pkg);const ids=idsFrom(result.customerInfo);await cache(ids);return ids}
export async function restorePurchases(){const Purchases=await sdk();if(!Purchases)throw new Error('Restore purchases requires a configured Android or iOS development build.');const info=await Purchases.restorePurchases();const ids=idsFrom(info);await cache(ids);return ids}
async function sdkUi(){if(!isRevenueCatConfigured())return null;try{const loaded=require('react-native-purchases-ui');return loaded.default||loaded}catch{return null}}

// Presents RevenueCat's dashboard-configured paywall (design it under
// RevenueCat → Paywalls). Falls back to null on web/unconfigured so callers
// can show the in-app package list instead.
export async function presentPaywall(){const UI=await sdkUi();if(!UI)return null;await initialisePurchases();return UI.presentPaywall()}

// Only shows the paywall if the given entitlement isn't already active —
// useful for gating a locked feature without double-checking status yourself.
export async function presentPaywallIfNeeded(requiredEntitlementIdentifier='premium'){const UI=await sdkUi();if(!UI)return null;await initialisePurchases();return UI.presentPaywallIfNeeded({requiredEntitlementIdentifier})}

// RevenueCat's Customer Center — lets a subscriber manage/cancel their plan,
// see billing history, and contact support, without leaving the app.
export async function presentCustomerCenter(){const UI=await sdkUi();if(!UI)return false;await initialisePurchases();await UI.presentCustomerCenter();return true}

export async function openManageSubscriptions(){const status=await getPremiumStatus();const url=status.info?.managementURL;if(url)return Linking.openURL(url);return Linking.openURL(Platform.OS==='ios'?'https://apps.apple.com/account/subscriptions':'https://play.google.com/store/account/subscriptions')}
