import { useState } from 'react';
import { useLocation } from 'wouter';
import Navigation from '@/components/navigation';
import Footer from '@/components/footer';
import AnimatedPage from '@/components/animated-page';
import ParticleBackground from '@/components/particle-background';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function FAQs() {
  const [, setLocation] = useLocation();
  const [isMinimized, setIsMinimized] = useState(false);
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const handleClose = () => {
    setLocation('#/');
  };

  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  const faqs = [
    {
      question: "What is B4U Esports?",
      answer: "B4U Esports is a Pi Network-integrated marketplace for game top-ups, creator-growth services, and digital subscriptions. Users can purchase PUBG UC, PUBG KR UC, MLBB Diamonds, Clash of Clans Gold Pass, Roblox Robux, NEW STATE NC, Free Fire Diamonds, TikTok services, YouTube services, Facebook and Instagram growth packages, plus Netflix and Canva Pro using Pi coins."
    },
    {
      question: "How do I purchase gaming currency?",
      answer: "To purchase gaming currency: 1) Sign in with your Pi Network account, 2) Select the game and package you want, 3) Verify your game account information, 4) Double-check all details and confirm the purchase, 5) Receive your currency within 5-10 minutes."
    },
    {
      question: "Is my personal information secure?",
      answer: "Yes, we implement robust security measures including SSL/TLS encryption, secure data storage, and Pi Network's cryptographic security. We comply with data protection regulations and never sell your personal information to third parties."
    },
    {
      question: "What payment methods do you accept?",
      answer: "We currently accept Pi cryptocurrency through Pi Network's secure payment system. All transactions are processed directly through the Pi blockchain, ensuring security and transparency."
    },
    {
      question: "How long does delivery take?",
      answer: "Gaming currency is typically delivered within 5-10 minutes after payment confirmation. During peak times or technical issues, delivery may take slightly longer. You'll receive an email confirmation when your purchase is delivered."
    },
    {
      question: "Can I get a refund?",
      answer: "All sales of delivered digital top-ups, creator-growth services, and subscriptions are final and non-refundable. This is because digital goods and fulfilled services cannot be returned once delivered. Please verify all information before completing your purchase."
    },
    {
      question: "What games do you support?",
      answer: "We currently support PUBG Mobile (UC), PUBG MOBILE KR (KR UC), Mobile Legends: Bang Bang (Diamonds), Clash of Clans (Gold Pass), Roblox (Robux), NEW STATE (NC), Free Fire (Diamonds), TikTok Coins/Followers/Views, YouTube Subscribers/Watch Time, Facebook Likes/Followers, Instagram Followers, Netflix, and Canva Pro. We're continuously expanding our digital service catalog based on user demand."
    },
    {
      question: "How do I contact customer support?",
      answer: "You can reach our support team via email at info@b4uesports.com or through WhatsApp using the link in our footer. We typically respond within 24 hours, and emergency support is available 24/7 for transaction issues."
    },
    {
      question: "Do you show ads?",
      answer: "Yes, we integrate with Pi Network's advertising platform to show occasional ads. These ads help support our platform and allow us to keep transaction fees low. Ads are displayed in a non-intrusive manner and are part of Pi Network's ecosystem."
    },
    {
      question: "How is the Pi price calculated?",
      answer: "We use real-time Pi/USD conversion rates from CoinGecko API, updating every 60 seconds. Prices are calculated based on the current market value of Pi cryptocurrency."
    },
    {
      question: "Is there a mobile app?",
      answer: "Our platform is fully responsive and works perfectly on mobile devices through your web browser. You can access all features through the Pi Browser on your mobile device."
    },
    {
      question: "How do I purchase PUBG MOBILE KR UC?",
      answer: "To purchase PUBG MOBILE KR UC: 1) Sign in with your Pi Network account, 2) Select PUBG MOBILE KR from the game selection, 3) Choose your desired UC package, 4) Enter your email and WhatsApp number for account verification, 5) Confirm your purchase and complete the Pi payment, 6) Your UC will be delivered to your account within 5-10 minutes."
    },
  ];

  return (
    <AnimatedPage className="min-h-screen bg-background text-foreground">
      <ParticleBackground />
      <Navigation  />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className={`flex justify-between items-center mb-8 ${isMinimized ? 'mb-4' : ''}`}>
          <div className={`text-center ${isMinimized ? 'hidden' : ''}`}>
            <h1 className="text-4xl font-bold mb-4 highlighted-title">Frequently Asked Questions</h1>
            <p className="text-muted-foreground">Find answers to common questions about our platform</p>
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

        <div className={`${isMinimized ? 'hidden' : 'space-y-6'}`}>
          {faqs.map((faq, index) => (
            <Card 
              key={index} 
              className="page-card cursor-pointer transition-all duration-300 hover:shadow-lg"
              onClick={() => toggleFAQ(index)}
            >
              <CardHeader 
                className="flex flex-row items-center justify-between py-4"
              >
                <CardTitle className="text-lg font-medium highlighted-title">
                  {faq.question}
                </CardTitle>
                <div className="text-primary">
                  {openFAQ === index ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </CardHeader>
              {openFAQ === index && (
                <CardContent className="pt-0">
                  <div className="enhanced-paragraph pb-4 border-t border-border pt-4">
                    {faq.answer}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="highlighted-title">Still Have Questions?</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">
                If you can't find the answer to your question, please don't hesitate to contact our support team.
              </p>
              <div className="section-border bg-muted p-4 rounded-lg mt-4">
                <p className="font-semibold enhanced-paragraph"><strong>Contact Support</strong></p>
                <p className="enhanced-paragraph">Email: <a href="mailto:info@b4uesports.com" className="text-primary">info@b4uesports.com</a></p>
                <p className="enhanced-paragraph">Phone: <a href="tel:+97517875099" className="text-primary">+975 17875099</a></p>
                <p className="enhanced-paragraph">Response Time: Within 24 hours</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </AnimatedPage>
  );
}
