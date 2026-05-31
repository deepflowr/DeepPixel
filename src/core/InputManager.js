import * as THREE from 'three';

/**
 * Lightweight EXIF orientation parser.
 * Extracts only the Orientation tag (0x0112) from JPEG files.
 * No external dependencies needed.
 */
function parseEXIFOrientation(file) {
  return new Promise((resolve) => {
    // Only JPEG files contain EXIF data
    if (!file || !file.type || !file.type.startsWith('image/jpeg')) {
      resolve(1); // Normal orientation
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const view = new DataView(e.target.result);
      resolve(parseOrientationFromDataView(view));
    };
    reader.onerror = () => resolve(1);
    // Only read enough for EXIF headers — typically < 64KB
    reader.readAsArrayBuffer(file.slice(0, 65536));
  });
}

function parseOrientationFromDataView(view) {
  try {
    // Check JPEG SOI marker (0xFFD8)
    if (view.getUint16(0, false) !== 0xFFD8) return 1;

    let offset = 2;
    const length = view.byteLength;

    while (offset < length - 1) {
      // Find next marker (0xFF##)
      if (view.getUint8(offset) !== 0xFF) {
        offset++;
        continue;
      }

      const marker = view.getUint8(offset + 1);

      // SOS (Start of Scan) — no more metadata after this
      if (marker === 0xDA) break;

      // APP1 marker (0xFFE1) — where EXIF lives
      if (marker === 0xE1 && offset + 4 < length) {
        const segSize = view.getUint16(offset + 2, false);
        const exifOffset = offset + 4;

        // Check for "Exif\0\0" header
        if (
          exifOffset + 6 < length &&
          view.getUint32(exifOffset, false) === 0x45786966 && // "Exif"
          view.getUint16(exifOffset + 4, false) === 0x0000
        ) {
          return readOrientationFromTIFF(view, exifOffset + 6);
        }
        offset += segSize + 2;
      } else if (marker === 0xE1) {
        offset += 2;
      } else {
        if (offset + 2 < length) {
          const segSize = view.getUint16(offset + 2, false);
          offset += segSize + 2;
        } else {
          offset += 2;
        }
      }
    }
  } catch (e) {
    // Silently fail — orientation is non-critical
  }
  return 1;
}

function readOrientationFromTIFF(view, offset) {
  if (offset + 8 > view.byteLength) return 1;

  // TIFF header: byte order marker
  const littleEndian = view.getUint16(offset, false) === 0x4949; // "II"
  const tiffOffset = offset + 2;

  // Check magic number 0x002A
  if (view.getUint16(tiffOffset, littleEndian) !== 0x002A) return 1;

  // Offset to first IFD
  const ifdOffset = offset + view.getUint32(tiffOffset + 4, littleEndian);
  if (ifdOffset + 2 > view.byteLength) return 1;

  // Number of directory entries
  const entryCount = view.getUint16(ifdOffset, littleEndian);

  for (let i = 0; i < entryCount; i++) {
    const entryPos = ifdOffset + 2 + i * 12;
    if (entryPos + 12 > view.byteLength) break;

    const tag = view.getUint16(entryPos, littleEndian);

    // Tag 0x0112 = Orientation
    if (tag === 0x0112) {
      const format = view.getUint16(entryPos + 2, littleEndian);
      const valueOffset = entryPos + 8;

      if (format === 3) {
        // SHORT format — value is stored inline
        return view.getUint16(valueOffset, littleEndian);
      } else if (format === 4) {
        // LONG format
        return view.getUint32(valueOffset, littleEndian);
      }
      return 1;
    }
  }

  return 1;
}

/**
 * Apply EXIF orientation transformation using a canvas.
 * This "bakes" the rotation into the pixel data so Three.js
 * receives the correctly-oriented image.
 */
function applyEXIFOrientation(img, orientation) {
  if (orientation === 1) return img; // Normal — no transform needed

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;

  // Set canvas dimensions based on required rotation
  const needsSwap = orientation >= 5 && orientation <= 8;

  canvas.width = needsSwap ? h : w;
  canvas.height = needsSwap ? w : h;

  // Apply transformation
  switch (orientation) {
    case 2: // Mirror horizontal
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      break;
    case 3: // Rotate 180
      ctx.translate(canvas.width, canvas.height);
      ctx.rotate(Math.PI);
      break;
    case 4: // Mirror vertical
      ctx.translate(0, canvas.height);
      ctx.scale(1, -1);
      break;
    case 5: // Mirror horizontal + rotate 270 CW
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.rotate(Math.PI / 2);
      ctx.translate(0, -canvas.width);
      break;
    case 6: // Rotate 90 CW
      ctx.rotate(Math.PI / 2);
      ctx.translate(0, -canvas.height);
      break;
    case 7: // Mirror horizontal + rotate 90 CW
      ctx.scale(-1, 1);
      ctx.rotate(Math.PI / 2);
      ctx.translate(-canvas.width, -canvas.height);
      break;
    case 8: // Rotate 270 CW
      ctx.rotate(-Math.PI / 2);
      ctx.translate(-canvas.width, 0);
      break;
  }

  ctx.drawImage(img, 0, 0);
  return canvas;
}

