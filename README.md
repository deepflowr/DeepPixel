<div align="center">

# ▦ DeepPixel

**Procesamiento de imagen retro-analógico en tiempo real · Real-time retro-analog image processing**

<sub>WebGL · GLSL · Three.js · React · Vite</sub>

<br>

[![License: MIT](https://img.shields.io/badge/License-MIT-orange.svg)](LICENSE)
![WebGL2](https://img.shields.io/badge/WebGL2-supported-brightgreen)
![React](https://img.shields.io/badge/React-19-61dafb)

<br>

<img src="docs/preview.gif" alt="DeepPixel demo" width="720"/>

</div>

---

# 🇦🇷 DeepPixel

Aplicación web de procesamiento de imagen en tiempo real con estética retro-analógica. Aplica efectos de **dithering**, **glitch**, **halftone**, **risograph**, **scanlines**, **posterización** y más sobre imágenes, video o cámara en vivo — todo en el navegador con aceleración GPU via WebGL2.

Diseñada tanto para exploración creativa individual como para **performance VJ en vivo** con integración a OBS, Resolume y TouchDesigner.

---

## ✨ Efectos incluidos

| Efecto | Descripción | GPU/CPU | SVG |
|---|---|---|---|
| **Dither Bayer** | Matriz Bayer 2×2, 4×4 u 8×8 con paleta | GPU | ✓ |
| **Floyd-Steinberg** | Difusión de error con patrón de serpentina | CPU | ✓ |
| **Atkinson Dither** | Dither de Atkinson (Apple Macintosh) | CPU | ✓ |
| **Stucki** | Dither de Stucki (difusión de error) | CPU | ✓ |
| **Jarvis** | Dither de Jarvis-Judice-Ninke | CPU | ✓ |
| **Halftone** | Círculos proporcionales a luminancia | GPU | ✓ |
| **CMYK Halftone** | Separación en 4 canales de color | GPU | ✓ |
| **Clustered Dot** | Punto agrupado clásico de imprenta | GPU | ✓ |
| **Brick Dither** | Dither con patrón de ladrillos | GPU | ✓ |
| **Crosshatch** | Tramado cruzado | GPU | ✓ |
| **Risograph** | Paleta reducida con offset de color | GPU | ✓ |
| **Glitch** | Desplazamiento de bloques, RGB shift, scanlines | GPU | ✗ |
| **Scanlines** | Líneas de barrido horizontales | GPU | ✓ |
| **Posterize** | Reducción de niveles de color | GPU | ✓ |
| **Caleidoscopio** | Simetría radial segmentada | GPU | ✓ |
| **Feedback** | Feedback de video feedback con decay | GPU | ✗ |

---

## 🚀 Quick start

```bash
# 1. Clonar
git clone https://github.com/deepflowr/deeppixel.git
cd deeppixel

# 2. Instalar dependencias
npm install

# 3. Iniciar en desarrollo
npm run dev

# 4. Abrir en el navegador
# → http://localhost:5173
```

### Build para producción

```bash
npm run build     # → dist/
npm run preview   # previsualizar build
```

---

## 🎮 Cómo usar

### Fuentes de entrada

DeepPixel acepta tres tipos de fuente:

- **🖼️ Subir archivo**: imagen (PNG, JPG) o video (MP4, WebM)
- **📷 Cámara web**: captura en vivo desde tu cámara
- **▦ Generadores procedurales**: barras de prueba, textura CRT, patrón moiré

### Cadena de efectos

Los efectos se apilan en una **cadena de procesamiento**. Cada efecto se puede activar/desactivar individualmente, expandir para ajustar sus parámetros, y reordenar arrastrando. La paleta de colores se puede configurar por efecto o globalmente.

### Exportar

- **⬇ PNG**: captura del canvas actual
- **⬇ SVG**: exportación vectorial (efectos soportados)
- **☰ Preset**: guardar/cargar configuración como JSON

### Ventana de output

El botón **◇ OUTPUT** abre una ventana separada con **solo el canvas** (sin interfaz), ideal para capturar con OBS. Hacé doble click para pantalla completa.

### Output directo en OBS

También podés abrir directamente en OBS como **Browser Source**:

```
URL: http://localhost:5173/?output
```

Este modo muestra **solo el canvas**, sin header, sidebar ni overlays.

---

## 🎛️ Integración VJ

DeepPixel está diseñada para integrarse fácilmente con software de VJ:

### OBS Studio (gratis)

1. Abrí la ventana **OUTPUT** en DeepPixel (◇ OUTPUT)
2. Hacé **doble click** para pantalla completa
3. En OBS, agregá **Captura de Ventana** → seleccioná la ventana de DeepPixel
4. **O mejor**: usá **Browser Source** → `http://localhost:5173/?output`

### Resolume Arena

1. Capturá DeepPixel en OBS (ver arriba)
2. Activá **OBS Virtual Camera** (Herramientas → VirtualCam)
3. En Resolume: **Input → OBS Virtual Camera**

### Spout2 (Windows, baja latencia)

1. Instalá [Spout2](https://spout.zeal.co/) y [obs-spout2-outputs](https://github.com/Off-World-Live/obs-spout2-outputs)
2. En OBS: **Herramientas → Spout2 Output** → Start (con DeepPixel capturado)
3. En Resolume: **Input → Spout → DeepPixel**

---

## 🏗️ Arquitectura

```
                    ┌──────────────┐
                    │  InputManager│
                    │ (cam/imagen/ │
                    │  video/proc) │
                    └──────┬───────┘
                           ↓ THREE.Texture
                    ┌──────────────┐
                    │EffectPipeline│
                    │ (ping-pong   │
                    │  RT, encaden.│
                    │  GPU + CPU)  │
                    └──────┬───────┘
                           ↓ WebGL canvas
                    ┌──────────────┐
                    │   Preview    │
                    │  (Three.js)  │
                    └──────┬───────┘
                    ┌──────────────┐
                    │ExportManager │
                    │  PNG/SVG/    │
                    │  JSON/popup  │
                    └──────────────┘
```

### Stack

| Capa | Tecnología |
|---|---|
| UI | React 19 + CSS (brutalist dark) |
| Renderizado | Three.js (WebGL2) |
| Shaders | GLSL (fragment shaders) |
| Efectos CPU | Canvas 2D API |
| Build | Vite 8 |

---

## 📁 Estructura del proyecto

```
src/
  core/           # Motor: pipeline, input, export, procedural
  effects/        # Módulos de efecto (16 efectos)
  shaders/        # Fragment shaders GLSL (12 shaders)
  ui/             # Componentes React (Preview, EffectSelector, etc.)
  App.jsx         # Componente principal
  main.jsx        # Entry point
```

---

## 🧑‍💻 Desarrollo

```bash
# Linter
npm run lint
```

### Agregar un efecto nuevo

1. Crear el shader GLSL en `src/shaders/`
2. Crear el módulo JS en `src/effects/` con la interfaz estándar (id, label, params, fragmentShader, etc.)
3. Importarlo y agregarlo al array `AVAILABLE_EFFECTS` en `src/effects/index.js`
4. La UI se genera automáticamente desde la definición de `params`

---

## 📄 Licencia

MIT — hacé lo que quieras con esto.

---

<br>

---

# 🇬🇧 DeepPixel

Real-time retro-analog image processing webapp. Apply **dithering**, **glitch**, **halftone**, **risograph**, **scanlines**, **posterization**, and more effects on images, video, or live camera — all in the browser with GPU acceleration via WebGL2.

Designed for both individual creative exploration and **live VJ performance** with OBS, Resolume, and TouchDesigner integration.

---

## ✨ Features

| Effect | Description | GPU/CPU | SVG |
|---|---|---|---|
| **Bayer Dither** | Bayer matrix 2×2, 4×4 or 8×8 with palette | GPU | ✓ |
| **Floyd-Steinberg** | Error diffusion dithering (serpentine) | CPU | ✓ |
| **Atkinson Dither** | Atkinson dither (Apple Macintosh style) | CPU | ✓ |
| **Stucki** | Stucki error diffusion | CPU | ✓ |
| **Jarvis** | Jarvis-Judice-Ninke dithering | CPU | ✓ |
| **Halftone** | Luminance-proportional circles | GPU | ✓ |
| **CMYK Halftone** | 4-channel color separation | GPU | ✓ |
| **Clustered Dot** | Classic clustered-dot halftone | GPU | ✓ |
| **Brick Dither** | Brick-pattern dither | GPU | ✓ |
| **Crosshatch** | Cross-hatch shading | GPU | ✓ |
| **Risograph** | Limited palette with color offset | GPU | ✓ |
| **Glitch** | Block displacement, RGB shift, scanlines | GPU | ✗ |
| **Scanlines** | Horizontal scan lines | GPU | ✓ |
| **Posterize** | Color level reduction | GPU | ✓ |
| **Kaleidoscope** | Radial symmetry segments | GPU | ✓ |
| **Feedback** | Video feedback loop with decay | GPU | ✗ |

---

## 🚀 Quick Start

```bash
git clone https://github.com/deepflowr/deeppixel.git
cd deeppixel
npm install
npm run dev
# → http://localhost:5173
```

---

## 🎮 Usage

### Input sources

- **Upload**: image (PNG, JPG) or video (MP4, WebM)
- **Webcam**: live camera capture
- **Procedural**: test patterns, CRT texture, moiré

### Effects chain

Stack effects in a processing chain. Each effect can be toggled on/off, expanded for parameter tweaking, or reordered. Color palettes are per-effect or global.

### Export

- **PNG**: raster canvas capture
- **SVG**: vector export (supported effects)
- **Presets**: save/load JSON configurations

### Output window

Click **◇ OUTPUT** to open a clean separate window with **only the canvas**. Double-click for fullscreen. Perfect for OBS window capture.

### OBS Browser Source

```
URL: http://localhost:5173/?output
```

Renders only the canvas — no header, sidebar, or overlays.

---

## 🎛️ VJ Integration

### OBS Studio (free)

1. Open **OUTPUT** window (◇ OUTPUT) and double-click for fullscreen
2. In OBS: **Window Capture** → select DeepPixel window
3. **Better**: use **Browser Source** → `http://localhost:5173/?output`

### Resolume Arena

1. Capture DeepPixel in OBS (see above)
2. Enable **OBS Virtual Camera** (Tools → VirtualCam)
3. In Resolume: **Input → OBS Virtual Camera**

### Spout2 (Windows, low latency)

1. Install [Spout2](https://spout.zeal.co/) and [obs-spout2-outputs](https://github.com/Off-World-Live/obs-spout2-outputs)
2. In OBS: **Tools → Spout2 Output → Start** (with DeepPixel captured)
3. In Resolume: **Input → Spout → DeepPixel**

---

## 🏗️ Architecture

| Layer | Technology |
|---|---|
| UI | React 19 + CSS (brutalist dark) |
| Rendering | Three.js (WebGL2) |
| Shaders | GLSL fragment shaders |
| CPU effects | Canvas 2D API |
| Build | Vite 8 |

```
src/
  core/     # Engine: pipeline, input, export, procedural
  effects/  # Effect modules (16 effects)
  shaders/  # GLSL fragment shaders (12 shaders)
  ui/       # React components (Preview, EffectSelector, etc.)
  App.jsx   # Main app component
  main.jsx  # Entry point
```

---

## 📄 License

MIT — do whatever you want with this.
