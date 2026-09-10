import dotenv from "dotenv";
import express, { type Request, Response, NextFunction } from "express";

dotenv.config();

// Debug: Log environment variables
console.log('Environment variables:');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV);

import { registerRoutes } from "./routes";
import { storage } from "./storage";
import { setupVite, serveStatic, log } from "./vite";
import compression from "compression";

const app = express();
// Enable compression to reduce response sizes if supported
try {
  if (typeof compression === 'function') {
    app.use(compression());
  }
} catch {
  // Compression optional
}
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Pi Browser & PiNet iFrame CSP headers
app.use((_req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "frame-ancestors 'self' https://*.minepi.com https://*.pinet.com minepi.com pinet.com;"
  );
  res.removeHeader('X-Frame-Options');
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Initialize server and routes
async function initializeServer() {
  const httpServer = await registerRoutes(app);

  // Create default tournament if none exists
  async function initializeDefaultTournament() {
    try {
      const tournaments = await storage.getTournaments();
      if (tournaments.length === 0) {
        console.log('🏆 No tournaments found, creating default PUBG tournament...');
        
        const tournamentData = {
          title: 'PUBG Mobile Championship 2025',
          slug: 'pubg-mobile-championship-2025',
          description: 'Join the ultimate PUBG Mobile Tournament! Compete with top players, win exciting prizes, and showcase your skills in action-packed matches. Mobile Only - No emulators allowed!',
          game: 'PUBG',
          mode: 'squad',
          format: 'elimination',
          skillLevel: 'open',
          status: 'registration_open',
          visibility: 'public',
          maxParticipants: 50,
          minParticipants: 2,
          teamSize: 4,
          registrationFeePi: '5',
          prizePoolPi: '200',
          currency: 'PI',
          rules: 'Entry Fee: 5 PI per team\nTeam Size: 4 players\nMobile Only - No emulators allowed\nAll players must provide valid PUBG IGN and UID\nPan/Fist is allowed\nEmergency Pick-up is not allowed\nVehicle Skins are allowed\nCarrying an enemy is not allowed (carrying teammates is allowed)\nFace Cam required from League Showdown to Grand Finals\nScreen Sharing not allowed\nSecure In-Game Screenshots of results for device verification',
          region: 'Bhutan',
          platform: 'mobile',
          startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          registrationOpensAt: new Date(),
          registrationClosesAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
        };

        const tournament = await storage.createTournament(tournamentData);
        console.log('✅ Default tournament created:', tournament.title);
        console.log('🎮 Tournament ID:', tournament.id);
        console.log('🔗 Registration URL: /tournament/' + tournament.id);
      }
    } catch (error) {
      console.error('❌ Failed to initialize default tournament:', error);
    }
  }

  // Initialize default tournament
  await initializeDefaultTournament();

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, httpServer);
  } else {
    serveStatic(app);
  }

  // For Vercel deployment, we need to export the app
  // Vercel will handle starting the server
  if (process.env.VERCEL) {
    // In Vercel environment, we don't need to start the server
    // Vercel will use the default export
    console.log('Running in Vercel environment');
  } else {
    // Start the server for local development
    const port = parseInt(process.env.PORT || '5001', 10);
    httpServer.listen({
      port,
      host: "0.0.0.0",
    }, () => {
      log(`serving on port ${port}`);
    });
  }
  
  return httpServer;
}

// Start the initialization
const serverPromise = initializeServer().catch(error => {
  console.error('Failed to initialize server:', error);
  process.exit(1);
});

// Export the app for Vercel
export default app;

// Also export a handler for Vercel serverless functions
export const config = {
  api: {
    bodyParser: true,
  },
};