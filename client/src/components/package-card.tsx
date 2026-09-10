import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';
import type { Package } from '@/types/pi-network';

interface PackageCardProps {
  package: Package;
  onPurchase: () => void;
  'data-testid'?: string;
}

export default function PackageCard({ package: pkg, onPurchase, 'data-testid': testId }: PackageCardProps) {
  const { t } = useLanguage();
  const isTestPackage = pkg.name === '0.06 UC';
  const packageImage = pkg.image;
  const displayPackageName = pkg.name.replace(/\$/g, '').replace(/\s*–\s*[\d.,]+$/, '').trim();
  const displayPiPrice = pkg.piPrice
    ? (pkg.piPrice < 0.1 ? `${pkg.piPrice.toFixed(4)} π` : `${pkg.piPrice.toFixed(1)} π`)
    : t('coming_soon');

  return (
    <motion.div
      whileTap={{ scale: 0.95 }}
      whileHover={{ y: -5, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      <Card className={`game-card h-full border-2 ${isTestPackage ? 'border-yellow-400' : 'border-purple-500'} rounded-2xl shadow-lg hover:shadow-cyan-500/20`} data-testid={testId}>
        {isTestPackage && (
          <div className="absolute top-0 left-0 right-0 bg-yellow-400 text-black text-xs font-bold py-1 px-2 text-center z-10 transform -rotate-6 translate-y-2">
            TEST PACKAGE
          </div>
        )}
        <CardContent className="p-3 sm:p-4">
          <div className="flex justify-center mb-2 sm:mb-3">
            <img
              src={packageImage}
              alt={`${pkg.name} Package`}
              className="w-full h-24 sm:h-32 object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'https://b4uesports.com/wp-content/uploads/2025/10/uc-removebg-preview.png';
              }}
              data-testid={`${testId}-image`}
            />
          </div>
          <div className="text-center mb-2 sm:mb-3" data-testid={`${testId}-game-title-container`}>
            <p className="text-sm font-bold">{displayPackageName}</p>
          </div>
          <div className={`text-center mb-2 sm:mb-3 ${isTestPackage ? 'opacity-75' : ''}`}>
            <p className={`text-lg font-bold text-green-400 font-mono ${isTestPackage ? 'italic' : ''}`} data-testid={`${testId}-pi-price`}>
              {displayPiPrice}
            </p>
          </div>
          <Button
            onClick={() => { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50); onPurchase(); }}
            className={`w-full h-8 text-sm transition-transform active:scale-95 rounded-xl ${isTestPackage ? 'bg-yellow-500 hover:bg-yellow-600 text-black font-bold' : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white'}`}
            data-testid={`${testId}-buy-button`}
          >
            {isTestPackage ? 'TEST PURCHASE' : t('purchase')}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
