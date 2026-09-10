import fs from 'fs';
import path from 'path';

// Extract FAQ data from the FAQs page component
const faqs = [
  {
    question: "What is B4U Esports?",
    answer: "B4U Esports is a Pi Network-integrated marketplace that allows gamers to purchase in-game currencies (PUBG UC and Mobile Legends Diamonds) using Pi coins. We provide a secure, fast, and innovative platform for digital gaming transactions."
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
    answer: "All sales of digital in-game currency are final and non-refundable. This is because digital goods cannot be returned once delivered. Please verify all information before completing your purchase."
  },
  {
    question: "What games do you support?",
    answer: "We currently support PUBG Mobile (UC) and Mobile Legends: Bang Bang (Diamonds). We're continuously working to expand our game support based on user demand."
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
    question: "How do I update my profile information?",
    answer: "After logging in, go to your dashboard and click on the 'Edit Profile' section. You can update your email, phone number, country, language, and game account information there."
  }
];

console.log('\nB4U Esports - Frequently Asked Questions');
console.log('=======================================\n');

faqs.forEach((faq, index) => {
  console.log(`${index + 1}. ${faq.question}`);
  console.log(`   ${faq.answer}\n`);
});

console.log('Still Have Questions?');
console.log('====================');
console.log('Contact Support:');
console.log('Email: info@b4uesports.com');
console.log('Phone: +975 17875099');
console.log('Response Time: Within 24 hours\n');