const fs = require('fs');

let dashboard = fs.readFileSync('client/src/pages/dashboard.tsx', 'utf8');

// 1. Remove "Edit Profile" button from Quick Actions
const editProfileStr = `                <Button 
                  onClick={() => setIsProfileModalOpen(true)}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
                  data-testid="button-edit-profile"
                >
                  <i className="fas fa-user mr-2"></i>
                  <span className="font-bold">
                    Edit Profile
                  </span>
                </Button>
                `;
dashboard = dashboard.replace(editProfileStr, '');

// 2. Add logout to Live Pi Price
const piPriceTarget = `<div className="flex items-center">
                  <p className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-100 mr-2">
                    \${piPrice.price.toFixed(3)}
                  </p>
                  <i className="fas fa-chart-line text-green-400 text-xs"></i>
                </div>`;

const piPriceReplacement = `<div className="flex items-center gap-3">
                  <div className="flex items-center">
                    <p className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-100 mr-1.5">
                      \${piPrice.price.toFixed(3)}
                    </p>
                    <i className="fas fa-chart-line text-green-400 text-xs"></i>
                  </div>
                  <div className="w-px h-4 bg-gray-700"></div>
                  <button 
                    onClick={() => {
                      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([50, 100, 50]);
                      logout();
                    }}
                    className="flex items-center justify-center p-1.5 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                    title="Logout"
                  >
                    <i className="fas fa-sign-out-alt text-sm"></i>
                  </button>
                </div>`;
                
dashboard = dashboard.replace(piPriceTarget, piPriceReplacement);

fs.writeFileSync('client/src/pages/dashboard.tsx', dashboard);
console.log('Dashboard updated.');

// 3. Remove Logout from Profile Modal
let profileModal = fs.readFileSync('client/src/components/profile-modal.tsx', 'utf8');

const logoutBtnTarget = `<button
                    type="button"
                    onClick={() => {
                      if (navigator.vibrate) navigator.vibrate([50, 100, 50]);
                      logout();
                      onClose();
                    }}
                    className="w-full flex items-center p-3 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 rounded-lg transition-colors"
                  >
                    <i className="fas fa-sign-out-alt w-6 text-center"></i>
                    <span className="ml-3 font-bold text-sm">Logout</span>
                  </button>`;

profileModal = profileModal.replace(logoutBtnTarget, '');

fs.writeFileSync('client/src/components/profile-modal.tsx', profileModal);
console.log('Profile Modal updated.');
