import React, { useEffect, useRef, useState } from 'react';

/**
 * ViewerPage — Full-screen projection viewer.
 *
 * Connects via WebSocket to the DeepPixel controller and displays
 * the processed frames in real time, with zero UI.
 *
 * URL params:
 *   ?session=XXXXX  — session ID to join
 *   &ws=host:3001    — WebSocket server address
 */
const HINT_DURATION = 4000; // ms before the instruction hint fades out

const ViewerPage = () => {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const wsRef = useRef(null);
  const animFrameRef = useRef(null);
  const hintTimerRef = useRef(null);
  const [status, setStatus] = useState('connecting');
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    // ── Read URL params ──
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session');
    const defaultWs = window.location.host || 'localhost:3001';
    const wsAddr = params.get('ws') || defaultWs;

    if (!sessionId) {
      setStatus('no-session');
      return;
    }

    // ── Full-screen styling ──
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflow = 'hidden';
    document.body.style.background = '#000';
    document.documentElement.style.background = '#000';

    const canvas = canvasRef.current;
    const ctx = canvas ? canvas.getContext('2d') : null;

    // Pre-create an Image element for decoding frames
    const img = new Image();
    img.onerror = () => {
      // Silently skip corrupt frames
    };
    imgRef.current = img;

    // ── WebSocket connection ──
    let ws = null;
    let reconnectTimer = null;

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const connectWs = () => {
      setStatus('connecting');
      ws = new WebSocket(`${wsProtocol}//${wsAddr}`);

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'join-session', sessionId }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'session-joined') {
            setStatus('connected');
            // Show instruction hint briefly when connection establishes
            setShowHint(true);
            if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
            hintTimerRef.current = setTimeout(() => setShowHint(false), HINT_DURATION);
          } else if (msg.type === 'frame') {
            img.src = msg.data;
          } else if (msg.type === 'controller-disconnected') {
            setStatus('disconnected');
          }
        } catch (_) {}
      };

      ws.onclose = () => {
        setStatus('reconnecting');
        // Auto-reconnect every 3 seconds
        reconnectTimer = setTimeout(connectWs, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };

      wsRef.current = ws;
    };

    connectWs();

    // ── Render loop: draw image to canvas when loaded ──
    let lastFrameTime = 0;

    const renderLoop = (timestamp) => {
      animFrameRef.current = requestAnimationFrame(renderLoop);

      // Throttle drawing to ~30fps to match CPU usage
      if (timestamp - lastFrameTime < 33) return;
      lastFrameTime = timestamp;

      if (img.complete && img.naturalWidth > 0 && canvas && ctx) {
        const cw = canvas.width;
        const ch = canvas.height;

        if (cw === 0 || ch === 0) return;

        const imgAspect = img.naturalWidth / img.naturalHeight;
        const winAspect = cw / ch;

        let dw, dh, dx, dy;
        if (imgAspect > winAspect) {
          // Image wider than screen → fill height, crop sides
          dh = ch;
          dw = ch * imgAspect;
          dx = (cw - dw) / 2;
          dy = 0;
        } else {
          // Image taller than screen → fill width, crop top/bottom
          dw = cw;
          dh = cw / imgAspect;
          dx = 0;
          dy = (ch - dh) / 2;
        }

        ctx.drawImage(img, dx, dy, dw, dh);
      }
    };

    animFrameRef.current = requestAnimationFrame(renderLoop);

    // ── Resize handler + initial size ──
    const handleResize = () => {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };
    handleResize(); // Set initial size immediately
    window.addEventListener('resize', handleResize);

    // ── Double-click fullscreen ──
    const handleDblClick = () => {
      if (!document.fullscreenElement) {
        document.body.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    };
    document.addEventListener('dblclick', handleDblClick);

    // ── Cleanup ──
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('dblclick', handleDblClick);
      if (ws) ws.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
      document.body.style.margin = '';
      document.body.style.padding = '';
      document.body.style.overflow = '';
      document.body.style.background = '';
      document.documentElement.style.background = '';
    };
  }, []);

  // ── Status overlay (auto-hides after connection) ──
  const showOverlay = status === 'connecting' || status === 'reconnecting' || status === 'no-session' || status === 'disconnected';

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', background: '#000' }}>
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          background: '#000',
        }}
      />

      {showOverlay && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'rgba(0,0,0,0.85)',
          fontFamily: '"Space Mono", "JetBrains Mono", monospace',
          color: '#ff6b00',
          gap: '16px',
          zIndex: 10,
        }}>
          <div style={{ fontSize: '1.2rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            {status === 'connecting' && '[ Conectando con el controlador... ]'}
            {status === 'reconnecting' && '[ Reconectando... ]'}
            {status === 'no-session' && '[ Error: Sin sesión ]'}
            {status === 'disconnected' && '[ Controlador desconectado ]'}
          </div>
          {status === 'no-session' && (
            <div style={{ fontSize: '0.7rem', color: '#71717a', textAlign: 'center', maxWidth: '400px' }}>
              Generá un VIEWER LINK desde la página de control de DeepPixel y navegá a ese link para ver la señal en vivo.
            </div>
          )}
          {status !== 'no-session' && (
            <div style={{
              width: '120px',
              height: '2px',
              background: '#202023',
              overflow: 'hidden',
            }}>
              <div style={{
                width: '40%',
                height: '100%',
                background: '#ff6b00',
                animation: 'viewerLoading 1.2s ease-in-out infinite',
              }} />
            </div>
          )}
        </div>
      )}

      {/* ── Instruction hint: appears on connect, fades out after HINT_DURATION ── */}
      <div style={{
        position: 'absolute',
        bottom: '48px',
        left: '50%',
        transform: 'translateX(-50%)',
        fontFamily: '"Space Mono", "JetBrains Mono", monospace',
        fontSize: '0.75rem',
        color: '#ffffff',
        opacity: showHint ? 0.7 : 0,
        transition: 'opacity 0.8s ease',
        pointerEvents: 'none',
        textAlign: 'center',
        letterSpacing: '0.1em',
        background: 'rgba(0,0,0,0.5)',
        padding: '8px 16px',
        borderRadius: '4px',
        zIndex: 10,
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}>
F11 · PANTALLA COMPLETA · DOBLE CLICK
      </div>

      <style>{`
        @keyframes viewerLoading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
      `}</style>
    </div>
  );
};

export default ViewerPage;
