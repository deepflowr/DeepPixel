# DeepPixel — Plan de Proyecto

> Documento de arquitectura, estado actual y roadmap para uso con asistentes de código.
> **Última actualización: Junio 2026**
> Repositorio: `github.com/deepflowr/DeepPixel`

---

## 1. Visión General

Webapp de procesamiento de imagen en tiempo real para VJing, con 16 efectos visuales (dither, glitch, halftone, feedback, etc.) que corren en GPU (GLSL) y CPU. El output puede integrarse con OBS, Resolume, TouchDesigner y cualquier software VJ vía ventana popup o Browser Source con `?output`.

**Usuarios objetivo:**
- **VJ/performer:** usa la app en vivo con webcam, video o generadores procedurales, encadena efectos, abre ventana output y la captura desde OBS/Resolume.
- **Diseñador:** sube imágenes, experimenta con paletas, exporta PNG/SVG.
- **Curioso:** cámara web + efectos en tiempo real sin instalar nada.

---

## 2. Stack Tecnológico

```
Vite + React 19      →  bundler y UI
Three.js 0.184       →  WebGL2 / shaders / pipeline de efectos
GLSL (fragmentShaders) →  12 efectos en GPU
Canvas 2D API         →  4 efectos CPU (Floyd-Steinberg, Atkinson, Jarvis, Stucki)
stats.js (dev)        →  monitor FPS/memoria en desarrollo
```

### Dependencias

```json
{
  "dependencies": {
    "react": "^19.2.6",
    "react-dom": "^19.2.6",
    "three": "^0.184.0"
  },
  "devDependencies": {
    "vite": "^8.0.12",
    "@vitejs/plugin-react": "^6.0.1",
    "stats.js": "^0.17.0"
  }
}
```

---

## 3. Estructura de Carpetas (ESTADO ACTUAL)

```
/src
  /core
    EffectPipeline.js     # Pipeline WebGL2 ping-pong + CPU effects
    InputManager.js       # Cámara, imagen, video, procedural source
    ExportManager.js      # Export SVG desde canvas raster
    ProceduralSource.js   # Generadores procedurales animados en Canvas 2D
  /effects
    index.js              # Registry central (AVAILABLE_EFFECTS, getEffectById, getDefaultParams)
    bayer-dither.js       # Dither Bayer (GPU)
    floyd-steinberg.js    # Floyd-Steinberg error diffusion (CPU)
    halftone.js           # Halftone clásico (GPU)
    scanlines.js          # Scanlines CRT (GPU)
    risograph.js          # Risograph con offset de color (GPU)
    glitch.js             # Glitch con RGB shift + block distortion (GPU)
    posterize.js          # Posterización por niveles HSV (GPU)
    kaleidoscope.js       # Caleidoscopio simétrico (GPU)
    feedback.js           # Feedback/delay con persistencia (GPU)
    cmyk-halftone.js      # Halftone CMYK 4-canales (GPU)
    atkinson-dither.js    # Atkinson error diffusion (CPU)
    stucki.js             # Stucki error diffusion (CPU)
    jarvis.js             # Jarvis-Judice-Ninke error diffusion (CPU)
    clustered-dot.js      # Clustered dot ordered dither (GPU)
    crosshatch.js         # Crosshatch pattern (GPU)
    brick-dither.js       # Ladrillos (Brick) pattern (GPU)
    palettes.js           # 15 paletas predefinidas + extractPaletteFromSource()
  /shaders
    common.vert.glsl      # Vertex shader compartido (fullscreen quad)
    bayer.frag.glsl
    halftone.frag.glsl
    scanlines.frag.glsl
    glitch.frag.glsl
    risograph.frag.glsl
    posterize.frag.glsl
    kaleidoscope.frag.glsl
    feedback.frag.glsl
    cmyk-halftone.frag.glsl
    clustered-dot.frag.glsl
    crosshatch.frag.glsl
    brick-dither.frag.glsl
  /ui
    Preview.jsx           # Canvas Three.js + render loop + FPS dashboard
    EffectSelector.jsx    # Accordion channel strip mixer con drag & drop
    Controls.jsx          # Generación dinámica de controles desde params
    ExportPanel.jsx       # (legacy) Definiciones de PROC_SOURCES
  App.jsx                 # Orquestador principal + output window + modo ?output
  main.jsx                # Entry point + stats.js en desarrollo
  index.css               # Todos los estilos (industrial dark mode, 600+ líneas)
```

---

## 4. Estado del Proyecto — 100% implementado

### ✅ Implementado

