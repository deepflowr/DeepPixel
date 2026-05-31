uniform sampler2D tDiffuse;
uniform vec2 uResolution;
uniform float uDotSize;
uniform float uContrast;
uniform float uAngle;
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

// Clustered dot matrix 4x4
float clusteredDot4(vec2 pos) {
    int x = int(mod(pos.x, 4.0));
    int y = int(mod(pos.y, 4.0));
    int idx = x + y * 4;
    // Clustered dot threshold matrix: center grows first
    if (idx == 0) return 0.0;
    if (idx == 1) return 8.0;
    if (idx == 2) return 2.0;
    if (idx == 3) return 10.0;
    if (idx == 4) return 12.0;
    if (idx == 5) return 4.0;
    if (idx == 6) return 14.0;
    if (idx == 7) return 6.0;
    if (idx == 8) return 3.0;
    if (idx == 9) return 11.0;
    if (idx == 10) return 1.0;
    if (idx == 11) return 9.0;
    if (idx == 12) return 15.0;
    if (idx == 13) return 7.0;
    if (idx == 14) return 13.0;
    return 5.0;
}

void main() {
    vec4 texColor = texture2D(tDiffuse, vUv);
    float lum = getLuminance(texColor.rgb);

    vec2 uvCoord = vUv * uResolution;
    float cosA = cos(uAngle);
    float sinA = sin(uAngle);
    vec2 center = uResolution * 0.5;
    vec2 centered = uvCoord - center;
    vec2 rotated = vec2(
        centered.x * cosA - centered.y * sinA,
        centered.x * sinA + centered.y * cosA
    );

    // ── Temporal: grid drift ──
    float timeOff = uTime * uSpeed * 10.0;
    vec2 driftVec = vec2(timeOff, timeOff * 0.6);
    float gridSize = max(uDotSize, 2.0);
    vec2 cellCoord = floor((rotated + driftVec) / gridSize);
    vec2 cellPos = (rotated + driftVec) - cellCoord * gridSize;

    // ── Multi-level quantization with clustered dot dither ──
    int paletteSize = uPaletteSize;
    float numLevels = float(paletteSize - 1);
    
    float ditherValue = (clusteredDot4(cellPos) + 0.5) / 16.0;
    float contrastLum = clamp((lum - 0.5) * (1.0 + uContrast) + 0.5, 0.0, 1.0);
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
