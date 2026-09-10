const fs = require('fs');

let content = fs.readFileSync('client/src/pages/dashboard.tsx', 'utf8');

// 1. Package Shop
content = content.replace(
  '<div className="lg:col-span-2" data-testid="package-shop">',
  `{activeSection === 'home' && (
    <div className="lg:col-span-2 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Home Banners Component placeholder */}
      <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-slate-900 to-slate-950 p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <i className="fas fa-gamepad text-8xl"></i>
        </div>
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2">Welcome to B4U Esports</h2>
        <p className="text-slate-300 max-w-lg">Your ultimate destination for premium gaming services, esports tournaments, and crypto rewards.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={() => { setActiveSection('shop'); document.querySelector('[data-testid="package-shop"]')?.scrollIntoView({ behavior: 'smooth' }); }} className="px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 font-bold text-white shadow-lg hover:shadow-purple-500/25 transition-all">Go to Shop</button>
          <button onClick={() => { setActiveSection('tournaments'); document.querySelector('[data-testid="tournament-section"]')?.scrollIntoView({ behavior: 'smooth' }); }} className="px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 font-bold text-white shadow-lg hover:shadow-amber-500/25 transition-all">Play Tournaments</button>
          <button onClick={() => { setActiveSection('wallet'); document.querySelector('[data-testid="dashboard-sidebar"]')?.scrollIntoView({ behavior: 'smooth' }); }} className="px-5 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 font-bold text-white shadow-lg hover:shadow-emerald-500/25 transition-all">My Wallet</button>
        </div>
      </div>
      <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-slate-900 to-slate-950 p-6 shadow-xl text-center">
         <h3 className="text-xl font-bold text-white mb-2"><i className="fas fa-bullhorn text-blue-400 mr-2"></i>News & Announcements</h3>
         <div className="bg-slate-800/50 rounded-xl p-3 text-sm text-cyan-200 font-medium">⚡ PUBG Tournament starts tomorrow! Ensure your roster is registered.</div>
         <div className="bg-slate-800/50 rounded-xl p-3 text-sm text-amber-200 font-medium mt-2">⚡ Pi payouts upgraded with instant processing for verified accounts.</div>
      </div>
    </div>
  )}
  <div className={"lg:col-span-2 " + (activeSection === 'shop' ? 'block animate-in fade-in' : 'hidden')} data-testid="package-shop">`
);

// 2. Tournament Section
content = content.replace(
  'className="mt-12"\n              data-testid="tournament-section"',
  'className={`mt-12 ${activeSection === \'tournaments\' ? \'block animate-in fade-in\' : \'hidden\'}`}\n              data-testid="tournament-section"'
);

// 3. Sidebar Container
// Replace `<div className="space-y-8" data-testid="dashboard-sidebar">`
// We want this container to only show when activeSection is 'home' OR 'wallet'
content = content.replace(
  '<div className="space-y-8" data-testid="dashboard-sidebar">',
  '<div className={`space-y-8 ${[\'home\', \'wallet\'].includes(activeSection) ? \'block animate-in fade-in slide-in-from-right-8\' : \'hidden\'}`} data-testid="dashboard-sidebar">'
);

// 4. Recent Purchases Feed - we want it only on 'home'
content = content.replace(
  '<RecentPurchasesFeed />',
  '<div className={activeSection === \'home\' ? \'block\' : \'hidden\'}><RecentPurchasesFeed /></div>'
);

// 5. User Tokens - we want it only on 'wallet'
content = content.replace(
  '<Card data-testid="user-tokens" className="relative overflow-hidden bg-gradient-to-br from-gray-900/95 to-gray-800/95 border-2 border-gradient-to-r from-yellow-500/30 to-amber-500/30 shadow-2xl hover:shadow-yellow-500/20 transition-all duration-500 transform hover:-translate-y-2 backdrop-blur-sm">',
  '<Card data-testid="user-tokens" className={`relative overflow-hidden bg-gradient-to-br from-gray-900/95 to-gray-800/95 border-2 border-gradient-to-r from-yellow-500/30 to-amber-500/30 shadow-2xl hover:shadow-yellow-500/20 transition-all duration-500 transform hover:-translate-y-2 backdrop-blur-sm ${activeSection === \'wallet\' ? \'block\' : \'hidden\'}`} style={{ display: activeSection === \'wallet\' ? \'block\' : \'none\' }}>'
);

// 6. User Statistics - only on 'wallet'
content = content.replace(
  '<Card data-testid="user-statistics" className="relative overflow-hidden bg-gradient-to-br from-gray-900/95 to-gray-800/95 border-2 border-gradient-to-r from-blue-500/30 to-indigo-500/30 shadow-2xl hover:shadow-blue-500/20 transition-all duration-500 transform hover:-translate-y-2 backdrop-blur-sm">',
  '<Card data-testid="user-statistics" className={`relative overflow-hidden bg-gradient-to-br from-gray-900/95 to-gray-800/95 border-2 border-gradient-to-r from-blue-500/30 to-indigo-500/30 shadow-2xl hover:shadow-blue-500/20 transition-all duration-500 transform hover:-translate-y-2 backdrop-blur-sm ${activeSection === \'wallet\' ? \'block\' : \'hidden\'}`} style={{ display: activeSection === \'wallet\' ? \'block\' : \'none\' }}>'
);

// 7. Recent Transactions - only on 'wallet'
content = content.replace(
  '<Card data-testid="recent-transactions" className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 shadow-xl">',
  '<Card data-testid="recent-transactions" className={`bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 shadow-xl ${activeSection === \'wallet\' ? \'block\' : \'hidden\'}`} style={{ display: activeSection === \'wallet\' ? \'block\' : \'none\' }}>'
);

// Also remove the "Full Profile" logout banner that they complained about.
// They said: "remove header note please logou before closing the app" Wait I already did that.

fs.writeFileSync('client/src/pages/dashboard.tsx', content);
console.log('Dashboard refactored successfully.');