| Componente | Estado | Detalle |
|---|---|---|
| **16 efectos visuales** | ✅ | 12 GPU (GLSL) + 4 CPU (Canvas 2D) |
| **Pipeline WebGL ping-pong** | ✅ | `EffectPipeline.js` con render targets, feedback loop |
| **Input Manager** | ✅ | Cámara (getUserMedia), imagen (File/URL), video, procedural |
| **Procedural Sources** | ✅ | 3 generadores: Test Pattern, CRT Texture, Moiré Geométrico |
| **Export PNG** | ✅ | canvas.toDataURL → download |
| **Export SVG** | ✅ | RLE-based pixel path generation desde canvas |
| **Export/Import presets JSON** | ✅ | Estado de parámetros serializable |
| **Paletas predefinidas** | ✅ | 15 paletas (2-8 colores) en palettes.js |
| **Paleta global** | ✅ | Override de paleta para todos los efectos activos |
| **Extracción de paleta desde fuente** | ✅ | Median-cut quantization sobre imagen/video |
| **Channel strip mixer** | ✅ | Accordion, drag & drop reorder, ON/OFF bypass |
| **Auto-sort efectos** | ✅ | Activos arriba, desactivados abajo |
| **Controles dinámicos** | ✅ | Sliders, select-sliders, color pickers, palette editor |
| **Output window (popup)** | ✅ | Ventana separada con solo canvas, fullscreen, ESC=cerrar |
| **Modo ?output** | ✅ | URL param que renderiza solo canvas sin UI |
| **Throttle output 30fps** | ✅ | GPU readback limitado a ~30fps |
| **Downsampling output** | ✅ | Reduce resolución a la mitad para readback más rápido |
| **CRT overlay** | ✅ | Scanlines + chromatic aberration CSS overlay |
| **FPS dashboard** | ✅ | FPS, resolución, tipo de render, estado de buffers |
| **Responsive** | ✅ | 3 breakpoints (1100px, 900px, 600px) |
| **EXIF orientation** | ✅ | Parseo y corrección de orientación en JPEGs |
| **stats.js dev** | ✅ | FPS/memoria en entorno dev |
| **README bilingüe** | ✅ | ES-AR + EN con guía VJ completa |
| **GitHub repo** | ✅ | Rama `main` con código completo |
| **Error handling** | ✅ | Toast de errores, carga, estados vacíos |

---

## 5. Interfaz de Efectos (Contrato)

Cada efecto en `/effects/*.js` exporta un objeto con esta estructura:

```js
export default {
  id: "bayer-dither",          // único, usado como key
  label: "Dither Bayer",       // nombre visible
  category: "dither",          // agrupación conceptual

  params: {
    threshold: {
      type: "float",           // "float" | "int" | "select" | "palette" | "boolean" | "color" | "color-pair"
      label: "Umbral",
      min: 0.0,
      max: 1.0,
      default: 0.5,
      step: 0.01
    },
    palette: {
      type: "palette",
      label: "Paleta",
      default: ["#000000", "#ffffff"],
      minColors: 2,            // mínimo colores
      maxColors: 8             // máximo colores
    },
    matrixSize: {
      type: "select",
      label: "Matriz",
      options: [2, 4, 8],      // valores discretos
      default: 4
    }
  },

  renderer: "glsl",            // "glsl" | "cpu"
  vertexShader,                // solo si renderer === "glsl"
  fragmentShader,              // solo si renderer === "glsl"
  svgExportable: true,         // puede exportarse como SVG?

  // solo si renderer === "cpu":
  processFn: (imageData, params) => imageData
}
```

**La UI se genera automáticamente** desde `params` — no hay que tocar `Controls.jsx` al agregar un efecto nuevo.

---

## 6. Pipeline de Efectos

### GPU (GLSL) — ping-pong buffering

```
InputTexture (cámara/imagen/video/procedural)
    ↓
[Efecto 1] ShaderMaterial → WebGLRenderTarget A (o null si es último)
    ↓
[Efecto 2] ShaderMaterial → WebGLRenderTarget B
    ↓
[Efecto N] ShaderMaterial → null (renderiza directo a pantalla)
```

- Alterna entre `renderTarget1` y `renderTarget2` para evitar crear targets nuevos.
- `EffectPipeline.render()` recibe `inputTexture` y `time`, itera la chain de efectos.
- `updateEffectParam()` actualiza uniforms del material cacheado sin recrear el shader.

### CPU (Canvas 2D) — error diffusion

- Los efectos CPU se ejecutan con submuestreo (`pixelSize`), reduciendo drásticamente la cantidad de píxeles a procesar.
- El resultado se carga de vuelta a GPU como `CanvasTexture` con `NearestFilter`.
- Soportan paletas multi-color (2-8 colores) mediante cuantización por luminancia.

### Feedback Loop

- Efecto especial `feedback.js` que captura su propio output en un `feedbackRT` persistente y lo mezcla en el frame siguiente.
- Usa `ensureFeedbackTarget()` para crear/mantener el render target de feedback.

### Paleta Global

