const fs = require('fs');

// Read the dashboard file
let content = fs.readFileSync('client/src/pages/dashboard.tsx', 'utf8');

// Remove merge conflict markers and keep the "Updated upstream" version
content = content.replace(/<<<<<<< Updated upstream[\s\S]*?=======[\s\S]*?>>>>>>> Stashed changes/g, '');

// Apply our modern UI/UX design changes
// User Tokens section
content = content.replace(
  /({\/\* User Tokens \*\/}\s*<Card data-testid="user-tokens">[\s\S]*?<\/Card>)/,
  `            {/* User Tokens */}
            <Card data-testid="user-tokens" className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-yellow-500 to-amber-600 flex items-center justify-center mr-3">
                      <i className="fas fa-coins text-white text-lg"></i>
                    </div>
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 to-amber-400">
                      Your Tokens
                    </span>
                  </div>
                  <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-2">
                  <div className="relative inline-block">
                    <p className="text-4xl font-extrabold text-yellow-400 drop-shadow-lg">{userTokens}</p>
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 flex items-center justify-center">
                      <i className="fas fa-plus text-white text-xs"></i>
                    </div>
                  </div>
                  <p className="text-sm text-gray-400 mt-2 font-medium">Tokens Available</p>
                  <div className="mt-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/20 transition-all duration-300"
                      onClick={() => {
                        // Scroll to ads section or trigger ads
                        const quickActionsSection = document.querySelector('[data-testid="quick-actions"]');
                        if (quickActionsSection) {
                          quickActionsSection.scrollIntoView({ behavior: 'smooth' });
                        }
                      }}
                    >
                      <i className="fas fa-plus-circle mr-2"></i>
                      Earn More Tokens
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>`
);

// User Statistics section
content = content.replace(
  /({\/\* User Statistics \*\/}\s*<Card data-testid="user-statistics">[\s\S]*?<\/Card>)/,
  `            {/* User Statistics */}
            <Card data-testid="user-statistics" className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 shadow-xl">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center mr-3">
                    <i className="fas fa-chart-line text-white text-lg"></i>
                  </div>
                  <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-300 to-indigo-400">
                    User Statistics
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700 hover:border-blue-500/50 transition-all duration-300">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center mr-2">
                          <i className="fas fa-exchange-alt text-blue-400 text-sm"></i>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Total Transactions</p>
                          <p className="font-bold text-white">{transactions?.length || 0}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700 hover:border-green-500/50 transition-all duration-300">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center mr-2">
                          <i className="fas fa-check-circle text-green-400 text-sm"></i>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Completed</p>
                          <p className="font-bold text-green-400">{completedTransactions}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700 hover:border-purple-500/50 transition-all duration-300">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center mr-2">
                          <i className="fas fa-coins text-purple-400 text-sm"></i>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Total Spent</p>
                          <p className="font-bold text-purple-400">{totalSpent.toFixed(2)} π</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700 hover:border-cyan-500/50 transition-all duration-300">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center mr-2">
                          <i className="fas fa-wallet text-cyan-400 text-sm"></i>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Pi Balance</p>
                          <p className="font-bold text-cyan-400">
                            {isBalanceHidden ? '•••••' : (walletBalance !== null ? walletBalance.toFixed(2) : 'N/A')} π
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Balance Visibility Toggle */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center">
                      <i className="fas fa-info-circle text-gray-500 text-sm mr-2"></i>
                      <p className="text-xs text-gray-500">
                        {walletBalance !== null 
                          ? "Balance updated from blockchain" 
                          : "Connect wallet to see actual Pi balance"}
                      </p>
                    </div>
                    <button 
                      onClick={() => setIsBalanceHidden(!isBalanceHidden)}
                      className="text-gray-500 hover:text-white transition-colors"
                      aria-label={isBalanceHidden ? "Show balance" : "Hide balance"}
                    >
                      {isBalanceHidden ? (
                        <EyeOffIcon className="h-4 w-4" />
                      ) : (
                        <EyeIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  
                  {/* Recent Transaction IDs */}
                  <div className="pt-3 border-t border-gray-700">
                    <h4 className="text-sm font-medium text-gray-400 mb-2 flex items-center">
                      <i className="fas fa-receipt text-gray-500 mr-2"></i>
                      Recent Transaction IDs
                    </h4>
                    {transactions && transactions.length > 0 ? (
                      <div className="space-y-2 max-h-32 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                        {transactions.slice(0, 5).map((tx, index) => (
                          <div key={tx.id} className="flex justify-between text-xs bg-gray-800/30 rounded p-2 hover:bg-gray-800/50 transition-colors">
                            <span className="text-gray-400">#{index + 1}:</span>
                            <span className="font-mono text-gray-300 truncate ml-2">{tx.paymentId.substring(0, 8)}...{tx.paymentId.substring(tx.paymentId.length - 8)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 italic">No transactions yet</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>`
);

