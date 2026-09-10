import Navigation from '@/components/navigation';
import Footer from '@/components/footer';
import AnimatedPage from '@/components/animated-page';
import ParticleBackground from '@/components/particle-background';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocation } from 'wouter';
import { useState } from 'react';

export default function DataProtection() {
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
            <h1 className="text-4xl font-bold mb-4 highlighted-title">Data Protection Policy</h1>
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
              <CardTitle className="highlighted-title">1. Our Commitment to Data Protection</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">B4U Esports is committed to protecting your personal data and respecting your privacy rights. This Data Protection Policy outlines how we collect, process, store, and protect your information in compliance with applicable data protection laws and regulations.</p>
              <p className="enhanced-paragraph">We implement robust technical and organizational measures to ensure the security and confidentiality of your personal data throughout our systems and processes.</p>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="highlighted-title">2. Legal Basis for Processing</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">We process your personal data based on the following legal grounds:</p>
              <ul className="space-y-2">
                <li className="enhanced-paragraph"><strong>Consent:</strong> You have given clear consent for us to process your data for specific purposes</li>
                <li className="enhanced-paragraph"><strong>Contract Performance:</strong> Processing is necessary to fulfill our service obligations to you</li>
                <li className="enhanced-paragraph"><strong>Legal Obligations:</strong> We must process your data to comply with legal requirements</li>
                <li className="enhanced-paragraph"><strong>Legitimate Interests:</strong> Processing serves our legitimate business interests while respecting your rights</li>
                <li className="enhanced-paragraph"><strong>Vital Interests:</strong> Processing protects your essential interests or those of others</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="highlighted-title">3. Data Collection and Processing</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">We collect and process the following types of personal data:</p>
              <h4 className="highlighted-title">Identity Data:</h4>
              <ul className="space-y-2">
                <li className="enhanced-paragraph">Pi Network username and UID</li>
                <li className="enhanced-paragraph">Email address and phone number</li>
                <li className="enhanced-paragraph">Country and language preferences</li>
              </ul>
              <h4 className="highlighted-title">Gaming Data:</h4>
              <ul className="space-y-2">
                <li className="enhanced-paragraph">PUBG Mobile IGN and UID</li>
                <li className="enhanced-paragraph">Mobile Legends User ID and Zone ID</li>
                <li className="enhanced-paragraph">Clash of Clans email address</li>
                <li className="enhanced-paragraph">Gaming preferences and history</li>
              </ul>
              <h4 className="highlighted-title">Transaction Data:</h4>
              <ul className="space-y-2">
                <li className="enhanced-paragraph">Payment history and amounts</li>
                <li className="enhanced-paragraph">Pi Network transaction details</li>
                <li className="enhanced-paragraph">Purchase patterns and preferences</li>
              </ul>
              <h4 className="highlighted-title">Technical Data:</h4>
              <ul className="space-y-2">
                <li className="enhanced-paragraph">IP address and device information</li>
                <li className="enhanced-paragraph">Browser type and settings</li>
                <li className="enhanced-paragraph">Usage analytics and performance data</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="highlighted-title">4. Data Security Measures</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">We implement comprehensive security measures to protect your data:</p>
              <h4 className="highlighted-title">Technical Safeguards:</h4>
              <ul className="space-y-2">
                <li className="enhanced-paragraph">End-to-end encryption for data transmission</li>
                <li className="enhanced-paragraph">Secure database storage with encryption at rest</li>
                <li className="enhanced-paragraph">Multi-factor authentication for admin access</li>
                <li className="enhanced-paragraph">Regular security audits and penetration testing</li>
                <li className="enhanced-paragraph">Automated backup and disaster recovery systems</li>
              </ul>
              <h4 className="highlighted-title">Organizational Safeguards:</h4>
              <ul className="space-y-2">
                <li className="enhanced-paragraph">Limited access to personal data on a need-to-know basis</li>
                <li className="enhanced-paragraph">Regular staff training on data protection</li>
                <li className="enhanced-paragraph">Confidentiality agreements for all personnel</li>
                <li className="enhanced-paragraph">Incident response procedures</li>
                <li className="enhanced-paragraph">Data protection impact assessments</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="highlighted-title">5. Data Retention and Deletion</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">We retain your personal data only for as long as necessary:</p>
              <ul className="space-y-2">
                <li className="enhanced-paragraph"><strong>Active Accounts:</strong> Data retained while your account is active and in use</li>
                <li className="enhanced-paragraph"><strong>Transaction Records:</strong> Kept for 7 years for legal and tax compliance</li>
                <li className="enhanced-paragraph"><strong>Marketing Data:</strong> Retained until you withdraw consent or object</li>
                <li className="enhanced-paragraph"><strong>Support Records:</strong> Kept for 3 years after last contact</li>
                <li className="enhanced-paragraph"><strong>Legal Hold:</strong> Extended retention if required for legal proceedings</li>
              </ul>
              <p className="enhanced-paragraph mt-4">When retention periods expire, we securely delete or anonymize your data using industry-standard methods.</p>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="highlighted-title">6. Your Data Protection Rights</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">You have the following rights regarding your personal data:</p>
              <ul className="space-y-2">
                <li className="enhanced-paragraph"><strong>Right of Access:</strong> Request information about your personal data we process</li>
                <li className="enhanced-paragraph"><strong>Right of Rectification:</strong> Correct inaccurate or incomplete data</li>
                <li className="enhanced-paragraph"><strong>Right of Erasure:</strong> Request deletion of your personal data ("right to be forgotten")</li>
                <li className="enhanced-paragraph"><strong>Right to Restrict Processing:</strong> Limit how we use your data</li>
                <li className="enhanced-paragraph"><strong>Right to Data Portability:</strong> Receive your data in a structured, machine-readable format</li>
                <li className="enhanced-paragraph"><strong>Right to Object:</strong> Object to processing based on legitimate interests</li>
                <li className="enhanced-paragraph"><strong>Right to Withdraw Consent:</strong> Withdraw consent for consent-based processing</li>
              </ul>
              <p className="enhanced-paragraph mt-4">To exercise these rights, contact us at <a href="mailto:info@b4uesports.com" className="text-primary">info@b4uesports.com</a></p>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="highlighted-title">7. International Data Transfers</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">When we transfer your data internationally, we ensure adequate protection through:</p>
              <ul className="space-y-2">
                <li className="enhanced-paragraph"><strong>Adequacy Decisions:</strong> Transfers to countries with adequate data protection laws</li>
                <li className="enhanced-paragraph"><strong>Standard Contractual Clauses:</strong> EU-approved clauses for international transfers</li>
                <li className="enhanced-paragraph"><strong>Binding Corporate Rules:</strong> Internal rules ensuring consistent protection</li>
                <li className="enhanced-paragraph"><strong>Certification Schemes:</strong> Industry-recognized data protection certifications</li>
                <li className="enhanced-paragraph"><strong>Codes of Conduct:</strong> Adherence to approved industry standards</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="highlighted-title">8. Third-Party Data Sharing</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">We share your data with third parties only when necessary and with appropriate safeguards:</p>
              <h4 className="highlighted-title">Service Providers:</h4>
              <ul className="space-y-2">
                <li className="enhanced-paragraph">Cloud hosting and storage providers</li>
                <li className="enhanced-paragraph">Email and communication services</li>
                <li className="enhanced-paragraph">Analytics and monitoring tools</li>
                <li className="enhanced-paragraph">Customer support platforms</li>
              </ul>
              <h4 className="highlighted-title">Game Publishers:</h4>
              <ul className="space-y-2">
                <li className="enhanced-paragraph">PUBG Mobile (Tencent/Krafton) for UC delivery</li>
                <li className="enhanced-paragraph">Mobile Legends (Moonton) for Diamond delivery</li>
              </ul>
              <h4 className="highlighted-title">Payment Processors:</h4>
              <ul className="space-y-2">
                <li className="enhanced-paragraph">Pi Network for authentication and payments</li>
              </ul>
              <p className="enhanced-paragraph mt-4">All third parties are contractually obligated to protect your data and use it only for specified purposes.</p>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="highlighted-title">9. Data Breach Response</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">In the event of a data breach, we have established procedures to:</p>
              <ul className="space-y-2">
                <li className="enhanced-paragraph"><strong>Detection:</strong> Automated monitoring systems detect potential breaches</li>
                <li className="enhanced-paragraph"><strong>Assessment:</strong> Rapid evaluation of breach scope and impact</li>
                <li className="enhanced-paragraph"><strong>Containment:</strong> Immediate steps to stop the breach and secure systems</li>
                <li className="enhanced-paragraph"><strong>Notification:</strong> Authorities notified within 72 hours if required</li>
                <li className="enhanced-paragraph"><strong>Communication:</strong> Affected users informed without undue delay</li>
                <li className="enhanced-paragraph"><strong>Remediation:</strong> Steps taken to prevent future occurrences</li>
                <li className="enhanced-paragraph"><strong>Documentation:</strong> Full incident report and lessons learned</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="highlighted-title">10. Privacy by Design</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">We implement privacy by design principles throughout our operations:</p>
              <ul className="space-y-2">
                <li className="enhanced-paragraph"><strong>Data Minimization:</strong> Collect only data necessary for our services</li>
                <li className="enhanced-paragraph"><strong>Purpose Limitation:</strong> Use data only for stated purposes</li>
                <li className="enhanced-paragraph"><strong>Storage Limitation:</strong> Retain data only as long as necessary</li>
                <li className="enhanced-paragraph"><strong>Accuracy:</strong> Ensure data is accurate and up-to-date</li>
                <li className="enhanced-paragraph"><strong>Security:</strong> Implement appropriate technical and organizational measures</li>
                <li className="enhanced-paragraph"><strong>Accountability:</strong> Demonstrate compliance with data protection principles</li>
                <li className="enhanced-paragraph"><strong>Transparency:</strong> Provide clear information about data processing</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="highlighted-title">11. Children's Data Protection</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">We take special care to protect children's personal data:</p>
              <ul className="space-y-2">
                <li className="enhanced-paragraph">We do not knowingly collect data from children under 13</li>
                <li className="enhanced-paragraph">Enhanced verification procedures for users under 18</li>
                <li className="enhanced-paragraph">Parental consent mechanisms where required</li>
                <li className="enhanced-paragraph">Additional security measures for young users</li>
                <li className="enhanced-paragraph">Regular reviews of age verification processes</li>
                <li className="enhanced-paragraph">Immediate deletion if we discover underage data collection</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="page-card">
            <CardHeader>
              <CardTitle className="highlighted-title">12. Contact and Complaints</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="enhanced-paragraph">For data protection inquiries or complaints:</p>
              <div className="section-border bg-muted p-4 rounded-lg mt-4">
                <p className="font-semibold enhanced-paragraph"><strong>Data Protection Officer</strong></p>
                <p className="enhanced-paragraph">B4U Esports</p>
                <p className="enhanced-paragraph">Email: <a href="mailto:info@b4uesports.com" className="text-primary">info@b4uesports.com</a></p>
                <p className="enhanced-paragraph">Phone: <a href="tel:+97517875099" className="text-primary">+975 17875099</a></p>
                <p className="enhanced-paragraph">Response Time: Within 30 days</p>
              </div>
              <p className="enhanced-paragraph mt-4">You also have the right to lodge a complaint with your local data protection authority if you believe we have not addressed your concerns adequately.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </AnimatedPage>
  );
}
