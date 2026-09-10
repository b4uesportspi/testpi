const fs = require('fs');

// 1. Fix Dashboard
let dashboard = fs.readFileSync('client/src/pages/dashboard.tsx', 'utf8');

// Remove the 3 buttons
const buttonsHTML = `<div className="mt-6 flex flex-wrap gap-3">
          <button onClick={() => { setActiveSection('shop'); document.querySelector('[data-testid="package-shop"]')?.scrollIntoView({ behavior: 'smooth' }); }} className="px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 font-bold text-white shadow-lg hover:shadow-purple-500/25 transition-all">Go to Shop</button>
          <button onClick={() => { setActiveSection('tournaments'); document.querySelector('[data-testid="tournament-section"]')?.scrollIntoView({ behavior: 'smooth' }); }} className="px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 font-bold text-white shadow-lg hover:shadow-amber-500/25 transition-all">Play Tournaments</button>
          <button onClick={() => { setActiveSection('wallet'); document.querySelector('[data-testid="dashboard-sidebar"]')?.scrollIntoView({ behavior: 'smooth' }); }} className="px-5 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 font-bold text-white shadow-lg hover:shadow-emerald-500/25 transition-all">My Wallet</button>
        </div>`;
dashboard = dashboard.replace(buttonsHTML, '');

// Fix wrapper overlap for bottom nav
dashboard = dashboard.replace(
  '<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">',
  '<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-32 md:pb-8">'
);

// Fix package-shop / tournament condition
dashboard = dashboard.replace(
  '<div className={"lg:col-span-2 " + (activeSection === \'shop\' ? \'block animate-in fade-in\' : \'hidden\')} data-testid="package-shop">',
  '<div className={`lg:col-span-2 ${[\'shop\', \'tournaments\'].includes(activeSection) ? \'block\' : \'hidden\'}`}>\n<div className={activeSection === \'shop\' ? \'block animate-in fade-in\' : \'hidden\'} data-testid="package-shop">'
);

// Close package shop div right before Tournament Section
dashboard = dashboard.replace(
  '{/* Tournament Section */}',
  '</div>\n            {/* Tournament Section */}'
);

fs.writeFileSync('client/src/pages/dashboard.tsx', dashboard);
console.log('Dashboard updated.');

// 2. Fix Bottom Nav
let bottomNav = fs.readFileSync('client/src/components/bottom-nav.tsx', 'utf8');

bottomNav = bottomNav.replace(
  'px-2 py-3 safe-area-bottom',
  'px-2 py-2 safe-area-bottom'
);
bottomNav = bottomNav.replace(
  'w-10 h-10',
  'w-9 h-9'
);
bottomNav = bottomNav.replace(
  'w-10 h-10',
  'w-9 h-9'
);
bottomNav = bottomNav.replace(
  'w-10 h-10',
  'w-9 h-9'
);
bottomNav = bottomNav.replace(
  'w-10 h-10',
  'w-9 h-9'
);
bottomNav = bottomNav.replace(
  'w-14 h-14',
  'w-12 h-12'
);
bottomNav = bottomNav.replace(
  '-top-6',
  '-top-5'
);

fs.writeFileSync('client/src/components/bottom-nav.tsx', bottomNav);
console.log('Bottom Nav updated.');
