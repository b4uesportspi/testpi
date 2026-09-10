import Navigation from '@/components/navigation';
import Footer from '@/components/footer';
import AnimatedPage from '@/components/animated-page';
import ParticleBackground from '@/components/particle-background';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BRAND_LOGOS, CONTACT_INFO, SOCIAL_LINKS, PACKAGE_IMAGES, GAME_LOGOS } from '@/lib/constants';
import { useLocation } from 'wouter';
import { useState } from 'react';

export default function AboutUs() {
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
            <div className="flex items-center justify-center mb-6">
              <img 
                src={BRAND_LOGOS.B4U} 
                alt="B4U Esports Logo" 
                className="h-20 w-auto mr-4"
                data-testid="about-us-logo"
              />
              <div>
                <h1 className="text-4xl font-bold mb-2 highlighted-title">About B4U Esports</h1>
                <p className="text-muted-foreground">Revolutionizing Gaming Commerce with Pi Network</p>
              </div>
            </div>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <Card className="border-border bg-card/50 backdrop-blur-sm lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Our Mission</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                B4U Esports is dedicated to bridging gaming, creator growth, and digital lifestyle services with cryptocurrency innovation.
                We believe the future of digital commerce lies in seamless, secure, and decentralized payment solutions powered by Pi Network.
              </p>
              <p className="text-muted-foreground mb-4">
                Our platform empowers users worldwide to purchase in-game currencies, creator-growth services, and premium digital subscriptions using Pi coins,
                making online services more accessible and financially inclusive.
              </p>
              <p className="text-muted-foreground">
                With a focus on user experience, security, and innovation, we're building the next generation
                of gaming and digital-service commerce infrastructure powered by blockchain technology.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Contact Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center">
                  <i className="fas fa-envelope mr-3 text-primary"></i>
                  <a href={`mailto:${CONTACT_INFO.EMAIL}`} className="text-muted-foreground hover:text-primary transition-colors">
                    {CONTACT_INFO.EMAIL}
                  </a>
                </div>
                <div className="flex items-center">
                  <i className="fas fa-phone mr-3 text-primary"></i>
                  <span className="text-muted-foreground">{CONTACT_INFO.PHONE}</span>
                </div>
                <div className="flex items-center">
                  <i className="fab fa-whatsapp mr-3 text-primary"></i>
                  <a href={CONTACT_INFO.WHATSAPP} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                    WhatsApp Support
                  </a>
                </div>
              </div>
              
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">Follow Us</h3>
                <div className="flex space-x-4">
                  <a href={SOCIAL_LINKS.FACEBOOK} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 transition-colors">
                    <i className="fab fa-facebook fa-2x"></i>
                  </a>
                  <a href={SOCIAL_LINKS.YOUTUBE} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:text-red-700 transition-colors">
                    <i className="fab fa-youtube fa-2x"></i>
                  </a>
                  <a href={SOCIAL_LINKS.TIKTOK} target="_blank" rel="noopener noreferrer" className="text-black hover:text-gray-800 transition-colors">
                    <i className="fab fa-tiktok fa-2x"></i>
                  </a>
                  <a href={SOCIAL_LINKS.INSTAGRAM} target="_blank" rel="noopener noreferrer" className="text-pink-500 hover:text-pink-600 transition-colors">
                    <i className="fab fa-instagram fa-2x"></i>
                  </a>
                  <a href={SOCIAL_LINKS.LINKEDIN} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:text-blue-800 transition-colors">
                    <i className="fab fa-linkedin fa-2x"></i>
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border bg-card/50 backdrop-blur-sm mb-12">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Games & Digital Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              <div className="text-center">
                <img 
                  src={GAME_LOGOS.PUBG} 
                  alt="PUBG Mobile" 
                  className="w-24 h-24 mx-auto mb-4 rounded-lg object-cover"
                />
                <h3 className="text-xl font-semibold mb-2">PUBG Mobile</h3>
                <p className="text-muted-foreground">Purchase UC instantly with Pi coins</p>
              </div>
              <div className="text-center">
                <img 
                  src={GAME_LOGOS.PUBGKR} 
                  alt="PUBG KR" 
                  className="w-24 h-24 mx-auto mb-4 rounded-lg object-cover"
                />
                <h3 className="text-xl font-semibold mb-2">PUBG KR</h3>
                <p className="text-muted-foreground">Top up KR UC packages with secure Pi payments</p>
              </div>
              <div className="text-center">
                <img 
                  src={GAME_LOGOS.MLBB} 
                  alt="Mobile Legends" 
                  className="w-24 h-24 mx-auto mb-4 rounded-lg object-cover"
                />
                <h3 className="text-xl font-semibold mb-2">Mobile Legends</h3>
                <p className="text-muted-foreground">Buy Diamonds using Pi cryptocurrency</p>
              </div>
              <div className="text-center">
                <img 
                  src={GAME_LOGOS.COC} 
                  alt="Clash of Clans" 
                  className="w-24 h-24 mx-auto mb-4 rounded-lg object-cover"
                />
                <h3 className="text-xl font-semibold mb-2">Clash of Clans</h3>
                <p className="text-muted-foreground">Get Gold Pass with Pi payments</p>
              </div>
              <div className="text-center">
                <img 
                  src={GAME_LOGOS.ROBUX} 
                  alt="Roblox Robux" 
                  className="w-24 h-24 mx-auto mb-4 rounded-lg object-cover"
                />
                <h3 className="text-xl font-semibold mb-2">Roblox Robux</h3>
                <p className="text-muted-foreground">Buy Robux packages quickly and securely</p>
              </div>
              <div className="text-center">
                <img 
                  src={GAME_LOGOS.NEWSTATE} 
                  alt="NEW STATE" 
                  className="w-24 h-24 mx-auto mb-4 rounded-lg object-cover"
                />
                <h3 className="text-xl font-semibold mb-2">NEW STATE</h3>
                <p className="text-muted-foreground">Purchase NC top-ups for NEW STATE</p>
              </div>
              <div className="text-center">
                <img 
                  src={GAME_LOGOS.FREEFIRE} 
                  alt="Free Fire" 
                  className="w-24 h-24 mx-auto mb-4 rounded-lg object-cover"
                />
                <h3 className="text-xl font-semibold mb-2">Free Fire</h3>
                <p className="text-muted-foreground">Get Free Fire diamonds with Pi</p>
              </div>
              <div className="text-center">
                <img 
                  src={GAME_LOGOS.TIKTOK_FOLLOWERS} 
                  alt="TikTok Services" 
                  className="w-24 h-24 mx-auto mb-4 rounded-lg object-cover"
                />
                <h3 className="text-xl font-semibold mb-2">TikTok Services</h3>
                <p className="text-muted-foreground">Coins, followers, and monetization views</p>
              </div>
              <div className="text-center">
                <img 
                  src={GAME_LOGOS.YOUTUBE_SUBS} 
                  alt="YouTube Services" 
                  className="w-24 h-24 mx-auto mb-4 rounded-lg object-cover"
                />
                <h3 className="text-xl font-semibold mb-2">YouTube Services</h3>
                <p className="text-muted-foreground">Subscribers and watch time growth packages</p>
              </div>
              <div className="text-center">
                <img 
                  src={GAME_LOGOS.FACEBOOK} 
                  alt="Facebook Services" 
                  className="w-24 h-24 mx-auto mb-4 rounded-lg object-cover"
                />
                <h3 className="text-xl font-semibold mb-2">Facebook Services</h3>
                <p className="text-muted-foreground">Likes and followers for Facebook pages</p>
              </div>
              <div className="text-center">
                <img 
                  src={GAME_LOGOS.INSTAGRAM} 
                  alt="Instagram Services" 
                  className="w-24 h-24 mx-auto mb-4 rounded-lg object-cover"
                />
                <h3 className="text-xl font-semibold mb-2">Instagram Services</h3>
                <p className="text-muted-foreground">Follower and engagement growth services</p>
              </div>
              <div className="text-center">
                <img 
                  src={GAME_LOGOS.NETFLIX} 
                  alt="Netflix Premium" 
                  className="w-24 h-24 mx-auto mb-4 rounded-lg object-cover"
                />
                <h3 className="text-xl font-semibold mb-2">Netflix Premium</h3>
                <p className="text-muted-foreground">Access premium entertainment subscriptions</p>
              </div>
              <div className="text-center">
                <img 
                  src={GAME_LOGOS.CANVA} 
                  alt="Canva Pro" 
                  className="w-24 h-24 mx-auto mb-4 rounded-lg object-cover"
                />
                <h3 className="text-xl font-semibold mb-2">Canva Pro</h3>
                <p className="text-muted-foreground">Unlock premium design tools and features</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Why Choose B4U Esports?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start">
                <div className="mr-4 mt-1 text-primary">
                  <i className="fas fa-shield-alt fa-2x"></i>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Secure Transactions</h3>
                  <p className="text-muted-foreground">
                    Protected by Pi Network's advanced cryptographic payment system with end-to-end encryption.
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="mr-4 mt-1 text-primary">
                  <i className="fas fa-bolt fa-2x"></i>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Lightning Fast</h3>
                  <p className="text-muted-foreground">
                    Instant processing with deliveries typically completed within 5-10 minutes.
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="mr-4 mt-1 text-primary">
                  <i className="fas fa-coins fa-2x"></i>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Pi-Powered</h3>
                  <p className="text-muted-foreground">
                    Seamlessly integrated with Pi Network's revolutionary decentralized payment protocol.
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="mr-4 mt-1 text-primary">
                  <i className="fas fa-headset fa-2x"></i>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">24/7 Support</h3>
                  <p className="text-muted-foreground">
                    Round-the-clock customer support via email and WhatsApp for all your gaming needs.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </AnimatedPage>
  );
}
