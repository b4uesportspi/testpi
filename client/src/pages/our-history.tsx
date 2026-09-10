import Navigation from '@/components/navigation';
import Footer from '@/components/footer';
import AnimatedPage from '@/components/animated-page';
import ParticleBackground from '@/components/particle-background';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BRAND_LOGOS, GAME_LOGOS } from '@/lib/constants';
import { useLocation } from 'wouter';
import { useState } from 'react';

export default function OurHistory() {
  const [, setLocation] = useLocation();
  const [isMinimized, setIsMinimized] = useState(false);

  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const handleClose = () => {
    setLocation('#/');
  };

  const milestones = [
    {
      year: "2023",
      title: "Foundation & Vision",
      description: "B4U Esports was founded with a vision to revolutionize gaming commerce through cryptocurrency integration.",
      icon: "fa-rocket",
      color: "bg-gaming-blue"
    },
    {
      year: "2024",
      title: "Pi Network Partnership",
      description: "Strategic partnership with Pi Network established, becoming one of the first gaming platforms to integrate Pi cryptocurrency.",
      icon: "fa-handshake",
      color: "bg-gaming-purple"
    },
    {
      year: "2024",
      title: "PUBG Mobile Integration",
      description: "Successfully launched PUBG Mobile UC purchasing system with real-time Pi currency conversion.",
      icon: "fa-gamepad",
      color: "bg-gaming-green"
    },
    {
      year: "2024",
      title: "Mobile Legends Support",
      description: "Expanded services to include Mobile Legends: Bang Bang Diamond purchases, doubling our game portfolio.",
      icon: "fa-gem",
      color: "bg-gaming-gold"
    },
    {
      year: "2025",
      title: "Digital Services Expansion",
      description: "Expanded beyond game top-ups into Roblox, NEW STATE, Free Fire, TikTok, YouTube, Facebook, Instagram, Netflix, and Canva digital services.",
      icon: "fa-layer-group",
      color: "bg-gaming-purple"
    },
    {
      year: "2025",
      title: "Platform Maturity",
      description: "Achieved full platform stability with 24/7 support, real-time pricing, expanded service coverage, and enhanced security features.",
      icon: "fa-crown",
      color: "bg-gaming-red"
    }
  ];

  const achievements = [
    {
      number: "1000+",
      label: "Happy Users",
      icon: "fa-users",
      color: "text-gaming-blue"
    },
    {
      number: "5000+",
      label: "Transactions",
      icon: "fa-exchange-alt",
      color: "text-gaming-green"
    },
    {
      number: "99.9%",
      label: "Uptime",
      icon: "fa-server",
      color: "text-gaming-purple"
    },
    {
      number: "24/7",
      label: "Support",
      icon: "fa-headset",
      color: "text-gaming-gold"
    }
  ];

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
                data-testid="history-logo"
              />
              <div>
                <h1 className="text-4xl font-bold mb-2 highlighted-title">Our History</h1>
                <p className="text-muted-foreground">The Journey of Innovation and Growth</p>
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
              <CardTitle className="flex items-center">
                <i className="fas fa-book text-primary mr-3"></i>
                <span className="highlighted-title">Our Story</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">
                B4U Esports began as a vision to bridge the gap between traditional gaming commerce, creator services, and the emerging world of cryptocurrency. Founded by passionate gamers and technology enthusiasts, our company was born from the belief that digital services should be at the forefront of financial innovation.
              </p>
              <p className="enhanced-paragraph">
                From our humble beginnings to becoming a pioneer in Pi Network-integrated top-ups and digital services, our journey has been marked by continuous innovation, user-focused development, and an unwavering commitment to security and reliability.
              </p>
            </CardContent>
          </Card>

          {/* Founder Section */}
          <Card className="page-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <i className="fas fa-user-tie text-gaming-blue mr-3"></i>
                <span className="highlighted-title">Our Founder</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                <div className="flex-shrink-0">
                  <img 
                    src="https://b4uesports.com/wp-content/uploads/2025/10/1000002625.jpg" 
                    alt="Founder" 
                    className="w-32 h-32 rounded-full object-cover border-4 border-gaming-blue shadow-lg"
                  />
                </div>
                <div className="text-center md:text-left">
                  <h3 className="text-2xl font-bold highlighted-title mb-2">Rinzin Dorji</h3>
                  <p className="text-muted-foreground enhanced-paragraph mb-4">
                    Founded by Rinzin Dorji, a visionary BCOM Accounting graduate from Gedu College of Business Studies, B4U Esports emerged in 2020 and was officially launched on July 21, 2022. As a passionate gamer and entrepreneur, Rinzin envisioned a platform that would empower Bhutan's gaming talent and foster a thriving esports ecosystem that competes on global stages.
                  </p>
                  <p className="text-muted-foreground enhanced-paragraph mb-4">
                    His leadership has been instrumental in positioning B4U Esports as Bhutan's leading Pi-powered gaming and digital-services platform, spanning PUBG Mobile, PUBG KR, MLBB, Clash of Clans, Roblox, NEW STATE, Free Fire, creator-growth services, and premium subscriptions that elevate users' experiences.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-gaming-blue">120,000+</div>
                      <div className="text-sm">PUBG Mobile UC Transactions</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-gaming-green">60,000+</div>
                      <div className="text-sm">MLBB Diamond Deliveries</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-gaming-purple">200,000+</div>
                      <div className="text-sm">Social Media Engagements</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Section */}
          <Card className="page-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <i className="fas fa-users text-gaming-green mr-3"></i>
                <span className="highlighted-title">Our Team</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph mb-6">
                Our team consists of passionate gamers, developers, and business professionals dedicated to creating the best gaming experience on Pi Network.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Founder */}
                <div className="text-center section-border p-4 rounded-lg">
                  <img 
                    src="https://b4uesports.com/wp-content/uploads/2025/10/1000002625.jpg" 
                    alt="Founder" 
                    className="w-24 h-24 rounded-full object-cover border-4 border-gaming-blue shadow-lg mx-auto mb-4"
                  />
                  <h4 className="text-lg font-bold highlighted-title">Rinzin Dorji</h4>
                  <p className="text-muted-foreground text-sm">Founder & CEO</p>
                  <p className="text-muted-foreground text-xs mt-2">
                    Visionary leader with expertise in gaming and blockchain technology.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <i className="fas fa-timeline text-gaming-blue mr-3"></i>
                <span className="highlighted-title">Key Milestones</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {milestones.map((milestone, index) => (
                  <div key={index} className="flex items-start space-x-4 section-border" data-testid={`milestone-${index}`}>
                    <div className={`w-12 h-12 ${milestone.color} rounded-full flex items-center justify-center flex-shrink-0`}>
                      <i className={`fas ${milestone.icon} text-white`}></i>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <Badge variant="outline" className="text-xs">
                          {milestone.year}
                        </Badge>
                        <h3 className="text-lg font-semibold highlighted-title">{milestone.title}</h3>
                      </div>
                      <p className="text-muted-foreground enhanced-paragraph">{milestone.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <i className="fas fa-trophy text-gaming-gold mr-3"></i>
                <span className="highlighted-title">Achievements by Numbers</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {achievements.map((achievement, index) => (
                  <div key={index} className="text-center section-border" data-testid={`achievement-${index}`}>
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                      <i className={`fas ${achievement.icon} text-2xl ${achievement.color}`}></i>
                    </div>
                    <div className="text-2xl font-bold mb-1 highlighted-title">{achievement.number}</div>
                    <div className="text-sm text-muted-foreground">{achievement.label}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <i className="fas fa-lightbulb text-gaming-purple mr-3"></i>
                <span className="highlighted-title">Innovation Highlights</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <div className="space-y-6">
                <div className="section-border bg-muted p-4 rounded-lg" data-testid="innovation-pi-integration">
                  <h4 className="text-lg font-semibold mb-2 text-gaming-blue">
                    <i className="fas fa-coins mr-2"></i>First-to-Market Pi Integration
                  </h4>
                  <p className="enhanced-paragraph">
                    We were among the first gaming platforms to successfully integrate Pi Network's payment system, pioneering the use of Pi cryptocurrency for gaming transactions.
                  </p>
                </div>
                
                <div className="section-border bg-muted p-4 rounded-lg" data-testid="innovation-realtime">
                  <h4 className="text-lg font-semibold mb-2 text-gaming-green">
                    <i className="fas fa-chart-line mr-2"></i>Real-Time Price Engine
                  </h4>
                  <p className="enhanced-paragraph">
                    Developed a sophisticated real-time pricing system that updates Pi/USD conversion rates every 60 seconds, ensuring accurate and fair pricing for all transactions.
                  </p>
                </div>
                
                <div className="section-border bg-muted p-4 rounded-lg" data-testid="innovation-security">
                  <h4 className="text-lg font-semibold mb-2 text-gaming-red">
                    <i className="fas fa-shield-alt mr-2"></i>Advanced Security Framework
                  </h4>
                  <p className="enhanced-paragraph">
                    Implemented multi-layered security measures including blockchain verification, encrypted data storage, and secure payment processing to protect user transactions.
                  </p>
                </div>
                
                <div className="section-border bg-muted p-4 rounded-lg" data-testid="innovation-automation">
                  <h4 className="text-lg font-semibold mb-2 text-gaming-purple">
                    <i className="fas fa-robot mr-2"></i>Automated Delivery System
                  </h4>
                  <p className="enhanced-paragraph">
                    Created an automated delivery system that processes many top-up purchases within 5-10 minutes while supporting a growing range of digital services.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <i className="fas fa-users text-gaming-blue mr-3"></i>
                <span className="highlighted-title">Community Growth</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">
                Our growth has been driven by the trust and support of our gaming community. From our first transaction to thousands of successful purchases, each milestone has been achieved through:
              </p>
              <ul className="space-y-2">
                <li className="enhanced-paragraph"><strong>User Feedback:</strong> Continuously improving based on community suggestions</li>
                <li className="enhanced-paragraph"><strong>Transparency:</strong> Maintaining open communication about platform updates and changes</li>
                <li className="enhanced-paragraph"><strong>Reliability:</strong> Ensuring consistent service quality and uptime</li>
                <li className="enhanced-paragraph"><strong>Innovation:</strong> Staying ahead of technology trends and user needs</li>
                <li className="enhanced-paragraph"><strong>Support:</strong> Providing responsive customer service and technical assistance</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <i className="fas fa-handshake text-gaming-purple mr-3"></i>
                <span className="highlighted-title">Strategic Partnerships</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <div className="space-y-4">
                <div className="flex items-start space-x-4 section-border">
                  <img 
                    src={BRAND_LOGOS.PI} 
                    alt="Pi Network" 
                    className="w-12 h-12 rounded-full mt-1"
                    data-testid="partner-pi-network"
                  />
                  <div>
                    <h4 className="text-lg font-semibold highlighted-title">Pi Network</h4>
                    <p className="text-muted-foreground enhanced-paragraph">
                      Our foundational partnership with Pi Network enables secure, innovative cryptocurrency transactions for gaming purchases.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4 section-border">
                  <img 
                    src={GAME_LOGOS.PUBG} 
                    alt="PUBG Mobile" 
                    className="w-12 h-12 rounded-lg mt-1"
                    data-testid="partner-pubg"
                  />
                  <div>
                    <h4 className="text-lg font-semibold highlighted-title">PUBG Mobile Ecosystem</h4>
                    <p className="text-muted-foreground enhanced-paragraph">
                      Authorized integration with PUBG Mobile's UC system, ensuring legitimate and secure currency delivery.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4 section-border">
                  <img 
                    src="https://encrypted-tbn1.gstatic.com/images?q=tbn:ANd9GcTT-Neggt-JpAh4eDx84JswmFwJMOa4pcfhqtcTcxtywIGC4IfB" 
                    alt="Mobile Legends" 
                    className="w-12 h-12 rounded-lg mt-1"
                    data-testid="partner-mlbb"
                  />
                  <div>
                    <h4 className="text-lg font-semibold highlighted-title">Mobile Legends: Bang Bang</h4>
                    <p className="text-muted-foreground enhanced-paragraph">
                      Official partnership for Diamond delivery services, expanding our reach in the MOBA gaming community.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <i className="fas fa-road text-gaming-green mr-3"></i>
                <span className="highlighted-title">Looking Forward</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">
                As we continue to grow, our focus remains on innovation, security, and user satisfaction. Our roadmap includes:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="section-border bg-muted p-4 rounded-lg" data-testid="future-games">
                  <h4 className="font-semibold mb-2 text-gaming-blue">
                    <i className="fas fa-plus mr-2"></i>New Game Support
                  </h4>
                  <p className="text-sm enhanced-paragraph">Expanding to support more popular mobile games and their in-game currencies.</p>
                </div>
                
                <div className="section-border bg-muted p-4 rounded-lg" data-testid="future-features">
                  <h4 className="font-semibold mb-2 text-gaming-purple">
                    <i className="fas fa-cogs mr-2"></i>Enhanced Features
                  </h4>
                  <p className="text-sm enhanced-paragraph">Advanced user dashboard, loyalty programs, and personalized gaming experiences.</p>
                </div>
                
                <div className="section-border bg-muted p-4 rounded-lg" data-testid="future-global">
                  <h4 className="font-semibold mb-2 text-gaming-green">
                    <i className="fas fa-globe mr-2"></i>Global Expansion
                  </h4>
                  <p className="text-sm enhanced-paragraph">Extending our services to more countries and supporting additional payment methods.</p>
                </div>
                
                <div className="section-border bg-muted p-4 rounded-lg" data-testid="future-technology">
                  <h4 className="font-semibold mb-2 text-gaming-gold">
                    <i className="fas fa-rocket mr-2"></i>Next-Gen Technology
                  </h4>
                  <p className="text-sm enhanced-paragraph">Implementing AI-powered recommendations and blockchain-based transaction verification.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <i className="fas fa-heart text-gaming-red mr-3"></i>
                <span className="highlighted-title">Thank You</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <div className="bg-gradient-to-r from-gaming-blue to-gaming-purple p-6 rounded-lg text-center">
                <h3 className="text-2xl font-bold text-black mb-4">
                  Thank You for Being Part of Our Journey
                </h3>
                <p className="text-blue-100 mb-4 enhanced-paragraph">
                  Every transaction, every piece of feedback, and every moment of trust you've placed in us has helped shape B4U Esports into what it is today.
                </p>
                <p className="text-blue-100 enhanced-paragraph">
                  Together, we're not just changing how gamers purchase in-game currencies – we're pioneering the future of gaming commerce.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </AnimatedPage>
  );
}
