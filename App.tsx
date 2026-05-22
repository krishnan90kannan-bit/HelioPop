import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  Easing,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Vibration,
  Image,
  BackHandler,
  AppState,
  Platform,
  type AppStateStatus,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Sound from 'react-native-sound';
import TcpSocket from 'react-native-tcp-socket';
import NetInfo from '@react-native-community/netinfo';
import {initAds, preloadRewardedAd, showVideoAdBetweenPlays} from './ads';
import {
  cancelMusicFade,
  crossfadeTracks,
  CROSSFADE_MS,
  FADE_IN_MS,
  FADE_OUT_MS,
  fadeSoundVolume,
  initAudioSession,
  MUSIC_VOLUME,
  startLoopingTrack,
} from './audio';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');
const IOS_TOP_PADDING = Platform.OS === 'ios' ? 20 : 0;

const BALLOON_COLORS = [
  '#FF6B6B', '#4ECDC4', '#FFE66D', '#A855F7', '#FF8A5C',
  '#6C5CE7', '#00B894', '#FD79A8', '#0984E3', '#FDCB6E',
];
const BALLOON_FACES = ['😊', '😄', '🤩', '😆', '🥳', '😋', '🤪', '😎'];
type BalloonShape = 'round' | 'oval' | 'heart' | 'long' | 'wide';
const BALLOON_SHAPES: BalloonShape[] = ['round', 'oval', 'heart', 'long', 'wide'];
const CONFETTI_COLORS = [
  '#FF6B6B', '#4ECDC4', '#FFE66D', '#A855F7', '#FF8A5C',
  '#6C5CE7', '#00B894', '#FD79A8', '#0984E3', '#FDCB6E',
  '#E17055', '#74B9FF', '#55EFC4', '#FF7675', '#A29BFE',
];
const BALLOON_WIDTH = 70;
const BALLOON_HEIGHT = 78;
const CONFETTI_COUNT = 16;

type BalloonSpecialType =
  | 'normal'
  | 'golden'
  | 'bomb'
  | 'devil'
  | 'frozen'
  | 'tiny'
  | 'giant'
  | 'ghost';
type PowerUpType = 'slowmo' | 'double' | 'freeze' | null;
type GameMode = 'levels' | 'survival' | 'timed';

interface Achievement {
  id: string;
  name: string;
  icon: string;
  desc: string;
}

const ACHIEVEMENTS: Achievement[] = [
  {id: 'first_pop', name: 'First Pop', icon: '🎈', desc: 'Pop your first balloon'},
  {id: 'perfect', name: 'Perfect Round', icon: '💯', desc: 'Pop every balloon in a level'},
  {id: 'combo_king', name: 'Combo King', icon: '🔥', desc: 'Reach a 10x combo'},
  {id: 'speed_demon', name: 'Speed Demon', icon: '🚀', desc: 'Beat Turbo Mode'},
  {id: 'night_owl', name: 'Night Owl', icon: '🦉', desc: 'Beat Night Sky level'},
  {id: 'deep_diver', name: 'Deep Diver', icon: '🐠', desc: 'Beat Underwater level'},
  {id: 'astronaut', name: 'Astronaut', icon: '🧑‍🚀', desc: 'Beat Space level'},
  {id: 'galaxy_master', name: 'Galaxy Master', icon: '🌌', desc: 'Beat Galaxy Boss level'},
  {id: 'golden_touch', name: 'Golden Touch', icon: '✨', desc: 'Pop 10 golden balloons total'},
  {id: 'survivor', name: 'Survivor', icon: '🛡️', desc: 'Score 20+ in Survival mode'},
  {id: 'time_lord', name: 'Time Lord', icon: '⏱️', desc: 'Score 30+ in Timed mode'},
];

interface LevelConfig {
  id: number;
  name: string;
  subtitle: string;
  totalBalloons: number;
  speed: number;
  speedDecay: number;
  minSpeed: number;
  spawnInterval: number;
  requiredScore: number;
  bgColor1: string;
  bgColor2: string;
  accentColor: string;
  icon: string;
  unlocked: boolean;
}

const LEVELS: LevelConfig[] = [
  {
    id: 1,
    name: 'Easy Peasy',
    subtitle: 'Easy Start',
    totalBalloons: 10,
    speed: 5500,
    speedDecay: 0,
    minSpeed: 5500,
    spawnInterval: 1200,
    requiredScore: 5,
    bgColor1: '#74B9FF',
    bgColor2: '#A29BFE',
    accentColor: '#6C5CE7',
    icon: '🌈',
    unlocked: true,
  },
  {
    id: 2,
    name: 'Super Fun',
    subtitle: 'Pick Up Speed',
    totalBalloons: 15,
    speed: 4500,
    speedDecay: 30,
    minSpeed: 3000,
    spawnInterval: 1000,
    requiredScore: 8,
    bgColor1: '#FD79A8',
    bgColor2: '#A855F7',
    accentColor: '#E84393',
    icon: '⭐',
    unlocked: false,
  },
  {
    id: 3,
    name: 'Turbo Mode',
    subtitle: 'Full Speed',
    totalBalloons: 20,
    speed: 3800,
    speedDecay: 40,
    minSpeed: 2400,
    spawnInterval: 850,
    requiredScore: 12,
    bgColor1: '#FDCB6E',
    bgColor2: '#E17055',
    accentColor: '#F39C12',
    icon: '🚀',
    unlocked: false,
  },
  {
    id: 4,
    name: 'Night Sky',
    subtitle: 'Glow in the Dark',
    totalBalloons: 25,
    speed: 3200,
    speedDecay: 50,
    minSpeed: 2000,
    spawnInterval: 750,
    requiredScore: 15,
    bgColor1: '#1A1A2E',
    bgColor2: '#16213E',
    accentColor: '#E94560',
    icon: '🌙',
    unlocked: false,
  },
  {
    id: 5,
    name: 'Underwater',
    subtitle: 'Deep Sea Pop',
    totalBalloons: 28,
    speed: 2800,
    speedDecay: 55,
    minSpeed: 1700,
    spawnInterval: 650,
    requiredScore: 18,
    bgColor1: '#0077B6',
    bgColor2: '#023E8A',
    accentColor: '#00B4D8',
    icon: '🐠',
    unlocked: false,
  },
  {
    id: 6,
    name: 'Space Trap',
    subtitle: 'Alien Ambush!',
    totalBalloons: 36,
    speed: 2650,
    speedDecay: 58,
    minSpeed: 1850,
    spawnInterval: 620,
    requiredScore: 21,
    bgColor1: '#0B0C10',
    bgColor2: '#1F2833',
    accentColor: '#66FCF1',
    icon: '🪐',
    unlocked: false,
  },
  {
    id: 7,
    name: 'Galaxy Boss',
    subtitle: 'Ultimate Chaos',
    totalBalloons: 40,
    speed: 2500,
    speedDecay: 62,
    minSpeed: 1750,
    spawnInterval: 580,
    requiredScore: 24,
    bgColor1: '#1A0533',
    bgColor2: '#4A0E78',
    accentColor: '#FF6BFF',
    icon: '🌌',
    unlocked: false,
  },
];

interface LevelSpawnRates {
  golden: number;
  bomb: number;
  devil: number;
  frozen: number;
  tiny: number;
  giant: number;
  ghost: number;
}

interface LevelTheme {
  faces: string[];
  colors: string[];
  shapes: BalloonShape[];
  badge: string;
  ringColor: string;
  rates: LevelSpawnRates;
}

const DEFAULT_SPAWN_RATES: LevelSpawnRates = {
  golden: 0.06,
  bomb: 0.05,
  devil: 0.04,
  frozen: 0.05,
  tiny: 0.04,
  giant: 0.04,
  ghost: 0,
};

const LEVEL_THEMES: Record<number, LevelTheme> = {
  1: {
    faces: ['😊', '🐥', '🌟', '🎈', '🌸', '😄'],
    colors: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A855F7', '#FF8A5C', '#6C5CE7'],
    shapes: ['round', 'oval', 'heart'],
    badge: '🎉',
    ringColor: '#FFE66D',
    rates: {...DEFAULT_SPAWN_RATES},
  },
  2: {
    faces: ['⭐', '🦋', '🌈', '💫', '🎀', '🤩'],
    colors: ['#FD79A8', '#A855F7', '#74B9FF', '#FFE66D', '#FF8A5C', '#6C5CE7'],
    shapes: ['round', 'heart', 'oval', 'wide'],
    badge: '⭐',
    ringColor: '#FD79A8',
    rates: {...DEFAULT_SPAWN_RATES, bomb: 0.06, devil: 0.05},
  },
  3: {
    faces: ['🚀', '🤠', '🎯', '⚡', '🏎️', '😎'],
    colors: ['#FDCB6E', '#E17055', '#F39C12', '#FF7675', '#FFE66D', '#E84393'],
    shapes: ['round', 'oval', 'long', 'wide'],
    badge: '🚀',
    ringColor: '#F39C12',
    rates: {...DEFAULT_SPAWN_RATES, bomb: 0.07, devil: 0.06, frozen: 0.05},
  },
  4: {
    faces: ['🦉', '🌙', '🦇', '✨', '🌟', '😴'],
    colors: ['#6C5CE7', '#A29BFE', '#E94560', '#2D3436', '#636E72', '#B2BEC3'],
    shapes: ['oval', 'round', 'long'],
    badge: '🌙',
    ringColor: '#E94560',
    rates: {...DEFAULT_SPAWN_RATES, bomb: 0.09, devil: 0.1, frozen: 0.06, ghost: 0.04},
  },
  5: {
    faces: ['🐠', '🐙', '🦀', '🐡', '🐬', '🫧'],
    colors: ['#00B4D8', '#0077B6', '#48CAE4', '#90E0EF', '#023E8A', '#55EFC4'],
    shapes: ['long', 'oval', 'wide', 'round'],
    badge: '🐠',
    ringColor: '#00B4D8',
    rates: {...DEFAULT_SPAWN_RATES, bomb: 0.1, devil: 0.11, frozen: 0.07, tiny: 0.05, ghost: 0.05},
  },
  6: {
    faces: ['👽', '🛸', '🤖', '☄️', '🌌', '👾'],
    colors: ['#66FCF1', '#45A29E', '#1F4287', '#162447', '#4Ecca3', '#393E46'],
    shapes: ['round', 'oval', 'wide', 'long'],
    badge: '👽',
    ringColor: '#66FCF1',
    rates: {
      golden: 0.04,
      bomb: 0.14,
      devil: 0.15,
      frozen: 0.08,
      tiny: 0.06,
      giant: 0.06,
      ghost: 0.1,
    },
  },
  7: {
    faces: ['💀', '👹', '⚡', '🔥', '🌀', '😈'],
    colors: ['#FF6BFF', '#9B59B6', '#E74C3C', '#F39C12', '#8E44AD', '#2C3E50'],
    shapes: ['heart', 'wide', 'oval', 'long', 'round'],
    badge: '🌌',
    ringColor: '#FF6BFF',
    rates: {
      golden: 0.03,
      bomb: 0.16,
      devil: 0.17,
      frozen: 0.09,
      tiny: 0.05,
      giant: 0.05,
      ghost: 0.12,
    },
  },
};

const getLevelTheme = (levelId: number): LevelTheme =>
  LEVEL_THEMES[levelId] || LEVEL_THEMES[1];

const SURVIVAL_LEVEL: LevelConfig = {
  id: 200,
  name: 'Survival',
  subtitle: 'Miss 3 = Game Over',
  totalBalloons: 999,
  speed: 4000,
  speedDecay: 15,
  minSpeed: 1500,
  spawnInterval: 900,
  requiredScore: 1,
  bgColor1: '#2D1B69',
  bgColor2: '#4A2C8A',
  accentColor: '#E74C3C',
  icon: '🛡️',
  unlocked: true,
};

const TIMED_LEVEL: LevelConfig = {
  id: 201,
  name: 'Timed',
  subtitle: '60 Second Rush',
  totalBalloons: 999,
  speed: 3800,
  speedDecay: 10,
  minSpeed: 1800,
  spawnInterval: 700,
  requiredScore: 1,
  bgColor1: '#2D1B69',
  bgColor2: '#4A2C8A',
  accentColor: '#F39C12',
  icon: '⏱️',
  unlocked: true,
};

type Screen =
  | 'splash'
  | 'home'
  | 'game'
  | 'result'
  | 'lobby'
  | 'multi_result'
  | 'profile'
  | 'settings'
  | 'achievements';

const MENU_MUSIC_SCREENS: Screen[] = [
  'home',
  'lobby',
  'settings',
  'achievements',
  'profile',
  'multi_result',
  'result',
];

const APP_VERSION = '1.0.0';

const SPLASH_DURATION_MS = 5000;
const GAME_END_DELAY_MS = 650;
const SPLASH_BALLOON_DEFS = [
  {color: '#FF6B6B', face: '😄', size: 1, x: 0.12},
  {color: '#4ECDC4', face: '🤩', size: 0.85, x: 0.28},
  {color: '#FFE66D', face: '🥳', size: 1.1, x: 0.72},
  {color: '#A855F7', face: '😆', size: 0.9, x: 0.86},
  {color: '#FF8A5C', face: '😊', size: 0.75, x: 0.5},
  {color: '#6C5CE7', face: '🤪', size: 0.8, x: 0.38},
  {color: '#00B894', face: '😎', size: 0.95, x: 0.62},
];
const SPLASH_STARS = [
  {top: '8%', left: '12%', size: 14},
  {top: '14%', left: '78%', size: 18},
  {top: '22%', left: '45%', size: 12},
  {top: '6%', left: '55%', size: 10},
  {top: '18%', left: '25%', size: 11},
];

interface SplashTheme {
  id: string;
  name: string;
  icon: string;
  previewColors: [string, string, string];
  statusBarStyle: 'light-content' | 'dark-content';
  statusBarBg: string;
  skyDeep: string;
  skyMid: string;
  skyGlow: string;
  starColor: string;
  sunRay: string;
  sunCoreBg: string;
  sunBorder: string;
  sunEmoji: string;
  hillBack: string;
  hillFront: string;
  grassLeft: string;
  grassRight: string;
  cardBorder: string;
  cardGlow: string;
  cardBg: string;
  logoBorder: string;
  titleColor: string;
  titleShadow: string;
  subtitleColor: string;
  progressTrack: string;
  progressFill: string;
  progressLabelColor: string;
  balloonColors?: string[];
}

const DEFAULT_SPLASH_THEME_ID = 'space';

const SPLASH_THEMES: Record<string, SplashTheme> = {
  classic_purple: {
    id: 'classic_purple', name: 'Classic Purple', icon: '🎈',
    previewColors: ['#1A0E3D', '#3D2280', '#6C5CE7'],
    statusBarStyle: 'light-content', statusBarBg: '#1A0E3D',
    skyDeep: '#1A0E3D', skyMid: '#3D2280', skyGlow: 'rgba(108, 92, 231, 0.22)',
    starColor: '#FFE66D', sunRay: 'rgba(255, 230, 109, 0.55)',
    sunCoreBg: 'rgba(255, 200, 50, 0.25)', sunBorder: 'rgba(255, 230, 109, 0.6)', sunEmoji: '☀️',
    hillBack: '#2D6A4F', hillFront: '#40916C', grassLeft: '🌿', grassRight: '🌸',
    cardBorder: 'rgba(255, 230, 109, 0.45)', cardGlow: 'rgba(108, 92, 231, 0.2)',
    cardBg: 'rgba(255,255,255,0.1)', logoBorder: '#FFE66D',
    titleColor: '#FFE66D', titleShadow: '#6C5CE7', subtitleColor: 'rgba(255,255,255,0.9)',
    progressTrack: 'rgba(255,255,255,0.15)', progressFill: '#FFE66D', progressLabelColor: 'rgba(255,255,255,0.75)',
  },
  galaxy: {
    id: 'galaxy', name: 'Galaxy', icon: '🌌',
    previewColors: ['#0B0033', '#1A0A4A', '#7B2FBE'],
    statusBarStyle: 'light-content', statusBarBg: '#0B0033',
    skyDeep: '#0B0033', skyMid: '#1A0A4A', skyGlow: 'rgba(123, 47, 190, 0.28)',
    starColor: '#E0AAFF', sunRay: 'rgba(224, 170, 255, 0.45)',
    sunCoreBg: 'rgba(157, 78, 221, 0.3)', sunBorder: 'rgba(224, 170, 255, 0.55)', sunEmoji: '🌙',
    hillBack: '#240046', hillFront: '#3C096C', grassLeft: '✨', grassRight: '💫',
    cardBorder: 'rgba(224, 170, 255, 0.4)', cardGlow: 'rgba(157, 78, 221, 0.25)',
    cardBg: 'rgba(255,255,255,0.08)', logoBorder: '#E0AAFF',
    titleColor: '#E0AAFF', titleShadow: '#7B2FBE', subtitleColor: 'rgba(255,255,255,0.85)',
    progressTrack: 'rgba(255,255,255,0.12)', progressFill: '#C77DFF', progressLabelColor: 'rgba(224, 170, 255, 0.8)',
    balloonColors: ['#C77DFF', '#9D4EDD', '#E0AAFF', '#7B2FBE', '#5A189A', '#B5179E', '#7209B7'],
  },
  rainbow_party: {
    id: 'rainbow_party', name: 'Rainbow Party', icon: '🌈',
    previewColors: ['#FF6B6B', '#FFE66D', '#4ECDC4'],
    statusBarStyle: 'light-content', statusBarBg: '#5B2C8A',
    skyDeep: '#5B2C8A', skyMid: '#7E3FB5', skyGlow: 'rgba(255, 107, 107, 0.2)',
    starColor: '#FFD93D', sunRay: 'rgba(255, 217, 61, 0.55)',
    sunCoreBg: 'rgba(255, 107, 107, 0.25)', sunBorder: 'rgba(255, 217, 61, 0.6)', sunEmoji: '🤩',
    hillBack: '#6BCB77', hillFront: '#4D96FF', grassLeft: '🌈', grassRight: '🎉',
    cardBorder: 'rgba(255, 217, 61, 0.5)', cardGlow: 'rgba(255, 107, 107, 0.2)',
    cardBg: 'rgba(255,255,255,0.12)', logoBorder: '#FFD93D',
    titleColor: '#FFD93D', titleShadow: '#FF6B6B', subtitleColor: 'rgba(255,255,255,0.92)',
    progressTrack: 'rgba(255,255,255,0.18)', progressFill: '#FF6B6B', progressLabelColor: 'rgba(255,255,255,0.8)',
    balloonColors: ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#C77DFF', '#FF9A8B', '#4ECDC4'],
  },
  candy_land: {
    id: 'candy_land', name: 'Candy Land', icon: '🍭',
    previewColors: ['#FF69B4', '#FFB6C1', '#FFF0F5'],
    statusBarStyle: 'light-content', statusBarBg: '#C2185B',
    skyDeep: '#C2185B', skyMid: '#E91E8C', skyGlow: 'rgba(255, 182, 193, 0.3)',
    starColor: '#FFF0F5', sunRay: 'rgba(255, 182, 193, 0.6)',
    sunCoreBg: 'rgba(255, 105, 180, 0.3)', sunBorder: 'rgba(255, 240, 245, 0.55)', sunEmoji: '🍬',
    hillBack: '#9B59B6', hillFront: '#E84393', grassLeft: '🍭', grassRight: '🧁',
    cardBorder: 'rgba(255, 240, 245, 0.45)', cardGlow: 'rgba(255, 105, 180, 0.22)',
    cardBg: 'rgba(255,255,255,0.14)', logoBorder: '#FFF0F5',
    titleColor: '#FFF0F5', titleShadow: '#E84393', subtitleColor: 'rgba(255,255,255,0.9)',
    progressTrack: 'rgba(255,255,255,0.16)', progressFill: '#FF69B4', progressLabelColor: 'rgba(255,240,245,0.85)',
    balloonColors: ['#FF69B4', '#FF1493', '#FFB6C1', '#FF6EB4', '#FFC0CB', '#E84393', '#FD79A8'],
  },
  sunset_glow: {
    id: 'sunset_glow', name: 'Sunset Glow', icon: '🌅',
    previewColors: ['#E65100', '#FF8C42', '#FFD180'],
    statusBarStyle: 'light-content', statusBarBg: '#BF360C',
    skyDeep: '#BF360C', skyMid: '#E65100', skyGlow: 'rgba(255, 140, 66, 0.28)',
    starColor: '#FFE0B2', sunRay: 'rgba(255, 183, 77, 0.55)',
    sunCoreBg: 'rgba(255, 140, 66, 0.3)', sunBorder: 'rgba(255, 224, 178, 0.6)', sunEmoji: '🌇',
    hillBack: '#D4A35A', hillFront: '#C88B3A', grassLeft: '🌾', grassRight: '🌻',
    cardBorder: 'rgba(255, 224, 178, 0.45)', cardGlow: 'rgba(255, 140, 66, 0.22)',
    cardBg: 'rgba(255,255,255,0.1)', logoBorder: '#FFE0B2',
    titleColor: '#FFE0B2', titleShadow: '#E65100', subtitleColor: 'rgba(255,255,255,0.88)',
    progressTrack: 'rgba(255,255,255,0.14)', progressFill: '#FFB74D', progressLabelColor: 'rgba(255,224,178,0.8)',
    balloonColors: ['#FF6B35', '#FF8C42', '#FFA726', '#FFB74D', '#FFCC80', '#F39C12', '#E17055'],
  },
  sunny_day: {
    id: 'sunny_day', name: 'Sunny Day', icon: '☀️',
    previewColors: ['#5BB8F5', '#7ECBF5', '#4CAF50'],
    statusBarStyle: 'dark-content', statusBarBg: '#5BB8F5',
    skyDeep: '#4AA3E0', skyMid: '#5BB8F5', skyGlow: 'rgba(255, 217, 61, 0.18)',
    starColor: '#FFD93D', sunRay: 'rgba(255, 233, 138, 0.6)',
    sunCoreBg: 'rgba(255, 217, 61, 0.35)', sunBorder: 'rgba(255, 193, 7, 0.65)', sunEmoji: '😊',
    hillBack: '#7DC87D', hillFront: '#4CAF50', grassLeft: '🌿', grassRight: '🌼',
    cardBorder: 'rgba(255, 217, 61, 0.5)', cardGlow: 'rgba(91, 184, 245, 0.25)',
    cardBg: 'rgba(255,255,255,0.18)', logoBorder: '#FFD93D',
    titleColor: '#2D3436', titleShadow: '#5BB8F5', subtitleColor: 'rgba(45,52,54,0.85)',
    progressTrack: 'rgba(255,255,255,0.35)', progressFill: '#FFD93D', progressLabelColor: 'rgba(45,52,54,0.7)',
  },
  candy_pink: {
    id: 'candy_pink', name: 'Candy Pink', icon: '💖',
    previewColors: ['#FF7EB3', '#FF9DC4', '#8E44AD'],
    statusBarStyle: 'light-content', statusBarBg: '#FF7EB3',
    skyDeep: '#E84393', skyMid: '#FF7EB3', skyGlow: 'rgba(255, 157, 196, 0.28)',
    starColor: '#FFF0F5', sunRay: 'rgba(255, 184, 212, 0.55)',
    sunCoreBg: 'rgba(255, 107, 157, 0.3)', sunBorder: 'rgba(255, 240, 245, 0.55)', sunEmoji: '🤩',
    hillBack: '#9B59B6', hillFront: '#7D3C98', grassLeft: '🌷', grassRight: '💗',
    cardBorder: 'rgba(255, 240, 245, 0.45)', cardGlow: 'rgba(232, 67, 147, 0.22)',
    cardBg: 'rgba(255,255,255,0.12)', logoBorder: '#FFB8D4',
    titleColor: '#FFF0F5', titleShadow: '#E84393', subtitleColor: 'rgba(255,255,255,0.9)',
    progressTrack: 'rgba(255,255,255,0.15)', progressFill: '#FF6B9D', progressLabelColor: 'rgba(255,255,255,0.78)',
  },
  turbo_orange: {
    id: 'turbo_orange', name: 'Turbo Orange', icon: '🚀',
    previewColors: ['#FF8C42', '#FFB347', '#B87333'],
    statusBarStyle: 'light-content', statusBarBg: '#E65100',
    skyDeep: '#E65100', skyMid: '#FF8C42', skyGlow: 'rgba(255, 179, 71, 0.25)',
    starColor: '#FFE0B2', sunRay: 'rgba(255, 183, 77, 0.55)',
    sunCoreBg: 'rgba(255, 107, 53, 0.3)', sunBorder: 'rgba(255, 183, 77, 0.6)', sunEmoji: '😎',
    hillBack: '#D4A35A', hillFront: '#B87333', grassLeft: '🔥', grassRight: '⚡',
    cardBorder: 'rgba(255, 224, 178, 0.45)', cardGlow: 'rgba(255, 140, 66, 0.22)',
    cardBg: 'rgba(255,255,255,0.1)', logoBorder: '#FFB74D',
    titleColor: '#FFE0B2', titleShadow: '#E65100', subtitleColor: 'rgba(255,255,255,0.88)',
    progressTrack: 'rgba(255,255,255,0.14)', progressFill: '#FF8C42', progressLabelColor: 'rgba(255,224,178,0.8)',
  },
  night_sky: {
    id: 'night_sky', name: 'Night Sky', icon: '🌙',
    previewColors: ['#0F0C29', '#1A1A3E', '#E94560'],
    statusBarStyle: 'light-content', statusBarBg: '#0F0C29',
    skyDeep: '#0F0C29', skyMid: '#1A1A3E', skyGlow: 'rgba(233, 69, 96, 0.15)',
    starColor: '#F5F5DC', sunRay: 'rgba(68, 68, 102, 0.6)',
    sunCoreBg: 'rgba(245, 245, 220, 0.15)', sunBorder: 'rgba(204, 204, 170, 0.5)', sunEmoji: '🌙',
    hillBack: '#1A1A3A', hillFront: '#101028', grassLeft: '🌃', grassRight: '🌠',
    cardBorder: 'rgba(245, 245, 220, 0.35)', cardGlow: 'rgba(233, 69, 96, 0.18)',
    cardBg: 'rgba(255,255,255,0.06)', logoBorder: '#F5F5DC',
    titleColor: '#F5F5DC', titleShadow: '#E94560', subtitleColor: 'rgba(255,255,255,0.8)',
    progressTrack: 'rgba(255,255,255,0.1)', progressFill: '#E94560', progressLabelColor: 'rgba(245,245,220,0.7)',
  },
  underwater: {
    id: 'underwater', name: 'Underwater', icon: '🐠',
    previewColors: ['#006994', '#00AACC', '#008080'],
    statusBarStyle: 'light-content', statusBarBg: '#006994',
    skyDeep: '#004D6E', skyMid: '#006994', skyGlow: 'rgba(0, 206, 209, 0.2)',
    starColor: '#B0E0E6', sunRay: 'rgba(64, 224, 208, 0.45)',
    sunCoreBg: 'rgba(0, 206, 209, 0.25)', sunBorder: 'rgba(176, 224, 230, 0.55)', sunEmoji: '🐙',
    hillBack: '#2E8B57', hillFront: '#008080', grassLeft: '🐚', grassRight: '🫧',
    cardBorder: 'rgba(176, 224, 230, 0.4)', cardGlow: 'rgba(0, 206, 209, 0.2)',
    cardBg: 'rgba(255,255,255,0.1)', logoBorder: '#40E0D0',
    titleColor: '#B0E0E6', titleShadow: '#006994', subtitleColor: 'rgba(255,255,255,0.88)',
    progressTrack: 'rgba(255,255,255,0.14)', progressFill: '#00CED1', progressLabelColor: 'rgba(176,224,230,0.8)',
    balloonColors: ['#0077B6', '#00B4D8', '#48CAE4', '#90E0EF', '#00CEC1', '#20B2AA', '#008B8B'],
  },
  space: {
    id: 'space', name: 'Space', icon: '🪐',
    previewColors: ['#000011', '#0A0A2A', '#66FCF1'],
    statusBarStyle: 'light-content', statusBarBg: '#000011',
    skyDeep: '#000011', skyMid: '#0A0A2A', skyGlow: 'rgba(102, 252, 241, 0.12)',
    starColor: '#66FCF1', sunRay: 'rgba(51, 68, 102, 0.55)',
    sunCoreBg: 'rgba(102, 252, 241, 0.15)', sunBorder: 'rgba(69, 162, 158, 0.5)', sunEmoji: '🪐',
    hillBack: '#1F2833', hillFront: '#0B0C10', grassLeft: '🛸', grassRight: '☄️',
    cardBorder: 'rgba(102, 252, 241, 0.35)', cardGlow: 'rgba(69, 162, 158, 0.18)',
    cardBg: 'rgba(255,255,255,0.06)', logoBorder: '#66FCF1',
    titleColor: '#66FCF1', titleShadow: '#45A29E', subtitleColor: 'rgba(255,255,255,0.82)',
    progressTrack: 'rgba(255,255,255,0.1)', progressFill: '#66FCF1', progressLabelColor: 'rgba(102,252,241,0.75)',
  },
  survival: {
    id: 'survival', name: 'Survival', icon: '🛡️',
    previewColors: ['#5BB8F5', '#E74C3C', '#4CAF50'],
    statusBarStyle: 'dark-content', statusBarBg: '#5BB8F5',
    skyDeep: '#4AA3E0', skyMid: '#5BB8F5', skyGlow: 'rgba(231, 76, 60, 0.15)',
    starColor: '#FFD93D', sunRay: 'rgba(255, 233, 138, 0.55)',
    sunCoreBg: 'rgba(255, 217, 61, 0.3)', sunBorder: 'rgba(255, 193, 7, 0.6)', sunEmoji: '😬',
    hillBack: '#7DC87D', hillFront: '#4CAF50', grassLeft: '💀', grassRight: '🛡️',
    cardBorder: 'rgba(231, 76, 60, 0.4)', cardGlow: 'rgba(91, 184, 245, 0.2)',
    cardBg: 'rgba(255,255,255,0.14)', logoBorder: '#E74C3C',
    titleColor: '#2D3436', titleShadow: '#E74C3C', subtitleColor: 'rgba(45,52,54,0.85)',
    progressTrack: 'rgba(255,255,255,0.3)', progressFill: '#E74C3C', progressLabelColor: 'rgba(45,52,54,0.7)',
  },
  timed_rush: {
    id: 'timed_rush', name: 'Timed Rush', icon: '⏱️',
    previewColors: ['#FF8C42', '#F39C12', '#4CAF50'],
    statusBarStyle: 'light-content', statusBarBg: '#E67E22',
    skyDeep: '#D35400', skyMid: '#FF8C42', skyGlow: 'rgba(243, 156, 18, 0.22)',
    starColor: '#FFE0B2', sunRay: 'rgba(255, 183, 77, 0.55)',
    sunCoreBg: 'rgba(243, 156, 18, 0.3)', sunBorder: 'rgba(255, 183, 77, 0.6)', sunEmoji: '⏱️',
    hillBack: '#7DC87D', hillFront: '#4CAF50', grassLeft: '⏰', grassRight: '🔥',
    cardBorder: 'rgba(255, 224, 178, 0.45)', cardGlow: 'rgba(243, 156, 18, 0.2)',
    cardBg: 'rgba(255,255,255,0.1)', logoBorder: '#F39C12',
    titleColor: '#FFE0B2', titleShadow: '#E67E22', subtitleColor: 'rgba(255,255,255,0.88)',
    progressTrack: 'rgba(255,255,255,0.14)', progressFill: '#F39C12', progressLabelColor: 'rgba(255,224,178,0.8)',
  },
};

