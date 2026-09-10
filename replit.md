# B4U Esports - Pi Network Gaming Marketplace

## Overview

B4U Esports is a comprehensive gaming marketplace that integrates Pi Network cryptocurrency for purchasing in-game currencies. The platform allows users to buy PUBG Mobile UC and Mobile Legends: Bang Bang Diamonds using Pi coins through a secure, real-time payment system. Built as a full-stack TypeScript application with React frontend and Express backend, it features Pi Network authentication, real-time pricing, transaction management, and administrative controls.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for build tooling
- **Styling**: Tailwind CSS with shadcn/ui component library for consistent design
- **Routing**: Wouter for client-side navigation
- **State Management**: TanStack Query for server state and custom React Context for Pi Network authentication
- **UI Components**: Radix UI primitives with custom theming for gaming aesthetics

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints with JSON responses
- **Authentication**: Dual authentication system - Pi Network OAuth for users and JWT tokens for admin access
- **Database Layer**: Drizzle ORM with PostgreSQL for type-safe database operations

### Database Schema
- **Users**: Pi Network UID, profile data, game accounts, and preferences
- **Packages**: Game currency offerings with dynamic Pi pricing
- **Transactions**: Payment tracking with Pi Network payment IDs and blockchain transaction references
- **Admins**: Separate administrative access with role-based permissions
- **Price History**: Pi coin price tracking for accurate currency conversion

### Payment Processing
- **Pi Network Integration**: Official Pi SDK for payment creation and verification
- **Payment Flow**: Server-side approval and completion with automatic fulfillment
- **Security**: Passphrase protection for transactions and comprehensive validation
- **Real-time Pricing**: Live Pi/USD conversion with 60-second refresh intervals

### Security & Authentication
- **User Authentication**: Pi Network OAuth with access token verification
- **Admin Authentication**: Separate JWT-based system with bcrypt password hashing
- **Data Protection**: Input validation with Zod schemas and SQL injection prevention via parameterized queries
- **Transaction Security**: Server-side payment verification and completion workflows

### Admin Panel Features
- **User Management**: Search, filtering, and account status controls
- **Transaction Monitoring**: Real-time transaction status tracking and manual intervention capabilities
- **Package Management**: Dynamic pricing updates and availability controls
- **Analytics Dashboard**: Revenue tracking, user statistics, and transaction metrics

## External Dependencies

### Pi Network Integration
- **Pi SDK**: Official Pi Network JavaScript SDK for payment processing
- **Pi API**: Server-side API for payment verification and user data retrieval
- **Authentication**: Pi Network OAuth system for user login and authorization

### Database & ORM
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Drizzle ORM**: Type-safe database operations with automatic migration generation
- **Database Migrations**: Automated schema management with version control

### Email Services
- **SendGrid**: Transactional email service for purchase confirmations and notifications
- **Email Templates**: HTML email templates with transaction details and branding

### Pricing & Analytics
- **CoinGecko API**: Real-time Pi coin price data with fallback pricing mechanisms
- **Price History**: Internal price tracking for accurate historical conversions

### Development & Deployment
- **Replit Integration**: Development environment with hot reloading and runtime error handling
- **Vite Plugins**: Development banner, cartographer, and error overlay for enhanced developer experience
- **Build System**: Vite for frontend bundling and esbuild for server-side compilation

### UI & Styling
- **Tailwind CSS**: Utility-first CSS framework with custom gaming theme variables
- **shadcn/ui**: Pre-built component library with Radix UI primitives
- **Font Integration**: Google Fonts (Inter, JetBrains Mono) and Font Awesome icons

### Form Handling & Validation
- **React Hook Form**: Form state management with Zod resolver integration
- **Zod**: Runtime type validation for API inputs and form data
- **Input Validation**: Client and server-side validation with error handling