import { useState } from 'react';
import { useLocation } from 'wouter';
import Navigation from '@/components/navigation';
import Footer from '@/components/footer';
import AnimatedPage from '@/components/animated-page';
import ParticleBackground from '@/components/particle-background';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PrivacyPolicy() {
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
            <h1 className="text-4xl font-bold mb-4 highlighted-title">Privacy Policy</h1>
            <p className="text-muted-foreground">Last updated: April 2025</p>
          </div>
          
          {/* Minimize/Close Controls */}
          <div className="flex space-x-2">
            <button 
              onClick={handleMinimize}
              className="p-2 rounded-full hover:bg-muted transition-colors"
              aria-label={isMinimized ? "Maximize" : "Minimize"}
            >
              {isMinimized ? (
                <i className="fas fa-expand"></i>
              ) : (
                <i className="fas fa-compress"></i>
              )}
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

        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center mb-6">Privacy Policy for B4U Esports</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-invert max-w-none">
            <p className="text-muted-foreground mb-6">
              At B4U Esports, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, and safeguard your data when you use our services.
            </p>

            <h2 className="text-xl font-bold mt-8 mb-4">1. Information We Collect</h2>
            <p className="text-muted-foreground mb-4">
              We collect information that you provide directly to us, including:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground mb-6 space-y-2">
              <li>Account information (username, email address)</li>
              <li>Transaction details (game account information, purchase history)</li>
              <li>Communication data (messages, support tickets)</li>
              <li>Device and usage information (IP address, browser type, access times)</li>
            </ul>

            <h2 className="text-xl font-bold mt-8 mb-4">2. How We Use Your Information</h2>
            <p className="text-muted-foreground mb-4">
              We use the collected information to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground mb-6 space-y-2">
              <li>Process your transactions and deliver gaming currency</li>
              <li>Provide customer support and respond to inquiries</li>
              <li>Improve our services and user experience</li>
              <li>Prevent fraud and ensure platform security</li>
              <li>Comply with legal obligations</li>
            </ul>

            <h2 className="text-xl font-bold mt-8 mb-4">3. Data Security</h2>
            <p className="text-muted-foreground mb-6">
              We implement industry-standard security measures to protect your data, including encryption, secure server infrastructure, and regular security audits. All transactions are processed through Pi Network's secure payment system.
            </p>

            <h2 className="text-xl font-bold mt-8 mb-4">4. Data Sharing</h2>
            <p className="text-muted-foreground mb-6">
              We do not sell or rent your personal information to third parties. We may share data with:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground mb-6 space-y-2">
              <li>Game publishers to fulfill your purchases</li>
              <li>Service providers who assist in operating our platform</li>
              <li>Legal authorities when required by law</li>
            </ul>

            <h2 className="text-xl font-bold mt-8 mb-4">5. Your Rights</h2>
            <p className="text-muted-foreground mb-6">
              You have the right to access, correct, or delete your personal information. You can manage your data through your account settings or by contacting our support team.
            </p>

            <h2 className="text-xl font-bold mt-8 mb-4">6. Contact Us</h2>
            <p className="text-muted-foreground mb-6">
              If you have questions about this Privacy Policy or concerns about your privacy, please contact us at:
            </p>
            <div className="bg-muted/50 p-4 rounded-lg mb-6">
              <p className="text-muted-foreground">
                <i className="fas fa-envelope mr-2"></i>
                Email: <a href="mailto:info@b4uesports.com" className="text-primary hover:underline">info@b4uesports.com</a>
              </p>
            </div>

            <div className="text-center mt-8 pt-6 border-t border-border">
              <p className="text-muted-foreground">
                This Privacy Policy was last updated on April 2025. We may update this policy from time to time to reflect changes in our practices or legal requirements.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </AnimatedPage>
  );
}
