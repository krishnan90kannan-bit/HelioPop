import mobileAds, {
  AdEventType,
  RewardedAd,
  RewardedAdEventType,
} from 'react-native-google-mobile-ads';
import { REWARDED_AD_UNIT_ID } from './adUnits';

let rewardedAd: RewardedAd | null = null;
let rewardedLoaded = false;
let adsInitialized = false;
let isShowingAd = false;

function attachRewardedListeners(ad: RewardedAd) {
  ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
    rewardedLoaded = true;
  });
  ad.addAdEventListener(AdEventType.CLOSED, () => {
    rewardedLoaded = false;
    isShowingAd = false;
    preloadRewardedAd();
  });
  ad.addAdEventListener(AdEventType.ERROR, () => {
    rewardedLoaded = false;
    isShowingAd = false;
    preloadRewardedAd();
  });
}

export function preloadRewardedAd() {
  if (!adsInitialized || isShowingAd) {
    return;
  }
  rewardedLoaded = false;
  rewardedAd = RewardedAd.createForAdRequest(REWARDED_AD_UNIT_ID, {
    requestNonPersonalizedAdsOnly: true,
  });
  attachRewardedListeners(rewardedAd);
  rewardedAd.load();
}

export async function initAds() {
  if (adsInitialized) {
    return;
  }
  await mobileAds().initialize();
  adsInitialized = true;
  preloadRewardedAd();
}

const canShowRewardedAd = () =>
  adsInitialized && rewardedAd !== null && rewardedLoaded && !isShowingAd;

export function showVideoAdBetweenPlays(onDone: () => void) {
  if (!canShowRewardedAd() || !rewardedAd) {
    onDone();
    if (adsInitialized && !isShowingAd) {
      preloadRewardedAd();
    }
    return;
  }

  let finished = false;
  const finish = () => {
    if (finished) {
      return;
    }
    finished = true;
    isShowingAd = false;
    rewardedLoaded = false;
    onDone();
    preloadRewardedAd();
  };

  const closeSub = rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
    closeSub();
    errorSub();
    finish();
  });

  const errorSub = rewardedAd.addAdEventListener(AdEventType.ERROR, () => {
    closeSub();
    errorSub();
    finish();
  });

  isShowingAd = true;

  try {
    const showResult = rewardedAd.show();
    if (showResult && typeof showResult.catch === 'function') {
      showResult.catch(() => {
        closeSub();
        errorSub();
        finish();
      });
    }
  } catch {
    closeSub();
    errorSub();
    finish();
  }
}
