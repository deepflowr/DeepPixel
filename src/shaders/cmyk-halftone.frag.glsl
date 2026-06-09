uniform sampler2D tDiffuse;
uniform vec2 uResolution;
uniform float uDotSize;
uniform float uContrast;
uniform float uAngleC;
uniform float uAngleM;
uniform float uAngleY;
uniform float uAngleK;
uniform float uTime;
uniform float uSpeed;
uniform float uUseOriginalColors;
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

// Single-channel halftone dot at a given angle.
// uv is expected in grid-space (1 unit = 1 halftone cell).
float halftoneDot(vec2 uv, float angle, float intensity) {
    float c = cos(angle);
    float s = sin(angle);
    vec2 rotUv = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c);
    vec2 cell = fract(rotUv) - 0.5;
    float radius = intensity * 0.6;
    float dist = length(cell);
    return 1.0 - smoothstep(radius - 0.1, radius + 0.1, dist);
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
    vec3 rgb = texColor.rgb;

    // ── Traditional CMYK separation (ink percentages 0..1) ──
    float c = 1.0 - rgb.r;
    float m = 1.0 - rgb.g;
    float y = 1.0 - rgb.b;

    // Extract black component
    float k = min(c, min(m, y));

    // Remove K from CMY (undercolor removal)
    c = (c - k) / (1.0 - k + 0.001);
    m = (m - k) / (1.0 - k + 0.001);
    y = (y - k) / (1.0 - k + 0.001);

    // ── Halftone screen frequency ──
    float freq = max(uDotSize, 2.0);

    // Normalize UV to use with screen frequency
    vec2 uv = vUv * uResolution / freq;

    // ── Temporal: each channel rotates at its own speed ──
    float t = uTime * uSpeed;
    float dotC = halftoneDot(uv, uAngleC + t * 0.15, c);
    float dotM = halftoneDot(uv, uAngleM + t * 0.20, m);
    float dotY = halftoneDot(uv, uAngleY + t * 0.10, y);
    float dotK = halftoneDot(uv, uAngleK + t * 0.25, k);

    // ── Subtractive color mixing ──
    // Start with white paper, each ink absorbs its complementary color
    vec3 paper = vec3(1.0);
    float rOut = paper.r, gOut = paper.g, bOut = paper.b;

    // Cyan absorbs red
    rOut *= (1.0 - dotC);
    // Magenta absorbs green
    gOut *= (1.0 - dotM);
    // Yellow absorbs blue
    bOut *= (1.0 - dotY);
    // Black absorbs everything
    float kAbsorb = 1.0 - dotK;
    rOut *= kAbsorb;
    gOut *= kAbsorb;
    bOut *= kAbsorb;

    vec3 cmykResult = vec3(rOut, gOut, bOut);

    // ── Apply contrast ──
    float contrast = 0.5 + uContrast * 0.5;
    float lum = dot(cmykResult, vec3(0.299, 0.587, 0.114));
    float contrasted = pow(lum, contrast);
    cmykResult = cmykResult * (contrasted / max(lum, 0.001));

    // ── Output based on mode ──
    vec3 finalColor;

    if (uUseOriginalColors > 0.5) {
        // ── ORIGINAL: real CMYK subtractive color — the halftone with actual inks ──
        finalColor = cmykResult;
    } else {
        // ── PALETTE: map CMYK luminance through palette colors ──
        int paletteSize = uPaletteSize;
        float palLum = getLuminance(cmykResult);
        int idx = int(floor(palLum * float(paletteSize - 1) + 0.5));
        idx = clamp(idx, 0, paletteSize - 1);
        finalColor = getPaletteColor(idx);
    }

    gl_FragColor = vec4(finalColor, 1.0);
}
