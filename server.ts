import express from 'express';
import http from 'http';
import path from 'path';
import dotenv from 'dotenv';
import apiRouter from './server/routes.js';
import aiRouter from './server/aiRoutes.js';
import workspaceRouter from './server/workspaceRoutes.js';
import { setupWebSocket } from './server/websocket.js';
import { telegramManager } from './server/telegramManager.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

// Parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup WebSocket
setupWebSocket(server);

// API Routes
app.use('/api/telegram', apiRouter);
app.use('/api/ai', aiRouter);
app.use('/api/workspace', workspaceRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Telegram Auto-initialize if session exists
telegramManager.initialize().catch((err) => {
  console.log('[Telegram] Auto-connect skipped or not configured yet:', err?.message || err);
});

async function startServer() {
  if (!isProd) {
    // In development mode, mount Vite middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production mode, serve static built files
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Telegram Client server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
