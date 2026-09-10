import { useContext } from "react";
import { SoundContext } from "@/context/SoundContext";

export interface SoundActions {
  playTap: () => void;
  playReward: () => void;
  playPurchase: () => void;
  playCancel: () => void;
  playError: () => void;
  playTournament?: () => void;
  playGiveaway?: () => void;
  playNotification?: () => void;
  [key: string]: any;
}

export interface SoundContextValue {
  soundActions: SoundActions;
  initializeAudio: () => void;
  soundEnabled: boolean;
  toggleSound?: () => void;
}

export function useSound(): SoundContextValue {
  const context = useContext(SoundContext);
  if (!context) {
    throw new Error("useSound must be used within a SoundProvider");
  }
  return context as unknown as SoundContextValue;
}
