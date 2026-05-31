# Glitch & Dither Webapp — Plan de Proyecto

> Documento de arquitectura y roadmap para uso con asistentes de código (Cursor, Claude, etc.)
> Última actualización: Mayo 2026

---

## 1. Visión General

Webapp de procesamiento de imagen en tiempo real con efectos visuales estéticos (dither, glitch, halftone, etc.). Funciona standalone en el browser. Como feature adicional, el output puede integrarse con software VJ (Resolume, TouchDesigner) mediante OBS + NDI.

**Usuarios objetivo:**
- Usuario general: sube una imagen o activa la cámara, aplica efectos, exporta
- Usuario VJ/performer: usa la app en vivo con integración a Resolume/TD vía OBS+NDI

---

## 2. Stack Tecnológico

```
Vite + React          →  bundler y UI
Three.js              →  WebGL / shaders / pipeline de efectos
GLSL (fragmentShaders) →  efectos en GPU
Canvas 2D API         →  efectos CPU (Floyd-Steinberg) y export
```

### Dependencias principales

```json
{
  "dependencies": {
    "react": "^18",
    "react-dom": "^18",
    "three": "^0.165"
  },
  "devDependencies": {
    "vite": "^5",
    "@vitejs/plugin-react": "^4",
    "vite-plugin-glsl": "^1"    // para importar .glsl como módulos
  }
}
```

**Opcional para desarrollo:**
- `stats.js` — monitor de FPS y memoria en dev

---

## 3. Estructura de Carpetas

```
/src
  /core
    EffectPipeline.js     # encadena efectos con WebGLRenderTarget
    InputManager.js       # maneja cámara, imagen, video como fuente
    ExportManager.js      # PNG, SVG, JSON de parámetros
  /effects
    index.js              # registry central de todos los efectos
    bayer-dither.js
    floyd-steinberg.js
    glitch-chunks.js
    halftone.js
    scanlines.js
    risograph.js
  /shaders
    common.vert.glsl      # vertex shader compartido (fullscreen quad)
    bayer.frag.glsl
    halftone.frag.glsl
    glitch.frag.glsl
    scanlines.frag.glsl
  /ui
    Controls.jsx          # generado dinámicamente desde params del efecto
    EffectSelector.jsx
    Preview.jsx           # canvas Three.js
    ExportPanel.jsx
  /td
    WebSocketBridge.js    # feature opcional, desacoplada del core
  App.jsx
  main.jsx
```

---

## 4. Arquitectura de Efectos

### Principio de diseño

Cada efecto es un módulo independiente con interfaz común. La UI se genera automáticamente desde la definición de parámetros. El pipeline encadena efectos pasando render targets entre ellos.

### Interfaz de un efecto (contrato)

```js
// Ejemplo: /src/effects/bayer-dither.js
export default {
  id: "bayer-dither",
  label: "Dither Bayer",
  category: "dither",

  // Parámetros: la UI se genera desde acá automáticamente
  params: {
    threshold: {
      type: "float",
      label: "Umbral",
      min: 0,
      max: 1,
      default: 0.5,
      step: 0.01
    },
    matrixSize: {
      type: "select",
      label: "Matriz",
      options: [2, 4, 8],
      default: 4
    },
    palette: {
      type: "color-pair",
      label: "Paleta",
      default: ["#000000", "#ffffff"]
    }
  },

  // Tipo de procesamiento
  renderer: "glsl",                     // "glsl" | "cpu"
  vertexShader: "common.vert.glsl",     // shared
  fragmentShader: "bayer.frag.glsl",

  // Para efectos CPU (Floyd-Steinberg)
  // processFn: (imageData, params) => ImageData

  // Exportable como SVG vectorial?
  svgExportable: true
}
```

### Pipeline de efectos (GPU)

```
InputTexture (cámara o imagen)
    ↓
[Efecto 1] ShaderMaterial → WebGLRenderTarget A
    ↓
[Efecto 2] ShaderMaterial → WebGLRenderTarget B
    ↓
[Efecto N] ShaderMaterial → Canvas final (display)
```

Implementado con `THREE.WebGLRenderTarget` y ping-pong buffering.

### Efectos planificados

| ID | Nombre | Técnica | GPU/CPU | SVG exportable | Complejidad |
|---|---|---|---|---|---|
| `bayer-dither` | Dither Bayer | Bayer matrix GLSL | GPU | Sí | Baja |
| `floyd-steinberg` | Floyd-Steinberg | Error diffusion | CPU | Sí | Media |
| `glitch-chunks` | Glitch Chunks | Desplazamiento aleatorio | GPU | No | Baja |
| `scanlines` | Scanlines | Líneas horizontales | GPU | Sí | Mínima |
| `halftone` | Halftone | Círculos por luminancia | GPU | Sí (perfecto) | Media |
| `risograph` | Risograph | Paleta reducida + offset | GPU | Sí | Media |
| `pixel-sort` | Pixel Sorting | Orden por luminancia | CPU | No | Alta |
| `datamosh` | Datamosh | Corrupción de buffer | CPU | No | Muy alta |