- Cuando `useGlobalPalette === true`, el pipeline overparea los uniforms `uColor0..uColor7` y `uPaletteSize` de TODOS los efectos en cada frame.
- Los efectos CPU también reciben el override de paleta.

---

## 7. Efectos — Tabla Completa

| ID | Nombre | Categoría | Renderer | Parámetros | SVG |
|---|---|---|---|---|---|
| `bayer-dither` | Dither Bayer | dither | GLSL | threshold, matrixSize, speed, pixelSize, palette | ✅ |
| `floyd-steinberg` | Floyd-Steinberg | dither | CPU | threshold, pixelSize, palette | ✅ |
| `atkinson-dither` | Dither Atkinson | dither | CPU | threshold, pixelSize, palette | ✅ |
| `stucki` | Dither Stucki | dither | CPU | threshold, pixelSize, palette | ✅ |
| `jarvis` | Jarvis-Judice-Ninke | dither | CPU | threshold, pixelSize, palette | ✅ |
| `clustered-dot` | Clustered Dot | dither | GLSL | dotSize, contrast, speed, angle, palette | ✅ |
| `crosshatch` | Crosshatch | dither | GLSL | scale, contrast, speed, angle, palette | ✅ |
| `brick-dither` | Ladrillos (Brick) | dither | GLSL | brickSize, contrast, speed, angle, palette | ✅ |
| `halftone` | Halftone | print | GLSL | dotSize, contrast, speed, angle, palette | ✅ |
| `cmyk-halftone` | CMYK Halftone | print | GLSL | dotSize, speed, contrast, angleC/M/Y/K, palette | ❌ |
| `risograph` | Risograph | print | GLSL | offsetX, offsetY, grain, hue, saturation, split | ❌ |
| `scanlines` | Scanlines CRT | retro | GLSL | intensity, speed, spacing | ✅ |
| `glitch` | Glitch | destroy | GLSL | intensity, blockSize, rgbShift, speed, scanDistortion | ❌ |
| `posterize` | Posterización | tone | GLSL | levels, hue, saturation | ✅ |
| `kaleidoscope` | Caleidoscopio | transform | GLSL | segments, zoom, rotation, hue, saturation | ❌ |
| `feedback` | Feedback (Delay) | feedback | GLSL | feedback, decay, mix, hue, saturation | ❌ |

---

## 8. Input Manager

```js
class InputManager {
  activeSource        // "camera" | "image" | "video" | "procedural" | "none"
  activeTexture       // THREE.Texture | THREE.VideoTexture | THREE.CanvasTexture
  aspectRatio         // número (w/h)
  proceduralSource    // referencia a ProceduralSource

  async setCamera()                               // getUserMedia → VideoTexture
  async setImage(fileOrUrl)                       // FileReader → Texture (con EXIF)
  async setVideo(file)                            // URL.createObjectURL → VideoTexture
  async setProceduralSource(proceduralSource, type) // CanvasTexture animado
  togglePlayback()                                // play/pause para videos
  update()                                        // llamado cada frame
  getTexture()                                    → THREE.Texture
  dispose()
}
```

### Procedural Sources (3 generadores VJ)

1. **Test Pattern** — Barras SMPTE + rampa de grises + checkerboard + sweep + ruido
2. **CRT Texture** — Ruido pixelado animado + bandas VHS + fringe cromático + scanlines
3. **Moiré Geométrico** — Círculos concéntricos + spoke pattern + grilla rotatoria

---

## 9. Export

### PNG
`canvas.toDataURL('image/png')` → download link.

### SVG
`ExportManager.exportSVG(canvas, params)` — genera paths SVG mediante RLE (run-length encoding) horizontal por fila de píxeles, con foreground/background determinados por luminancia y colores desde parámetros HSL.

### Presets JSON
```json
{
  "version": "1.0",
  "timestamp": 1234567890,
  "preset": { "effectId": "bayer-dither", "params": { "threshold": 0.6, ... } }
}
```

---

## 10. UI — Layout

```
┌─────────────────────────────────────────────────────────┐
│  HEADER (44px)                                          │
│  DEEPPIXEL  |  FUENTE [CÁMARA][SUBIR][BARRAS][CRT][MOIRÉ]  │
│             |  PALETA [GLOBAL]                          │
│             |  EXPORT [PNG][SVG][PRESET][IMP][OUTPUT]   │
│                                           [status-led]  │
├──────────────────────────┬──────────────────────────────┤
│  SIDEBAR (440px)         │  VIEWPORT (flex 1)           │
│  ┌────────────────────┐  │  ┌────────────────────────┐  │
│  │ PALETA GLOBAL      │  │  │                        │  │
│  │ [+][−] 3/16 ACT.   │  │  │   Canvas Three.js      │  │
│  ├────────────────────┤  │  │                        │  │
│  │ #1 DITHER BAYER    │  │  │   FPS: 60              │  │
│  │  [−] [ON]          │  │  │   GPU_WEBGL2           │  │
│  │  ↓ controles       │  │  │   PING-PONG            │  │
│  ├────────────────────┤  │  │   1920×1080 px         │  │
│  │ #2 SCANLINES CRT   │  │  │                        │  │
│  │  [+] [OFF]         │  │  │                        │  │
│  ├────────────────────┤  │  └────────────────────────┘  │
│  │ ... más efectos    │  │                              │
│  └────────────────────┘  │                              │
└──────────────────────────┴──────────────────────────────┘
```

