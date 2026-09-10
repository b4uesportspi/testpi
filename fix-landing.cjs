const fs = require('fs');

// 1. Remove "Logout" from dashboard.tsx
let dashboard = fs.readFileSync('client/src/pages/dashboard.tsx', 'utf8');

const logoutBtnTarget = `                <Button 
                  onClick={handleLogout}
                  variant="destructive"
                  className="w-full bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                  data-testid="button-logout"
                >
                  <i className="fas fa-sign-out-alt mr-2"></i>Logout
                </Button>`;

dashboard = dashboard.replace(logoutBtnTarget, '');

fs.writeFileSync('client/src/pages/dashboard.tsx', dashboard);
console.log('Dashboard updated.');

// 2. Remove animated background from landing.tsx
let landing = fs.readFileSync('client/src/pages/landing.tsx', 'utf8');

const bgTarget = `<div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-lg blur opacity-70 animate-pulse"></div>`;

landing = landing.replace(bgTarget, '');

fs.writeFileSync('client/src/pages/landing.tsx', landing);
console.log('Landing updated.');