class InputManager {
  constructor() {
    this.activeSource = 'procedural'; // 'camera' | 'image' | 'video' | 'procedural' | 'none'
    this.activeTexture = null;
    this.aspectRatio = 1.0;
    this.videoElement = null;
    this.videoStream = null;
    this.imageElement = null;
    this.proceduralSource = null;
    this.onTextureLoaded = null; // Callback: (texture, aspectRatio) => void
    this.onError = null;          // Callback: (message: string) => void

    // Create a hidden video element for webcam and video files
    this.initVideoElement();
  }

  initVideoElement() {
    if (this.videoElement) return;
    this.videoElement = document.createElement('video');
    this.videoElement.autoplay = true;
    this.videoElement.loop = true;
    this.videoElement.muted = true;
    this.videoElement.playsInline = true;
    this.videoElement.style.display = 'none';
    document.body.appendChild(this.videoElement);
  }

  // Set the webcam as input source
  async setCamera() {
    this.cleanupActiveSource();
    this.initVideoElement();
    this.activeSource = 'camera';

    try {
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const errMsg = 'Tu navegador no soporta acceso a cámara. Usa Chrome, Firefox o Edge actualizado.';
        if (this.onError) this.onError(errMsg);
        throw new Error(errMsg);
      }

      this.videoStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      
      this.videoElement.srcObject = this.videoStream;
      // Wait for video metadata to load to get dimensions
      await new Promise((resolve) => {
        this.videoElement.onloadedmetadata = () => {
          this.videoElement.play().then(resolve);
        };
      });

      this.aspectRatio = this.videoElement.videoWidth / this.videoElement.videoHeight;
      this.activeTexture = new THREE.VideoTexture(this.videoElement);
      this.activeTexture.minFilter = THREE.LinearFilter;
      this.activeTexture.magFilter = THREE.LinearFilter;

      if (this.onTextureLoaded) {
        this.onTextureLoaded(this.activeTexture, this.aspectRatio);
      }
      return this.activeTexture;
    } catch (error) {
      console.error('Error accessing webcam:', error);
      this.activeSource = 'none';

      let userMsg;
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        userMsg = 'Acceso a cámara denegado. Permite el acceso en la configuración de tu navegador.';
      } else if (error.name === 'NotFoundError') {
        userMsg = 'No se detectó ninguna cámara en tu dispositivo.';
      } else if (error.name === 'NotReadableError') {
        userMsg = 'La cámara está siendo usada por otra aplicación. Ciérrala e intenta de nuevo.';
      } else {
        userMsg = `Error al acceder a la cámara: ${error.message || 'Error desconocido'}`;
      }

