# B4U Esports - Pi Network Gaming Marketplace

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Pi Network](https://img.shields.io/badge/Pi%20Network-Mainnet-brightgreen)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%20Mode-blue)](#)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-black)](#)

A cutting-edge gaming currency marketplace built on the Pi Network, enabling users to purchase PUBG UC, Mobile Legends Diamonds, and Clash of Clans Gold Pass using Pi cryptocurrency. The platform features secure authentication, real-time Pi price tracking, and a comprehensive transaction system.

## 📋 Table of Contents

- [🚀 Key Features](#-key-features)
- [🏗️ Architecture Overview](#-architecture-overview)
- [📁 Project Structure](#-project-structure)
- [🧩 Core Components](#-core-components)
- [📊 System Workflow](#-system-workflow)
- [🔗 API Endpoints](#-api-endpoints)
- [🔐 Security Architecture](#-security-architecture)
- [⚡ Performance & Caching](#-performance--caching)
- [🧪 Testing Architecture](#-testing-architecture)
- [📈 Monitoring & Analytics](#-monitoring--analytics)
- [🔧 Environment Variables](#-environment-variables)
- [🚀 Deployment](#-deployment)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)
- [🙏 Acknowledgments](#-acknowledgments)

## 🚀 Key Features

- **Pi Network Integration**: Full authentication and payment processing with Pi SDK
- **Multi-Game Support**: PUBG Mobile, Mobile Legends, and Clash of Clans gaming currency packages
- **Real-time Pricing**: Live Pi/USD exchange rates from CoinGecko API
- **Secure Transactions**: End-to-end encrypted payment processing
- **User Profiles**: Complete profile management with game account linking
- **Transaction History**: Detailed purchase history with status tracking
- **Referral Program**: Earn tokens by inviting friends to the platform
- **Wallet Balance Integration**: Real-time Pi wallet balance fetching using Stellar Horizon API
- **Responsive Design**: Mobile-first approach with modern UI components
- **Admin Dashboard**: Comprehensive backend management system
- **Enhanced Security**: Proper SSL certificate validation and secure environment handling
- **PiNet Integration**: Full support for PiNet URLs with metadata for social sharing

## 🏗️ Architecture Overview

### Modern System Architecture

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[Pi Network Browser] --> B[React Client App]
        B --> C{Client Services}
        C --> D[Pi Network SDK]
        C --> E[React Query]
        C --> F[Custom Hooks]
    end

    subgraph "API Gateway"
        G[Vercel Serverless Functions]
    end

    subgraph "Business Logic Layer"
        G --> H{API Services}
        H --> I[Authentication Service]
        H --> J[Payment Service]
        H --> K[User Management]
        H --> L[Package Management]
        H --> M[Transaction Service]
        H --> N[Referral Service]
    end

    subgraph "Data & External Services"
        I --> O[(PostgreSQL Database)]
        J --> P[Pi Network API]
        K --> O
        L --> O
        M --> O
        N --> O
        G --> Q[CoinGecko API]
        G --> R[Stellar Horizon API]
        G --> S[EmailJS Service]
    end

    subgraph "Admin & Monitoring"
        T[Admin Dashboard] --> G
        U[Logging & Monitoring] --> G
    end

    style A fill:#4F46E5,stroke:#000,color:#fff
    style B fill:#818CF8,stroke:#000,color:#fff
    style G fill:#10B981,stroke:#000,color:#fff
    style O fill:#F59E0B,stroke:#000,color:#fff
    style P fill:#EF4444,stroke:#000,color:#fff
    style Q fill:#0EA5E9,stroke:#000,color:#fff
    style R fill:#8B5CF6,stroke:#000,color:#fff
    style S fill:#EC4899,stroke:#000,color:#fff
    style T fill:#64748B,stroke:#000,color:#fff
```

### Data Flow Architecture

```mermaid
sequenceDiagram
    participant User
    participant Client
    participant API
    participant Services
    participant Database
    participant External

    User->>Client: Interacts with UI
    Client->>API: HTTP Requests
    API->>Services: Business Logic
    Services->>Database: Data Operations
    Services->>External: External API Calls
    External-->>Services: Responses
    Database-->>Services: Data
    Services-->>API: Processed Data
    API-->>Client: JSON Response
    Client-->>User: Updated UI
```

### Component Architecture

```mermaid
graph TD
    A[Main Application] --> B[Navigation Component]
    A --> C[Landing Page]
    A --> D[Dashboard]
    A --> E[Authentication]
    A --> F[Admin Panel]
    
    D --> G[Package Browser]
    D --> H[User Profile]
    D --> I[Transaction History]
    D --> J[Referral System]
    D --> K[Wallet Integration]
    
    G --> L[PUBG Packages]
    G --> M[MLBB Packages]
    G --> N[COC Packages]
    
    H --> O[Profile Editor]
    H --> P[Game Accounts]
    
    I --> Q[Purchase History]
    I --> R[Payment Status]
    
    J --> S[Referral Code]
    J --> T[Referral Stats]
    
    K --> U[Wallet Balance]
    K --> V[Wallet Connection]
    
    F --> W[Package Management]
    F --> X[User Management]
    F --> Y[Transaction Monitoring]
    F --> Z[Analytics Dashboard]
```

## 📁 Project Structure

```
b4u-esports/
├── api/                         # Vercel serverless functions
│   ├── main.ts                 # Main API handler with routing
│   └── tsconfig.json           # TypeScript configuration
├── attached_assets/             # Project documentation and assets
│   └── Pasted-Project-B4U-Esports-Pi-Network-Integrated-Marketplace-User-Portal-1-Objective-Develop-a-c-1758470545085_1758470545088.txt
├── client/                     # Frontend React application
│   ├── public/                 # Static assets
│   │   ├── documents/          # Documentation files
│   │   │   └── b4u-esports-whitepaper.md
│   │   └── image-test.html     # Image testing file
│   └── src/
│       ├── components/         # Reusable UI components
│       │   ├── ui/             # UI component library
│       │   ├── admin-login-modal.tsx
│       │   ├── ads-button.tsx
│       │   ├── country-selector.tsx
│       │   ├── footer.tsx
│       │   ├── navigation.tsx
│       │   ├── package-card.tsx
│       │   ├── particle-background.tsx
│       │   ├── profile-modal.tsx
│       │   └── purchase-modal.tsx
│       ├── hooks/              # Custom React hooks
│       │   ├── use-mobile.tsx
│       │   ├── use-pi-ads.ts
│       │   ├── use-pi-network.tsx
│       │   ├── use-pi-price.tsx
│       │   └── use-toast.ts
│       ├── lib/                # Utility functions and SDKs
│       │   ├── constants.ts
│       │   ├── pi-sdk.ts
│       │   ├── queryClient.ts
│       │   └── utils.ts
│       ├── pages/              # Page components
│       │   ├── about-us.tsx
│       │   ├── admin.tsx
│       │   ├── dashboard.tsx
│       │   ├── data-protection.tsx
│       │   ├── debug.tsx
│       │   ├── faqs.tsx
│       │   ├── landing.tsx
│       │   ├── not-found.tsx
│       │   ├── our-history.tsx
│       │   ├── privacy-policy.tsx
│       │   ├── refund-policy.tsx
│       │   ├── terms-of-service.tsx
│       │   ├── user-agreement.tsx
│       │   └── whitepaper.tsx
│       ├── types/              # TypeScript type definitions
│       │   └── pi-network.ts
│       ├── App.tsx             # Main application component
│       ├── index.css           # Global CSS styles
│       └── main.tsx            # React entry point
├── migrations/                 # Database migration files
│   ├── meta/                   # Migration metadata
│   │   ├── 0000_snapshot.json
│   │   └── _journal.json
│   ├── 0000_colossal_wong.sql
│   ├── 0001_add_tokens_to_users.sql
│   ├── 0002_make_wallet_address_nullable.sql
│   ├── 0003_add_referral_code_generation.sql
│   ├── 0004_add_referral_code_constraints.sql  // Added unique constraint and index for referral codes
│   ├── 0004_add_referred_by_column.sql  // Added referred_by column to users table
│   ├── 0005_create_referral_codes_table.sql  // Created separate referral_codes table
│   ├── 0006_add_referral_code_generation_trigger.sql  // Added referral code generation functions and triggers
├── public/                     # Public assets
│   └── validation-key.txt      # Pi Network validation key
├── server/                     # Backend services and utilities
│   ├── services/               # Email and notification services
│   │   ├── email.ts
│   │   ├── pi-network.ts
│   │   └── pricing.ts
│   ├── db.ts                   # Database connection and setup
│   ├── index.ts                # Server entry point
│   ├── init-db.ts              # Database initialization
│   ├── migrate.ts              # Database migrations
│   ├── routes.ts               # API route definitions
│   ├── seed.ts                 # Database seeding
│   ├── setup-db.ts             # Database setup
│   ├── storage.ts              # Data access layer
│   ├── test-db.ts              # Database testing
│   └── vite.ts                 # Vite server configuration
├── shared/                     # Shared code between frontend and backend
│   ├── schema.ts               # Database schema definitions
│   └── tsconfig.json           # Shared TypeScript configuration
├── ACTION_ITEMS_PI_AUTH_FIX.md
├── ADS_IMPLEMENTATION_SUMMARY.md
├── ALL_CHANGES_SUMMARY.md
├── B4U_ESPORTS_PIOS_BRAINSTORM.md
├── CHANGELOG.md
├── CHANGES_SUMMARY.md
├── COMMIT_MESSAGE.md
├── COMPREHENSIVE_FIX_SUMMARY.md
├── COMPREHENSIVE_PI_AUTH_FIX.md
├── DATABASE_CONFIGURATION.md
├── DATABASE_MIGRATION_FIX.md
├── DATABASE_SETUP_GUIDE.md
├── EMAILJS_ALL_TEMPLATES_CONFIGURATION.md
├── EMAILJS_PRIVATE_KEY_FIX.md
├── EMAILJS_TEMPLATE_CONFIGURATION.md
├── EMAILJS_TEMPLATE_FIX_INSTRUCTIONS.md
├── EMAILJS_TEMPLATE_UPDATE_GUIDE.md
├── EMAIL_CONFIGURATION_FIX.md
├── EMAIL_CONFIGURATION_STATUS.md
├── EMAIL_FUNCTIONALITY_STATUS.md
├── FINAL_PI_AUTH_FIX_SUMMARY.md
├── FINAL_PI_BROWSER_AUTH_FIX_SUMMARY.md
├── FINAL_PROFILE_FIX_SUMMARY.md
├── FINAL_PURCHASE_EMAIL_FIX_SUMMARY.md
├── FINAL_SUMMARY.md
├── FIX_SUMMARY.md
├── IMMEDIATE_ACTION_REQUIRED.md
├── IMMEDIATE_DATABASE_FIX.md
├── IMPLEMENTATION_SUMMARY.md
├── IMPROVEMENTS_IMPLEMENTATION_SUMMARY.md
├── JWT_TOKEN_FIX.md
├── ORDER_CONFIRMATION_USAGE_EXAMPLE.ts
├── PAYMENT_CREATE_LOOP_FIX.md
├── PI_AUTH_ENDPOINT_GUIDE.md   # Guide for calling auth endpoint
├── PINET_ENDPOINT_SUMMARY.md
├── PINET_METADATA_IMPLEMENTATION.md
├── PIOS_IMPLEMENTATION_DECISION.md
├── PI_AUTH_FIX_SOLUTION.md
├── PI_AUTH_FIX_SUMMARY.md
├── PI_BROWSER_AUTH_FIX.md
├── PI_DEVELOPER_PORTAL_CONFIGURATION.md
├── PI_NETWORK_TRADEMARK_COMPLIANCE_CHANGES.md
├── PI_NETWORK_TRADEMARK_COMPLIANCE_REPORT.md
├── PROFILE_EMAIL_CONFIGURATION.md
├── PROFILE_EMAIL_STATUS.md
├── PROFILE_EMAIL_WORKING.md
├── PROFILE_FIX_INSTRUCTIONS.md
├── PROFILE_FIX_SUMMARY.md
├── PROFILE_SAVING_FIX.md
├── PROFILE_UPDATE_EMAIL_SUMMARY.md
├── PURCHASE_EMAIL_FIX_README.md
├── README.md
├── TRANSACTION_ENHANCEMENTS_SUMMARY.md
├── UNIFIED_ORDER_CONFIRMATION_TEMPLATE.html
├── UNIFIED_ORDER_CONFIRMATION_TEMPLATE_COMPLETE.html
├── UNIFIED_ORDER_CONFIRMATION_TEMPLATE_SETUP.md
├── WALLET_INTEGRATION.md
├── apply-migration.js
├── build.js
├── check-db-schema.ts
├── check-db-usage.ts
├── components.json
├── create-admin.ts
├── deploy-token-fix.js
├── drizzle.config.ts
├── package-lock.json
├── package.json
├── pinet-metadata.json
├── postcss.config.js
├── replit.md
├── show-faqs.ts
├── tailwind.config.ts
├── test-domain.js
├── test-email.ts
├── test-env-variables.js
├── test-env.ts
├── test-pi-config.ts
├── test-pinet-meta.ts
├── test-profile-endpoint.ts
├── test-profile-saving.ts
├── test-purchase-emails.ts
├── tsconfig.json
├── vercel-build.js
├── vercel.json
├── vite.config.js
└── vite.config.ts
```

## 🧩 Core Components

### Pi Network Integration

The platform integrates with Pi Network through the official Pi SDK for authentication and payments. Additionally, it uses the Stellar Horizon API to fetch real-time wallet balances, providing users with up-to-date information about their Pi holdings directly in the dashboard.

### Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant PiNetwork
    
    User->>Frontend: Click "Login with Pi"
    Frontend->>PiNetwork: pi.authenticate()
    PiNetwork-->>Frontend: Access Token
    Frontend->>Backend: POST /api/auth/pi with token
    Backend->>PiNetwork: Verify token
    PiNetwork-->>Backend: User data
    Backend->>Database: Create/Update user
    Backend-->>Frontend: JWT + User data
    Frontend->>User: Authenticated session
```

### Payment Processing

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant PiNetwork
    
    User->>Frontend: Select package + Click "Buy"
    Frontend->>Backend: Create payment intent
    Backend->>PiNetwork: pi.createPayment()
    PiNetwork-->>Frontend: Payment object
    Frontend->>User: Show payment approval
    User->>PiNetwork: Approve payment
    PiNetwork->>Backend: onReadyForServerApproval
    Backend->>PiNetwork: Approve payment
    PiNetwork->>Backend: onReadyForServerCompletion
    Backend->>PiNetwork: Complete payment
    Backend->>Database: Record transaction
    Backend->>EmailJS: Send confirmation
```

### Referral System Architecture

```mermaid
graph TD
    A[User Registration] --> B{Referral Code Check}
    B -->|New User| C[Generate Unique Code]
    B -->|Referred User| D[Link to Referrer]
    C --> E[Store in referral_codes Table]
    D --> F[Update referred_by Field]
    E --> G[Referral Code Ready]
    F --> G
    G --> H[User Dashboard]
    
    H --> I[Display Referral Code]
    H --> J[Show Referral Stats]
    H --> K[Track Referrals]
    
    I --> L[Copy & Share]
    J --> M[Earned Tokens]
    J --> N[Referral Count]
    K --> O[Reward Distribution]
    
    O --> P[+5 Tokens per Referral]
    P --> Q[Update User Tokens]
```

### Database Schema Architecture

```mermaid
erDiagram
    APP_USERS ||--o{ REFERRAL_CODES : has
    APP_USERS ||--o{ TRANSACTIONS : makes
    APP_PACKAGES ||--o{ TRANSACTIONS : includes
    APP_USERS ||--o{ ADMIN_USERS : "can be"
    
    APP_USERS {
        varchar id PK
        text pi_uid UK
        text username
        text email
        text phone
        text country
        text language
        text wallet_address
        jsonb game_accounts
        text referred_by FK
        text passphrase
        boolean is_active
        boolean is_profile_verified
        integer tokens
        timestamp created_at
        timestamp updated_at
    }
    
    REFERRAL_CODES {
        varchar id PK
        text code UK
        varchar user_id FK
        text referred_by
        boolean is_used
        timestamp created_at
        timestamp updated_at
    }
    
    APP_PACKAGES {
        varchar id PK
        text game
        text name
        integer in_game_amount
        decimal usdt_value
        text image
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }
    
    TRANSACTIONS {
        varchar id PK
        varchar user_id FK
        varchar package_id FK
        text payment_id UK
        text txid
        decimal pi_amount
        decimal usd_amount
        decimal pi_price_at_time
        text status
        jsonb game_account
        jsonb metadata
        boolean email_sent
        timestamp created_at
        timestamp updated_at
    }
    
    ADMIN_USERS {
        varchar id PK
        text username UK
        text password
        text email
        text role
        boolean is_active
        timestamp last_login
        timestamp created_at
    }
```

## 📊 System Workflow

### User Journey Flow

```mermaid
graph TD
    A[User Visits Site] --> B[Landing Page]
    B --> C{Authenticate?}
    C -->|No| D[Pi Network Login]
    C -->|Yes| E[Dashboard]
    D --> F[Pi Auth Flow]
    F --> G[User Profile Creation]
    G --> E
    E --> H{Action}
    H --> I[Purchase Package]
    H --> J[View Profile]
    H --> K[Check Transactions]
    H --> L[Referral System]
    I --> M[Payment Processing]
    M --> N[Transaction Complete]
    N --> O[Email Confirmation]
    J --> P[Profile Management]
    K --> Q[Transaction History]
    L --> R[Share Referral Code]
```

### Admin Workflow

```mermaid
graph TD
    A[Admin Login] --> B[Admin Dashboard]
    B --> C{Management}
    C --> D[User Management]
    C --> E[Package Management]
    C --> F[Transaction Monitoring]
    C --> G[Analytics Dashboard]
    D --> H[View/Edit Users]
    D --> I[Manage Referrals]
    E --> J[Add/Edit Packages]
    E --> K[Update Pricing]
    F --> L[View Transactions]
    F --> M[Payment Status]
    G --> N[Usage Analytics]
    G --> O[Revenue Reports]
```

### Data Processing Pipeline

```mermaid
graph LR
    A[User Action] --> B[Frontend Request]
    B --> C[API Gateway]
    C --> D[Business Logic]
    D --> E{Processing Type}
    E --> F[Database Operation]
    E --> G[External API Call]
    E --> H[Email Service]
    F --> I[Data Persistence]
    G --> J[Third-party Integration]
    H --> K[Notification Delivery]
    I --> L[Response]
    J --> L
    K --> L
    L --> M[Frontend Update]
    M --> N[User Feedback]
```

## 🔗 API Endpoints

### Authentication
- `POST /api/auth/pi` - Pi Network authentication
- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update user profile

### Marketplace
- `GET /api/packages` - List all packages
- `GET /api/pi-price` - Get current Pi price

### Transactions
- `GET /api/transactions` - List user transactions
- `POST /api/payment/approve` - Approve payment
- `POST /api/payment/complete` - Complete payment

### Wallet
- `GET /api/user/balance` - Fetch user's Pi wallet balance from Stellar Horizon API
- `POST /api/user/connect-wallet` - Manually connect user's wallet address

### Admin
- `POST /api/admin/login` - Admin login

## 🔐 Security Architecture

```mermaid
graph TD
    A[Client Request] --> B{Authentication}
    B -->|Unauthenticated| C[Pi Network Auth]
    B -->|Authenticated| D[JWT Validation]
    
    C --> E[Pi SDK Verification]
    E --> F[Backend Validation]
    F --> G[User Creation/Update]
    G --> H[JWT Token Generation]
    
    D --> I[Token Expiration Check]
    I -->|Valid| J[Access Granted]
    I -->|Expired| K[Token Refresh]
    
    J --> L{Authorization}
    L --> M[Role-Based Access]
    L --> N[Data Validation]
    M --> O[Resource Access]
    N --> O
    
    O --> P[Database Operations]
    P --> Q[Input Sanitization]
    Q --> R[Parameterized Queries]
    
    R --> S[Response]
    S --> T[Output Encoding]
    T --> A
```

### Security Features

- **JWT Authentication**: Secure session management
- **Input Validation**: Zod schema validation for all inputs
- **Rate Limiting**: API rate limiting to prevent abuse
- **CORS Protection**: Controlled cross-origin requests
- **SQL Injection Prevention**: Parameterized queries with Drizzle ORM
- **XSS Protection**: Sanitized user inputs and outputs

## ⚡ Performance & Caching

```mermaid
graph TD
    A[User Request] --> B{Cache Check}
    B -->|Cache Hit| C[Serve Cached Response]
    B -->|Cache Miss| D[Process Request]
    
    D --> E[Database Query]
    D --> F[External API Call]
    
    E --> G[Cache Result]
    F --> G
    
    G --> H[Response to User]
    C --> H
    H --> I[Client-Side Caching]
    
    I --> J[React Query Cache]
    I --> K[Browser Cache]
    I --> L[Service Worker]
    
    J --> M[Stale-While-Revalidate]
    K --> N[HTTP Cache Headers]
    L --> O[Offline Support]
```

### Performance Optimizations

- **Serverless Architecture**: Auto-scaling Vercel functions
- **Database Connection Pooling**: Efficient PostgreSQL connections
- **Caching**: React Query for client-side caching
- **Code Splitting**: Dynamic imports for faster loading
- **Image Optimization**: Responsive images with proper sizing
- **Lazy Loading**: Components loaded on demand

## 🧪 Testing Architecture

```mermaid
graph TB
    A[Test Suite] --> B[Unit Tests]
    A --> C[Integration Tests]
    A --> D[E2E Tests]
    A --> E[Database Tests]
    
    B --> F[Component Tests]
    B --> G[Hook Tests]
    B --> H[Utility Tests]
    
    C --> I[API Endpoint Tests]
    C --> J[Service Tests]
    C --> K[Database Integration]
    
    D --> L[User Flow Tests]
    D --> M[Payment Flow Tests]
    D --> N[Authentication Tests]
    
    E --> O[Schema Validation]
    E --> P[Migration Tests]
    E --> Q[Constraint Tests]
    
    R[Test Results] --> A
    S[Coverage Reports] --> A
    T[Performance Metrics] --> A
```

## 📈 Monitoring & Analytics

```mermaid
graph TB
    A[Application] --> B{Monitoring}
    B --> C[Error Tracking]
    B --> D[Performance Metrics]
    B --> E[User Analytics]
    
    C --> F[Sentry/Error Logging]
    D --> G[Response Time Tracking]
    D --> H[Database Performance]
    E --> I[User Behavior]
    E --> J[Conversion Tracking]
    
    F --> K[Alerting System]
    G --> K
    H --> K
    I --> K
    J --> K
    
    K --> L[Dashboard]
    K --> M[Notifications]
    K --> N[Reports]
```

## 🔧 Environment Variables

Create a `.env` file in the root directory:

```env
# Database (PostgreSQL) - Production (Mainnet)
DATABASE_URL=postgresql://user:password@host:port/database

# Pi Network
PI_SERVER_API_KEY=your_pi_server_api_key
VALIDATION_KEY=your_validation_key

# Authentication
JWT_SECRET=your_jwt_secret
SESSION_SECRET=your_session_secret

# EmailJS
EMAILJS_SERVICE_ID=your_service_id
EMAILJS_TEMPLATE_ID=your_template_id
EMAILJS_PRIVATE_KEY=your_private_key
EMAILJS_PUBLIC_KEY=your_public_key

# CoinGecko API
COINGECKO_API_KEY=your_coingecko_api_key

# Network Configuration
NETWORK=MAINNET
```

## 🚀 Deployment

### Prerequisites
- Node.js 18+
- PostgreSQL database (Supabase recommended)
- Pi Network Developer Portal account
- CoinGecko API key
- EmailJS account

### Local Development
```bash
# Clone the repository
git clone https://github.com/rinzindorjit/b4uesports.git
cd b4uesports

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Initialize database
npm run db:init

# Run development server
npm run dev
```

### Production Deployment
```bash
# Build for production
npm run build

# Start production server
npm start
```

### Vercel Deployment
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Serverless Function Configuration
The API routes are handled by a serverless function defined in `api/main.ts`. The Vercel configuration in `vercel.json` includes both static site generation and serverless function builds to ensure API endpoints work correctly.

If you encounter 405 errors or missing runtime logs, verify that your `vercel.json` includes the serverless build configuration for `api/main.ts`:

```json
{
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist/public"
      }
    },
    {
      "src": "api/main.ts",
      "use": "@vercel/node"
    }
  ]
}
```

This configuration ensures that API requests are properly routed to the serverless function and that runtime logs appear in the Vercel dashboard.

### Deployment Architecture

```mermaid
graph LR
    A[Developer] --> B[GitHub Repository]
    B --> C{CI/CD Pipeline}
    C --> D[Vercel Deployment]
    C --> E[Automated Testing]
    
    D --> F[Vercel Edge Network]
    F --> G[Global CDN]
    F --> H[Serverless Functions]
    
    H --> I[(Supabase PostgreSQL)]
    H --> J[Pi Network API]
    H --> K[CoinGecko API]
    H --> L[EmailJS Service]
    H --> M[Stellar Horizon API]
    
    N[End Users] --> G
    G --> H
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Pi Network](https://minepi.com) for enabling cryptocurrency adoption
- [Supabase](https://supabase.com) for PostgreSQL database services
- [CoinGecko](https://coingecko.com) for cryptocurrency pricing data
- [EmailJS](https://emailjs.com) for email delivery services
- [Vercel](https://vercel.com) for hosting and deployment

## 📞 Support

For support, please open an issue on GitHub or contact the development team at [info@b4uesports.com](mailto:info@b4uesports.com).
