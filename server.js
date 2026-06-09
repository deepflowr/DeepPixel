import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { randomUUID } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 3001;

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const sessions = new Map();

app.get('/health', (_req, res) => {
  res.json({ ok: true, sessions: sessions.size });
});

// ── In production, serve the built frontend ──
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, 'dist');
  app.use(express.static(distPath));

  // SPA fallback: any unmatched route → index.html
  // Note: Express 5 (path-to-regexp@8) no longer supports bare '*' route patterns.
  app.use((_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

wss.on('connection', (ws) => {
  let sessionId = null;
  let role = null;

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      switch (msg.type) {
        case 'create-session': {
          sessionId = randomUUID().slice(0, 8);
          role = 'controller';
          if (sessions.has(sessionId)) {
            const old = sessions.get(sessionId);
            old.viewers.forEach(v => { try { v.close(); } catch (_) {} });
          }
          sessions.set(sessionId, { controller: ws, viewers: new Set() });
          ws.send(JSON.stringify({ type: 'session-created', sessionId }));
          console.log('[WS] Controller created session', sessionId);
          break;
        }

        case 'join-session': {
          const targetId = msg.sessionId;
          if (!targetId || !sessions.has(targetId)) {
            ws.send(JSON.stringify({ type: 'error', message: 'Sesion no encontrada' }));
            return;
          }
          sessionId = targetId;
          role = 'viewer';
          const session = sessions.get(sessionId);
          session.viewers.add(ws);
          ws.send(JSON.stringify({ type: 'session-joined', sessionId }));
          console.log('[WS] Viewer joined session', sessionId, 'viewers:', session.viewers.size);
          if (session.controller && session.controller.readyState === 1) {
            session.controller.send(JSON.stringify({ type: 'viewer-connected', count: session.viewers.size }));
          }
          break;
        }

        case 'frame': {
          if (role !== 'controller' || !sessionId) return;
          const session = sessions.get(sessionId);
          if (!session) return;
          const frameMsg = JSON.stringify({ type: 'frame', data: msg.data, timestamp: msg.timestamp });
          session.viewers.forEach(viewer => {
            if (viewer.readyState === 1) viewer.send(frameMsg);
          });
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.error('[WS] Error:', err.message);
    }
  });

  ws.on('close', () => {
    if (sessionId && sessions.has(sessionId)) {
      const session = sessions.get(sessionId);
      if (role === 'controller') {
        session.viewers.forEach(viewer => {
          try { viewer.send(JSON.stringify({ type: 'controller-disconnected' })); viewer.close(); } catch (_) {}
        });
        sessions.delete(sessionId);
        console.log('[WS] Session', sessionId, 'closed');
      } else if (role === 'viewer') {
        session.viewers.delete(ws);
        if (session.controller && session.controller.readyState === 1) {
          session.controller.send(JSON.stringify({ type: 'viewer-disconnected', count: session.viewers.size }));
        }
        if (session.viewers.size === 0 && !session.controller) {
          sessions.delete(sessionId);
        }
      }
    }
  });
});

server.listen(PORT, () => {
  console.log('[DeepPixel] Server on http://localhost:' + PORT);
  console.log('[DeepPixel] WebSocket on ws://localhost:' + PORT);
});