### Output Window (popup)

- Se abre con botón ◇ OUTPUT en el header.
- Ventana maximizada sin toolbars/chrome.
- Recibe frames via `postMessage` con `createImageBitmap` (throttle 30fps, downsample 50%).
- Doble click = fullscreen, ESC = cerrar si no está en fullscreen.

### Modo `?output`

- Agregando `?output` a la URL se renderiza **solo el canvas** sin header/sidebar/overlays.
- Ideal para **Browser Source de OBS**: `http://localhost:5173/?output`

---

## 11. Paletas

15 paletas predefinidas en `src/effects/palettes.js`:

| ID | Nombre | Colores |
|---|---|---|
| `bw` | Monocromo | 2 (blanco y negro) |
| `bw-heavy` | Contraste Alto | 2 |
| `sepia` | Sepia Vintage | 5 |
| `retro-green` | Terminal Verde | 6 |
| `retro-amber` | Terminal Ámbar | 8 |
| `cmyk` | CMYK Print | 5 |
| `gameboy` | Gameboy | 4 |
| `neon` | Neon Nights | 5 |
| `sunset` | Sunset | 6 |
| `ocean` | Océano | 6 |
| `fire` | Fuego | 7 |
| `vaporwave` | Vaporwave | 7 |
| `retro-4` | Retro 4-bit | 7 |
| `duotone-red` | Duotone Rojo | 7 |
| `duotone-blue` | Duotone Azul | 7 |

Todas las paletas tienen un **editor visual** en la UI: color pickers nativos, preset strip, extractor desde la imagen fuente (median-cut quantization).

---

## 12. Output Window — Performance

`sendOutputFrame()` en `App.jsx`:
- **Throttle:** máximo ~30fps (`lastOutputFrameTimeRef`)
- **Downsample:** si el canvas es >640×480, se reduce a la mitad antes de `createImageBitmap`
- **Canvas reutilizable:** `downsampleCanvasRef` evita crear canvases nuevos
- **Async:** `createImageBitmap` + `postMessage` con transferencia de ownership

---

## 13. CSS / Estilos

- **Industrial Dark Mode** con tokens CSS custom properties.
- **Paleta de colores:** naranja (#ff6b00) como acento principal, verde para OK, rojo para error.
- **Fuentes:** Outfit (headings), Space Mono / JetBrains Mono (mono).
- **Componentes:** sliders custom con thumb industrial, drag & drop visual feedback, LED indicators, CRT overlay, toast animations.
- **Responsive:** 3 breakpoints (1100px, 900px, 600px). Mobile: layout vertical.

---

## 14. Plan Futuro (Ideas / Roadmap)

- [ ] **WebSocket bridge** para TouchDesigner (parámetros en vivo)
- [ ] **OSC** con osc.js para control MIDI/OSC
- [ ] **Pixel sorting** (efecto CPU)
- [ ] **Datamoshing** (corrupción de buffer)
- [ ] **Resolución configurable** desde la UI
- [ ] **Grabación de video** desde el canvas
- [ ] **Pantalla completa** en el navegador principal (F11)
- [ ] **Temas de color** alternativos
- [ ] **Historial de presets** (últimos N usados)
- [ ] **Modo presentación** sin sidebar

---

## 15. Notas para el Asistente de Código

1. **No romper la interfaz de efectos** — todo efecto debe respetar el contrato de `params`.
2. **Dispose siempre** — al desactivar o reemplazar, liberar texturas y materiales GPU.
3. **Un solo renderer Three.js** — instanciado en Preview.jsx, compartido por referencia.
4. **Pipeline.render() corre en el render loop de Preview** — no crear loops separados.
5. **Los efectos CPU usan submuestreo** — el `pixelSize` controla la resolución de procesamiento.
6. **El palette type usa `uColor0..uColor7` + `uPaletteSize`** como uniforms — mantener convención.
7. **El feedback loop requiere `ensureFeedbackTarget()`** antes de renderizar el efecto feedback.
8. **El modo `?output` es un early return en App.jsx** — no renderiza header/sidebar.
9. **sendOutputFrame está throttled a 30fps con downsampling** — no modificar sin considerar performance.
10. **stats.js se carga dinámicamente solo en dev** — no es parte del build de producción.
