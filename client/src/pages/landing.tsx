import { usePiNetwork } from '@/hooks/use-pi-network';
import { usePiPrice } from '@/hooks/use-pi-price';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import ParticleBackground from '@/components/particle-background';
import GamingBackground from '@/components/gaming-background';
import Navigation from '@/components/navigation';
import AnimatedPage from '@/components/animated-page';
import { Button } from '@/components/ui/button';
import { BRAND_LOGOS, GAME_LOGOS } from '@/lib/constants';
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/animations';
import type { Package } from '@/types/pi-network';
import { Shield, Zap, LineChart, Loader2, ExternalLink, Smartphone, Copy, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

export default function Landing() {
  const { toast } = useToast();
  const { authenticate, isAuthenticated, isLoading: piLoading } = usePiNetwork();
  const { data: piPrice } = usePiPrice();
  const [, setLocation] = useLocation();
  const [showPiBrowserModal, setShowPiBrowserModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const { data: packages, isLoading: packagesLoading } = useQuery<Package[]>({
    queryKey: ['/api/packages'],
  });

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      setLocation('/dashboard');
    }
  }, [isAuthenticated, setLocation]);

  const handlePiLogin = async () => {
    // Check if running in Pi Browser
    if (typeof window !== 'undefined' && !window.Pi) {
      setShowPiBrowserModal(true);
      return;
    }

    try {
      await authenticate();
    } catch (error: any) {
      console.error('Login failed:', error);
      if (error?.message?.includes('Pi Browser') || error?.message?.includes('Pi SDK not loaded')) {
        setShowPiBrowserModal(true);
      } else {
        toast({
          variant: "destructive",
          title: "Authentication Note",
          description: (error as Error).message.replace('B4U Esports says:', '').replace('Pi authentication failed: ', ''),
        });
      }
    }
  };

  return (
    <AnimatedPage className="min-h-screen bg-background text-foreground relative">
      <ParticleBackground />
      <GamingBackground />
      
      {/* Header with Logo and Animated Text */}
      <motion.div
        className="border-b border-border relative z-10"
        data-testid="header-with-logo"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            {/* Logo */}
            <div className="flex items-center">
              <img 
                src={BRAND_LOGOS.B4U} 
                alt="B4U Esports Logo" 
                className="h-12 w-12 rounded-full object-cover"
                data-testid="header-logo"
              />
            </div>
            
            {/* Premium Tagline */}
            <div className="flex-1 mx-4 hidden md:flex items-center justify-center" data-testid="animated-text-container">
              <span className="text-slate-400 text-sm font-medium tracking-wide uppercase">
                The Premier Pi Network Esports Platform
              </span>
            </div>
            
          </div>
        </div>
      </motion.div>
      
      {/* Hero Section */}
      <section className="min-h-[70vh] sm:min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 relative z-10" data-testid="hero-section">
        <div className="max-w-7xl w-full">
          <motion.div
            className="text-center mb-16"
            variants={fadeInUp}
            initial="initial"
            animate="animate"
          >
            <div className="relative inline-block mb-6">
              
              <h1 className="relative text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-2" data-testid="hero-title">
                Gaming Currency
              </h1>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500" data-testid="hero-subtitle">
              Powered by Pi Network
            </h2>
            <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-3xl mx-auto leading-relaxed font-medium" data-testid="hero-description">
              <span className="text-white font-semibold">B4U Esports</span> is the secure marketplace for gaming top-ups and esports services. Buy your favorite in-game currencies seamlessly using Pi.
            </p>

            {/* Pi Network Login Button */}
            <div className="mb-12 flex flex-col items-center">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-md opacity-50 group-hover:opacity-100 transition duration-500"></div>
                <Button
                  onClick={() => {
                    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([30, 50, 30]);
                    handlePiLogin();
                  }}
                  disabled={piLoading}
                  className="relative inline-block p-0 h-auto bg-slate-900 border border-white/10 rounded-xl overflow-hidden glass-panel"
                  data-testid="pi-login-button"
                >
                  <div className="px-4 py-3 sm:px-8 sm:py-4 flex items-center space-x-3 sm:space-x-4 bg-white/5 hover:bg-white/10 transition-colors">
                    <div className="relative flex-shrink-0">
                      <img 
                        src={BRAND_LOGOS.PI} 
                        alt="Pi Network Logo" 
                        className="w-6 h-6 sm:w-8 sm:h-8 rounded-full relative z-10 shadow-[0_0_15px_rgba(250,204,21,0.3)]"
                        data-testid="pi-logo-button"
                      />
                    </div>
                    <span className="text-sm sm:text-lg font-bold text-white tracking-wide whitespace-nowrap">
                      {piLoading ? (
                        <span className="flex items-center text-blue-400">
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          <span>Authenticating...</span>
                        </span>
                      ) : 'Sign in with Pi Network'}
                    </span>
                  </div>
                </Button>
              </motion.div>
              
              {/* Mainnet Disclaimer */}
              <p className="text-[10px] sm:text-xs text-slate-400 mt-6 max-w-sm sm:max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-0 bg-white/5 py-2 sm:py-2 px-3 sm:px-4 rounded-full border border-white/10 backdrop-blur-sm">
                <Shield className="w-3.5 h-3.5 sm:mr-2 text-blue-400 shrink-0" />
                <span className="text-center sm:text-left">Transactions are processed securely on Pi Mainnet</span>
              </p>
            </div>
            
            {/* Live Action Counters */}
            <div className="flex flex-wrap justify-center gap-6 sm:gap-12 mt-8 border-t border-white/5 pt-8">
              <div className="text-center">
                <p className="text-3xl font-bold text-white">14K+</p>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-1">Active Gamers</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-white">99.9%</p>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-1">Delivery Rate</p>
              </div>
              <div className="text-center relative">
                <div className="absolute -top-1 -right-3 w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                <p className="text-3xl font-bold text-white">Live</p>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-1">Pi Pricing</p>
              </div>
            </div>
          </motion.div>

          {/* Why Choose Us Section */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20 relative z-10"
            data-testid="features-section"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            <motion.div
              className="relative p-8 rounded-2xl glass-panel text-center group"
              data-testid="feature-pricing"
              variants={staggerItem}
              whileHover={{ y: -5 }}
            >
              <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6 transform group-hover:scale-110 transition-transform duration-500">
                <LineChart className="w-7 h-7 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white">Live Pricing</h3>
              <p className="text-slate-400 text-sm">Real-time Pi/USD conversion rates updated every 60 seconds for absolute accuracy.</p>
            </motion.div>
            
            <motion.div
              className="relative p-8 rounded-2xl glass-panel text-center group"
              data-testid="feature-security"
              variants={staggerItem}
              whileHover={{ y: -5 }}
            >
              <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6 transform group-hover:scale-110 transition-transform duration-500">
                <Shield className="w-7 h-7 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white">Secure Payments</h3>
              <p className="text-slate-400 text-sm">Protected end-to-end by Pi Network's advanced cryptographic payment system.</p>
            </motion.div>
            
            <motion.div
              className="relative p-8 rounded-2xl glass-panel text-center group"
              data-testid="feature-support"
              variants={staggerItem}
              whileHover={{ y: -5 }}
            >
              <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6 transform group-hover:scale-110 transition-transform duration-500">
                <Zap className="w-7 h-7 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white">Lightning Fast</h3>
              <p className="text-slate-400 text-sm">Automated delivery system ensures you receive your gaming top-ups instantly.</p>
            </motion.div>
          </motion.div>

          {/* Featured Packages - REMOVED as per requirement */}
        </div>
      </section>

      {/* Pi Browser Deep Link Modal */}
      <Dialog open={showPiBrowserModal} onOpenChange={setShowPiBrowserModal}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-purple-600/20 border border-purple-500/40 flex items-center justify-center mb-3">
              <Smartphone className="w-6 h-6 text-purple-400" />
            </div>
            <DialogTitle className="text-center text-xl font-bold text-white">
              Pi Browser Required
            </DialogTitle>
            <DialogDescription className="text-center text-slate-300 pt-2 text-sm">
              B4U Esports is fully integrated into the Pi Network. To authenticate, top up gaming currencies, and execute secure Pi payments, please open this app inside the official <strong className="text-purple-300">Pi Browser</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-4">
            <Button
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold py-5 shadow-lg shadow-purple-900/30 gap-2"
              onClick={() => {
                const targetUrl = typeof window !== 'undefined' ? window.location.href : 'https://b4uesportstest.vercel.app';
                window.location.href = `pi://${targetUrl.replace(/^https?:\/\//, '')}`;
              }}
            >
              <ExternalLink className="w-4 h-4" />
              Open in Pi Browser
            </Button>

            <Button
              variant="outline"
              className="w-full border-slate-700 text-slate-300 hover:bg-slate-800 gap-2"
              onClick={() => {
                const url = typeof window !== 'undefined' ? window.location.href : 'https://b4uesportstest.vercel.app';
                navigator.clipboard?.writeText?.(url);
                setCopiedLink(true);
                setTimeout(() => setCopiedLink(false), 2500);
              }}
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copiedLink ? 'Link Copied to Clipboard!' : 'Copy Link for Pi Browser'}
            </Button>
          </div>

          <DialogFooter className="text-center sm:justify-center border-t border-slate-800 pt-3">
            <p className="text-xs text-slate-500">
              Don't have Pi Browser? Download it from the <a href="https://minepi.com" target="_blank" rel="noopener noreferrer" className="text-purple-400 underline hover:text-purple-300">official Pi Network website</a>.
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AnimatedPage>
  );
}