---

## 5. Input Manager

Maneja tres fuentes posibles con la misma interfaz de salida (textura Three.js).

```js
// /src/core/InputManager.js

class InputManager {
  // Fuente activa: "camera" | "image" | "video"
  async setCamera()       // getUserMedia, VideoTexture
  async setImage(file)    // FileReader → THREE.TextureLoader
  async setVideo(file)    // similar a cámara

  getTexture()            // siempre devuelve THREE.Texture actualizada
  getAspectRatio()
  dispose()
}
```

**Cámara**: usar `navigator.mediaDevices.getUserMedia` → `<video>` hidden → `THREE.VideoTexture`

**Imagen**: `FileReader` → `Image` → `THREE.Texture`. Manejar orientación EXIF.

**Consideraciones de performance para cámara:**
- Resolución configurable (360p para preview rápido, 720p para export)
- `VideoTexture.needsUpdate = true` en cada frame del render loop

---

## 6. Export Manager

```js
// /src/core/ExportManager.js

class ExportManager {
  // Raster
  exportPNG(renderer, quality)     // canvas.toBlob("image/png")
  exportJPEG(renderer, quality)    // canvas.toBlob("image/jpeg", quality)

  // Vectorial (solo efectos con svgExportable: true)
  exportSVG(imageData, effect)     // convierte ImageData → SVG paths/circles

  // Datos / preset
  exportJSON(effectChain, params)  // estado completo de la sesión
  importJSON(json)                 // restaura estado

  // Stream (para integración VJ)
  getCanvasStream(fps = 30)        // canvas.captureStream(fps)
}
```

### Exportación SVG

Para **halftone**: cada punto es un `<circle>` SVG — 100% vectorial y editable en Illustrator/Figma.

Para **dither**: rectángulos o paths desde los píxeles activos del ImageData.

```js
// Pseudocódigo export SVG halftone
function halftoneToSVG(imageData, cellSize) {
  const circles = []
  // iterar grilla, calcular luminancia, generar <circle r={luminancia * cellSize/2}>
  return `<svg xmlns="...">${circles.join("")}</svg>`
}
```

### Export JSON (preset de sesión)

```json
{
  "version": "1.0",
  "timestamp": 1234567890,
  "effectChain": [
    {
      "id": "bayer-dither",
      "enabled": true,
      "params": { "threshold": 0.6, "matrixSize": 4, "palette": ["#1a1a2e", "#e94560"] }
    },
    {
      "id": "scanlines",
      "enabled": true,
      "params": { "intensity": 0.3, "spacing": 4 }
    }
  ]
}
```

---

## 7. Integración VJ (Feature Opcional)

### Arquitectura

```
Chrome (webapp)
    ↓  canvas.captureStream(30)  →  MediaStream en memoria
OBS Studio (externo, cero código)
    ↓  Window Capture / Browser Source
    ↓  Plugin NDI (oficial, gratuito)
Resolume / TouchDesigner / VDMX
    ↓  reciben feed NDI como cualquier fuente de video
```

### Lo que requiere la webapp (ya incluido en ExportManager)

```js
// Activar stream — el resto es infraestructura externa
const stream = canvas.captureStream(30) // 30fps
// El stream queda en memoria, OBS lo captura desde afuera
```

### Setup externo (documentar para el usuario VJ)

1. Instalar OBS Studio
2. Instalar plugin NDI para OBS (obs-ndi, gratuito)
3. En OBS: agregar fuente "Browser Source" o "Window Capture" apuntando a la webapp
4. Activar output NDI en OBS
5. En Resolume/TD: agregar fuente NDI

### Roadmap de integración (fases)

| Fase | Implementación | Requiere código |
|---|---|---|
| 1 | Export PNG manual → importar en TD | No |
| 2 | OBS captura ventana → NDI → Resolume | No (config externa) |
| 3 | WebSocket bridge: parámetros en vivo a TD | Sí (`/src/td/WebSocketBridge.js`) |
| 4 | OSC directo (librería osc.js) | Sí |

**La Fase 2 ya funciona sin código adicional.** Las fases 3 y 4 son mejoras futuras.

---

## 8. Performance

### Regla fundamental

```
Todo lo que sea fórmula matemática por píxel → GLSL (GPU)
Todo lo que requiera píxeles vecinos en secuencia → CPU (Canvas 2D)
```

### Anti-patterns a evitar

- **`gl.readPixels()` / `getImageData()` en el render loop** — frena todo. Solo usar para export, nunca en tiempo real.
- **Crear texturas o materiales dentro del loop** — crear una vez, reusar.
- **Múltiples canvas simultáneos** — un solo renderer Three.js, todo pasa por él.

### Estrategias de optimización

**Resolución dual**: procesar internamente a resolución reducida (512px), mostrar escalado. Para dither funciona perfecto (es pixelado de naturaleza).

**Throttle de frames CPU**: efectos como Floyd-Steinberg en CPU no necesitan correr a 60fps. Procesar cada 2-3 frames con un contador.

