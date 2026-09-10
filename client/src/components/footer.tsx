import { BRAND_LOGOS, SOCIAL_LINKS, CONTACT_INFO } from '@/lib/constants';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

const APP_VERSION = '1.0.0';

export default function Footer() {
  const [isContactOpen, setIsContactOpen] = useState(false);

  return (
    <footer className="relative z-10 bg-card border-t border-border mt-20" data-testid="footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Centered footer content */}
        <div className="flex flex-col items-center text-center">
          {/* Company Info */}
          <div className="mb-8" data-testid="footer-company">
            <div className="flex items-center justify-center space-x-4 mb-4">
              <img 
                src={BRAND_LOGOS.B4U} 
                alt="B4U Esports" 
                className="h-12 w-auto"
                data-testid="footer-logo"
              />
              <h3 className="text-xl font-bold">B4U Esports</h3>
            </div>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto" data-testid="footer-description">
              A Pi Network-powered marketplace for game top-ups, creator-growth services, and digital subscriptions including PUBG, MLBB, Roblox, TikTok, YouTube, Facebook, Instagram, Netflix, and Canva.
            </p>
          </div>

          {/* Support Section */}
          <div className="mb-8" data-testid="footer-support">
            <h4 className="text-lg font-semibold mb-4">Support</h4>
            <div className="flex flex-col items-center space-y-2">
              <p className="text-muted-foreground">
                <i className="fas fa-envelope mr-2"></i>
                <a href={`mailto:${CONTACT_INFO.EMAIL}`} className="hover:text-primary" data-testid="contact-email" target="_blank" rel="noopener noreferrer">
                  {CONTACT_INFO.EMAIL}
                </a>
              </p>
              <Button 
                variant="link" 
                className="p-0 h-auto text-green-500 hover:text-green-600"
                onClick={() => setIsContactOpen(true)}
              >
                <i className="fab fa-whatsapp mr-2"></i>
                WhatsApp
              </Button>
              <div className="text-muted-foreground text-sm mt-4">
                <p className="flex items-center justify-center">
                  <i className="fas fa-map-marker-alt mr-2"></i>
                  <span>20306 Newfoundland Sq, Ashburn, Virginia 20147, USA</span>
                </p>
                <p className="flex items-center justify-center mt-2">
                  <i className="fas fa-map-marker-alt mr-2"></i>
                  <span>Babesa, Thimphu, Bhutan 11001</span>
                </p>
              </div>
              {isContactOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-card rounded-lg p-6 max-w-md w-full mx-4 border border-border">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">Contact via WhatsApp</h3>
                      <button 
                        onClick={() => setIsContactOpen(false)}
                        className="p-2 rounded-full hover:bg-muted transition-colors"
                        aria-label="Close"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                    <div className="py-4">
                      <p className="text-center mb-4">Click the button below to contact us on WhatsApp</p>
                      <a 
                        href={CONTACT_INFO.WHATSAPP} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center w-full px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all duration-300 transform hover:scale-105"
                      >
                        <i className="fab fa-whatsapp mr-2"></i>
                        Open WhatsApp
                      </a>
                      <p className="text-xs text-muted-foreground text-center mt-4">
                        You will be redirected to WhatsApp to chat with our support team
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Links and Legal - Combined and Centered */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 w-full max-w-2xl" data-testid="footer-links">
            <div data-testid="footer-quick-links">
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><a href="#/about-us" className="text-muted-foreground hover:text-primary transition-colors" data-testid="link-about">About Us</a></li>
                <li><a href="#/our-history" className="text-muted-foreground hover:text-primary transition-colors" data-testid="link-history">Our History</a></li>
                <li>
                  <a href="#/subscriptions" className="text-muted-foreground hover:text-primary transition-colors" data-testid="link-subscriptions">
                    Subscriptions
                  </a>
                </li>
                <li>
                  <a href="#/whitepaper" className="text-muted-foreground hover:text-primary transition-colors" data-testid="link-whitepaper">
                    Whitepaper
                  </a>
                </li>
              </ul>
            </div>

            <div data-testid="footer-legal">
              <h4 className="text-lg font-semibold mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><a href="#/privacy-policy" className="text-muted-foreground hover:text-primary transition-colors" data-testid="link-privacy">Privacy Policy</a></li>
                <li><a href="#/terms-of-service" className="text-muted-foreground hover:text-primary transition-colors" data-testid="link-terms">Terms of Service</a></li>
                <li><a href="#/refund-policy" className="text-muted-foreground hover:text-primary transition-colors" data-testid="link-refund">Refund Policy</a></li>
                <li><a href="#/data-protection" className="text-muted-foreground hover:text-primary transition-colors" data-testid="link-data-protection">Data Protection</a></li>
                <li><a href="#/user-agreement" className="text-muted-foreground hover:text-primary transition-colors" data-testid="link-user-agreement">User Agreement</a></li>
                <li><a href="#/faqs" className="text-muted-foreground hover:text-primary transition-colors" data-testid="link-faqs">FAQs</a></li>
              </ul>
            </div>
          </div>

          {/* Social Media */}
          <div className="mb-8" data-testid="footer-social">
            <h4 className="text-lg font-semibold mb-4">Follow Us</h4>
            <div className="flex items-center justify-center space-x-6">
              <a 
                href={SOCIAL_LINKS.FACEBOOK} 
                className="social-icon text-blue-600 hover:text-blue-700 transition-all duration-300 text-2xl transform hover:scale-110"
                data-testid="social-facebook"
                aria-label="Facebook"
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className="fab fa-facebook"></i>
              </a>
              <a 
                href={SOCIAL_LINKS.YOUTUBE} 
                className="social-icon text-red-600 hover:text-red-700 transition-all duration-300 text-2xl transform hover:scale-110"
                data-testid="social-youtube"
                aria-label="YouTube"
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className="fab fa-youtube"></i>
              </a>
              <a 
                href={SOCIAL_LINKS.TIKTOK} 
                className="social-icon text-black hover:text-gray-800 transition-all duration-300 text-2xl transform hover:scale-110"
                data-testid="social-tiktok"
                aria-label="TikTok"
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className="fab fa-tiktok"></i>
              </a>
              <a 
                href={SOCIAL_LINKS.INSTAGRAM} 
                className="social-icon text-pink-500 hover:text-pink-600 transition-all duration-300 text-2xl transform hover:scale-110"
                data-testid="social-instagram"
                aria-label="Instagram"
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className="fab fa-instagram"></i>
              </a>
              <a 
                href={SOCIAL_LINKS.LINKEDIN} 
                className="social-icon text-blue-700 hover:text-blue-800 transition-all duration-300 text-2xl transform hover:scale-110"
                data-testid="social-linkedin"
                aria-label="LinkedIn"
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className="fab fa-linkedin"></i>
              </a>
            </div>
          </div>
        </div>

        {/* Copyright - Centered */}
        <div className="border-t border-border pt-8 mt-8 text-center" data-testid="footer-copyright">
          <p className="text-muted-foreground text-sm mb-4">© 2025 B4U Esports. All Rights Reserved.</p>

          {/* Pi Network badge */}
          <div className="flex items-center justify-center space-x-2 mb-3">
            <span className="text-muted-foreground text-sm">Powered by</span>
            <img
              src={BRAND_LOGOS.PI}
              alt="Pi Network"
              className="w-6 h-6 rounded-full"
              data-testid="pi-logo"
            />
            <span className="text-primary text-sm font-semibold">Pi Network</span>
          </div>

          {/* Version + trademark */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <p className="text-muted-foreground text-xs">PI NETWORK™ is a trademark of PI Community Company.</p>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/50 text-[10px] font-mono text-slate-400" data-testid="footer-version">
              v{APP_VERSION}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
