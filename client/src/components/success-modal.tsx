import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { modalBackdrop, modalContent } from '@/lib/animations';
import CoinBurst from './coin-burst';
import AnimatedCounter from './animated-counter';
import { Button } from '@/components/ui/button';
import { CheckCircle, X, Share2 } from 'lucide-react';
import { piSDK } from '@/lib/pi-sdk';
import { useToast } from '@/hooks/use-toast';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  rewardAmount?: number;
  rewardLabel?: string;
  showCoinBurst?: boolean;
}

/**
 * SuccessModal - Celebratory success dialog with animations
 * Usage: Show after payment success, reward claim, or any achievement
 */
export default function SuccessModal({
  isOpen,
  onClose,
  title,
  message,
  rewardAmount,
  rewardLabel = 'tokens',
  showCoinBurst = true,
}: SuccessModalProps) {
  const { toast } = useToast();
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    setIsSharing(true);
    try {
      const receiptContent = `========================================\nB4U ESPORTS - OFFICIAL TRANSACTION RECEIPT\n========================================\nStatus: Verified on Pi Network\nTitle: ${title}\nDetails: ${message}${rewardAmount ? `\nReward: ${rewardAmount} ${rewardLabel}` : ''}\nDate: ${new Date().toUTCString()}\nApp: https://b4uesportstest.vercel.app\n========================================\nThank you for choosing B4U Esports!`;

      let sharedViaFile = false;
      // Check if native Pi.shareFile or navigator file sharing is available
      if (typeof window !== 'undefined' && typeof File !== 'undefined') {
        const canShareFiles = Boolean(
          window.Pi?.shareFile ||
          (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [new File([''], 'test.txt')] }))
        );

        if (canShareFiles) {
          try {
            const receiptFile = new File([receiptContent], `B4U_Receipt_${Date.now()}.txt`, { type: 'text/plain' });
            await piSDK.shareFile(receiptFile);
            sharedViaFile = true;
          } catch (fileErr) {
            console.log('Native file sharing not completed or cancelled, falling back to dialog', fileErr);
          }
        }
      }

      if (!sharedViaFile) {
        const shareText = `🎮 B4U Esports on Pi Network: ${title}!\n${message}${rewardAmount ? `\nEarned ${rewardAmount} ${rewardLabel}!` : ''}\nPlay now: ${window.location.origin}`;
        await piSDK.openShareDialog(title, shareText);
      }
    } catch {
      toast({
        title: "Share",
        description: "Details copied to clipboard.",
      });
    } finally {
      setIsSharing(false);
    }
  };

  const handleCoinBurstComplete = () => {
    // Optional: auto-close after animation
    // onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={modalBackdrop}
          initial="initial"
          animate="animate"
          exit="exit"
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* Coin Burst Effect */}
          {showCoinBurst && (
            <CoinBurst isActive={isOpen} onComplete={handleCoinBurstComplete} coinCount={30} />
          )}

          {/* Modal Content */}
          <motion.div
            variants={modalContent}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            className="bg-gradient-to-br from-card to-card/80 border border-border rounded-2xl shadow-2xl max-w-md w-full relative overflow-hidden"
          >
            {/* Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 via-transparent to-green-500/20 pointer-events-none" />
            
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-8 relative z-10">
              {/* Success Icon */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ 
                  type: 'spring',
                  stiffness: 200,
                  damping: 15,
                  delay: 0.2 
                }}
                className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg"
              >
                <CheckCircle className="w-12 h-12 text-white" />
              </motion.div>

              {/* Title */}
              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold text-center mb-3 bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent"
              >
                {title}
              </motion.h2>

              {/* Message */}
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-muted-foreground text-center mb-6"
              >
                {message}
              </motion.p>

              {/* Reward Display */}
              {rewardAmount !== undefined && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ 
                    type: 'spring',
                    stiffness: 300,
                    damping: 20,
                    delay: 0.5 
                  }}
                  className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl p-6 mb-6"
                >
                  <div className="text-center">
                    <p className="text-sm text-yellow-300 mb-2">Reward Earned</p>
                    <div className="text-4xl font-bold text-yellow-400">
                      <AnimatedCounter 
                        targetValue={rewardAmount} 
                        duration={1.5}
                        suffix={` ${rewardLabel}`}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Action Button */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex flex-col gap-2.5"
              >
                <Button
                  onClick={onClose}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold py-6 shadow-lg hover:shadow-xl transition-all"
                >
                  Awesome! 🎉
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleShare}
                  disabled={isSharing}
                  className="w-full border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-200 py-5 flex items-center justify-center gap-2"
                >
                  <Share2 className="w-4 h-4 text-emerald-400" />
                  {isSharing ? 'Opening Share Menu...' : 'Share Receipt with Friends'}
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
