import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import * as soundManager from "@/utils/soundManager";

const STORAGE_KEY = "esports-sound-settings";

const defaultState = {
  soundEnabled: true,
  masterVolume: 0.78,
  notificationEnabled: true,
  categories: {
    ui: true,
    gameplay: true,
    notifications: true,
  },
};

const SoundContext = createContext({
  ...defaultState,
  initializeAudio: () => {},
  setSoundEnabled: () => {},
  setMasterVolume: () => {},
  setNotificationEnabled: () => {},
  toggleCategory: () => {},
  soundActions: {},
});

const loadSettings = () => {
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw);
    return {
      ...defaultState,
      ...parsed,
      categories: {
        ...defaultState.categories,
        ...(parsed.categories || {}),
      },
    };
  } catch (error) {
    console.warn("[SoundContext] Failed to load settings", error);
    return defaultState;
  }
};

const saveSettings = (settings) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn("[SoundContext] Failed to save settings", error);
  }
};

const SoundProvider = ({ children }) => {
  const [soundEnabled, setSoundEnabled] = useState(defaultState.soundEnabled);
  const [masterVolume, setMasterVolumeState] = useState(defaultState.masterVolume);
  const [notificationEnabled, setNotificationEnabled] = useState(defaultState.notificationEnabled);
  const [categories, setCategories] = useState(defaultState.categories);
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    const settings = loadSettings();
    setSoundEnabled(settings.soundEnabled);
    setMasterVolumeState(settings.masterVolume);
    setNotificationEnabled(settings.notificationEnabled);
    setCategories(settings.categories);
  }, []);

  useEffect(() => {
    soundManager.setMasterVolume(masterVolume);
    soundManager.setMute(!soundEnabled);
    soundManager.setCategoryEnabled("notifications", notificationEnabled);
    Object.entries(categories).forEach(([category, enabled]) => {
      soundManager.setCategoryEnabled(category, enabled);
    });

    saveSettings({ soundEnabled, masterVolume, notificationEnabled, categories });
  }, [soundEnabled, masterVolume, notificationEnabled, categories]);

  useEffect(() => {
    const handleFirstInteraction = () => {
      soundManager.unlockAudio();
      soundManager.preloadCoreSounds();
      setIsUnlocked(true);
    };

    window.addEventListener("pointerdown", handleFirstInteraction, { once: true, passive: true });
    window.addEventListener("keydown", handleFirstInteraction, { once: true, passive: true });

    return () => {
      window.removeEventListener("pointerdown", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
    };
  }, []);

  const initializeAudio = useCallback(() => {
    if (!isUnlocked) {
      soundManager.unlockAudio();
      soundManager.preloadCoreSounds();
      setIsUnlocked(true);
    }
  }, [isUnlocked]);

  const toggleCategory = useCallback((category) => {
    setCategories((current) => {
      const updated = { ...current, [category]: !current[category] };
      soundManager.setCategoryEnabled(category, updated[category]);
      return updated;
    });
  }, []);

  const soundActions = useMemo(
    () => ({
      playSuccess: () => {
        if (!soundEnabled || !categories.ui) return null;
        return soundManager.playSuccess();
      },
      playError: () => {
        if (!soundEnabled || !categories.ui) return null;
        return soundManager.playError();
      },
      playCancel: () => {
        if (!soundEnabled || !categories.ui) return null;
        return soundManager.playCancel();
      },
      playReward: () => {
        if (!soundEnabled || !categories.gameplay) return null;
        return soundManager.playReward();
      },
      playNotification: () => {
        if (!soundEnabled || !notificationEnabled || !categories.notifications) return null;
        return soundManager.playNotification();
      },
      playTap: () => {
        if (!soundEnabled || !categories.ui) return null;
        return soundManager.playTap();
      },
      playPurchase: () => {
        if (!soundEnabled || !categories.gameplay) return null;
        return soundManager.playPurchase();
      },
      playTournament: () => {
        if (!soundEnabled || !categories.gameplay) return null;
        return soundManager.playTournament();
      },
      playGiveaway: () => {
        if (!soundEnabled || !categories.gameplay) return null;
        return soundManager.playGiveaway();
      },
    }),
    [soundEnabled, categories, notificationEnabled]
  );

  return (
    <SoundContext.Provider
      value={{
        soundEnabled,
        masterVolume,
        notificationEnabled,
        categories,
        initializeAudio,
        setSoundEnabled,
        setMasterVolume: setMasterVolumeState,
        setNotificationEnabled,
        toggleCategory,
        soundActions,
      }}
    >
      {children}
    </SoundContext.Provider>
  );
};

export { SoundProvider, SoundContext };
