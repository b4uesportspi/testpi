# Changelog

All notable changes to this project will be documented in this file.

## 2025-10-20

### Fixed
- Resolved Vercel deployment duplicate build issue
  - Changed package.json build script from `node vercel-build.js` to `vite build`
  - Removed redundant `vercel-build` script that was causing duplicate builds
  - Removed server compilation from Vite build process (Vercel handles server files separately)
  - Corrected vercel.json configuration to exactly match the specified format
    - Restored the original builds array with both static and node builds
    - Restored rewrites configuration with proper source/destination format
    - distDir: "dist/public" (correct path for Vite output)
    - API rewrites point to "/api/main.ts"
    - Frontend rewrites point to "/index.html"
  - Ensured package.json dependencies are properly configured
  - This eliminates the "unexpected error" caused by double execution of build processes

### Changed
- Updated email templates to hide USDT values as per project specifications
  - Removed USD amount display from purchase confirmation emails
  - Removed USD amount display from admin purchase notification emails

## [Unreleased]

### Added
- Wallet balance integration using Stellar Horizon API
- New API endpoint `/api/user/balance` to fetch real-time Pi wallet balances
- New API endpoint `/api/user/connect-wallet` to manually connect wallet addresses
- Automatic wallet address extraction after first purchase
- UI enhancements to display actual Pi wallet balances in dashboard
- "Connect Wallet" button in quick actions section
- Enhanced wallet connection notifications with balance information

### Changed
- Updated README.md with documentation for wallet balance integration
- Enhanced dashboard UI to show real-time wallet balances
- Improved wallet connection flow with better user feedback
- Updated whitepaper documentation to include wallet balance integration
- Enhanced founder image styling in "Our History" page with improved visual appearance
- Improved security by removing insecure SSL certificate bypass

### Fixed
- Security vulnerability with NODE_TLS_REJECT_UNAUTHORIZED environment variable
- SSL certificate validation for all production database connections
- Founder image display issues in "Our History" page

## [1.2.0] - 2025-10-18

### Added
- Wallet balance integration using Stellar Horizon API
- New API endpoint `/api/user/balance` to fetch real-time Pi wallet balances
- New API endpoint `/api/user/connect-wallet` to manually connect wallet addresses
- Automatic wallet address extraction after first purchase
- UI enhancements to display actual Pi wallet balances in dashboard
- "Connect Wallet" button in quick actions section
- Enhanced wallet connection notifications with balance information

### Changed
- Updated README.md with documentation for wallet balance integration
- Enhanced dashboard UI to show real-time wallet balances
- Improved wallet connection flow with better user feedback
- Updated whitepaper documentation to include wallet balance integration

### Fixed
- None

## [1.1.0] - 2025-10-15

### Added
- Enhanced transaction display with detailed status indicators
- Filtering and sorting capabilities for transaction history
- Improved metadata display in transaction cards
- Creation and update timestamps for transactions
- Transaction and payment ID truncation for better readability
- PiNet metadata support for social sharing
- Comprehensive metadata configuration
- Documentation for Pi Developer Portal configuration

### Changed
- Enhanced error handling with request ID tracking
- Improved error logging with detailed context information
- More descriptive error messages
- Better responsive design for transaction display
- Enhanced security with Pi Platform API verification for rewarded ads
- Added adId parameter passing for verification
- Enhanced security by verifying ad status before rewarding users
- Added mediator_ack_status checking for proper ad verification

### Fixed
- Database connection error handling
- Proper error handling for network requests

## [1.0.0] - 2025-10-10

### Added
- Initial release of B4U Esports marketplace
- Pi Network authentication integration
- Gaming currency marketplace for PUBG UC and Mobile Legends Diamonds
- Real-time Pi pricing from CoinGecko API
- Secure payments with Pi Network integration
- Responsive design for mobile and desktop
- User profiles with game ID storage
- Transaction history tracking
- Email notifications for purchases
- Admin dashboard for package and transaction management
- Pi App Platform ads integration
- Token reward system for watching rewarded ads
- Multi-language support
- Dark/light mode theme switching
- Social media optimization with PiNet metadata