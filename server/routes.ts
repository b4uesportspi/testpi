import { VercelLogger } from './services/vercel-logger.js';
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { dedupePackages } from "./package-deduplication.js";
import { piNetworkService } from "./services/pi-network.js";
import { pricingService } from "./services/pricing.js";
import { sendPurchaseConfirmationEmail, sendAdminPurchaseNotification, sendProfileUpdateEmail } from "./services/email.js";
import * as emailService from "./services/email.js";

// Debug log to verify email service import
console.log('📧 Email service imported in routes');
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { insertUserSchema, insertPackageSchema, insertTransactionSchema, InsertTournamentRegistration } from "../shared/schema.js";
import { z } from "zod";
import { getAIResponse, getFallbackResponse, type ChatMessage as AIMessage } from "./services/ai-chat.js";
import { rewardEngine } from "./services/reward-engine.js";
import { redemptionEngine } from "./services/redemption-engine.js";
import { db, pool } from "./db.js";
import { redemptionRequests, tokenTransactions, users } from "../shared/schema.js";
import { desc, eq, sql, and, ne, isNotNull } from "drizzle-orm";
import { evaluateWalletBinding, isAdminWalletAddress, isValidStellarAddress } from "./wallet-binding.js";

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'fallback-secret';
const PI_SANDBOX_MODE = String(process.env.PI_SANDBOX_MODE || 'false').toLowerCase() === 'true';
const OWNER_PI_UID = (process.env.OWNER_PI_UID || 'c8ade70c-7f39-4152-9b43-de252babfa80').trim();
const B4U_TOKEN_NAME = 'B4U Esports Token';
const B4U_TOKEN_SYMBOL = 'B4UT';
const B4U_TO_PI_RATE = 10000;
const TOKEN_REWARD_OFFERS = [
  { key: 'daily_reward', title: 'Daily Reward Token', value: '+10 B4U Esports Token', description: 'Claim once every 24 hours.' },
  { key: 'referral_reward', title: 'Referral Token', value: '+25 B4U Esports Token', description: 'Earn when your referral is verified.' },
  { key: 'purchase_bonus', title: 'Purchase Bonus Token', value: 'Milestone B4U Esports Token bonuses', description: 'Added after completed Pi purchases.' },
  { key: 'watch_ad', title: 'Watch Ad and Earn Token', value: '+10 B4U Esports Token', description: 'Rewarded ads are verified before payout.' },
  { key: 'tournament_reward', title: 'Tournament Rewards', value: 'Winner and MVP B4U Esports Token prizes' },
  { key: 'achievement_reward', title: 'Achievement Rewards', value: 'Milestone B4U Esports Token rewards' },
  { key: 'loyalty_reward', title: 'Loyalty Rewards', value: 'Periodic B4U Esports Token drops' },
  { key: 'feedback_reward', title: 'Feedback Reward', value: '+10 B4U Esports Token', description: 'Awarded when users leave feedback.' },
];

function isOwnerPayload(decoded: any) {
  if (!decoded) return false;
  const piUID = String(decoded.piUID || '').trim();
  return piUID === OWNER_PI_UID;
}

function defaultPlacementPoints(placement: number): number {
  const pointsMap: Record<number, number> = {
    1: 20,
    2: 14,
    3: 10,
    4: 8,
    5: 6,
    6: 4,
    7: 3,
    8: 2,
    9: 1,
  };
  return pointsMap[placement] ?? 0;
}

const VALID_TOURNAMENT_MODES = new Set(['solo', 'duo', 'squad']);
function normalizeTournamentMode(value: any): string | null {
  const mode = String(value || '').trim().toLowerCase();
  return VALID_TOURNAMENT_MODES.has(mode) ? mode : null;
}

function inferTournamentModeFromPlayers(players: any[] | undefined | null): string | null {
  if (!Array.isArray(players)) {
    return null;
  }
  const count = players.filter(Boolean).length;
  if (count === 1) return 'solo';
  if (count === 2) return 'duo';
  if (count >= 3) return 'squad';
  return null;
}

async function createTournamentTeamFromRegistration(registration: any, tournamentId: string) {
  if (!registration || registration.teamId) {
    return undefined;
  }

  const registrationMetadata = (registration.metadata || {}) as any;
  const teamNameFromRegistration = String(registrationMetadata.teamName || `Team-${String(registration.id).slice(0, 8)}`).trim() || `Team-${String(registration.id).slice(0, 8)}`;
  const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  let teamLeaderEmail = String(registrationMetadata.teamLeaderEmail || '').trim().toLowerCase();
  if (!teamLeaderEmail && Array.isArray(registrationMetadata.players)) {
    const playerEmail = registrationMetadata.players.find((player: any) => player?.email)?.email;
    teamLeaderEmail = String(playerEmail || '').trim().toLowerCase();
  }
  if (!teamLeaderEmail && registration.userId) {
    const user = await storage.getUser(registration.userId);
    teamLeaderEmail = String(user?.email || '').trim().toLowerCase();
  }

  let captainUserId = registration.userId;
  if (teamLeaderEmail) {
    const matchedUser = await storage.getUserByEmail(teamLeaderEmail);
    if (matchedUser) {
      console.log(`[Lobby Access Fix] Matched team leader email ${teamLeaderEmail} to active user ${matchedUser.id}. Overriding captainUserId from registration.userId (${registration.userId})`);
      captainUserId = matchedUser.id;
    }
  }

  const teamMode = normalizeTournamentMode(registrationMetadata.mode) || inferTournamentModeFromPlayers(registrationMetadata.players) || 'solo';
  const team = await storage.createTournamentTeam({
    tournamentId,
    name: teamNameFromRegistration,
    captainUserId,
    inviteCode,
    status: 'complete',
    metadata: {
      mode: teamMode,
      teamLogo: registrationMetadata.teamLogo || null,
      teamLeaderEmail,
      source: 'paid-registration',
    },
  } as any);

  const teamPlayers = Array.isArray(registrationMetadata.players) ? registrationMetadata.players : [];
  for (const player of teamPlayers) {
    let playerUserId = player?.userId;
    if (!playerUserId && player?.email) {
      const matchedPlayerUser = await storage.getUserByEmail(player.email);
      if (matchedPlayerUser) {
        playerUserId = matchedPlayerUser.id;
      }
    }
    if (playerUserId && playerUserId !== captainUserId) {
      await storage.addTournamentTeamMember(team.id, playerUserId, player.isCaptain ? 'captain' : 'member');
    }
  }

  await storage.updateTournamentRegistration(registration.id, { teamId: team.id } as any);
  return team;
}

async function ensurePaidTournamentRegistrationsHaveTeams(tournamentId: string) {
  const registrations = await storage.getTournamentRegistrations(tournamentId);
  // Pick up both 'paid' and 'pending' rows that have a transactionId (meaning payment completed)
  const paidRegistrations = registrations.filter((registration) => {
    const status = String(registration.paymentStatus || '').toLowerCase();
    return (status === 'paid' || (status === 'pending' && registration.transactionId)) && !registration.teamId;
  });

  for (const registration of paidRegistrations) {
    await createTournamentTeamFromRegistration(registration, tournamentId);
  }
}

function isTournamentRegistrationClosed(tournament: any): boolean {
  const now = Date.now();
  const registrationClosesAt = tournament?.registrationClosesAt || tournament?.registration_closes_at;
  const startsAt = tournament?.startsAt || tournament?.starts_at;

  // If an explicit registrationClosesAt is set and has passed → closed
  if (registrationClosesAt) {
    return new Date(String(registrationClosesAt)).getTime() <= now;
  }

  // If no registrationClosesAt but startsAt has passed → registration is implicitly closed
  if (startsAt) {
    return new Date(String(startsAt)).getTime() <= now;
  }

  return false;
}

async function ensureTournamentStatusIsCurrent(tournament: any) {
  if (!tournament) {
    return tournament;
  }

  const status = String(tournament.status || '').toLowerCase();
  const now = Date.now();
  const startsAt = tournament.startsAt || tournament.starts_at;
  const startsAtTime = startsAt ? new Date(String(startsAt)).getTime() : null;

  // 1. If startsAt has passed, auto-transition to 'in_progress' (unless already completed, ended, or cancelled)
  if (startsAtTime && startsAtTime <= now) {
    if (!['in_progress', 'completed', 'ended', 'cancelled'].includes(status)) {
      const updatedTournament = await storage.updateTournament(tournament.id, { status: 'in_progress' } as any);
      return updatedTournament || { ...tournament, status: 'in_progress' };
    }
    return tournament;
  }

  // 2. Otherwise, auto-close registration when the deadline (or start time) has passed
  const registrationStatuses = ['registration_open', 'published'];
  if (registrationStatuses.includes(status) && isTournamentRegistrationClosed(tournament)) {
    const updatedTournament = await storage.updateTournament(tournament.id, { status: 'registration_closed' } as any);
    return updatedTournament || { ...tournament, status: 'registration_closed' };
  }

  return tournament;
}

async function getTournamentByIdOrSlug(idOrSlug: string) {
  let tournament = await storage.getTournament(idOrSlug);
  if (!tournament) {
    tournament = await storage.getTournamentBySlug(idOrSlug);
  }
  return tournament;
}

