uniform sampler2D tDiffuse;
uniform vec2 uResolution;
uniform float uBrickSize;
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

void main() {
    vec4 texColor = texture2D(tDiffuse, vUv);
    float lum = getLuminance(texColor.rgb);

    vec2 uv = vUv;
    float c = cos(uAngle);
    float s = sin(uAngle);
    vec2 mid = vec2(0.5);
    vec2 rotated = vec2(
        (uv.x - mid.x) * c - (uv.y - mid.y) * s,
        (uv.x - mid.x) * s + (uv.y - mid.y) * c
    ) + mid;

    // ── Temporal: brick pattern shift ──
    float timeShift = uTime * uSpeed * 0.08;

    float brickW = max(uBrickSize, 2.0) / uResolution.x;
    float brickH = brickW * 0.5;

    // Determine brick row with half-offset for alternating rows
    float row = floor((rotated.y + timeShift * brickH * 2.0) / brickH);
    rotated.x += timeShift * brickW * 0.3;
    float rowOffset = mod(row, 2.0) * (brickW * 0.5);
    float bx = fract((rotated.x + rowOffset) / brickW);
    float by = fract(rotated.y / brickH);

    // Distance to brick edge
    float mx = min(bx, 1.0 - bx);
    float my = min(by, 1.0 - by);
    float brickEdge = min(mx, my);

    // Map luminance to brick pattern: darker = thicker mortar
    float threshold = lum;
    float mortar = smoothstep(threshold - uContrast * 0.15, threshold + uContrast * 0.15, brickEdge * 4.0);

    int paletteSize = uPaletteSize;
    float palLum = mortar;
    int idx = int(floor(palLum * float(paletteSize - 1) + 0.5));
    idx = clamp(idx, 0, paletteSize - 1);
    vec3 finalColor = getPaletteColor(idx);

    gl_FragColor = vec4(finalColor, 1.0);
}
