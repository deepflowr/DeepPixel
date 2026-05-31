import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const Preview = ({ inputManager, pipeline, isVideoPlaying, onTogglePlay }) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const animationFrameIdRef = useRef(null);
  
  const [fps, setFps] = useState(60);
  const [resolution, setResolution] = useState({ w: 0, h: 0 });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    // 1. Initialize WebGL Renderer
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: false,
      alpha: false,
      preserveDrawingBuffer: true // Required for capturing PNG/JPEG exports!
    });
    
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    // 2. Set renderer in pipeline
    pipeline.renderer = renderer;
    pipeline.setSize(width, height);
    setResolution({ w: width, h: height });

    // 3. Render Loop Setup
    let lastTime = performance.now();
    let frameCount = 0;
    let fpsIntervalStart = lastTime;

    const renderLoop = (now) => {
      animationFrameIdRef.current = requestAnimationFrame(renderLoop);
      
      const time = now * 0.001; // convert to seconds
      
      // Calculate FPS
      frameCount++;
      if (now - fpsIntervalStart >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - fpsIntervalStart)));
        frameCount = 0;
        fpsIntervalStart = now;
      }

      // Update texture if source is playing (video / camera)
      inputManager.update();
      
      // Render active shaders in pipeline
      const texture = inputManager.getTexture();
      if (texture) {
        pipeline.textureAspect = inputManager.aspectRatio;
        pipeline.render(texture, time);
      }
    };

    // Start render loop
    animationFrameIdRef.current = requestAnimationFrame(renderLoop);

    // 4. Resize Observer to make canvas fully fluid and responsive
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      
      rendererRef.current.setSize(w, h, false);
      pipeline.setSize(w, h);
      setResolution({ w: w, h: h });
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(containerRef.current);

    // Set callback to notify loading states
    const prevOnTextureLoaded = inputManager.onTextureLoaded;
    inputManager.onTextureLoaded = (texture, ratio) => {
      if (prevOnTextureLoaded) prevOnTextureLoaded(texture, ratio);
      handleResize();
      setIsLoading(false);
    };

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameIdRef.current);
      resizeObserver.disconnect();
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      inputManager.onTextureLoaded = prevOnTextureLoaded;
    };
  }, [inputManager, pipeline]);

  return (
    <div className="preview-viewport">
      {/* Dynamic CRT CRT-scanline mask for analog physical texture */}
      <div className="crt-overlay" />

      {/* Frame Counter & Technical Dashboard Overlays */}
      <div style={{
        position: 'absolute',
        top: '16px',
        left: '16px',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.7rem',
        backgroundColor: 'rgba(24, 24, 27, 0.85)',
        border: '1px solid var(--border-color)',
        padding: '6px 10px',
        borderRadius: '2px',
        zIndex: 3,
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        backdropFilter: 'blur(4px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className={`status-led ${fps > 45 ? 'green' : 'orange'}`} />
          <span>FPS: <strong style={{ color: 'var(--accent-orange)' }}>{fps}</strong></span>
        </div>
        <div>RENDER: <span style={{ color: 'var(--text-primary)' }}>GPU_WEBGL2</span></div>
        <div>BUFFERS: <span style={{ color: 'var(--text-primary)' }}>PING-PONG</span></div>
        <div>DIM: <span style={{ color: 'var(--text-primary)' }}>{resolution.w}×{resolution.h} px</span></div>
      </div>

      {/* Main interactive canvas wrapper */}
      <div ref={containerRef} className="canvas-wrapper">
        <canvas ref={canvasRef} />
        
        {isLoading && (
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'var(--bg-input)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontFamily: 'var(--font-mono)',
            color: 'var(--accent-orange)',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            zIndex: 4
          }}>
            [ Cargando flujo de entrada... ]
          </div>
        )}
      </div>

      {/* Overlay controls for Video playback (Play/Pause) */}
      {inputManager.activeSource === 'video' && (
        <div className="video-control-bar">
          <button 
            className="heavy-btn active" 
            style={{ padding: '4px 8px', fontSize: '0.7rem' }}
            onClick={onTogglePlay}
          >
            {isVideoPlaying ? '[ PAUSA ]' : '[ PLAY ]'}
          </button>
          <span className="video-time-label">VIDEO LOOPING (Muted)</span>
        </div>
      )}
    </div>
  );
};

export default Preview;
