import { soundGenerator } from "./soundGenerator";

// Using Web Audio API generator instead of MP3 files for immediate functionality
// To use MP3 files later, replace with SOUND_FILES configuration and Howler.js

const SOUND_DEFINITIONS = {
  success: { category: "ui", volume: 0.68, cooldown: 120 },
  error: { category: "ui", volume: 0.48, cooldown: 180 },
  cancel: { category: "ui", volume: 0.45, cooldown: 120 },
  reward: { category: "gameplay", volume: 0.92, cooldown: 280 },
  notification: { category: "notifications", volume: 0.7, cooldown: 220 },
  tap: { category: "ui", volume: 0.22, cooldown: 90 },
  purchase: { category: "gameplay", volume: 0.88, cooldown: 260 },
  tournament: { category: "gameplay", volume: 0.78, cooldown: 240 },
  giveaway: { category: "gameplay", volume: 0.94, cooldown: 320 },
};

const lastPlayedAt = {};
let masterVolume = 0.78;
let soundMuted = false;
const enabledCategories = {
  ui: true,
  gameplay: true,
  notifications: true,
  ambience: false,
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

const canPlaySound = (key) => {
  const definition = SOUND_DEFINITIONS[key];
  if (!definition || soundMuted) return false;
  if (!enabledCategories[definition.category]) return false;
  const elapsed = now() - (lastPlayedAt[key] || 0);
  return elapsed >= definition.cooldown;
};

const updateLastPlayed = (key) => {
  lastPlayedAt[key] = now();
};

const playSound = (key, { volumeScale = 1, fadeIn = false, fadeDuration = 120 } = {}) => {
  if (!canPlaySound(key)) return null;
  
  const definition = SOUND_DEFINITIONS[key];
  const finalVolume = clamp(definition.volume * clamp(volumeScale, 0.6, 1.1), 0, 1);
  
  // Use Web Audio API generator
  switch(key) {
    case 'success':
      soundGenerator.generateSuccess();
      break;
    case 'error':
      soundGenerator.generateError();
      break;
    case 'cancel':
      soundGenerator.generateCancel();
      break;
    case 'reward':
      soundGenerator.generateReward();
      break;
    case 'notification':
      soundGenerator.generateNotification();
      break;
    case 'tap':
      soundGenerator.generateTap();
      break;
    case 'purchase':
      soundGenerator.generatePurchase();
      break;
    case 'tournament':
      soundGenerator.generateTournament();
      break;
    case 'giveaway':
      soundGenerator.generateGiveaway();
      break;
    default:
      console.warn(`[soundManager] Unknown sound key: ${key}`);
      return null;
  }
  
  updateLastPlayed(key);
  return Date.now(); // Return timestamp as sound ID
};

const setMasterVolume = (value) => {
  masterVolume = clamp(value, 0, 1);
  // Web Audio API doesn't have global volume, applied per sound
};

const setMute = (value) => {
  soundMuted = value;
};

const unlockAudio = () => {
  // Web Audio API context is created on first use
  try {
    soundGenerator.getContext();
  } catch (error) {
    console.warn("[soundManager] Failed to unlock audio", error);
  }
};

const preloadCoreSounds = () => {
  // Web Audio API doesn't need preloading
  console.log("[soundManager] Web Audio API - no preloading needed");
};

const setCategoryEnabled = (category, enabled) => {
  if (enabledCategories.hasOwnProperty(category)) {
    enabledCategories[category] = Boolean(enabled);
  }
};

const toggleCategory = (category) => {
  if (enabledCategories.hasOwnProperty(category)) {
    enabledCategories[category] = !enabledCategories[category];
  }
};

const toggleMute = () => {
  const nextMute = !soundMuted;
  setMute(nextMute);
  return nextMute;
};

const getPlaybackState = () => ({
  masterVolume,
  soundMuted,
  enabledCategories: { ...enabledCategories },
});

export const initSoundManager = ({ initialVolume = 0.78, preload = true } = {}) => {
  setMasterVolume(initialVolume);
  if (preload) preloadCoreSounds();
  return getPlaybackState();
};

export const playSuccess = () => playSound("success", { fadeIn: true, volumeScale: 0.96 });
export const playError = () => playSound("error", { fadeIn: true, volumeScale: 0.85 });
export const playCancel = () => playSound("cancel", { fadeIn: true, volumeScale: 0.7 });
export const playReward = () => playSound("reward", { fadeIn: true, volumeScale: 1 });
export const playNotification = () => playSound("notification", { fadeIn: true, volumeScale: 0.9 });
export const playTap = () => playSound("tap", { fadeIn: false, volumeScale: 0.55 });
export const playPurchase = () => playSound("purchase", { fadeIn: true, volumeScale: 0.96 });
export const playTournament = () => playSound("tournament", { fadeIn: true, volumeScale: 0.93 });
export const playGiveaway = () => playSound("giveaway", { fadeIn: true, volumeScale: 0.98 });

export {
  preloadCoreSounds,
  unlockAudio,
  setMasterVolume,
  setMute,
  toggleMute,
  setCategoryEnabled,
  toggleCategory,
  getPlaybackState,
};