      if (this.onError) this.onError(userMsg);
      throw error;
    }
  }

  // Set an image file or a public stock URL as input source
  async setImage(fileOrUrl) {
    this.cleanupActiveSource();
    this.activeSource = 'image';

    return new Promise((resolve, reject) => {
      this.imageElement = new Image();
      this.imageElement.crossOrigin = 'anonymous';

      this.imageElement.onload = async () => {
        try {
          // For local files, apply EXIF orientation correction
          if (fileOrUrl instanceof File) {
            const orientation = await parseEXIFOrientation(fileOrUrl);
            if (orientation !== 1) {
              // Apply canvas-based rotation and use as canvas texture
              const orientedCanvas = applyEXIFOrientation(this.imageElement, orientation);
              this.aspectRatio = orientedCanvas.width / orientedCanvas.height;
              this.activeTexture = new THREE.CanvasTexture(orientedCanvas);
            } else {
              this.aspectRatio = this.imageElement.width / this.imageElement.height;
              this.activeTexture = new THREE.Texture(this.imageElement);
            }
          } else {
            this.aspectRatio = this.imageElement.width / this.imageElement.height;
            this.activeTexture = new THREE.Texture(this.imageElement);
          }

          this.activeTexture.needsUpdate = true;
          this.activeTexture.minFilter = THREE.LinearFilter;
          this.activeTexture.magFilter = THREE.LinearFilter;

          if (this.onTextureLoaded) {
            this.onTextureLoaded(this.activeTexture, this.aspectRatio);
          }
          resolve(this.activeTexture);
        } catch (err) {
          console.error('Error processing image:', err);
          this.activeSource = 'none';
          if (this.onError) this.onError('Error al procesar la imagen.');
          reject(err);
        }
      };

      this.imageElement.onerror = () => {
        const errMsg = 'No se pudo cargar la imagen. El archivo podría estar corrupto o el formato no es compatible.';
        console.error('Error loading image source');
        this.activeSource = 'none';
        if (this.onError) this.onError(errMsg);
        reject(new Error(errMsg));
      };

      if (fileOrUrl instanceof File) {
        // Validate file type
        if (!fileOrUrl.type.startsWith('image/')) {
          const errMsg = 'Formato de imagen no soportado. Usa JPEG, PNG, WebP, etc.';
          if (this.onError) this.onError(errMsg);
          reject(new Error(errMsg));
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          this.imageElement.src = e.target.result;
        };
        reader.onerror = () => {
          const errMsg = 'Error al leer el archivo.';
          if (this.onError) this.onError(errMsg);
          reject(new Error(errMsg));
        };
        reader.readAsDataURL(fileOrUrl);
      } else if (typeof fileOrUrl === 'string') {
        this.imageElement.src = fileOrUrl;
      } else {
        const errMsg = 'Tipo de fuente de imagen inválido.';
        if (this.onError) this.onError(errMsg);
        reject(new Error(errMsg));
      }
    });
  }

  // Set a local video file as input source
  async setVideo(file) {
    this.cleanupActiveSource();
    this.initVideoElement();
    this.activeSource = 'video';

    try {
      // Validate
      if (!file.type.startsWith('video/')) {
        const errMsg = 'Formato de video no soportado.';
        if (this.onError) this.onError(errMsg);
        throw new Error(errMsg);
      }

      const fileURL = URL.createObjectURL(file);
      this.videoElement.src = fileURL;
      
      await new Promise((resolve, reject) => {
        this.videoElement.onloadedmetadata = () => {
          this.videoElement.play().then(resolve);
        };
        this.videoElement.onerror = () => {
          reject(new Error('Error al reproducir el archivo de video. Códec no soportado.'));
        };
      });

      this.aspectRatio = this.videoElement.videoWidth / this.videoElement.videoHeight;
      this.activeTexture = new THREE.VideoTexture(this.videoElement);
      this.activeTexture.minFilter = THREE.LinearFilter;
      this.activeTexture.magFilter = THREE.LinearFilter;

      if (this.onTextureLoaded) {
        this.onTextureLoaded(this.activeTexture, this.aspectRatio);
      }
      return this.activeTexture;
    } catch (error) {
      console.error('Error loading video file:', error);
      this.activeSource = 'none';
      const errMsg = error.message || 'Error al cargar el archivo de video.';
      if (this.onError) this.onError(errMsg);
      throw error;
    }
  }

  // Play/pause controls for video sources
  togglePlayback() {
    if (this.activeSource === 'camera') return false;
    if (this.videoElement && (this.activeSource === 'video')) {
      if (this.videoElement.paused) {
        this.videoElement.play();
        return true;
      } else {
        this.videoElement.pause();
        return false;
      }
    }
    return false;
  }

  isPlaying() {
    if (this.activeSource === 'camera') return true;
    if (this.videoElement && (this.activeSource === 'video')) {
      return !this.videoElement.paused;
    }
    return false;
  }

  // Update textures in each render frame if needed
  update() {
    if (this.activeSource === 'camera' || this.activeSource === 'video') {
      if (this.activeTexture) {
        this.activeTexture.needsUpdate = true;
      }
    }
    if (this.activeSource === 'procedural' && this.proceduralSource) {
      this.proceduralSource.update();
      if (this.activeTexture) {
        this.activeTexture.needsUpdate = true;
      }
    }
  }

  getTexture() {
    return this.activeTexture;
  }

  // Set a procedural animated source as input
  async setProceduralSource(proceduralSource, type) {
    this.cleanupActiveSource();
    this.activeSource = 'procedural';
    this.proceduralSource = proceduralSource;
    this.proceduralSource.setType(type);

    // Render first frame
    this.proceduralSource.update(0);

    this.aspectRatio = this.proceduralSource.canvas.width / this.proceduralSource.canvas.height;
    this.activeTexture = new THREE.CanvasTexture(this.proceduralSource.canvas);
    this.activeTexture.minFilter = THREE.LinearFilter;
    this.activeTexture.magFilter = THREE.LinearFilter;

    if (this.onTextureLoaded) {
      this.onTextureLoaded(this.activeTexture, this.aspectRatio);
    }
    return this.activeTexture;
  }

  cleanupActiveSource() {
    // Stop camera stream if running
    if (this.videoStream) {
      this.videoStream.getTracks().forEach((track) => track.stop());
      this.videoStream = null;
    }

    // Clear video element src and srcObject
    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.srcObject = null;
      try {
        if (this.videoElement.src && this.videoElement.src.startsWith('blob:')) {
          URL.revokeObjectURL(this.videoElement.src);
        }
      } catch (e) {
        // ignore
      }
      this.videoElement.src = '';
    }

    // Clean active textures
    if (this.activeTexture) {
      this.activeTexture.dispose();
      this.activeTexture = null;
    }

    this.imageElement = null;
    this.proceduralSource = null;
  }

  dispose() {
    this.cleanupActiveSource();
    if (this.videoElement) {
      document.body.removeChild(this.videoElement);
      this.videoElement = null;
    }
  }
}

export default InputManager;
