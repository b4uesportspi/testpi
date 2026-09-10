import { useContext } from "react";
import { SoundContext } from "@/context/SoundContext";

export function useSound() {
  const context = useContext(SoundContext);
  if (!context) {
    throw new Error("useSound must be used within a SoundProvider");
  }
  return context;
}

/* Example Usage:

import { useSound } from "@/hooks/useSound";

function SomeButton() {
  const { soundActions, initializeAudio, soundEnabled } = useSound();

  return (
    <button
      onClick={() => {
        initializeAudio();
        soundActions.playTap();
      }}
    >
      Button with click sound
    </button>
  );
}

// Purchase success trigger:
// soundActions.playPurchase();
// Tournament join success:
// soundActions.playTournament();
// Giveaway claim action:
// soundActions.playGiveaway();
// Error handling example:
// soundActions.playError();
// Notification trigger:
// soundActions.playNotification();
*/