// Quick Actions section
content = content.replace(
  /({\/\* Quick Actions \*\/}\s*<Card data-testid="quick-actions">[\s\S]*?<\/Card>)/,
  `            {/* Quick Actions */}
            <Card data-testid="quick-actions" className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 shadow-xl">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center mr-3">
                    <i className="fas fa-bolt text-white text-lg"></i>
                  </div>
                  <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-300 to-pink-400">
                    Quick Actions
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={() => setIsProfileModalOpen(true)}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
                  data-testid="button-edit-profile"
                >
                  <i className="fas fa-user mr-2"></i>
                  <span className="font-bold">
                    Edit Profile
                  </span>
                </Button>
                
                <AdsButton 
                  onReward={(rewardAmount) => {
                    // Refresh user data to get the actual updated token count from the backend
                    refreshUser().then((freshUser) => {
                      if (freshUser) {
                        // Update the local userTokens state with the actual token count from backend
                        setUserTokens(freshUser.tokens || 0);
                        setLastTokenUpdate(Date.now());
                        toast({
                          title: "Tokens Added!",
                          description: \`You earned \${rewardAmount} tokens! Total: \${freshUser.tokens || 0} tokens\`,
                        });
                      } else {
                        // Fallback to local calculation if refresh fails
                        const newTokenCount = userTokens + rewardAmount;
                        setUserTokens(newTokenCount);
                        setLastTokenUpdate(Date.now());
                        toast({
                          title: "Tokens Added!",
                          description: \`You earned \${rewardAmount} tokens! Total: \${newTokenCount} tokens\`,
                        });
                      }
                    }).catch((error) => {
                      // Fallback to local calculation if refresh fails
                      console.error('Error refreshing user data:', error);
                      const newTokenCount = userTokens + rewardAmount;
                      setUserTokens(newTokenCount);
                      setLastTokenUpdate(Date.now());
                      toast({
                        title: "Tokens Added!",
                        description: \`You earned \${rewardAmount} tokens! Total: \${newTokenCount} tokens\`,
                      });
                    });
                  }}
                />
                
                <Button 
                  variant="outline"
                  className="w-full border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20 transition-all duration-300"
                  onClick={() => {
                    // Scroll to the recent transactions section
                    const transactionsSection = document.querySelector('[data-testid="recent-transactions"]');
                    if (transactionsSection) {
                      transactionsSection.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  data-testid="button-view-history"
                >
                  <i className="fas fa-history mr-2"></i>View Transaction History
                </Button>
                
                {!user.walletAddress && completedTransactions > 0 && (
                  <div className="pt-2">
                    <Button 
                      onClick={handleConnectWallet}
                      className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <img 
                        src="https://b4uesports.com/wp-content/uploads/2025/10/piwalletlogob4uesports.png" 
                        alt="PI Wallet" 
                        className="mr-2 w-5 h-5"
                      />
                      Connect Wallet
                    </Button>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      Connect your wallet after your first purchase
                    </p>
                  </div>
                )}
                
                <Button 
                  onClick={handleLogout}
                  variant="destructive"
                  className="w-full bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 text-white shadow-lg hover:shadow-xl transition-all duration-300 animate-pulse"
                  data-testid="button-logout"
                >
                  <i className="fas fa-sign-out-alt mr-2"></i>Logout (Important!)
                </Button>
              </CardContent>
            </Card>`
);

// Referral Program section
content = content.replace(
  /({\/\* Referral Program \*\/}\s*<Card data-testid="referral-program">[\s\S]*?<\/Card>)/,
  `            {/* Referral Program */}
            <Card data-testid="referral-program" className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 shadow-xl">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-teal-600 flex items-center justify-center mr-3">
                    <i className="fas fa-user-friends text-white text-lg"></i>
                  </div>
                  <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-300 to-teal-400">
                    Referral Program
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gradient-to-r from-green-900/30 to-teal-900/30 border border-green-800/50 rounded-lg p-4">
                  <p className="text-sm text-green-300 flex items-start">
                    <i className="fas fa-gift text-green-400 mr-2 mt-1"></i>
                    <span>Invite friends to B4U Esports and earn <span className="font-bold">5 tokens</span> for each successful referral!</span>
                  </p>
                </div>
                
                <Dialog open={isReferralDialogOpen} onOpenChange={setIsReferralDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white">
                      <Share2Icon className="mr-2 h-4 w-4" />
                      Generate Referral Link
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md bg-white rounded-xl shadow-2xl border-0">
                    <DialogHeader className="bg-gradient-to-r from-green-500 to-teal-600 text-white p-4 rounded-t-xl -m-4 mb-4">
                      <DialogTitle className="text-xl font-bold flex items-center">
                        <Share2Icon className="mr-2 h-5 w-5" />
                        Share Your Referral Link
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="referral-code" className="text-sm font-medium text-gray-700">
                          Your Referral Code
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id="referral-code"
                            value={user?.referralCode || (user ? 'Generating your referral code...' : 'Loading...')}
                            readOnly
                            className="flex-1 font-mono"
                          />
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => {
                              if (user?.referralCode) {
                                navigator.clipboard.writeText(user.referralCode);
                                toast({
                                  title: "Copied!",
                                  description: "Referral code copied to clipboard",
                                });
                              }
                            }}
                            disabled={!user?.referralCode}
                          >
                            <CopyIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">
                          Referral Link
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            value={user?.referralCode ? \`\${window.location.origin}?ref=\${user.referralCode}\` : (user ? 'Generating your referral link...' : 'Loading...')}
                            readOnly
                            className="flex-1 font-mono text-xs"
                          />
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => {
                              if (user?.referralCode) {
                                navigator.clipboard.writeText(\`\${window.location.origin}?ref=\${user.referralCode}\`);
                                toast({
                                  title: "Copied!",
                                  description: "Referral link copied to clipboard",
                                });
                              }
                            }}
                            disabled={!user?.referralCode}
                          >
                            <CopyIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {(!user?.referralCode) && (
                        <div className="text-sm text-muted-foreground">
                          <p className="mb-2">Generating your referral code...</p>
                          <p>If this takes too long, try refreshing your profile:</p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-2"
                            onClick={async () => {
                              try {
                                await refreshUser();
                                toast({
                                  title: "Profile Refreshed",
                                  description: "Your profile data has been updated.",
                                });
                              } catch (error) {
                                toast({
                                  title: "Refresh Failed",
                                  description: "Failed to refresh profile data. Please try again.",
                                  variant: "destructive",
                                });
                              }
                            }}
                          >
                            Refresh Profile
                          </Button>
                        </div>
                      )}
                      
                      <div className="pt-2 text-xs text-muted-foreground">
                        <p className="mb-1"><strong>How it works:</strong></p>
                        <ol className="list-decimal list-inside space-y-1 ml-2">
                          <li>Share your referral link with friends</li>
                          <li>They sign up using your link</li>
                          <li>They complete their profile</li>
                          <li>You earn 5 tokens for each successful referral!</li>
                        </ol>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>`
);

