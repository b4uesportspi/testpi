const fs = require('fs');

let routes = fs.readFileSync('server/routes.ts', 'utf8');

const routeStr = `
  // Get user notifications
  app.get('/api/notifications', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid token' });
      }
      const token = authHeader.split(' ')[1];
      const session = await storage.getSession(token);
      if (!session) {
        return res.status(401).json({ error: 'Invalid session' });
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
      const session = await storage.getSession(token);
      if (!session) {
        return res.status(401).json({ error: 'Invalid session' });
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
`;

if (!routes.includes('/api/notifications')) {
  // Inject before "return httpServer"
  routes = routes.replace('return httpServer;', routeStr + '\n  return httpServer;');
  fs.writeFileSync('server/routes.ts', routes);
  console.log('Routes added');
}
