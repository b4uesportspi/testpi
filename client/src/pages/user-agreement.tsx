import Navigation from '@/components/navigation';
import Footer from '@/components/footer';
import AnimatedPage from '@/components/animated-page';
import ParticleBackground from '@/components/particle-background';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocation } from 'wouter';
import { useState } from 'react';

export default function UserAgreement() {
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
            <h1 className="text-4xl font-bold mb-4 highlighted-title">User Agreement</h1>
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
              <CardTitle className="highlighted-title">1. Agreement Overview</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">This User Agreement ("Agreement") is a legally binding contract between you ("User") and B4U Esports ("Company," "we," "us," or "our"). By creating an account or using our services, you acknowledge that you have read, understood, and agree to be bound by all terms and conditions contained in this Agreement.</p>
              <p className="enhanced-paragraph">This Agreement governs your access to and use of our Pi Network-integrated gaming marketplace platform, including all features, content, and services offered through our website and applications.</p>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="highlighted-title">2. User Eligibility and Account Creation</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">To use our services, you must:</p>
              <ul className="space-y-2">
                <li className="enhanced-paragraph"><strong>Age Requirements:</strong> Be at least 13 years old, or the minimum age in your jurisdiction</li>
                <li className="enhanced-paragraph"><strong>Pi Network Account:</strong> Have a valid, active Pi Network account in good standing</li>
                <li className="enhanced-paragraph"><strong>Legal Capacity:</strong> Have the legal capacity to enter into binding agreements</li>
                <li className="enhanced-paragraph"><strong>Accurate Information:</strong> Provide truthful, accurate, and complete information</li>
                <li className="enhanced-paragraph"><strong>Compliance:</strong> Comply with all applicable laws and regulations</li>
                <li className="enhanced-paragraph"><strong>Single Account:</strong> Maintain only one account per person</li>
              </ul>
              <p className="enhanced-paragraph mt-4">We reserve the right to verify your identity and eligibility at any time.</p>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="highlighted-title">3. User Obligations and Responsibilities</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">As a user of our platform, you agree to:</p>
              <h4 className="highlighted-title">Account Security:</h4>
              <ul className="space-y-2">
                <li className="enhanced-paragraph">Maintain the confidentiality of your login credentials</li>
                <li className="enhanced-paragraph">Use strong, unique passwords for your accounts</li>
                <li className="enhanced-paragraph">Enable two-factor authentication when available</li>
                <li className="enhanced-paragraph">Immediately notify us of any unauthorized access</li>
                <li className="enhanced-paragraph">Accept responsibility for all activities under your account</li>
              </ul>
              <h4 className="highlighted-title">Lawful Use:</h4>
              <ul className="space-y-2">
                <li className="enhanced-paragraph">Use our services only for legitimate gaming purposes</li>
                <li className="enhanced-paragraph">Comply with all applicable laws and regulations</li>
                <li className="enhanced-paragraph">Respect the intellectual property rights of others</li>
                <li className="enhanced-paragraph">Not engage in any fraudulent or deceptive practices</li>
                <li className="enhanced-paragraph">Not use our services for money laundering or illegal activities</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="highlighted-title">4. Game Account Verification and Accuracy</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">You are solely responsible for providing accurate game account information:</p>
              <ul className="space-y-2">
                <li className="enhanced-paragraph"><strong>PUBG Mobile:</strong> Correct IGN (In-Game Name) and UID (User ID)</li>
                <li className="enhanced-paragraph"><strong>Mobile Legends:</strong> Accurate User ID and Zone ID</li>
                <li className="enhanced-paragraph"><strong>Clash of Clans:</strong> Valid email address connected to Supercell account</li>
                <li className="enhanced-paragraph"><strong>Verification:</strong> Double-check all information before confirming purchases</li>
                <li className="enhanced-paragraph"><strong>Updates:</strong> Keep your game account information current in your profile</li>
                <li className="enhanced-paragraph"><strong>Consequences:</strong> Incorrect information may result in failed delivery or loss of purchase</li>
                <li className="enhanced-paragraph"><strong>No Refunds:</strong> We are not responsible for delivery failures due to incorrect user-provided information</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="highlighted-title">5. Payment Terms and Pi Network Integration</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">Our payment system is integrated with Pi Network:</p>
              <h4 className="highlighted-title">Payment Processing:</h4>
              <ul className="space-y-2">
                <li className="enhanced-paragraph">All payments are processed through Pi Network's secure infrastructure</li>
                <li className="enhanced-paragraph">Transactions are recorded on the Pi blockchain</li>
                <li className="enhanced-paragraph">Payment confirmation is required before service delivery</li>
                <li className="enhanced-paragraph">Real-time pricing reflects current Pi/USD exchange rates</li>
              </ul>
              <h4 className="highlighted-title">User Responsibilities:</h4>
              <ul className="space-y-2">
                <li className="enhanced-paragraph">Ensure sufficient Pi balance before making purchases</li>
                <li className="enhanced-paragraph">Verify transaction details before confirming payment</li>
                <li className="enhanced-paragraph">Understand that blockchain transactions are irreversible</li>
                <li className="enhanced-paragraph">Accept current market pricing at the time of purchase</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="highlighted-title">6. Service Availability and Performance</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">We strive to provide reliable service, but you acknowledge:</p>
              <ul className="space-y-2">
                <li className="enhanced-paragraph"><strong>Availability:</strong> Services may be temporarily unavailable due to maintenance or technical issues</li>
                <li className="enhanced-paragraph"><strong>Performance:</strong> Service speed and reliability may vary based on network conditions</li>
                <li className="enhanced-paragraph"><strong>Third-Party Dependencies:</strong> Our services depend on Pi Network and game publisher systems</li>
                <li className="enhanced-paragraph"><strong>Updates:</strong> We may update or modify our services without prior notice</li>
                <li className="enhanced-paragraph"><strong>Compatibility:</strong> Services may not be compatible with all devices or browsers</li>
                <li className="enhanced-paragraph"><strong>Geographic Limitations:</strong> Some features may not be available in all locations</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="highlighted-title">7. Prohibited Activities and Conduct</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">The following activities are strictly prohibited:</p>
              <h4 className="highlighted-title">Fraudulent Activities:</h4>
              <ul className="space-y-2">
                <li className="enhanced-paragraph">Using stolen or unauthorized payment methods</li>
                <li className="enhanced-paragraph">Creating false identities or impersonating others</li>
                <li className="enhanced-paragraph">Attempting to reverse or chargeback completed transactions</li>
                <li className="enhanced-paragraph">Manipulating pricing or payment systems</li>
              </ul>
              <h4 className="highlighted-title">Technical Violations:</h4>
              <ul className="space-y-2">
                <li className="enhanced-paragraph">Attempting to hack, crack, or compromise our systems</li>
                <li className="enhanced-paragraph">Using automated tools, bots, or scripts</li>
                <li className="enhanced-paragraph">Reverse engineering our software or services</li>
                <li className="enhanced-paragraph">Interfering with other users' access to services</li>
              </ul>
              <h4 className="highlighted-title">Commercial Violations:</h4>
              <ul className="space-y-2">
                <li className="enhanced-paragraph">Reselling gaming currency purchased through our platform</li>
                <li className="enhanced-paragraph">Using our services for commercial purposes without authorization</li>
                <li className="enhanced-paragraph">Creating multiple accounts to abuse promotions or limits</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="highlighted-title">8. Intellectual Property Rights</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">You acknowledge and agree that:</p>
              <ul className="space-y-2">
                <li className="enhanced-paragraph"><strong>Our Content:</strong> All B4U Esports content, including design, text, graphics, and software, is our property</li>
                <li className="enhanced-paragraph"><strong>Game and Service Content:</strong> Game assets, social platforms, and subscription brands such as PUBG Mobile, Mobile Legends, Roblox, TikTok, YouTube, Facebook, Instagram, Netflix, and Canva belong to their respective owners</li>
                <li className="enhanced-paragraph"><strong>Pi Network:</strong> Pi Network logos and content are used under license</li>
                <li className="enhanced-paragraph"><strong>Limited License:</strong> We grant you a limited, non-exclusive license to use our services</li>
                <li className="enhanced-paragraph"><strong>Restrictions:</strong> You may not copy, modify, distribute, or create derivative works</li>
                <li className="enhanced-paragraph"><strong>Feedback:</strong> Any feedback you provide may be used by us without compensation</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="highlighted-title">9. Privacy and Data Usage</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">Your privacy is important to us. By using our services, you consent to:</p>
              <ul className="space-y-2">
                <li className="enhanced-paragraph">Collection and processing of personal data as outlined in our Privacy Policy</li>
                <li className="enhanced-paragraph">Sharing necessary information with game publishers for service delivery</li>
                <li className="enhanced-paragraph">Use of cookies and tracking technologies to improve our services</li>
                <li className="enhanced-paragraph">Communication from us regarding your account and transactions</li>
                <li className="enhanced-paragraph">Data transfer to third-party service providers for operational purposes</li>
                <li className="enhanced-paragraph">Retention of transaction records for legal and compliance purposes</li>
              </ul>
              <p className="enhanced-paragraph mt-4">Please review our Privacy Policy and Data Protection Policy for detailed information.</p>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="highlighted-title">10. Disclaimers and Limitation of Liability</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">You understand and agree that:</p>
              <h4 className="highlighted-title">Service Disclaimers:</h4>
              <ul className="space-y-2">
                <li className="enhanced-paragraph">Services are provided "as is" without warranties of any kind</li>
                <li className="enhanced-paragraph">We do not guarantee uninterrupted or error-free service</li>
                <li className="enhanced-paragraph">We are not responsible for third-party service failures</li>
                <li className="enhanced-paragraph">Game publisher policies and systems are beyond our control</li>
              </ul>
              <h4 className="highlighted-title">Limitation of Liability:</h4>
              <ul className="space-y-2">
                <li className="enhanced-paragraph">Our liability is limited to the amount paid for the specific transaction</li>
                <li className="enhanced-paragraph">We are not liable for indirect, incidental, or consequential damages</li>
                <li className="enhanced-paragraph">You release us from claims arising from your use of our services</li>
                <li className="enhanced-paragraph">These limitations apply to the fullest extent permitted by law</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="highlighted-title">11. Account Termination and Suspension</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">We may terminate or suspend your account for:</p>
              <ul className="space-y-2">
                <li className="enhanced-paragraph">Violation of this Agreement or our policies</li>
                <li className="enhanced-paragraph">Fraudulent or suspicious activity</li>
                <li className="enhanced-paragraph">Violation of applicable laws or regulations</li>
                <li className="enhanced-paragraph">Abuse of our customer support systems</li>
                <li className="enhanced-paragraph">Multiple disputes or chargebacks</li>
                <li className="enhanced-paragraph">Extended inactivity (with prior notice)</li>
              </ul>
              <p className="enhanced-paragraph mt-4">Upon termination, your access to services will cease, but completed transactions remain valid. You may also terminate your account at any time by contacting our support team.</p>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="highlighted-title">12. Dispute Resolution and Governing Law</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">This Agreement is governed by the laws of Bhutan. For dispute resolution:</p>
              <h4 className="highlighted-title">Resolution Process:</h4>
              <ol className="space-y-2">
                <li className="enhanced-paragraph"><strong>Direct Communication:</strong> Contact our support team first</li>
                <li className="enhanced-paragraph"><strong>Good Faith Negotiation:</strong> Attempt to resolve disputes amicably</li>
                <li className="enhanced-paragraph"><strong>Mediation:</strong> Use neutral mediation if direct negotiation fails</li>
                <li className="enhanced-paragraph"><strong>Arbitration:</strong> Binding arbitration in Thimphu, Bhutan</li>
                <li className="enhanced-paragraph"><strong>Legal Action:</strong> Court proceedings only after exhausting other options</li>
              </ol>
              <h4 className="highlighted-title">Limitations:</h4>
              <ul className="space-y-2">
                <li className="enhanced-paragraph">Claims must be filed within one year of the dispute arising</li>
                <li className="enhanced-paragraph">Class action lawsuits are not permitted</li>
                <li className="enhanced-paragraph">Disputes must be resolved individually</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="highlighted-title">13. Agreement Modifications</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">We may modify this Agreement to reflect:</p>
              <ul className="space-y-2">
                <li className="enhanced-paragraph">Changes in our services or business practices</li>
                <li className="enhanced-paragraph">Legal or regulatory requirements</li>
                <li className="enhanced-paragraph">Industry standards and best practices</li>
                <li className="enhanced-paragraph">User feedback and platform improvements</li>
              </ul>
              <p className="enhanced-paragraph mt-4">We will notify you of material changes through:</p>
              <ul className="space-y-2">
                <li className="enhanced-paragraph">Email notifications to your registered address</li>
                <li className="enhanced-paragraph">Prominent notices on our platform</li>
                <li className="enhanced-paragraph">Updated agreement with revision date</li>
              </ul>
              <p className="enhanced-paragraph mt-4">Continued use of our services after changes constitutes acceptance of the modified Agreement.</p>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="highlighted-title">14. Contact Information and Support</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">For questions about this Agreement or our services:</p>
              <div className="section-border bg-muted p-4 rounded-lg mt-4">
                <p className="font-semibold enhanced-paragraph"><strong>B4U Esports Customer Support</strong></p>
                <p className="enhanced-paragraph">Email: <a href="mailto:info@b4uesports.com" className="text-primary">info@b4uesports.com</a></p>
                <p className="enhanced-paragraph">Phone: <a href="tel:+97517875099" className="text-primary">+975 17875099</a></p>
                <p className="enhanced-paragraph">Response Time: Within 24 hours</p>
                <p className="enhanced-paragraph">Emergency Support: Available 24/7 for transaction issues</p>
              </div>
              <p className="enhanced-paragraph mt-4">By using our services, you acknowledge that you have read, understood, and agree to be bound by this User Agreement in its entirety.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </AnimatedPage>
  );
}