const getSplashTheme = (id: string): SplashTheme =>
  SPLASH_THEMES[id] || SPLASH_THEMES[DEFAULT_SPLASH_THEME_ID];

const PROFILE_AVATARS = [
  {id: 'chiku', emoji: '🐥', label: 'Chiku'},
  {id: 'dikku', emoji: '🐻', label: 'Dikku'},
  {id: 'bunny', emoji: '🐰', label: 'Bunny'},
  {id: 'kitty', emoji: '🐱', label: 'Kitty'},
  {id: 'puppy', emoji: '🐶', label: 'Puppy'},
  {id: 'panda', emoji: '🐼', label: 'Panda'},
  {id: 'foxy', emoji: '🦊', label: 'Foxy'},
  {id: 'dino', emoji: '🦕', label: 'Dino'},
];

const BALLOON_TEMPLATES: {id: string; name: string; colors: string[]; shapes: BalloonShape[]}[] = [
  {id: 'rainbow', name: 'Rainbow Party', colors: ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#C77DFF', '#FF9A8B'], shapes: ['round', 'oval', 'heart', 'wide', 'long']},
  {id: 'candy', name: 'Candy Pop', colors: ['#FF69B4', '#FF1493', '#FFB6C1', '#FF6EB4', '#FF82AB', '#FFC0CB'], shapes: ['heart', 'round', 'heart', 'oval']},
  {id: 'ocean', name: 'Ocean Wave', colors: ['#0077B6', '#00B4D8', '#48CAE4', '#90E0EF', '#023E8A', '#03045E'], shapes: ['long', 'oval', 'long', 'wide']},
  {id: 'jungle', name: 'Jungle Safari', colors: ['#2D6A4F', '#40916C', '#52B788', '#74C69D', '#95D5B2', '#B7E4C7'], shapes: ['wide', 'oval', 'round', 'wide']},
  {id: 'sunset', name: 'Sunset Glow', colors: ['#FF6B35', '#FF8C42', '#FFC15E', '#F7B267', '#F4845F', '#F27059'], shapes: ['round', 'wide', 'oval', 'round']},
];
const MULTI_PORT = 9876;

interface Balloon {
  id: number;
  x: number;
  color: string;
  face: string;
  shape: BalloonShape;
  animValue: Animated.Value;
  wobble: Animated.Value;
  duration: number;
  specialType: BalloonSpecialType;
  tapsLeft: number;
  scaleAnim: Animated.Value;
  sizeMultiplier: number;
  themeBadge: string;
  ringColor: string;
}

interface ConfettiPiece {
  id: string;
  x: number;
  y: number;
  color: string;
  translateX: Animated.Value;
  translateY: Animated.Value;
  opacity: Animated.Value;
  rotate: Animated.Value;
  scale: Animated.Value;
  width: number;
  height: number;
  shape: 'square' | 'rect' | 'circle';
}

interface ConfettiBurst {
  id: string;
  pieces: ConfettiPiece[];
}

interface ScorePopup {
  id: number;
  x: number;
  y: number;
  opacity: Animated.Value;
  translateY: Animated.Value;
  scale: Animated.Value;
  text: string;
  color: string;
}

const STORAGE_KEY = '@balloon_pop_unlocked_levels';
const PROFILE_STORAGE_KEY = '@balloon_pop_profile';
const HIGH_SCORES_KEY = '@balloon_pop_high_scores';
const ACHIEVEMENTS_KEY = '@balloon_pop_achievements';
const SETTINGS_KEY = '@balloon_pop_settings';
const TUTORIAL_KEY = '@balloon_pop_tutorial_seen';
const GOLDEN_POPS_KEY = '@balloon_pop_golden_pops';

const App = () => {
  const [screen, setScreen] = useState<Screen>('splash');
  const [levels, setLevels] = useState(LEVELS);
  const [currentLevel, setCurrentLevel] = useState<LevelConfig>(LEVELS[0]);
  const [score, setScore] = useState(0);
  const [balloonsLeft, setBalloonsLeft] = useState(0);
  const [gameRunning, setGameRunning] = useState(false);
  const [balloons, setBalloons] = useState<Balloon[]>([]);
  const [confettiBursts, setConfettiBursts] = useState<ConfettiBurst[]>([]);
  const [scorePopups, setScorePopups] = useState<ScorePopup[]>([]);
  const [combo, setCombo] = useState(0);
  const [isMultiplayer, setIsMultiplayer] = useState(false);
  const [selectedMode, setSelectedMode] = useState<'single' | 'multi'>('single');
  const [isHost, setIsHost] = useState(false);
  const [opponentScore, setOpponentScore] = useState(0);
  const [connected, setConnected] = useState(false);
  const [hostIp, setHostIp] = useState('');
  const [myIp, setMyIp] = useState('');
  const [waiting, setWaiting] = useState(false);
  const [playerName, setPlayerName] = useState('Chiku 🐥');
  const [opponentName, setOpponentName] = useState('Dikku 🐻');
  const [multiLevelIdx, setMultiLevelIdx] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [showCountdown, setShowCountdown] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileAvatar, setProfileAvatar] = useState(PROFILE_AVATARS[0]);
  const [profileTemplate, setProfileTemplate] = useState(BALLOON_TEMPLATES[0]);
  const [profileBalloonCount, setProfileBalloonCount] = useState(50);
  const [profileSaved, setProfileSaved] = useState(false);
  const [paused, setPaused] = useState(false);
  const [missedCount, setMissedCount] = useState(0);
  const [highScores, setHighScores] = useState<Record<number, {score: number; stars: number}>>({});
  const [earnedAchievements, setEarnedAchievements] = useState<string[]>([]);
  const [soundOn, setSoundOn] = useState(true);
  const [musicOn, setMusicOn] = useState(true);
  const [vibrationOn, setVibrationOn] = useState(true);
  const [splashThemeId, setSplashThemeId] = useState(DEFAULT_SPLASH_THEME_ID);
  const [tutorialSeen, setTutorialSeen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode>('levels');
  const [livesLeft, setLivesLeft] = useState(3);
  const [timeLeft, setTimeLeft] = useState(60);
  const [activePowerUp, setActivePowerUp] = useState<PowerUpType>(null);
  const [goldenPopsTotal, setGoldenPopsTotal] = useState(0);
  const [menuMusicReady, setMenuMusicReady] = useState(0);

  const balloonIdRef = useRef(0);
  const confettiIdRef = useRef(0);
  const popupIdRef = useRef(0);
  const speedRef = useRef(4000);
  const spawnedCountRef = useRef(0);
  const scoreRef = useRef(0);
  const comboTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spawnIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gameRunningRef = useRef(false);
  const balloonYPositions = useRef<Record<number, number>>({});
  const popSounds = useRef<Sound[]>([]);
  const cheerSounds = useRef<Sound[]>([]);
  const soundIndex = useRef(0);
  const cheerIndex = useRef(0);
  const splashMusicRef = useRef<Sound | null>(null);
  const homeMusicRef = useRef<Sound | null>(null);
  const activeMusicTrackRef = useRef<'splash' | 'home' | 'game' | null>(null);
  const splashVolumeRef = useRef(0);
  const homeVolumeRef = useRef(0);
  const serverRef = useRef<any>(null);
  const socketRef = useRef<any>(null);
  const missedRef = useRef(0);
  const livesRef = useRef(3);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const powerUpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pausedRef = useRef(false);
  const comboRef = useRef(0);
  const gameModeRef = useRef<GameMode>('levels');
  const gameEndTriggeredRef = useRef(false);
  const gameEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const adGateOpenRef = useRef(false);

  useEffect(() => {
    initAudioSession();
    const loadEffect = (name: string) =>
      new Sound(name, Sound.MAIN_BUNDLE, (err) => {
        if (err) {
          console.log('Sound load error for ' + name, err);
        }
      });
    popSounds.current = [
      loadEffect('pop1.wav'),
      loadEffect('pop2.wav'),
      loadEffect('pop3.wav'),
    ];
    cheerSounds.current = [
      loadEffect('cheer1.wav'),
      loadEffect('cheer2.wav'),
      loadEffect('cheer3.wav'),
      loadEffect('cheer4.wav'),
    ];
    const loadLoopingTrack = (
      name: string,
      ref: React.MutableRefObject<Sound | null>,
      volume: number,
    ) => {
      const s = new Sound(name, Sound.MAIN_BUNDLE, (err) => {
        if (err) {
          console.log('Music load error for ' + name, err);
          return;
        }
        ref.current = s;
        s.setNumberOfLoops(-1);
        s.setVolume(volume);
        setMenuMusicReady(count => count + 1);
      });
    };
    loadLoopingTrack('theme_music.wav', splashMusicRef, MUSIC_VOLUME.splash);
    loadLoopingTrack('home_music.wav', homeMusicRef, MUSIC_VOLUME.home);
    return () => {
      cancelMusicFade();
      popSounds.current.forEach(s => s.release());
      cheerSounds.current.forEach(s => s.release());
      if (splashMusicRef.current) {
        splashMusicRef.current.stop();
        splashMusicRef.current.release();
      }
      if (homeMusicRef.current) {
        homeMusicRef.current.stop();
        homeMusicRef.current.release();
      }
      if (countdownTimerRef.current) {
        clearTimeout(countdownTimerRef.current);
      }
      if (splashTimerRef.current) {
        clearTimeout(splashTimerRef.current);
      }
      if (gameEndTimerRef.current) {
        clearTimeout(gameEndTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    musicOnRef.current = musicOn;
  }, [musicOn]);

  const fadeOutAllMusic = useCallback((onDone?: () => void) => {
    cancelMusicFade();
    const active = activeMusicTrackRef.current;
    const finish = () => {
      splashMusicRef.current?.stop();
      homeMusicRef.current?.stop();
      splashVolumeRef.current = 0;
      homeVolumeRef.current = 0;
      activeMusicTrackRef.current = null;
      onDone?.();
    };
    if (active === 'splash' && splashMusicRef.current?.isLoaded()) {
      fadeSoundVolume(
        splashMusicRef.current,
        splashVolumeRef.current,
        0,
        FADE_OUT_MS,
        finish,
      );
      return;
    }
    if ((active === 'home' || active === 'game') && homeMusicRef.current?.isLoaded()) {
      fadeSoundVolume(homeMusicRef.current, homeVolumeRef.current, 0, FADE_OUT_MS, finish);
      return;
    }
    finish();
  }, []);

  const pauseActiveMenuMusic = useCallback(() => {
    cancelMusicFade();
    if (activeMusicTrackRef.current === 'splash') {
      splashMusicRef.current?.pause();
    } else if (activeMusicTrackRef.current === 'home' || activeMusicTrackRef.current === 'game') {
      homeMusicRef.current?.pause();
    }
  }, []);

  const playSplashMusic = useCallback(() => {
    const splash = splashMusicRef.current;
    if (!musicOnRef.current || !splash?.isLoaded()) {
      return;
    }
    if (activeMusicTrackRef.current === 'splash') {
      return;
    }
    const home = homeMusicRef.current;
    if (
      (activeMusicTrackRef.current === 'home' || activeMusicTrackRef.current === 'game') &&
      home?.isLoaded()
    ) {
      crossfadeTracks(
        home,
        homeVolumeRef.current,
        splash,
        MUSIC_VOLUME.splash,
        CROSSFADE_MS,
        () => {
          activeMusicTrackRef.current = 'splash';
          splashVolumeRef.current = MUSIC_VOLUME.splash;
          homeVolumeRef.current = 0;
        },
      );
      return;
    }
    home?.stop();
    homeVolumeRef.current = 0;
    startLoopingTrack(splash, 0);
    activeMusicTrackRef.current = 'splash';
    fadeSoundVolume(splash, 0, MUSIC_VOLUME.splash, FADE_IN_MS, () => {
      splashVolumeRef.current = MUSIC_VOLUME.splash;
    });
  }, []);

  const playHomeMusic = useCallback(() => {
    const home = homeMusicRef.current;
    if (!musicOnRef.current || !home?.isLoaded()) {
      return;
    }
    if (activeMusicTrackRef.current === 'home' && homeVolumeRef.current >= MUSIC_VOLUME.home - 0.05) {
      return;
    }
    const splash = splashMusicRef.current;
    if (activeMusicTrackRef.current === 'splash' && splash?.isLoaded()) {
      crossfadeTracks(splash, splashVolumeRef.current, home, MUSIC_VOLUME.home, CROSSFADE_MS, () => {
        activeMusicTrackRef.current = 'home';
        homeVolumeRef.current = MUSIC_VOLUME.home;
        splashVolumeRef.current = 0;
      });
      return;
    }
    splash?.stop();
    splashVolumeRef.current = 0;
    const fromVol = homeVolumeRef.current;
    if (activeMusicTrackRef.current === 'home' || activeMusicTrackRef.current === 'game') {
      activeMusicTrackRef.current = 'home';
      fadeSoundVolume(home, fromVol, MUSIC_VOLUME.home, FADE_IN_MS, () => {
        homeVolumeRef.current = MUSIC_VOLUME.home;
      });
      return;
    }
    startLoopingTrack(home, 0);
    activeMusicTrackRef.current = 'home';
    fadeSoundVolume(home, 0, MUSIC_VOLUME.home, FADE_IN_MS, () => {
      homeVolumeRef.current = MUSIC_VOLUME.home;
    });
  }, []);

  const playGameplayMusic = useCallback(() => {
    const home = homeMusicRef.current;
    if (!musicOnRef.current || !home?.isLoaded()) {
      return;
    }
    if (activeMusicTrackRef.current === 'game' && homeVolumeRef.current >= MUSIC_VOLUME.gameplay - 0.05) {
      return;
    }
    splashMusicRef.current?.stop();
    splashVolumeRef.current = 0;
    const fromVol = homeVolumeRef.current;
    if (activeMusicTrackRef.current === 'home' || activeMusicTrackRef.current === 'game') {
      activeMusicTrackRef.current = 'game';
      fadeSoundVolume(home, fromVol, MUSIC_VOLUME.gameplay, FADE_IN_MS, () => {
        homeVolumeRef.current = MUSIC_VOLUME.gameplay;
      });
      return;
    }
    startLoopingTrack(home, 0);
    homeVolumeRef.current = 0;
    activeMusicTrackRef.current = 'game';
    fadeSoundVolume(home, 0, MUSIC_VOLUME.gameplay, FADE_IN_MS, () => {
      homeVolumeRef.current = MUSIC_VOLUME.gameplay;
    });
  }, []);

  const playMusicForScreen = useCallback(
    (target: Screen) => {
      if (!musicOnRef.current) {
        fadeOutAllMusic();
        return;
      }
      if (target === 'splash') {
        playSplashMusic();
      } else if (MENU_MUSIC_SCREENS.includes(target)) {
        playHomeMusic();
      } else if (target === 'game') {
        playGameplayMusic();
      } else {
        fadeOutAllMusic();
      }
    },
    [fadeOutAllMusic, playSplashMusic, playHomeMusic, playGameplayMusic],
  );

  const screenRef = useRef(screen);
  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);

  useEffect(() => {
    playMusicForScreen(screen);
  }, [screen, musicOn, menuMusicReady, playMusicForScreen]);

  useEffect(() => {
    const menuScreens: Screen[] = ['splash', ...MENU_MUSIC_SCREENS];
    const onAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        pauseActiveMenuMusic();
      } else if (nextState === 'active' && musicOnRef.current && menuScreens.includes(screenRef.current)) {
        playMusicForScreen(screenRef.current);
      }
    };
    const sub = AppState.addEventListener('change', onAppStateChange);
    return () => sub.remove();
  }, [pauseActiveMenuMusic, playMusicForScreen]);

  const playPopSound = useCallback(() => {
    if (!soundOn) {
      return;
    }
    const idx = soundIndex.current % popSounds.current.length;
    soundIndex.current++;
    const sound = popSounds.current[idx];
    if (sound?.isLoaded()) {
      sound.setVolume(0.9);
      sound.stop(() => {
        sound.play();
      });
    }
  }, [soundOn]);

  const sendToOpponent = useCallback((data: object) => {
    try {
      if (socketRef.current) {
        socketRef.current.write(JSON.stringify(data) + '\n');
      }
    } catch (e) {}
  }, []);

  const pendingStartRef = useRef(false);
  const pendingLevelIdxRef = useRef(0);

  const poppedByRemoteRef = useRef<Set<number>>(new Set());

  const handleIncomingData = useCallback((raw: string) => {
    const lines = raw.split('\n').filter(l => l.trim());
    lines.forEach(line => {
      try {
        const data = JSON.parse(line);
        if (data.type === 'score') {
          setOpponentScore(data.score);
        } else if (data.type === 'name') {
          setOpponentName(data.name);
        } else if (data.type === 'start') {
          pendingStartRef.current = true;
          pendingLevelIdxRef.current = data.levelIdx || 0;
          setIsMultiplayer(true);
          setOpponentScore(0);
          poppedByRemoteRef.current.clear();
        } else if (data.type === 'go') {
          pendingGoRef.current = true;
          pendingGoLevelRef.current = data.levelIdx || 0;
        } else if (data.type === 'game_end') {
          setOpponentScore(data.score);
        } else if (data.type === 'pop') {
          poppedByRemoteRef.current.add(data.balloonId);
          setOpponentScore(data.score);
          setBalloons(prev => prev.filter(b => b.id !== data.balloonId));
        }
      } catch (e) {}
    });
  }, []);

  const getWifiIp = useCallback(async (): Promise<string> => {
    try {
      const info = await NetInfo.fetch();
      const details = info.details as any;
      if (details && details.ipAddress) {
        return details.ipAddress;
      }
    } catch (e) {}
    return '';
  }, []);

  const startHosting = useCallback(async () => {
    setWaiting(true);
    setMyIp('Finding IP...');

    const wifiIp = await getWifiIp();
    const bindHost = wifiIp || '0.0.0.0';

    try {
      if (serverRef.current) {
        try { serverRef.current.close(); } catch (e) {}
        serverRef.current = null;
      }

      const server = TcpSocket.createServer((client: any) => {
        socketRef.current = client;
        setConnected(true);
        setWaiting(false);
        setTimeout(() => sendToOpponent({type: 'name', name: 'Chiku 🐥'}), 100);

        client.on('data', (data: any) => {
          handleIncomingData(data.toString());
        });
        client.on('error', () => {});
        client.on('close', () => {
          setConnected(false);
          socketRef.current = null;
        });
      });

      server.on('error', (err: any) => {
        console.log('Server error:', err);
        if (err?.message?.includes('EADDRINUSE')) {
          setMyIp(wifiIp || 'Check WiFi Settings');
        }
      });

      server.listen({port: MULTI_PORT, host: bindHost}, () => {
        const addr = server.address();
        console.log('Server listening on', addr);
        if (wifiIp) {
          setMyIp(wifiIp);
        } else if (addr && addr.address && addr.address !== '0.0.0.0') {
          setMyIp(addr.address);
        } else {
          setMyIp('Check WiFi Settings for IP');
        }
      });
      serverRef.current = server;
    } catch (e: any) {
      Alert.alert('Error', 'Could not start hosting: ' + (e?.message || 'Unknown'));
      setWaiting(false);
    }
  }, [getWifiIp, handleIncomingData, sendToOpponent, playerName]);

  const joinHost = useCallback(async () => {
    const ip = hostIp.trim();
    if (!ip) {
      Alert.alert('Enter IP', 'Please enter the host IP address');
      return;
    }
    setWaiting(true);

    const myLocalIp = await getWifiIp();
    let didConnect = false;

    try {
      const options: any = {port: MULTI_PORT, host: ip};
      if (myLocalIp) {
        options.localAddress = myLocalIp;
      }

      const client = TcpSocket.createConnection(options, () => {
        didConnect = true;
        socketRef.current = client;
        setConnected(true);
        setWaiting(false);
        setTimeout(() => sendToOpponent({type: 'name', name: 'Dikku 🐻'}), 100);
      });

      const timeoutId = setTimeout(() => {
        if (!didConnect) {
          try { client.destroy(); } catch (e) {}
          setWaiting(false);
          Alert.alert(
            'Connection Timed Out',
            `Could not reach ${ip}:${MULTI_PORT}\n\nMake sure:\n• Both phones are on the same WiFi\n• Host has tapped "Create Room" first\n• The IP address is correct\n\nYour IP: ${myLocalIp || 'unknown'}`,
          );
        }
      }, 10000);

      client.on('data', (data: any) => {
        handleIncomingData(data.toString());
      });
      client.on('error', (err: any) => {
        clearTimeout(timeoutId);
        if (!didConnect) {
          setWaiting(false);
          Alert.alert(
            'Connection Failed',
            `Could not connect to ${ip}:${MULTI_PORT}\n\nMake sure:\n• Both phones are on the same WiFi\n• Host has tapped "Create Room" first\n• The IP address is correct\n\nYour IP: ${myLocalIp || 'unknown'}\nError: ${err?.message || err || 'Unknown'}`,
          );
        }
      });
      client.on('close', () => {
        clearTimeout(timeoutId);
        setConnected(false);
        socketRef.current = null;
      });
    } catch (e: any) {
      setWaiting(false);
      Alert.alert('Error', 'Connection error: ' + (e?.message || 'Unknown'));
    }
  }, [hostIp, handleIncomingData, sendToOpponent, playerName, getWifiIp]);

  const cleanupNetwork = useCallback(() => {
    if (socketRef.current) {
      try { socketRef.current.destroy(); } catch (e) {}
      socketRef.current = null;
    }
    if (serverRef.current) {
      try { serverRef.current.close(); } catch (e) {}
      serverRef.current = null;
    }
    setConnected(false);
    setWaiting(false);
  }, []);

  const modalScaleAnim = useRef(new Animated.Value(0)).current;
  const modalOpacityAnim = useRef(new Animated.Value(0)).current;
  const comboAnim = useRef(new Animated.Value(1)).current;
  const comboGlow = useRef(new Animated.Value(0)).current;
  const titleBounce = useRef(new Animated.Value(1)).current;
  const scoreBounce = useRef(new Animated.Value(1)).current;
  const scoreShake = useRef(new Animated.Value(0)).current;
  const screenFade = useRef(new Animated.Value(1)).current;
  const countdownScale = useRef(new Animated.Value(0)).current;
  const countdownOpacity = useRef(new Animated.Value(0)).current;
  const countdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const musicOnRef = useRef(true);
  const splashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const splashLogoScale = useRef(new Animated.Value(0.6)).current;
  const splashLogoOpacity = useRef(new Animated.Value(0)).current;
  const splashCardScale = useRef(new Animated.Value(0.85)).current;
  const splashSunRotate = useRef(new Animated.Value(0)).current;
  const splashSunPulse = useRef(new Animated.Value(1)).current;
  const splashTitlePulse = useRef(new Animated.Value(1)).current;
  const splashProgress = useRef(new Animated.Value(0)).current;
  const splashStarTwinkle = useRef(new Animated.Value(0)).current;
  const splashBalloonAnims = useRef(
    SPLASH_BALLOON_DEFS.map((def, i) => ({
      y: new Animated.Value(SCREEN_HEIGHT + 100 + i * 30),
      wobble: new Animated.Value(0),
      x: SCREEN_WIDTH * def.x - 35 * def.size,
      size: def.size,
      color: def.color,
      face: def.face,
    })),
  ).current;

  useEffect(() => {
    const loadAll = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const unlockedIds: number[] = JSON.parse(saved);
          setLevels(prev =>
            prev.map(l => ({...l, unlocked: unlockedIds.includes(l.id)})),
          );
        }
      } catch (e) {}
      try {
        const savedProfile = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
        if (savedProfile) {
          const p = JSON.parse(savedProfile);
          setProfileName(p.name || '');
          const av = PROFILE_AVATARS.find(a => a.id === p.avatarId);
          if (av) setProfileAvatar(av);
          const tmpl = BALLOON_TEMPLATES.find(t => t.id === p.templateId);
          if (tmpl) setProfileTemplate(tmpl);
          if (p.balloonCount) setProfileBalloonCount(p.balloonCount);
          setProfileSaved(true);
        }
      } catch (e) {}
      try {
        const hs = await AsyncStorage.getItem(HIGH_SCORES_KEY);
        if (hs) setHighScores(JSON.parse(hs));
      } catch (e) {}
      try {
        const ach = await AsyncStorage.getItem(ACHIEVEMENTS_KEY);
        if (ach) setEarnedAchievements(JSON.parse(ach));
      } catch (e) {}
      try {
        const sett = await AsyncStorage.getItem(SETTINGS_KEY);
        if (sett) {
          const s = JSON.parse(sett);
          if (s.soundOn !== undefined) setSoundOn(s.soundOn);
          if (s.musicOn !== undefined) setMusicOn(s.musicOn);
          if (s.vibrationOn !== undefined) setVibrationOn(s.vibrationOn);
          if (s.splashThemeId && SPLASH_THEMES[s.splashThemeId]) setSplashThemeId(s.splashThemeId);
        }
      } catch (e) {}
      try {
        const tut = await AsyncStorage.getItem(TUTORIAL_KEY);
        if (tut === 'true') {
          setTutorialSeen(true);
        } else {
          setShowTutorial(true);
        }
      } catch (e) {
        setShowTutorial(true);
      }
      try {
        const gp = await AsyncStorage.getItem(GOLDEN_POPS_KEY);
        if (gp) setGoldenPopsTotal(parseInt(gp, 10) || 0);
      } catch (e) {}
    };
    loadAll();
    initAds().catch(() => {});
  }, []);

  useEffect(() => {
    if (screen !== 'splash') return;

    splashLogoScale.setValue(0.5);
    splashLogoOpacity.setValue(0);
    splashCardScale.setValue(0.85);
    splashSunRotate.setValue(0);
    splashSunPulse.setValue(1);
    splashTitlePulse.setValue(1);
    splashProgress.setValue(0);
    splashStarTwinkle.setValue(0);

    const logoIn = Animated.parallel([
      Animated.spring(splashLogoScale, {toValue: 1, friction: 4, tension: 90, useNativeDriver: true}),
      Animated.spring(splashCardScale, {toValue: 1, friction: 5, tension: 70, useNativeDriver: true}),
      Animated.timing(splashLogoOpacity, {toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true}),
    ]);

    const sunSpin = Animated.loop(
      Animated.timing(splashSunRotate, {
        toValue: 1,
        duration: 12000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    const sunPulse = Animated.loop(
      Animated.sequence([
        Animated.timing(splashSunPulse, {toValue: 1.12, duration: 1200, useNativeDriver: true}),
        Animated.timing(splashSunPulse, {toValue: 1, duration: 1200, useNativeDriver: true}),
      ]),
    );

    const titlePulse = Animated.loop(
      Animated.sequence([
        Animated.timing(splashTitlePulse, {toValue: 1.06, duration: 900, useNativeDriver: true}),
        Animated.timing(splashTitlePulse, {toValue: 1, duration: 900, useNativeDriver: true}),
      ]),
    );

    const starTwinkle = Animated.loop(
      Animated.sequence([
        Animated.timing(splashStarTwinkle, {toValue: 1, duration: 800, useNativeDriver: true}),
        Animated.timing(splashStarTwinkle, {toValue: 0.3, duration: 800, useNativeDriver: true}),
      ]),
    );

    const progressAnim = Animated.timing(splashProgress, {
      toValue: 1,
      duration: SPLASH_DURATION_MS,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: false,
    });

    const floatLoops = splashBalloonAnims.map((balloon, i) => {
      const wobbleLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(balloon.wobble, {toValue: 1, duration: 900 + i * 100, useNativeDriver: true}),
          Animated.timing(balloon.wobble, {toValue: -1, duration: 900 + i * 100, useNativeDriver: true}),
        ]),
      );
      wobbleLoop.start();
      return Animated.loop(
        Animated.sequence([
          Animated.timing(balloon.y, {
            toValue: -140,
            duration: 3200 + i * 280,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(balloon.y, {
            toValue: SCREEN_HEIGHT + 120,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      );
    });

    logoIn.start();
    sunSpin.start();
    sunPulse.start();
    titlePulse.start();
    starTwinkle.start();
    progressAnim.start();
    floatLoops.forEach(loop => loop.start());

    splashTimerRef.current = setTimeout(() => {
      setScreen('home');
    }, SPLASH_DURATION_MS);

    return () => {
      if (splashTimerRef.current) {
        clearTimeout(splashTimerRef.current);
        splashTimerRef.current = null;
      }
      sunSpin.stop();
      sunPulse.stop();
      titlePulse.stop();
      starTwinkle.stop();
      progressAnim.stop();
      floatLoops.forEach(loop => loop.stop());
      splashBalloonAnims.forEach(b => b.wobble.stopAnimation());
    };
  }, [screen, splashLogoScale, splashLogoOpacity, splashCardScale, splashSunRotate, splashSunPulse, splashTitlePulse, splashProgress, splashStarTwinkle, splashBalloonAnims]);

  const saveProgress = useCallback(async (unlockedIds: number[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(unlockedIds));
    } catch (e) {}
  }, []);

  const saveProfile = useCallback(async () => {
    try {
      const data = {
        name: profileName,
        avatarId: profileAvatar.id,
        templateId: profileTemplate.id,
        balloonCount: profileBalloonCount,
      };
      await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(data));
      setProfileSaved(true);
    } catch (e) {}
  }, [profileName, profileAvatar, profileTemplate, profileBalloonCount]);

  const saveHighScore = useCallback(async (levelId: number, newScore: number, totalBalloons: number) => {
    const stars = newScore >= totalBalloons ? 3 : newScore >= Math.ceil(totalBalloons * 0.66) ? 2 : newScore >= Math.ceil(totalBalloons * 0.33) ? 1 : 0;
    setHighScores(prev => {
      const existing = prev[levelId];
      if (existing && existing.score >= newScore) return prev;
      const updated = {...prev, [levelId]: {score: newScore, stars: Math.max(stars, existing?.stars || 0)}};
      AsyncStorage.setItem(HIGH_SCORES_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const unlockAchievement = useCallback(async (id: string) => {
    setEarnedAchievements(prev => {
      if (prev.includes(id)) return prev;
      const updated = [...prev, id];
      AsyncStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const saveSettings = useCallback(async (s: {
    soundOn: boolean;
    musicOn: boolean;
    vibrationOn: boolean;
    splashThemeId?: string;
  }) => {
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
    } catch (e) {}
  }, []);

  const dismissTutorial = useCallback(async () => {
    setShowTutorial(false);
    setTutorialSeen(true);
    try {
      await AsyncStorage.setItem(TUTORIAL_KEY, 'true');
    } catch (e) {}
  }, []);

  const resetAllProgress = useCallback(async () => {
    Alert.alert('Reset Progress', 'This will erase all your progress, scores, and achievements. Are you sure?', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Reset', style: 'destructive', onPress: async () => {
        try {
          await AsyncStorage.multiRemove([STORAGE_KEY, HIGH_SCORES_KEY, ACHIEVEMENTS_KEY, TUTORIAL_KEY, GOLDEN_POPS_KEY]);
          setLevels(LEVELS);
          setHighScores({});
          setEarnedAchievements([]);
          setGoldenPopsTotal(0);
          setTutorialSeen(false);
        } catch (e) {}
      }},
    ]);
  }, []);

  // Floating background decorations
  const bgFloaters = useRef(
    Array.from({length: 6}, () => ({
      y: new Animated.Value(SCREEN_HEIGHT + Math.random() * 200),
      x: Math.random() * SCREEN_WIDTH,
      size: 20 + Math.random() * 40,
      opacity: 0.15 + Math.random() * 0.15,
      speed: 10000 + Math.random() * 15000,
      emoji: ['🌟', '✨', '💫', '🎀', '🦋', '🌸'][Math.floor(Math.random() * 6)],
    })),
  ).current;

  const bgBubbles = useRef(
    Array.from({length: 10}, () => ({
      y: new Animated.Value(SCREEN_HEIGHT + Math.random() * 300),
      x: Math.random() * SCREEN_WIDTH,
      size: 15 + Math.random() * 35,
      speed: 8000 + Math.random() * 12000,
      color: BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)],
    })),
  ).current;

  const skyClouds = useRef(
    Array.from({length: 5}, (_, i) => ({
      x: new Animated.Value(-200 - Math.random() * 150),
      y: 60 + i * 90 + Math.random() * 50,
      width: 100 + Math.random() * 80,
      height: 40 + Math.random() * 25,
      speed: 18000 + Math.random() * 14000,
      opacity: 0.7 + Math.random() * 0.3,
    })),
  ).current;

  const skyBirds = useRef(
    Array.from({length: 3}, (_, i) => ({
      x: new Animated.Value(-60 - Math.random() * 100),
      y: 80 + i * 120 + Math.random() * 60,
      speed: 12000 + Math.random() * 8000,
      size: 16 + Math.random() * 8,
    })),
  ).current;

  const skyAnimActiveRef = useRef(false);
  const skyAnimTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const stopSkyAnimations = useCallback(() => {
    skyAnimActiveRef.current = false;
    skyAnimTimeoutsRef.current.forEach(clearTimeout);
    skyAnimTimeoutsRef.current = [];
    skyClouds.forEach(c => c.x.stopAnimation());
    skyBirds.forEach(b => b.x.stopAnimation());
  }, [skyClouds, skyBirds]);

  const startSkyAnimations = useCallback(() => {
    stopSkyAnimations();
    skyAnimActiveRef.current = true;

    skyClouds.forEach((c, i) => {
      const runCloud = () => {
        if (!skyAnimActiveRef.current) return;
        c.x.setValue(-(200 + Math.random() * 120));
        Animated.timing(c.x, {
          toValue: SCREEN_WIDTH + 120,
          duration: c.speed,
          easing: Easing.linear,
          useNativeDriver: true,
        }).start(({finished}) => {
          if (finished && skyAnimActiveRef.current) {
            runCloud();
          }
        });
      };
      const timeout = setTimeout(runCloud, i * 1800);
      skyAnimTimeoutsRef.current.push(timeout);
    });

    skyBirds.forEach((b, i) => {
      const runBird = () => {
        if (!skyAnimActiveRef.current) return;
        b.x.setValue(-(60 + Math.random() * 80));
        Animated.timing(b.x, {
          toValue: SCREEN_WIDTH + 80,
          duration: b.speed,
          easing: Easing.linear,
          useNativeDriver: true,
        }).start(({finished}) => {
          if (finished && skyAnimActiveRef.current) {
            runBird();
          }
        });
      };
      const timeout = setTimeout(runBird, i * 2200 + 800);
      skyAnimTimeoutsRef.current.push(timeout);
    });
  }, [stopSkyAnimations, skyClouds, skyBirds]);

  useEffect(() => {
    const bgTimeouts: ReturnType<typeof setTimeout>[] = [];
    const bgActiveRef = {current: true};

    bgFloaters.forEach((f, i) => {
      const animate = () => {
        if (!bgActiveRef.current) return;
        f.y.setValue(SCREEN_HEIGHT + 50);
        Animated.timing(f.y, {
          toValue: -80,
          duration: f.speed,
          easing: Easing.linear,
          useNativeDriver: true,
        }).start(({finished}) => {
          if (finished && bgActiveRef.current) animate();
        });
      };
      bgTimeouts.push(setTimeout(animate, i * 1800));
    });

    bgBubbles.forEach((b, i) => {
      const animate = () => {
        if (!bgActiveRef.current) return;
        b.y.setValue(SCREEN_HEIGHT + 30);
        Animated.timing(b.y, {
          toValue: -60,
          duration: b.speed,
          easing: Easing.linear,
          useNativeDriver: true,
        }).start(({finished}) => {
          if (finished && bgActiveRef.current) animate();
        });
      };
      bgTimeouts.push(setTimeout(animate, i * 1200));
    });

    // Title bounce loop
    let titleLoopRunning = true;
    const bounceTitle = () => {
      if (!titleLoopRunning) return;
      Animated.sequence([
        Animated.timing(titleBounce, {
          toValue: 1.05,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(titleBounce, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]).start(({finished}) => {
        if (finished && titleLoopRunning) bounceTitle();
      });
    };
    bounceTitle();

    return () => {
      bgActiveRef.current = false;
      titleLoopRunning = false;
      bgTimeouts.forEach(clearTimeout);
      bgFloaters.forEach(f => f.y.stopAnimation());
      bgBubbles.forEach(b => b.y.stopAnimation());
      titleBounce.stopAnimation();
    };
  }, [bgFloaters, bgBubbles, titleBounce]);

  useEffect(() => {
    if (screen === 'game') {
      startSkyAnimations();
      return stopSkyAnimations;
    }
    stopSkyAnimations();
  }, [screen, startSkyAnimations, stopSkyAnimations]);

  useEffect(() => {
    const onAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active' && screenRef.current === 'game') {
        startSkyAnimations();
      } else if (nextState === 'background' || nextState === 'inactive') {
        stopSkyAnimations();
      }
    };
    const sub = AppState.addEventListener('change', onAppStateChange);
    return () => sub.remove();
  }, [startSkyAnimations, stopSkyAnimations]);

  const showModal = useCallback(() => {
    modalScaleAnim.setValue(0.75);
    modalOpacityAnim.setValue(0);
    Animated.parallel([
      Animated.spring(modalScaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 90,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacityAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [modalScaleAnim, modalOpacityAnim]);

  const triggerComboAnim = useCallback(() => {
    comboAnim.setValue(1.6);
    Animated.spring(comboAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
    comboGlow.setValue(1);
    Animated.timing(comboGlow, {toValue: 0, duration: 400, useNativeDriver: true}).start();
  }, [comboAnim, comboGlow]);

  const triggerScoreBounce = useCallback(() => {
    scoreBounce.setValue(1.4);
    Animated.spring(scoreBounce, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();
  }, [scoreBounce]);

  const triggerScoreShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(scoreShake, {toValue: 10, duration: 50, useNativeDriver: true}),
      Animated.timing(scoreShake, {toValue: -10, duration: 50, useNativeDriver: true}),
      Animated.timing(scoreShake, {toValue: 8, duration: 50, useNativeDriver: true}),
      Animated.timing(scoreShake, {toValue: -8, duration: 50, useNativeDriver: true}),
      Animated.timing(scoreShake, {toValue: 0, duration: 50, useNativeDriver: true}),
    ]).start();
  }, [scoreShake]);

  const celebrateAndShowResult = useCallback((screenName: 'result' | 'multi_result' = 'result') => {
    setScreen(screenName);
    showModal();

    const cx = SCREEN_WIDTH / 2;
    const cy = SCREEN_HEIGHT / 2;
    spawnConfetti(cx, cy - 100);
    setTimeout(() => spawnConfetti(cx - 80, cy), 80);
    setTimeout(() => spawnConfetti(cx + 80, cy), 160);
    if (soundOn) {
      const s = cheerSounds.current[cheerIndex.current % cheerSounds.current.length];
      if (s?.isLoaded()) { s.stop(() => { s.play(); }); }
      cheerIndex.current++;
    }
  }, [spawnConfetti, showModal, soundOn]);

  const triggerGameEnd = useCallback((screenName: 'result' | 'multi_result' = 'result') => {
    if (gameEndTriggeredRef.current) return;
    gameEndTriggeredRef.current = true;
    gameRunningRef.current = false;
    setGameRunning(false);
    if (spawnIntervalRef.current) {
      clearInterval(spawnIntervalRef.current);
      spawnIntervalRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (gameEndTimerRef.current) clearTimeout(gameEndTimerRef.current);
    gameEndTimerRef.current = setTimeout(() => {
      gameEndTimerRef.current = null;
      adGateOpenRef.current = true;
      preloadRewardedAd();
      celebrateAndShowResult(screenName);
    }, GAME_END_DELAY_MS);
  }, [celebrateAndShowResult]);

  const spawnScorePopup = useCallback((x: number, y: number, text = '+1', color = '#FFD93D') => {
    const id = popupIdRef.current++;
    const opacity = new Animated.Value(1);
    const translateY = new Animated.Value(0);
    const scale = new Animated.Value(0.5);

    setScorePopups(prev => [...prev, {id, x, y, opacity, translateY, scale, text, color}]);

    Animated.parallel([
      Animated.timing(translateY, {toValue: -60, duration: 600, useNativeDriver: true}),
      Animated.timing(scale, {toValue: 1.2, duration: 200, useNativeDriver: true}),
      Animated.sequence([
        Animated.delay(300),
        Animated.timing(opacity, {toValue: 0, duration: 300, useNativeDriver: true}),
      ]),
    ]).start(() => {
      setScorePopups(prev => prev.filter(p => p.id !== id));
    });
  }, []);

  const spawnConfetti = useCallback((originX: number, originY: number) => {
    const burstId = `burst_${confettiIdRef.current++}`;
    const pieces: ConfettiPiece[] = [];

    for (let i = 0; i < CONFETTI_COUNT; i++) {
      const angle = (Math.PI * 2 * i) / CONFETTI_COUNT + (Math.random() - 0.5) * 0.6;
      const distance = 60 + Math.random() * 110;
      const shapes: Array<'square' | 'rect' | 'circle'> = ['square', 'rect', 'circle'];

      pieces.push({
        id: `${burstId}_${i}`,
        x: originX,
        y: originY,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        translateX: new Animated.Value(0),
        translateY: new Animated.Value(0),
        opacity: new Animated.Value(1),
        rotate: new Animated.Value(0),
        scale: new Animated.Value(1),
        width: shapes[i % 3] === 'rect' ? 7 + Math.random() * 5 : 8 + Math.random() * 5,
        height: shapes[i % 3] === 'rect' ? 12 + Math.random() * 8 : 8 + Math.random() * 5,
        shape: shapes[i % 3],
      });

      const targetX = Math.cos(angle) * distance;
      const targetY = Math.sin(angle) * distance - 30;

      Animated.parallel([
        Animated.sequence([
          Animated.timing(pieces[i].scale, {toValue: 1.5, duration: 80, useNativeDriver: true}),
          Animated.timing(pieces[i].scale, {toValue: 0.6, duration: 250, useNativeDriver: true}),
        ]),
        Animated.timing(pieces[i].translateX, {toValue: targetX, duration: 550, useNativeDriver: true}),
        Animated.sequence([
          Animated.timing(pieces[i].translateY, {toValue: targetY, duration: 250, useNativeDriver: true}),
          Animated.timing(pieces[i].translateY, {toValue: targetY + 140 + Math.random() * 70, duration: 450, useNativeDriver: true}),
        ]),
        Animated.timing(pieces[i].rotate, {toValue: 3 + Math.random() * 5, duration: 700, useNativeDriver: true}),
        Animated.sequence([
          Animated.delay(350),
          Animated.timing(pieces[i].opacity, {toValue: 0, duration: 350, useNativeDriver: true}),
        ]),
      ]).start();
    }

    setConfettiBursts(prev => [...prev, {id: burstId, pieces}]);
    setTimeout(() => {
      setConfettiBursts(prev => prev.filter(b => b.id !== burstId));
    }, 1000);
  }, []);

  const spawnBalloon = useCallback(() => {
    if (!gameRunningRef.current || pausedRef.current) return;

    const id = balloonIdRef.current++;
    const isProfileGame = currentLevel.id === 99;
    const levelId = currentLevel.id;
    const theme = isProfileGame
      ? {
          faces: BALLOON_FACES,
          colors: profileTemplate.colors,
          shapes: profileTemplate.shapes,
          badge: '🎈',
          ringColor: '#6C5CE7',
          rates: DEFAULT_SPAWN_RATES,
        }
      : getLevelTheme(levelId);

    const roll = Math.random();
    let specialType: BalloonSpecialType = 'normal';
    let sizeMultiplier = 1;
    let tapsLeft = 1;
    let face = theme.faces[Math.floor(Math.random() * theme.faces.length)];
    let color = theme.colors[Math.floor(Math.random() * theme.colors.length)];
    const rates = theme.rates;

    let cursor = 0;
    if (roll < (cursor += rates.golden)) {
      specialType = 'golden';
      color = '#FFD700';
      face = '🌟';
    } else if (roll < (cursor += rates.bomb)) {
      specialType = 'bomb';
      color = '#2C3E50';
      face = '💀';
    } else if (roll < (cursor += rates.devil)) {
      specialType = 'devil';
      color = '#1A1A1A';
      face = ['😈', '👿', '🔥'][Math.floor(Math.random() * 3)];
    } else if (roll < (cursor += rates.ghost)) {
      specialType = 'ghost';
      color = '#DCD6FF';
      face = '👻';
    } else if (roll < (cursor += rates.frozen)) {
      specialType = 'frozen';
      color = '#74B9FF';
      face = '🥶';
    } else if (roll < (cursor += rates.tiny)) {
      specialType = 'tiny';
      sizeMultiplier = 0.6;
      face = '🤏';
    } else if (roll < (cursor += rates.giant)) {
      specialType = 'giant';
      sizeMultiplier = 1.35;
      tapsLeft = 2;
      face = '💪';
    }

    const effectiveWidth = BALLOON_WIDTH * sizeMultiplier;
    const x = Math.random() * (SCREEN_WIDTH - effectiveWidth - 16) + 8;
    const shape = theme.shapes[Math.floor(Math.random() * theme.shapes.length)];
    const animValue = new Animated.Value(SCREEN_HEIGHT);
    const wobble = new Animated.Value(0);
    const scaleAnim = new Animated.Value(1);
    let duration = speedRef.current;
    if (specialType === 'frozen') duration *= 1.6;
    if (specialType === 'ghost') duration *= 0.94;

    const newBalloon: Balloon = {
      id,
      x,
      color,
      face,
      shape,
      animValue,
      wobble,
      duration,
      specialType,
      tapsLeft,
      scaleAnim,
      sizeMultiplier,
      themeBadge: theme.badge,
      ringColor: theme.ringColor,
    };

    balloonYPositions.current[id] = SCREEN_HEIGHT;
    const listenerId = animValue.addListener(({value}) => {
      balloonYPositions.current[id] = value;
    });

    setBalloons(prev => [...prev, newBalloon]);

    const wobbleAmp = levelId >= 6 ? 3 : levelId >= 4 ? 2 : 1;
    const wobbleLoop = () => {
      Animated.sequence([
        Animated.timing(wobble, {toValue: wobbleAmp, duration: 400 + Math.random() * 300, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
        Animated.timing(wobble, {toValue: -wobbleAmp, duration: 400 + Math.random() * 300, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
      ]).start(({finished}) => finished && wobbleLoop());
    };
    wobbleLoop();

    Animated.timing(animValue, {
      toValue: -BALLOON_HEIGHT - 20,
      duration,
      useNativeDriver: true,
    }).start(() => {
      animValue.removeListener(listenerId);
      delete balloonYPositions.current[id];
      setBalloons(prev => {
        const still = prev.find(b => b.id === id);
        if (
          still &&
          still.specialType !== 'bomb' &&
          still.specialType !== 'devil' &&
          still.specialType !== 'ghost'
        ) {
          missedRef.current += 1;
          setMissedCount(missedRef.current);
          if (gameModeRef.current === 'survival') {
            livesRef.current -= 1;
            setLivesLeft(livesRef.current);
            if (livesRef.current <= 0) {
              if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current);
              if (timerRef.current) clearInterval(timerRef.current);
              triggerGameEnd();
            }
          }
        }
        return prev.filter(b => b.id !== id);
      });
    });
  }, [currentLevel, triggerGameEnd, profileTemplate]);

  const beginSpawning = useCallback((level: LevelConfig, mode: GameMode) => {
    if (mode === 'timed') {
      setTimeLeft(60);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        if (!gameRunningRef.current || pausedRef.current) return;
        setTimeLeft(prev => {
          if (prev <= 1) {
            if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current);
            if (timerRef.current) clearInterval(timerRef.current);
            triggerGameEnd();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current);

    spawnIntervalRef.current = setInterval(() => {
      if (!gameRunningRef.current || pausedRef.current) return;
      const isSurvivalOrTimed = mode === 'survival' || mode === 'timed';

      if (!isSurvivalOrTimed && spawnedCountRef.current >= level.totalBalloons) {
        if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current);
        return;
      }

      spawnBalloon();
      spawnedCountRef.current += 1;
      if (!isSurvivalOrTimed) {
        setBalloonsLeft(level.totalBalloons - spawnedCountRef.current);
      }

      if (speedRef.current > level.minSpeed) {
        speedRef.current -= level.speedDecay;
      }

      if (!isSurvivalOrTimed && spawnedCountRef.current >= level.totalBalloons) {
        if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current);
        if (isMultiplayer) {
          sendToOpponent({type: 'game_end', score: scoreRef.current});
          triggerGameEnd('multi_result');
        } else {
          triggerGameEnd();
        }
      }
    }, level.spawnInterval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spawnBalloon, isMultiplayer, sendToOpponent, triggerGameEnd]);

  const playCountdownTick = useCallback(() => {
    if (!soundOn) return;
    const s = popSounds.current[soundIndex.current % popSounds.current.length];
    if (s?.isLoaded()) { s.setVolume(1.0); s.stop(() => { s.play(); }); }
    soundIndex.current++;
  }, [soundOn]);

  const playCountdownGo = useCallback(() => {
    if (!soundOn) return;
    const s = cheerSounds.current[cheerIndex.current % cheerSounds.current.length];
    if (s?.isLoaded()) { s.setVolume(1.0); s.stop(() => { s.play(); }); }
    cheerIndex.current++;
  }, [soundOn]);

  const clearCountdownTimer = useCallback(() => {
    if (countdownTimerRef.current) {
      clearTimeout(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }, []);

  const quitToHome = useCallback(() => {
    gameRunningRef.current = false;
    setGameRunning(false);
    setPaused(false);
    pausedRef.current = false;
    clearCountdownTimer();
    setShowCountdown(false);
    if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    if (isMultiplayer) cleanupNetwork();
    setScreen('home');
  }, [clearCountdownTimer, cleanupNetwork, isMultiplayer]);

  const handleHardwareBack = useCallback(() => {
    switch (screenRef.current) {
      case 'splash':
        return true;
      case 'home':
        BackHandler.exitApp();
        return true;
      case 'settings':
      case 'achievements':
      case 'profile':
      case 'lobby':
        cleanupNetwork();
        setSelectedMode('single');
        setScreen('home');
        return true;
      case 'game':
        quitToHome();
        return true;
      case 'multi_result':
        cleanupNetwork();
        setScreen('home');
        return true;
      default:
        return false;
    }
  }, [cleanupNetwork, quitToHome]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', handleHardwareBack);
    return () => sub.remove();
  }, [handleHardwareBack]);

  const pulseCountdownDigit = useCallback((isGo = false) => {
    countdownScale.setValue(0.4);
    countdownOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(countdownScale, {
        toValue: isGo ? 1.1 : 1,
        friction: 5,
        tension: 120,
        useNativeDriver: true,
      }),
      Animated.timing(countdownOpacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [countdownScale, countdownOpacity]);

  const runGameCountdown = useCallback((onComplete: () => void, withSound = true) => {
    clearCountdownTimer();
    setShowCountdown(true);
    const steps = [3, 2, 1, 0];
    let stepIdx = 0;

    const tick = () => {
      const val = steps[stepIdx];
      setCountdown(val);
      if (withSound) {
        if (val > 0) playCountdownTick();
        else playCountdownGo();
      }
      pulseCountdownDigit(val === 0);
      stepIdx += 1;
      if (stepIdx < steps.length) {
        countdownTimerRef.current = setTimeout(tick, 800);
      } else {
        countdownTimerRef.current = setTimeout(() => {
          setShowCountdown(false);
          onComplete();
        }, 800);
      }
    };

    tick();
  }, [clearCountdownTimer, playCountdownTick, playCountdownGo, pulseCountdownDigit]);

  const startGame = useCallback(
    (level: LevelConfig, mode: GameMode = 'levels') => {
      setCurrentLevel(level);
      setScore(0);
      scoreRef.current = 0;
      setCombo(0);
      comboRef.current = 0;
      setBalloonsLeft(level.totalBalloons);
      setGameRunning(false);
      setScreen('game');
      setBalloons([]);
      setConfettiBursts([]);
      setScorePopups([]);
      setPaused(false);
      pausedRef.current = false;
      setMissedCount(0);
      missedRef.current = 0;
      setActivePowerUp(null);
      setGameMode(mode);
      gameModeRef.current = mode;
      balloonYPositions.current = {};
      gameRunningRef.current = false;
      speedRef.current = level.speed;
      balloonIdRef.current = 0;
      spawnedCountRef.current = 0;
      gameEndTriggeredRef.current = false;
      if (gameEndTimerRef.current) {
        clearTimeout(gameEndTimerRef.current);
        gameEndTimerRef.current = null;
      }

      if (mode === 'survival') {
        setLivesLeft(3);
        livesRef.current = 3;
      }

      runGameCountdown(() => {
        gameRunningRef.current = true;
        setGameRunning(true);
        beginSpawning(level, mode);
      });
    },
    [runGameCountdown],
  );

  const startGameWithAd = useCallback(
    (level: LevelConfig, mode: GameMode = 'levels') => {
      if (!adGateOpenRef.current) {
        startGame(level, mode);
        return;
      }
      fadeOutAllMusic();
      showVideoAdBetweenPlays(() => startGame(level, mode));
    },
    [startGame, fadeOutAllMusic],
  );

  const runCountdown = useCallback((onDone: () => void) => {
    runGameCountdown(onDone, false);
  }, [runGameCountdown]);

  const pendingGoRef = useRef(false);
  const pendingGoLevelRef = useRef(0);

  const startMultiplayerGame = useCallback(() => {
    const chosenLevel = levels[multiLevelIdx] || levels[0];
    sendToOpponent({type: 'start', levelIdx: multiLevelIdx});
    setOpponentScore(0);
    poppedByRemoteRef.current.clear();
    runCountdown(() => {
      sendToOpponent({type: 'go', levelIdx: multiLevelIdx});
      setTimeout(() => {
        startGame(chosenLevel);
      }, 150);
    });
  }, [sendToOpponent, startGame, levels, multiLevelIdx, runCountdown]);

  useEffect(() => {
    if (pendingStartRef.current) {
      pendingStartRef.current = false;
      setOpponentScore(0);
      poppedByRemoteRef.current.clear();
      runCountdown(() => {});
    }
  });

  useEffect(() => {
    if (pendingGoRef.current) {
      pendingGoRef.current = false;
      const lvl = levels[pendingGoLevelRef.current] || levels[0];
      setShowCountdown(false);
      startGame(lvl);
    }
  });

  const popBalloon = useCallback(
    (balloon: Balloon) => {
      if (!gameRunningRef.current || pausedRef.current) return;
      if (isMultiplayer && poppedByRemoteRef.current.has(balloon.id)) {
        poppedByRemoteRef.current.delete(balloon.id);
        return;
      }

      if (balloon.specialType === 'giant' && balloon.tapsLeft > 1) {
        setBalloons(prev => prev.map(b =>
          b.id === balloon.id ? {...b, tapsLeft: b.tapsLeft - 1, face: '😵'} : b,
        ));
        playPopSound();
        if (vibrationOn) try { Vibration.vibrate(20); } catch (e) {}
        Animated.sequence([
          Animated.timing(balloon.scaleAnim, {toValue: 1.3, duration: 80, useNativeDriver: true}),
          Animated.timing(balloon.scaleAnim, {toValue: 1, duration: 100, useNativeDriver: true}),
        ]).start();
        return;
      }

      const currentY = balloonYPositions.current[balloon.id] ?? SCREEN_HEIGHT / 2;
      const popX = balloon.x + BALLOON_WIDTH / 2;
      const popY = currentY + BALLOON_HEIGHT / 2;

      if (
        balloon.specialType === 'bomb' ||
        balloon.specialType === 'devil' ||
        balloon.specialType === 'ghost'
      ) {
        playPopSound();
        if (vibrationOn) try { Vibration.vibrate(100); } catch (e) {}
        const penalty =
          balloon.specialType === 'devil' ? 2 : balloon.specialType === 'ghost' ? 1 : 2;
        setScore(prev => {
          const newScore = Math.max(0, prev - penalty);
          scoreRef.current = newScore;
          return newScore;
        });
        spawnScorePopup(
          popX,
          popY,
          `-${penalty}`,
          balloon.specialType === 'devil'
            ? '#8B0000'
            : balloon.specialType === 'ghost'
              ? '#9B59B6'
              : '#FF4444',
        );
        triggerScoreShake();
        setCombo(0);
        comboRef.current = 0;
        delete balloonYPositions.current[balloon.id];
        Animated.timing(balloon.scaleAnim, {toValue: 1.5, duration: 100, useNativeDriver: true}).start(() => {
          setBalloons(prev => prev.filter(b => b.id !== balloon.id));
        });
        return;
      }

      playPopSound();
      if (vibrationOn) try { Vibration.vibrate(30); } catch (e) {}

      let points = activePowerUp === 'double' ? 2 : 1;
      let popupText = '+1';
      let popupColor = '#FFD93D';

      if (balloon.specialType === 'golden') {
        points = activePowerUp === 'double' ? 6 : 3;
        popupText = `+${points}`;
        popupColor = '#FFD700';
        setGoldenPopsTotal(prev => {
          const nv = prev + 1;
          AsyncStorage.setItem(GOLDEN_POPS_KEY, String(nv)).catch(() => {});
          if (nv >= 10) unlockAchievement('golden_touch');
          return nv;
        });
      } else if (balloon.specialType === 'frozen') {
        points = activePowerUp === 'double' ? 4 : 2;
        popupText = `+${points}`;
        popupColor = '#74B9FF';
      } else if (balloon.specialType === 'tiny') {
        points = activePowerUp === 'double' ? 4 : 2;
        popupText = `+${points}`;
        popupColor = '#A29BFE';
      } else if (balloon.specialType === 'giant') {
        points = activePowerUp === 'double' ? 6 : 3;
        popupText = `+${points}`;
        popupColor = '#55EFC4';
      } else if (activePowerUp === 'double') {
        popupText = '+2';
      }

      setScore(prev => {
        const newScore = prev + points;
        scoreRef.current = newScore;
        if (isMultiplayer) {
          sendToOpponent({type: 'pop', balloonId: balloon.id, score: newScore});
        }
        if (newScore >= 1) unlockAchievement('first_pop');
        return newScore;
      });
      triggerScoreBounce();
      setCombo(prev => {
        const nc = prev + 1;
        comboRef.current = nc;
        triggerComboAnim();
        if (nc >= 10) unlockAchievement('combo_king');
        return nc;
      });

      if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
      comboTimerRef.current = setTimeout(() => { setCombo(0); comboRef.current = 0; }, 1500);

      spawnConfetti(popX, popY);
      spawnScorePopup(popX, popY, popupText, popupColor);

      delete balloonYPositions.current[balloon.id];
      Animated.timing(balloon.scaleAnim, {toValue: 1.4, duration: 80, useNativeDriver: true}).start(() => {
        setBalloons(prev => prev.filter(b => b.id !== balloon.id));
      });
    },
    [spawnConfetti, spawnScorePopup, triggerComboAnim, triggerScoreBounce, triggerScoreShake, playPopSound, isMultiplayer, sendToOpponent, vibrationOn, activePowerUp, unlockAchievement],
  );

  const handleResult = useCallback(() => {
    const passed = score >= currentLevel.requiredScore;
    if (timerRef.current) clearInterval(timerRef.current);

    if (currentLevel.id <= 7) {
      saveHighScore(currentLevel.id, score, currentLevel.totalBalloons);
    }

    if (passed && score >= currentLevel.totalBalloons && currentLevel.id <= 7) {
      unlockAchievement('perfect');
    }
    if (passed && currentLevel.id === 3) unlockAchievement('speed_demon');
    if (passed && currentLevel.id === 4) unlockAchievement('night_owl');
    if (passed && currentLevel.id === 5) unlockAchievement('deep_diver');
    if (passed && currentLevel.id === 6) unlockAchievement('astronaut');
    if (passed && currentLevel.id === 7) unlockAchievement('galaxy_master');
    if (gameMode === 'survival' && score >= 20) unlockAchievement('survivor');
    if (gameMode === 'timed' && score >= 30) unlockAchievement('time_lord');

    if (passed && currentLevel.id < 7) {
      setLevels(prev => {
        const updated = prev.map(l =>
          l.id === currentLevel.id + 1 ? {...l, unlocked: true} : l,
        );
        const unlockedIds = updated.filter(l => l.unlocked).map(l => l.id);
        saveProgress(unlockedIds);
        return updated;
      });
    }
    setScreen('home');
  }, [score, currentLevel, saveProgress, saveHighScore, unlockAchievement, gameMode]);

  useEffect(() => {
    return () => {
      if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current);
      if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      if (powerUpTimerRef.current) clearTimeout(powerUpTimerRef.current);
    };
  }, []);

  const togglePause = useCallback(() => {
    setPaused(p => {
      const next = !p;
      pausedRef.current = next;
      if (
        musicOnRef.current &&
        activeMusicTrackRef.current === 'game' &&
        homeMusicRef.current?.isLoaded()
      ) {
        const target = next ? 0.1 : MUSIC_VOLUME.gameplay;
        fadeSoundVolume(homeMusicRef.current, homeVolumeRef.current, target, 280, () => {
          homeVolumeRef.current = target;
        });
      }
      return next;
    });
  }, []);

  const passed = score >= currentLevel.requiredScore;

  const getShapeStyle = (shape: BalloonShape) => {
    switch (shape) {
      case 'round':
        return {width: 70, height: 70, borderRadius: 35, borderBottomLeftRadius: 35, borderBottomRightRadius: 35};
      case 'oval':
        return {width: 60, height: 88, borderRadius: 30, borderBottomLeftRadius: 22, borderBottomRightRadius: 22};
      case 'heart':
        return {width: 68, height: 66, borderRadius: 34, borderBottomLeftRadius: 4, borderBottomRightRadius: 4, borderTopLeftRadius: 34, borderTopRightRadius: 34};
      case 'long':
        return {width: 52, height: 96, borderRadius: 26, borderBottomLeftRadius: 20, borderBottomRightRadius: 20};
      case 'wide':
        return {width: 80, height: 66, borderRadius: 40, borderBottomLeftRadius: 32, borderBottomRightRadius: 32};
      default:
        return {width: 70, height: 86, borderRadius: 35, borderBottomLeftRadius: 22, borderBottomRightRadius: 22};
    }
  };

  const renderAnimatedBg = () => (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {bgBubbles.map((b, i) => (
        <Animated.View
          key={`bb_${i}`}
          style={{
            position: 'absolute',
            left: b.x,
            width: b.size,
            height: b.size,
            borderRadius: b.size / 2,
            backgroundColor: '#FFE66D',
            opacity: 0.15,
            transform: [{translateY: b.y}],
          }}
        />
      ))}
      {bgFloaters.map((f, i) => (
        <Animated.View
          key={`bf_${i}`}
          style={{
            position: 'absolute',
            left: f.x,
            opacity: f.opacity,
            transform: [{translateY: f.y}],
          }}>
          <Text style={{fontSize: f.size}}>{['⭐', '✨', '🌟', '💫', '✨'][i % 5]}</Text>
        </Animated.View>
      ))}
    </View>
  );

  const SKY_THEMES: Record<number, {
    skyTop: string; skyMid: string; skyBot: string; containerBg: string;
    sunColor: string; sunBorder: string; sunRay: string; sunFace: string;
    cloudColor: string; cloudShadow: string;
    hillBack: string; hillMid: string; hillFront: string;
    sparkles: string[]; flowers: string[]; birds: string;
    rainbowColors: string[];
    statusBg: string; statusStyle: 'light-content' | 'dark-content';
  }> = {
    1: {
      skyTop: '#5BB8F5', skyMid: '#7ECBF5', skyBot: '#A8DDFB', containerBg: '#87CEEB',
      sunColor: '#FFD93D', sunBorder: '#FFC107', sunRay: '#FFE98A', sunFace: '😊',
      cloudColor: '#FFFFFF', cloudShadow: '#B0D4F1',
      hillBack: '#7DC87D', hillMid: '#5CB85C', hillFront: '#4CAF50',
      sparkles: ['✨', '⭐', '💫', '✨'], flowers: ['🌸', '🌼', '🌺', '🌻'],
      birds: '🕊️',
      rainbowColors: ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#C77DFF'],
      statusBg: '#5BB8F5', statusStyle: 'dark-content',
    },
    2: {
      skyTop: '#FF7EB3', skyMid: '#FF9DC4', skyBot: '#FFBDD6', containerBg: '#FFB6C1',
      sunColor: '#FF6B9D', sunBorder: '#E84393', sunRay: '#FFB8D4', sunFace: '🤩',
      cloudColor: '#FFF0F5', cloudShadow: '#FFB6C1',
      hillBack: '#9B59B6', hillMid: '#8E44AD', hillFront: '#7D3C98',
      sparkles: ['💖', '💗', '✨', '💫'], flowers: ['🌷', '🌹', '💐', '🌺'],
      birds: '🦋',
      rainbowColors: ['#FF6B9D', '#FF85AB', '#FFA0BC', '#FFB8D4', '#FFD0E6'],
      statusBg: '#FF7EB3', statusStyle: 'light-content',
    },
    3: {
      skyTop: '#FF8C42', skyMid: '#FFB347', skyBot: '#FFD180', containerBg: '#FFCC80',
      sunColor: '#FF6B35', sunBorder: '#E55100', sunRay: '#FFB74D', sunFace: '😎',
      cloudColor: '#FFF3E0', cloudShadow: '#FFB74D',
      hillBack: '#D4A35A', hillMid: '#C88B3A', hillFront: '#B87333',
      sparkles: ['🔥', '⚡', '💥', '🌟'], flowers: ['🌵', '🏵️', '🌾', '🍂'],
      birds: '🦅',
      rainbowColors: ['#FF6B35', '#FF8C42', '#FFA726', '#FFB74D', '#FFCC80'],
      statusBg: '#FF8C42', statusStyle: 'light-content',
    },
    4: {
      skyTop: '#0F0C29', skyMid: '#1A1A3E', skyBot: '#24243E', containerBg: '#16163A',
      sunColor: '#F5F5DC', sunBorder: '#CCCCAA', sunRay: '#444466', sunFace: '🌙',
      cloudColor: '#2A2A4A', cloudShadow: '#111133',
      hillBack: '#1A1A3A', hillMid: '#151530', hillFront: '#101028',
      sparkles: ['🌟', '✨', '💫', '⭐'], flowers: ['🌃', '🏮', '🕯️', '🌠'],
      birds: '🦇',
      rainbowColors: ['#E94560', '#C03060', '#A02050', '#802040', '#601030'],
      statusBg: '#0F0C29', statusStyle: 'light-content',
    },
    5: {
      skyTop: '#006994', skyMid: '#0088AA', skyBot: '#00AACC', containerBg: '#0099BB',
      sunColor: '#00CED1', sunBorder: '#008B8B', sunRay: '#40E0D0', sunFace: '🐙',
      cloudColor: '#B0E0E6', cloudShadow: '#5F9EA0',
      hillBack: '#2E8B57', hillMid: '#20B2AA', hillFront: '#008080',
      sparkles: ['🫧', '🐚', '🪸', '💎'], flowers: ['🐠', '🦀', '🌊', '🐡'],
      birds: '🐟',
      rainbowColors: ['#00CED1', '#00B4CC', '#009AB7', '#0080A2', '#00668D'],
      statusBg: '#006994', statusStyle: 'light-content',
    },
    6: {
      skyTop: '#000011', skyMid: '#0A0A2A', skyBot: '#151540', containerBg: '#080822',
      sunColor: '#66FCF1', sunBorder: '#45A29E', sunRay: '#334466', sunFace: '🪐',
      cloudColor: '#1F2833', cloudShadow: '#0B0C10',
      hillBack: '#1F2833', hillMid: '#151D28', hillFront: '#0B0C10',
      sparkles: ['🌟', '💫', '✨', '🛸'], flowers: ['🌑', '🪐', '☄️', '🚀'],
      birds: '🛰️',
      rainbowColors: ['#66FCF1', '#55DCD1', '#44BCB1', '#339C91', '#227C71'],
      statusBg: '#000011', statusStyle: 'light-content',
    },
    200: {
      skyTop: '#5BB8F5', skyMid: '#7ECBF5', skyBot: '#A8DDFB', containerBg: '#87CEEB',
      sunColor: '#FFD93D', sunBorder: '#FFC107', sunRay: '#FFE98A', sunFace: '😬',
      cloudColor: '#FFFFFF', cloudShadow: '#B0D4F1',
      hillBack: '#7DC87D', hillMid: '#5CB85C', hillFront: '#4CAF50',
      sparkles: ['💀', '🛡️', '⚔️', '✨'], flowers: ['🌸', '🌼', '🌺', '🌻'],
      birds: '🕊️',
      rainbowColors: ['#E74C3C', '#C0392B', '#A93226', '#922B21', '#7B241C'],
      statusBg: '#5BB8F5', statusStyle: 'dark-content',
    },
    201: {
      skyTop: '#FF8C42', skyMid: '#FFB347', skyBot: '#FFD180', containerBg: '#FFCC80',
      sunColor: '#F39C12', sunBorder: '#E67E22', sunRay: '#FFB74D', sunFace: '⏱️',
      cloudColor: '#FFF3E0', cloudShadow: '#FFB74D',
      hillBack: '#7DC87D', hillMid: '#5CB85C', hillFront: '#4CAF50',
      sparkles: ['⏰', '⚡', '🔥', '✨'], flowers: ['🌸', '🌼', '🌺', '🌻'],
      birds: '🕊️',
      rainbowColors: ['#F39C12', '#E67E22', '#D35400', '#BF4500', '#A93C00'],
      statusBg: '#FF8C42', statusStyle: 'light-content',
    },
    99: {
      skyTop: '#6C3EC1', skyMid: '#8B5CF6', skyBot: '#A78BFA', containerBg: '#9B7EDE',
      sunColor: '#E0AAFF', sunBorder: '#C77DFF', sunRay: '#D8B4FE', sunFace: '🌙',
      cloudColor: '#EDE7F6', cloudShadow: '#B39DDB',
      hillBack: '#4A2C8A', hillMid: '#3D1F75', hillFront: '#2D1660',
      sparkles: ['🌟', '⭐', '💜', '✨'], flowers: ['🔮', '💎', '🌌', '🪻'],
      birds: '🦉',
      rainbowColors: ['#C77DFF', '#B07AE8', '#9B6DD1', '#8660BA', '#7253A3'],
      statusBg: '#6C3EC1', statusStyle: 'light-content',
    },
  };

  const getTheme = () => SKY_THEMES[currentLevel.id] || SKY_THEMES[1];

  const renderCartoonSkyBg = () => {
    const t = getTheme();
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* Sky gradient layers */}
        <View style={[styles.skyTop, {backgroundColor: t.skyTop}]} />
        <View style={[styles.skyMiddle, {backgroundColor: t.skyMid}]} />
        <View style={[styles.skyBottom, {backgroundColor: t.skyBot}]} />

        {/* Sun / Moon */}
        <View style={styles.sunOuter}>
          <View style={[styles.sunRay1, {backgroundColor: t.sunRay}]} />
          <View style={[styles.sunRay2, {backgroundColor: t.sunRay}]} />
          <View style={[styles.sunRay3, {backgroundColor: t.sunRay}]} />
          <View style={[styles.sunRay4, {backgroundColor: t.sunRay}]} />
          <View style={[styles.sunCore, {backgroundColor: t.sunColor, borderColor: t.sunBorder, shadowColor: t.sunColor}]}>
            <Text style={styles.sunFace}>{t.sunFace}</Text>
          </View>
        </View>

        {/* Animated Clouds */}
        {skyClouds.map((cloud, i) => (
          <Animated.View
            key={`cloud_${i}`}
            style={[
              styles.cloudGroup,
              {
                top: cloud.y,
                opacity: cloud.opacity,
                transform: [{translateX: cloud.x}],
              },
            ]}>
            <View style={[styles.cloudPuff, {width: cloud.width, height: cloud.height, borderRadius: cloud.height / 2, backgroundColor: t.cloudColor, shadowColor: t.cloudShadow}]} />
            <View style={[styles.cloudPuffSmall, {width: cloud.width * 0.6, height: cloud.height * 0.75, borderRadius: cloud.height * 0.375, top: -cloud.height * 0.35, left: cloud.width * 0.15, backgroundColor: t.cloudColor}]} />
            <View style={[styles.cloudPuffTiny, {width: cloud.width * 0.4, height: cloud.height * 0.6, borderRadius: cloud.height * 0.3, top: -cloud.height * 0.15, left: cloud.width * 0.55, backgroundColor: t.cloudColor}]} />
          </Animated.View>
        ))}

        {/* Birds */}
        {skyBirds.map((bird, i) => (
          <Animated.View
            key={`bird_${i}`}
            style={{
              position: 'absolute',
              top: bird.y,
              transform: [{translateX: bird.x}],
            }}>
            <Text style={{fontSize: bird.size}}>{t.birds}</Text>
          </Animated.View>
        ))}

        {/* Sparkles */}
        <Text style={[styles.skySparkle, {top: 100, left: 30}]}>{t.sparkles[0]}</Text>
        <Text style={[styles.skySparkle, {top: 200, left: SCREEN_WIDTH - 60}]}>{t.sparkles[1]}</Text>
        <Text style={[styles.skySparkle, {top: 320, left: 60}]}>{t.sparkles[2]}</Text>
        <Text style={[styles.skySparkle, {top: 180, left: SCREEN_WIDTH * 0.5}]}>{t.sparkles[3]}</Text>

        {/* Rainbow arc */}
        <View style={styles.rainbowWrap}>
          {t.rainbowColors.map((color, i) => (
            <View key={`rb_${i}`} style={[styles.rainbowBand, {width: 220 - i * 20, height: 110 - i * 10, borderColor: color}]} />
          ))}
        </View>

        {/* Rolling hills at bottom */}
        <View style={styles.hillsContainer}>
          <View style={[styles.hillBack, {backgroundColor: t.hillBack}]} />
          <View style={[styles.hillMid, {backgroundColor: t.hillMid}]} />
          <View style={[styles.hillFront, {backgroundColor: t.hillFront}]} />
          <Text style={[styles.grassTuft, {left: 20, bottom: 30}]}>🌿</Text>
          <Text style={[styles.grassTuft, {left: 80, bottom: 35}]}>🌱</Text>
          <Text style={[styles.grassTuft, {left: SCREEN_WIDTH * 0.4, bottom: 28}]}>🌿</Text>
          <Text style={[styles.grassTuft, {left: SCREEN_WIDTH * 0.6, bottom: 32}]}>🌱</Text>
          <Text style={[styles.grassTuft, {left: SCREEN_WIDTH * 0.8, bottom: 36}]}>🌿</Text>
          <Text style={[styles.hillFlower, {left: 40, bottom: 42}]}>{t.flowers[0]}</Text>
          <Text style={[styles.hillFlower, {left: SCREEN_WIDTH * 0.3, bottom: 38}]}>{t.flowers[1]}</Text>
          <Text style={[styles.hillFlower, {left: SCREEN_WIDTH * 0.7, bottom: 44}]}>{t.flowers[2]}</Text>
          <Text style={[styles.hillFlower, {left: SCREEN_WIDTH - 50, bottom: 40}]}>{t.flowers[3]}</Text>
        </View>
      </View>
    );
  };

  const renderCountdownOverlay = () => {
    if (!showCountdown) return null;
    const displayText = countdown > 0 ? String(countdown) : 'GO!';
    return (
      <View style={styles.countdownOverlay}>
        <View style={styles.countdownPanel}>
          <View style={styles.countdownNumberWrap}>
            <Animated.Text
              adjustsFontSizeToFit
              minimumFontScale={0.6}
              numberOfLines={1}
              style={[
                styles.countdownNumber,
                {transform: [{scale: countdownScale}], opacity: countdownOpacity},
              ]}>
              {displayText}
            </Animated.Text>
          </View>
        </View>
        <Text style={styles.countdownLabel}>
          {countdown > 0 ? 'Get Ready!' : 'Pop them all!'}
        </Text>
        <View style={styles.countdownStepRow}>
          {[3, 2, 1].map(step => {
            const isActive = countdown === step;
            const isDone = countdown === 0 || step > countdown;
            return (
              <View
                key={step}
                style={[
                  styles.countdownStep,
                  isActive && styles.countdownStepActive,
                  isDone && styles.countdownStepDone,
                ]}>
                <Text
                  adjustsFontSizeToFit
                  numberOfLines={1}
                  style={[
                    styles.countdownStepText,
                    (isActive || isDone) && styles.countdownStepTextActive,
                  ]}>
                  {step}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  // ──── SPLASH SCREEN ────
  if (screen === 'splash') {
    const st = getSplashTheme(splashThemeId);
    const sunSpin = splashSunRotate.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });
    const progressWidth = splashProgress.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%'],
    });
    const starOpacity = splashStarTwinkle.interpolate({
      inputRange: [0, 1],
      outputRange: [0.35, 1],
    });

    return (
      <View style={[styles.splashContainer, {backgroundColor: st.skyDeep}]}>
        <StatusBar barStyle={st.statusBarStyle} backgroundColor={st.statusBarBg} />
        <View style={[styles.splashSkyDeep, {backgroundColor: st.skyDeep}]} />
        <View style={[styles.splashSkyMid, {backgroundColor: st.skyMid}]} />
        <View style={[styles.splashSkyGlow, {backgroundColor: st.skyGlow}]} />

        {SPLASH_STARS.map((star, i) => (
          <Animated.Text
            key={`splash-star-${i}`}
            style={[
              styles.splashStar,
              {top: star.top as any, left: star.left as any, fontSize: star.size, opacity: starOpacity, color: st.starColor},
            ]}>
            ✦
          </Animated.Text>
        ))}

        <Animated.View style={[styles.splashSunWrap, {transform: [{scale: splashSunPulse}]}]}>
          <Animated.View style={[styles.splashSunRays, {transform: [{rotate: sunSpin}]}]}>
            {[0, 45, 90, 135].map(deg => (
              <View key={deg} style={[styles.splashSunRay, {backgroundColor: st.sunRay, transform: [{rotate: `${deg}deg`}]}]} />
            ))}
          </Animated.View>
          <View style={[styles.splashSunCore, {backgroundColor: st.sunCoreBg, borderColor: st.sunBorder}]}>
            <Text style={styles.splashSunEmoji}>{st.sunEmoji}</Text>
          </View>
        </Animated.View>

        {splashBalloonAnims.map((balloon, i) => {
          const wobbleRot = balloon.wobble.interpolate({
            inputRange: [-1, 1],
            outputRange: ['-10deg', '10deg'],
          });
          const bw = 70 * balloon.size;
          const bh = 86 * balloon.size;
          const balloonColor = st.balloonColors?.[i % (st.balloonColors?.length || 1)] ?? balloon.color;
          return (
            <Animated.View
              key={`splash-balloon-${i}`}
              style={[
                styles.splashBalloonWrap,
                {
                  left: balloon.x,
                  transform: [{translateY: balloon.y}, {rotate: wobbleRot}],
                },
              ]}>
              <View style={[styles.splashBalloon, {width: bw, height: bh, borderRadius: bw / 2, backgroundColor: balloonColor}]}>
                <View style={[styles.splashBalloonShine, {width: 14 * balloon.size, height: 14 * balloon.size}]} />
                <Text style={[styles.splashBalloonFace, {fontSize: 22 * balloon.size}]}>{balloon.face}</Text>
              </View>
              <View style={[styles.splashBalloonKnot, {backgroundColor: balloonColor}]} />
              <View style={[styles.splashBalloonString, {borderColor: balloonColor}]} />
            </Animated.View>
          );
        })}

        <View style={[styles.splashHillBack, {backgroundColor: st.hillBack}]} />
        <View style={[styles.splashHillFront, {backgroundColor: st.hillFront}]} />
        <Text style={styles.splashGrassLeft}>{st.grassLeft}</Text>
        <Text style={styles.splashGrassRight}>{st.grassRight}</Text>

        <Animated.View style={[
          styles.splashCard,
          {
            opacity: splashLogoOpacity,
            transform: [{scale: splashCardScale}],
            backgroundColor: st.cardBg,
            borderColor: st.cardBorder,
          },
        ]}>
          <View style={[styles.splashCardGlow, {backgroundColor: st.cardGlow}]} />
          <Animated.View style={{transform: [{scale: splashLogoScale}]}}>
            <Image
              source={require('./assets/heliopop-icon-1024.png')}
              style={[styles.splashLogo, {borderColor: st.logoBorder}]}
              resizeMode="cover"
            />
          </Animated.View>
          <Animated.Text style={[styles.splashTitle, {color: st.titleColor, textShadowColor: st.titleShadow, transform: [{scale: splashTitlePulse}]}]}>
            HelioPop
          </Animated.Text>
          <Text style={[styles.splashSubtitle, {color: st.subtitleColor}]}>Tap, Pop & Have Fun!</Text>
          <View style={styles.splashAvatarRow}>
            {['🐥', '🐻', '🐰', '🐱'].map((emoji, i) => (
              <View key={i} style={styles.splashAvatarBubble}>
                <Text style={styles.splashAvatarEmoji}>{emoji}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        <View style={styles.splashCloudRow}>
          <Text style={styles.splashCloud}>☁️</Text>
          <Text style={[styles.splashCloud, styles.splashCloudSmall]}>☁️</Text>
          <Text style={styles.splashCloud}>☁️</Text>
        </View>

        <View style={styles.splashProgressWrap}>
          <Text style={[styles.splashProgressLabel, {color: st.progressLabelColor}]}>Loading fun...</Text>
          <View style={[styles.splashProgressTrack, {backgroundColor: st.progressTrack}]}>
            <Animated.View style={[styles.splashProgressFill, {width: progressWidth, backgroundColor: st.progressFill}]} />
          </View>
        </View>
      </View>
    );
  }

  // ──── HOME SCREEN ────
  if (screen === 'home') {
    return (
      <View style={[styles.container, {backgroundColor: '#2D1B69'}]}>
        <StatusBar barStyle="light-content" backgroundColor="#2D1B69" />
        <View style={[styles.bgGradientTop, {backgroundColor: '#4A2C8A'}]} />
        {renderAnimatedBg()}

        <ScrollView contentContainerStyle={styles.homeContent} showsVerticalScrollIndicator={false}>
          <View style={styles.homeTopBar}>
            <TouchableOpacity activeOpacity={0.7} onPress={() => setScreen('settings')} style={styles.homeIconBtn}>
              <Text style={styles.homeIconBtnText}>⚙️</Text>
            </TouchableOpacity>
            <Animated.View style={{transform: [{scale: titleBounce}]}}>
              <Text style={styles.homeIcon}>🎈</Text>
            </Animated.View>
            <TouchableOpacity activeOpacity={0.7} onPress={() => setScreen('achievements')} style={styles.homeIconBtn}>
              <Text style={styles.homeIconBtnText}>🏆</Text>
            </TouchableOpacity>
          </View>

          <Animated.View style={[styles.homeTitleSection, {transform: [{scale: titleBounce}]}]}>
            <Text style={styles.homeTitle}>HelioPop</Text>
            <Text style={styles.homeSubtitle}>Tap, Pop & Have Fun!</Text>
            <Text style={styles.homeVersion}>Version {APP_VERSION}</Text>
          </Animated.View>

          {/* Mode Selection */}
          <View style={styles.modeSection}>
            <View style={styles.modeRow}>
              <TouchableOpacity
                style={[
                  styles.modeCard,
                  selectedMode === 'single' ? styles.modeCardActive : styles.modeCardInactive,
                ]}
                activeOpacity={0.8}
                onPress={() => {
                  setSelectedMode('single');
                  setIsMultiplayer(false);
                  const nextLevel = levels.find(l => l.unlocked && (!highScores[l.id] || highScores[l.id].score < l.requiredScore))
                    || [...levels].reverse().find(l => l.unlocked)
                    || levels[0];
                  startGameWithAd(nextLevel);
                }}>
                <Text style={styles.modeEmoji}>🎮</Text>
                <Text style={[styles.modeCardTitle, selectedMode !== 'single' && styles.modeTextDim]}>
                  Single Player
                </Text>
                <Text style={[styles.modeCardSub, selectedMode !== 'single' && styles.modeTextDim]}>
                  Play solo levels
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modeCard,
                  selectedMode === 'multi' ? styles.modeCardActive : styles.modeCardInactive,
                ]}
                activeOpacity={0.8}
                onPress={() => {
                  setSelectedMode('multi');
                  setIsMultiplayer(true);
                  setScreen('lobby');
                }}>
                <Text style={styles.modeEmoji}>👫</Text>
                <Text style={[styles.modeCardTitle, selectedMode !== 'multi' && styles.modeTextDim]}>
                  2 Players
                </Text>
                <Text style={[styles.modeCardSub, selectedMode !== 'multi' && styles.modeTextDim]}>
                  WiFi Battle!
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Special Modes */}
          <View style={styles.modeSection}>
            <Text style={styles.levelsSectionTitle}>🎯 Special Modes</Text>
            <View style={styles.modeRow}>
              <TouchableOpacity
                style={[styles.modeCard, styles.modeCardActive, {borderColor: '#E74C3C80'}]}
                activeOpacity={0.8}
                onPress={() => { setIsMultiplayer(false); startGameWithAd(SURVIVAL_LEVEL, 'survival'); }}>
                <Text style={styles.modeEmoji}>🛡️</Text>
                <Text style={styles.modeCardTitle}>Survival</Text>
                <Text style={styles.modeCardSub}>Miss 3 = Game Over</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeCard, styles.modeCardActive, {borderColor: '#F39C1280'}]}
                activeOpacity={0.8}
                onPress={() => { setIsMultiplayer(false); startGameWithAd(TIMED_LEVEL, 'timed'); }}>
                <Text style={styles.modeEmoji}>⏱️</Text>
                <Text style={styles.modeCardTitle}>Timed</Text>
                <Text style={styles.modeCardSub}>60 Second Rush</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Single Player Levels */}
          <View style={styles.levelsContainer}>
            <Text style={styles.levelsSectionTitle}>🎯 Single Player Levels</Text>
            {levels.map(level => (
              <TouchableOpacity
                key={level.id}
                activeOpacity={level.unlocked ? 0.8 : 1}
                onPress={() => {
                  if (level.unlocked) {
                    setIsMultiplayer(false);
                    startGameWithAd(level);
                  }
                }}
                style={[
                  styles.levelCard,
                  {backgroundColor: level.unlocked ? level.accentColor + '25' : 'rgba(255,255,255,0.03)'},
                  !level.unlocked && styles.levelCardLocked,
                ]}>
                <View style={[
                  styles.levelIconCircle,
                  {backgroundColor: level.unlocked ? level.accentColor + '35' : 'rgba(255,255,255,0.08)'},
                ]}>
                  <Text style={styles.levelIcon}>{level.unlocked ? level.icon : '🔒'}</Text>
                </View>
                <View style={styles.levelInfo}>
                  <Text style={[styles.levelName, !level.unlocked && styles.lockedText]}>
                    {level.unlocked ? level.name : `Level ${level.id}`}
                  </Text>
                  <Text style={[styles.levelSubtitle, !level.unlocked && styles.lockedText]}>
                    {level.unlocked
                      ? level.id === 7
                        ? `${level.totalBalloons} balloons · Boss traps! Pop ${level.requiredScore} 💀`
                        : level.id === 6
                          ? `${level.totalBalloons} balloons · Alien traps! Pop ${level.requiredScore} 👽`
                          : level.id >= 4
                            ? `${level.totalBalloons} balloons · New faces! Pop ${level.requiredScore}`
                            : `${level.totalBalloons} balloons · Pop ${level.requiredScore} to win!`
                      : 'Beat previous level to unlock!'}
                  </Text>
                  {level.unlocked && highScores[level.id] && (
                    <View style={styles.levelStarsRow}>
                      {[1, 2, 3].map(s => (
                        <Text key={s} style={{fontSize: 12, opacity: s <= (highScores[level.id]?.stars || 0) ? 1 : 0.2}}>⭐</Text>
                      ))}
                      <Text style={styles.levelBestText}>Best: {highScores[level.id].score}</Text>
                    </View>
                  )}
                </View>
                {level.unlocked && (
                  <View style={[styles.playCircle, {backgroundColor: level.accentColor}]}>
                    <Text style={styles.playCircleText}>▶</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}

          </View>
        </ScrollView>
      </View>
    );
  }

  // ──── LOBBY SCREEN ────
  if (screen === 'lobby') {
    return (
      <View style={[styles.container, {backgroundColor: '#6C5CE7'}]}>
        <StatusBar barStyle="light-content" backgroundColor="#6C5CE7" />
        <View style={[styles.bgGradientTop, {backgroundColor: '#3D1F8E'}]} />
        {renderAnimatedBg()}

        <ScrollView contentContainerStyle={styles.lobbyContent} showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            style={styles.woodBtnWrap}
            activeOpacity={0.75}
            onPress={() => { cleanupNetwork(); setSelectedMode('single'); setScreen('home'); }}>
            <View style={styles.woodBtnOuter}>
              <View style={styles.woodBtnInner}>
                <Text style={styles.woodBtnIcon}>◀</Text>
              </View>
            </View>
          </TouchableOpacity>

          <Text style={styles.lobbyTitle}>👫 2 Player Mode</Text>
          <Text style={styles.lobbySubtitle}>Play with a friend on the same WiFi!</Text>

          {/* Instructions */}
          <View style={styles.instructionBox}>
            <Text style={styles.instructionTitle}>📋 How to Play</Text>
            <Text style={styles.instructionStep}>1️⃣ Both phones must be on the same WiFi</Text>
            <Text style={styles.instructionStep}>2️⃣ Player 1 taps "Create Room" and shares IP</Text>
            <Text style={styles.instructionStep}>3️⃣ Player 2 enters IP and taps "Join Room"</Text>
            <Text style={styles.instructionStep}>4️⃣ Same balloons appear on both screens!</Text>
            <Text style={styles.instructionStep}>5️⃣ Tap fast — first to pop gets the point! 🏆</Text>
          </View>

          {!connected && !waiting && (
            <View style={styles.lobbyButtons}>
              {/* Host */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setIsHost(true);
                  setPlayerName('Chiku 🐥');
                  setOpponentName('Dikku 🐻');
                  startHosting();
                }}
                style={[styles.lobby3dBtn, styles.lobby3dBtnCreate]}>
                <View style={[styles.lobby3dBtnFace, styles.lobby3dBtnFaceCreate]}>
                  <View style={styles.lobbyBtnAvatar}>
                    <Text style={styles.lobbyBtnAvatarText}>🐥</Text>
                  </View>
                  <View>
                    <Text style={styles.lobby3dText}>Create Room</Text>
                    <Text style={styles.lobbyBtnPlayerName}>Chiku</Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Join */}
              <View style={styles.lobbyJoinSection}>
                <Text style={styles.lobbyLabel}>Host's IP Address</Text>
                <TextInput
                  style={styles.lobbyInput}
                  value={hostIp}
                  onChangeText={setHostIp}
                  placeholder="e.g. 192.168.1.5"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    setIsHost(false);
                    setPlayerName('Dikku 🐻');
                    setOpponentName('Chiku 🐥');
                    joinHost();
                  }}
                  style={[styles.lobby3dBtn, styles.lobby3dBtnJoin, {marginTop: 12}]}>
                    <View style={[styles.lobby3dBtnFace, styles.lobby3dBtnFaceJoin]}>
                    <View style={styles.lobbyBtnAvatar}>
                      <Text style={styles.lobbyBtnAvatarText}>🐻</Text>
                    </View>
                    <View>
                      <Text style={styles.lobby3dText}>Join Room</Text>
                      <Text style={styles.lobbyBtnPlayerName}>Dikku</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {waiting && !connected && (
            <View style={styles.waitingBox}>
              <ActivityIndicator size="large" color="#FFE66D" />
              <Text style={styles.waitingText}>
                {isHost ? 'Waiting for player to join...' : 'Connecting...'}
              </Text>
              {isHost && (
                <View style={styles.ipDisplay}>
                  <Text style={styles.ipLabel}>📱 Tell your friend to enter this IP:</Text>
                  <View style={styles.ipValueBox}>
                    <Text style={styles.ipValue}>{myIp}</Text>
                  </View>
                  <Text style={styles.ipHint}>
                    Both phones must be on the same WiFi network
                  </Text>
                </View>
              )}
            </View>
          )}

          {connected && (
            <View style={styles.connectedBox}>
              <Text style={styles.connectedEmoji}>✅</Text>
              <Text style={styles.connectedText}>Connected!</Text>
              <Text style={styles.connectedSub}>
                Playing against: {opponentName}
              </Text>

              {isHost && (
                <>
                  <Text style={styles.pickLevelTitle}>Pick a Level</Text>
                  <View style={styles.pickLevelRow}>
                    {levels.map((lvl, idx) => (
                      <TouchableOpacity
                        key={lvl.id}
                        activeOpacity={0.8}
                        onPress={() => setMultiLevelIdx(idx)}
                        style={[
                          styles.pickLevelBtn,
                          {borderColor: lvl.accentColor},
                          multiLevelIdx === idx && {backgroundColor: lvl.accentColor},
                        ]}>
                        <Text style={styles.pickLevelIcon}>{lvl.icon}</Text>
                        <Text style={[
                          styles.pickLevelName,
                          multiLevelIdx === idx && {color: '#fff'},
                        ]}>
                          {lvl.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={[styles.lobby3dBtn, styles.lobby3dBtnStart, {marginTop: 16}]}
                    onPress={startMultiplayerGame}
                    activeOpacity={0.8}>
                    <View style={[styles.lobby3dBtnFace, styles.lobby3dBtnFaceStart]}>
                      <Text style={styles.lobby3dEmoji}>🎈</Text>
                      <View>
                        <Text style={styles.lobby3dText}>Start Game!</Text>
                        <Text style={styles.lobby3dSub}>Let the battle begin</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                </>
              )}
              {!isHost && (
                <Text style={styles.waitingForHost}>Waiting for host to start...</Text>
              )}
            </View>
          )}
        </ScrollView>

        {renderCountdownOverlay()}
      </View>
    );
  }

  // ──── PROFILE SCREEN ────
  if (screen === 'profile') {
    const startProfileGame = () => {
      saveProfile();
      const customLevel: LevelConfig = {
        id: 99,
        name: profileName || profileAvatar.label,
        subtitle: 'Custom Game',
        totalBalloons: profileBalloonCount,
        speed: LEVELS[2].speed,
        speedDecay: LEVELS[2].speedDecay,
        minSpeed: LEVELS[2].minSpeed,
        spawnInterval: LEVELS[2].spawnInterval,
        requiredScore: Math.ceil(profileBalloonCount * 0.6),
        bgColor1: '#6C5CE7',
        bgColor2: '#A855F7',
        accentColor: profileTemplate.colors[0],
        icon: profileAvatar.emoji,
        unlocked: true,
      };
      setIsMultiplayer(false);
      startGameWithAd(customLevel);
    };

    const saveAndGoHome = () => {
      saveProfile();
      setScreen('home');
    };

    return (
      <View style={[styles.container, {backgroundColor: '#2D1B69'}]}>
        <StatusBar barStyle="light-content" backgroundColor="#2D1B69" />
        <View style={[styles.bgGradientTop, {backgroundColor: '#4A2C8A'}]} />
        <ScrollView contentContainerStyle={{paddingBottom: 40}} showsVerticalScrollIndicator={false}>
          <View style={styles.profileScreen}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setScreen('home')}
              style={styles.woodBtnWrap}>
              <View style={styles.woodBtnOuter}>
                <View style={styles.woodBtnInner}>
                  <Text style={styles.woodBtnIcon}>←</Text>
                </View>
              </View>
            </TouchableOpacity>

            <Text style={styles.profileScreenTitle}>{profileSaved ? 'Edit Profile' : 'Create Your Profile'}</Text>
            <Text style={styles.profileScreenSub}>Pick your look and start popping!</Text>

            {/* Avatar Selection */}
            <Text style={styles.profileSectionTitle}>Choose Your Avatar</Text>
            <View style={styles.avatarGrid}>
              {PROFILE_AVATARS.map(av => (
                <TouchableOpacity
                  key={av.id}
                  activeOpacity={0.7}
                  onPress={() => setProfileAvatar(av)}
                  style={[
                    styles.avatarItem,
                    profileAvatar.id === av.id && styles.avatarItemActive,
                  ]}>
                  <Text style={styles.avatarEmoji}>{av.emoji}</Text>
                  <Text style={[styles.avatarLabel, profileAvatar.id === av.id && styles.avatarLabelActive]}>{av.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Name Input */}
            <Text style={styles.profileSectionTitle}>Your Name</Text>
            <TextInput
              style={styles.profileNameInput}
              value={profileName}
              onChangeText={setProfileName}
              placeholder={`e.g. ${profileAvatar.label}`}
              placeholderTextColor="rgba(255,255,255,0.3)"
              maxLength={12}
            />

            {/* Balloon Template */}
            <Text style={styles.profileSectionTitle}>Balloon Style</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templateScroll}>
              {BALLOON_TEMPLATES.map(tmpl => (
                <TouchableOpacity
                  key={tmpl.id}
                  activeOpacity={0.7}
                  onPress={() => setProfileTemplate(tmpl)}
                  style={[
                    styles.templateCard,
                    profileTemplate.id === tmpl.id && styles.templateCardActive,
                  ]}>
                  <View style={styles.templateColors}>
                    {tmpl.colors.slice(0, 4).map((c, i) => (
                      <View key={i} style={[styles.templateDot, {backgroundColor: c}]} />
                    ))}
                  </View>
                  <Text style={[styles.templateName, profileTemplate.id === tmpl.id && styles.templateNameActive]}>{tmpl.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Balloon Count */}
            <Text style={styles.profileSectionTitle}>How Many Balloons?</Text>
            <View style={styles.countRow}>
              {[20, 30, 50, 75, 100].map(count => (
                <TouchableOpacity
                  key={count}
                  activeOpacity={0.7}
                  onPress={() => setProfileBalloonCount(count)}
                  style={[
                    styles.countChip,
                    profileBalloonCount === count && styles.countChipActive,
                  ]}>
                  <Text style={[styles.countChipText, profileBalloonCount === count && styles.countChipTextActive]}>
                    {count}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Preview */}
            <View style={styles.profilePreview}>
              <View style={styles.profilePreviewAvatar}>
                <Text style={styles.profilePreviewEmoji}>{profileAvatar.emoji}</Text>
              </View>
              <Text style={styles.profilePreviewName}>{profileName || profileAvatar.label}</Text>
              <Text style={styles.profilePreviewInfo}>{profileBalloonCount} Balloons · Turbo Speed</Text>
            </View>

            {/* Action Buttons */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={startProfileGame}
              style={styles.profileStartBtn}>
              <Text style={styles.profileStartText}>🎈 Save & Play!</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={saveAndGoHome}
              style={styles.profileSaveBtn}>
              <Text style={styles.profileSaveBtnText}>💾 Save Profile</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ──── GAME SCREEN ────
  if (screen === 'game') {
    const skyTheme = getTheme();
    return (
      <View style={[styles.container, {backgroundColor: skyTheme.containerBg}]}>
        <StatusBar barStyle={skyTheme.statusStyle} backgroundColor={skyTheme.statusBg} />
        {renderCartoonSkyBg()}

        {/* Header - Cartoon Scoreboard */}
        <View style={styles.gameHeader}>
          <View style={styles.sbCard}>
            {/* Top bar */}
            <View style={styles.sbTopBar}>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => {
                  gameRunningRef.current = false;
                  setGameRunning(false);
                  if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current);
                  if (isMultiplayer) cleanupNetwork();
                  setScreen('home');
                }}
                style={styles.sbCloseBtn}>
                <Text style={styles.sbCloseIcon}>✕</Text>
              </TouchableOpacity>
              <View style={[styles.sbLevelPill, {backgroundColor: currentLevel.accentColor}]}>
                <Text style={styles.sbLevelPillText}>{currentLevel.icon} {currentLevel.name}</Text>
              </View>
              {combo >= 3 && (
                <Animated.View style={[
                  styles.sbComboPill,
                  combo >= 8 && {backgroundColor: '#FF4444', borderColor: '#CC0000'},
                  combo >= 5 && combo < 8 && {backgroundColor: '#FF8C00', borderColor: '#E67600'},
                  {transform: [{scale: comboAnim}], opacity: comboGlow.interpolate({inputRange: [0, 1], outputRange: [1, 0.6]})},
                ]}>
                  <Text style={[styles.sbComboText, combo >= 8 && {color: '#fff'}]}>
                    {combo >= 8 ? '💥' : '🔥'} {combo}x{combo >= 5 ? ' COMBO!' : ''}
                  </Text>
                </Animated.View>
              )}
              <View style={{flexDirection: 'row', marginLeft: 'auto', gap: 6}}>
                <TouchableOpacity activeOpacity={0.7} onPress={() => { setSoundOn(p => { const n = !p; saveSettings({soundOn: n, musicOn, vibrationOn, splashThemeId}); return n; }); }} style={styles.sbSmallBtn}>
                  <Text style={styles.sbSmallBtnText}>{soundOn ? '🔊' : '🔇'}</Text>
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.7} onPress={togglePause} style={styles.sbSmallBtn}>
                  <Text style={styles.sbSmallBtnText}>{paused ? '▶' : '⏸'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Extra game mode info */}
            {gameMode === 'survival' && (
              <View style={styles.sbExtraRow}>
                <Text style={styles.sbExtraText}>❤️ {livesLeft} lives</Text>
                <Text style={styles.sbExtraText}>💨 Missed: {missedCount}</Text>
              </View>
            )}
            {gameMode === 'timed' && (
              <View style={styles.sbExtraRow}>
                <Text style={[styles.sbExtraText, timeLeft <= 10 && {color: '#E74C3C'}]}>⏱️ {timeLeft}s</Text>
                <Text style={styles.sbExtraText}>💨 Missed: {missedCount}</Text>
              </View>
            )}
            {gameMode === 'levels' && missedCount > 0 && (
              <View style={styles.sbExtraRow}>
                <Text style={styles.sbExtraText}>💨 Missed: {missedCount}</Text>
              </View>
            )}
            {activePowerUp && (
              <View style={[styles.sbExtraRow, {backgroundColor: '#FFD93D22'}]}>
                <Text style={styles.sbExtraText}>{activePowerUp === 'double' ? '⭐ 2x Points!' : activePowerUp === 'slowmo' ? '🕐 Slow-Mo!' : '❄️ Freeze!'}</Text>
              </View>
            )}

            {/* Scoreboard Content */}
            {isMultiplayer ? (
              <View style={styles.sbMultiRow}>
                {/* Chiku */}
                <View style={styles.sbMultiPlayerBox1}>
                  <View style={styles.sbMultiAvatarWrap}>
                    <Text style={styles.sbMultiAvatarEmoji}>🐥</Text>
                  </View>
                  <Text style={styles.sbMultiName1}>Chiku</Text>
                  <View style={styles.sbMultiScoreBadge1}>
                    <Text style={styles.sbMultiStar}>⭐</Text>
                    <Animated.Text style={[styles.sbMultiScoreNum1, playerName.includes('Chiku') ? {transform: [{scale: scoreBounce}]} : {}]}>
                      {playerName.includes('Chiku') ? score : opponentScore}
                    </Animated.Text>
                  </View>
                </View>

                {/* VS */}
                <View style={styles.sbMultiVs}>
                  <Text style={styles.sbMultiVsText}>⚡</Text>
                  <View style={styles.sbMultiBalloonPill}>
                    <Text style={styles.sbMultiBalloonEmoji}>🎈</Text>
                    <Text adjustsFontSizeToFit numberOfLines={1} style={styles.sbMultiBalloonNum}>{Math.max(0, balloonsLeft)}</Text>
                  </View>
                </View>

                {/* Dikku */}
                <View style={styles.sbMultiPlayerBox2}>
                  <View style={styles.sbMultiAvatarWrap}>
                    <Text style={styles.sbMultiAvatarEmoji}>🐻</Text>
                  </View>
                  <Text style={styles.sbMultiName2}>Dikku</Text>
                  <View style={styles.sbMultiScoreBadge2}>
                    <Text style={styles.sbMultiStar}>⭐</Text>
                    <Animated.Text style={[styles.sbMultiScoreNum2, playerName.includes('Dikku') ? {transform: [{scale: scoreBounce}]} : {}]}>
                      {playerName.includes('Dikku') ? score : opponentScore}
                    </Animated.Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.sbSoloRow}>
                {/* Avatar + Name */}
                <View style={styles.sbSoloLeft}>
                  <View style={[styles.sbSoloAvatarRing, {borderColor: currentLevel.accentColor}]}>
                    <Text style={styles.sbSoloAvatarEmoji}>{currentLevel.id === 99 ? profileAvatar.emoji : '🐻'}</Text>
                  </View>
                  <View>
                    <Text style={[styles.sbSoloName, {color: '#4A3080'}]}>
                      {currentLevel.id === 99 ? (profileName || profileAvatar.label) : 'Dikku'}
                    </Text>
                    <Text style={styles.sbSoloTagline}>Let's Pop! 🎉</Text>
                  </View>
                </View>

                {/* Big Score */}
                <Animated.View style={[styles.sbSoloScoreBadge, {backgroundColor: currentLevel.accentColor, transform: [{translateX: scoreShake}]}]}>
                  <Text style={styles.sbSoloScoreStar}>⭐</Text>
                  <Animated.Text
                    adjustsFontSizeToFit
                    numberOfLines={1}
                    style={[styles.sbSoloScoreValue, {transform: [{scale: scoreBounce}]}]}>
                    {score}
                  </Animated.Text>
                </Animated.View>

                {/* Stat Pills */}
                <View style={styles.sbSoloStatCol}>
                  <View style={styles.sbStatPillGreen}>
                    <Text style={styles.sbStatPillEmoji}>🎈</Text>
                    <Text adjustsFontSizeToFit numberOfLines={1} style={styles.sbStatPillNum}>{Math.max(0, balloonsLeft)}</Text>
                  </View>
                  <View style={styles.sbStatPillOrange}>
                    <Text style={styles.sbStatPillEmoji}>🎯</Text>
                    <Text adjustsFontSizeToFit numberOfLines={1} style={styles.sbStatPillNum}>{currentLevel.requiredScore}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Progress Bar */}
            <View style={styles.sbProgressBar}>
              <View
                style={[
                  styles.sbProgressFill,
                  {
                    width: `${Math.min(100, (score / currentLevel.requiredScore) * 100)}%`,
                    backgroundColor: score >= currentLevel.requiredScore ? '#2ECC71' : '#FF6B6B',
                  },
                ]}
              />
            </View>
            <Text style={styles.sbProgressText}>
              {score >= currentLevel.requiredScore ? '🏆 You did it!' : `${score} / ${currentLevel.requiredScore}`}
            </Text>
          </View>
        </View>

        {/* Balloons */}
        {balloons.map(balloon => {
          const shapeStyle = getShapeStyle(balloon.shape);
          const sm = balloon.sizeMultiplier;
          const scaledShape = sm !== 1 ? {
            ...shapeStyle,
            width: (shapeStyle.width || 70) * sm,
            height: (shapeStyle.height || 86) * sm,
            borderRadius: (shapeStyle.borderRadius || 35) * sm,
          } : shapeStyle;
          const isGolden = balloon.specialType === 'golden';
          const isBomb = balloon.specialType === 'bomb';
          const isDevil = balloon.specialType === 'devil';
          const isFrozen = balloon.specialType === 'frozen';
          const isGhost = balloon.specialType === 'ghost';
          const isTrap = isBomb || isDevil || isGhost;
          const showThemeRing = currentLevel.id >= 4;

          return (
            <Animated.View
              key={balloon.id}
              style={[
                styles.balloonWrapper,
                {
                  left: balloon.x,
                  transform: [
                    {translateY: balloon.animValue},
                    {rotate: balloon.wobble.interpolate({
                      inputRange: [-3, 3],
                      outputRange: ['-10deg', '10deg'],
                    })},
                    {scale: balloon.scaleAnim},
                  ],
                },
              ]}>
              {showThemeRing && (
                <View
                  style={[
                    styles.balloonThemeRing,
                    scaledShape,
                    {
                      borderColor: balloon.ringColor,
                      shadowColor: balloon.ringColor,
                    },
                    isTrap && styles.balloonThemeRingTrap,
                  ]}
                />
              )}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => popBalloon(balloon)}
                hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
                pressRetentionOffset={{top: 12, bottom: 12, left: 12, right: 12}}
                delayPressIn={0}
                style={[
                  styles.balloon,
                  {backgroundColor: balloon.color},
                  scaledShape,
                  isGolden && styles.balloonGolden,
                  isBomb && styles.balloonBomb,
                  isDevil && styles.balloonDevil,
                  isFrozen && styles.balloonFrozen,
                  isGhost && styles.balloonGhost,
                ]}>
                <View style={[styles.balloonShine, isGhost && styles.balloonShineGhost]} />
                <View style={styles.balloonBadge}>
                  <Text style={styles.balloonBadgeText}>{balloon.themeBadge}</Text>
                </View>
                <Text
                  style={[
                    styles.balloonFace,
                    sm !== 1 && {fontSize: 24 * sm},
                    currentLevel.id >= 6 && styles.balloonFaceHero,
                    isTrap && styles.balloonFaceTrap,
                  ]}>
                  {balloon.face}
                </Text>
                {isTrap && (
                  <View style={styles.trapLabel}>
                    <Text style={styles.trapLabelText}>
                      {isDevil ? 'DEVIL' : isGhost ? 'TRAP' : 'BOOM'}
                    </Text>
                  </View>
                )}
                {balloon.specialType === 'giant' && balloon.tapsLeft > 1 && (
                  <View style={styles.tapBadge}><Text style={styles.tapBadgeText}>{balloon.tapsLeft}</Text></View>
                )}
              </TouchableOpacity>
              <View style={[styles.balloonKnot, {backgroundColor: balloon.color}]} />
              <View
                style={[
                  styles.balloonString,
                  {backgroundColor: balloon.color},
                  currentLevel.id >= 6 && styles.balloonStringBold,
                ]}
              />
            </Animated.View>
          );
        })}

        {/* Score Popups */}
        {scorePopups.map(popup => (
          <Animated.View
            key={popup.id}
            pointerEvents="none"
            style={[
              styles.scorePopup,
              {
                left: popup.x - 20,
                top: popup.y - 20,
                opacity: popup.opacity,
                transform: [{translateY: popup.translateY}, {scale: popup.scale}],
              },
            ]}>
            <Text style={[styles.scorePopupText, {color: popup.color}]}>{popup.text}</Text>
          </Animated.View>
        ))}

        {/* Confetti */}
        {confettiBursts.map(burst =>
          burst.pieces.map(piece => (
            <Animated.View
              key={piece.id}
              pointerEvents="none"
              style={[
                styles.confettiPiece,
                {
                  left: piece.x,
                  top: piece.y,
                  width: piece.width,
                  height: piece.height,
                  backgroundColor: piece.color,
                  borderRadius: piece.shape === 'circle' ? piece.width / 2 : 2,
                  opacity: piece.opacity,
                  transform: [
                    {translateX: piece.translateX},
                    {translateY: piece.translateY},
                    {scale: piece.scale},
                    {rotate: piece.rotate.interpolate({inputRange: [0, 8], outputRange: ['0deg', '2880deg']})},
                  ],
                },
              ]}
            />
          )),
        )}

        {/* Pause Overlay */}
        {paused && (
          <View style={styles.pauseOverlay}>
            <View style={styles.pauseCard}>
              <Text style={styles.pauseEmoji}>⏸</Text>
              <Text style={styles.pauseTitle}>Paused</Text>
              <TouchableOpacity style={styles.pauseBtn} activeOpacity={0.8} onPress={togglePause}>
                <Text style={styles.pauseBtnText}>▶ Resume</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.pauseBtn, {backgroundColor: '#F39C12'}]} activeOpacity={0.8}
                onPress={() => { setPaused(false); pausedRef.current = false; startGame(currentLevel, gameMode); }}>
                <Text style={styles.pauseBtnText}>🔄 Restart</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.pauseBtnOutline} activeOpacity={0.7}
                onPress={() => {
                  gameRunningRef.current = false; setGameRunning(false); setPaused(false); pausedRef.current = false;
                  if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current);
                  if (timerRef.current) clearInterval(timerRef.current);
                  if (isMultiplayer) cleanupNetwork();
                  setScreen('home');
                }}>
                <Text style={styles.pauseBtnOutlineText}>🏠 Quit</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Tutorial Overlay */}
        {showTutorial && !tutorialSeen && (
          <View style={styles.pauseOverlay}>
            <View style={styles.pauseCard}>
              <Text style={{fontSize: 56, marginBottom: 10}}>👆</Text>
              <Text style={styles.pauseTitle}>Tap the Balloons!</Text>
              <Text style={styles.tutorialDesc}>Pop balloons as they fly up.{'\n'}Avoid 💀 bombs & 😈 devils (-2 pts)!{'\n'}🌟 Gold = 3 pts, 🥶 Ice = 2 pts</Text>
              <TouchableOpacity style={styles.pauseBtn} activeOpacity={0.8} onPress={dismissTutorial}>
                <Text style={styles.pauseBtnText}>Got it! Let's Go!</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Game Countdown Overlay */}
        {renderCountdownOverlay()}
      </View>
    );
  }

  // ──── MULTIPLAYER RESULT ────
  if (screen === 'multi_result') {
    const iWon = score > opponentScore;
    const tie = score === opponentScore;
    return (
      <View style={[styles.container, {backgroundColor: '#6C5CE7'}]}>
        <StatusBar barStyle="light-content" backgroundColor="#6C5CE7" />
        <View style={[styles.bgGradientTop, {backgroundColor: '#3D1F8E'}]} />
        {renderAnimatedBg()}

        <View style={styles.resultOverlay}>
          <Animated.View
            style={[
              styles.resultCard,
              {opacity: modalOpacityAnim, transform: [{scale: modalScaleAnim}]},
            ]}>
            <Text style={styles.resultBigEmoji}>
              {tie ? '🤝' : iWon ? '🏆' : '👏'}
            </Text>
            <Text style={[styles.resultTitle, {color: tie ? '#F39C12' : iWon ? '#6C5CE7' : '#E84393'}]}>
              {tie ? "It's a Tie!" : iWon ? 'You Won!' : 'You Lost!'}
            </Text>
            <Text style={styles.resultSubtitle}>
              {tie ? 'What a match!' : iWon ? 'Amazing skills! 🎉' : 'Better luck next time! 💪'}
            </Text>

            <View style={styles.multiScoreRow}>
              <View style={[styles.multiScoreBox, iWon && styles.multiScoreWinner]}>
                <Text style={styles.multiScoreLabel}>{playerName}</Text>
                <Text style={styles.multiScoreValue}>{score}</Text>
                {iWon && <Text style={styles.multiScoreBadge}>👑</Text>}
              </View>
              <Text style={styles.multiVs}>VS</Text>
              <View style={[styles.multiScoreBox, !iWon && !tie && styles.multiScoreWinner]}>
                <Text style={styles.multiScoreLabel}>{opponentName}</Text>
                <Text style={styles.multiScoreValue}>{opponentScore}</Text>
                {!iWon && !tie && <Text style={styles.multiScoreBadge}>👑</Text>}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.resultBtn, {backgroundColor: '#6C5CE7'}]}
              onPress={() => {
                if (connected) {
                  startMultiplayerGame();
                } else {
                  cleanupNetwork();
                  setScreen('home');
                }
              }}
              activeOpacity={0.85}>
              <Text style={styles.resultBtnText}>
                {connected ? 'Play Again! 🎈' : 'Back Home'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.homeBtn}
              onPress={() => { cleanupNetwork(); setScreen('home'); }}
              activeOpacity={0.7}>
              <Text style={styles.homeBtnText}>🏠 Home</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    );
  }

  // ──── SETTINGS SCREEN ────
  if (screen === 'settings') {
    return (
      <View style={[styles.container, {backgroundColor: '#2D1B69'}]}>
        <StatusBar barStyle="light-content" backgroundColor="#2D1B69" />
        <View style={[styles.bgGradientTop, {backgroundColor: '#4A2C8A'}]} />
        {renderAnimatedBg()}
        <ScrollView contentContainerStyle={{paddingBottom: 40}} showsVerticalScrollIndicator={false}>
          <View style={styles.profileScreen}>
            <TouchableOpacity activeOpacity={0.7} onPress={() => setScreen('home')} style={styles.woodBtnWrap}>
              <View style={styles.woodBtnOuter}><View style={styles.woodBtnInner}><Text style={styles.woodBtnIcon}>←</Text></View></View>
            </TouchableOpacity>
            <Text style={styles.profileScreenTitle}>Settings</Text>
            <Text style={styles.profileScreenSub}>Customize your experience</Text>

            <View style={styles.settingsGroup}>
              <TouchableOpacity style={styles.settingsRow} activeOpacity={0.7}
                onPress={() => { const n = !soundOn; setSoundOn(n); saveSettings({soundOn: n, musicOn, vibrationOn, splashThemeId}); }}>
                <Text style={styles.settingsLabel}>🔊 Sound Effects</Text>
                <View style={[styles.settingsToggle, soundOn && styles.settingsToggleOn]}>
                  <Text style={styles.settingsToggleText}>{soundOn ? 'ON' : 'OFF'}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.settingsRow} activeOpacity={0.7}
                onPress={() => {
                  const n = !musicOn;
                  setMusicOn(n);
                  saveSettings({soundOn, musicOn: n, vibrationOn, splashThemeId});
                  if (n) playMusicForScreen(screen);
                  else fadeOutAllMusic();
                }}>
                <Text style={styles.settingsLabel}>🎵 Music</Text>
                <View style={[styles.settingsToggle, musicOn && styles.settingsToggleOn]}>
                  <Text style={styles.settingsToggleText}>{musicOn ? 'ON' : 'OFF'}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.settingsRow} activeOpacity={0.7}
                onPress={() => { const n = !vibrationOn; setVibrationOn(n); saveSettings({soundOn, musicOn, vibrationOn: n, splashThemeId}); }}>
                <Text style={styles.settingsLabel}>📳 Vibration</Text>
                <View style={[styles.settingsToggle, vibrationOn && styles.settingsToggleOn]}>
                  <Text style={styles.settingsToggleText}>{vibrationOn ? 'ON' : 'OFF'}</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ──── ACHIEVEMENTS SCREEN ────
  if (screen === 'achievements') {
    return (
      <View style={[styles.container, {backgroundColor: '#2D1B69'}]}>
        <StatusBar barStyle="light-content" backgroundColor="#2D1B69" />
        <ScrollView contentContainerStyle={{paddingBottom: 40}} showsVerticalScrollIndicator={false}>
          <View style={styles.profileScreen}>
            <TouchableOpacity activeOpacity={0.7} onPress={() => setScreen('home')} style={styles.woodBtnWrap}>
              <View style={styles.woodBtnOuter}><View style={styles.woodBtnInner}><Text style={styles.woodBtnIcon}>←</Text></View></View>
            </TouchableOpacity>
            <Text style={styles.profileScreenTitle}>Achievements</Text>
            <Text style={styles.profileScreenSub}>{earnedAchievements.length}/{ACHIEVEMENTS.length} unlocked</Text>

            <View style={styles.achievementsList}>
              {ACHIEVEMENTS.map(ach => {
                const unlocked = earnedAchievements.includes(ach.id);
                return (
                  <View key={ach.id} style={[styles.achievementCard, !unlocked && {opacity: 0.4}]}>
                    <Text style={styles.achievementIcon}>{ach.icon}</Text>
                    <View style={styles.achievementInfo}>
                      <Text style={styles.achievementName}>{ach.name}</Text>
                      <Text style={styles.achievementDesc}>{ach.desc}</Text>
                    </View>
                    {unlocked && <Text style={styles.achievementCheck}>✅</Text>}
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ──── RESULT SCREEN ────
  const isNewBest = currentLevel.id <= 7 && score > (highScores[currentLevel.id]?.score || 0);
  const isSurvivalOrTimed = gameMode === 'survival' || gameMode === 'timed';

  return (
    <View style={[styles.container, {backgroundColor: currentLevel.bgColor2}]}>
      <StatusBar barStyle="light-content" backgroundColor={currentLevel.bgColor1} />
      <View style={[styles.bgGradientTop, {backgroundColor: currentLevel.bgColor1}]} />
      {renderAnimatedBg()}

      <View style={styles.resultOverlay}>
        <Animated.View
          style={[
            styles.resultCard,
            {opacity: modalOpacityAnim, transform: [{scale: modalScaleAnim}]},
          ]}>
          <Text style={styles.resultBigEmoji}>
            {isSurvivalOrTimed ? (score >= 20 ? '🏆' : '💪')
              : passed ? (score >= currentLevel.totalBalloons ? '🏆' : '🎉') : '💪'}
          </Text>

          {isNewBest && <Text style={styles.newBestBadge}>🌟 New Best!</Text>}

          <Text style={[styles.resultTitle, {color: passed || isSurvivalOrTimed ? '#6C5CE7' : '#E17055'}]}>
            {isSurvivalOrTimed
              ? `${gameMode === 'survival' ? 'Game Over!' : 'Time\'s Up!'}`
              : passed
                ? score >= currentLevel.totalBalloons ? 'PERFECT!' : 'You Did It!'
                : 'Almost!'}
          </Text>

          <Text style={styles.resultSubtitle}>
            {isSurvivalOrTimed
              ? `You popped ${score} balloons!`
              : passed
                ? currentLevel.id < 7
                  ? 'Next level unlocked! 🎊'
                  : 'You are a HelioPop Master! 👑'
                : `Need ${currentLevel.requiredScore} pops to win. Try again!`}
          </Text>

          <View style={styles.resultScoreCard}>
            <View style={styles.resultScoreItem}>
              <Text style={styles.resultScoreEmoji}>🎈</Text>
              <Text style={styles.resultScoreValue}>{score}</Text>
              <Text style={styles.resultScoreLabel}>Popped</Text>
            </View>
            {missedCount > 0 && (
              <View style={[styles.resultScoreItem, {marginLeft: 24}]}>
                <Text style={styles.resultScoreEmoji}>💨</Text>
                <Text style={styles.resultScoreValue}>{missedCount}</Text>
                <Text style={styles.resultScoreLabel}>Missed</Text>
              </View>
            )}
          </View>

          {!isSurvivalOrTimed && (
            <View style={styles.starsRow}>
              {[1, 2, 3].map(star => {
                const threshold = Math.ceil((currentLevel.totalBalloons / 3) * star);
                const earned = score >= threshold;
                return (
                  <Text key={star} style={[styles.star, !earned && styles.starEmpty]}>
                    {earned ? '⭐' : '⭐'}
                  </Text>
                );
              })}
            </View>
          )}

          {!isSurvivalOrTimed && passed && currentLevel.id < 7 ? (
            <TouchableOpacity
              style={[styles.resultBtn, {backgroundColor: '#6C5CE7'}]}
              onPress={() => {
                const nextLevel = levels.find(l => l.id === currentLevel.id + 1);
                if (nextLevel) {
                  setLevels(prev => {
                    const updated = prev.map(l =>
                      l.id === nextLevel.id ? {...l, unlocked: true} : l,
                    );
                    const unlockedIds = updated.filter(l => l.unlocked).map(l => l.id);
                    saveProgress(unlockedIds);
                    return updated;
                  });
                  startGameWithAd({...nextLevel, unlocked: true});
                }
              }}
              activeOpacity={0.85}>
              <Text style={styles.resultBtnText}>Next Level 🚀</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.resultBtn, {backgroundColor: currentLevel.accentColor}]}
              onPress={() => startGameWithAd(currentLevel, gameMode)}
              activeOpacity={0.85}>
              <Text style={styles.resultBtnText}>
                {isSurvivalOrTimed ? 'Play Again! 🎈' : passed ? 'Play Again! 🎈' : 'Try Again! 💪'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.homeBtn}
            onPress={handleResult}
            activeOpacity={0.7}>
            <Text style={styles.homeBtnText}>Home</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: IOS_TOP_PADDING,
  },
  bgGradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.55,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },

  // ── SPLASH ──
  splashContainer: {
    flex: 1,
    paddingTop: IOS_TOP_PADDING,
    backgroundColor: '#1A0E3D',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  splashSkyDeep: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1A0E3D',
  },
  splashSkyMid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.62,
    backgroundColor: '#3D2280',
    borderBottomLeftRadius: 80,
    borderBottomRightRadius: 80,
  },
  splashSkyGlow: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.08,
    alignSelf: 'center',
    width: SCREEN_WIDTH * 0.85,
    height: SCREEN_HEIGHT * 0.35,
    borderRadius: SCREEN_WIDTH * 0.4,
    backgroundColor: 'rgba(108, 92, 231, 0.22)',
  },
  splashStar: {
    position: 'absolute',
    color: '#FFE66D',
    fontWeight: '900',
  },
  splashSunWrap: {
    position: 'absolute',
    top: 52,
    right: 28,
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashSunRays: {
    position: 'absolute',
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashSunRay: {
    position: 'absolute',
    width: 4,
    height: 44,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 230, 109, 0.55)',
    top: 4,
  },
  splashSunCore: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 200, 50, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 230, 109, 0.6)',
  },
  splashSunEmoji: {
    fontSize: 40,
  },
  splashBalloonWrap: {
    position: 'absolute',
    alignItems: 'center',
  },
  splashBalloon: {
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  splashBalloonShine: {
    position: 'absolute',
    top: 10,
    left: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  splashBalloonFace: {
    marginTop: 4,
  },
  splashBalloonKnot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: -2,
  },
  splashBalloonString: {
    width: 2,
    height: 28,
    borderLeftWidth: 2,
    opacity: 0.7,
  },
  splashHillBack: {
    position: 'absolute',
    bottom: 0,
    left: -40,
    width: SCREEN_WIDTH + 80,
    height: 120,
    backgroundColor: '#2D6A4F',
    borderTopLeftRadius: 120,
    borderTopRightRadius: 120,
    opacity: 0.85,
  },
  splashHillFront: {
    position: 'absolute',
    bottom: 0,
    left: -20,
    width: SCREEN_WIDTH + 40,
    height: 72,
    backgroundColor: '#40916C',
    borderTopLeftRadius: 90,
    borderTopRightRadius: 90,
  },
  splashGrassLeft: {
    position: 'absolute',
    bottom: 58,
    left: 36,
    fontSize: 28,
  },
  splashGrassRight: {
    position: 'absolute',
    bottom: 52,
    right: 40,
    fontSize: 26,
  },
  splashCard: {
    alignItems: 'center',
    zIndex: 20,
    paddingHorizontal: 28,
    paddingVertical: 26,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255, 230, 109, 0.45)',
    minWidth: SCREEN_WIDTH * 0.78,
  },
  splashCardGlow: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 38,
    backgroundColor: 'rgba(108, 92, 231, 0.2)',
    zIndex: -1,
  },
  splashLogo: {
    width: 128,
    height: 128,
    borderRadius: 30,
    marginBottom: 14,
    borderWidth: 3,
    borderColor: '#FFE66D',
  },
  splashTitle: {
    fontSize: 48,
    fontWeight: '900',
    fontStyle: 'italic',
    color: '#FFE66D',
    textAlign: 'center',
    letterSpacing: 1.5,
    textShadowColor: '#6C5CE7',
    textShadowOffset: {width: 0, height: 3},
    textShadowRadius: 8,
  },
  splashSubtitle: {
    fontSize: 17,
    fontWeight: '700',
    fontStyle: 'italic',
    color: 'rgba(255,255,255,0.9)',
    marginTop: 6,
    textAlign: 'center',
  },
  splashAvatarRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 10,
  },
  splashAvatarBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashAvatarEmoji: {
    fontSize: 20,
  },
  splashCloudRow: {
    position: 'absolute',
    bottom: 100,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 24,
    opacity: 0.85,
    zIndex: 5,
  },
  splashCloud: {
    fontSize: 48,
  },
  splashCloudSmall: {
    fontSize: 32,
    marginBottom: 10,
  },
  splashProgressWrap: {
    position: 'absolute',
    bottom: 28,
    left: 32,
    right: 32,
    zIndex: 30,
  },
  splashProgressLabel: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    fontWeight: '700',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  splashProgressTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  splashProgressFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: '#FFE66D',
  },

  // ── HOME ──
  homeContent: {
    paddingBottom: 30,
  },
  homeTitleSection: {
    alignItems: 'center',
    paddingTop: 2,
    paddingBottom: 14,
  },
  homeIcon: {
    fontSize: 56,
  },
  homeTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1,
    fontStyle: 'italic',
  },
  homeSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 6,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  homeVersion: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 8,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  levelsContainer: {
    paddingHorizontal: 20,
    gap: 12,
    marginTop: 20,
  },
  levelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    padding: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  levelCardLocked: {
    opacity: 0.45,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  levelIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelIcon: {
    fontSize: 26,
  },
  levelInfo: {
    flex: 1,
    marginLeft: 14,
  },
  levelName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 3,
    fontStyle: 'italic',
  },
  levelSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
    fontStyle: 'italic',
  },
  lockedText: {
    color: 'rgba(255,255,255,0.4)',
  },
  playCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  playCircleText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 2,
  },
  comingSoonCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  comingSoonEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  comingSoonTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  comingSoonSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    fontStyle: 'italic',
  },

  // ── MODE SECTION ──
  modeSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modeCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
  },
  modeCardActive: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderColor: 'rgba(255,255,255,0.5)',
  },
  modeCardInactive: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modeTextDim: {
    opacity: 0.45,
  },
  modeEmoji: {
    fontSize: 32,
    marginBottom: 6,
  },
  modeCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 2,
    fontStyle: 'italic',
  },
  modeCardSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
    fontStyle: 'italic',
  },
  levelsSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 12,
    fontStyle: 'italic',
  },

  // ── LOBBY ──
  lobbyContent: {
    paddingBottom: 40,
    paddingTop: 50,
  },
  // ── WOOD BUTTONS ──
  woodBtnWrap: {
    alignSelf: 'flex-start',
    marginLeft: 16,
    marginBottom: 10,
  },
  woodBtnOuter: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2D1B69',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 10,
    borderWidth: 3,
    borderTopColor: '#7C5CE7',
    borderLeftColor: '#6B4CD6',
    borderRightColor: '#231258',
    borderBottomColor: '#1A0E48',
  },
  woodBtnInner: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#4A2C8A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderTopColor: '#8B6CE7',
    borderLeftColor: '#7B5CD6',
    borderRightColor: '#3A1F70',
    borderBottomColor: '#2D1B69',
  },
  woodBtnIcon: {
    color: '#FFE66D',
    fontSize: 20,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 2,
    marginLeft: -2,
  },
  woodBtnSmallOuter: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#2D1B69',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 8,
    borderWidth: 2.5,
    borderTopColor: '#7C5CE7',
    borderLeftColor: '#6B4CD6',
    borderRightColor: '#231258',
    borderBottomColor: '#1A0E48',
  },
  woodBtnSmallInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4A2C8A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderTopColor: '#8B6CE7',
    borderLeftColor: '#7B5CD6',
    borderRightColor: '#3A1F70',
    borderBottomColor: '#2D1B69',
  },
  woodBtnSmallIcon: {
    color: '#FFE66D',
    fontSize: 14,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 2,
    marginLeft: -1,
  },
  lobbyTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 6,
    fontStyle: 'italic',
  },
  lobbySubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  instructionBox: {
    marginHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFE66D',
    marginBottom: 10,
    fontStyle: 'italic',
  },
  instructionStep: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 6,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  lobbyInputGroup: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  lobbyLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 6,
    fontStyle: 'italic',
  },
  lobbyInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  lobbyButtons: {
    paddingHorizontal: 20,
    gap: 20,
  },
  // ── 3D LOBBY BUTTONS ──
  lobby3dBtn: {
    borderRadius: 16,
    borderBottomWidth: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 8,
  },
  lobby3dBtnCreate: {
    backgroundColor: '#4A34A8',
    borderBottomColor: '#362680',
  },
  lobby3dBtnJoin: {
    backgroundColor: '#B5306F',
    borderBottomColor: '#8A2456',
  },
  lobby3dBtnStart: {
    backgroundColor: '#008E6E',
    borderBottomColor: '#006B52',
  },
  lobby3dBtnFace: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderTopWidth: 2,
    borderTopColor: 'rgba(255,255,255,0.25)',
  },
  lobby3dBtnFaceCreate: {
    backgroundColor: '#6C5CE7',
  },
  lobby3dBtnFaceJoin: {
    backgroundColor: '#E84393',
  },
  lobby3dBtnFaceStart: {
    backgroundColor: '#00B894',
  },
  lobby3dEmoji: {
    fontSize: 26,
  },
  lobby3dText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '900',
    fontStyle: 'italic',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 2,
  },
  lobby3dSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontWeight: '600',
    fontStyle: 'italic',
    marginTop: 1,
  },
  lobbyBtnAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  lobbyBtnAvatarText: {
    fontSize: 30,
  },
  lobbyBtnPlayerName: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: '900',
    fontStyle: 'italic',
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 3,
    letterSpacing: 1,
  },
  lobbyJoinSection: {
    marginTop: 8,
  },
  waitingBox: {
    marginHorizontal: 20,
    alignItems: 'center',
    padding: 24,
  },
  waitingText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: '600',
    fontStyle: 'italic',
    marginTop: 14,
  },
  ipDisplay: {
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFE66D40',
    width: '100%',
  },
  ipLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontStyle: 'italic',
    fontWeight: '600',
    marginBottom: 12,
  },
  ipValueBox: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 2,
    borderColor: '#FFE66D',
    marginBottom: 10,
  },
  ipValue: {
    color: '#FFE66D',
    fontSize: 28,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: 2,
    textAlign: 'center',
  },
  ipHint: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  connectedBox: {
    marginHorizontal: 20,
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(0,184,148,0.1)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,184,148,0.3)',
  },
  connectedEmoji: {
    fontSize: 36,
    marginBottom: 6,
  },
  connectedText: {
    color: '#55EFC4',
    fontSize: 20,
    fontWeight: '800',
    fontStyle: 'italic',
  },
  connectedSub: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 4,
  },
  waitingForHost: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    marginTop: 14,
    fontStyle: 'italic',
  },

  // ── LEVEL PICKER ──
  pickLevelTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    fontStyle: 'italic',
    marginTop: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  pickLevelRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  pickLevelBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 2.5,
    backgroundColor: 'rgba(255,255,255,0.05)',
    minWidth: 80,
  },
  pickLevelIcon: {
    fontSize: 22,
    marginBottom: 2,
  },
  pickLevelName: {
    fontSize: 11,
    fontWeight: '700',
    fontStyle: 'italic',
    color: 'rgba(255,255,255,0.6)',
  },

  // ── COUNTDOWN ──
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 200,
    paddingHorizontal: 24,
  },
  countdownPanel: {
    minWidth: 220,
    maxWidth: SCREEN_WIDTH - 64,
    paddingHorizontal: 32,
    paddingVertical: 24,
    borderRadius: 16,
    backgroundColor: '#6C5CE7',
    borderWidth: 4,
    borderColor: '#FFE66D',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    elevation: 12,
  },
  countdownNumberWrap: {
    width: '100%',
    minHeight: 96,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
    paddingVertical: 8,
  },
  countdownNumber: {
    fontSize: 68,
    fontWeight: '900',
    fontStyle: 'italic',
    color: '#FFE66D',
    textAlign: 'center',
    width: '100%',
    includeFontPadding: false,
  },
  countdownLabel: {
    fontSize: 22,
    fontWeight: '800',
    fontStyle: 'italic',
    color: '#fff',
    marginTop: 20,
    textAlign: 'center',
  },
  countdownStepRow: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  countdownStep: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  countdownStepActive: {
    backgroundColor: '#FFE66D',
    borderColor: '#fff',
    transform: [{scale: 1.08}],
  },
  countdownStepDone: {
    backgroundColor: 'rgba(46, 204, 113, 0.35)',
    borderColor: '#2ECC71',
  },
  countdownStepText: {
    fontSize: 20,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    minWidth: 24,
    includeFontPadding: false,
  },
  countdownStepTextActive: {
    color: '#2D1B69',
  },

  // ── MULTI RESULT ──
  multiScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
    marginVertical: 16,
    gap: 10,
  },
  multiScoreBox: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  multiScoreWinner: {
    borderColor: '#FFD700',
    backgroundColor: '#FFF9E6',
  },
  multiScoreLabel: {
    fontSize: 14,
    fontWeight: '700',
    fontStyle: 'italic',
    color: '#868E96',
    marginBottom: 4,
  },
  multiScoreValue: {
    fontSize: 36,
    fontWeight: '900',
    fontStyle: 'italic',
    color: '#2D3436',
  },
  multiScoreBadge: {
    fontSize: 18,
    marginTop: 4,
  },
  multiVs: {
    fontSize: 16,
    fontWeight: '900',
    color: '#868E96',
  },

  // ── GAME ──
  gameHeader: {
    paddingTop: 48,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  gameHeaderCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 26,
    padding: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F3F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnText: {
    color: '#333',
    fontSize: 18,
    fontWeight: '700',
  },
  levelPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginLeft: 10,
  },
  levelPillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  comboBadge: {
    backgroundColor: '#FFE66D',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginLeft: 'auto',
  },
  comboText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6C5CE7',
  },
  gameStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  gameStat: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  gameStatEmoji: {
    fontSize: 18,
  },
  gameStatValue: {
    fontSize: 22,
    color: '#2D3436',
    fontWeight: '800',
  },
  gameStatLabel: {
    fontSize: 9,
    color: '#868E96',
    fontWeight: '700',
  },

  // ── CARTOON SCOREBOARD ──
  sbCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 28,
    padding: 14,
    borderWidth: 3,
    borderColor: '#FFB347',
    shadowColor: '#FF6B35',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  sbTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sbCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E74C3C',
  },
  sbCloseIcon: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  sbLevelPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    marginLeft: 10,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  sbLevelPillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  sbComboPill: {
    backgroundColor: '#FFD93D',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    marginLeft: 'auto',
    borderWidth: 2,
    borderColor: '#F39C12',
  },
  sbComboText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#D35400',
    fontStyle: 'italic',
  },

  // multiplayer
  sbMultiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  sbMultiPlayerBox1: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#E8DEFF',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderWidth: 2.5,
    borderColor: '#6C5CE7',
  },
  sbMultiPlayerBox2: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#FFE0EB',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderWidth: 2.5,
    borderColor: '#E84393',
  },
  sbMultiAvatarWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFD93D',
    marginBottom: 4,
  },
  sbMultiAvatarEmoji: {
    fontSize: 26,
  },
  sbMultiName1: {
    fontSize: 14,
    fontWeight: '900',
    fontStyle: 'italic',
    color: '#6C5CE7',
    marginBottom: 4,
  },
  sbMultiName2: {
    fontSize: 14,
    fontWeight: '900',
    fontStyle: 'italic',
    color: '#E84393',
    marginBottom: 4,
  },
  sbMultiScoreBadge1: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 4,
  },
  sbMultiScoreBadge2: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E84393',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 4,
  },
  sbMultiStar: {
    fontSize: 14,
  },
  sbMultiScoreNum1: {
    fontSize: 22,
    fontWeight: '900',
    fontStyle: 'italic',
    color: '#fff',
  },
  sbMultiScoreNum2: {
    fontSize: 22,
    fontWeight: '900',
    fontStyle: 'italic',
    color: '#fff',
  },
  sbMultiVs: {
    alignItems: 'center',
    gap: 6,
  },
  sbMultiVsText: {
    fontSize: 24,
  },
  sbMultiBalloonPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DFF9FB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#00CEC9',
    gap: 4,
    minWidth: 56,
    flexShrink: 0,
  },
  sbMultiBalloonEmoji: {
    fontSize: 14,
  },
  sbMultiBalloonNum: {
    fontSize: 15,
    fontWeight: '900',
    color: '#00B894',
    fontStyle: 'italic',
    minWidth: 28,
    textAlign: 'center',
    includeFontPadding: false,
    flexShrink: 0,
  },

  // solo
  sbSoloRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sbSoloLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  sbSoloAvatarRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 4,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sbSoloAvatarEmoji: {
    fontSize: 26,
  },
  sbSoloName: {
    fontSize: 16,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: 0.5,
  },
  sbSoloTagline: {
    fontSize: 11,
    fontWeight: '700',
    fontStyle: 'italic',
    color: '#F39C12',
    marginTop: 1,
  },
  sbSoloScoreBadge: {
    minWidth: 64,
    maxWidth: 88,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  sbSoloScoreStar: {
    fontSize: 11,
    position: 'absolute',
    top: 3,
    left: 6,
  },
  sbSoloScoreValue: {
    fontSize: 26,
    fontWeight: '900',
    fontStyle: 'italic',
    color: '#fff',
    textAlign: 'center',
    width: '100%',
    includeFontPadding: false,
  },
  sbSoloStatCol: {
    gap: 6,
    flexShrink: 0,
  },
  sbStatPillGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D5F5E3',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#27AE60',
    gap: 4,
    minWidth: 60,
    flexShrink: 0,
  },
  sbStatPillOrange: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDEBD0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#F39C12',
    gap: 4,
    minWidth: 60,
    flexShrink: 0,
  },
  sbStatPillEmoji: {
    fontSize: 13,
  },
  sbStatPillNum: {
    fontSize: 15,
    fontWeight: '900',
    fontStyle: 'italic',
    color: '#2D3436',
    minWidth: 28,
    textAlign: 'center',
    includeFontPadding: false,
    flexShrink: 0,
  },

  // progress
  sbProgressBar: {
    height: 10,
    backgroundColor: '#F0E6FF',
    borderRadius: 5,
    marginTop: 12,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#E0D0F0',
  },
  sbProgressFill: {
    height: '100%',
    borderRadius: 5,
  },
  sbProgressText: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '900',
    fontStyle: 'italic',
    color: '#8E44AD',
    marginTop: 4,
  },

  // ── BALLOONS ──
  balloonWrapper: {
    position: 'absolute',
    width: BALLOON_WIDTH,
    alignItems: 'center',
  },
  balloon: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 5},
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  balloonThemeRing: {
    position: 'absolute',
    borderWidth: 2.5,
    opacity: 0.85,
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 0},
  },
  balloonThemeRingTrap: {
    borderWidth: 3,
    opacity: 1,
    shadowOpacity: 0.7,
    shadowRadius: 14,
  },
  balloonGolden: {
    borderWidth: 2,
    borderColor: '#FFA000',
    shadowColor: '#FFD700',
    shadowOpacity: 0.65,
    shadowRadius: 14,
  },
  balloonBomb: {
    borderWidth: 2.5,
    borderColor: '#E74C3C',
    shadowColor: '#FF0000',
    shadowOpacity: 0.55,
    shadowRadius: 12,
  },
  balloonDevil: {
    borderWidth: 2.5,
    borderColor: '#8B0000',
    shadowColor: '#FF0000',
    shadowOpacity: 0.6,
    shadowRadius: 14,
  },
  balloonFrozen: {
    borderWidth: 2,
    borderColor: '#00B4D8',
    shadowColor: '#74B9FF',
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  balloonGhost: {
    borderWidth: 2,
    borderColor: '#B388FF',
    shadowColor: '#E8DAFF',
    shadowOpacity: 0.75,
    shadowRadius: 16,
    opacity: 0.92,
  },
  balloonBadge: {
    position: 'absolute',
    top: -6,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.12)',
    zIndex: 2,
  },
  balloonBadgeText: {
    fontSize: 11,
  },
  balloonFaceHero: {
    fontSize: 26,
    marginTop: 2,
  },
  balloonFaceTrap: {
    marginTop: 8,
  },
  trapLabel: {
    position: 'absolute',
    bottom: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  trapLabelText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  balloonShine: {
    position: 'absolute',
    top: 8,
    left: 10,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  balloonShineGhost: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    width: 20,
    height: 20,
  },
  balloonFace: {
    fontSize: 22,
    marginTop: 4,
    textAlign: 'center',
  },
  balloonStringBold: {
    width: 2.5,
    height: 36,
  },
  balloonKnot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: -3,
  },
  balloonString: {
    width: 2,
    height: 30,
    opacity: 0.45,
    borderRadius: 1,
  },
  scorePopup: {
    position: 'absolute',
    zIndex: 60,
  },
  scorePopupText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFD93D',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: {width: 1, height: 2},
    textShadowRadius: 4,
  },
  confettiPiece: {
    position: 'absolute',
    zIndex: 50,
    elevation: 50,
  },

  // ── RESULT ──
  resultOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 100,
  },
  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 30,
    padding: 30,
    alignItems: 'center',
    width: '85%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 12},
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  resultBigEmoji: {
    fontSize: 56,
    marginBottom: 10,
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 6,
  },
  resultSubtitle: {
    fontSize: 15,
    color: '#636E72',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  resultScoreCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 22,
    paddingVertical: 20,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  resultScoreItem: {
    alignItems: 'center',
    minWidth: 90,
    paddingHorizontal: 8,
  },
  resultScoreEmoji: {
    fontSize: 30,
    marginBottom: 6,
  },
  resultScoreValue: {
    fontSize: 34,
    fontWeight: '900',
    color: '#2D3436',
  },
  resultScoreLabel: {
    fontSize: 13,
    color: '#868E96',
    fontWeight: '600',
    marginTop: 4,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 18,
  },
  star: {
    fontSize: 32,
  },
  starEmpty: {
    opacity: 0.2,
  },
  resultBtn: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 18,
    width: '100%',
    alignItems: 'center',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  resultBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  homeBtn: {
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(108,92,231,0.4)',
    backgroundColor: 'rgba(108,92,231,0.1)',
  },
  homeBtnText: {
    color: '#6C5CE7',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // ── CREATE PROFILE CARD (Home) ──
  createProfileCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(108,92,231,0.2)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: '#6C5CE7',
  },
  createProfileIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6C5CE740',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  createProfileIcon: {
    fontSize: 30,
  },
  createProfileTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  createProfileSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  createProfileArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6C5CE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createProfileArrowText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },

  // ── PROFILE SCREEN ──
  profileScreen: {
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  profileBackBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(108,92,231,0.3)',
    borderRadius: 12,
    marginBottom: 16,
  },
  profileBackText: {
    color: '#A29BFE',
    fontSize: 15,
    fontWeight: '800',
    fontStyle: 'italic',
  },
  profileScreenTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    fontStyle: 'italic',
    marginBottom: 4,
    textAlign: 'center',
  },
  profileScreenSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 24,
  },
  profileSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#A29BFE',
    fontStyle: 'italic',
    marginBottom: 12,
    marginTop: 8,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  avatarItem: {
    width: 72,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarItemActive: {
    borderColor: '#6C5CE7',
    backgroundColor: 'rgba(108,92,231,0.2)',
  },
  avatarEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  avatarLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    fontStyle: 'italic',
  },
  avatarLabelActive: {
    color: '#fff',
  },
  profileNameInput: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    fontStyle: 'italic',
    borderWidth: 1.5,
    borderColor: 'rgba(108,92,231,0.3)',
    marginBottom: 20,
  },
  templateScroll: {
    marginBottom: 20,
  },
  templateCard: {
    width: 100,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 2,
    borderColor: 'transparent',
    marginRight: 10,
  },
  templateCardActive: {
    borderColor: '#6C5CE7',
    backgroundColor: 'rgba(108,92,231,0.2)',
  },
  templateColors: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 4,
  },
  templateDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  templateName: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  templateNameActive: {
    color: '#fff',
  },
  countRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  countChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  countChipActive: {
    borderColor: '#6C5CE7',
    backgroundColor: 'rgba(108,92,231,0.25)',
  },
  countChipText: {
    fontSize: 16,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.5)',
    fontStyle: 'italic',
  },
  countChipTextActive: {
    color: '#fff',
  },
  profilePreview: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    paddingVertical: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(108,92,231,0.3)',
  },
  profilePreviewAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(108,92,231,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 3,
    borderColor: '#6C5CE7',
  },
  profilePreviewEmoji: {
    fontSize: 36,
  },
  profilePreviewName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  profilePreviewInfo: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    fontStyle: 'italic',
  },
  profileStartBtn: {
    backgroundColor: '#6C5CE7',
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#6C5CE7',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  profileStartText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  profileSaveBtn: {
    backgroundColor: 'rgba(108,92,231,0.2)',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 2,
    borderColor: '#6C5CE7',
  },
  profileSaveBtnText: {
    color: '#A29BFE',
    fontSize: 17,
    fontWeight: '800',
    fontStyle: 'italic',
  },

  // ── SAVED PROFILE (Home) ──
  savedProfileSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  savedProfileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(108,92,231,0.2)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 2,
    borderColor: '#6C5CE7',
  },
  savedProfileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  savedProfileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(108,92,231,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#6C5CE7',
  },
  savedProfileEmoji: {
    fontSize: 28,
  },
  savedProfileName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
    fontStyle: 'italic',
  },
  savedProfileInfo: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontStyle: 'italic',
    marginTop: 2,
  },
  savedProfilePlayBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6C5CE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  savedProfilePlayText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  savedProfileEditBtn: {
    alignSelf: 'center',
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
  },
  savedProfileEditText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '700',
    fontStyle: 'italic',
  },

  // ── CARTOON SKY BACKGROUND ──
  skyTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.35,
  },
  skyMiddle: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.3,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.35,
  },
  skyBottom: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.6,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sunOuter: {
    position: 'absolute',
    top: 35,
    right: 25,
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sunCore: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
    zIndex: 2,
  },
  sunFace: {
    fontSize: 28,
  },
  sunRay1: {
    position: 'absolute',
    width: 80,
    height: 6,
    borderRadius: 3,
    opacity: 0.5,
    zIndex: 1,
  },
  sunRay2: {
    position: 'absolute',
    width: 6,
    height: 80,
    borderRadius: 3,
    opacity: 0.5,
    zIndex: 1,
  },
  sunRay3: {
    position: 'absolute',
    width: 70,
    height: 6,
    borderRadius: 3,
    opacity: 0.4,
    transform: [{rotate: '45deg'}],
    zIndex: 1,
  },
  sunRay4: {
    position: 'absolute',
    width: 70,
    height: 6,
    borderRadius: 3,
    opacity: 0.4,
    transform: [{rotate: '-45deg'}],
    zIndex: 1,
  },
  cloudGroup: {
    position: 'absolute',
  },
  cloudPuff: {
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  cloudPuffSmall: {
    position: 'absolute',
  },
  cloudPuffTiny: {
    position: 'absolute',
  },
  skySparkle: {
    position: 'absolute',
    fontSize: 14,
    opacity: 0.4,
  },
  rainbowWrap: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.12,
    left: -60,
    alignItems: 'center',
    justifyContent: 'flex-end',
    opacity: 0.25,
  },
  rainbowBand: {
    position: 'absolute',
    bottom: 0,
    borderWidth: 5,
    borderBottomWidth: 0,
    borderTopLeftRadius: 200,
    borderTopRightRadius: 200,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  hillsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  hillBack: {
    position: 'absolute',
    bottom: 0,
    left: -40,
    right: -40,
    height: 90,
    borderTopLeftRadius: SCREEN_WIDTH * 0.6,
    borderTopRightRadius: SCREEN_WIDTH * 0.4,
    opacity: 0.6,
  },
  hillMid: {
    position: 'absolute',
    bottom: 0,
    left: SCREEN_WIDTH * 0.2,
    right: -60,
    height: 70,
    borderTopLeftRadius: SCREEN_WIDTH * 0.5,
    borderTopRightRadius: SCREEN_WIDTH * 0.3,
    opacity: 0.75,
  },
  hillFront: {
    position: 'absolute',
    bottom: 0,
    left: -30,
    right: -30,
    height: 50,
    borderTopLeftRadius: SCREEN_WIDTH * 0.4,
    borderTopRightRadius: SCREEN_WIDTH * 0.6,
  },
  grassTuft: {
    position: 'absolute',
    fontSize: 14,
  },
  hillFlower: {
    position: 'absolute',
    fontSize: 16,
  },

  // ── HOME TOP BAR ──
  homeTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 0,
  },
  homeIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  homeIconBtnText: {
    fontSize: 20,
  },
  // ── LEVEL STARS ──
  levelStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 2,
  },
  levelBestText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '700',
    fontStyle: 'italic',
    marginLeft: 6,
  },

  // ── GAME SCREEN EXTRAS ──
  sbSmallBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFB347',
  },
  sbSmallBtnText: {
    fontSize: 14,
  },
  sbExtraRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 6,
    paddingVertical: 4,
    borderRadius: 10,
  },
  sbExtraText: {
    fontSize: 12,
    fontWeight: '800',
    fontStyle: 'italic',
    color: '#6C5CE7',
  },

  // ── TAP BADGE (giant balloon) ──
  tapBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E74C3C',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  tapBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
  },

  // ── PAUSE OVERLAY ──
  pauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 200,
  },
  pauseCard: {
    backgroundColor: '#fff',
    borderRadius: 30,
    padding: 30,
    alignItems: 'center',
    width: '80%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 12},
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  pauseEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  pauseTitle: {
    fontSize: 26,
    fontWeight: '900',
    fontStyle: 'italic',
    color: '#2D3436',
    marginBottom: 20,
  },
  pauseBtn: {
    backgroundColor: '#6C5CE7',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  pauseBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
  pauseBtnOutline: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#DDD',
  },
  pauseBtnOutlineText: {
    color: '#868E96',
    fontSize: 15,
    fontWeight: '700',
  },
  tutorialDesc: {
    fontSize: 15,
    color: '#636E72',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },

  // ── NEW BEST BADGE ──
  newBestBadge: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFD700',
    marginBottom: 6,
    fontStyle: 'italic',
  },

  // ── SETTINGS SCREEN ──
  settingsGroup: {
    marginTop: 20,
    gap: 2,
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  settingsLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    fontStyle: 'italic',
  },
  settingsToggle: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  settingsToggleOn: {
    backgroundColor: 'rgba(108,92,231,0.6)',
    borderColor: '#A29BFE',
  },
  settingsToggleText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
    fontStyle: 'italic',
  },

  // ── ACHIEVEMENTS SCREEN ──
  achievementsList: {
    marginTop: 16,
    gap: 10,
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  achievementIcon: {
    fontSize: 30,
    marginRight: 14,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    fontStyle: 'italic',
    marginBottom: 2,
  },
  achievementDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontStyle: 'italic',
  },
  achievementCheck: {
    fontSize: 20,
    marginLeft: 8,
  },
});

export default App;
