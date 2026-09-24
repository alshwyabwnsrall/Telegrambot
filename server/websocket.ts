import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { telegramManager, safeJsonStringify } from './telegramManager.js';

export function setupWebSocket(server: HttpServer) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  function broadcast(data: any) {
    const payload = safeJsonStringify(data);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }

  // Telegram Manager Event Listeners
  telegramManager.on('qr_updated', (qrState) => {
    broadcast({ type: 'qr_updated', qrState });
  });

  telegramManager.on('2fa_required', (payload) => {
    broadcast({ type: '2fa_required', ...payload });
  });

  telegramManager.on('authenticated', (user) => {
    broadcast({ type: 'authenticated', user });
  });

  telegramManager.on('auth_error', (error) => {
    broadcast({ type: 'auth_error', error });
  });

  telegramManager.on('logged_out', () => {
    broadcast({ type: 'logged_out' });
  });

  telegramManager.on('new_message', (message) => {
    broadcast({ type: 'new_message', message });
  });

  telegramManager.on('status_change', (status) => {
    broadcast({ type: 'status_change', status });
  });

  telegramManager.on('keyword_alert', (alert) => {
    broadcast({ type: 'keyword_alert', alert });
  });

  telegramManager.on('config_updated', (config) => {
    broadcast({ type: 'config_updated', config: { apiId: config.apiId, configured: true } });
  });

  wss.on('connection', async (ws) => {
    // Send current status immediately upon connecting
    try {
      const status = await telegramManager.getStatus();
      ws.send(safeJsonStringify({ type: 'initial_status', status }));
    } catch (err) {
      console.error('Error sending initial status over WS:', err);
    }

    ws.on('message', async (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.action === 'get_status') {
          const status = await telegramManager.getStatus();
          ws.send(safeJsonStringify({ type: 'status', status }));
        }
      } catch (err) {
        // ignore malformed ws messages
      }
    });
  });

  return wss;
}