```js
let frameCount = 0
function renderLoop() {
  frameCount++
  // Efectos GPU: cada frame
  runGPUEffects()
  // Efectos CPU pesados: cada 3 frames
  if (frameCount % 3 === 0) runCPUEffects()
  requestAnimationFrame(renderLoop)
}
```

**Ping-pong buffers**: para encadenar efectos GPU, alternar entre dos `WebGLRenderTarget` en vez de crear nuevos.

**Dispose correctamente**: al cambiar de efecto, llamar `.dispose()` en texturas y materiales anteriores para liberar memoria GPU.

### Métricas de desarrollo

```js
// En main.jsx, solo en desarrollo
import Stats from "stats.js"
const stats = new Stats()
stats.showPanel(0) // 0: FPS, 1: ms/frame, 2: memoria
document.body.appendChild(stats.dom)

// Dentro del render loop:
stats.begin()
// ... render ...
stats.end()
```

Usar también el **Performance panel de Chrome DevTools** con GPU timeline activado para detectar cuellos de botella reales.

---

## 9. Roadmap de Desarrollo

### Sesión 1 — Setup + Input
- [ ] Init proyecto: `npm create vite@latest . -- --template react`
- [ ] Instalar dependencias: `three`, `vite-plugin-glsl`
- [ ] Configurar `vite.config.js` para importar `.glsl`
- [ ] `InputManager.js`: cámara funcionando como `VideoTexture` en Three.js
- [ ] Un `PlaneGeometry` fullscreen con la textura de cámara — sin efectos todavía
- [ ] Verificar que el render loop corre estable a 60fps (con stats.js)

### Sesión 2 — Primer efecto (Bayer Dither)
- [ ] Crear `common.vert.glsl` (vertex shader fullscreen quad, se reusa en todos los efectos)
- [ ] Crear `bayer.frag.glsl` con la matriz Bayer 4x4
- [ ] Definir módulo `bayer-dither.js` con la interfaz estándar
- [ ] Conectar uniforms del shader a variables JS (threshold, matrixSize)
- [ ] Paleta de dos colores custom como uniform

### Sesión 3 — UI dinámica
- [ ] `Controls.jsx`: leer `params` del efecto activo y renderizar sliders/selects/color pickers
- [ ] Conectar cambios de UI → uniforms del shader en tiempo real
- [ ] `EffectSelector.jsx`: dropdown o lista para cambiar de efecto
- [ ] Verificar que cambiar de efecto no rompe el pipeline (dispose + reinit)

### Sesión 4 — Pipeline encadenado
- [ ] `EffectPipeline.js` con ping-pong `WebGLRenderTarget`
- [ ] Segundo efecto: `scanlines` (simple, buen test del pipeline)
- [ ] UI para activar/desactivar y reordenar efectos en la cadena

### Sesión 5 — Input imagen + Export
- [ ] `InputManager`: soporte para imagen estática (file upload)
- [ ] Toggle cámara ↔ imagen en la UI
- [ ] `ExportManager`: PNG desde canvas
- [ ] Export JSON de preset de sesión

### Sesión 6 — Efectos CPU + SVG
- [ ] Floyd-Steinberg en Canvas 2D (con throttle)
- [ ] Export SVG para halftone
- [ ] Export SVG para dither (paths desde ImageData)

### Sesión 7 — Efectos adicionales
- [ ] Glitch chunks (GLSL)
- [ ] Halftone (GLSL)
- [ ] Risograph (GLSL + paleta)

### Sesión 8 — Polish y edge cases
- [ ] Manejo de orientación EXIF en imágenes
- [ ] Responsive: funcionar en mobile (touch events para sliders)
- [ ] Estados de carga y errores (cámara denegada, imagen inválida)
- [ ] Performance audit final

### Futuro (post-MVP)
- [ ] WebSocket bridge para TouchDesigner (parámetros en vivo)
- [ ] OSC con osc.js
- [ ] Soporte video como input
- [ ] Pixel sorting
- [ ] Datamoshing

---

## 10. Notas para el Asistente de Código

Al trabajar en este proyecto, tener en cuenta:

1. **No romper la interfaz de efectos** — todo efecto debe respetar el contrato de `params` para que la UI se genere automáticamente.

2. **Separar GPU de CPU** — los efectos GLSL viven en `/shaders`, los efectos CPU tienen su propio `processFn`. No mezclar.

3. **Dispose siempre** — al desactivar o reemplazar un efecto, liberar texturas y materiales de GPU.

4. **WebSocketBridge es opcional** — el core no debe tener ninguna dependencia de `/td/`. Es un módulo que se activa aparte.

5. **El export SVG es una transformación del ImageData final** — no es un render alternativo, es una post-procesamiento del canvas resultado.

6. **Resolución configurable desde el inicio** — `InputManager` debe exponer un método para cambiar resolución de procesamiento sin reiniciar todo.

7. **Un solo renderer Three.js** — instanciado en `App.jsx`, pasado por props o contexto. No crear renderers en componentes hijos.
