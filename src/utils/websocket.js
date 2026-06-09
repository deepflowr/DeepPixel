/**
 * WebSocket client for DeepPixel viewer sync.
 *
 * Two roles:
 *   controller — creates a session, sends frames
 *   viewer     — joins a session, receives frames
 */

const WS_PORT = 3001;

function getServerUrl() {
  const host = window.location.hostname || 'localhost';
  return `ws://${host}:${WS_PORT}`;
}

/**
 * Connect to the DeepPixel WebSocket server.
 * Returns a promise that resolves with the WebSocket instance
 * after the initial handshake message.
 */
export function connect(role, sessionId = null) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(getServerUrl());

    ws.onopen = () => {
      if (role === 'controller') {
        ws.send(JSON.stringify({ type: 'create-session' }));
      } else if (role === 'viewer' && sessionId) {
        ws.send(JSON.stringify({ type: 'join-session', sessionId }));
      } else {
        reject(new Error('Invalid connection params'));
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'session-created' || msg.type === 'session-joined') {
          resolve({ ws, sessionId: msg.sessionId });
        } else if (msg.type === 'error') {
          reject(new Error(msg.message));
        }
      } catch (e) {
        // pass — message will be handled by the consumer
      }
    };

    ws.onerror = () => {
      reject(new Error('WebSocket connection failed'));
    };

    ws.onclose = () => {
      // Will be handled by consumer
    };

    // Timeout after 5 seconds
    setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000);
  });
}

// Reusable downsample canvas — resized dynamically per frame
let downsample = null;
let dCtx = null;

/**
 * Send a frame (canvas) to all connected viewers.
 * Uses the source canvas resolution, capped at 1280x720, at 85% JPEG quality.
 */
export function sendFrame(ws, canvas) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  // Determine output size: min 640x360, max 1280x720, respect source ratio
  const MIN_W = 640;
  const MIN_H = 360;
  const MAX_W = 1280;
  const MAX_H = 720;

  let outW = canvas.width;
  let outH = canvas.height;

  // Ensure minimum resolution
  if (outW < MIN_W || outH < MIN_H) {
    const scale = Math.max(MIN_W / outW, MIN_H / outH);
    outW = Math.round(outW * scale);
    outH = Math.round(outH * scale);
  }

  // Cap maximum resolution
  if (outW > MAX_W || outH > MAX_H) {
    const scale = Math.min(MAX_W / outW, MAX_H / outH);
    outW = Math.round(outW * scale);
    outH = Math.round(outH * scale);
  }

  // Recreate downsample canvas only when size changes
  if (!downsample || downsample.width !== outW || downsample.height !== outH) {
    downsample = document.createElement('canvas');
    downsample.width = outW;
    downsample.height = outH;
    dCtx = downsample.getContext('2d');
  }

  dCtx.drawImage(canvas, 0, 0, outW, outH);

  ws.send(JSON.stringify({
    type: 'frame',
    data: downsample.toDataURL('image/jpeg', 0.85),
    timestamp: Date.now()
  }));
}
