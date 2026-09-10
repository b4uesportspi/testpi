import Navigation from '@/components/navigation';
import Footer from '@/components/footer';
import AnimatedPage from '@/components/animated-page';
import ParticleBackground from '@/components/particle-background';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocation } from 'wouter';
import { useState } from 'react';

export default function RefundPolicy() {
  const [, setLocation] = useLocation();
  const [isMinimized, setIsMinimized] = useState(false);

  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const handleClose = () => {
    setLocation('/');
  };

  return (
    <AnimatedPage className="min-h-screen bg-background text-foreground">
      <ParticleBackground />
      <Navigation  />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className={`flex justify-between items-center mb-8 ${isMinimized ? 'mb-4' : ''}`}>
          <div className={`text-center ${isMinimized ? 'hidden' : ''}`}>
            <h1 className="text-4xl font-bold mb-4 highlighted-title">Refund Policy</h1>
            <p className="text-muted-foreground">Last updated: January 2025</p>
          </div>
          
          {/* Minimize/Close Controls */}
          <div className="flex space-x-2">
            <button 
              onClick={handleMinimize}
              className="p-2 rounded-full hover:bg-muted transition-colors"
              aria-label={isMinimized ? "Maximize" : "Minimize"}
            >
              <i className={`fas ${isMinimized ? 'fa-window-maximize' : 'fa-window-minimize'}`}></i>
            </button>
            <button 
              onClick={handleClose}
              className="p-2 rounded-full hover:bg-muted transition-colors"
              aria-label="Close"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        <div className={`space-y-8 ${isMinimized ? 'hidden' : ''}`}>
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-red-400 mb-2">
              <i className="fas fa-exclamation-triangle mr-2"></i>
              <span className="highlighted-title">Important Notice</span>
            </h2>
            <p className="text-red-300 enhanced-paragraph">
              <strong>All sales of digital top-ups, creator-growth services, and subscriptions are final and non-refundable.</strong> 
              Please read this policy carefully before making any purchases.
            </p>
          </div>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="highlighted-title">1. No Refund Policy</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">B4U Esports operates a strict no-refund policy for all digital top-ups and service purchases. This includes:</p>
              <ul className="space-y-2">
                <li className="enhanced-paragraph">PUBG Mobile UC (Unknown Cash)</li>
                <li className="enhanced-paragraph">PUBG MOBILE KR UC (KR UC)</li>
                <li className="enhanced-paragraph">Mobile Legends: Bang Bang Diamonds</li>
                <li className="enhanced-paragraph">Clash of Clans Gold Pass</li>
                <li className="enhanced-paragraph">Roblox Robux, NEW STATE NC, and Free Fire Diamonds</li>
                <li className="enhanced-paragraph">TikTok, YouTube, Facebook, and Instagram service packages</li>
                <li className="enhanced-paragraph">Netflix, Canva, and other digital subscriptions offered on our platform</li>
              </ul>
              <p className="enhanced-paragraph mt-4"><strong>Once a transaction is completed and the purchased top-up, service, or subscription is delivered to your account, the sale is final.</strong></p>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="highlighted-title">2. Reasons for No-Refund Policy</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">Our no-refund policy exists for several important reasons:</p>
              <ul className="space-y-2">
                <li className="enhanced-paragraph"><strong>Digital Nature:</strong> Top-ups, social-growth packages, and subscriptions are digital goods that cannot be "returned" once delivered</li>
                <li className="enhanced-paragraph"><strong>Instant Delivery:</strong> Many packages are delivered immediately to your game, social, or subscription account</li>
                <li className="enhanced-paragraph"><strong>Fraud Prevention:</strong> Protects against fraudulent refund claims and chargebacks</li>
                <li className="enhanced-paragraph"><strong>Publisher Requirements:</strong> Game publishers do not allow reversal of currency transactions</li>
                <li className="enhanced-paragraph"><strong>Pi Network Integration:</strong> Cryptocurrency transactions are designed to be irreversible</li>
                <li className="enhanced-paragraph"><strong>Operational Costs:</strong> Processing refunds would require significant additional resources</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="highlighted-title">3. Pre-Purchase Verification</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">To avoid issues, please verify the following before completing your purchase:</p>
              <ul className="space-y-2">
                <li className="enhanced-paragraph"><strong>Game Account Information:</strong> Ensure your PUBG UID or Mobile Legends User ID/Zone ID are correct</li>
                <li className="enhanced-paragraph"><strong>Package Selection:</strong> Verify you are purchasing the correct game and currency amount</li>
                <li className="enhanced-paragraph"><strong>Payment Amount:</strong> Confirm the Pi amount and USD equivalent before proceeding</li>
                <li className="enhanced-paragraph"><strong>Account Access:</strong> Ensure you have access to the game account where currency will be delivered</li>
                <li className="enhanced-paragraph"><strong>Game Version:</strong> Verify you are playing the correct version of the game (Global, regional, etc.)</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="highlighted-title">4. Exceptional Circumstances</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">While our general policy is no refunds, we may consider exceptions in very limited circumstances:</p>
              <ul className="space-y-2">
                <li className="enhanced-paragraph"><strong>Technical Failure:</strong> If our system fails to deliver currency due to a technical error on our end</li>
                <li className="enhanced-paragraph"><strong>Wrong Currency Type:</strong> If we deliver the wrong type of currency due to a system error</li>
                <li className="enhanced-paragraph"><strong>Duplicate Charges:</strong> If you are accidentally charged multiple times for the same purchase</li>
                <li className="enhanced-paragraph"><strong>Service Outage:</strong> If our service is down but we still process your payment</li>
              </ul>
              <p className="enhanced-paragraph mt-4"><strong>Note:</strong> Exceptions require investigation and may take 5-10 business days to resolve.</p>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="highlighted-title">5. What is NOT Eligible for Refund</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">The following situations are NOT eligible for refunds:</p>
              <ul className="space-y-2">
                <li className="enhanced-paragraph">Change of mind after purchase</li>
                <li className="enhanced-paragraph">Incorrect game account information provided by user</li>
                <li className="enhanced-paragraph">Loss of game account access after currency delivery</li>
                <li className="enhanced-paragraph">Game account suspension or ban by game publishers</li>
                <li className="enhanced-paragraph">Fluctuations in Pi cryptocurrency value</li>
                <li className="enhanced-paragraph">User dissatisfaction with the purchased game</li>
                <li className="enhanced-paragraph">Technical issues with the game itself (not our service)</li>
                <li className="enhanced-paragraph">Forgetting about automatic purchases or subscriptions</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="highlighted-title">6. Delivery Guarantee</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">While we maintain a no-refund policy, we guarantee delivery of your purchased gaming currency:</p>
              <ul className="space-y-2">
                <li className="enhanced-paragraph"><strong>Delivery Time:</strong> Currency is typically delivered within 5-10 minutes</li>
                <li className="enhanced-paragraph"><strong>Delivery Confirmation:</strong> You will receive email confirmation when currency is delivered</li>
                <li className="enhanced-paragraph"><strong>Support Assistance:</strong> If delivery is delayed, contact our support team immediately</li>
                <li className="enhanced-paragraph"><strong>Tracking:</strong> All transactions are tracked and can be verified</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="highlighted-title">7. Dispute Resolution Process</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">If you believe you qualify for an exception to our no-refund policy:</p>
              <ol className="space-y-2">
                <li className="enhanced-paragraph"><strong>Contact Support:</strong> Email us at info@b4uesports.com within 24 hours of purchase</li>
                <li className="enhanced-paragraph"><strong>Provide Information:</strong> Include your transaction ID, Pi payment ID, and detailed explanation</li>
                <li className="enhanced-paragraph"><strong>Investigation:</strong> Our team will investigate your claim within 48 hours</li>
                <li className="enhanced-paragraph"><strong>Documentation:</strong> Provide any requested screenshots or additional information</li>
                <li className="enhanced-paragraph"><strong>Decision:</strong> We will provide a final decision within 5 business days</li>
                <li className="enhanced-paragraph"><strong>Resolution:</strong> If approved, resolution will be completed within 7 business days</li>
              </ol>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="highlighted-title">8. Chargeback Policy</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">Due to the nature of cryptocurrency transactions through Pi Network:</p>
              <ul className="space-y-2">
                <li className="enhanced-paragraph">Traditional credit card chargebacks are not applicable</li>
                <li className="enhanced-paragraph">Pi Network transactions are irreversible by design</li>
                <li className="enhanced-paragraph">Disputes must be resolved through our support system</li>
                <li className="enhanced-paragraph">We do not process payment reversals through Pi Network</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="highlighted-title">9. Customer Support</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">For assistance with purchases or delivery issues:</p>
              <div className="section-border bg-muted p-4 rounded-lg mt-4">
                <p className="font-semibold enhanced-paragraph"><strong>B4U Esports Support</strong></p>
                <p className="enhanced-paragraph">Email: <a href="mailto:info@b4uesports.com" className="text-primary">info@b4uesports.com</a></p>
                <p className="enhanced-paragraph">Phone: <a href="tel:+97517875099" className="text-primary">+975 17875099</a></p>
                <p className="enhanced-paragraph">Response Time: Within 24 hours</p>
                <p className="enhanced-paragraph">Available: 24/7 for urgent delivery issues</p>
              </div>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="highlighted-title">10. Policy Updates</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">We may update this Refund Policy to reflect changes in our services or legal requirements. Updates will be:</p>
              <ul className="space-y-2">
                <li className="enhanced-paragraph">Posted on our website with updated date</li>
                <li className="enhanced-paragraph">Communicated to users via email</li>
                <li className="enhanced-paragraph">Effective immediately upon posting</li>
                <li className="enhanced-paragraph">Applied to future transactions only</li>
              </ul>
              <p className="enhanced-paragraph mt-4">Your continued use of our services constitutes acceptance of any policy changes.</p>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="highlighted-title">11. Legal Framework</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">This Refund Policy is governed by:</p>
              <ul className="space-y-2">
                <li className="enhanced-paragraph">Laws of Bhutan regarding digital commerce</li>
                <li className="enhanced-paragraph">International best practices for digital goods</li>
                <li className="enhanced-paragraph">Pi Network's terms and conditions</li>
                <li className="enhanced-paragraph">Game publishers' policies and requirements</li>
              </ul>
              <p className="enhanced-paragraph mt-4">This policy is designed to be fair while protecting the integrity of digital currency transactions.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </AnimatedPage>
  );
}
