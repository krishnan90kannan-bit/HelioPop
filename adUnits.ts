import { Platform } from 'react-native';

/**
 * AdMob IDs for HelioPop (publisher: ca-app-pub-9178149071836882)
 *
 * App IDs use ~   e.g. ca-app-pub-XXXX~YYYY  → app.json + AndroidManifest
 * Ad units use /  e.g. ca-app-pub-XXXX/YYYY → ads.ts (RewardedAd)
 *
 * Do NOT edit node_modules/.../TestIds.ts — changes are lost on npm install.
 */

export const ADMOB_APP_IDS = {
  android: 'ca-app-pub-9178149071836882~9927740335',
  ios: 'ca-app-pub-9178149071836882~3043979232',
} as const;

/** Rewarded ad unit IDs (create in AdMob → Apps → Ad units → Rewarded) */
export const REWARDED_AD_UNIT_IDS = {
  android: 'ca-app-pub-9178149071836882/7113874733',
  // Replace with your iOS Rewarded unit from AdMob if different:
  ios: 'ca-app-pub-9178149071836882/2469264169',
} as const;

export const REWARDED_AD_UNIT_ID =
  Platform.select({
    android: REWARDED_AD_UNIT_IDS.android,
    ios: REWARDED_AD_UNIT_IDS.ios,
  }) ?? REWARDED_AD_UNIT_IDS.android;