// Track Your Order section
content = content.replace(
  /({\/\* Track Your Order \*\/}\s*<Card data-testid="track-order">[\s\S]*?<\/Card>)/,
  `            {/* Track Your Order */}
            <Card data-testid="track-order" className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 shadow-xl">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 flex items-center justify-center mr-3">
                    <i className="fas fa-search-location text-white text-lg"></i>
                  </div>
                  <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-300 to-orange-400">
                    Track Your Order
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="transactionId" className="block text-sm font-medium text-gray-400 mb-1">
                      Enter Transaction ID
                    </label>
                    <input
                      type="text"
                      id="transactionId"
                      placeholder="Enter your transaction ID"
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 text-white placeholder-gray-500"
                      value={trackTransactionId}
                      onChange={(e) => setTrackTransactionId(e.target.value)}
                    />
                  </div>
                  <Button 
                    onClick={handleTrackOrder}
                    className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                    disabled={!trackTransactionId.trim() || isTracking}
                  >
                    {isTracking ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i> Tracking...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-search mr-2"></i> Track Order
                      </>
                    )}
                  </Button>
                  
                  {trackResult && (
                    <div className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                      <h4 className="font-medium text-sm mb-3 text-green-400 flex items-center">
                        <i className="fas fa-info-circle mr-2"></i>Order Status
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Status:</span>
                          <span className={\`font-medium \${
                            trackResult.status === 'completed' ? 'text-green-500' : 
                            trackResult.status === 'pending' ? 'text-yellow-500' : 
                            trackResult.status === 'failed' ? 'text-red-500' : 'text-gray-500'
                          }\`}>
                            {trackResult.status === 'completed' ? '✅ Completed' : 
                             trackResult.status === 'pending' ? '🔄 Pending' : 
                             trackResult.status === 'failed' ? '❌ Failed' : trackResult.status}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Amount:</span>
                          <span className="text-green-400">{trackResult.piAmount} π</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Date:</span>
                          <span className="text-gray-300">{new Date(trackResult.createdAt).toLocaleString()}</span>
                        </div>
                        {trackResult.txid && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">TXID:</span>
                            <span className="font-mono text-xs text-gray-300">{trackResult.txid.substring(0, 8)}...{trackResult.txid.substring(trackResult.txid.length - 8)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {trackError && (
                    <div className="mt-4 p-3 bg-red-900/30 text-red-400 rounded-md text-sm border border-red-800/50">
                      <i className="fas fa-exclamation-circle mr-2"></i>
                      {trackError}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>`
);

// Recent Transactions section header
content = content.replace(
  /({\/\* Recent Transactions \*\/}\s*<Card data-testid="recent-transactions">[\s\S]*?<DialogTrigger asChild>)/,
  `            {/* Recent Transactions */}
            <Card data-testid="recent-transactions" className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 shadow-xl">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center mr-3">
                      <i className="fas fa-history text-white text-lg"></i>
                    </div>
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 to-purple-400">
                      Recent Transactions
                    </span>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl h-8 px-3 text-xs">
                        <FilterIcon className="mr-1 h-3 w-3" />
                        Filters
                      </Button>
                    </DialogTrigger>`
);

// Write the updated content back to the file
fs.writeFileSync('client/src/pages/dashboard.tsx', content);

console.log('Dashboard file updated successfully!');