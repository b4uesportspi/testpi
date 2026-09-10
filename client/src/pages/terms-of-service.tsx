import Navigation from '@/components/navigation';
import Footer from '@/components/footer';
import AnimatedPage from '@/components/animated-page';
import ParticleBackground from '@/components/particle-background';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocation } from 'wouter';
import { useState } from 'react';

export default function TermsOfService() {
  const [, setLocation] = useLocation();
  const [isMinimized, setIsMinimized] = useState(false);

  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const handleClose = () => {
    setLocation('#/');
  };

  return (
    <AnimatedPage className="min-h-screen bg-background text-foreground">
      <ParticleBackground />
      <Navigation  />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className={`flex justify-between items-center mb-8 ${isMinimized ? 'mb-4' : ''}`}>
          <div className={`text-center ${isMinimized ? 'hidden' : ''}`}>
            <h1 className="text-4xl font-bold mb-4 highlighted-title">Terms of Service</h1>
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
          <Card className="page-card">
            <CardHeader>
              <CardTitle className="highlighted-title">1. Acceptance of Terms</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">By accessing and using B4U Esports services, you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you may not access our services. Your continued use of our platform constitutes acceptance of any updates or modifications to these terms.</p>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="highlighted-title">2. Service Description</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">B4U Esports provides a digital marketplace for purchasing game top-ups, creator-growth services, and digital subscriptions using Pi Network's cryptocurrency. Our services include:</p>
              <ul className="space-y-2">
                <li className="enhanced-paragraph">Purchase of PUBG Mobile UC (Unknown Cash)</li>
                <li className="enhanced-paragraph">Purchase of PUBG MOBILE KR UC (KR UC)</li>
                <li className="enhanced-paragraph">Purchase of Mobile Legends: Bang Bang Diamonds</li>
                <li className="enhanced-paragraph">Purchase of Clash of Clans Gold Pass</li>
                <li className="enhanced-paragraph">Purchase of Roblox Robux, NEW STATE NC, and Free Fire Diamonds</li>
                <li className="enhanced-paragraph">Purchase of TikTok, YouTube, Facebook, and Instagram service packages</li>
                <li className="enhanced-paragraph">Purchase of Netflix, Canva, and other digital subscription services</li>
                <li className="enhanced-paragraph">Pi Network payment integration</li>
                <li className="enhanced-paragraph">Real-time pricing and currency conversion</li>
                <li className="enhanced-paragraph">Transaction history and account management</li>
                <li className="enhanced-paragraph">Customer support services</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="highlighted-title">3. Account Registration</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">To use our services, you must:</p>
              <ul className="space-y-2">
                <li className="enhanced-paragraph">Have a valid Pi Network account</li>
                <li className="enhanced-paragraph">Be at least 18 years old</li>
                <li className="enhanced-paragraph">Provide accurate and complete information</li>
                <li className="enhanced-paragraph">Maintain the security of your account credentials</li>
                <li className="enhanced-paragraph">Accept responsibility for all activities under your account</li>
                <li className="enhanced-paragraph">Notify us immediately of any unauthorized access</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="highlighted-title">4. Pi Network Integration</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">Our platform integrates with Pi Network for authentication and payments:</p>
              <ul className="space-y-2">
                <li className="enhanced-paragraph"><strong>Pi Network Payments:</strong> All transactions are processed natively through Pi Network's official infrastructure. In Mainnet mode, verified Pi cryptocurrency is used to fulfill your digital orders.</li>
                <li className="enhanced-paragraph"><strong>Authentication:</strong> We verify your identity through Pi Network's secure systems</li>
                <li className="enhanced-paragraph"><strong>Payment Processing:</strong> All transactions are processed through Pi Network's infrastructure</li>
                <li className="enhanced-paragraph"><strong>Security:</strong> We implement Pi Network's recommended security practices</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="highlighted-title">5. Purchasing Terms</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">When making purchases through our platform:</p>
              <ul className="space-y-2">
                <li className="enhanced-paragraph"><strong>Pricing:</strong> All prices are displayed in Pi cryptocurrency with USD equivalents</li>
                <li className="enhanced-paragraph"><strong>Payment:</strong> Payments are processed immediately upon confirmation</li>
                <li className="enhanced-paragraph"><strong>Delivery:</strong> Gaming currency is delivered to your specified game account within 5-10 minutes</li>
                <li className="enhanced-paragraph"><strong>Verification:</strong> You must provide accurate game account information</li>
                <li className="enhanced-paragraph"><strong>Confirmation:</strong> You will receive email confirmation of all purchases</li>
                <li className="enhanced-paragraph"><strong>Support:</strong> Contact us immediately if delivery fails or is delayed</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="highlighted-title">6. User Responsibilities</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">As a user of our services, you agree to:</p>
              <ul className="space-y-2">
                <li className="enhanced-paragraph">Provide accurate game account information</li>
                <li className="enhanced-paragraph">Use the service only for legitimate gaming purposes</li>
                <li className="enhanced-paragraph">Not attempt to circumvent our security measures</li>
                <li className="enhanced-paragraph">Not use the service for any illegal activities</li>
                <li className="enhanced-paragraph">Respect intellectual property rights</li>
                <li className="enhanced-paragraph">Not interfere with other users' access to the service</li>
                <li className="enhanced-paragraph">Comply with applicable laws and regulations</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="highlighted-title">7. Prohibited Activities</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">The following activities are strictly prohibited:</p>
              <ul className="space-y-2">
                <li className="enhanced-paragraph">Fraudulent transactions or payment reversals</li>
                <li className="enhanced-paragraph">Using stolen or unauthorized payment methods</li>
                <li className="enhanced-paragraph">Creating multiple accounts to abuse promotions</li>
                <li className="enhanced-paragraph">Attempting to hack or compromise our systems</li>
                <li className="enhanced-paragraph">Reselling purchased gaming currency</li>
                <li className="enhanced-paragraph">Using automated tools or bots</li>
                <li className="enhanced-paragraph">Violating game publishers' terms of service</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="highlighted-title">8. Intellectual Property</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">All content on our platform is protected by intellectual property laws:</p>
              <ul className="space-y-2">
                <li className="enhanced-paragraph"><strong>B4U Esports:</strong> Our brand, logo, and platform design are our property</li>
                <li className="enhanced-paragraph"><strong>Game and Service Content:</strong> Game assets, social platforms, and subscription brands such as PUBG Mobile, Mobile Legends, Roblox, TikTok, YouTube, Facebook, Instagram, Netflix, and Canva belong to their respective owners</li>
                <li className="enhanced-paragraph"><strong>Pi Network:</strong> Pi Network logos and branding are used with permission</li>
                <li className="enhanced-paragraph"><strong>User Content:</strong> You retain rights to your personal information and account data</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="highlighted-title">9. Disclaimers and Limitations</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">Our services are provided "as is" without warranties:</p>
              <ul className="space-y-2">
                <li className="enhanced-paragraph"><strong>Service Availability:</strong> We do not guarantee uninterrupted service</li>
                <li className="enhanced-paragraph"><strong>Game Integration:</strong> We are not responsible for changes to game publishers' systems</li>
                <li className="enhanced-paragraph"><strong>Pi Network:</strong> We are not responsible for Pi Network technical issues</li>
                <li className="enhanced-paragraph"><strong>Market Fluctuations:</strong> Pi currency values may fluctuate</li>
                <li className="enhanced-paragraph"><strong>Third-Party Services:</strong> We are not liable for third-party service failures</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="highlighted-title">10. Anti-Money Laundering (AML), Fraud and New Service Coverage</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph"><strong>AML and Fraud Prevention:</strong> B4U Esports enforces a strict AML and CTF program across all activity on the platform. We require all users to provide accurate identity information, and we monitor transaction patterns for suspicious or inconsistent behavior.</p>
              <ul className="space-y-2">
                <li className="enhanced-paragraph">Zero tolerance for money laundering, terrorist financing, fraudulent payment routes, or any manipulation of financial flows.</li>
                <li className="enhanced-paragraph">We may suspend or terminate accounts and report suspicious activity to law enforcement and relevant authorities.</li>
                <li className="enhanced-paragraph">Users must not transact for third parties without explicit authorization and must not use the service to obscure the source/destination of funds.</li>
                <li className="enhanced-paragraph"><strong>Scammer warning:</strong> B4U Esports is not responsible for unsolicited messages, false guarantees, fake customer support agents, or offers received outside our official channels. Always verify the domain, platform links, and contact details against official b4uesports.com references.</li>
                <li className="enhanced-paragraph"><strong>Service expansion notice:</strong> These Terms apply to all existing and new services, including, but not limited to, in-game currency packages (PUBG Mobile, PUBG KR, MLBB, Clash of Clans, Roblox, NEW STATE, Free Fire), social media engagement packages (TikTok, Instagram, YouTube, Facebook), streaming and subscription services (Netflix, Canva), and other emerging digital services made available through our marketplace.</li>
              </ul>
              <p className="enhanced-paragraph">By using the platform, you acknowledge that B4U Esports is not liable for losses due to scams, unauthorized third-party offerings, or misuse of account credentials, and that you are responsible for securing your login and payment information.</p>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="highlighted-title">11. Limitation of Liability</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">To the maximum extent permitted by law, B4U Esports shall not be liable for:</p>
              <ul className="space-y-2">
                <li className="enhanced-paragraph">Indirect, incidental, or consequential damages</li>
                <li className="enhanced-paragraph">Loss of profits, data, or business opportunities</li>
                <li className="enhanced-paragraph">Damages exceeding the amount paid for services</li>
                <li className="enhanced-paragraph">Issues arising from user error or negligence</li>
                <li className="enhanced-paragraph">Third-party actions or service interruptions</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="highlighted-title">11. Termination</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">We may terminate or suspend your account for:</p>
              <ul className="space-y-2">
                <li className="enhanced-paragraph">Violation of these Terms of Service</li>
                <li className="enhanced-paragraph">Fraudulent or suspicious activity</li>
                <li className="enhanced-paragraph">Repeated customer service issues</li>
                <li className="enhanced-paragraph">Legal requirements or safety concerns</li>
              </ul>
              <p className="enhanced-paragraph mt-4">Upon termination, your access to services will cease, but completed transactions remain valid.</p>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="highlighted-title">12. Governing Law</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">These Terms of Service are governed by the laws of Bhutan. Any disputes will be resolved through:</p>
              <ul className="space-y-2">
                <li className="enhanced-paragraph">Good faith negotiation</li>
                <li className="enhanced-paragraph">Mediation if necessary</li>
                <li className="enhanced-paragraph">Arbitration in Thimphu, Bhutan</li>
                <li className="enhanced-paragraph">Courts of competent jurisdiction in Bhutan</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="highlighted-title">13. Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">For questions about these Terms of Service, contact us:</p>
              <div className="section-border bg-muted p-4 rounded-lg mt-4">
                <p className="font-semibold enhanced-paragraph"><strong>B4U Esports</strong></p>
                <p className="enhanced-paragraph">Email: <a href="mailto:info@b4uesports.com" className="text-primary">info@b4uesports.com</a></p>
                <p className="enhanced-paragraph">Phone: <a href="tel:+97517875099" className="text-primary">+975 17875099</a></p>
                <p className="enhanced-paragraph">We will respond to all inquiries within 48 hours.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </AnimatedPage>
  );
}
