import { useState, type FormEvent } from "react";
import { apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Link } from "wouter";
import { ArrowLeft, Wallet, ArrowRight, ShieldCheck, CheckCircle2, Fingerprint } from "lucide-react";

export default function RewardsRedemption() {
  const [tokensRequested, setTokensRequested] = useState(1000);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const conversionRate = 10000;
  const estimatedPi = tokensRequested > 0 ? (tokensRequested / conversionRate).toFixed(4) : "0.0000";

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setIsSubmitting(true);

    try {
      const response = await apiRequest("POST", "/api/user/redeem-tokens", {
        amount: tokensRequested,
      });
      const data = await response.json();
      setIsSuccess(true);
      setMessage(`B4U Esports Token burned and Pi treasury payout request created. ID: ${data.request?.id || data.redemptionId}`);
    } catch (error: any) {
      setMessage(error.message || "Unable to create redemption request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white overflow-hidden relative flex flex-col">
      {/* Background Glow */}
      <div className="absolute top-[-20%] left-[20%] w-[50%] h-[50%] rounded-full bg-amber-500/20 blur-[120px] pointer-events-none" />

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="max-w-3xl mx-auto w-full relative z-10 pt-10"
      >
        <Link href="/token-wallet">
          <span className="inline-flex items-center gap-2 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer mb-8 font-medium">
            <ArrowLeft className="w-4 h-4" /> Back to Wallet
          </span>
        </Link>

        <motion.div variants={itemVariants} className="mb-10 text-center">
          <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
            Redeem B4U Esports Token to Pi
          </h1>
          <p className="mt-3 text-slate-400 text-lg">B4UT is not real Pi. Redemption burns your app tokens and queues a real Pi payout from the B4U Mainnet App Wallet.</p>
        </motion.div>

        {isSuccess ? (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="rounded-3xl border border-emerald-500/30 bg-emerald-950/30 backdrop-blur-xl p-10 text-center shadow-[0_0_40px_rgba(16,185,129,0.1)]"
          >
            <CheckCircle2 className="w-20 h-20 text-emerald-400 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-white mb-4">Redemption Requested!</h2>
            <p className="text-slate-300 mb-8">{message}</p>
            <Link href="/token-wallet">
              <span className="inline-block cursor-pointer rounded-xl bg-emerald-600 px-8 py-4 text-white font-bold hover:bg-emerald-500 transition-colors">
                Return to Dashboard
              </span>
            </Link>
          </motion.div>
        ) : (
          <motion.form 
            variants={itemVariants}
            onSubmit={handleSubmit} 
            className="rounded-3xl border border-slate-800 bg-slate-900/60 backdrop-blur-2xl p-6 md:p-10 shadow-2xl"
          >
            <div className="space-y-8">
              {/* Token Input */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-amber-500" /> Amount to Redeem
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={tokensRequested}
                    min={1000}
                    step={100}
                    onChange={(event) => setTokensRequested(Number(event.target.value))}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950/50 px-6 py-4 text-3xl font-bold text-white outline-none transition focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 font-bold">B4UT</span>
                </div>
                <p className="mt-2 text-xs text-slate-500">Minimum redemption: 1000 B4UT. Rate: {conversionRate.toLocaleString()} B4UT = 1 Pi.</p>
              </div>

              {/* Conversion Display */}
              <div className="flex flex-col md:flex-row items-center gap-4 bg-slate-950/30 p-6 rounded-2xl border border-slate-800/50">
                <div className="flex-1 text-center md:text-left">
                  <p className="text-sm text-slate-500 uppercase tracking-wider mb-1">You Burn</p>
                  <p className="text-2xl font-bold text-amber-500">{tokensRequested} B4UT</p>
                  <p className="text-xs text-slate-500">B4U Esports Token removed from your balance</p>
                </div>
                <ArrowRight className="w-6 h-6 text-slate-600 hidden md:block" />
                <div className="flex-1 text-center md:text-right">
                  <p className="text-sm text-slate-500 uppercase tracking-wider mb-1">You Receive</p>
                  <p className="text-2xl font-bold text-purple-400">{estimatedPi} PI</p>
                  <p className="text-xs text-slate-500 mt-1">Treasury payout request</p>
                </div>
              </div>

              {/* Verified Identity */}
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-5">
                <div className="flex items-start gap-3">
                  <Fingerprint className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wider text-emerald-300">Verified Pi UID payout</p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">
                      Redemption uses your authenticated Pi Network UID. Do not enter a wallet address manually; Pi resolves the official app-to-user payout target from your verified account.
                    </p>
                  </div>
                </div>
              </div>

              {/* Security Badge */}
              <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Protected by B4U Anti-Fraud Engine
              </div>

              <button
                type="submit"
                disabled={isSubmitting || tokensRequested < 1000}
                className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 text-slate-950 font-black text-lg transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(245,158,11,0.2)]"
              >
                {isSubmitting ? "Processing..." : "Confirm Redemption"}
              </button>

              <AnimatePresence>
                {message && !isSuccess && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-4 text-sm text-rose-400 text-center"
                  >
                    {message}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.form>
        )}
      </motion.div>
    </div>
  );
}
