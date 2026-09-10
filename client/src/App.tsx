import React, { Suspense } from "react";
import { Switch, Route, Router, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PiNetworkProvider, usePiNetwork } from "./hooks/use-pi-network";
import { SoundProvider } from "@/context/SoundContext";
import { LanguageProvider } from "@/context/LanguageContext";
import LanguageBanner from "@/components/language-banner";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Giveaway from "@/pages/giveaway";
const AdminPanel = React.lazy(() => import("@/pages/admin"));
import Feedback from "@/pages/feedback";
import PrivacyPolicy from "@/pages/privacy-policy";
import TermsOfService from "@/pages/terms-of-service";
import RefundPolicy from "@/pages/refund-policy";
import DataProtection from "@/pages/data-protection";
import UserAgreement from "@/pages/user-agreement";
import AboutUs from "@/pages/about-us";
import OurHistory from "@/pages/our-history";
import NotFound from "@/pages/not-found";
import DebugPage from "@/pages/debug";
import FAQs from "@/pages/faqs";
import Whitepaper from "@/pages/whitepaper";
import TokenWallet from "@/pages/token-wallet";
import RewardCenter from "@/pages/reward-center";
import RewardsRedemption from "@/pages/rewards-redemption";
import TreasuryStatus from "@/pages/treasury-status";
import TournamentRegistration from "@/pages/tournament-registration";
import Subscriptions from "@/pages/subscriptions";
import { AnimatePresence } from "framer-motion";
import { ADMIN_PANEL_PATH } from "@/lib/admin-route";

// Clear any cached profile queries on app startup
try {
  queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
  queryClient.removeQueries({ queryKey: ['/api/profile'] });
} catch (error) {
  // Ignore errors during cleanup
}

function AppRouter() {
  // Get current location to trigger animations on route change
  const [location] = useLocation();
  const { user } = usePiNetwork();
  
  return (
    <AnimatePresence mode="wait">
      <Switch key={location} location={location}>
        <Route path="/" component={Landing} />
        <Route path="/debug" component={DebugPage} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/giveaway" component={Giveaway} />
        <Route path="/feedback" component={Feedback} />
        <Route path="/review" component={Feedback} />
        <Route path={ADMIN_PANEL_PATH} component={AdminPanel} />
        <Route path="/privacy-policy" component={PrivacyPolicy} />
        <Route path="/terms-of-service" component={TermsOfService} />
        <Route path="/refund-policy" component={RefundPolicy} />
        <Route path="/data-protection" component={DataProtection} />
        <Route path="/user-agreement" component={UserAgreement} />
        <Route path="/about-us" component={AboutUs} />
        <Route path="/our-history" component={OurHistory} />
        <Route path="/faqs" component={FAQs} />
        <Route path="/whitepaper" component={Whitepaper} />
        <Route path="/subscriptions" component={Subscriptions} />
        <Route path="/token-wallet" component={TokenWallet} />
        <Route path="/reward-center" component={RewardCenter} />
        <Route path="/redeem" component={RewardsRedemption} />
        <Route path="/treasury" component={TreasuryStatus} />
        <Route path="/tournament/:tournamentId" component={TournamentRegistration} />
        <Route component={NotFound} />
      </Switch>
    </AnimatePresence>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SoundProvider>
          <LanguageProvider>
            <PiNetworkProvider>
              <div className="dark min-h-screen bg-background text-foreground">
                <Toaster />
                <LanguageBanner />
                <Router hook={useHashLocation}>
                  <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading admin panel...</div>}>
                    <AppRouter />
                  </Suspense>
                </Router>
              </div>
            </PiNetworkProvider>
          </LanguageProvider>
        </SoundProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
