import Navigation from '@/components/navigation';
import Footer from '@/components/footer';
import AnimatedPage from '@/components/animated-page';
import ParticleBackground from '@/components/particle-background';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BRAND_LOGOS } from '@/lib/constants';
import { useLocation } from 'wouter';
import { useState } from 'react';

export default function Whitepaper() {
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
                data-testid="whitepaper-logo"
              />
              <div>
                <h1 className="text-4xl font-bold mb-2 highlighted-title">B4U Esports Whitepaper</h1>
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
                <i className="fas fa-file-alt text-primary mr-3"></i>
                <span className="highlighted-title">Executive Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">
                B4U Esports is a pioneering digital marketplace that bridges the gap between traditional gaming commerce, creator-growth services, premium subscriptions, and the emerging world of cryptocurrency through seamless integration with Pi Network. Our platform enables users to purchase game top-ups and digital services using Pi coins, creating a new standard for online transactions.
              </p>
              <p className="enhanced-paragraph">
                By leveraging Pi Network's revolutionary payment system, we offer users a secure, fast, and innovative way to purchase gaming currencies and digital services for products such as PUBG Mobile, PUBG KR, Mobile Legends: Bang Bang, Clash of Clans, Roblox, NEW STATE, Free Fire, TikTok, YouTube, Facebook, Instagram, Netflix, and Canva. Our mission is to empower gamers and digital users worldwide with a safe, reliable, and cutting-edge platform that makes these services more accessible through cryptocurrency.
              </p>
              <p className="enhanced-paragraph">
                Following Pi Network's achievement of full MiCA (Markets in Crypto-Assets) compliance in the European Union, B4U Esports is positioned to benefit from increased regulatory clarity and market access, ensuring our platform meets the highest standards of transparency and user protection.
              </p>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <i className="fas fa-question-circle text-gaming-blue mr-3"></i>
                <span className="highlighted-title">Introduction</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <h3 className="text-xl font-semibold mb-3">The Gaming Industry Today</h3>
              <p className="enhanced-paragraph">
                The gaming industry has experienced unprecedented growth, with mobile gaming leading the charge. As of 2025, the global gaming market is valued at over $200 billion, with mobile gaming accounting for more than 50% of this revenue. However, traditional payment methods in gaming face several challenges, including high transaction fees, limited accessibility in developing regions, and security concerns.
              </p>
          
              <h3 className="text-xl font-semibold mb-3 mt-6">What is Pi Network?</h3>
              <p className="enhanced-paragraph">
                Pi Network is a cryptocurrency project that enables everyday people to mine (generate) Pi coins through a mobile app without draining device resources. Unlike traditional cryptocurrencies that require expensive hardware and technical expertise, Pi Network allows users to mine coins through a simple mobile application, making cryptocurrency accessible to a broader audience.
              </p>
              <p className="enhanced-paragraph">
                Pi Network's unique approach has resulted in a global community of over 35 million users across 230+ countries, creating a vast potential market for our services. With Pi Network's recent achievement of full MiCA compliance in the European Union, the project has demonstrated its commitment to regulatory transparency and user protection.
              </p>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <i className="fas fa-exclamation-triangle text-gaming-red mr-3"></i>
                <span className="highlighted-title">Problem Statement</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <h3 className="text-xl font-semibold mb-3">High Transaction Fees</h3>
              <p className="enhanced-paragraph">
                Traditional payment methods for gaming transactions often involve high fees, especially for international transactions. Credit card processing fees, cross-border transaction charges, and intermediary service fees can significantly impact both consumers and service providers.
              </p>
          
              <h3 className="text-xl font-semibold mb-3 mt-6">Limited Accessibility</h3>
              <p className="enhanced-paragraph">
                Many gamers in developing countries face challenges accessing traditional payment methods. Banking infrastructure limitations, currency conversion issues, and regulatory barriers prevent millions of potential users from participating in the global gaming economy.
              </p>
          
              <h3 className="text-xl font-semibold mb-3 mt-6">Security Concerns</h3>
              <p className="enhanced-paragraph">
                Gaming transactions are frequent targets for fraud and cyberattacks. Traditional payment systems often lack the robust security measures needed to protect users' financial information and prevent unauthorized transactions.
              </p>
          
              <h3 className="text-xl font-semibold mb-3 mt-6">Lack of Cryptocurrency Integration</h3>
              <p className="enhanced-paragraph">
                Despite the growing popularity of cryptocurrencies, few gaming platforms have successfully integrated them into their payment systems. Existing solutions often suffer from complexity, volatility, and poor user experience.
              </p>
          
              <h3 className="text-xl font-semibold mb-3 mt-6">Regulatory Uncertainty</h3>
              <p className="enhanced-paragraph">
                The lack of clear regulatory frameworks for cryptocurrency-based services has created uncertainty for both service providers and users. With Pi Network's MiCA compliance, B4U Esports operates with greater regulatory clarity and user protection.
              </p>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <i className="fas fa-lightbulb text-gaming-gold mr-3"></i>
                <span className="highlighted-title">Our Solution</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">
                B4U Esports addresses these challenges through a comprehensive solution that leverages Pi Network's unique advantages across gaming top-ups, social-growth services, and digital subscriptions:
              </p>
          
              <div className="mt-4 space-y-4">
                <div className="section-border p-4 rounded-lg">
                  <h4 className="text-lg font-semibold mb-2 text-gaming-blue">
                    <i className="fas fa-sync-alt mr-2"></i>Seamless Pi Integration
                  </h4>
                  <p className="enhanced-paragraph">
                    Our platform is one of the first marketplaces in this space to successfully integrate Pi Network's payment system, enabling secure and straightforward cryptocurrency transactions for gaming and digital-service purchases.
                  </p>
                </div>
            
                <div className="section-border p-4 rounded-lg">
                  <h4 className="text-lg font-semibold mb-2 text-gaming-purple">
                    <i className="fas fa-chart-line mr-2"></i>Real-Time Pricing Engine
                  </h4>
                  <p className="enhanced-paragraph">
                    We've developed a sophisticated real-time pricing system that updates Pi/USD conversion rates every 60 seconds, ensuring accurate and fair pricing for all transactions.
                  </p>
                </div>
            
                <div className="section-border p-4 rounded-lg">
                  <h4 className="text-lg font-semibold mb-2 text-gaming-green">
                    <i className="fas fa-shield-alt mr-2"></i>Enhanced Security Framework
                  </h4>
                  <p className="enhanced-paragraph">
                    Our multi-layered security approach includes blockchain verification, encrypted data storage, and secure payment processing to protect user transactions.
                  </p>
                </div>
            
                <div className="section-border p-4 rounded-lg">
                  <h4 className="text-lg font-semibold mb-2 text-gaming-red">
                    <i className="fas fa-bolt mr-2"></i>Automated Delivery System
                  </h4>
                  <p className="enhanced-paragraph">
                    Our automated delivery system processes supported top-up and service purchases quickly, with many gaming orders completed within 5-10 minutes.
                  </p>
                </div>
            
                <div className="section-border p-4 rounded-lg">
                  <h4 className="text-lg font-semibold mb-2 text-gaming-blue">
                    <i className="fas fa-globe mr-2"></i>Global Accessibility
                  </h4>
                  <p className="enhanced-paragraph">
                    By accepting Pi cryptocurrency, we make gaming top-ups, creator-growth services, and digital subscriptions accessible to users worldwide, regardless of their banking infrastructure or local payment method limitations.
                  </p>
                </div>
            
                <div className="section-border p-4 rounded-lg">
                  <h4 className="text-lg font-semibold mb-2 text-gaming-gold">
                    <i className="fas fa-file-contract mr-2"></i>MiCA Compliance Alignment
                  </h4>
                  <p className="enhanced-paragraph">
                    Our platform aligns with Pi Network's MiCA compliance standards, ensuring regulatory transparency and user protection in line with European Union cryptocurrency regulations.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <i className="fas fa-cogs text-gaming-blue mr-3"></i>
                <span className="highlighted-title">Technology Stack</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <h3 className="text-xl font-semibold mb-3">Frontend</h3>
              <ul className="list-disc pl-6 space-y-2 enhanced-paragraph">
                <li><strong>React 18</strong>: Modern UI library for building responsive user interfaces</li>
                <li><strong>TypeScript</strong>: Strong typing for improved code quality and maintainability</li>
                <li><strong>Vite</strong>: Fast build tool and development server</li>
                <li><strong>Tailwind CSS</strong>: Utility-first CSS framework for consistent design</li>
                <li><strong>shadcn/ui</strong>: Component library built on Radix UI for professional UI components</li>
              </ul>
              
              <h3 className="text-xl font-semibold mb-3 mt-6">Backend</h3>
              <ul className="list-disc pl-6 space-y-2 enhanced-paragraph">
                <li><strong>Node.js</strong>: Runtime environment for scalable server-side applications</li>
                <li><strong>Express.js</strong>: Web framework for building REST APIs</li>
                <li><strong>PostgreSQL</strong>: Robust relational database for data storage</li>
                <li><strong>Drizzle ORM</strong>: Modern database toolkit for type-safe database operations</li>
              </ul>
              
              <h3 className="text-xl font-semibold mb-3 mt-6">Pi Network Integration</h3>
              <ul className="list-disc pl-6 space-y-2 enhanced-paragraph">
                <li><strong>Pi SDK</strong>: Official Pi Network JavaScript SDK for authentication and payments</li>
                <li><strong>Pi Platform API</strong>: Backend integration for secure payment processing</li>
              </ul>
              
              <h3 className="text-xl font-semibold mb-3 mt-6">Additional Technologies</h3>
              <ul className="list-disc pl-6 space-y-2 enhanced-paragraph">
                <li><strong>EmailJS</strong>: For automated purchase confirmation emails</li>
                <li><strong>CoinGecko API</strong>: For real-time Pi price tracking</li>
                <li><strong>Passport.js</strong>: Authentication middleware for secure user sessions</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <i className="fas fa-chart-bar text-gaming-green mr-3"></i>
                <span className="highlighted-title">Market Analysis</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <h3 className="text-xl font-semibold mb-3">Market Size</h3>
              <p className="enhanced-paragraph">
                The global gaming market continues to expand rapidly:
              </p>
              <ul className="list-disc pl-6 space-y-2 enhanced-paragraph">
                <li>Total market value: $200+ billion (2025)</li>
                <li>Mobile gaming segment: $100+ billion (50% of total market)</li>
                <li>In-game purchases: 80% of mobile gaming revenue</li>
                <li>Cryptocurrency adoption in gaming: Growing at 25% annually</li>
              </ul>
              
              <h3 className="text-xl font-semibold mb-3 mt-6">Target Market</h3>
              <p className="enhanced-paragraph">
                Our primary target market consists of:
              </p>
              <ul className="list-disc pl-6 space-y-2 enhanced-paragraph">
                <li><strong>Pi Network Users</strong>: 35+ million global users with disposable Pi coins</li>
                <li><strong>Mobile Gamers</strong>: Targeting players across PUBG Mobile, PUBG KR, Mobile Legends, Clash of Clans, Roblox, NEW STATE, and Free Fire</li>
                <li><strong>Emerging Market Users</strong>: Gamers in regions with limited traditional payment options</li>
                <li><strong>Crypto-Forward Gamers</strong>: Early adopters of cryptocurrency in gaming</li>
              </ul>
              
              <h3 className="text-xl font-semibold mb-3 mt-6">Competitive Landscape</h3>
              <p className="enhanced-paragraph">
                While several platforms offer gaming top-ups or digital services, few have successfully integrated cryptocurrency payments across both categories:
              </p>
              <ul className="list-disc pl-6 space-y-2 enhanced-paragraph">
                <li><strong>Traditional platforms</strong>: High fees, limited crypto options</li>
                <li><strong>Crypto platforms</strong>: Complex user experience, volatility issues</li>
                <li><strong>B4U Esports advantage</strong>: Seamless Pi integration, user-friendly design</li>
              </ul>
              
              <h3 className="text-xl font-semibold mb-3 mt-6">Market Opportunity</h3>
              <p className="enhanced-paragraph">
                The convergence of mobile gaming and cryptocurrency presents a significant opportunity:
              </p>
              <ul className="list-disc pl-6 space-y-2 enhanced-paragraph">
                <li>Untapped Pi Network user base seeking utility for their coins</li>
                <li>Growing demand for low-cost, secure gaming transactions</li>
                <li>Increasing acceptance of cryptocurrency in mainstream applications</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <i className="fas fa-dollar-sign text-gaming-gold mr-3"></i>
                <span className="highlighted-title">Business Model</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <h3 className="text-xl font-semibold mb-3">Revenue Streams</h3>
              <ul className="list-disc pl-6 space-y-2 enhanced-paragraph">
                <li><strong>Transaction Fees</strong>: Small percentage fee on each gaming currency purchase</li>
                <li><strong>Premium Packages</strong>: Special offers and bundles with higher margins</li>
                <li><strong>Partnership Revenue</strong>: Revenue sharing with game publishers</li>
                <li><strong>Advertising</strong>: Pi App Platform Ads integration</li>
              </ul>
              
              <h3 className="text-xl font-semibold mb-3 mt-6">Pricing Strategy</h3>
              <p className="enhanced-paragraph">
                Our pricing strategy focuses on competitiveness and value:
              </p>
              <ul className="list-disc pl-6 space-y-2 enhanced-paragraph">
                <li>Real-time Pi/USD conversion rates from CoinGecko API</li>
                <li>Transparent pricing with no hidden fees</li>
                <li>Regular promotions and special offers for loyal users</li>
              </ul>
              
              <h3 className="text-xl font-semibold mb-3 mt-6">Customer Acquisition</h3>
              <ul className="list-disc pl-6 space-y-2 enhanced-paragraph">
                <li>Pi Network community engagement</li>
                <li>Social media marketing</li>
                <li>Influencer partnerships in gaming communities</li>
                <li>Referral programs</li>
                <li>Content marketing through guides and tutorials</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <i className="fas fa-project-diagram text-gaming-purple mr-3"></i>
                <span className="highlighted-title">Platform Architecture</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <h3 className="text-xl font-semibold mb-3">System Overview</h3>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
{`┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React Frontend │────│  Node.js Backend │────│   PostgreSQL    │
│   (Vite)         │    │   (Express)      │    │   Database      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │
         ▼                        ▼
┌─────────────────┐    ┌──────────────────┐
│   Pi Network    │    │   CoinGecko API  │
│   SDK/API       │    │   (Pricing)      │
└─────────────────┘    └──────────────────┘`}
              </pre>
              
              <h3 className="text-xl font-semibold mb-3 mt-6">Key Components</h3>
              <h4 className="text-lg font-semibold mb-2">1. Frontend (client/)</h4>
              <ul className="list-disc pl-6 space-y-2 enhanced-paragraph">
                <li>User interface for browsing packages and making purchases</li>
                <li>Pi Network authentication and payment flows</li>
                <li>Responsive design for mobile and desktop</li>
              </ul>
              
              <h4 className="text-lg font-semibold mb-2 mt-4">2. Backend (server/)</h4>
              <ul className="list-disc pl-6 space-y-2 enhanced-paragraph">
                <li>REST API for packages, pricing, and transactions</li>
                <li>Pi Network payment processing and validation</li>
                <li>Database management and user authentication</li>
              </ul>
              
              <h4 className="text-lg font-semibold mb-2 mt-4">3. Database (PostgreSQL)</h4>
              <ul className="list-disc pl-6 space-y-2 enhanced-paragraph">
                <li>User accounts and profiles</li>
                <li>Package information</li>
                <li>Transaction records</li>
                <li>Session management</li>
              </ul>
              
              <h3 className="text-xl font-semibold mb-3 mt-6">Data Flow</h3>
              <ol className="list-decimal pl-6 space-y-2 enhanced-paragraph">
                <li>User authentication through Pi Network</li>
                <li>Real-time price fetching from CoinGecko API</li>
                <li>Package selection and purchase initiation</li>
                <li>Pi Network payment processing</li>
                <li>Automated delivery of gaming currency</li>
                <li>Email confirmation and transaction logging</li>
              </ol>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <i className="fas fa-lock text-gaming-blue mr-3"></i>
                <span className="highlighted-title">Security Framework</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <h3 className="text-xl font-semibold mb-3">Authentication Security</h3>
              <ul className="list-disc pl-6 space-y-2 enhanced-paragraph">
                <li>JWT-based session management</li>
                <li>Secure password hashing with bcrypt</li>
                <li>Pi Network OAuth 2.0 integration</li>
                <li>Multi-factor authentication options</li>
              </ul>
              
              <h3 className="text-xl font-semibold mb-3 mt-6">Payment Security</h3>
              <ul className="list-disc pl-6 space-y-2 enhanced-paragraph">
                <li>Server-side payment validation</li>
                <li>Pi Platform API verification</li>
                <li>Secure transaction logging</li>
                <li>Blockchain-based verification</li>
              </ul>
              
              <h3 className="text-xl font-semibold mb-3 mt-6">Data Protection</h3>
              <ul className="list-disc pl-6 space-y-2 enhanced-paragraph">
                <li>End-to-end encryption for data transmission</li>
                <li>Secure database storage with encryption at rest</li>
                <li>Regular security audits and penetration testing</li>
                <li>Automated backup and disaster recovery systems</li>
              </ul>
              
              <h3 className="text-xl font-semibold mb-3 mt-6">Compliance</h3>
              <ul className="list-disc pl-6 space-y-2 enhanced-paragraph">
                <li>GDPR compliance for European users</li>
                <li>Data protection impact assessments</li>
                <li>Regular security training for personnel</li>
                <li>Incident response procedures</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <i className="fas fa-road text-gaming-red mr-3"></i>
                <span className="highlighted-title">Roadmap</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <h3 className="text-xl font-semibold mb-3">Phase 1: Foundation (Completed)</h3>
              <ul className="list-disc pl-6 space-y-2 enhanced-paragraph">
                <li>Core platform development</li>
                <li>Pi Network integration</li>
                <li>Initial game support (PUBG Mobile, Mobile Legends)</li>
                <li>Basic security framework implementation</li>
              </ul>
              
              <h3 className="text-xl font-semibold mb-3 mt-6">Phase 2: Growth (Current)</h3>
              <ul className="list-disc pl-6 space-y-2 enhanced-paragraph">
                <li>Enhanced user interface and experience</li>
                <li>Additional game support</li>
                <li>Advanced security features</li>
                <li>Marketing and user acquisition</li>
              </ul>
              
              <h3 className="text-xl font-semibold mb-3 mt-6">Phase 3: Expansion (2026)</h3>
              <ul className="list-disc pl-6 space-y-2 enhanced-paragraph">
                <li>Support for 5+ additional games</li>
                <li>Multi-language support</li>
                <li>Advanced analytics dashboard</li>
                <li>Loyalty program implementation</li>
              </ul>
              
              <h3 className="text-xl font-semibold mb-3 mt-6">Phase 4: Innovation (2027+)</h3>
              <ul className="list-disc pl-6 space-y-2 enhanced-paragraph">
                <li>AI-powered recommendations</li>
                <li>Blockchain-based transaction verification</li>
                <li>Cross-platform gaming currency exchange</li>
                <li>Virtual reality integration</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <i className="fas fa-users text-gaming-green mr-3"></i>
                <span className="highlighted-title">Team</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <h3 className="text-xl font-semibold mb-3">Founders</h3>
              <p className="enhanced-paragraph">
                Our founding team consists of passionate gamers and technology enthusiasts with extensive experience in software development, blockchain technology, and digital marketing.
              </p>
              
              <h3 className="text-xl font-semibold mb-3 mt-6">Advisors</h3>
              <p className="enhanced-paragraph">
                We work with advisors from the gaming industry, cryptocurrency space, and cybersecurity to ensure our platform meets the highest standards.
              </p>
              
              <h3 className="text-xl font-semibold mb-3 mt-6">Development Team</h3>
              <p className="enhanced-paragraph">
                Our development team includes specialists in frontend development, backend architecture, database management, and security implementation.
              </p>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <i className="fas fa-chart-line text-gaming-gold mr-3"></i>
                <span className="highlighted-title">Financial Projections</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <h3 className="text-xl font-semibold mb-3">Revenue Projections (2025-2027)</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="bg-muted">
                      <th className="border p-2 text-left">Year</th>
                      <th className="border p-2 text-left">Projected Revenue</th>
                      <th className="border p-2 text-left">User Base</th>
                      <th className="border p-2 text-left">Transaction Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border p-2">2025</td>
                      <td className="border p-2">$500,000</td>
                      <td className="border p-2">10,000</td>
                      <td className="border p-2">25,000</td>
                    </tr>
                    <tr className="bg-muted">
                      <td className="border p-2">2026</td>
                      <td className="border p-2">$1,500,000</td>
                      <td className="border p-2">50,000</td>
                      <td className="border p-2">100,000</td>
                    </tr>
                    <tr>
                      <td className="border p-2">2027</td>
                      <td className="border p-2">$3,500,000</td>
                      <td className="border p-2">150,000</td>
                      <td className="border p-2">300,000</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <h3 className="text-xl font-semibold mb-3 mt-6">Cost Structure</h3>
              <ul className="list-disc pl-6 space-y-2 enhanced-paragraph">
                <li>Technology infrastructure: 30%</li>
                <li>Marketing and user acquisition: 40%</li>
                <li>Team salaries and operations: 20%</li>
                <li>Legal and compliance: 5%</li>
                <li>Reserve for growth: 5%</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <i className="fas fa-handshake text-gaming-blue mr-3"></i>
                <span className="highlighted-title">Partnerships</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <h3 className="text-xl font-semibold mb-3">Pi Network</h3>
              <p className="enhanced-paragraph">
                Our foundational partnership with Pi Network enables secure, innovative cryptocurrency transactions for gaming purchases.
              </p>
              
              <h3 className="text-xl font-semibold mb-3 mt-6">Game Publishers</h3>
              <p className="enhanced-paragraph">
                We have established partnerships with major game publishers to ensure legitimate and secure currency delivery:
              </p>
              <ul className="list-disc pl-6 space-y-2 enhanced-paragraph">
                <li>PUBG Mobile (Tencent/Krafton)</li>
                <li>Mobile Legends: Bang Bang (Moonton)</li>
              </ul>
              
              <h3 className="text-xl font-semibold mb-3 mt-6">Technology Partners</h3>
              <p className="enhanced-paragraph">
                We collaborate with leading technology providers to enhance our platform capabilities and security.
              </p>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <i className="fas fa-gavel text-gaming-purple mr-3"></i>
                <span className="highlighted-title">Legal Compliance</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <h3 className="text-xl font-semibold mb-3">Regulatory Framework</h3>
              <p className="enhanced-paragraph">
                We operate within the legal frameworks of relevant jurisdictions and comply with all applicable regulations:
              </p>
              <ul className="list-disc pl-6 space-y-2 enhanced-paragraph">
                <li>Digital commerce laws</li>
                <li>Data protection regulations (GDPR, CCPA)</li>
                <li>Financial services regulations</li>
                <li>Consumer protection laws</li>
                <li>MiCA (Markets in Crypto-Assets) compliance through Pi Network integration</li>
              </ul>
          
              <h3 className="text-xl font-semibold mb-3 mt-6">User Agreements</h3>
              <p className="enhanced-paragraph">
                Comprehensive user agreements protect both our platform and our users:
              </p>
              <ul className="list-disc pl-6 space-y-2 enhanced-paragraph">
                <li>Terms of Service</li>
                <li>Privacy Policy</li>
                <li>Refund Policy</li>
                <li>Data Protection Policy</li>
              </ul>
          
              <h3 className="text-xl font-semibold mb-3 mt-6">Dispute Resolution</h3>
              <p className="enhanced-paragraph">
                We maintain clear processes for dispute resolution and user support.
              </p>
          
              <h3 className="text-xl font-semibold mb-3 mt-6">MiCA Compliance Benefits</h3>
              <p className="enhanced-paragraph">
                Through our integration with Pi Network, which has achieved full MiCA compliance, our users benefit from:
              </p>
              <ul className="list-disc pl-6 space-y-2 enhanced-paragraph">
                <li>Enhanced investor protection and transparency</li>
                <li>Clear regulatory framework for cryptocurrency transactions</li>
                <li>Standardized disclosure requirements</li>
                <li>Improved market integrity and reduced fraud risks</li>
                <li>Access to regulated European markets</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <i className="fas fa-flag-checkered text-gaming-green mr-3"></i>
                <span className="highlighted-title">Conclusion</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">
                B4U Esports represents a significant opportunity to revolutionize the gaming commerce landscape by bridging traditional gaming with the emerging world of cryptocurrency. Our unique integration with Pi Network positions us at the forefront of this transformation, offering users a secure, accessible, and innovative platform for purchasing gaming currencies.
              </p>
              <p className="enhanced-paragraph">
                With a growing market, proven technology, and experienced team, we are well-positioned for success in this expanding industry. Our commitment to security, user experience, and innovation will continue to drive our growth and establish us as the leading Pi Network-integrated gaming marketplace.
              </p>
              <p className="enhanced-paragraph">
                As we continue to expand our game support, enhance our platform features, and grow our user base, we remain committed to our core mission of making gaming more accessible and enjoyable through the power of cryptocurrency.
              </p>
              
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <p className="text-sm italic">
                  This whitepaper is subject to updates as our platform evolves and the market develops. For the most current information, please contact our team directly.
                </p>
                
                <div className="mt-4">
                  <h4 className="font-semibold">Contact Information:</h4>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>Email: <a href="mailto:info@b4uesports.com" className="text-primary hover:underline">info@b4uesports.com</a></li>
                    <li>Phone: +975 17875099</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Footer />
    </AnimatedPage>
  );
}