async function resolveA2URecipient(options: { userId?: string | null; piUID?: string | null; walletAddress?: string | null }) {
  const normalizedPiUID = String(options.piUID || '').trim();
  const normalizedWallet = String(options.walletAddress || '').trim();

  let user = options.userId ? await storage.getUser(options.userId) : undefined;
  if (!user && normalizedPiUID) {
    user = await storage.getUserByPiUID(normalizedPiUID);
  }
  if (!user && normalizedWallet) {
    const [walletUser] = await db.select().from(users).where(eq(users.walletAddress, normalizedWallet)).limit(1);
    user = walletUser;
  }

  const uid = String(user?.piUID || normalizedPiUID || '').trim();
  if (!uid) {
    throw new Error('Pi UID is required for Pi A2U payments. Ask the user to log in with Pi Network, or provide a valid piUID.');
  }

  const walletAddress = String(user?.walletAddress || normalizedWallet || '').trim();
  if (!walletAddress) {
    throw new Error('Recipient wallet address is required for Pi A2U payments and refunds. Please ensure the recipient has connected a valid wallet first.');
  }

  return {
    user,
    uid,
    walletAddress,
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Middleware for admin authentication
  const authenticateAdmin = async (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // Validate JWT format before verification
    if (token.split('.').length !== 3) {
      return res.status(401).json({ message: 'Invalid token format' });
    }

    try {
      // Explicitly specify the algorithm to prevent "invalid algorithm" errors
      const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as any;
      const admin = decoded.adminId ? await storage.getAdminByUsername(decoded.username) : null;
      const ownerMatch = isOwnerPayload(decoded);

      if (admin) {
        if (!admin.isActive) {
          return res.status(401).json({ message: 'Invalid admin token' });
        }
        req.admin = admin;
        next();
        return;
      }

      if (ownerMatch) {
        req.admin = {
          id: decoded.userId,
          username: decoded.username,
          piUID: decoded.piUID,
          walletAddress: decoded.walletAddress,
          isOwner: true,
        };
        next();
        return;
      }

      return res.status(401).json({ message: 'Invalid admin token' });
    } catch (error) {
      console.error('Admin authentication error:', error);
      return res.status(401).json({ message: 'Invalid token' });
    }
  };

  // Pi Network Authentication - MAINNET (with wallet_address scope)
  app.post('/api/auth/pi', async (req, res) => {
    try {
      const { accessToken, referralCode } = req.body;
      if (!accessToken) {
        return res.status(400).json({ message: 'Access token required' });
      }

      // Log the authentication attempt
      console.log('🔐 Pi authentication attempt (MAINNET):', accessToken ? 'PROVIDED' : 'MISSING');
      
      const piUser = await piNetworkService.verifyAccessToken(accessToken);
      if (!piUser) {
        console.log('❌ Pi Network token verification failed');
        return res.status(401).json({ message: 'Invalid Pi Network token' });
      }

      console.log('✅ Pi Network user verified:', piUser.uid, 'Username:', piUser.username);
      
      // Check if user exists, if not create new user
      let user = await storage.getUserByPiUID(piUser.uid);
      console.log('User lookup result:', user ? 'FOUND' : 'NOT FOUND');
      
      if (!user) {
        console.log('🆕 Creating new user for Pi UID:', piUser.uid);
        // Create minimal user profile with real Pi Network data
        const newUser = {
          piUID: piUser.uid,
          username: piUser.username, // Use real Pi Network username
          email: '',
          phone: '',
          country: 'Bhutan',
          language: 'en',
          walletAddress: '', // Wallet address will be set after their first purchase
          // Add referral information if provided
          referredBy: referralCode || undefined
        };
        
        try {
          user = await storage.createUser(newUser);
          console.log('✅ New user created:', user.id);
          
          // If the user was referred, reward the referrer
          if (referralCode && user.id) {
            try {
              await storage.rewardReferrer(user.id);
              console.log('Referral reward processed for new user:', user.id);
            } catch (rewardError) {
              console.error('Error processing referral reward:', rewardError);
            }
          }
        } catch (createError) {
          console.error('Error creating user:', createError);
          // If we can't create a user due to database issues, return an error
          return res.status(500).json({ 
            message: 'Failed to create user due to database issues', 
            error: createError instanceof Error ? createError.message : 'Unknown error'
          });
        }
      } else {
        console.log('👤 Existing user found:', user.id);
        
        // Update username if it has changed
        if (user.username !== piUser.username) {
          try {
            const updatedUser = await storage.updateUser(user.id, { username: piUser.username });
            if (updatedUser) {
              user = updatedUser;
              console.log('✅ User username updated:', user.id, piUser.username);
            }
          } catch (updateError) {
            console.error('Error updating user username:', updateError);
          }
        }
      }

      // Ensure we have a user before proceeding
      if (!user) {
        return res.status(500).json({ message: 'Failed to retrieve or create user' });
      }

      // Auto-link user wallet address using granted wallet_address scope from Pi Network
      try {
        if (!user.walletAddress) {
          const walletAddr = await piNetworkService.getUserWalletAddress(accessToken);
          if (walletAddr) {
            console.log('✅ Auto-linking Pioneer wallet address from Pi Network authentication:', walletAddr);
            const updated = await storage.updateUser(user.id, { 
              walletAddress: walletAddr,
              walletVerifiedAt: new Date(),
            });
            if (updated) user = updated;
          }
        }
      } catch (walletErr: any) {
        console.warn('Could not auto-link wallet address during login:', walletErr?.message);
      }

      // Generate JWT token for session with real user data
      const tokenPayload = {
        userId: user.id,
        piUID: piUser.uid,
        username: piUser.username,
        walletAddress: user.walletAddress || '',
      };
      const isAdmin = isOwnerPayload(tokenPayload);
      const token = jwt.sign({ ...tokenPayload, isAdmin }, JWT_SECRET, { expiresIn: '7d', algorithm: 'HS256' });

      // Update last login timestamp
      try {
        await storage.updateUserLastLogin(user.id);
        console.log('✅ User last login updated:', user.id);
      } catch (loginError) {
        console.error('Error updating user last login:', loginError);
        // Don't fail the authentication if we can't update the timestamp
      }

      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          phone: user.phone,
          country: user.country,
          language: user.language,
          gameAccounts: user.gameAccounts,
          walletAddress: user.walletAddress,
          referralCode: user.referralCode,
          piUID: piUser.uid,
          isAdmin,
        },
        token,
      });
    } catch (error) {
      console.error('❌ Pi authentication error:', error);
      // Provide more detailed error information
      if (error instanceof Error) {
        res.status(500).json({ 
          message: 'Authentication failed', 
          error: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
      } else {
        res.status(500).json({ 
          message: 'Authentication failed', 
          error: 'Unknown error occurred'
        });
      }
    }
  });

  // Admin Authentication
  app.post('/api/admin/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password required' });
      }

      const admin = await storage.getAdminByUsername(username);
      if (!admin || !admin.isActive) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const isValidPassword = await bcrypt.compare(password, admin.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      await storage.updateAdminLastLogin(admin.id);

      const token = jwt.sign({ adminId: admin.id, username: admin.username }, JWT_SECRET, { expiresIn: '8h', algorithm: 'HS256' });

      res.json({
        admin: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          role: admin.role,
        },
        token,
      });
    } catch (error) {
      console.error('Admin login error:', error);
      res.status(500).json({ message: 'Login failed' });
    }
  });

  // Register new token system routes


  // Health check endpoint for monitoring email functionality
  app.get('/api/monitoring/email-health', async (req, res) => {
    try {
      // Test logging
      VercelLogger.logEvent('EMAIL_HEALTH_CHECK', { 
        status: 'running', 
        timestamp: new Date().toISOString() 
      });
      
      // Return success response
      res.json({
        status: 'success',
        message: 'Email health check endpoint is working',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      VercelLogger.logError('EMAIL_HEALTH_CHECK_FAILED', error, {
        endpoint: '/api/monitoring/email-health'
      });
      res.status(500).json({ 
        status: 'error', 
        message: 'Email health check failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get current Pi price
  app.get('/api/pi-price', async (req, res) => {
    try {
      console.log('Pi Price endpoint: Fetching current price');
      
      const price = await pricingService.getCurrentPiPrice();
      const lastPrice = pricingService.getLastPrice();
      
      const response = {
        price,
        lastUpdated: lastPrice?.lastUpdated || new Date(),
      };
      
      console.log('Pi Price endpoint: Returning price', response);
      res.json(response);
    } catch (error) {
      console.error('Pi price fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch Pi price' });
    }
  });

  // Get packages with Pi pricing
  app.get('/api/packages', async (req, res) => {
    try {
      console.log('Packages endpoint: Fetching packages with Pi pricing');
      
      const normalizeGameName = (gameName: string) => 
        gameName?.trim().toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '') || '';
      const normalizePackageName = (packageName: string) =>
        packageName?.trim().toLowerCase().replace(/\s+/g, ' ') || '';
      const isPubgGame = (gameName: string) => {
        const normalized = normalizeGameName(gameName);
        return normalized.includes('PUBG') && !normalized.includes('KR');
      };
      
      let packages = await storage.getActivePackages();
      console.log('Packages endpoint: Found', packages.length, 'active packages');

      if (packages.length === 0) {
        console.log('Packages endpoint: No active packages found; seeding default package catalog');
        const existingPackages = await storage.getPackages();
        const existingByIdentity = new Map(existingPackages.map((pkg: any) => [`${pkg.game}::${pkg.name}`, pkg]));
        const packageDefinitions = [
          { game: 'PUBG', name: 'PUBG Tournament Entry', inGameAmount: 0, usdtValue: '5.0000', image: '', isActive: true },
          { game: 'PUBG', name: '60 UC', inGameAmount: 60, usdtValue: '1.5000', image: '', isActive: true },
          { game: 'PUBG', name: '325 UC', inGameAmount: 325, usdtValue: '6.5000', image: '', isActive: true },
          { game: 'PUBG', name: '660 UC', inGameAmount: 660, usdtValue: '12.0000', image: '', isActive: true },
          { game: 'PUBG', name: '1800 UC', inGameAmount: 1800, usdtValue: '25.0000', image: '', isActive: true },
          { game: 'PUBG', name: '3850 UC', inGameAmount: 3850, usdtValue: '49.0000', image: '', isActive: true },
          { game: 'PUBG', name: '8100 UC', inGameAmount: 8100, usdtValue: '96.0000', image: '', isActive: true },
          { game: 'PUBG', name: '16200 UC', inGameAmount: 16200, usdtValue: '186.0000', image: '', isActive: true },
          { game: 'PUBG', name: '24300 UC', inGameAmount: 24300, usdtValue: '278.0000', image: '', isActive: true },
          { game: 'PUBG', name: '32400 UC', inGameAmount: 32400, usdtValue: '369.0000', image: '', isActive: true },
          { game: 'PUBG', name: '40500 UC', inGameAmount: 40500, usdtValue: '459.0000', image: '', isActive: true },
          { game: 'MLBB', name: '56 Diamonds', inGameAmount: 56, usdtValue: '3.0000', image: '', isActive: true },
          { game: 'MLBB', name: '278 Diamonds', inGameAmount: 278, usdtValue: '6.0000', image: '', isActive: true },
          { game: 'MLBB', name: '571 Diamonds', inGameAmount: 571, usdtValue: '11.0000', image: '', isActive: true },
          { game: 'MLBB', name: '1783 Diamonds', inGameAmount: 1783, usdtValue: '33.0000', image: '', isActive: true },
          { game: 'MLBB', name: '3005 Diamonds', inGameAmount: 3005, usdtValue: '52.0000', image: '', isActive: true },
          { game: 'MLBB', name: '6012 Diamonds', inGameAmount: 6012, usdtValue: '99.0000', image: '', isActive: true },
          { game: 'MLBB', name: '12000 Diamonds', inGameAmount: 12000, usdtValue: '200.0000', image: '', isActive: true },
          { game: 'COC', name: 'Gold Pass', inGameAmount: 1, usdtValue: '9.0000', image: '', isActive: true },
          { game: 'ROBUX', name: '40 Robux', inGameAmount: 40, usdtValue: '1.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000019410-1.png', isActive: true },
          { game: 'ROBUX', name: '80 Robux', inGameAmount: 80, usdtValue: '1.5000', image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000019410-1.png', isActive: true },
          { game: 'NEWSTATE', name: '300 NC', inGameAmount: 300, usdtValue: '1.5000', image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020478-1.jpg', isActive: true },
          { game: 'FREEFIRE', name: '110 Diamonds', inGameAmount: 110, usdtValue: '2.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020480.jpg', isActive: true },
          { game: 'TIKTOK_COINS', name: '70 Coins', inGameAmount: 70, usdtValue: '1.5000', image: 'https://b4uesports.com/wp-content/uploads/2026/04/tiktok-coins-package.png-removebg-preview.png', isActive: true },
          { game: 'TIKTOK_FOLLOWERS', name: '100 Followers', inGameAmount: 100, usdtValue: '2.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000034677.png', isActive: true },
          { game: 'TIKTOK_VIEWS', name: '30000 Views', inGameAmount: 30000, usdtValue: '55.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000077314.png', isActive: true },
          { game: 'TIKTOK_VIEWS', name: '50000 Views', inGameAmount: 50000, usdtValue: '85.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000077314.png', isActive: true },
          { game: 'TIKTOK_VIEWS', name: '100000 Views', inGameAmount: 100000, usdtValue: '200.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000077314.png', isActive: true },
          { game: 'YOUTUBE_SUBS', name: '100 Subscribers', inGameAmount: 100, usdtValue: '6.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000077305.png', isActive: true },
          { game: 'YOUTUBE_WATCHTIME', name: '2000 WT', inGameAmount: 2000, usdtValue: '38.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/03/youtube-wt.jpg', isActive: true },
          { game: 'YOUTUBE_WATCHTIME', name: '4000 WT', inGameAmount: 4000, usdtValue: '69.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/03/youtube-wt.jpg', isActive: true },
          { game: 'FACEBOOK', name: '500 Likes + Followers', inGameAmount: 500, usdtValue: '4.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/03/facebook-logo.avif', isActive: true },
          { game: 'INSTAGRAM', name: '100 Followers', inGameAmount: 100, usdtValue: '4.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/03/instagram-logo.jpg', isActive: true },
          { game: 'NETFLIX', name: '1 Month Subscription', inGameAmount: 1, usdtValue: '3.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/03/netflix-logo.png', isActive: true },
          { game: 'CANVA', name: 'Lifetime Pro Subscription', inGameAmount: 1, usdtValue: '3.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/03/canva.jpg', isActive: true },
          { game: 'PUBG_SUBSCRIPTION', name: 'PUBG Weekly Tournament Pass', inGameAmount: 1, usdtValue: '10.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/03/pubg-weekly-pass.png', isActive: true },
          { game: 'PUBG_SUBSCRIPTION', name: 'PUBG Monthly Tournament Pass', inGameAmount: 1, usdtValue: '15.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/03/pubg-monthly-pass.png', isActive: true },
        ];
        for (const pkg of packageDefinitions) {
          const existingPackage = existingByIdentity.get(`${pkg.game}::${pkg.name}`);
          if (!existingPackage) {
            await storage.createPackage(pkg);
          } else if (!existingPackage.isActive) {
            await storage.updatePackage(existingPackage.id, { isActive: true });
          }
        }
        packages = await storage.getActivePackages();
        console.log('Packages endpoint: Active packages after seeding', packages.length);
      }
      
      // Ensure PUBG Tournament Entry package exists and is active
      const allPackages = await storage.getPackages();
      const existingTournamentPackage = allPackages.find(pkg => isPubgGame(pkg.game) && normalizePackageName(pkg.name) === normalizePackageName('PUBG Tournament Entry'));
      if (!existingTournamentPackage) {
        console.log('Packages endpoint: PUBG Tournament Entry missing. Creating it now.');
        try {
          await storage.createPackage({
            game: 'PUBG',
            name: 'PUBG Tournament Entry',
            inGameAmount: 0,
            usdtValue: '5.0000',
            image: '',
            isActive: true,
          });
          packages = await storage.getActivePackages();
          console.log('Packages endpoint: Created PUBG Tournament Entry package successfully.');
        } catch (createError) {
          console.error('Packages endpoint: Failed to create PUBG Tournament Entry package:', createError);
        }
      } else if (!existingTournamentPackage.isActive) {
        console.log('Packages endpoint: PUBG Tournament Entry exists but is inactive. Activating it.');
        try {
          await storage.updatePackage(existingTournamentPackage.id, { isActive: true });
          packages = await storage.getActivePackages();
          console.log('Packages endpoint: Activated PUBG Tournament Entry package successfully.');
        } catch (updateError) {
          console.error('Packages endpoint: Failed to activate PUBG Tournament Entry package:', updateError);
        }
      }

      // Ensure PUBG subscription packages exist for weekly/monthly tournament access
      const existingWeeklySubscription = allPackages.find(pkg => normalizeGameName(pkg.game) === 'PUBG_SUBSCRIPTION' && normalizePackageName(pkg.name) === normalizePackageName('PUBG Weekly Tournament Pass'));
      const existingMonthlySubscription = allPackages.find(pkg => normalizeGameName(pkg.game) === 'PUBG_SUBSCRIPTION' && normalizePackageName(pkg.name) === normalizePackageName('PUBG Monthly Tournament Pass'));
      if (!existingWeeklySubscription || !existingMonthlySubscription) {
        console.log('Packages endpoint: Missing PUBG subscription packages. Creating missing packages now.');
        const missingPubgSubscriptions = [];
        if (!existingWeeklySubscription) {
          missingPubgSubscriptions.push({
            game: 'PUBG_SUBSCRIPTION',
            name: 'PUBG Weekly Tournament Pass',
            inGameAmount: 1,
            usdtValue: '10.0000', // Display USD estimate; checkout amount is fixed at 20 Pi
            image: '',
            isActive: true,
          });
        }
        if (!existingMonthlySubscription) {
          missingPubgSubscriptions.push({
            game: 'PUBG_SUBSCRIPTION',
            name: 'PUBG Monthly Tournament Pass',
            inGameAmount: 1,
            usdtValue: '15.0000', // Display USD estimate; checkout amount is fixed at 30 Pi
            image: '',
            isActive: true,
          });
        }
        try {
          for (const pkg of missingPubgSubscriptions) {
            await storage.createPackage(pkg);
            console.log(`Packages endpoint: Created subscription package ${pkg.name}`);
          }
          packages = await storage.getActivePackages();
        } catch (createError) {
          console.error('Packages endpoint: Failed to create PUBG subscription package(s):', createError);
        }
      }
      
      const tiktokCoinsCount = packages.filter(p => p.game === 'TIKTOK_COINS').length;
      const tiktokFollowersCount = packages.filter(p => p.game === 'TIKTOK_FOLLOWERS').length;
      const tiktokViewsCount = packages.filter(p => p.game === 'TIKTOK_VIEWS').length;
      console.log(`Packages endpoint: TikTok Coins=${tiktokCoinsCount}, TikTok Followers=${tiktokFollowersCount}, TikTok Views=${tiktokViewsCount}`);
      
      const currentPiPrice = await pricingService.getCurrentPiPrice();

      const packagesWithPiPricing = packages.map(pkg => {
        if (pkg.game === 'PUBG_SUBSCRIPTION') {
          return {
            ...pkg,
            piPrice: pkg.name?.toLowerCase().includes('monthly') ? 30 : 20,
            currentPiPrice,
          };
        }

        return {
          ...pkg,
          piPrice: pricingService.calculatePiAmount(parseFloat(pkg.usdtValue)),
          currentPiPrice,
        };
      });

      console.log('Packages endpoint: Returning', packagesWithPiPricing.length, 'packages');
      
      const filteredPackages = packagesWithPiPricing.filter(pkg => !pkg.name?.toLowerCase().includes('tournament entry'));
      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
      res.status(200).json(filteredPackages);
    } catch (error) {
      console.error('Packages fetch error:', error);
      // Return empty array instead of error to prevent UI issues
      res.json([]);
    }
  });

  // Get user profile (updated to include tokens)
  app.get('/api/profile', async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ message: 'No token provided' });
      }

      // Validate JWT format before verification
      if (token.split('.').length !== 3) {
        return res.status(401).json({ message: 'Invalid token format' });
      }

      let decoded;
      try {
        // Explicitly specify the algorithm to prevent "invalid algorithm" errors
        decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as any;
      } catch (verifyError: any) {
        console.error('JWT verification error:', verifyError.message);
        console.error('Token header:', JSON.parse(Buffer.from(token.split('.')[0], 'base64').toString()));
        return res.status(401).json({ message: 'Invalid token signature' });
      }
      
      const userId = decoded.userId;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({
        ...user,
        piUID: decoded.piUID || user.piUID,
        isAdmin: isOwnerPayload(decoded),
      });
    } catch (error) {
      console.error('Profile fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch profile' });
    }
  });

  // User profile update
  app.put('/api/profile', async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        VercelLogger.logError('PROFILE_UPDATE_UNAUTHORIZED', new Error('No token provided'), {
          endpoint: '/api/profile'
        });
        return res.status(401).json({ message: 'No token provided' });
      }

      // Validate JWT format before verification
      if (token.split('.').length !== 3) {
        VercelLogger.logError('PROFILE_UPDATE_INVALID_TOKEN', new Error('Invalid token format'), {
          endpoint: '/api/profile'
        });
        return res.status(401).json({ message: 'Invalid token format' });
      }

      let decoded;
      try {
        // Explicitly specify the algorithm to prevent "invalid algorithm" errors
        decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as any;
      } catch (verifyError: any) {
        VercelLogger.logError('PROFILE_UPDATE_JWT_VERIFICATION_FAILED', verifyError, {
          endpoint: '/api/profile'
        });
        return res.status(401).json({ message: 'Invalid token signature' });
      }
      
      const userId = decoded.userId;

      const updateData = req.body;
      
      VercelLogger.logProfileEvent('PROFILE_UPDATE_ATTEMPT', {
        userId,
        updateFields: Object.keys(updateData)
      });

      // Validate required fields
      if (updateData.email && !updateData.email.endsWith('@gmail.com')) {
        VercelLogger.logWarning('PROFILE_UPDATE_INVALID_EMAIL', 'Email must be a Gmail address', {
          userId,
          email: updateData.email
        });
        return res.status(400).json({ message: 'Email must be a Gmail address' });
      }

      // Check if required fields are provided to set profile as verified
      if (updateData.email && updateData.phone) {
        updateData.isProfileVerified = true;
        VercelLogger.logProfileEvent('PROFILE_VERIFICATION_ENABLED', {
          userId,
          reason: 'Email and phone provided in request'
        });
      } else {
        VercelLogger.logProfileEvent('PROFILE_VERIFICATION_NOT_ENABLED', {
          userId,
          emailProvided: !!updateData.email,
          phoneProvided: !!updateData.phone
        });
      }

      const updatedUser = await storage.updateUser(userId, updateData);
      if (!updatedUser) {
        VercelLogger.logError('PROFILE_UPDATE_USER_NOT_FOUND', new Error('User not found'), {
          userId
        });
        return res.status(404).json({ message: 'User not found' });
      }

      // Check if profile should be marked as verified
      // Profile is verified when both email and phone are provided (not empty strings)
      const shouldMarkAsVerified = updatedUser.email && updatedUser.phone && 
                                   updatedUser.email.trim() !== '' && updatedUser.phone.trim() !== '';
      
      // Update the verification status if needed
      if (shouldMarkAsVerified && !updatedUser.isProfileVerified) {
        try {
          const verifiedUser = await storage.updateUser(userId, { isProfileVerified: true });
          if (verifiedUser) {
            updatedUser.isProfileVerified = verifiedUser.isProfileVerified;
          }
          VercelLogger.logProfileEvent('PROFILE_VERIFICATION_ENABLED', {
            userId,
            reason: 'Both email and phone present in database'
          });
        } catch (verificationError) {
          console.error('Error updating profile verification status:', verificationError);
          VercelLogger.logError('PROFILE_VERIFICATION_UPDATE_FAILED', verificationError, {
            userId
          });
        }
      } else if (!shouldMarkAsVerified && updatedUser.isProfileVerified) {
        // In case somehow the profile was verified but now missing required fields
        try {
          const unverifiedUser = await storage.updateUser(userId, { isProfileVerified: false });
          if (unverifiedUser) {
            updatedUser.isProfileVerified = unverifiedUser.isProfileVerified;
          }
          VercelLogger.logProfileEvent('PROFILE_VERIFICATION_DISABLED', {
            userId,
            reason: 'Missing required fields'
          });
        } catch (verificationError) {
          console.error('Error updating profile verification status:', verificationError);
          VercelLogger.logError('PROFILE_VERIFICATION_UPDATE_FAILED', verificationError, {
            userId
          });
        }
      }

      // Send profile update email notification if user has an email address and profile is verified
      if (updatedUser.email && updatedUser.isProfileVerified) {
        console.log('DEBUG: Sending profile update email to', updatedUser.email);
        try {
          // Debug log to ensure this code is reached
          console.log('DEBUG: About to send profile update email for user:', userId, 'with email:', updatedUser.email);
          VercelLogger.logEmailEvent('PROFILE_UPDATE_EMAIL_ATTEMPT', {
            userId,
            recipient: updatedUser.email,
            isProfileVerified: updatedUser.isProfileVerified
          });
          
          // Fetch the complete user data to ensure all information is included in the email
          const completeUser = await storage.getUser(userId);
          console.log('DEBUG: Fetched complete user data for email:', completeUser ? 'SUCCESS' : 'FAILED');
          
          // Debug: Log what data is being sent to email
          if (completeUser) {
            console.log('DEBUG: Complete user data structure:', {
              hasGameAccounts: !!completeUser.gameAccounts,
              hasSocialAccounts: !!completeUser.socialAccounts,
              gameAccountsKeys: completeUser.gameAccounts ? Object.keys(completeUser.gameAccounts) : [],
              socialAccountsKeys: completeUser.socialAccounts ? Object.keys(completeUser.socialAccounts) : [],
              gameAccounts: JSON.stringify(completeUser.gameAccounts),
              socialAccounts: JSON.stringify(completeUser.socialAccounts)
            });
          }
          
          if (completeUser && completeUser.email) {
            const emailResult = await sendProfileUpdateEmail({
              to: completeUser.email,
              username: completeUser.username,
              profileData: completeUser
            });
            
            console.log('DEBUG: Email result:', emailResult); // true/false
            
            if (emailResult) {
              VercelLogger.logEmailEvent('PROFILE_UPDATE_EMAIL_SENT', {
                userId,
                recipient: completeUser.email
              });
              console.log('DEBUG: Profile update email sent successfully to', completeUser.email);
            } else {
              VercelLogger.logError('PROFILE_UPDATE_EMAIL_FAILED', new Error('Email sending returned false'), {
                userId,
                recipient: completeUser.email
              });
              console.log('DEBUG: Profile update email failed to send to', completeUser.email);
            }
          } else {
            console.log('DEBUG: No valid email address found for user, skipping email notification');
            VercelLogger.logWarning('PROFILE_UPDATE_EMAIL_SKIPPED', 'No valid email address found', {
              userId
            });
          }
        } catch (emailError: any) {
          console.error('ERROR: Email failed', emailError);
          VercelLogger.logError('PROFILE_UPDATE_EMAIL_EXCEPTION', emailError, {
            userId,
            recipient: updatedUser.email
          });
        }
      } else {
        console.log('DEBUG: Email not sent - either no email or profile not verified', {
          hasEmail: !!updatedUser.email,
          isVerified: !!updatedUser.isProfileVerified
        });
      }

      VercelLogger.logProfileEvent('PROFILE_UPDATE_SUCCESS', {
        userId
      });

      res.json(updatedUser);
    } catch (error: any) {
      VercelLogger.logError('PROFILE_UPDATE_EXCEPTION', error, {
        endpoint: '/api/profile'
      });
      res.status(500).json({ message: 'Profile update failed' });
    }
  });

  // Add tokens to user account
  app.post('/api/user/tokens/add', async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ message: 'No token provided. Please log in again.' });
      }

      // Validate JWT format before verification
      if (token.split('.').length !== 3) {
        return res.status(401).json({ message: 'Invalid token format. Please log in again.' });
      }

      let decoded;
      try {
        // Explicitly specify the algorithm to prevent "invalid algorithm" errors
        decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as any;
      } catch (verifyError: any) {
        console.error('JWT verification error:', verifyError.message);
        console.error('Token header:', JSON.parse(Buffer.from(token.split('.')[0], 'base64').toString()));
        return res.status(401).json({ message: 'Invalid token signature. Please log in again.' });
      }
      
      const userId = decoded.userId;

      const { amount, adId } = req.body;
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: 'Invalid token amount. Amount must be a positive number.' });
      }

      // Ad verification is strictly required in production
      if (!adId || typeof adId !== 'string' || !adId.trim()) {
        return res.status(400).json({ message: 'Ad verification is required before rewarding tokens.' });
      }

      console.log('Add User Tokens endpoint: Verifying ad status for adId:', adId);
      
      try {
        // Verify the ad status with Pi Platform API
        const ad = await piNetworkService.verifyAdStatus(adId);
        
        if (!ad) {
          console.log('Add User Tokens endpoint: Ad not found or verification failed for adId:', adId);
          return res.status(404).json({ message: 'Ad not found or verification failed.' });
        }
        
        // According to Pi Platform documentation, we should only reward users
        // if mediator_ack_status for given ad is "granted"
        if (ad.mediator_ack_status !== 'granted') {
          console.log('Add User Tokens endpoint: Ad reward not granted for adId:', adId);
          return res.status(403).json({ message: 'Ad verification failed. Reward not granted.' });
        }
        
        console.log('Add User Tokens endpoint: Ad reward verified for adId:', adId);
      } catch (adError: any) {
        console.error('Add User Tokens endpoint: Ad verification failed:', adError.message);
        return res.status(500).json({ message: `Ad verification failed: ${adError.message}` });
      }

      const updatedUser = await storage.addUserTokens(userId, amount);
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found. Please log in again.' });
      }

      res.json({ 
        message: 'Tokens added successfully',
        tokens: updatedUser.tokens 
      });
    } catch (error) {
      console.error('Add tokens error:', error);
      const errorMessage = (error as Error).message || 'Unknown error occurred';
      res.status(500).json({ message: `Failed to add tokens: ${errorMessage}` });
    }
  });

  // Daily login reward claim endpoint
  app.post('/api/token/claim/daily', async (req, res) => {
    try {
      const authToken = req.headers.authorization?.replace('Bearer ', '');
      if (!authToken) {
        return res.status(401).json({ message: 'No token provided. Please log in again.' });
      }

      if (authToken.split('.').length !== 3) {
        return res.status(401).json({ message: 'Invalid token format. Please log in again.' });
      }

      let decoded: any;
      try {
        decoded = jwt.verify(authToken, JWT_SECRET, { algorithms: ['HS256'] }) as any;
      } catch (verifyError: any) {
        return res.status(401).json({ message: 'Invalid token signature. Please log in again.' });
      }

      const userId = decoded.userId;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }

      // 24-hour cooldown check
      const now = new Date();
      if (user.lastDailyClaimAt) {
        const lastClaim = new Date(user.lastDailyClaimAt);
        const hoursSinceClaim = (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60);
        if (hoursSinceClaim < 24) {
          const hoursLeft = Math.ceil(24 - hoursSinceClaim);
          const nextClaimAt = new Date(lastClaim.getTime() + 24 * 60 * 60 * 1000);
          return res.status(429).json({
            message: `Daily reward already claimed. Come back in ${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''}.`,
            nextClaimAt: nextClaimAt.toISOString(),
            hoursLeft,
          });
        }
      }

      const DAILY_REWARD_TOKENS = 10;

      // Grant tokens via reward engine (writes to ledger + updates balance)
      await rewardEngine.grantTokens(userId, DAILY_REWARD_TOKENS, 'daily_login', 'Daily Login Reward');

      // Update lastDailyClaimAt timestamp
      await storage.updateUser(userId, { lastDailyClaimAt: now });

      // Return updated token balance
      const updatedUser = await storage.getUser(userId);

      // In-app notification for daily reward
      if (updatedUser?.piUID) {
        piNetworkService.sendInAppNotification({
          title: '🎁 Daily Reward Claimed!',
          body: `+${DAILY_REWARD_TOKENS} B4U Tokens added! Come back in 24 hours to collect your next daily bonus.`,
          user_uid: updatedUser.piUID,
          subroute: '/dashboard',
        }).catch(() => {});
      }

      res.json({
        message: `You claimed your daily reward of ${DAILY_REWARD_TOKENS} tokens!`,
        tokensAwarded: DAILY_REWARD_TOKENS,
        tokens: updatedUser?.tokens ?? 0,
        nextClaimAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      });
    } catch (error) {
      console.error('Daily claim error:', error);
      res.status(500).json({ message: 'Failed to claim daily reward. Please try again.' });
    }
  });

  // Daily login reward status endpoint
  app.get('/api/token/claim/daily/status', async (req, res) => {
    try {
      const authToken = req.headers.authorization?.replace('Bearer ', '');
      if (!authToken || authToken.split('.').length !== 3) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      let decoded: any;
      try {
        decoded = jwt.verify(authToken, JWT_SECRET, { algorithms: ['HS256'] }) as any;
      } catch {
        return res.status(401).json({ message: 'Invalid token' });
      }

      const user = await storage.getUser(decoded.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const now = new Date();
      let canClaim = true;
      let hoursLeft = 0;
      let nextClaimAt: string | null = null;

      if (user.lastDailyClaimAt) {
        const lastClaim = new Date(user.lastDailyClaimAt);
        const hoursSinceClaim = (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60);
        if (hoursSinceClaim < 24) {
          canClaim = false;
          hoursLeft = Math.ceil(24 - hoursSinceClaim);
          nextClaimAt = new Date(lastClaim.getTime() + 24 * 60 * 60 * 1000).toISOString();
        }
      }

      res.json({
        canClaim,
        hoursLeft,
        nextClaimAt,
        lastClaimedAt: user.lastDailyClaimAt ? new Date(user.lastDailyClaimAt).toISOString() : null,
        dailyRewardAmount: 10,
      });
    } catch (error) {
      console.error('Daily claim status error:', error);
      res.status(500).json({ message: 'Failed to fetch claim status.' });
    }
  });

  app.get('/api/token/rewards', async (_req, res) => {
    res.json({
      tokenName: B4U_TOKEN_NAME,
      tokenSymbol: B4U_TOKEN_SYMBOL,
      conversion: {
        rate: `${B4U_TO_PI_RATE} ${B4U_TOKEN_SYMBOL} = 1 Pi`,
        note: `${B4U_TOKEN_SYMBOL} is an in-app reward token, not real Pi. Redemption burns app tokens and creates a Pi treasury payout request.`,
      },
      offers: TOKEN_REWARD_OFFERS,
    });
  });

  app.get('/api/token/balance', async (req, res) => {
    try {
      const authToken = req.headers.authorization?.replace('Bearer ', '');
      if (!authToken || authToken.split('.').length !== 3) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const decoded = jwt.verify(authToken, JWT_SECRET, { algorithms: ['HS256'] }) as any;
      const userId = decoded.userId;
      const [user] = await db.select({ tokens: users.tokens }).from(users).where(eq(users.id, userId)).limit(1);
      if (!user) return res.status(404).json({ message: 'User not found' });

      const [totals] = await db
        .select({
          earned: sql<number>`COALESCE(SUM(CASE WHEN ${tokenTransactions.amount} > 0 THEN ${tokenTransactions.amount} ELSE 0 END), 0)`,
          spent: sql<number>`COALESCE(SUM(CASE WHEN ${tokenTransactions.amount} < 0 THEN ABS(${tokenTransactions.amount}) ELSE 0 END), 0)`,
        })
        .from(tokenTransactions)
        .where(eq(tokenTransactions.userId, userId));
      const [locked] = await db
        .select({ locked: sql<number>`COALESCE(SUM(${redemptionRequests.b4utAmount}), 0)` })
        .from(redemptionRequests)
        .where(sql`${redemptionRequests.userId} = ${userId} AND ${redemptionRequests.status} IN ('pending', 'approved')`);
      const recentRewards = await db
        .select()
        .from(tokenTransactions)
        .where(eq(tokenTransactions.userId, userId))
        .orderBy(desc(tokenTransactions.createdAt))
        .limit(20);

      res.json({
        tokenName: B4U_TOKEN_NAME,
        tokenSymbol: B4U_TOKEN_SYMBOL,
        conversionRate: B4U_TO_PI_RATE,
        balance: {
          total: user.tokens || 0,
          locked: Number(locked?.locked || 0),
          earned: Number(totals?.earned || 0),
          spent: Number(totals?.spent || 0),
        },
        recentRewards: recentRewards.map((entry) => ({
          id: entry.id,
          eventType: entry.type,
          amount: entry.amount,
          source: entry.description || entry.type,
          createdAt: entry.createdAt,
        })),
        rewardSources: TOKEN_REWARD_OFFERS,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to fetch token balance' });
    }
  });

  // Payment creation endpoint - stores payment data before approval
  app.post('/api/payment/create', async (req, res) => {
    try {
      const { paymentId, paymentData } = req.body;

      if (!paymentId) {
        return res.status(400).json({ message: 'Payment ID required' });
      }

      // paymentData should contain: userId, packageId (optional for tournaments), piAmount, usdAmount, piPriceAtTime, gameAccount, type
      const { userId, packageId, piAmount, usdAmount, piPriceAtTime, gameAccount, type, paymentType, tournamentId } = paymentData || {};
      const effectiveType = type || (paymentType === 'TOURNAMENT_ENTRY' ? 'tournament_entry' : undefined);

      if (!userId) {
        return res.status(400).json({ message: 'User ID required' });
      }

      // For tournament entries, packageId is optional
      if (effectiveType !== 'tournament_entry' && !packageId) {
        return res.status(400).json({ message: 'Package ID required for non-tournament payments' });
      }

      console.log('Creating payment record for paymentId:', paymentId, 'userId:', userId, 'packageId:', packageId, 'type:', effectiveType, 'paymentType:', paymentType);

      // Check if transaction already exists
      let transaction = await storage.getTransactionByPaymentId(paymentId);

      if (!transaction) {
        // Create new transaction record with pending status
        const transactionData = {
          userId: userId,
          packageId: packageId || null, // Allow null for tournament entries
          paymentId: paymentId,
          piAmount: piAmount?.toString() || '0',
          usdAmount: usdAmount?.toString() || '0',
          piPriceAtTime: piPriceAtTime?.toString() || '0',
          status: 'pending',
          gameAccount: gameAccount || {},
          metadata: { paymentId, type: effectiveType || 'backend' },
          paymentType: paymentType || (effectiveType === 'tournament_entry' ? 'TOURNAMENT_ENTRY' : 'TOKEN_PURCHASE'),
          tournamentId: effectiveType === 'tournament_entry' ? (tournamentId || paymentData?.metadata?.tournamentId || null) : null,
        };

        console.log('Creating new transaction:', transactionData);
        transaction = await storage.createTransaction(transactionData);
        console.log('Transaction created with ID:', transaction.id);
      } else {
        console.log('Transaction already exists with ID:', transaction.id, 'status:', transaction.status);
      }

      res.json({ success: true, transactionId: transaction.id, paymentId });
    } catch (error) {
      console.error('Payment creation error:', error);
      res.status(500).json({ message: 'Payment creation failed', error: (error as Error).message });
    }
  });

  // Payment cancellation endpoint - marks payment as cancelled
  app.post('/api/payment/cancel', async (req, res) => {
    try {
      const { paymentId } = req.body;
      
      if (!paymentId) {
        return res.status(400).json({ message: 'Payment ID required' });
      }

      console.log('Cancelling payment with paymentId:', paymentId);

      // Get transaction by payment ID
      const transaction = await storage.getTransactionByPaymentId(paymentId);
      
      if (!transaction) {
        return res.status(404).json({ message: 'Transaction not found' });
      }

      // Update transaction status to cancelled
      console.log('Updating transaction', transaction.id, 'status to cancelled');
      await storage.updateTransaction(transaction.id, { 
        status: 'cancelled',
        failureReason: 'Payment cancelled by user'
      });

      console.log('Transaction cancelled with ID:', transaction.id);

      // Send cancellation email to the user
      try {
        const user = await storage.getUser(transaction.userId);
        let packageInfo = null;
        
        if (transaction.metadata?.type === 'tournament_entry') {
          packageInfo = {
            name: `Tournament Entry - ${transaction.metadata?.gameAccount?.tournament || 'PUBG Mobile Arena'}`,
            game: 'PUBG'
          };
        } else if (transaction.packageId) {
          packageInfo = await storage.getPackage(transaction.packageId);
        }

        if (user && user.email) {
          console.log('Attempting to send payment cancellation email to user:', user.email);
          const emailSent = await emailService.sendPaymentFailureNotification({
            to: user.email,
            username: user.username || "Customer",
            packageName: packageInfo?.name || "Purchase",
            piAmount: transaction.piAmount?.toString() || "0",
            failureReason: 'Payment cancelled by user',
            transactionId: transaction.id.toString(),
            paymentId: paymentId,
            isCancelled: true,
            game: packageInfo?.game || undefined
          });

          if (emailSent) {
            console.log('Cancellation email sent successfully to:', user.email);
            await storage.updateTransaction(transaction.id, { emailSent: true });
          } else {
            console.log('Failed to send cancellation email to:', user.email);
          }
        } else {
          console.log('Skipping cancellation email - user or email not found');
        }
      } catch (emailError) {
        console.error('Cancellation email sending failed:', emailError);
      }

      res.json({ success: true, transactionId: transaction.id, status: 'cancelled' });
    } catch (error) {
      console.error('Payment cancellation error:', error);
      res.status(500).json({ message: 'Payment cancellation failed', error: (error as Error).message });
    }
  });

  // Payment approval endpoint
  app.post('/api/payment/approve', async (req, res) => {
    try {
      const { paymentId } = req.body;
      if (!paymentId) {
        return res.status(400).json({ message: 'Payment ID required' });
      }

      console.log('🔄 Starting payment approval for paymentId:', paymentId);

      // Get payment details from Pi Network
      console.log('📡 Fetching payment details from Pi Network...');
      const payment = await piNetworkService.getPayment(paymentId);
      if (!payment) {
        console.error('❌ Payment not found in Pi Network for paymentId:', paymentId);
        return res.status(404).json({ message: 'Payment not found' });
      }

      console.log('✅ Payment found:', {
        identifier: payment.identifier,
        amount: payment.amount,
        status: payment.status,
        metadata: payment.metadata
      });

      // Validate payment metadata
      if (!payment.metadata?.type || (payment.metadata.type !== 'backend' && payment.metadata.type !== 'tournament_entry' && payment.metadata.type !== 'subscription')) {
        console.error('❌ Invalid payment metadata:', payment.metadata);
        return res.status(400).json({ message: 'Invalid payment metadata' });
      }

      console.log('✅ Payment metadata validated, type:', payment.metadata.type);

      // Check if transaction already exists
      let transaction = await storage.getTransactionByPaymentId(paymentId);
      if (!transaction) {
        // Create new transaction record
        const currentPiPrice = await pricingService.getCurrentPiPrice();
        const usdAmount = pricingService.calculateUsdAmount(payment.amount);

        const transactionData = {
          userId: payment.metadata.userId,
          packageId: payment.metadata.packageId || null, // Allow null for tournament entries
          paymentId: payment.identifier,
          piAmount: payment.amount.toString(),
          usdAmount: usdAmount.toString(),
          piPriceAtTime: currentPiPrice.toString(),
          status: 'pending',
          gameAccount: payment.metadata.gameAccount,
          metadata: payment.metadata,
        };

        console.log('📝 Creating new transaction:', transactionData);
        transaction = await storage.createTransaction(transactionData);
        console.log('✅ Transaction created with ID:', transaction.id);
      } else {
        console.log('ℹ️ Transaction already exists with ID:', transaction.id);
      }

      // Approve payment with Pi Network
      console.log('🚀 Calling Pi Network to approve payment...');
      const approved = await piNetworkService.approvePayment(paymentId);
      if (!approved) {
        console.error('❌ Pi Network payment approval failed');
        await storage.updateTransaction(transaction.id, { status: 'failed' });
        return res.status(500).json({ message: 'Payment approval failed' });
      }

      console.log('✅ Pi Network payment approved successfully');

      // Update transaction status
      await storage.updateTransaction(transaction.id, { status: 'approved' });
      console.log('✅ Transaction status updated to approved');

      res.json({ success: true, transactionId: transaction.id });
    } catch (error) {
      console.error('Payment approval error:', error);
      res.status(500).json({ message: 'Payment approval failed' });
    }
  });

  // Payment completion endpoint
  app.post('/api/payment/complete', async (req, res) => {
    try {
      const { paymentId, txid } = req.body;
      if (!paymentId || !txid) {
        return res.status(400).json({ message: 'Payment ID and txid required' });
      }

      // 1. Authenticate the user from their session JWT
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ message: 'No token provided' });
      }
      let decoded: any;
      try {
        decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
      } catch (err) {
        return res.status(401).json({ message: 'Invalid token signature' });
      }
      const authenticatedUserId = decoded.userId;
      if (!authenticatedUserId) {
        return res.status(401).json({ message: 'Invalid user ID in token' });
      }

      // 2. Fetch transaction and verify strict user ownership (Access Control)
      const transaction = await storage.getTransactionByPaymentId(paymentId);
      if (!transaction) {
        return res.status(404).json({ message: 'Transaction not found' });
      }

      if (transaction.userId !== authenticatedUserId) {
        console.warn(`Payment Complete: User ${authenticatedUserId} attempted to complete transaction belonging to user ${transaction.userId}`);
        return res.status(403).json({ message: 'Access forbidden: this payment belongs to another user' });
      }

      // Idempotency: If transaction is already completed, return success immediately
      if (transaction.status === 'completed') {
        console.log('Payment Complete: Transaction is already marked completed. Returning cached success.', transaction.id);
        return res.json({ success: true, transactionId: transaction.id });
      }

      console.log('Completing payment for transaction ID:', transaction.id, 'Payment ID:', paymentId, 'TXID:', txid);

      // 3. Complete payment with Pi Network API
      const completed = await piNetworkService.completePayment(paymentId, txid);
      if (!completed) {
        await storage.updateTransaction(transaction.id, { status: 'failed' });
        return res.status(500).json({ message: 'Payment completion failed' });
      }

      // 4. Retrieve Stellar Horizon transaction to extract user wallet
      let walletAddress = '';
      if (txid && txid.length > 10) {
        console.log(`Payment Complete endpoint: Fetching user wallet from Stellar Horizon using txid: ${txid}`);
        try {
          const stellarResponse = await fetch(`https://api.mainnet.minepi.com/transactions/${txid}`, {
            headers: { 'Accept': 'application/json' }
          });
          if (stellarResponse.ok) {
            const stellarData = await stellarResponse.json() as any;
            const candidate = String(stellarData.source_account || '').trim();
            // source_account is the wallet that SENT the Pi (the user)
            if (candidate && !isAdminWalletAddress(candidate) && isValidStellarAddress(candidate)) {
              walletAddress = candidate;
              console.log(`Payment Complete endpoint: User wallet extracted from Stellar Horizon: ${walletAddress}`);
            }
            // Check operations as fallback
            if (!walletAddress && Array.isArray(stellarData._embedded?.records)) {
              for (const op of stellarData._embedded.records) {
                const opSource = String(op?.source_account || op?.from || '').trim();
                if (opSource && op.type === 'payment' && !isAdminWalletAddress(opSource) && isValidStellarAddress(opSource)) {
                  walletAddress = opSource;
                  console.log(`Payment Complete endpoint: User wallet extracted from Stellar op: ${walletAddress}`);
                  break;
                }
              }
            }
          } else {
            console.warn(`Payment Complete endpoint: Stellar Horizon returned status ${stellarResponse.status} for txid ${txid}`);
          }
        } catch (stellarErr: any) {
          console.error('Payment Complete endpoint: Stellar Horizon API error:', stellarErr.message);
        }
      }

      // Fallback: get payment details from Pi Network API
      if (!walletAddress) {
        try {
          const paymentDetails = await piNetworkService.getPayment(paymentId);
          if (paymentDetails) {
            const candidate = String(paymentDetails.direction === 'app_to_user' ? paymentDetails.to_address : paymentDetails.from_address || '').trim();
            if (candidate && !isAdminWalletAddress(candidate) && isValidStellarAddress(candidate)) {
              walletAddress = candidate;
              console.log('Payment Complete endpoint: Using fallback wallet address from getPayment:', walletAddress);
            }
          }
        } catch (error) {
          console.error('Payment Complete endpoint: Failed to get payment details fallback:', error);
        }
      }

      // 5. Update user's wallet address with duplicate-wallet check and safe binding
      if (walletAddress) {
        const user = await storage.getUser(authenticatedUserId);
        const isAdmin = user && String(user.piUID || '').trim() === OWNER_PI_UID;
        const [existingUserWithWallet] = await db
          .select()
          .from(users)
          .where(and(eq(users.walletAddress, walletAddress), isNotNull(users.walletAddress), ne(users.walletAddress, ''), ne(users.id, authenticatedUserId)))
          .limit(1);

        const decision = evaluateWalletBinding({
          incomingWalletAddress: walletAddress,
          currentWalletAddress: user?.walletAddress,
          duplicateOwnerUserId: existingUserWithWallet?.id,
          authenticatedUserId,
          isAdminUser: isAdmin,
          allowWalletUpdate: true,
        });

        if (decision.allowed && (decision.action === 'allow' || decision.action === 'noop')) {
          await storage.updateUser(authenticatedUserId, {
            walletAddress,
            walletVerifiedAt: new Date(),
            walletVerifiedPaymentId: paymentId,
            walletVerifiedTxid: txid
          });
          console.log('User wallet address securely linked with audit trail:', authenticatedUserId, walletAddress);
        } else if (!decision.allowed) {
          console.warn(`Payment Complete endpoint: Wallet binding skipped for user ${authenticatedUserId}: ${decision.reason}`);
          // Note: Blockchain payment completed successfully, so do NOT abort the transaction completion!
        }
      }

      // Update transaction with txid and completed status
      await storage.updateTransaction(transaction.id, { 
        status: 'completed', 
        txid: txid,
      });
      
      console.log('Transaction completed successfully with ID:', transaction.id);

      // Dispatch In-App Notification if recipient has a piUID (Pi Network v2 In-App Notifications)
      try {
        const recipient = await storage.getUser(authenticatedUserId);
        if (recipient?.piUID) {
          piNetworkService.sendInAppNotification({
            title: 'Payment Confirmed! 🎮',
            body: `Your payment of ${transaction.piAmount} Pi has been confirmed. Thank you!`,
            user_uid: recipient.piUID,
            subroute: '/dashboard'
          }).catch((err: any) => console.warn('Non-blocking in-app notification error:', err?.message || err));
        }
      } catch (notifyErr: any) {
        console.warn('Failed to dispatch payment notification:', notifyErr?.message || notifyErr);
      }

      // Handle subscription creation if transaction is a subscription
      try {
        const pkg = transaction.packageId ? await storage.getPackage(transaction.packageId) : null;
        const isSubscription = transaction.paymentType === 'SUBSCRIPTION' || 
          (transaction.metadata?.type === 'subscription') || 
          (pkg && pkg.game === 'PUBG_SUBSCRIPTION');
          
        if (isSubscription) {
          console.log(`Express Backend: Processing subscription creation for transaction ${transaction.id}...`);
          
          const metadata = transaction.metadata || {};
          const subscriptionDetails = metadata.subscriptionDetails || {};
          const subscriptionType = subscriptionDetails.subscriptionType || transaction.metadata?.subscriptionType || 
            (pkg && pkg.name.toLowerCase().includes('monthly') ? 'monthly' : 'weekly');
          const durationDays = subscriptionType === 'monthly' ? 30 : 7;
          
          const userName = subscriptionDetails.userName || metadata.userName || null;
          const userEmail = subscriptionDetails.userEmail || metadata.userEmail || null;
          const userPhone = subscriptionDetails.userPhone || subscriptionDetails.contactNumber || metadata.userPhone || null;
          const userGameIgn = subscriptionDetails.userGameIgn || metadata.userGameIgn || null;
          const userGameUid = subscriptionDetails.userGameUid || metadata.userGameUid || null;
          const userTeamName = subscriptionDetails.userTeamName || metadata.userTeamName || null;
          const subscriptionName = subscriptionDetails.subscriptionName || metadata.subscriptionName || 
            (pkg ? pkg.name : (subscriptionType === 'monthly' ? 'PUBG Monthly Tournament Pass' : 'PUBG Weekly Tournament Pass'));
          const amountPi = transaction.piAmount ? parseFloat(transaction.piAmount) : (subscriptionType === 'monthly' ? 30.0000 : 20.0000);

          await pool.query(
            `INSERT INTO pi_subscriptions (
              user_id,
              package_id,
              sub_id,
              auto_renew,
              status,
              expires_at,
              last_processed_at,
              user_name,
              user_email,
              user_phone,
              user_game_ign,
              user_game_uid,
              user_team_name,
              subscription_type,
              subscription_name,
              subscription_duration,
              amount_pi,
              created_at,
              updated_at
            ) VALUES (
              $1, $2, $3, false, 'active', NOW() + ($4 * interval '1 day'), NOW(),
              $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW()
            )
            ON CONFLICT (sub_id) DO UPDATE SET
              status = 'active',
              expires_at = EXCLUDED.expires_at,
              last_processed_at = NOW(),
              user_name = EXCLUDED.user_name,
              user_email = EXCLUDED.user_email,
              user_phone = EXCLUDED.user_phone,
              user_game_ign = EXCLUDED.user_game_ign,
              user_game_uid = EXCLUDED.user_game_uid,
              user_team_name = EXCLUDED.user_team_name,
              subscription_type = EXCLUDED.subscription_type,
              subscription_name = EXCLUDED.subscription_name,
              subscription_duration = EXCLUDED.subscription_duration,
              amount_pi = EXCLUDED.amount_pi,
              updated_at = NOW()`,
            [
              transaction.userId,
              transaction.packageId || null,
              paymentId,
              durationDays,
              userName,
              userEmail,
              userPhone,
              userGameIgn,
              userGameUid,
              userTeamName,
              subscriptionType,
              subscriptionName,
              `${durationDays} days`,
              amountPi,
            ]
          );
          console.log(`✅ Express Backend: Subscription activated/updated for user ${transaction.userId}`);
        }
      } catch (subError) {
        console.error('⚠️ Express Backend: Failed to process subscription creation:', subError);
      }

        // Log to admin_purchase_logs for real-time admin dashboard
        try {
          const user = await storage.getUser(transaction.userId);
          if (user) {
            const pkg = transaction.packageId ? await storage.getPackage(transaction.packageId) : null;
            const packageName = pkg?.name || 'Unknown Package';
            const game = pkg?.game || 'Unknown';
          
            const gameAccountString = typeof transaction.gameAccount === 'string'
              ? transaction.gameAccount
              : JSON.stringify(transaction.gameAccount);

            await pool.query(
              `INSERT INTO admin_purchase_logs (
                transaction_id, user_id, username, user_email, package_name, game, 
                pi_amount, usd_amount, game_account, payment_id, status, created_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
              [
                transaction.id,
                user.id,
                user.username,
                user.email,
                packageName,
                game,
                transaction.piAmount,
                transaction.usdAmount,
                gameAccountString,
                paymentId,
                'completed'
              ]
            );
            console.log('✅ ADMIN_PURCHASE_LOG_CREATED', { transactionId: transaction.id, username: user.username });
          }
        } catch (logError) {
          console.error('⚠️ Failed to log purchase to admin_purchase_logs:', logError);
          // Don't fail transaction if logging fails
        }
      // Send confirmation emails only for successful transactions
      try {
        const user = await storage.getUser(transaction.userId);

        // Handle tournament entries differently from package purchases
        const isTournamentEntry = transaction.metadata?.type === 'tournament_entry';
        let packageInfo = null;

        if (isTournamentEntry) {
          // For tournament entries, use tournament info from metadata
          packageInfo = {
            name: `Tournament Entry - ${transaction.metadata?.gameAccount?.tournament || 'PUBG Mobile Arena'}`,
            game: 'PUBG',
            inGameAmount: 0,
          };
        } else {
          // For regular package purchases, get package info
          const pkg = transaction.packageId ? await storage.getPackage(transaction.packageId) : null;
          if (pkg) {
            packageInfo = pkg;
          }
        }

        if (user && packageInfo && user.email) {
          // Convert gameAccount object to string for email
          const gameAccountString = typeof transaction.gameAccount === 'string'
            ? transaction.gameAccount
            : JSON.stringify(transaction.gameAccount);

          // Send email to user
          try {
            console.log('Attempting to send purchase confirmation email to user:', user.email);
            const userEmailResult = await sendPurchaseConfirmationEmail({
              to: user.email,
              username: user.username,
              packageName: packageInfo.name,
              piAmount: transaction.piAmount,
              usdAmount: transaction.usdAmount,
              gameAccount: gameAccountString,
              transactionId: transaction.id,
              paymentId: paymentId,
              isTestnet: false, // Always false for mainnet
              game: packageInfo.game, // Pass game type for correct logo
              gameAccounts: user.gameAccounts,
              socialAccounts: user.socialAccounts
            });

            if (userEmailResult) {
              console.log('Purchase confirmation email sent successfully to user:', user.email);
              // Mark email as sent in database
              await storage.updateTransaction(transaction.id, { emailSent: true });
            } else {
              console.log('Failed to send purchase confirmation email to user:', user.email);
            }
          } catch (userEmailError) {
            console.error('User confirmation email sending failed:', userEmailError);
            // Don't fail the transaction if user email fails
          }

          // Send email to admins
          try {
            console.log('Attempting to send purchase notification email to admins');
            const admins = await storage.getAllActiveAdmins();
            let adminEmailsSent = 0;
            const adminEmailResults = await Promise.all(admins.map(async (admin) => {
              if (admin.email) {
                const adminEmailResult = await sendAdminPurchaseNotification({
                  adminEmail: admin.email,
                  username: user.username,
                  userEmail: user.email,
                  userPhone: user.phone || 'Not provided',
                  packageName: packageInfo.name,
                  game: packageInfo.game,
                  inGameAmount: packageInfo.inGameAmount,
                  piAmount: transaction.piAmount,
                  usdAmount: transaction.usdAmount,
                  gameAccount: gameAccountString,
                  transactionId: transaction.id,
                  paymentId: paymentId,
                  txid: txid,
                });

                if (adminEmailResult) {
                  adminEmailsSent++;
                  console.log('Purchase notification email sent successfully to admin:', admin.email);
                  return { email: admin.email, success: true };
                } else {
                  console.log('Failed to send purchase notification email to admin:', admin.email);
                  return { email: admin.email, success: false };
                }
              }
              return { email: admin.email, success: false };
            }));

            console.log(`Sent purchase notification emails to ${adminEmailsSent} out of ${admins.length} admins`);
            console.debug('Admin email results:', adminEmailResults);

            // Track admin_email_sent if at least one admin received the email
            if (adminEmailsSent > 0) {
              try {
                await pool.query(
                  'UPDATE app_transactions SET admin_email_sent = true, updated_at = NOW() WHERE id = $1',
                  [transaction.id]
                );
                console.log('✅ admin_email_sent flag set for transaction:', transaction.id);
              } catch (flagErr) {
                console.error('Failed to set admin_email_sent flag:', flagErr);
              }
            }
          } catch (adminEmailError) {
            console.error('Admin notification email sending failed:', adminEmailError);
            // Don't fail the transaction if admin email fails
          }

          await storage.updateTransaction(transaction.id, { emailSent: true });
        } else {
          console.log('Skipping email sending - missing user, package info, or user email');
          if (!user) console.log('User not found for transaction:', transaction.userId);
          if (!packageInfo) console.log('Package info not available for transaction:', transaction.id, 'isTournamentEntry:', isTournamentEntry);
          if (user && !user.email) console.log('User email not set for user:', user.id);
        }
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        // Don't fail the transaction if email fails
      }

      // Process B4UT Token Rewards for this purchase
      try {
        if (transaction.piAmount) {
          await rewardEngine.processPurchaseReward(
            transaction.userId,
            parseFloat(transaction.piAmount),
            txid
          );
          console.log(`Successfully distributed B4UT rewards for transaction ${transaction.id}`);
        }
      } catch (rewardError) {
        console.error('Reward engine processing failed:', rewardError);
      }

      // If this transaction is a tournament entry, mark corresponding registration(s) as paid
      try {
        const isTournamentEntry = transaction.paymentType === 'TOURNAMENT_ENTRY' || transaction.metadata?.type === 'tournament_entry';
        if (isTournamentEntry) {
          const targetTournamentId = transaction.tournamentId || transaction.metadata?.tournamentId;
          if (targetTournamentId) {
            // Try to find registration by paymentId (on column or in metadata)
            let registration = undefined;
            if (transaction.paymentId) {
              registration = await storage.getTournamentRegistrationByPaymentId(transaction.paymentId as string);
            }
            if (!registration) {
              const regs = await storage.getUserTournamentRegistrations(transaction.userId);
              // Match by tournamentId + any pending/pre-registered status
              registration = regs.find(r =>
                r.tournamentId === targetTournamentId &&
                (r.paymentStatus === 'pending' || r.paymentStatus === 'unpaid' || r.status === 'pending_payment' ||
                 (r.metadata as any)?.paymentId === transaction.paymentId)
              ) as any;
            }

            if (registration) {
              if (!registration.teamId) {
                const registrationMetadata = (registration.metadata || {}) as any;
                const teamNameFromRegistration = String(registrationMetadata.teamName || `Team-${registration.id.slice(0, 8)}`).trim() || `Team-${registration.id.slice(0, 8)}`;
                
                const teamLeaderEmail = String(registrationMetadata.teamLeaderEmail || registrationMetadata.players?.[0]?.email || '').trim().toLowerCase();
                let captainUserId = registration.userId;
                if (teamLeaderEmail) {
                  const matchedUser = await storage.getUserByEmail(teamLeaderEmail);
                  if (matchedUser) {
                    console.log(`[Lobby Access Fix - Payment Complete] Matched team leader email ${teamLeaderEmail} to active user ${matchedUser.id}. Overriding captainUserId from registration.userId (${registration.userId})`);
                    captainUserId = matchedUser.id;
                  }
                }

                const teamMode = normalizeTournamentMode(registrationMetadata.mode) || inferTournamentModeFromPlayers(registrationMetadata.players) || 'solo';
                const team = await storage.createTournamentTeam({
                  tournamentId: targetTournamentId,
                  name: teamNameFromRegistration,
                  captainUserId,
                  inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
                  status: 'complete',
                  metadata: {
                    mode: teamMode,
                    teamLogo: registrationMetadata.teamLogo || null,
                    teamLeaderEmail,
                  } as any,
                });

                const teamPlayers = Array.isArray(registrationMetadata.players) ? registrationMetadata.players : [];
                for (const player of teamPlayers) {
                  let playerUserId = player.userId;
                  if (!playerUserId && player.email) {
                    const matchedPlayerUser = await storage.getUserByEmail(player.email);
                    if (matchedPlayerUser) {
                      playerUserId = matchedPlayerUser.id;
                    }
                  }
                  if (playerUserId && playerUserId !== captainUserId) {
                    await storage.addTournamentTeamMember(team.id, playerUserId, player.isCaptain ? 'captain' : 'member');
                  }
                }

                registration.teamId = team.id;
              }

              await storage.updateTournamentRegistration(registration.id, {
                status: 'registered',
                paymentStatus: 'paid',
                transactionId: transaction.id,
                teamId: registration.teamId || undefined,
                paidAmountPi: transaction.piAmount?.toString() || registration.paidAmountPi || '0',
                paymentId: transaction.paymentId || registration.paymentId,
                metadata: { ...(registration.metadata || {}), txid: txid, paymentId: transaction.paymentId },
              } as any);
              console.log('Marked tournament registration as paid for registration id:', registration.id);

              // Update tournament prize pool and close registration if full or closed by time
              try {
                const tournament = await storage.getTournament(targetTournamentId);
                if (tournament) {
                  const tournamentRegistrations = await storage.getTournamentRegistrations(targetTournamentId);
                  const paidEntryTotal = tournamentRegistrations
                    .filter((item) => item.paymentStatus === 'paid')
                    .reduce((total, item) => total + Number(item.paidAmountPi || 0), 0);
                  await storage.updateTournament(targetTournamentId, {
                    prizePoolPi: String((paidEntryTotal * 0.95).toFixed(8)),
                  } as any);

                  const maxParticipants = Number(tournament.maxParticipants || 0);
                  const paidCount = tournamentRegistrations.filter(r => r.paymentStatus === 'paid').length;
                  if (maxParticipants > 0 && paidCount >= maxParticipants) {
                    await storage.updateTournament(targetTournamentId, { status: 'registration_closed' } as any);
                    console.log('Tournament marked registration_closed because capacity reached');
                  }
                  // If registration close time passed, ensure status is closed
                  if (tournament.registrationClosesAt && new Date(tournament.registrationClosesAt) <= new Date()) {
                    await storage.updateTournament(targetTournamentId, { status: 'registration_closed' } as any);
                    console.log('Tournament marked registration_closed because registrationClosesAt passed');
                  }
                }
              } catch (tErr) {
                console.error('Failed updating tournament prize/closing after registration payment:', tErr);
              }
            } else {
              console.log('No matching tournament registration found to mark paid for transaction', transaction.id);
            }
          }
        }
      } catch (regErr) {
        console.error('Error marking tournament registration paid:', regErr);
      }

      res.json({ success: true, transactionId: transaction.id, txid });
    } catch (error) {
      console.error('Payment completion error:', error);
      res.status(500).json({ message: 'Payment completion failed' });
    }
  });

  // Incomplete payment resolution endpoint (per Pi SDK onIncompletePaymentFound specification)
  app.post('/api/payment/incomplete', async (req, res) => {
    try {
      const { paymentId } = req.body;
      if (!paymentId) {
        return res.status(400).json({ message: 'Payment ID required' });
      }

      console.log('Resolving incomplete payment:', paymentId);
      const payment = await piNetworkService.getPayment(paymentId);
      if (!payment) {
        return res.status(404).json({ message: 'Payment not found on Pi Network' });
      }

      // Check status flags
      if (payment.status?.developer_completed) {
        const tx = await storage.getTransactionByPaymentId(paymentId);
        if (tx && tx.status !== 'completed') {
          await storage.updateTransaction(tx.id, { status: 'completed', txid: payment.transaction?.txid });
        }
        return res.json({ success: true, message: 'Payment already completed' });
      }

      if (payment.status?.cancelled || payment.status?.user_cancelled) {
        const tx = await storage.getTransactionByPaymentId(paymentId);
        if (tx && tx.status !== 'cancelled') {
          await storage.updateTransaction(tx.id, { status: 'cancelled' });
        }
        return res.json({ success: true, message: 'Payment was cancelled' });
      }

      // If user submitted transaction to blockchain, complete it
      const txid = payment.transaction?.txid;
      if (txid) {
        const completed = await piNetworkService.completePayment(paymentId, txid);
        if (completed) {
          const tx = await storage.getTransactionByPaymentId(paymentId);
          if (tx) {
            await storage.updateTransaction(tx.id, { status: 'completed', txid });
          }
          return res.json({ success: true, message: 'Incomplete payment completed successfully', txid });
        }
        return res.status(500).json({ message: 'Failed to complete payment on Pi Network' });
      }

      // If not yet signed on blockchain, cancel it so user is unblocked
      if (!payment.status?.developer_approved) {
        await piNetworkService.cancelPayment(paymentId);
        const tx = await storage.getTransactionByPaymentId(paymentId);
        if (tx) {
          await storage.updateTransaction(tx.id, { status: 'cancelled' });
        }
        return res.json({ success: true, message: 'Payment cancelled to unblock new payments' });
      }

      return res.json({ success: true, payment });
    } catch (error: any) {
      console.error('Incomplete payment handling error:', error);
      res.status(500).json({ message: 'Error handling incomplete payment', error: error.message });
    }
  });

  // Ecosystem Directory Staking Status endpoint (September 2026 Developer Capability)
  app.get('/api/user/staking', async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ message: 'No token provided' });
      }
      let decoded: any;
      try {
        decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
      } catch (err) {
        return res.status(401).json({ message: 'Invalid token' });
      }

      const piUID = decoded.piUID;
      if (!piUID) {
        return res.status(400).json({ message: 'Pi UID not found in session' });
      }

      const liveStakingData = await piNetworkService.getUserAppStaking(piUID);
      
      // Calculate supporter tier and benefits based on effective stake
      const effectiveStake = liveStakingData?.effective_stake || 0;
      let supporterTier = 'None';
      let discountPercent = 0;
      let tokenBonusPercent = 0;

      if (effectiveStake >= 100) {
        supporterTier = 'Diamond Ambassador';
        discountPercent = 10;
        tokenBonusPercent = 25;
      } else if (effectiveStake >= 25) {
        supporterTier = 'Gold Booster';
        discountPercent = 5;
        tokenBonusPercent = 15;
      } else if (effectiveStake >= 5) {
        supporterTier = 'Silver Supporter';
        discountPercent = 2;
        tokenBonusPercent = 10;
      }

      res.json({
        success: true,
        isStaker: effectiveStake > 0,
        effectiveStake,
        baseStake: liveStakingData?.base_stake || 0,
        boostMultiplier: liveStakingData?.boost_multiplier || 1.0,
        stakedAt: liveStakingData?.staked_at || null,
        supporterTier,
        perks: {
          discountPercent,
          tokenBonusPercent,
          badge: supporterTier !== 'None' ? `${supporterTier} (Ecosystem Directory)` : null,
        },
        info: {
          title: "Pi Ecosystem Directory Staking",
          description: "Stake Pi in the Pi Browser Ecosystem Directory to boost B4U Esports ranking and unlock VIP gaming discounts and rewards."
        }
      });
    } catch (error: any) {
      console.error('Error fetching user staking status:', error);
      res.status(500).json({ message: 'Failed to fetch staking status', error: error.message });
    }
  });

  app.get('/api/health', async (req, res) => {
    try {
      res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
    } catch (error) {
      console.error('Health check failed:', error);
      res.status(500).json({ status: 'error', message: 'Health check failed' });
    }
  });

  app.post('/api/payouts', async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ message: 'No token provided' });
      }

      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET) as any;
      } catch (verifyError: any) {
        console.error('Payout JWT verification failed:', verifyError);
        return res.status(401).json({ message: 'Invalid token' });
      }

      const userId = decoded.userId;
      const { amount, reward_reason, tournament_id, rank, description } = req.body;
      const payoutReasons = [
        'tournament_prize',
        'referral_bonus',
        'daily_reward',
        'achievement_reward',
        'promo_reward',
      ];

      if (!amount || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ message: 'Invalid amount. Amount must be a positive number.' });
      }

      if (!reward_reason || !payoutReasons.includes(reward_reason)) {
        return res.status(400).json({ message: 'Invalid reward reason.' });
      }

      // Resolve A2U recipient using Pi UID (per Pi SDK docs, A2U requires uid, not wallet address)
      const recipient = await resolveA2URecipient({ userId });
      if (!recipient.user) {
        return res.status(404).json({ message: 'User not found' });
      }
      if (!recipient.uid) {
        return res.status(400).json({ message: 'User has no verified Pi UID. They must log in with Pi Network first.' });
      }

      const payoutId = `PAYOUT_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      const memo = `${reward_reason}${description ? ` - ${description}` : ''}`;

      // Use the full 3-step A2U payment flow (create → submit → complete)
      const result = await piNetworkService.processFullA2UPayment({
        amount,
        memo,
        metadata: {
          payoutId,
          userId,
          reward_reason,
          tournament_id: tournament_id || null,
          rank: rank || null,
          description: description || null,
        },
        uid: recipient.uid,
      });

      if (!result) {
        return res.status(500).json({ message: 'Failed to process Pi Network payout' });
      }

      // Record payout in database
      try {
        await storage.createTransaction({
          userId: recipient.user.id,
          packageId: 'a2u_payout',
          paymentId: result.paymentId,
          piAmount: amount.toString(),
          usdAmount: '0',
          piPriceAtTime: '0',
          status: 'completed',
          gameAccount: {},
          txid: result.txid,
          metadata: {
            type: 'payout',
            payoutId,
            reward_reason,
            tournament_id: tournament_id || null,
            rank: rank || null,
            description: description || null,
          } as any,
        });
      } catch (dbErr) {
        console.error('Failed to record payout in database:', dbErr);
      }

      res.status(201).json({
        success: true,
        data: {
          payout_id: payoutId,
          payment_id: result.paymentId,
          txid: result.txid,
          amount,
          reward_reason,
          status: 'completed',
          network: 'mainnet',
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Payout creation failed:', error);
      res.status(500).json({ message: 'Payout creation failed', error: (error as Error)?.message || 'Unknown error' });
    }
  });

  // POST /api/payments/a2u - Send Pi from app to user (A2U payment) - Testnet/Sandbox only
  app.post('/api/payments/a2u', async (req, res) => {
    if (!PI_SANDBOX_MODE) {
      return res.status(503).json({ error: 'Pi App-to-User payments are currently supported only in Pi Testnet.' });
    }
    try {
      const { uid, piUID, walletAddress, userId, amount, memo, metadata } = req.body;

      // ✅ Basic validation
      if (!amount) {
        return res.status(400).json({ 
          error: "amount is required",
          timestamp: new Date().toISOString()
        });
      }

      // Validate amount range for mainnet
      if (amount < 0.001 || amount > 1000000) {
        return res.status(400).json({ 
          error: "Invalid amount: must be between 0.001 and 1,000,000 Pi",
          timestamp: new Date().toISOString()
        });
      }

      // Resolve by Pi UID, wallet address, or app user id. Pi A2U itself requires Pi UID.
      const recipient = await resolveA2URecipient({ userId, piUID: piUID || uid, walletAddress });
      const user = recipient.user;
      if (!user) {
        return res.status(404).json({ 
          error: "User not found for provided Pi UID or wallet address",
          timestamp: new Date().toISOString()
        });
      }

      console.log(`🔄 A2U Payment (TESTNET/SANDBOX): Sending ${amount} Pi to user ${user.username} (UID: ${uid})`);

      // 🧠 Step 1: Create payment using A2U flow
      const paymentArgs = {
        amount: Number(amount),
        memo: memo || "B4U Esports Payment",
        metadata: {
          type: "A2U",
          user_id: user.id,
          username: user.username,
          wallet_address: recipient.walletAddress || undefined,
          network: "mainnet",
          timestamp: Date.now(),
          ...metadata
        },
        uid: recipient.uid
      };

      const paymentId = await piNetworkService.createA2UPayment(paymentArgs);
      
      if (!paymentId) {
        return res.status(500).json({
          error: "Failed to create payment",
          timestamp: new Date().toISOString()
        });
      }

      console.log(`✅ Step 1: Payment created with ID: ${paymentId}`);

      // 🧠 Step 2: Submit payment to blockchain
      const txid = await piNetworkService.submitPaymentToBlockchain(paymentId);
      
      if (!txid) {
        return res.status(500).json({
          error: "Failed to submit payment to blockchain",
          paymentId,
          timestamp: new Date().toISOString()
        });
      }

      console.log(`✅ Step 2: Payment submitted with TXID: ${txid}`);

      // 🧠 Step 3: Complete payment
      const completedPayment = await piNetworkService.completePaymentInServer(paymentId, txid);
      
      if (!completedPayment) {
        return res.status(500).json({
          error: "Failed to complete payment",
          paymentId,
          txid,
          timestamp: new Date().toISOString()
        });
      }

      console.log(`✅ Step 3: Payment completed:`, completedPayment.status);

      // ✅ Save to database
      const transactionId = `a2u_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      try {
        // Create transaction record in database
        await storage.createTransaction({
          userId: user.id,
          packageId: 'a2u_payment', // Special ID for A2U payments
          paymentId: paymentId,
          piAmount: amount.toString(),
          usdAmount: '0', // A2U payments don't have USD equivalent
          piPriceAtTime: '0',
          status: 'completed',
          gameAccount: {},
          metadata: {
            type: 'A2U',
            payment_id: paymentId,
            txid: txid,
            pi_uid: recipient.uid,
            wallet_address: recipient.walletAddress || undefined,
            network: 'mainnet',
            completed_at: new Date().toISOString(),
            ...metadata
          },
          txid: txid
        });

        console.log(`✅ Transaction saved to database: ${transactionId}`);
      } catch (dbError) {
        console.error('Failed to save transaction to database:', dbError);
        // Don't fail the response if database save fails
      }

      return res.status(200).json({
        success: true,
        paymentId,
        txid,
        transactionId,
        amount: Number(amount),
        user: {
          id: user.id,
          username: user.username,
          piUID: user.piUID,
          walletAddress: recipient.walletAddress || undefined
        },
        status: completedPayment.status,
        network: 'mainnet',
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error("❌ A2U Payment Error (TESTNET/SANDBOX):", error.message);
      
      if (error.response?.data) {
        console.error("Pi Network API Error:", JSON.stringify(error.response.data, null, 2));
      }

      return res.status(500).json({
        error: "Payment failed",
        details: error.message,
        network: 'mainnet',
        timestamp: new Date().toISOString()
      });
    }
  });

  // POST /api/payments/a2u/tournament-prize — Pay tournament winner via A2U
  app.post('/api/payments/a2u/tournament-prize', authenticateAdmin, async (req, res) => {
    if (!PI_SANDBOX_MODE) {
      return res.status(503).json({ error: 'Pi App-to-User payments are currently supported only in Pi Testnet.' });
    }
    try {
      const { userId, piUID, amount, tournamentId, rank, memo } = req.body;
      if (!amount || (!userId && !piUID)) {
        return res.status(400).json({ error: 'amount and userId or piUID required' });
      }
      const recipient = await resolveA2URecipient({ userId, piUID });
      if (!recipient.user) return res.status(404).json({ error: 'User not found' });
      if (!recipient.uid) return res.status(400).json({ error: 'User has no verified Pi UID' });

      const result = await piNetworkService.processFullA2UPayment({
        amount: Number(amount),
        memo: memo || `B4U Esports Tournament Prize — Rank #${rank || '?'}`,
        metadata: { type: 'tournament_prize', tournamentId, rank, userId: recipient.user.id },
        uid: recipient.uid,
      });

      if (!result) return res.status(500).json({ error: 'A2U payment failed' });

      // Update leaderboard prize status
      if (tournamentId) {
        await storage.rebuildTournamentLeaderboard(tournamentId).catch(() => {});
      }

      console.log(`✅ Tournament prize A2U: ${amount} Pi → ${recipient.user.username} (${recipient.uid}), txid: ${result.txid}`);
      return res.status(200).json({ success: true, paymentId: result.paymentId, txid: result.txid, amount, recipient: { username: recipient.user.username, piUID: recipient.uid } });
    } catch (error: any) {
      console.error('Tournament prize A2U error:', error.message);
      return res.status(500).json({ error: 'Tournament prize payment failed', details: error.message });
    }
  });

  // POST /api/payments/a2u/refund — Refund a transaction via A2U
  app.post('/api/payments/a2u/refund', authenticateAdmin, async (req, res) => {
    if (!PI_SANDBOX_MODE) {
      return res.status(503).json({ error: 'Pi App-to-User payments are currently supported only in Pi Testnet.' });
    }
    try {
      const { transactionId, userId, piUID, amount, reason } = req.body;
      if (!amount || (!userId && !piUID && !transactionId)) {
        return res.status(400).json({ error: 'amount and userId/piUID or transactionId required' });
      }

      let resolvedUserId = userId;
      let resolvedPiUID = piUID;

      if (transactionId && !resolvedUserId) {
        const tx = await storage.getTransaction(transactionId);
        if (!tx) return res.status(404).json({ error: 'Transaction not found' });
        resolvedUserId = tx.userId;
      }

      const recipient = await resolveA2URecipient({ userId: resolvedUserId, piUID: resolvedPiUID });
      if (!recipient.user) return res.status(404).json({ error: 'User not found' });
      if (!recipient.uid) return res.status(400).json({ error: 'User has no verified Pi UID' });

      const result = await piNetworkService.processFullA2UPayment({
        amount: Number(amount),
        memo: reason || 'B4U Esports Refund',
        metadata: { type: 'refund', transactionId, reason, userId: recipient.user.id },
        uid: recipient.uid,
      });

      if (!result) return res.status(500).json({ error: 'A2U refund payment failed' });

      // Mark original transaction as refunded
      if (transactionId) {
        await storage.updateTransaction(transactionId, { status: 'refunded', successReason: `Refunded via A2U. TxID: ${result.txid}` });
      }

      console.log(`✅ Refund A2U: ${amount} Pi → ${recipient.user.username} (${recipient.uid}), txid: ${result.txid}`);
      return res.status(200).json({ success: true, paymentId: result.paymentId, txid: result.txid, amount, recipient: { username: recipient.user.username, piUID: recipient.uid } });
    } catch (error: any) {
      console.error('Refund A2U error:', error.message);
      return res.status(500).json({ error: 'Refund payment failed', details: error.message });
    }
  });

  // POST /api/payments/a2u/giveaway — Send giveaway reward via A2U
  app.post('/api/payments/a2u/giveaway', authenticateAdmin, async (req, res) => {
    if (!PI_SANDBOX_MODE) {
      return res.status(503).json({ error: 'Pi App-to-User payments are currently supported only in Pi Testnet.' });
    }
    try {
      const { userId, piUID, amount, reason } = req.body;
      if (!amount || (!userId && !piUID)) {
        return res.status(400).json({ error: 'amount and userId or piUID required' });
      }
      const recipient = await resolveA2URecipient({ userId, piUID });
      if (!recipient.user) return res.status(404).json({ error: 'User not found' });
      if (!recipient.uid) return res.status(400).json({ error: 'User has no verified Pi UID' });

      const result = await piNetworkService.processFullA2UPayment({
        amount: Number(amount),
        memo: reason || 'B4U Esports Giveaway Reward',
        metadata: { type: 'giveaway', reason, userId: recipient.user.id },
        uid: recipient.uid,
      });

      if (!result) return res.status(500).json({ error: 'A2U giveaway payment failed' });

      console.log(`✅ Giveaway A2U: ${amount} Pi → ${recipient.user.username} (${recipient.uid}), txid: ${result.txid}`);
      return res.status(200).json({ success: true, paymentId: result.paymentId, txid: result.txid, amount, recipient: { username: recipient.user.username, piUID: recipient.uid } });
    } catch (error: any) {
      console.error('Giveaway A2U error:', error.message);
      return res.status(500).json({ error: 'Giveaway payment failed', details: error.message });
    }
  });

  app.post('/api/verify', async (req, res) => {
    try {
      const { transaction_id } = req.body;
      if (!transaction_id) {
        return res.status(400).json({ message: 'transaction_id is required' });
      }

      let paymentId = transaction_id;
      let transaction = await storage.getTransaction(transaction_id as string);
      if (!transaction) {
        transaction = await storage.getTransactionByPaymentId(transaction_id as string);
      }
      if (transaction?.paymentId) {
        paymentId = transaction.paymentId;
      }

      const payment = await piNetworkService.getPayment(paymentId);
      if (!payment) {
        return res.status(404).json({ message: 'Payment not found' });
      }

      res.json({ success: true, data: payment });
    } catch (error) {
      console.error('Verify transaction failed:', error);
      res.status(500).json({ message: 'Failed to verify transaction', error: (error as Error)?.message || 'Unknown error' });
    }
  });

  app.post('/api/refunds', authenticateAdmin, async (req, res) => {
    try {
      const admin = req.admin;
      if (!admin) {
        return res.status(403).json({ message: 'Admin authorization required' });
      }

      const { transactionId, transaction_id, reason, amount, piUID, uid, walletAddress } = req.body;
      const lookupId = transactionId || transaction_id;
      if (!lookupId || !reason) {
        return res.status(400).json({ message: 'transactionId and reason are required' });
      }

      let transaction = await storage.getTransaction(lookupId as string);
      if (!transaction) {
        transaction = await storage.getTransactionByPaymentId(lookupId as string);
      }

      if (!transaction) {
        return res.status(404).json({ message: 'Transaction not found' });
      }

      if (transaction.status === 'refund_requested' || transaction.status === 'refund_pending' || transaction.status === 'refunded') {
        return res.status(400).json({ message: 'Refund already requested or processed for this transaction' });
      }

      const refundAmount = Number(amount ?? transaction.piAmount);
      if (!Number.isFinite(refundAmount) || refundAmount < 0.001 || refundAmount > Number(transaction.piAmount)) {
        return res.status(400).json({ message: `Refund amount must be between 0.001 and the original payment amount (${transaction.piAmount} Pi)` });
      }

      const transactionUser = await storage.getUser(transaction.userId);
      const recipient = await resolveA2URecipient({
        userId: transaction.userId,
        piUID: piUID || uid || transactionUser?.piUID,
        walletAddress: walletAddress || transactionUser?.walletAddress,
      });

      await storage.updateTransaction(transaction.id, {
        status: 'refund_pending',
        failureReason: reason,
      });

      console.log(`Admin ${admin.username} processing refund for transaction ${transaction.id} to Pi UID ${recipient.uid}`);

      const refundResult = await piNetworkService.createEnhancedServerTransfer(
        recipient.uid,
        refundAmount,
        `B4U Esports refund for ${transaction.id}`,
        {
          type: 'refund',
          original_transaction_id: transaction.id,
          original_payment_id: transaction.paymentId,
          reason,
          requested_by: admin.username,
          recipient_user_id: recipient.user?.id || transaction.userId,
          recipient_pi_uid: recipient.uid,
          recipient_wallet_address: recipient.walletAddress || undefined,
        },
      );

      if (!refundResult) {
        await storage.updateTransaction(transaction.id, {
          status: 'refund_requested',
          failureReason: `Refund A2U failed: ${reason}`,
        });
        return res.status(502).json({ message: 'Refund A2U payment failed. Transaction left as refund_requested for retry.' });
      }

      await storage.updateTransaction(transaction.id, {
        status: 'refunded',
        failureReason: reason,
        txid: refundResult.txid,
      });

      // Dispatch In-App Notification for refund
      if (recipient.uid) {
        piNetworkService.sendInAppNotification({
          title: '💸 Refund Processed',
          body: `Your refund of ${refundAmount} Pi for transaction #${transaction.id.slice(0, 8)} has been processed!`,
          user_uid: recipient.uid,
          subroute: '/dashboard',
        }).catch(() => {});
      }

      res.json({
        success: true,
        data: {
          transactionId: transaction.id,
          status: 'refunded',
          amount: refundAmount,
          requestedBy: admin.username,
          paymentId: refundResult.paymentId,
          txid: refundResult.txid,
          recipient: {
            userId: recipient.user?.id || transaction.userId,
            piUID: recipient.uid,
            walletAddress: recipient.walletAddress || undefined,
          },
        },
      });
    } catch (error) {
      console.error('Refund request failed:', error);
      res.status(500).json({ message: 'Failed to request refund', error: (error as Error)?.message || 'Unknown error' });
    }
  });

  // Get user transactions with filtering and sorting
  app.get('/api/transactions', async (req, res) => {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(2, 15);
    
    console.log(`[${requestId}] Main server transactions endpoint: Request received`, {
      method: req.method,
      url: req.url,
      headers: req.headers,
      query: req.query,
      startTime: new Date().toISOString()
    });
    
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        const errorResponse = { 
          message: 'No token provided', 
          requestId 
        };
        console.log(`[${requestId}] Main server transactions endpoint: No token provided`, errorResponse);
        return res.status(401).json(errorResponse);
      }

      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const userId = decoded?.userId;
      if (!userId || typeof userId !== 'string') {
        console.error('Main server transactions endpoint: Invalid userId in token', { decoded });
        return res.status(401).json({ message: 'Invalid authentication token' });
      }
      
      // Get query parameters for filtering and sorting
      const { status, sort, userId: requestedUserId } = req.query as { status?: string; sort?: 'date' | 'amount'; userId?: string };
      const normalizedStatus = typeof status === 'string' ? status.toLowerCase() : undefined;
      const filterStatus = normalizedStatus === 'all' ? 'all' : normalizedStatus || undefined;
      const isAdmin = Boolean(decoded?.isAdmin);
      const walletAccess = (await import('../server/wallet-access.js')).enforceWalletTransactionAccess({
        currentUserId: userId,
        requestedUserId,
        isAdmin,
      });
      if (!walletAccess.allowed) {
        console.warn(`[${requestId}] Main server transactions endpoint: wallet access denied`, { requestedUserId, userId, reason: walletAccess.reason });
        return res.status(403).json({ message: walletAccess.reason || 'Forbidden: transaction history is scoped to the authenticated user' });
      }
      
      console.log(`[${requestId}] Main server transactions endpoint: Query parameters`, { status, filterStatus, sort, requestedUserId });

      const transactions = await storage.getUserTransactions(userId, filterStatus, sort);
      
      const responseTime = Date.now() - startTime;
      console.log(`[${requestId}] Main server transactions endpoint: Returning transactions`, { 
        userId, 
        count: transactions.length,
        responseTime,
        success: true 
      });
      
      res.json(transactions);
    } catch (error) {
      const errorResponse = { 
        message: 'Failed to fetch transactions', 
        error: (error as Error).message,
        stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined,
        requestId,
        duration: Date.now() - startTime
      };
      
      console.error(`[${requestId}] Main server transactions endpoint: Fetch error`, errorResponse);
      res.status(500).json(errorResponse);
    }
  });

  // Endpoint to fetch and update user's wallet address
  app.post('/api/user/connect-wallet', async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ message: 'No token provided' });
      }

      // Validate JWT format before verification
      if (token.split('.').length !== 3) {
        return res.status(401).json({ message: 'Invalid token format' });
      }

      let decoded;
      try {
        // Explicitly specify the algorithm to prevent "invalid algorithm" errors
        decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as any;
      } catch (verifyError: any) {
        console.error('JWT verification error:', verifyError.message);
        console.error('Token header:', JSON.parse(Buffer.from(token.split('.')[0], 'base64').toString()));
        return res.status(401).json({ message: 'Invalid token signature' });
      }
      
      const userId = decoded.userId;
      if (!userId) {
        return res.status(400).json({ message: 'Invalid user ID in token' });
      }

      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      // If user already has a connected wallet, return it immediately
      if (currentUser.walletAddress && currentUser.walletAddress.trim().length > 0) {
        console.log(`Connect Wallet: User ${userId} already has connected wallet: ${currentUser.walletAddress}`);
        return res.json({ 
          message: 'Wallet address connected successfully',
          walletAddress: currentUser.walletAddress.trim(),
          alreadyConnected: true
        });
      }

      // Get user's recent transactions to extract wallet address (sorted newest first)
      const userTransactions = await storage.getUserTransactions(userId);
      const completedTransactions = (userTransactions || [])
        .filter((tx: any) => ['completed', 'approved'].includes(String(tx.status || '').toLowerCase()))
        .sort((a: any, b: any) => new Date(b.createdAt || b.created_at || 0).getTime() - new Date(a.createdAt || a.created_at || 0).getTime());
      const hasCompletedPurchase = completedTransactions.length > 0;
      let walletAddress = '';
      let matchingTx: any = null;

      // Look for a completed or approved transaction with a txid, then use Stellar Horizon to get the real user wallet
      if (hasCompletedPurchase) {
        for (const transaction of completedTransactions) {
          if (!transaction.txid || transaction.txid.length <= 10) {
            continue;
          }
          try {
            console.log(`Connect Wallet: Fetching user wallet from Stellar Horizon using txid: ${transaction.txid}`);
            const stellarResponse = await fetch(`https://api.mainnet.minepi.com/transactions/${transaction.txid}`, {
              headers: { 'Accept': 'application/json' }
            });
            if (stellarResponse.ok) {
              const stellarData = await stellarResponse.json() as any;
              const candidate = String(stellarData.source_account || '').trim();
              // source_account is the wallet that SENT the Pi (the user)
              if (candidate && !isAdminWalletAddress(candidate) && isValidStellarAddress(candidate)) {
                walletAddress = candidate;
                matchingTx = transaction;
                console.log(`Connect Wallet: User wallet extracted from Stellar Horizon: ${walletAddress}`);
                break;
              }
              // Operations fallback
              if (Array.isArray(stellarData._embedded?.records)) {
                for (const op of stellarData._embedded.records) {
                  const opSource = String(op?.source_account || op?.from || '').trim();
                  if (opSource && op.type === 'payment' && !isAdminWalletAddress(opSource) && isValidStellarAddress(opSource)) {
                    walletAddress = opSource;
                    matchingTx = transaction;
                    console.log(`Connect Wallet: User wallet extracted from Stellar op: ${walletAddress}`);
                    break;
                  }
                }
                if (walletAddress) break;
              }
            } else {
              console.warn(`Connect Wallet: Stellar Horizon returned ${stellarResponse.status} for txid ${transaction.txid}`);
            }
          } catch (error) {
            console.error('Connect Wallet: Stellar Horizon API error:', error);
          }
        }
      }

      // Fallback: Check Pi payment details if Horizon lookup didn't yield a user wallet
      if (!walletAddress && hasCompletedPurchase) {
        for (const transaction of completedTransactions) {
          const paymentId = (transaction as any).paymentId || (transaction as any).payment_id;
          if (!paymentId) continue;
          try {
            const paymentDetails = await piNetworkService.getPayment(paymentId);
            if (paymentDetails) {
              const candidate = String(paymentDetails.direction === 'app_to_user' ? paymentDetails.to_address : paymentDetails.from_address || '').trim();
              if (candidate && !isAdminWalletAddress(candidate) && isValidStellarAddress(candidate)) {
                walletAddress = candidate;
                matchingTx = transaction;
                console.log(`Connect Wallet: User wallet extracted from Pi payment details for payment ${paymentId}: ${walletAddress}`);
                break;
              }
            }
          } catch (piErr) {
            console.warn('Connect Wallet: Failed to get payment details fallback:', piErr);
          }
        }
      }

      if (walletAddress) {
        const [existingUserWithWallet] = await db
          .select()
          .from(users)
          .where(and(eq(users.walletAddress, walletAddress), isNotNull(users.walletAddress), ne(users.walletAddress, ''), ne(users.id, userId)))
          .limit(1);

        const decision = evaluateWalletBinding({
          incomingWalletAddress: walletAddress,
          currentWalletAddress: currentUser?.walletAddress,
          duplicateOwnerUserId: existingUserWithWallet?.id,
          authenticatedUserId: userId,
          isAdminUser: currentUser && String(currentUser.piUID || '').trim() === OWNER_PI_UID,
          allowWalletUpdate: true,
        });

        if (!decision.allowed) {
          console.warn(`Connect Wallet: Rejected wallet binding for user ${userId}: ${decision.reason}`);
          return res.status(409).json({ error: decision.reason || 'Wallet binding rejected.' });
        }
      }

      if (!hasCompletedPurchase && !currentUser?.walletAddress) {
        return res.status(404).json({ message: 'No wallet address found. You must complete at least one purchase before you can connect your wallet. After making a purchase, your wallet address will be automatically extracted from the blockchain transaction.' });
      }

      if (!walletAddress) {
        return res.status(404).json({ message: 'No wallet address found. You must complete at least one purchase before you can connect your wallet. After making a purchase, your wallet address will be automatically extracted from the blockchain transaction.' });
      }

      // Update user's wallet address with audit trail
      const updatedUser = await storage.updateUser(userId, { 
        walletAddress,
        walletVerifiedAt: new Date(),
        walletVerifiedPaymentId: matchingTx?.paymentId || null,
        walletVerifiedTxid: matchingTx?.txid || null
      });
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Ensure response is sent as valid JSON
      if (!res.headersSent) {
        res.json({ 
          message: 'Wallet address connected successfully',
          walletAddress: updatedUser.walletAddress
        });
      }
    } catch (error) {
      console.error('Connect wallet error:', error);
      // Ensure we always return valid JSON
      if (!res.headersSent) {
        res.status(500).json({ message: 'Failed to connect wallet: ' + (error instanceof Error ? error.message : 'Unknown error') });
      }
    }
  });

  // Get active user subscriptions
  app.get('/api/user/subscriptions', async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ message: 'No token provided' });
      }

      if (token.split('.').length !== 3) {
        return res.status(401).json({ message: 'Invalid token format' });
      }

      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as any;
      } catch (verifyError: any) {
        console.error('JWT verification error:', verifyError.message);
        return res.status(401).json({ message: 'Invalid token signature' });
      }

      const userId = decoded.userId;
      if (!userId) {
        return res.status(400).json({ message: 'Invalid user ID in token' });
      }

      const client = await pool.connect();
      try {
        const result = await client.query(
          `SELECT 
            id,
            user_id,
            sub_id,
            status,
            subscription_type,
            subscription_name,
            subscription_duration,
            amount_pi,
            expires_at,
            last_processed_at,
            created_at,
            updated_at,
            user_name,
            user_email,
            user_game_ign,
            user_game_uid,
            user_team_name,
            CASE 
              WHEN status = 'active' AND expires_at > NOW() THEN true
              ELSE false
            END as is_currently_active,
            CASE 
              WHEN status = 'active' AND expires_at > NOW() 
              THEN expires_at - NOW()
              ELSE NULL
            END as remaining_duration
          FROM pi_subscriptions
          WHERE user_id = $1
          ORDER BY 
            CASE WHEN status = 'active' AND expires_at > NOW() THEN 0 ELSE 1 END,
            created_at DESC`,
          [userId]
        );

        const subscriptions = result.rows.map((row: any) => ({
          id: row.id,
          subscriptionType: row.subscription_type,
          subscriptionName: row.subscription_name,
          subscriptionDuration: row.subscription_duration,
          status: row.is_currently_active ? 'active' : (row.status === 'active' ? 'expired' : row.status),
          amountPi: row.amount_pi,
          activeSince: (row.last_processed_at || row.created_at) ? new Date(row.last_processed_at || row.created_at).toISOString() : null,
          activeUntil: row.expires_at ? new Date(row.expires_at).toISOString() : null,
          isCurrentlyActive: row.is_currently_active,
          remainingDuration: row.remaining_duration ? {
            days: Math.floor(row.remaining_duration.days || 0),
            hours: Math.floor(row.remaining_duration.hours || 0),
          } : null,
          userName: row.user_name,
          userEmail: row.user_email,
          userGameIgn: row.user_game_ign,
          userGameUid: row.user_game_uid,
          userTeamName: row.user_team_name,
          createdAt: row.created_at,
        }));

        res.json({ subscriptions });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Fetch subscriptions error:', error);
      res.status(500).json({
        message: 'Failed to fetch subscriptions',
        subscriptions: [],
      });
    }
  });

  // New endpoint to fetch user's Pi wallet balance
  app.get('/api/user/balance', async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ message: 'No token provided' });
      }

      // Validate JWT format before verification
      if (token.split('.').length !== 3) {
        return res.status(401).json({ message: 'Invalid token format' });
      }

      let decoded;
      try {
        // Explicitly specify the algorithm to prevent "invalid algorithm" errors
        decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as any;
      } catch (verifyError: any) {
        console.error('JWT verification error:', verifyError.message);
        console.error('Token header:', JSON.parse(Buffer.from(token.split('.')[0], 'base64').toString()));
        return res.status(401).json({ message: 'Invalid token signature' });
      }
      
      const userId = decoded.userId;

      // Get user to fetch wallet address
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Check if user has a wallet address; if not, attempt auto-resolution from completed purchases
      if (!user.walletAddress) {
        try {
          const userTxs = await storage.getUserTransactions(userId, 'completed');
          const txWithHorizon = userTxs.find(t => t.txid && t.txid.length > 10 && !t.txid.startsWith('manual_'));
          if (txWithHorizon && txWithHorizon.txid) {
            const stellarResponse = await fetch(`https://api.mainnet.minepi.com/transactions/${txWithHorizon.txid}`, {
              headers: { 'Accept': 'application/json' }
            });
            if (stellarResponse.ok) {
              const stellarData = await stellarResponse.json() as any;
              const extractedWallet = stellarData.source_account;
              if (extractedWallet && !isAdminWalletAddress(extractedWallet)) {
                const [existingUserWithWallet] = await db
                  .select()
                  .from(users)
                  .where(and(eq(users.walletAddress, extractedWallet), isNotNull(users.walletAddress), ne(users.walletAddress, ''), ne(users.id, userId)))
                  .limit(1);

                const decision = evaluateWalletBinding({
                  incomingWalletAddress: extractedWallet,
                  currentWalletAddress: user.walletAddress,
                  duplicateOwnerUserId: existingUserWithWallet?.id,
                  authenticatedUserId: userId,
                  isAdminUser: String(user.piUID || '').trim() === OWNER_PI_UID,
                  allowWalletUpdate: true,
                });

                if (decision.allowed) {
                  await storage.updateUser(userId, {
                    walletAddress: extractedWallet,
                    walletVerifiedAt: new Date(),
                    walletVerifiedTxid: txWithHorizon.txid,
                    walletVerifiedPaymentId: txWithHorizon.paymentId || null
                  });
                  user.walletAddress = extractedWallet;
                  console.log(`Auto-resolved and bound wallet for user ${user.username}: ${extractedWallet}`);
                }
              }
            }
          }
        } catch (autoErr: any) {
          console.warn('/api/user/balance auto-resolve wallet error:', autoErr?.message || autoErr);
        }
      }

      if (!user.walletAddress) {
        return res.status(404).json({ 
          message: 'No wallet address found. Please complete a transaction first to connect your wallet.',
          balance: null
        });
      }

      // Fetch wallet balance using Pi Network service
      const balance = await piNetworkService.getPiBalance(user.walletAddress);
      
      if (balance === null) {
        return res.status(500).json({ 
          message: 'Failed to fetch wallet balance. Please try again later.',
          balance: null
        });
      }

      res.json({ 
        message: 'Wallet balance fetched successfully',
        balance: balance,
        walletAddress: user.walletAddress
      });
    } catch (error) {
      console.error('Fetch balance error:', error);
      res.status(500).json({ 
        message: 'Failed to fetch wallet balance',
        balance: null
      });
    }
  });

  // Admin endpoints
  app.get('/api/admin/analytics', authenticateAdmin, async (req, res) => {
    try {
      const analytics = await storage.getAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error('Analytics fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch analytics' });
    }
  });

  // Public analytics endpoint to show overall platform metrics
  app.get('/api/analytics', async (req, res) => {
    try {
      const analytics = await storage.getAnalytics();
      // Only return public metrics
      res.json({
        totalUsers: analytics.totalUsers,
        lifetimeLoggedInUsers: analytics.lifetimeLoggedInUsers,
        totalTransactions: analytics.totalTransactions,
        totalRevenue: analytics.totalRevenue
      });
    } catch (error) {
      console.error('Public analytics fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch analytics' });
    }
  });

  // Token redemption endpoint
  app.post('/api/user/redeem-tokens', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ message: 'No authorization header' });
      }

      const token = authHeader.replace('Bearer ', '');
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const userId = decoded.userId;
      
      const amount = Number(req.body.amount ?? req.body.tokensToRedeem);
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: 'Valid amount is required' });
      }

      // Hand off to the redemption engine. The engine resolves verified Pi UID from the authenticated user.
      const request = await redemptionEngine.requestRedemption(userId, amount);

      res.json({ 
        success: true, 
        message: 'Redemption request submitted successfully',
        request 
      });
    } catch (error: any) {
      console.error('Token redemption error:', error);
      res.status(500).json({ message: error.message || 'Token redemption failed' });
    }
  });


  // Admin Routes for Redemptions
  app.post('/api/admin/redemptions/:id/approve', authenticateAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      const updated = await redemptionEngine.approveRedemption(id, notes || '');
      res.json({ success: true, request: updated });
    } catch (error: any) {
      console.error('Approve redemption error:', error);
      res.status(500).json({ message: error.message || 'Approval failed' });
    }
  });

  app.post('/api/admin/redemptions/:id/reject', authenticateAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      const updated = await redemptionEngine.rejectRedemption(id, notes || '');
      res.json({ success: true, request: updated });
    } catch (error: any) {
      console.error('Reject redemption error:', error);
      res.status(500).json({ message: error.message || 'Rejection failed' });
    }
  });

  app.get('/api/admin/redemptions', authenticateAdmin, async (req, res) => {
    try {
      // Fetch all redemption requests for admin panel
      const { db } = await import('./db.js');
      const { redemptionRequests, users } = await import('../shared/schema.js');
      const { desc, eq } = await import('drizzle-orm');

      const requests = await db.select({
        id: redemptionRequests.id,
        userId: redemptionRequests.userId,
        username: users.username,
        b4utAmount: redemptionRequests.b4utAmount,
        piAmount: redemptionRequests.piAmount,
        status: redemptionRequests.status,
        walletAddress: redemptionRequests.walletAddress,
        createdAt: redemptionRequests.createdAt,
      })
      .from(redemptionRequests)
      .leftJoin(users, eq(redemptionRequests.userId, users.id))
      .orderBy(desc(redemptionRequests.createdAt));

      res.json(requests);
    } catch (error: any) {
      console.error('Fetch redemptions error:', error);
      res.status(500).json({ message: 'Failed to fetch redemptions' });
    }
  });

  app.get('/api/admin/transactions', authenticateAdmin, async (req, res) => {
    try {
      const transactions = await storage.getAllTransactions();
      res.json(transactions);
    } catch (error) {
      console.error('Admin transactions fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch transactions' });
    }
  });

  app.get('/api/admin/packages', authenticateAdmin, async (req, res) => {
    try {
      const packages = await storage.getPackages();
      res.json(packages);
    } catch (error) {
      console.error('Admin packages fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch packages' });
    }
  });

  app.post('/api/admin/packages', authenticateAdmin, async (req, res) => {
    try {
      const packageData = insertPackageSchema.parse(req.body);
      const newPackage = await storage.createPackage(packageData);
      res.json(newPackage);
    } catch (error) {
      console.error('Package creation error:', error);
      res.status(500).json({ message: 'Failed to create package' });
    }
  });

  app.put('/api/admin/packages/:id', authenticateAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const updatedPackage = await storage.updatePackage(id, updateData);
      
      if (!updatedPackage) {
        return res.status(404).json({ message: 'Package not found' });
      }
      
      res.json(updatedPackage);
    } catch (error) {
      console.error('Package update error:', error);
      res.status(500).json({ message: 'Failed to update package' });
    }
  });

  // Clear packages endpoint (for development/testing)
  app.delete('/api/clear-packages', async (req, res) => {
    try {
      // Delete all packages
      const packages = await storage.getPackages();
      for (const pkg of packages) {
        await storage.updatePackage(pkg.id, { isActive: false });
      }
      
      res.json({ message: 'Packages cleared successfully' });
    } catch (error) {
      console.error('Package clearing error:', error);
      res.status(500).json({ message: 'Package clearing failed' });
    }
  });

  // Seed packages endpoint (for development/testing)
  app.post('/api/seed-packages', async (req, res) => {
    try {
      console.log('Seeding packages...');

      // Get existing packages to check for duplicates
      const existingPackages = dedupePackages(await storage.getPackages());

      // Create default PUBG packages
      const pubgPackages = [
        {
          game: 'PUBG',
          name: 'PUBG Tournament Entry',
          inGameAmount: 0,
          usdtValue: '5.0000',
          image: '',
          isActive: true,
        },
        // {
        //   game: 'PUBG',
        //   name: '0.06 UC',
        //   inGameAmount: 1,  // Changed from 0.06 to 1 since inGameAmount is an integer
        //   usdtValue: '0.001',
        //   image: '',
        //   isActive: false,  // Deactivated by default - can be activated when needed
        // },
        {
          game: 'PUBG',
          name: '60 UC',
          inGameAmount: 60,
          usdtValue: '1.5000',
          image: '',
          isActive: true,
        },
        {
          game: 'PUBG',
          name: '325 UC',
          inGameAmount: 325,
          usdtValue: '6.5000',
          image: '',
          isActive: true,
        },
        {
          game: 'PUBG',
          name: '660 UC',
          inGameAmount: 660,
          usdtValue: '12.0000',
          image: '',
          isActive: true,
        },
        {
          game: 'PUBG',
          name: '1800 UC',
          inGameAmount: 1800,
          usdtValue: '25.0000',
          image: '',
          isActive: true,
        },
        {
          game: 'PUBG',
          name: '3850 UC',
          inGameAmount: 3850,
          usdtValue: '49.0000',
          image: '',
          isActive: true,
        },
        {
          game: 'PUBG',
          name: '8100 UC',
          inGameAmount: 8100,
          usdtValue: '96.0000',
          image: '',
          isActive: true,
        },
        {
          game: 'PUBG',
          name: '16200 UC',
          inGameAmount: 16200,
          usdtValue: '186.0000',
          image: '',
          isActive: true,
        },
        {
          game: 'PUBG',
          name: '24300 UC',
          inGameAmount: 24300,
          usdtValue: '278.0000',
          image: '',
          isActive: true,
        },
        {
          game: 'PUBG',
          name: '32400 UC',
          inGameAmount: 32400,
          usdtValue: '369.0000',
          image: '',
          isActive: true,
        },
        {
          game: 'PUBG',
          name: '40500 UC',
          inGameAmount: 40500,
          usdtValue: '459.0000',
          image: '',
          isActive: true,
        }
      ];

      // Create default MLBB packages
      const mlbbPackages = [
        {
          game: 'MLBB',
          name: '56 Diamonds',
          inGameAmount: 56,
          usdtValue: '3.0000',
          image: '',
          isActive: true,
        },
        {
          game: 'MLBB',
          name: '278 Diamonds',
          inGameAmount: 278,
          usdtValue: '6.0000',
          image: '',
          isActive: true,
        },
        {
          game: 'MLBB',
          name: '571 Diamonds',
          inGameAmount: 571,
          usdtValue: '11.0000',
          image: '',
          isActive: true,
        },
        {
          game: 'MLBB',
          name: '1783 Diamonds',
          inGameAmount: 1783,
          usdtValue: '33.0000',
          image: '',
          isActive: true,
        },
        {
          game: 'MLBB',
          name: '3005 Diamonds',
          inGameAmount: 3005,
          usdtValue: '52.0000',
          image: '',
          isActive: true,
        },
        {
          game: 'MLBB',
          name: '6012 Diamonds',
          inGameAmount: 6012,
          usdtValue: '99.0000',
          image: '',
          isActive: true,
        },
        {
          game: 'MLBB',
          name: '12000 Diamonds',
          inGameAmount: 12000,
          usdtValue: '200.0000',
          image: '',
          isActive: true,
        }
      ];

      // Create default COC packages
      const cocPackages = [
        {
          game: 'COC',
          name: 'Gold Pass',
          inGameAmount: 1,
          usdtValue: '9.0000',
          image: '',
          isActive: true,
        }
      ];

      // Create default Robux packages
      const robuxPackages = [
        {
          game: 'ROBUX',
          name: '40 Robux',
          inGameAmount: 40,
          usdtValue: '1.0000',
          image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000019410-1.png',
          isActive: true,
        },
        {
          game: 'ROBUX',
          name: '80 Robux',
          inGameAmount: 80,
          usdtValue: '1.5000',
          image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000019410-1.png',
          isActive: true,
        },
        {
          game: 'ROBUX',
          name: '400 Robux',
          inGameAmount: 400,
          usdtValue: '5.5000',
          image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000019410-1.png',
          isActive: true,
        },
        {
          game: 'ROBUX',
          name: '800 Robux',
          inGameAmount: 800,
          usdtValue: '10.5000',
          image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000019410-1.png',
          isActive: true,
        },
        {
          game: 'ROBUX',
          name: '1700 Robux',
          inGameAmount: 1700,
          usdtValue: '20.5000',
          image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000019410-1.png',
          isActive: true,
        },
        {
          game: 'ROBUX',
          name: '4500 Robux',
          inGameAmount: 4500,
          usdtValue: '51.0000',
          image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000019410-1.png',
          isActive: true,
        },
        {
          game: 'ROBUX',
          name: '10000 Robux',
          inGameAmount: 10000,
          usdtValue: '101.0000',
          image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000019410-1.png',
          isActive: true,
        },
        {
          game: 'ROBUX',
          name: '22500 Robux',
          inGameAmount: 22500,
          usdtValue: '201.0000',
          image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000019410-1.png',
          isActive: true,
        }
      ];

      // Create default NEW STATE packages
      const newstatePackages = [
        {
          game: 'NEWSTATE',
          name: '300 NC',
          inGameAmount: 300,
          usdtValue: '1.5000',
          image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020478-1.jpg',
          isActive: true,
        },
        {
          game: 'NEWSTATE',
          name: '1580 NC',
          inGameAmount: 1580,
          usdtValue: '5.5000',
          image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020478-1.jpg',
          isActive: true,
        },
        {
          game: 'NEWSTATE',
          name: '3850 NC',
          inGameAmount: 3850,
          usdtValue: '12.5000',
          image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020478-1.jpg',
          isActive: true,
        },
        {
          game: 'NEWSTATE',
          name: '10230 NC',
          inGameAmount: 10230,
          usdtValue: '32.0000',
          image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020478-1.jpg',
          isActive: true,
        },
        {
          game: 'NEWSTATE',
          name: '16800 NC',
          inGameAmount: 16800,
          usdtValue: '51.0000',
          image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020478-1.jpg',
          isActive: true,
        },
        {
          game: 'NEWSTATE',
          name: '35000 NC',
          inGameAmount: 35000,
          usdtValue: '101.0000',
          image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020478-1.jpg',
          isActive: true,
        }
      ];

      // Create default FREE FIRE packages
      const freefirePackages = [
        {
          game: 'FREEFIRE',
          name: '110 Diamonds',
          inGameAmount: 110,
          usdtValue: '2.0000',
          image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020480.jpg',
          isActive: true,
        },
        {
          game: 'FREEFIRE',
          name: '210 Diamonds',
          inGameAmount: 210,
          usdtValue: '3.0000',
          image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020480.jpg',
          isActive: true,
        },
        {
          game: 'FREEFIRE',
          name: '530 Diamonds',
          inGameAmount: 530,
          usdtValue: '6.0000',
          image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020480.jpg',
          isActive: true,
        },
        {
          game: 'FREEFIRE',
          name: '1080 Diamonds',
          inGameAmount: 1080,
          usdtValue: '11.0000',
          image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020480.jpg',
          isActive: true,
        },
        {
          game: 'FREEFIRE',
          name: '2200 Diamonds',
          inGameAmount: 2200,
          usdtValue: '22.0000',
          image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020480.jpg',
          isActive: true,
        },
        {
          game: 'FREEFIRE',
          name: '5600 Diamonds',
          inGameAmount: 5600,
          usdtValue: '55.0000',
          image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020480.jpg',
          isActive: true,
        }
      ];

      // Create default TikTok Coins packages
      const tiktokCoinsPackages = [
        {
          game: 'TIKTOK_COINS',
          name: '70 Coins',
          inGameAmount: 70,
          usdtValue: '1.5000',
          image: 'https://b4uesports.com/wp-content/uploads/2026/04/tiktok-coins-package.png-removebg-preview.png',
          isActive: true,
        },
        {
          game: 'TIKTOK_COINS',
          name: '350 Coins',
          inGameAmount: 350,
          usdtValue: '4.5000',
          image: 'https://b4uesports.com/wp-content/uploads/2026/04/tiktok-coins-package.png-removebg-preview.png',
          isActive: true,
        },
        {
          game: 'TIKTOK_COINS',
          name: '700 Coins',
          inGameAmount: 700,
          usdtValue: '10.0000',
          image: 'https://b4uesports.com/wp-content/uploads/2026/04/tiktok-coins-package.png-removebg-preview.png',
          isActive: true,
        },
        {
          game: 'TIKTOK_COINS',
          name: '1400 Coins',
          inGameAmount: 1400,
          usdtValue: '18.5000',
          image: 'https://b4uesports.com/wp-content/uploads/2026/04/tiktok-coins-package.png-removebg-preview.png',
          isActive: true,
        },
        {
          game: 'TIKTOK_COINS',
          name: '2000 Coins',
          inGameAmount: 2000,
          usdtValue: '26.0000',
          image: 'https://b4uesports.com/wp-content/uploads/2026/04/tiktok-coins-package.png-removebg-preview.png',
          isActive: true,
        },
        {
          game: 'TIKTOK_COINS',
          name: '3500 Coins',
          inGameAmount: 3500,
          usdtValue: '45.0000',
          image: 'https://b4uesports.com/wp-content/uploads/2026/04/tiktok-coins-package.png-removebg-preview.png',
          isActive: true,
        },
        {
          game: 'TIKTOK_COINS',
          name: '5000 Coins',
          inGameAmount: 5000,
          usdtValue: '64.0000',
          image: 'https://b4uesports.com/wp-content/uploads/2026/04/tiktok-coins-package.png-removebg-preview.png',
          isActive: true,
        },
        {
          game: 'TIKTOK_COINS',
          name: '7000 Coins',
          inGameAmount: 7000,
          usdtValue: '88.5000',
          image: 'https://b4uesports.com/wp-content/uploads/2026/04/tiktok-coins-package.png-removebg-preview.png',
          isActive: true,
        },
        {
          game: 'TIKTOK_COINS',
          name: '17500 Coins',
          inGameAmount: 17500,
          usdtValue: '220.0000',
          image: 'https://b4uesports.com/wp-content/uploads/2026/04/tiktok-coins-package.png-removebg-preview.png',
          isActive: true,
        }
      ];

      // Create default TikTok Followers packages
      const tiktokFollowersPackages = [
        {
          game: 'TIKTOK_FOLLOWERS',
          name: '100 Followers',
          inGameAmount: 100,
          usdtValue: '2.0000',
          image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000034677.png',
          isActive: true,
        },
        {
          game: 'TIKTOK_FOLLOWERS',
          name: '1000 Followers',
          inGameAmount: 1000,
          usdtValue: '7.0000',
          image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000034677.png',
          isActive: true,
        },
        {
          game: 'TIKTOK_FOLLOWERS',
          name: '1500 Followers',
          inGameAmount: 1500,
          usdtValue: '10.0000',
          image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000034677.png',
          isActive: true,
        },
        {
          game: 'TIKTOK_FOLLOWERS',
          name: '2000 Followers',
          inGameAmount: 2000,
          usdtValue: '11.0000',
          image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000034677.png',
          isActive: true,
        },
        {
          game: 'TIKTOK_FOLLOWERS',
          name: '5000 Followers',
          inGameAmount: 5000,
          usdtValue: '25.0000',
          image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000034677.png',
          isActive: true,
        },
        {
          game: 'TIKTOK_FOLLOWERS',
          name: '10000 Followers',
          inGameAmount: 10000,
          usdtValue: '48.0000',
          image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000034677.png',
          isActive: true,
        },
        {
          game: 'TIKTOK_FOLLOWERS',
          name: '50000 Followers',
          inGameAmount: 50000,
          usdtValue: '225.0000',
          image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000034677.png',
          isActive: true,
        },
        {
          game: 'TIKTOK_FOLLOWERS',
          name: '100000 Followers',
          inGameAmount: 100000,
          usdtValue: '450.0000',
          image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000034677.png',
          isActive: true,
        }
      ];

      // Create default TikTok Monetization Views packages
      const tiktokViewsPackages = [
        {
          game: 'TIKTOK_VIEWS',
          name: '30000 Views',
          inGameAmount: 30000,
          usdtValue: '55.0000',
          image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000077314.png',
          isActive: true,
        },
        {
          game: 'TIKTOK_VIEWS',
          name: '50000 Views',
          inGameAmount: 50000,
          usdtValue: '85.0000',
          image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000077314.png',
          isActive: true,
        },
        {
          game: 'TIKTOK_VIEWS',
          name: '100000 Views',
          inGameAmount: 100000,
          usdtValue: '200.0000',
          image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000077314.png',
          isActive: true,
        }
      ];

      // Create default YouTube Subscribers packages
      const youtubeSubsPackages = [
        {
          game: 'YOUTUBE_SUBS',
          name: '100 Subscribers',
          inGameAmount: 100,
          usdtValue: '6.0000',
          image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000077305.png',
          isActive: true,
        },
        {
          game: 'YOUTUBE_SUBS',
          name: '500 Subscribers',
          inGameAmount: 500,
          usdtValue: '22.0000',
          image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000077305.png',
          isActive: true,
        },
        {
          game: 'YOUTUBE_SUBS',
          name: '1000 Subscribers',
          inGameAmount: 1000,
          usdtValue: '42.0000',
          image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000077305.png',
          isActive: true,
        },
        {
          game: 'YOUTUBE_SUBS',
          name: '5000 Subscribers',
          inGameAmount: 5000,
          usdtValue: '185.0000',
          image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000077305.png',
          isActive: true,
        }
      ];

      // Create default YouTube Watch Time packages
      const youtubeWatchTimePackages = [
        {
          game: 'YOUTUBE_WATCHTIME',
          name: '2000 WT',
          inGameAmount: 2000,
          usdtValue: '38.0000',
          image: 'https://b4uesports.com/wp-content/uploads/2026/03/youtube-wt.jpg',
          isActive: true,
        },
        {
          game: 'YOUTUBE_WATCHTIME',
          name: '4000 WT',
          inGameAmount: 4000,
          usdtValue: '69.0000',
          image: 'https://b4uesports.com/wp-content/uploads/2026/03/youtube-wt.jpg',
          isActive: true,
        }
      ];

      // Create default Facebook Likes & Followers packages
      const facebookPackages = [
        {
          game: 'FACEBOOK',
          name: '500 Likes + Followers',
          inGameAmount: 500,
          usdtValue: '4.0000',
          image: 'https://b4uesports.com/wp-content/uploads/2026/03/facebook-logo.avif',
          isActive: true,
        },
        {
          game: 'FACEBOOK',
          name: '1000 Likes + Followers',
          inGameAmount: 1000,
          usdtValue: '8.0000',
          image: 'https://b4uesports.com/wp-content/uploads/2026/03/facebook-logo.avif',
          isActive: true,
        },
        {
          game: 'FACEBOOK',
          name: '1500 Likes + Followers',
          inGameAmount: 1500,
          usdtValue: '10.0000',
          image: 'https://b4uesports.com/wp-content/uploads/2026/03/facebook-logo.avif',
          isActive: true,
        }
      ];

      // Create default Instagram Followers packages
      const instagramPackages = [
        {
          game: 'INSTAGRAM',
          name: '100 Followers',
          inGameAmount: 100,
          usdtValue: '4.0000',
          image: 'https://b4uesports.com/wp-content/uploads/2026/03/instagram-logo.jpg',
          isActive: true,
        },
        {
          game: 'INSTAGRAM',
          name: '300 Followers',
          inGameAmount: 300,
          usdtValue: '5.0000',
          image: 'https://b4uesports.com/wp-content/uploads/2026/03/instagram-logo.jpg',
          isActive: true,
        },
        {
          game: 'INSTAGRAM',
          name: '500 Followers',
          inGameAmount: 500,
          usdtValue: '6.0000',
          image: 'https://b4uesports.com/wp-content/uploads/2026/03/instagram-logo.jpg',
          isActive: true,
        },
        {
          game: 'INSTAGRAM',
          name: '1000 Followers',
          inGameAmount: 1000,
          usdtValue: '7.0000',
          image: 'https://b4uesports.com/wp-content/uploads/2026/03/instagram-logo.jpg',
          isActive: true,
        },
        {
          game: 'INSTAGRAM',
          name: '1500 Followers',
          inGameAmount: 1500,
          usdtValue: '8.0000',
          image: 'https://b4uesports.com/wp-content/uploads/2026/03/instagram-logo.jpg',
          isActive: true,
        },
        {
          game: 'INSTAGRAM',
          name: '2000 Followers',
          inGameAmount: 2000,
          usdtValue: '10.0000',
          image: 'https://b4uesports.com/wp-content/uploads/2026/03/instagram-logo.jpg',
          isActive: true,
        },
        {
          game: 'INSTAGRAM',
          name: '5000 Followers',
          inGameAmount: 5000,
          usdtValue: '15.0000',
          image: 'https://b4uesports.com/wp-content/uploads/2026/03/instagram-logo.jpg',
          isActive: true,
        },
        {
          game: 'INSTAGRAM',
          name: '10000 Followers',
          inGameAmount: 10000,
          usdtValue: '20.0000',
          image: 'https://b4uesports.com/wp-content/uploads/2026/03/instagram-logo.jpg',
          isActive: true,
        }
      ];

      // Create default Netflix packages
      const netflixPackages = [
        {
          game: 'NETFLIX',
          name: '1 Month Subscription',
          inGameAmount: 1,
          usdtValue: '3.0000',
          image: 'https://b4uesports.com/wp-content/uploads/2026/03/netflix-logo.png',
          isActive: true,
        }
      ];

      // Create default Canva packages
      const canvaPackages = [
        {
          game: 'CANVA',
          name: 'Lifetime Pro Subscription',
          inGameAmount: 1,
          usdtValue: '3.0000',
          image: 'https://b4uesports.com/wp-content/uploads/2026/03/canva.jpg',
          isActive: true,
        }
      ];

      // Insert all packages, checking for existing ones first
      const allPackages = [...pubgPackages, ...mlbbPackages, ...cocPackages, ...robuxPackages, ...newstatePackages, ...freefirePackages, ...tiktokCoinsPackages, ...tiktokFollowersPackages, ...tiktokViewsPackages, ...youtubeSubsPackages, ...youtubeWatchTimePackages, ...facebookPackages, ...instagramPackages, ...netflixPackages, ...canvaPackages];
      const createdPackages = [];

      for (const pkg of allPackages) {
        // Check for existing package with same name and game before creating
        const existingPackage = existingPackages.find(
          p => p.name === pkg.name && p.game === pkg.game
        );
        
        if (!existingPackage) {
          const createdPackage = await storage.createPackage(pkg);
          createdPackages.push(createdPackage);
        } else {
          console.log(`Package ${pkg.name} for ${pkg.game} already exists, skipping creation`);
        }
      }

      res.json({ 
        message: 'Packages seeded successfully', 
        packages: createdPackages 
      });
    } catch (error) {
      console.error('Package seeding error:', error);
      res.status(500).json({ message: 'Package seeding failed' });
    }
  });

  // Create default packages if none exist
  const existingPackages = await storage.getPackages();
  console.log(`Found ${existingPackages.length} existing packages`);
  
  // Check which game types need packages added
  const gamesWithPackages = new Set(existingPackages.map(p => p.game));
  const allGames = ['PUBG', 'MLBB', 'COC', 'PUBGKR', 'ROBUX', 'NEWSTATE', 'FREEFIRE', 'TIKTOK_COINS', 'TIKTOK_FOLLOWERS', 'TIKTOK_VIEWS', 'YOUTUBE_SUBS', 'YOUTUBE_WATCHTIME', 'FACEBOOK', 'INSTAGRAM', 'NETFLIX', 'CANVA', 'PUBG_SUBSCRIPTION'];
  
  let packagesAdded = 0;
  
  // Only create packages if database is completely empty OR specific games are missing
  if (existingPackages.length === 0 || !allGames.every(game => gamesWithPackages.has(game))) {
    console.log('Creating missing packages...');
    
    const packagesToCreate = [];
    
    // Add ROBUX packages if missing
    if (!gamesWithPackages.has('ROBUX')) {
      packagesToCreate.push(...[
        { game: 'ROBUX', name: '40 Robux', inGameAmount: 40, usdtValue: '1.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000019410-1.png', isActive: true },
        { game: 'ROBUX', name: '80 Robux', inGameAmount: 80, usdtValue: '1.5000', image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000019410-1.png', isActive: true },
        { game: 'ROBUX', name: '400 Robux', inGameAmount: 400, usdtValue: '5.5000', image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000019410-1.png', isActive: true },
        { game: 'ROBUX', name: '800 Robux', inGameAmount: 800, usdtValue: '10.5000', image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000019410-1.png', isActive: true },
        { game: 'ROBUX', name: '1700 Robux', inGameAmount: 1700, usdtValue: '20.5000', image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000019410-1.png', isActive: true },
        { game: 'ROBUX', name: '4500 Robux', inGameAmount: 4500, usdtValue: '51.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000019410-1.png', isActive: true },
        { game: 'ROBUX', name: '10000 Robux', inGameAmount: 10000, usdtValue: '101.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000019410-1.png', isActive: true },
        { game: 'ROBUX', name: '22500 Robux', inGameAmount: 22500, usdtValue: '201.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000019410-1.png', isActive: true }
      ]);
    }
    
    // Add NEW STATE packages if missing
    if (!gamesWithPackages.has('NEWSTATE')) {
      packagesToCreate.push(...[
        { game: 'NEWSTATE', name: '300 NC', inGameAmount: 300, usdtValue: '1.5000', image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020478-1.jpg', isActive: true },
        { game: 'NEWSTATE', name: '1580 NC', inGameAmount: 1580, usdtValue: '5.5000', image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020478-1.jpg', isActive: true },
        { game: 'NEWSTATE', name: '3850 NC', inGameAmount: 3850, usdtValue: '12.5000', image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020478-1.jpg', isActive: true },
        { game: 'NEWSTATE', name: '10230 NC', inGameAmount: 10230, usdtValue: '32.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020478-1.jpg', isActive: true },
        { game: 'NEWSTATE', name: '16800 NC', inGameAmount: 16800, usdtValue: '51.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020478-1.jpg', isActive: true },
        { game: 'NEWSTATE', name: '35000 NC', inGameAmount: 35000, usdtValue: '101.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020478-1.jpg', isActive: true }
      ]);
    }
    
    // Add FREE FIRE packages if missing
    if (!gamesWithPackages.has('FREEFIRE')) {
      packagesToCreate.push(...[
        { game: 'FREEFIRE', name: '110 Diamonds', inGameAmount: 110, usdtValue: '2.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020480.jpg', isActive: true },
        { game: 'FREEFIRE', name: '210 Diamonds', inGameAmount: 210, usdtValue: '3.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020480.jpg', isActive: true },
        { game: 'FREEFIRE', name: '530 Diamonds', inGameAmount: 530, usdtValue: '6.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020480.jpg', isActive: true },
        { game: 'FREEFIRE', name: '1080 Diamonds', inGameAmount: 1080, usdtValue: '11.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020480.jpg', isActive: true },
        { game: 'FREEFIRE', name: '2200 Diamonds', inGameAmount: 2200, usdtValue: '22.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020480.jpg', isActive: true },
        { game: 'FREEFIRE', name: '5600 Diamonds', inGameAmount: 5600, usdtValue: '55.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020480.jpg', isActive: true }
      ]);
    }
    
    // Add TikTok Coins packages if missing
    if (!gamesWithPackages.has('TIKTOK_COINS')) {
      packagesToCreate.push(...[
        { game: 'TIKTOK_COINS', name: '70 Coins', inGameAmount: 70, usdtValue: '1.5000', image: 'https://b4uesports.com/wp-content/uploads/2026/04/tiktok-coins-package.png-removebg-preview.png', isActive: true },
        { game: 'TIKTOK_COINS', name: '350 Coins', inGameAmount: 350, usdtValue: '4.5000', image: 'https://b4uesports.com/wp-content/uploads/2026/04/tiktok-coins-package.png-removebg-preview.png', isActive: true },
        { game: 'TIKTOK_COINS', name: '700 Coins', inGameAmount: 700, usdtValue: '10.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/04/tiktok-coins-package.png-removebg-preview.png', isActive: true },
        { game: 'TIKTOK_COINS', name: '1400 Coins', inGameAmount: 1400, usdtValue: '18.5000', image: 'https://b4uesports.com/wp-content/uploads/2026/04/tiktok-coins-package.png-removebg-preview.png', isActive: true },
        { game: 'TIKTOK_COINS', name: '2000 Coins', inGameAmount: 2000, usdtValue: '26.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/04/tiktok-coins-package.png-removebg-preview.png', isActive: true },
        { game: 'TIKTOK_COINS', name: '3500 Coins', inGameAmount: 3500, usdtValue: '45.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/04/tiktok-coins-package.png-removebg-preview.png', isActive: true },
        { game: 'TIKTOK_COINS', name: '5000 Coins', inGameAmount: 5000, usdtValue: '64.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/04/tiktok-coins-package.png-removebg-preview.png', isActive: true },
        { game: 'TIKTOK_COINS', name: '7000 Coins', inGameAmount: 7000, usdtValue: '88.5000', image: 'https://b4uesports.com/wp-content/uploads/2026/04/tiktok-coins-package.png-removebg-preview.png', isActive: true },
        { game: 'TIKTOK_COINS', name: '17500 Coins', inGameAmount: 17500, usdtValue: '220.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/04/tiktok-coins-package.png-removebg-preview.png', isActive: true }
      ]);
    }
    
    // Add TikTok Followers packages if missing
    if (!gamesWithPackages.has('TIKTOK_FOLLOWERS')) {
      packagesToCreate.push(...[
        { game: 'TIKTOK_FOLLOWERS', name: '100 Followers', inGameAmount: 100, usdtValue: '2.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000034677.png', isActive: true },
        { game: 'TIKTOK_FOLLOWERS', name: '1000 Followers', inGameAmount: 1000, usdtValue: '4.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000034677.png', isActive: true },
        { game: 'TIKTOK_FOLLOWERS', name: '1500 Followers', inGameAmount: 1500, usdtValue: '5.5000', image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000034677.png', isActive: true },
        { game: 'TIKTOK_FOLLOWERS', name: '2000 Followers', inGameAmount: 2000, usdtValue: '6.5000', image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000034677.png', isActive: true },
        { game: 'TIKTOK_FOLLOWERS', name: '5000 Followers', inGameAmount: 5000, usdtValue: '14.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000034677.png', isActive: true },
        { game: 'TIKTOK_FOLLOWERS', name: '10000 Followers', inGameAmount: 10000, usdtValue: '25.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000034677.png', isActive: true },
        { game: 'TIKTOK_FOLLOWERS', name: '50000 Followers', inGameAmount: 50000, usdtValue: '130.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000034677.png', isActive: true },
        { game: 'TIKTOK_FOLLOWERS', name: '100000 Followers', inGameAmount: 100000, usdtValue: '250.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000034677.png', isActive: true }
      ]);
    }
    
    // Add TikTok Views packages if missing
    if (!gamesWithPackages.has('TIKTOK_VIEWS')) {
          packagesToCreate.push(...[
            { game: 'TIKTOK_VIEWS', name: '30000 Views', inGameAmount: 30000, usdtValue: '55.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000077314.png', isActive: true },
            { game: 'TIKTOK_VIEWS', name: '50000 Views', inGameAmount: 50000, usdtValue: '85.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000077314.png', isActive: true },
            { game: 'TIKTOK_VIEWS', name: '100000 Views', inGameAmount: 100000, usdtValue: '200.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000077314.png', isActive: true }
          ]);
    }
    
    // Add YouTube Subscribers packages if missing
    if (!gamesWithPackages.has('YOUTUBE_SUBS')) {
      packagesToCreate.push(...[
        { game: 'YOUTUBE_SUBS', name: '100 Subscribers', inGameAmount: 100, usdtValue: '4.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000077305.png', isActive: true },
        { game: 'YOUTUBE_SUBS', name: '500 Subscribers', inGameAmount: 500, usdtValue: '15.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000077305.png', isActive: true },
        { game: 'YOUTUBE_SUBS', name: '1000 Subscribers', inGameAmount: 1000, usdtValue: '30.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000077305.png', isActive: true },
        { game: 'YOUTUBE_SUBS', name: '5000 Subscribers', inGameAmount: 5000, usdtValue: '135.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000077305.png', isActive: true }
      ]);
    }
    
        // Add YouTube Watch Time packages if missing
        if (!gamesWithPackages.has('YOUTUBE_WATCHTIME')) {
          packagesToCreate.push(...[
            { game: 'YOUTUBE_WATCHTIME', name: '2000 WT', inGameAmount: 2000, usdtValue: '38.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/03/youtube-wt.jpg', isActive: true },
            { game: 'YOUTUBE_WATCHTIME', name: '4000 WT', inGameAmount: 4000, usdtValue: '69.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/03/youtube-wt.jpg', isActive: true }
          ]);
        }
    
    // Add Facebook packages if missing
    if (!gamesWithPackages.has('FACEBOOK')) {
      packagesToCreate.push(...[
        { game: 'FACEBOOK', name: '500 Likes + Followers', inGameAmount: 500, usdtValue: '4.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/03/facebook-logo.avif', isActive: true },
        { game: 'FACEBOOK', name: '1000 Likes + Followers', inGameAmount: 1000, usdtValue: '8.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/03/facebook-logo.avif', isActive: true },
        { game: 'FACEBOOK', name: '1500 Likes + Followers', inGameAmount: 1500, usdtValue: '10.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/03/facebook-logo.avif', isActive: true }
      ]);
    }
    
    // Add Instagram packages if missing
    if (!gamesWithPackages.has('INSTAGRAM')) {
      packagesToCreate.push(...[
        { game: 'INSTAGRAM', name: '100 Followers', inGameAmount: 100, usdtValue: '4.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/03/instagram-logo.jpg', isActive: true },
        { game: 'INSTAGRAM', name: '300 Followers', inGameAmount: 300, usdtValue: '5.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/03/instagram-logo.jpg', isActive: true },
        { game: 'INSTAGRAM', name: '500 Followers', inGameAmount: 500, usdtValue: '6.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/03/instagram-logo.jpg', isActive: true },
        { game: 'INSTAGRAM', name: '1000 Followers', inGameAmount: 1000, usdtValue: '7.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/03/instagram-logo.jpg', isActive: true },
        { game: 'INSTAGRAM', name: '1500 Followers', inGameAmount: 1500, usdtValue: '8.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/03/instagram-logo.jpg', isActive: true },
        { game: 'INSTAGRAM', name: '2000 Followers', inGameAmount: 2000, usdtValue: '10.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/03/instagram-logo.jpg', isActive: true },
        { game: 'INSTAGRAM', name: '5000 Followers', inGameAmount: 5000, usdtValue: '15.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/03/instagram-logo.jpg', isActive: true },
        { game: 'INSTAGRAM', name: '10000 Followers', inGameAmount: 10000, usdtValue: '20.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/03/instagram-logo.jpg', isActive: true }
      ]);
    }
    
    // Add PUBG tournament subscription packages if missing
    if (!gamesWithPackages.has('PUBG_SUBSCRIPTION')) {
      packagesToCreate.push(...[
        {
          game: 'PUBG_SUBSCRIPTION',
          name: 'PUBG Weekly Tournament Pass',
          inGameAmount: 1,
          usdtValue: '10.0000', // Display USD estimate; checkout amount is fixed at 20 Pi
          image: 'https://b4uesports.com/wp-content/uploads/2026/03/pubg-weekly-pass.png',
          isActive: true
        },
        {
          game: 'PUBG_SUBSCRIPTION',
          name: 'PUBG Monthly Tournament Pass',
          inGameAmount: 1,
          usdtValue: '15.0000', // Display USD estimate; checkout amount is fixed at 30 Pi
          image: 'https://b4uesports.com/wp-content/uploads/2026/03/pubg-monthly-pass.png',
          isActive: true
        }
      ]);
    }

    // Add Netflix package if missing
    if (!gamesWithPackages.has('NETFLIX')) {
      packagesToCreate.push(...[
        { game: 'NETFLIX', name: '1 Month Subscription', inGameAmount: 1, usdtValue: '3.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/03/netflix-logo.png', isActive: true }
      ]);
    }
    
    // Add Canva package if missing
    if (!gamesWithPackages.has('CANVA')) {
      packagesToCreate.push(...[
        { game: 'CANVA', name: 'Lifetime Pro Subscription', inGameAmount: 1, usdtValue: '3.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/03/canva.jpg', isActive: true }
      ]);
    }
    
    // Create all missing packages
    for (const pkg of packagesToCreate) {
      try {
        await storage.createPackage(pkg);
        packagesAdded++;
        console.log(`✅ Created package: ${pkg.name} (${pkg.game})`);
      } catch (error) {
        console.error(`❌ Failed to create package: ${pkg.name}`, error);
      }
    }
    
    console.log(`📊 Total packages created: ${packagesAdded}`);
    console.log(`📊 Final package count: ${existingPackages.length + packagesAdded}`);
  }

  // Admin endpoint to manually trigger package seeding
  app.post('/api/admin/seed-packages', authenticateAdmin, async (req, res) => {
    try {
      console.log('Admin: Manual package seeding triggered');
      
      const existingPackages = dedupePackages(await storage.getPackages());
      const gamesWithPackages = new Set(existingPackages.map(p => p.game));
      const allGames = ['PUBG', 'MLBB', 'COC', 'PUBGKR', 'ROBUX', 'NEWSTATE', 'FREEFIRE', 'TIKTOK_COINS', 'TIKTOK_FOLLOWERS', 'TIKTOK_VIEWS', 'YOUTUBE_SUBS', 'YOUTUBE_WATCHTIME', 'FACEBOOK', 'INSTAGRAM', 'NETFLIX', 'CANVA', 'PUBG_SUBSCRIPTION'];
      
      let packagesAdded = 0;
      
      if (!allGames.every(game => gamesWithPackages.has(game))) {
        console.log('Creating missing packages...');
        
        const packagesToCreate = [];
        
        // Add ROBUX packages if missing
        if (!gamesWithPackages.has('ROBUX')) {
          packagesToCreate.push(...[
            { game: 'ROBUX', name: '40 Robux', inGameAmount: 40, usdtValue: '1.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000019410-1.png', isActive: true },
            { game: 'ROBUX', name: '80 Robux', inGameAmount: 80, usdtValue: '1.5000', image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000019410-1.png', isActive: true },
            { game: 'ROBUX', name: '400 Robux', inGameAmount: 400, usdtValue: '5.5000', image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000019410-1.png', isActive: true },
            { game: 'ROBUX', name: '800 Robux', inGameAmount: 800, usdtValue: '10.5000', image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000019410-1.png', isActive: true },
            { game: 'ROBUX', name: '1700 Robux', inGameAmount: 1700, usdtValue: '20.5000', image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000019410-1.png', isActive: true },
            { game: 'ROBUX', name: '4500 Robux', inGameAmount: 4500, usdtValue: '51.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000019410-1.png', isActive: true },
            { game: 'ROBUX', name: '10000 Robux', inGameAmount: 10000, usdtValue: '101.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000019410-1.png', isActive: true },
            { game: 'ROBUX', name: '22500 Robux', inGameAmount: 22500, usdtValue: '201.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000019410-1.png', isActive: true }
          ]);
        }
        
        // Add NEW STATE packages if missing
        if (!gamesWithPackages.has('NEWSTATE')) {
          packagesToCreate.push(...[
            { game: 'NEWSTATE', name: '300 NC', inGameAmount: 300, usdtValue: '1.5000', image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020478-1.jpg', isActive: true },
            { game: 'NEWSTATE', name: '1580 NC', inGameAmount: 1580, usdtValue: '5.5000', image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020478-1.jpg', isActive: true },
            { game: 'NEWSTATE', name: '3850 NC', inGameAmount: 3850, usdtValue: '12.5000', image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020478-1.jpg', isActive: true },
            { game: 'NEWSTATE', name: '10230 NC', inGameAmount: 10230, usdtValue: '32.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020478-1.jpg', isActive: true },
            { game: 'NEWSTATE', name: '16800 NC', inGameAmount: 16800, usdtValue: '51.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020478-1.jpg', isActive: true },
            { game: 'NEWSTATE', name: '35000 NC', inGameAmount: 35000, usdtValue: '101.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020478-1.jpg', isActive: true }
          ]);
        }
        
        // Add FREE FIRE packages if missing
        if (!gamesWithPackages.has('FREEFIRE')) {
          packagesToCreate.push(...[
            { game: 'FREEFIRE', name: '110 Diamonds', inGameAmount: 110, usdtValue: '2.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020480.jpg', isActive: true },
            { game: 'FREEFIRE', name: '210 Diamonds', inGameAmount: 210, usdtValue: '3.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020480.jpg', isActive: true },
            { game: 'FREEFIRE', name: '530 Diamonds', inGameAmount: 530, usdtValue: '6.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020480.jpg', isActive: true },
            { game: 'FREEFIRE', name: '1080 Diamonds', inGameAmount: 1080, usdtValue: '11.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020480.jpg', isActive: true },
            { game: 'FREEFIRE', name: '2200 Diamonds', inGameAmount: 2200, usdtValue: '22.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020480.jpg', isActive: true },
            { game: 'FREEFIRE', name: '5600 Diamonds', inGameAmount: 5600, usdtValue: '55.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020480.jpg', isActive: true }
          ]);
        }
        
        // Add TikTok Coins packages if missing
        if (!gamesWithPackages.has('TIKTOK_COINS')) {
          packagesToCreate.push(...[
            { game: 'TIKTOK_COINS', name: '70 Coins', inGameAmount: 70, usdtValue: '1.5000', image: 'https://b4uesports.com/wp-content/uploads/2026/04/tiktok-coins-package.png-removebg-preview.png', isActive: true },
            { game: 'TIKTOK_COINS', name: '350 Coins', inGameAmount: 350, usdtValue: '4.5000', image: 'https://b4uesports.com/wp-content/uploads/2026/04/tiktok-coins-package.png-removebg-preview.png', isActive: true },
            { game: 'TIKTOK_COINS', name: '700 Coins', inGameAmount: 700, usdtValue: '10.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/04/tiktok-coins-package.png-removebg-preview.png', isActive: true },
            { game: 'TIKTOK_COINS', name: '1400 Coins', inGameAmount: 1400, usdtValue: '18.5000', image: 'https://b4uesports.com/wp-content/uploads/2026/04/tiktok-coins-package.png-removebg-preview.png', isActive: true },
            { game: 'TIKTOK_COINS', name: '2000 Coins', inGameAmount: 2000, usdtValue: '26.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/04/tiktok-coins-package.png-removebg-preview.png', isActive: true },
            { game: 'TIKTOK_COINS', name: '3500 Coins', inGameAmount: 3500, usdtValue: '45.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/04/tiktok-coins-package.png-removebg-preview.png', isActive: true },
            { game: 'TIKTOK_COINS', name: '5000 Coins', inGameAmount: 5000, usdtValue: '64.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/04/tiktok-coins-package.png-removebg-preview.png', isActive: true },
            { game: 'TIKTOK_COINS', name: '7000 Coins', inGameAmount: 7000, usdtValue: '88.5000', image: 'https://b4uesports.com/wp-content/uploads/2026/04/tiktok-coins-package.png-removebg-preview.png', isActive: true },
            { game: 'TIKTOK_COINS', name: '17500 Coins', inGameAmount: 17500, usdtValue: '220.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/04/tiktok-coins-package.png-removebg-preview.png', isActive: true }
          ]);
        }
        
        // Add TikTok Followers packages if missing
        if (!gamesWithPackages.has('TIKTOK_FOLLOWERS')) {
          packagesToCreate.push(...[
            { game: 'TIKTOK_FOLLOWERS', name: '100 Followers', inGameAmount: 100, usdtValue: '2.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000034677.png', isActive: true },
            { game: 'TIKTOK_FOLLOWERS', name: '1000 Followers', inGameAmount: 1000, usdtValue: '7.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000034677.png', isActive: true },
            { game: 'TIKTOK_FOLLOWERS', name: '1500 Followers', inGameAmount: 1500, usdtValue: '10.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000034677.png', isActive: true },
            { game: 'TIKTOK_FOLLOWERS', name: '2000 Followers', inGameAmount: 2000, usdtValue: '11.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000034677.png', isActive: true },
            { game: 'TIKTOK_FOLLOWERS', name: '5000 Followers', inGameAmount: 5000, usdtValue: '25.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000034677.png', isActive: true },
            { game: 'TIKTOK_FOLLOWERS', name: '10000 Followers', inGameAmount: 10000, usdtValue: '48.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000034677.png', isActive: true },
            { game: 'TIKTOK_FOLLOWERS', name: '50000 Followers', inGameAmount: 50000, usdtValue: '225.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000034677.png', isActive: true },
            { game: 'TIKTOK_FOLLOWERS', name: '100000 Followers', inGameAmount: 100000, usdtValue: '450.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000034677.png', isActive: true }
          ]);
        }
        
        // Add TikTok Views packages if missing
        if (!gamesWithPackages.has('TIKTOK_VIEWS')) {
          packagesToCreate.push(...[
            { game: 'TIKTOK_VIEWS', name: '30000 Views', inGameAmount: 30000, usdtValue: '55.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000077314.png', isActive: true },
            { game: 'TIKTOK_VIEWS', name: '50000 Views', inGameAmount: 50000, usdtValue: '85.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000077314.png', isActive: true },
            { game: 'TIKTOK_VIEWS', name: '100000 Views', inGameAmount: 100000, usdtValue: '200.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000077314.png', isActive: true }
          ]);
        }
        
        // Add YouTube Subscribers packages if missing
        if (!gamesWithPackages.has('YOUTUBE_SUBS')) {
          packagesToCreate.push(...[
            { game: 'YOUTUBE_SUBS', name: '100 Subscribers', inGameAmount: 100, usdtValue: '6.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000077305.png', isActive: true },
            { game: 'YOUTUBE_SUBS', name: '500 Subscribers', inGameAmount: 500, usdtValue: '22.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000077305.png', isActive: true },
            { game: 'YOUTUBE_SUBS', name: '1000 Subscribers', inGameAmount: 1000, usdtValue: '42.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000077305.png', isActive: true },
            { game: 'YOUTUBE_SUBS', name: '5000 Subscribers', inGameAmount: 5000, usdtValue: '185.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000077305.png', isActive: true }
          ]);
        }
        
        // Add YouTube Watch Time packages if missing
        if (!gamesWithPackages.has('YOUTUBE_WATCHTIME')) {
          packagesToCreate.push(...[
            { game: 'YOUTUBE_WATCHTIME', name: '500 WT', inGameAmount: 500, usdtValue: '10.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/03/youtube-wt.jpg', isActive: true },
            { game: 'YOUTUBE_WATCHTIME', name: '1000 WT', inGameAmount: 1000, usdtValue: '18.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/03/youtube-wt.jpg', isActive: true },
            { game: 'YOUTUBE_WATCHTIME', name: '2000 WT', inGameAmount: 2000, usdtValue: '38.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/03/youtube-wt.jpg', isActive: true },
            { game: 'YOUTUBE_WATCHTIME', name: '4000 WT', inGameAmount: 4000, usdtValue: '69.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/03/youtube-wt.jpg', isActive: true }
          ]);
        }
        
        // Add Facebook packages if missing
        if (!gamesWithPackages.has('FACEBOOK')) {
          packagesToCreate.push(...[
            { game: 'FACEBOOK', name: '500 Likes + Followers', inGameAmount: 500, usdtValue: '4.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/03/facebook-logo.avif', isActive: true },
            { game: 'FACEBOOK', name: '1000 Likes + Followers', inGameAmount: 1000, usdtValue: '8.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/03/facebook-logo.avif', isActive: true },
            { game: 'FACEBOOK', name: '1500 Likes + Followers', inGameAmount: 1500, usdtValue: '10.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/03/facebook-logo.avif', isActive: true }
          ]);
        }
        
        // Add Instagram packages if missing
        if (!gamesWithPackages.has('INSTAGRAM')) {
          packagesToCreate.push(...[
            { game: 'INSTAGRAM', name: '100 Followers', inGameAmount: 100, usdtValue: '4.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/03/instagram-logo.jpg', isActive: true },
            { game: 'INSTAGRAM', name: '300 Followers', inGameAmount: 300, usdtValue: '5.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/03/instagram-logo.jpg', isActive: true },
            { game: 'INSTAGRAM', name: '500 Followers', inGameAmount: 500, usdtValue: '6.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/03/instagram-logo.jpg', isActive: true },
            { game: 'INSTAGRAM', name: '1000 Followers', inGameAmount: 1000, usdtValue: '7.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/03/instagram-logo.jpg', isActive: true },
            { game: 'INSTAGRAM', name: '1500 Followers', inGameAmount: 1500, usdtValue: '8.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/03/instagram-logo.jpg', isActive: true },
            { game: 'INSTAGRAM', name: '2000 Followers', inGameAmount: 2000, usdtValue: '10.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/03/instagram-logo.jpg', isActive: true },
            { game: 'INSTAGRAM', name: '5000 Followers', inGameAmount: 5000, usdtValue: '15.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/03/instagram-logo.jpg', isActive: true },
            { game: 'INSTAGRAM', name: '10000 Followers', inGameAmount: 10000, usdtValue: '20.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/03/instagram-logo.jpg', isActive: true }
          ]);
        }
        
        // Add Netflix package if missing
        if (!gamesWithPackages.has('NETFLIX')) {
          packagesToCreate.push(...[
            { game: 'NETFLIX', name: '1 Month Subscription', inGameAmount: 1, usdtValue: '3.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/03/netflix-logo.png', isActive: true }
          ]);
        }
        
        // Add Canva package if missing
        if (!gamesWithPackages.has('CANVA')) {
          packagesToCreate.push(...[
            { game: 'CANVA', name: 'Lifetime Pro Subscription', inGameAmount: 1, usdtValue: '3.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/03/canva.jpg', isActive: true }
          ]);
        }

        // Add PUBG subscription packages if missing
        if (!gamesWithPackages.has('PUBG_SUBSCRIPTION')) {
          packagesToCreate.push(...[
            { game: 'PUBG_SUBSCRIPTION', name: 'PUBG Weekly Tournament Pass', inGameAmount: 1, usdtValue: '10.0000', image: '', isActive: true }, // 20 Pi
            { game: 'PUBG_SUBSCRIPTION', name: 'PUBG Monthly Tournament Pass', inGameAmount: 1, usdtValue: '15.0000', image: '', isActive: true } // 30 Pi
          ]);
        }
        
        // Create all missing packages
        for (const pkg of packagesToCreate) {
          try {
            await storage.createPackage(pkg);
            packagesAdded++;
            console.log(`✅ Created package: ${pkg.name} (${pkg.game})`);
          } catch (error) {
            console.error(`❌ Failed to create package: ${pkg.name}`, error);
          }
        }
        
        console.log(`📊 Total packages created: ${packagesAdded}`);
        console.log(`📊 Final package count: ${existingPackages.length + packagesAdded}`);
        
        res.json({
          success: true,
          message: `Successfully created ${packagesAdded} new packages`,
          totalPackages: existingPackages.length + packagesAdded,
          packagesAdded
        });
      } else {
        res.json({
          success: true,
          message: 'All packages already exist',
          totalPackages: existingPackages.length
        });
      }
    } catch (error: any) {
      console.error('Admin seed packages error:', error);
      res.status(500).json({ message: `Failed to seed packages: ${error.message}` });
    }
  });

  // Toggle package activation endpoint
  app.post('/api/packages/:packageId/toggle', async (req, res) => {
    try {
      const { packageId } = req.params;
      const { isActive } = req.body;
      
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ message: 'isActive must be a boolean' });
      }
      
      const updatedPackage = await storage.updatePackage(packageId, { isActive });
      
      if (!updatedPackage) {
        return res.status(404).json({ message: 'Package not found' });
      }
      
      console.log(`Package ${updatedPackage.name} ${isActive ? 'activated' : 'deactivated'}`);
      
      res.json({ 
        message: `Package ${isActive ? 'activated' : 'deactivated'} successfully`,
        package: updatedPackage 
      });
    } catch (error: any) {
      console.error('Toggle package error:', error);
      res.status(500).json({ message: `Failed to toggle package: ${error.message}` });
    }
  });

  // AI chat routes removed — chat feature disabled
  // Note: chat message endpoints have been removed to disable persisted chat.

  // Tournament Registration Endpoints
  
  // Get all tournaments
  app.get('/api/tournaments', async (req, res) => {
    try {
      const tournaments = await storage.getTournaments();
      const updatedTournaments = await Promise.all(
        tournaments.map(async (tournament) => await ensureTournamentStatusIsCurrent(tournament))
      );
      res.json({ success: true, tournaments: updatedTournaments });
    } catch (error: any) {
      console.error('Get tournaments error:', error);
      res.status(500).json({ error: 'Failed to get tournaments', details: error.message });
    }
  });

  // Create tournament (admin only)
  app.post('/api/tournaments', authenticateAdmin, async (req, res) => {
    try {
      const { title, description, game, mode, maxParticipants, teamSize, registrationFeePi = 5, startsAt, registrationClosesAt } = req.body;
      const normalizedMode = ['solo', 'duo', 'squad'].includes(String(mode)) ? String(mode) : 'squad';
      const parsedStartsAt = startsAt ? new Date(String(startsAt)) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      if (Number.isNaN(parsedStartsAt.getTime())) {
        return res.status(400).json({ error: 'Valid tournament date and time are required' });
      }
      const parsedRegistrationClosesAt = registrationClosesAt
        ? new Date(String(registrationClosesAt))
        : new Date(parsedStartsAt.getTime() - 60 * 60 * 1000);
      
      const tournamentData = {
        title,
        slug: title.toLowerCase().replace(/\s+/g, '-'),
        description,
        game: game || 'PUBG',
        mode: normalizedMode,
        format: 'elimination',
        skillLevel: 'open',
        status: 'registration_open',
        visibility: 'public',
        maxParticipants,
        minParticipants: 2,
        teamSize: teamSize || (normalizedMode === 'solo' ? 1 : normalizedMode === 'duo' ? 2 : 4),
        registrationFeePi: registrationFeePi.toString(),
        prizePoolPi: (maxParticipants * registrationFeePi * 0.95).toString(),
        currency: 'PI',
        rules: `Entry Fee: ${registrationFeePi} PI\nTeam Size: ${teamSize || (normalizedMode === 'solo' ? 1 : normalizedMode === 'duo' ? 2 : 4)} players\nMobile Only - No emulators allowed\nAll players must provide valid PUBG IGN and UID`,
        region: 'Bhutan',
        platform: 'mobile',
        startsAt: parsedStartsAt,
        registrationOpensAt: new Date(),
        registrationClosesAt: parsedRegistrationClosesAt,
      };

      const tournament = await storage.createTournament(tournamentData);
      res.json({ success: true, tournament });
    } catch (error: any) {
      console.error('Create tournament error:', error);
      res.status(500).json({ error: 'Failed to create tournament', details: error.message });
    }
  });

  // Delete tournament and all related data
  app.delete('/api/tournaments/:tournamentId', authenticateAdmin, async (req, res) => {
    try {
      const { tournamentId } = req.params;
      const tournament = await getTournamentByIdOrSlug(tournamentId);
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
      const id = tournament.id;

      // Delete in dependency order
      await storage.deleteTournamentMatchResults_byTournament(id).catch(() => {});
      await storage.deleteTournamentLeaderboard(id).catch(() => {});
      const matches = await storage.getTournamentMatches(id);
      for (const match of matches) {
        await storage.deleteTournamentMatchResults(match.id).catch(() => {});
        if (match.lobbyId) await storage.deleteTournamentLobby(match.lobbyId).catch(() => {});
        await storage.deleteTournamentMatch(match.id).catch(() => {});
      }
      const lobbies = await storage.getTournamentLobbies(id);
      for (const lobby of lobbies) {
        await storage.deleteTournamentLobby(lobby.id).catch(() => {});
      }
      await storage.deleteTournament(id);
      res.json({ success: true, deletedId: id });
    } catch (error: any) {
      console.error('Delete tournament error:', error);
      res.status(500).json({ error: 'Failed to delete tournament', details: error.message });
    }
  });

  // Pre-register: create a provisional registration row at payment-approval time.
  // This stores the paymentId on the row so /api/payment/complete can find and
  // mark it paid — fixes "stuck pending" when /save races with /payment/complete.
  app.post('/api/tournament-registration/pre-register', async (req, res) => {
    try {
      const { userId, tournamentId, paymentId, mode, teamName, players } = req.body;
      if (!userId || !tournamentId || !paymentId) {
        return res.status(400).json({ message: 'userId, tournamentId and paymentId required' });
      }

      // Only registered users in the users table can register for tournaments
      const registeringUser = await storage.getUser(userId);
      if (!registeringUser) {
        return res.status(403).json({ message: 'User not found. Only registered users can join tournaments.' });
      }
      if (!registeringUser.isProfileVerified) {
        return res.status(403).json({ message: 'Please complete your profile verification before registering for a tournament.' });
      }

      // Idempotent — if a row already exists for this user+tournament, just
      // update the paymentId so the completion endpoint can find it.
      const existing = await storage.getUserTournamentRegistrations(userId);
      const existingForTournament = existing.find(r => r.tournamentId === tournamentId);

      if (existingForTournament) {
        // Update paymentId if not already set
        if (!existingForTournament.paymentId) {
          await storage.updateTournamentRegistration(existingForTournament.id, {
            paymentId,
            status: 'registered',
            paymentStatus: 'pending',
          } as any);
        }
        return res.json({ success: true, registrationId: existingForTournament.id, action: 'updated' });
      }

      // Create minimal provisional row
      const normalizedMode = String(mode || 'squad').toLowerCase() as 'solo' | 'duo' | 'squad';
      const captainEmail = players?.[0]?.email || '';

      const registration = await storage.registerForTournament({
        userId,
        tournamentId,
        teamId: undefined as any,
        status: 'registered',
        paymentStatus: 'pending',
        paidAmountPi: '0',
        paymentId,
        metadata: {
          teamName: String(teamName || '').trim(),
          players: Array.isArray(players) ? players : [],
          mode: normalizedMode,
          teamLeaderEmail: String(captainEmail).trim().toLowerCase(),
          paymentId,
          preRegistered: true,
        } as Record<string, any>,
      });

      return res.json({ success: true, registrationId: registration.id, action: 'created' });
    } catch (error: any) {
      // Duplicate key = row already exists, that's fine
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        return res.json({ success: true, action: 'already_exists' });
      }
      console.error('Pre-register error:', error.message);
      res.status(500).json({ message: 'Pre-registration failed', error: error.message });
    }
  });

  // Update squad members for an already-paid registration (no payment needed)
  app.post('/api/tournament-registration/update-squad', async (req, res) => {
    try {
      const { userId, tournamentId, players, teamName, mode } = req.body;
      if (!userId || !tournamentId || !players || !Array.isArray(players)) {
        return res.status(400).json({ message: 'userId, tournamentId, and players are required' });
      }
      // Find existing paid registration
      const existingRegs = await storage.getUserTournamentRegistrations(userId);
      const reg = existingRegs.find(r => r.tournamentId === tournamentId && r.paymentStatus === 'paid');
      if (!reg) {
        return res.status(404).json({ message: 'No paid registration found for this tournament' });
      }
      // Build updated metadata keeping existing fields, updating players + teamName
      const updatedMetadata = {
        ...(reg.metadata || {}),
        players: players.map((p: any, i: number) => ({
          ign: String(p.pubgIgn || p.ign || '').trim(),
          uid: String(p.pubgUid || p.uid || '').trim(),
          email: String(p.email || '').trim(),
          phone: String(p.phone || '').trim(),
          mugshotName: p.mugshotName || '',
          isCaptain: i === 0,
        })),
        teamName: teamName ? String(teamName).trim() : (reg.metadata as any)?.teamName,
        mode: mode || (reg.metadata as any)?.mode,
        updatedAt: new Date().toISOString(),
      } as Record<string, any>;

      await storage.updateTournamentRegistration(reg.id, { metadata: updatedMetadata } as any);

      // Also update the team metadata
      if (reg.teamId) {
        const captainIgn = players[0]?.pubgIgn || players[0]?.ign || '';
        const teamName2 = teamName ? String(teamName).trim() : undefined;
        if (teamName2 || captainIgn) {
          const setFields: string[] = ['metadata = metadata || $1::jsonb', 'updated_at = NOW()'];
          const vals: any[] = [JSON.stringify({ players: updatedMetadata.players, captainIgn })];
          if (teamName2) { setFields.push(`name = $${vals.length + 1}`); vals.push(teamName2); }
          vals.push(reg.teamId);
          const { Pool } = await import('pg');
          // Use existing db connection via drizzle raw sql
          await (storage as any).db?.execute?.(
            `UPDATE tournament_teams SET ${setFields.join(', ')} WHERE id = $${vals.length}`,
            vals
          );
        }
      }

      res.json({ success: true, message: 'Squad updated successfully', registrationId: reg.id });
    } catch (error: any) {
      console.error('Update squad error:', error.message);
      res.status(500).json({ message: 'Failed to update squad', error: error.message });
    }
  });

  // Save tournament registration details (team + players)
  app.post('/api/tournament-registration/save', async (req, res) => {
    try {
      const { userId, teamName, players, mode, paymentId, txid, tournamentId } = req.body;

      if (!userId || !teamName || !players || !mode) {
        return res.status(400).json({ message: 'Missing required fields: userId, teamName, players, mode' });
      }

      // Only registered and profile-verified users in the users table can register
      const registeringUser = await storage.getUser(userId);
      if (!registeringUser) {
        return res.status(403).json({ message: 'User not found. Only registered users can join tournaments.' });
      }
      if (!registeringUser.isProfileVerified) {
        return res.status(403).json({ message: 'Please complete your profile verification before registering for a tournament.' });
      }

      const normalizedMode = String(mode).trim().toLowerCase() as 'solo' | 'duo' | 'squad';
      const modeSizes: Record<string, string> = { solo: '1', duo: '2', squad: '4' };
      const allowedTournamentModes = ['solo', 'duo', 'squad'] as const;
      if (!allowedTournamentModes.includes(normalizedMode)) {
        return res.status(400).json({ message: 'Mode must be solo, duo, or squad' });
      }

      const requiredPlayers = normalizedMode === 'solo' ? 1 : normalizedMode === 'duo' ? 2 : 4;
      if (!Array.isArray(players) || players.length !== requiredPlayers) {
        return res.status(400).json({
          error: `Exactly ${requiredPlayers} players required for ${normalizedMode} mode`,
        });
      }

      console.log('Saving tournament registration for user:', userId, 'team:', teamName, 'mode:', normalizedMode);

      // Check if this payment has already been recorded for the user.
      // Users may enter the tournament again on subsequent days, so we do not block by previous registration alone.
      const existingRegistration = await storage.getUserTournamentRegistrations(userId);
      if (existingRegistration.length > 0) {
        const duplicatePayment = existingRegistration.find(r => (
          (paymentId && r.metadata?.paymentId === paymentId) ||
          (txid && r.metadata?.txid === txid)
        ));

        if (duplicatePayment) {
          console.log('Duplicate tournament payment detected for user:', userId, 'paymentId:', paymentId, 'txid:', txid);
          return res.status(409).json({
            message: 'This tournament payment has already been processed.',
            registrationId: duplicatePayment.id,
            status: duplicatePayment.status,
            paymentStatus: duplicatePayment.paymentStatus,
          });
        }
      }

      const targetTournamentId = String(tournamentId || '').trim();
      if (!targetTournamentId) {
        return res.status(400).json({ message: 'Tournament ID is required' });
      }
      const targetTournament = await storage.getTournament(targetTournamentId);
      // Prevent registrations after close time or when tournament not open
      if (!targetTournament) {
        return res.status(404).json({ message: 'Tournament not found' });
      }
      if (targetTournament.status && String(targetTournament.status).toLowerCase() !== 'registration_open') {
        return res.status(400).json({ message: 'Tournament registration is closed' });
      }
      if (targetTournament.registrationClosesAt && new Date(targetTournament.registrationClosesAt) <= new Date()) {
        await storage.updateTournament(targetTournamentId, { status: 'registration_closed' } as any);
        return res.status(400).json({ message: 'Tournament registration period has closed' });
      }
      const paidAmountPi = String(targetTournament?.registrationFeePi || '0');
      const captainPlayer = players[0] || {};
      const captainUserId = userId;

      if (!captainPlayer.email || !String(captainPlayer.email).trim()) {
        return res.status(400).json({ message: 'Captain email is required' });
      }
      if (!captainPlayer.phone || !String(captainPlayer.phone).trim()) {
        return res.status(400).json({ message: 'Captain phone is required' });
      }

      // Captain email and phone must match what is saved in their profile
      const captainEmailInForm = String(captainPlayer.email).trim().toLowerCase();
      const captainPhoneInForm = String(captainPlayer.phone).trim();
      const profileEmail = String(registeringUser.email || '').trim().toLowerCase();
      const profilePhone = String((registeringUser as any).phone || '').trim();

      if (captainEmailInForm !== profileEmail) {
        return res.status(400).json({
          message: `Captain email (${captainEmailInForm}) must match the email on your verified profile (${profileEmail}).`,
        });
      }
      if (profilePhone && captainPhoneInForm !== profilePhone) {
        return res.status(400).json({
          message: `Captain phone number must match the phone number on your verified profile.`,
        });
      }

      if (!captainPlayer.pubgIgn || !String(captainPlayer.pubgIgn).trim()) {
        return res.status(400).json({ message: 'Captain PUBG IGN is required' });
      }
      if (!captainPlayer.pubgUid || !String(captainPlayer.pubgUid).trim()) {
        return res.status(400).json({ message: 'Captain PUBG UID is required' });
      }

      for (const player of players) {
        if (!player.email || !player.phone || !player.pubgIgn || !player.pubgUid) {
          return res.status(400).json({ message: 'All players must provide email, phone, PUBG IGN, and PUBG UID' });
        }
      }

      const team = await storage.createTournamentTeam({
        tournamentId: targetTournamentId,
        name: String(teamName).trim(),
        captainUserId,
        inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
        status: 'complete',
        metadata: {
          mode: normalizedMode,
          teamLogo: req.body?.teamLogoName || req.body?.teamLogo || null,
          teamLeaderEmail: String(captainPlayer.email || '').trim().toLowerCase(),
        } as any,
      });
      const teamId = team.id;

      for (const player of players) {
        if (player.userId && player.userId !== captainUserId) {
          await storage.addTournamentTeamMember(teamId, player.userId, player.isCaptain ? 'captain' : 'member');
        }
      }

      // Create or update tournament registration in database.
      // If a provisional row was already created at pre-register time, update it
      // rather than inserting (avoids unique constraint on tournamentId+userId).
      let registration: any;
      const existingRegs = await storage.getUserTournamentRegistrations(userId);
      const existingReg = existingRegs.find(r => r.tournamentId === targetTournamentId);

      if (existingReg) {
        // Upsert: update the existing provisional row with full details
        registration = await storage.updateTournamentRegistration(existingReg.id, {
          teamId,
          status: 'registered',
          paymentStatus: 'paid',
          paidAmountPi,
          paymentId: paymentId || existingReg.paymentId || undefined,
          transactionId: existingReg.transactionId || undefined,
          metadata: {
            teamName: String(teamName).trim(),
            players: Array.isArray(players) ? players : [],
            mode: normalizedMode,
            teamLogo: req.body?.teamLogoName || req.body?.teamLogo || null,
            teamLeaderEmail: String(captainPlayer.email || '').trim().toLowerCase(),
            paymentId,
            txid,
          } as Record<string, any>,
        } as any);
        console.log('Tournament registration updated (upsert) to database:', existingReg.id);
      } else {
        const registrationData: InsertTournamentRegistration = {
          userId,
          tournamentId: targetTournamentId,
          teamId,
          status: 'registered',
          paymentStatus: 'paid',
          paidAmountPi,
          paymentId: paymentId || undefined,
          metadata: {
            teamName: String(teamName).trim(),
            players: Array.isArray(players) ? players : [],
            mode: normalizedMode,
            teamLogo: req.body?.teamLogoName || req.body?.teamLogo || null,
            teamLeaderEmail: String(captainPlayer.email || '').trim().toLowerCase(),
            paymentId,
            txid,
          } as Record<string, any>,
        };
        registration = await storage.registerForTournament(registrationData);
        console.log('Tournament registration created in database:', registration?.id);
      }
      const tournamentRegistrations = await storage.getTournamentRegistrations(targetTournamentId);
      const paidEntryTotal = tournamentRegistrations
        .filter((item) => item.paymentStatus === 'paid')
        .reduce((total, item) => total + Number(item.paidAmountPi || 0), 0);
      await storage.updateTournament(targetTournamentId, {
        prizePoolPi: String((paidEntryTotal * 0.95).toFixed(8)),
      } as any);
      console.log('Tournament registration saved to database:', registration.id);

      res.json({
        success: true,
        message: 'Tournament registration saved successfully',
        registration: registration
      });
    } catch (error: any) {
      console.error('Tournament registration save error:', error.message);
      console.error('Full error:', error);
      
      // Check for constraint violations
      if (error.message && error.message.includes('duplicate') && error.message.includes('key')) {
        return res.status(409).json({ 
          message: 'You have already registered for this tournament',
          error: error.message 
        });
      }
      
      res.status(500).json({ message: 'Failed to save tournament registration', error: error.message });
    }
  });

  // Register team for tournament
  app.post('/api/tournaments/:tournamentId/register', async (req, res) => {
    try {
      const { tournamentId } = req.params;
      const tournament = await getTournamentByIdOrSlug(tournamentId);
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
      
      // Check if registration is closed
      const now = new Date();
      const tournamentStatus = String(tournament.status || '').toLowerCase();
      if (['registration_closed', 'in_progress', 'completed', 'ended', 'cancelled'].includes(tournamentStatus)) {
        return res.status(400).json({ error: 'Registration has closed for this tournament.' });
      }
      if (tournament.registrationClosesAt && new Date(tournament.registrationClosesAt) <= now) {
        return res.status(400).json({ error: 'Registration has closed for this tournament.' });
      }
      if (tournament.startsAt && new Date(tournament.startsAt) <= now) {
        return res.status(400).json({ error: 'Registration has closed because the tournament has already started.' });
      }

      const resolvedTournamentId = tournament.id;
      const { teamName, players, mode, teamLogo, teamLeaderEmail } = req.body;
      const normalizedLeaderEmail = String(teamLeaderEmail || '').trim().toLowerCase();
      
      // Validate players data
      const requiredPlayers = mode === 'solo' ? 1 : mode === 'duo' ? 2 : 4;
      if (!['solo', 'duo', 'squad'].includes(mode)) {
        return res.status(400).json({
          error: 'Mode must be solo, duo, or squad',
        });
      }
      if (!teamName || !String(teamName).trim()) {
        return res.status(400).json({
          error: 'Team name is required',
        });
      }
      if (!teamLogo || !String(teamLogo).trim()) {
        return res.status(400).json({
          error: 'Team logo is required',
        });
      }
      if (!normalizedLeaderEmail) {
        return res.status(400).json({
          error: 'Team leader email is required',
        });
      }
      if (!players || players.length !== requiredPlayers) {
        return res.status(400).json({ 
          error: `Exactly ${requiredPlayers} players required for ${mode} mode` 
        });
      }

      // Validate each player has required fields
      for (const player of players) {
        if (!player.email || !player.phone || !player.pubgIgn || !player.pubgUid) {
          return res.status(400).json({ 
            error: 'All players must provide email, phone, PUBG IGN, and PUBG UID' 
          });
        }
      }
      if (String(players[0].email).trim().toLowerCase() !== normalizedLeaderEmail) {
        return res.status(400).json({
          error: 'Team leader email must match captain (player 1) email',
        });
      }

      // Get tournament details
      if (String(tournament.mode).toLowerCase() !== String(mode).toLowerCase()) {
        return res.status(400).json({ error: `This tournament is ${tournament.mode} only` });
      }

      // Only registered, profile-verified users in the users table can register
      const captainUserId = players[0].userId;
      if (!captainUserId) {
        return res.status(403).json({ error: 'You must be logged in to register for a tournament.' });
      }
      const captainUser = await storage.getUser(captainUserId);
      if (!captainUser) {
        return res.status(403).json({ error: 'User not found. Only registered users can join tournaments.' });
      }
      if (!captainUser.isProfileVerified) {
        return res.status(403).json({ error: 'Please complete your profile verification before registering for a tournament.' });
      }

      // Captain email and phone must match their verified profile
      const captainEmailInForm = String(players[0].email).trim().toLowerCase();
      const captainPhoneInForm = String(players[0].phone).trim();
      const profileEmail = String(captainUser.email || '').trim().toLowerCase();
      const profilePhone = String((captainUser as any).phone || '').trim();
      if (captainEmailInForm !== profileEmail) {
        return res.status(400).json({
          error: `Captain email must match the email on your verified profile (${profileEmail}).`,
        });
      }
      if (profilePhone && captainPhoneInForm !== profilePhone) {
        return res.status(400).json({
          error: 'Captain phone number must match the phone number on your verified profile.',
        });
      }

      // Create team
      const teamData = {
        tournamentId: resolvedTournamentId,
        name: String(teamName).trim(),
        captainUserId,
        inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
        status: 'forming',
        metadata: {
          mode,
          teamLogo,
          teamLeaderEmail: normalizedLeaderEmail,
        } as any,
      };

      const team = await storage.createTournamentTeam(teamData);

      // Add players to team
      for (const player of players) {
        if (player.userId) {
          await storage.addTournamentTeamMember(
            team.id,
            player.userId,
            player.isCaptain ? 'captain' : 'member'
          );
        }
      }

      // Create registration record
      const registrationData = {
        tournamentId: resolvedTournamentId,
        userId: captainUserId,
        teamId: team.id,
        status: 'pending_payment',
        paymentStatus: 'unpaid',
        paidAmountPi: '0',
        metadata: {
          players,
          mode,
          teamName,
          teamLogo,
          teamLeaderEmail: normalizedLeaderEmail,
        } as any,
      };

      const registration = await storage.createTournamentRegistration(registrationData);

      res.json({ 
        success: true, 
        team, 
        registration,
        entryFee: tournament.registrationFeePi,
        message: `Team registered successfully. Please pay ${tournament.registrationFeePi} PI to complete registration.`
      });
    } catch (error: any) {
      console.error('Register team error:', error);
      res.status(500).json({ error: 'Failed to register team', details: error.message });
    }
  });

  // Get tournament teams/lobby
  app.get('/api/tournaments/:tournamentId/teams', async (req, res) => {
    try {
      const { tournamentId } = req.params;
      const tournament = await getTournamentByIdOrSlug(tournamentId);
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
      const resolvedTournamentId = tournament.id;
      await ensurePaidTournamentRegistrationsHaveTeams(resolvedTournamentId);
      const registrations = await storage.getTournamentRegistrationsLite(resolvedTournamentId);
      const teams = await storage.getTournamentTeams(resolvedTournamentId);
      const teamsById = new Map(teams.map((team) => [team.id, team]));

      // Only show paid registrations — exclude pending/unpaid/cancelled entries
      const paidRegistrations = registrations.filter(r =>
        r.paymentStatus === 'paid' || r.paymentStatus === 'waived'
      );

      const visibleTeams = await Promise.all(
        paidRegistrations.map(async (registration) => {
          const registrationMetadata = (registration.metadata || {}) as any;
          const team = registration.teamId ? teamsById.get(registration.teamId) : undefined;
          const players = Array.isArray(registrationMetadata.players) ? registrationMetadata.players : [];
          const sanitizedPlayers = players.map((player: any, index: number) => ({
            id: player?.id || `player-${index}`,
            pubgIgn: String(player?.pubgIgn || player?.ign || '').trim(),
            pubgUid: String(player?.pubgUid || player?.uid || '').trim(),
            ign: String(player?.pubgIgn || player?.ign || '').trim(),
            uid: String(player?.pubgUid || player?.uid || '').trim(),
            mugshotName: player?.mugshotName || null,
            isCaptain: index === 0 || Boolean(player?.isCaptain),
            userId: player?.userId || null,
          }));
          const normalizedMode = normalizeTournamentMode(registrationMetadata.mode);
          const inferredMode = normalizedMode || inferTournamentModeFromPlayers(players);

          return {
            id: team?.id || `registration-${registration.id}`,
            tournamentId: resolvedTournamentId,
            name: team?.name || String(registrationMetadata.teamName || `Team-${String(registration.id).slice(0, 8)}`),
            captainUserId: team?.captainUserId || null,
            status: team?.status || registration.status || 'registered',
            teamLogo: registrationMetadata.teamLogo || registrationMetadata.teamLogoName || null,
            logoName: registrationMetadata.teamLogo || registrationMetadata.teamLogoName || null,
            teamLeaderEmail: registrationMetadata.teamLeaderEmail || null,
            captainIgn: registrationMetadata.captainIgn || players[0]?.pubgIgn || players[0]?.ign || null,
            mode: inferredMode || null,
            registration: {
              status: registration.status,
              paymentStatus: registration.paymentStatus,
              metadata: {
                players: sanitizedPlayers,
                teamLogo: registrationMetadata.teamLogo || registrationMetadata.teamLogoName || null,
                teamLeaderEmail: registrationMetadata.teamLeaderEmail || null,
                mode: inferredMode || null,
              },
            },
            players: sanitizedPlayers,
          };
        })
      );

      res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
      res.json({ success: true, teams: visibleTeams });
    } catch (error: any) {
      console.error('Get tournament teams error:', error);
      res.status(500).json({ error: 'Failed to get tournament teams', details: error.message });
    }
  });

  // Team leader lobby access by email key
  app.post('/api/tournaments/:tournamentId/lobby-access', async (req, res) => {
    try {
      const { tournamentId } = req.params;
      const tournament = await getTournamentByIdOrSlug(tournamentId);
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
      const resolvedTournamentId = tournament.id;
      const teamLeaderEmail = String(req.body?.teamLeaderEmail || '').trim().toLowerCase();
      if (!teamLeaderEmail) {
        return res.status(400).json({ error: 'Team leader email is required' });
      }

      await ensurePaidTournamentRegistrationsHaveTeams(resolvedTournamentId);
      const teams = await storage.getTournamentTeams(resolvedTournamentId);
      let matchedTeam: any = null;
      let matchedRegistration: any = null;

      for (const team of teams) {
        const registration = await storage.getTournamentRegistrationByTeam(team.id);
        const metadata = (registration?.metadata || {}) as any;
        const candidateEmails = new Set<string>();

        if (metadata.teamLeaderEmail) {
          candidateEmails.add(String(metadata.teamLeaderEmail).trim().toLowerCase());
        }
        if (registration?.userId) {
          const regUser = await storage.getUser(registration.userId);
          if (regUser?.email) {
            candidateEmails.add(String(regUser.email).trim().toLowerCase());
          }
        }
        if ((team as any).captainUserId) {
          const captainUser = await storage.getUser((team as any).captainUserId);
          if (captainUser?.email) {
            candidateEmails.add(String(captainUser.email).trim().toLowerCase());
          }
        }

        if (candidateEmails.has(teamLeaderEmail)) {
          matchedTeam = team;
          matchedRegistration = registration;
          break;
        }
      }

      if (!matchedTeam || !matchedRegistration) {
        const allRegs = await storage.getTournamentRegistrations(resolvedTournamentId);
        let emailReg: any = null;
        for (const r of allRegs) {
          const meta = (r.metadata || {}) as any;
          const isPaid = String(r.paymentStatus || '').toLowerCase() === 'paid' || String(r.status || '').toLowerCase() === 'registered';
          if (!isPaid) continue;
          const emails = new Set<string>();
          if (meta.teamLeaderEmail) emails.add(String(meta.teamLeaderEmail).trim().toLowerCase());
          if (r.userId) {
            const regUser = await storage.getUser(r.userId);
            if (regUser?.email) emails.add(String(regUser.email).trim().toLowerCase());
          }
          if (emails.has(teamLeaderEmail)) {
            emailReg = r;
            break;
          }
        }
        if (emailReg) {
          await ensurePaidTournamentRegistrationsHaveTeams(resolvedTournamentId);
          const freshTeams = await storage.getTournamentTeams(resolvedTournamentId);
          for (const t of freshTeams) {
            const reg2 = await storage.getTournamentRegistrationByTeam(t.id);
            if (reg2?.id === emailReg.id) { matchedTeam = t; matchedRegistration = reg2; break; }
          }
        }
        if (!matchedTeam || !matchedRegistration) {
          return res.status(403).json({ error: 'No team found for this leader email' });
        }
      }

      const lobbies = await storage.getTournamentLobbies(resolvedTournamentId);
      return res.json({
        success: true,
        team: {
          id: matchedTeam.id,
          name: matchedTeam.name,
          logo: (matchedRegistration.metadata as any)?.teamLogo || null,
        },
        lobbies: lobbies.map((lobby) => ({
          id: lobby.id,
          name: lobby.name,
          mapName: lobby.mapName,
          status: lobby.status,
          roomCode: lobby.roomCode,
          roomPassword: lobby.roomPassword,
          createdAt: lobby.createdAt,
        })),
      });
    } catch (error: any) {
      console.error('Team lobby access error:', error);
      res.status(500).json({ error: 'Failed to get lobby access', details: error.message });
    }
  });

  // Admin: Create lobby with room code
  app.post('/api/tournaments/:tournamentId/lobby', authenticateAdmin, async (req, res) => {
    try {
      const { tournamentId } = req.params;
      const tournament = await getTournamentByIdOrSlug(tournamentId);
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
      const resolvedTournamentId = tournament.id;
      const { matchNumber, roomCode, roomPassword, scheduledAt } = req.body;
      const allowedMaps = new Set(['Erangle', 'Rondo', 'Miramar', 'Livik', 'Shanhok', 'Warehouse', 'Ruins', 'Hangar', 'Santorini']);
      const mapName = allowedMaps.has(String(req.body?.mapName || '')) ? String(req.body.mapName) : 'Erangle';
      const parsedScheduledAt = scheduledAt ? new Date(String(scheduledAt)) : new Date();
      
      const lobbyData = {
        tournamentId: resolvedTournamentId,
        matchId: `match-${matchNumber}`,
        name: `Match ${matchNumber} Lobby`,
        mapName,
        roomCode,
        roomPassword,
        status: 'open',
        capacity: 100,
      };

      const lobby = await storage.createTournamentLobby(lobbyData);

      // Create match
      const matchData = {
        tournamentId: resolvedTournamentId,
        lobbyId: lobby.id,
        round: 1,
        matchNumber,
        status: 'scheduled',
        mapName,
        roomCode,
        roomPassword,
        scheduledAt: Number.isNaN(parsedScheduledAt.getTime()) ? new Date() : parsedScheduledAt,
      };

      const match = await storage.createTournamentMatch(matchData);

      // Non-blocking: Dispatch In-App Notifications to all registered captains & players
      (async () => {
        try {
          const registrations = await storage.getTournamentRegistrations(resolvedTournamentId);
          const paidRegistrations = registrations.filter(r => r.paymentStatus === 'paid' || r.paymentStatus === 'waived');
          const notifiedUserIds = new Set<string>();

          for (const reg of paidRegistrations) {
            if (reg.userId && !notifiedUserIds.has(reg.userId)) {
              notifiedUserIds.add(reg.userId);
              const recipient = await storage.getUser(reg.userId);
              if (recipient?.piUID) {
                piNetworkService.sendInAppNotification({
                  title: '🎮 Tournament Match Room Ready!',
                  body: `Match ${matchNumber} room credentials for "${tournament.title}" are published! Check your Lobby tab now.`,
                  user_uid: recipient.piUID,
                  subroute: '/dashboard',
                }).catch(() => {});
              }
            }
          }
        } catch (notifyErr: any) {
          console.warn('Lobby in-app notification error:', notifyErr?.message || notifyErr);
        }
      })();

      res.json({ success: true, lobby, match });
    } catch (error: any) {
      console.error('Create lobby error:', error);
      res.status(500).json({ error: 'Failed to create lobby', details: error.message });
    }
  });

  app.patch('/api/tournaments/:tournamentId/matches/:matchId', authenticateAdmin, async (req, res) => {
    try {
      const { tournamentId, matchId } = req.params;
      const tournament = await getTournamentByIdOrSlug(tournamentId);
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
      const resolvedTournamentId = tournament.id;
      const match = await storage.getTournamentMatch(matchId);
      if (!match || match.tournamentId !== resolvedTournamentId) {
        return res.status(404).json({ error: 'Match not found' });
      }

      const allowedMaps = new Set(['Erangle', 'Rondo', 'Miramar', 'Livik', 'Shanhok', 'Warehouse', 'Ruins', 'Hangar', 'Santorini']);
      const mapName = allowedMaps.has(String(req.body?.mapName || '')) ? String(req.body.mapName) : (match.mapName || 'Erangle');
      const scheduledAt = req.body?.scheduledAt ? new Date(String(req.body.scheduledAt)) : match.scheduledAt;
      const updateData: any = {
        mapName,
        roomCode: String(req.body?.roomCode || '').trim(),
        roomPassword: String(req.body?.roomPassword || '').trim(),
        scheduledAt: scheduledAt && !Number.isNaN(new Date(scheduledAt).getTime()) ? new Date(scheduledAt) : match.scheduledAt,
      };

      if (!updateData.roomCode || !updateData.roomPassword) {
        return res.status(400).json({ error: 'Room code and room password are required' });
      }

      const updatedMatch = await storage.updateTournamentMatch(matchId, updateData);
      if (match.lobbyId) {
        await storage.updateTournamentLobby(match.lobbyId, {
          mapName: updateData.mapName,
          roomCode: updateData.roomCode,
          roomPassword: updateData.roomPassword,
        });
      }
      res.json({ success: true, match: updatedMatch });
    } catch (error: any) {
      console.error('Update match error:', error);
      res.status(500).json({ error: 'Failed to update match', details: error.message });
    }
  });

  app.delete('/api/tournaments/:tournamentId/matches/:matchId', authenticateAdmin, async (req, res) => {
    try {
      const { tournamentId, matchId } = req.params;
      const tournament = await getTournamentByIdOrSlug(tournamentId);
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
      const resolvedTournamentId = tournament.id;
      const match = await storage.getTournamentMatch(matchId);
      if (!match || match.tournamentId !== resolvedTournamentId) {
        return res.status(404).json({ error: 'Match not found' });
      }
      await storage.deleteTournamentMatch(matchId);
      if (match.lobbyId) {
        await storage.deleteTournamentLobby(match.lobbyId);
      }
      res.json({ success: true, deletedId: matchId });
    } catch (error: any) {
      console.error('Delete match error:', error);
      res.status(500).json({ error: 'Failed to delete match', details: error.message });
    }
  });

  // Complete match and cleanup room
  app.post('/api/tournaments/:tournamentId/matches/:matchId/complete', authenticateAdmin, async (req, res) => {
    try {
      const { tournamentId, matchId } = req.params;
      const { results } = req.body;
      const tournament = await getTournamentByIdOrSlug(tournamentId);
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
      const resolvedTournamentId = tournament.id;

      const match = await storage.getTournamentMatch(matchId);
      if (!match || match.tournamentId !== resolvedTournamentId) {
        return res.status(404).json({ error: 'Match not found' });
      }

      await storage.updateTournamentMatch(matchId, {
        status: 'completed',
        completedAt: new Date(),
      });

      if (match.lobbyId) {
        await storage.updateTournamentLobby(match.lobbyId, {
          status: 'completed',
        });
      }

      if (results && Array.isArray(results)) {
        await storage.deleteTournamentMatchResults(matchId);

        for (const result of results) {
          // Admin enters PT (placementPoints) directly — no auto-calc from position.
          // placement is kept for DB storage but not used for scoring.
          const placement = result.placement != null ? Number(result.placement) : undefined;
          const kills = Number(result.kills || 0);
          // Use explicitly provided placementPoints if present, otherwise fall back to defaultPlacementPoints
          const placementPoints = result.placementPoints != null
            ? Number(result.placementPoints)
            : (placement ? defaultPlacementPoints(placement) : 0);
          const wwcd = Number(result.wwcd || 0); // numeric: 0 = no, 1/2/3 = win count
          const pointsAwarded = placementPoints + kills; // TOTAL = PT + ELIMS
          const prizePi = result.prize ? String(result.prize) : '0';

          try {
            await storage.createTournamentMatchResult({
              matchId,
              participantId: result.participantId || null,
              userId: result.userId || null,
              teamId: result.teamId,
              placement,
              kills,
              wwcd,
              placementPoints,
              assists: 0,
              deaths: 0,
              damage: 0,
              score: pointsAwarded,
              prizePi,
              pointsAwarded,
              metadata: { wwcd, placementPoints, enteredBy: null, playerKills: result.playerKills || {}, playerRows: result.playerRows || [] } as any,
            });
          } catch (insertErr: any) {
            console.error('createTournamentMatchResult error for teamId', result.teamId, ':', insertErr.message);
            throw insertErr;
          }
        }
      }

      // Send success response immediately — don't wait for leaderboard rebuild
      // (Vercel serverless has a 10s timeout; the CTE rebuild can be slow)
      res.json({ success: true, message: 'Match results saved. Leaderboard updating in background.' });

      // Rebuild leaderboard after response is sent (fire-and-forget)
      storage.rebuildTournamentLeaderboard(resolvedTournamentId).catch((lbErr: any) => {
        console.error('rebuildTournamentLeaderboard error:', lbErr.message);
      });
    } catch (error: any) {
      console.error('Complete match error:', error);
      res.status(500).json({ error: 'Failed to complete match', details: error.message });
    }
  });

  app.get('/api/tournaments/:tournamentId/matches/:matchId/results', authenticateAdmin, async (req, res) => {
    try {
      const { tournamentId, matchId } = req.params;
      const tournament = await getTournamentByIdOrSlug(tournamentId);
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
      const resolvedTournamentId = tournament.id;
      const match = await storage.getTournamentMatch(matchId);
      if (!match || match.tournamentId !== resolvedTournamentId) {
        return res.status(404).json({ error: 'Match not found' });
      }

      const results = await storage.getTournamentMatchResults(matchId);
      res.json({ success: true, results });
    } catch (error: any) {
      console.error('Get match results error:', error);
      res.status(500).json({ error: 'Failed to load match results', details: error.message });
    }
  });

  // Get tournament with matches, lobbies, paid teams, and leaderboard
  app.get('/api/tournaments/:tournamentId', async (req, res) => {
    try {
      const { tournamentId } = req.params;
      const tournament = await getTournamentByIdOrSlug(tournamentId);
      
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      const freshTournament = await ensureTournamentStatusIsCurrent(tournament);
      const resolvedTournamentId = freshTournament.id;

      await ensurePaidTournamentRegistrationsHaveTeams(resolvedTournamentId);
      const matches = await storage.getTournamentMatches(resolvedTournamentId);
      const lobbies = await storage.getTournamentLobbies(resolvedTournamentId);
      const teams = await storage.getTournamentTeams(resolvedTournamentId);
      const teamsWithMembers = await Promise.all(
        teams.map(async (team) => {
          const registration = await storage.getTournamentRegistrationByTeam(team.id);
          const metadata = (registration?.metadata || (team as any).metadata || {}) as any;
          const players = Array.isArray(metadata.players) ? metadata.players : [];
          const normalizedMode = normalizeTournamentMode(metadata.mode);
          const inferredMode = normalizedMode || inferTournamentModeFromPlayers(players);
          return {
            ...team,
            players,
            teamLogo: metadata.teamLogo || null,
            teamLeaderEmail: metadata.teamLeaderEmail || null,
            mode: inferredMode || null,
            registration,
          };
        }),
      );

      const visibleTeams = teamsWithMembers.filter((team) => Boolean(team.registration));
      const leaderboard = await storage.getTournamentLeaderboard(resolvedTournamentId);

      // Load existing results for each match so admin can review previously saved data
      const matchResultsMap: Record<string, any[]> = {};
      for (const match of matches) {
        const results = await storage.getTournamentMatchResults(match.id);
        if (results.length > 0) {
          matchResultsMap[match.id] = results;
        }
      }

      res.json({ 
        success: true, 
        tournament,
        matches,
        lobbies,
        teams: visibleTeams,
        leaderboard,
        matchResults: matchResultsMap,
      });
    } catch (error: any) {
      console.error('Get tournament error:', error);
      res.status(500).json({ error: 'Failed to get tournament', details: error.message });
    }
  });

  const httpServer = createServer(app);
  
  // Get user notifications
  app.get('/api/notifications', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid token' });
      }
      const token = authHeader.split(' ')[1];
      
      let session: any;
      try {
        session = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
      } catch (err) {
        return res.status(401).json({ error: 'Invalid session token' });
      }

      if (!session || !session.userId) {
        return res.status(401).json({ error: 'Invalid session data' });
      }

      // We'll import appNotifications and eq, desc from drizzle-orm
      const { db } = await import('./db.js');
      const { appNotifications } = await import('../shared/schema.js');
      const { eq, desc } = await import('drizzle-orm');

      const notifications = await db.select()
        .from(appNotifications)
        .where(eq(appNotifications.userId, session.userId))
        .orderBy(desc(appNotifications.createdAt))
        .limit(50);

      res.json(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Mark notification as read
  app.post('/api/notifications/:id/read', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid token' });
      }
      const token = authHeader.split(' ')[1];
      
      let session: any;
      try {
        session = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
      } catch (err) {
        return res.status(401).json({ error: 'Invalid session token' });
      }

      if (!session || !session.userId) {
        return res.status(401).json({ error: 'Invalid session data' });
      }

      const { db } = await import('./db.js');
      const { appNotifications } = await import('../shared/schema.js');
      const { eq } = await import('drizzle-orm');

      await db.update(appNotifications)
        .set({ status: 'read', readAt: new Date() })
        .where(eq(appNotifications.id, req.params.id));

      res.json({ success: true });
    } catch (error) {
      console.error('Error marking notification read:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return httpServer;
}
