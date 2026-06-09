import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { getPerformanceStore } from '../performance-effects';

const Preview = ({ inputManager, pipeline, isVideoPlaying, onTogglePlay, onOutputFrame, showOverlays = true }) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);  // 2D canvas for performance effects
  const rendererRef = useRef(null);
  const animationFrameIdRef = useRef(null);
  const zoomTimerRef = useRef(null);
  
  const [resolution, setResolution] = useState({ w: 0, h: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [zoomFrame, setZoomFrame] = useState(null);
  const [showZoom, setShowZoom] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    // 1. Initialize WebGL Renderer
    const containerW = containerRef.current.clientWidth;
    const containerH = containerRef.current.clientHeight;

    // Render at higher resolution (min 960w, max 1280w) so the WebSocket gets quality pixels
    const getRenderSize = (cw, ch) => {
      let rw = Math.max(cw, 960);
      rw = Math.min(rw, 1280);
      const rh = Math.round(rw * (ch / cw));
      return { w: rw, h: rh };
    };

    const { w: renderW, h: renderH } = getRenderSize(containerW, containerH);
    
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: false,
      alpha: false,
      preserveDrawingBuffer: true // Required for capturing PNG/JPEG exports!
    });
    
    renderer.setSize(renderW, renderH, false); // false = don't touch CSS; CSS keeps it at container size
    renderer.setPixelRatio(1); // We handle resolution manually
    rendererRef.current = renderer;

    // 2. Set renderer in pipeline
    pipeline.renderer = renderer;
    pipeline.setSize(renderW, renderH);
    setResolution({ w: renderW, h: renderH });

    // 3. Render Loop Setup
    let lastTime = performance.now();
    let frameCount = 0;
    let fpsIntervalStart = lastTime;

    const renderLoop = (now) => {
      animationFrameIdRef.current = requestAnimationFrame(renderLoop);
      
      const time = now * 0.001; // convert to seconds
      
      // Update texture if source is playing (video / camera)
      inputManager.update();
      
      // Render active shaders in pipeline
      const texture = inputManager.getTexture();
      if (texture) {
        pipeline.textureAspect = inputManager.aspectRatio;
        pipeline.render(texture, time);

        // ── Post-processing: performance effects on overlay canvas ──
        try {
          getPerformanceStore().processFrame(
            renderer.domElement,
            overlayCanvasRef.current
          );
        } catch (e) {
          // silently ignore perf fx errors
        }

        // Send frame to viewer (use overlay canvas so performance FX are included)
        if (onOutputFrame) {
          const source = overlayCanvasRef.current || renderer.domElement;
          onOutputFrame(source);
        }
      }
    };

    // Start render loop
    animationFrameIdRef.current = requestAnimationFrame(renderLoop);

    // 4. Resize Observer to make canvas fully fluid and responsive
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current) return;
      const cw = containerRef.current.clientWidth;
      const ch = containerRef.current.clientHeight;
      const { w: rw, h: rh } = getRenderSize(cw, ch);
      
      rendererRef.current.setSize(rw, rh, false);
      pipeline.setSize(rw, rh);
      setResolution({ w: rw, h: rh });
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

  // ── Hover zoom: capture frame and show popup ──
  const captureZoomFrame = useCallback(() => {
    if (!rendererRef.current) return;
    const canvas = rendererRef.current.domElement;
    if (!canvas) return;
    setZoomFrame(canvas.toDataURL('image/jpeg', 0.9));
  }, []);

  const handleMouseEnter = useCallback(() => {
    setShowZoom(true);
    captureZoomFrame();
    // Refresh the zoom frame periodically while hovering
    zoomTimerRef.current = setInterval(captureZoomFrame, 200);
  }, [captureZoomFrame]);

  const handleMouseLeave = useCallback(() => {
    setShowZoom(false);
    if (zoomTimerRef.current) {
      clearInterval(zoomTimerRef.current);
      zoomTimerRef.current = null;
    }
  }, []);

  return (
    <div
      className="preview-viewport"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Dynamic CRT CRT-scanline mask for analog physical texture */}
      {showOverlays && <div className="crt-overlay" />}

      {/* Main interactive canvas wrapper */}
      <div ref={containerRef} className="canvas-wrapper">
        <canvas ref={canvasRef} />
        {/* Overlay canvas for performance effects (2D post-processing) */}
        <canvas ref={overlayCanvasRef} className="perf-overlay-canvas" />
        
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

      {/* ── Hover zoom popup (2x, centered overlay) ── */}
      {showZoom && zoomFrame && (
        <div className="preview-zoom-popup">
          <img className="preview-zoom-img" src={zoomFrame} alt="Preview zoom" />
        </div>
      )}

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
