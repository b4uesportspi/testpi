import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { usePiNetwork } from '@/hooks/use-pi-network';
import ParticleBackground from '@/components/particle-background';
import Navigation from '@/components/navigation';
import Footer from '@/components/footer';
import AnimatedPage from '@/components/animated-page';
import { BRAND_LOGOS } from '@/lib/constants';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function Giveaway() {
  const { user, isAuthenticated } = usePiNetwork();
  const [, setLocation] = useLocation();

  // Redirect to landing if not authenticated
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setLocation('/');
    }
  }, [isAuthenticated, user, setLocation]);

  return (
    <AnimatedPage className="min-h-screen bg-background text-foreground">
      <ParticleBackground />
      <Navigation />

      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 border-b border-purple-500/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center mb-8">
            <img
              src={BRAND_LOGOS.B4U}
              alt="B4U Esports Logo"
              className="h-16 w-16 object-cover mr-6"
            />
            <div>
              <h1 className="text-4xl font-extrabold text-white">
                Giveaway & Rewards
              </h1>
              <p className="text-gray-300 mt-2">
                Win amazing prizes and exclusive rewards!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-purple-500/50 shadow-2xl">
            <CardContent className="pt-12">
              <div className="text-center py-20">
                {/* Coming Soon Badge */}
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="inline-block mb-8"
                >
                  <div className="px-6 py-3 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-2 border-purple-500/50">
                    <span className="text-lg font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400">
                      🚀 COMING SOON 🚀
                    </span>
                  </div>
                </motion.div>

                {/* Main Message */}
                <h2 className="text-5xl font-extrabold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400">
                  Exciting Giveaways Ahead!
                </h2>

                <p className="text-xl text-gray-300 mb-4 max-w-2xl mx-auto leading-relaxed">
                  We're preparing spectacular giveaways and exclusive rewards for our amazing B4U Esports community members.
                </p>

                <p className="text-lg text-gray-400 mb-12 max-w-2xl mx-auto">
                  Win Pi tokens, exclusive packages, premium memberships, and more!
                </p>

                {/* Features Coming Soon */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                  <motion.div
                    whileHover={{ y: -10, scale: 1.05 }}
                    className="p-6 bg-gray-800/50 rounded-xl border border-purple-500/30 hover:border-purple-400 transition-all"
                  >
                    <div className="text-4xl mb-4">🎁</div>
                    <h3 className="text-xl font-bold text-purple-400 mb-2">
                      Daily Giveaways
                    </h3>
                    <p className="text-gray-400">
                      Multiple chances to win every single day
                    </p>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -10, scale: 1.05 }}
                    className="p-6 bg-gray-800/50 rounded-xl border border-pink-500/30 hover:border-pink-400 transition-all"
                  >
                    <div className="text-4xl mb-4">💎</div>
                    <h3 className="text-xl font-bold text-pink-400 mb-2">
                      Premium Rewards
                    </h3>
                    <p className="text-gray-400">
                      Exclusive packages and premium memberships
                    </p>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -10, scale: 1.05 }}
                    className="p-6 bg-gray-800/50 rounded-xl border border-blue-500/30 hover:border-blue-400 transition-all"
                  >
                    <div className="text-4xl mb-4">⭐</div>
                    <h3 className="text-xl font-bold text-blue-400 mb-2">
                      Loyalty Rewards
                    </h3>
                    <p className="text-gray-400">
                      More entries for our active community members
                    </p>
                  </motion.div>
                </div>

                {/* Notification CTA */}
                <div className="max-w-xl mx-auto">
                  <Card className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border-2 border-purple-500/50 p-6">
                    <p className="text-gray-300 mb-4">
                      Stay tuned! Our giveaway platform is launching very soon.
                    </p>
                    <Button
                      className="w-full py-6 text-lg font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 hover:from-purple-700 hover:via-pink-700 hover:to-blue-700 text-white rounded-xl shadow-lg transform transition-all duration-300 hover:scale-105"
                      onClick={() => {
                        setLocation('/dashboard');
                      }}
                    >
                      <i className="fas fa-arrow-left mr-2"></i>
                      Back to Dashboard
                    </Button>
                  </Card>
                </div>

                {/* Stats Preview */}
                <div className="mt-16 pt-12 border-t border-gray-700">
                  <h3 className="text-2xl font-bold text-gray-300 mb-8">
                    What to Expect:
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left max-w-2xl mx-auto">
                    <div className="flex items-start">
                      <i className="fas fa-check-circle text-green-400 text-2xl mr-4 mt-1"></i>
                      <div>
                        <h4 className="font-bold text-white mb-1">
                          Weekly Grand Prizes
                        </h4>
                        <p className="text-gray-400 text-sm">
                          Large Pi rewards and exclusive packages
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <i className="fas fa-check-circle text-green-400 text-2xl mr-4 mt-1"></i>
                      <div>
                        <h4 className="font-bold text-white mb-1">
                          Referral Bonuses
                        </h4>
                        <p className="text-gray-400 text-sm">
                          Extra entries for referring friends
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <i className="fas fa-check-circle text-green-400 text-2xl mr-4 mt-1"></i>
                      <div>
                        <h4 className="font-bold text-white mb-1">
                          Monthly Mega Draws
                        </h4>
                        <p className="text-gray-400 text-sm">
                          Massive prizes for lucky winners
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <i className="fas fa-check-circle text-green-400 text-2xl mr-4 mt-1"></i>
                      <div>
                        <h4 className="font-bold text-white mb-1">
                          No Entry Fees
                        </h4>
                        <p className="text-gray-400 text-sm">
                          100% free for all community members
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Footer />
    </AnimatedPage>
  );
}
