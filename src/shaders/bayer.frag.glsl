uniform sampler2D tDiffuse;
uniform float uThreshold;
uniform int uMatrixSize;
uniform float uPixelSize;
uniform vec2 uResolution;
uniform float uTime;
uniform float uSpeed;
uniform int uPaletteSize;
uniform vec3 uColor0;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform vec3 uColor4;
uniform vec3 uColor5;
uniform vec3 uColor6;
uniform vec3 uColor7;

varying vec2 vUv;

float getLuminance(vec3 color) {
    return dot(color, vec3(0.299, 0.587, 0.114));
}

vec3 getPaletteColor(int idx) {
    if (idx == 0) return uColor0;
    if (idx == 1) return uColor1;
    if (idx == 2) return uColor2;
    if (idx == 3) return uColor3;
    if (idx == 4) return uColor4;
    if (idx == 5) return uColor5;
    if (idx == 6) return uColor6;
    return uColor7;
}

// Bayer 2x2 matrix values
float getBayer2(int x, int y) {
    int idx = (x % 2) + (y % 2) * 2;
    if (idx == 0) return 0.0;
    if (idx == 1) return 2.0;
    if (idx == 2) return 3.0;
    return 1.0;
}

// Bayer 4x4 matrix values
float getBayer4(int x, int y) {
    int idx = (x % 4) + (y % 4) * 4;
    if (idx == 0) return 0.0;  if (idx == 1) return 8.0;  if (idx == 2) return 2.0;  if (idx == 3) return 10.0;
    if (idx == 4) return 12.0; if (idx == 5) return 4.0;  if (idx == 6) return 14.0; if (idx == 7) return 6.0;
    if (idx == 8) return 3.0;  if (idx == 9) return 11.0; if (idx == 10) return 1.0; if (idx == 11) return 9.0;
    if (idx == 12) return 15.0;if (idx == 13) return 7.0; if (idx == 14) return 13.0;
    return 5.0;
}

// Bayer 8x8 matrix values
float getBayer8(int x, int y) {
    int px = x % 8;
    int py = y % 8;
    int qx = px / 4;
    int qy = py / 4;
    int rx = px % 4;
    int ry = py % 4;
    
    float subVal = getBayer4(rx, ry);
    float quadVal = getBayer2(qx, qy);
    
    return subVal * 4.0 + quadVal;
}

void main() {
    vec2 uv = vUv;
    if (uPixelSize > 1.0) {
        vec2 size = uResolution / uPixelSize;
        uv = (floor(vUv * size) + 0.5) / size;
    }
    
    vec4 texColor = texture2D(tDiffuse, uv);
    float lum = getLuminance(texColor.rgb);
    
    vec2 fragCoord = gl_FragCoord.xy;
    if (uPixelSize > 1.0) {
        fragCoord = floor(gl_FragCoord.xy / uPixelSize) * uPixelSize;
    }
    
    // ── Temporal: grid drift over time ──
    float timeOffset = uTime * uSpeed * 30.0;
    int px = int((fragCoord.x + timeOffset) / max(1.0, uPixelSize));
    int py = int((fragCoord.y + timeOffset * 0.7) / max(1.0, uPixelSize));
    
    float matrixValue = 0.0;
    float maxVal = 1.0;
    
    if (uMatrixSize == 2) {
        matrixValue = getBayer2(px, py);
        maxVal = 4.0;
    } else if (uMatrixSize == 8) {
        matrixValue = getBayer8(px, py);
        maxVal = 64.0;
    } else {
        matrixValue = getBayer4(px, py);
        maxVal = 16.0;
    }
    
    // ── Multi-level quantization with Bayer dither ──
    int paletteSize = uPaletteSize;
    float numLevels = float(paletteSize - 1);
    
    // Map luminance to continuous position in palette
    float ditherValue = (matrixValue + 0.5) / maxVal;
    float contrastLum = clamp((lum - 0.5) * (1.0 + uThreshold) + 0.5, 0.0, 1.0);
    float scaled = contrastLum * numLevels;
    
    // Use dither to decide whether to round up or down
    float baseLevel = floor(scaled);
    float fracLevel = fract(scaled);
    int level = int(baseLevel);
    if (fracLevel > ditherValue) {
        level = level + 1;
    }
    level = clamp(level, 0, paletteSize - 1);
    
    vec3 finalColor = getPaletteColor(level);
    gl_FragColor = vec4(finalColor, 1.0);
}
