// ASCII Art — character-based halftone
// Renders source image using ASCII character bitmaps (5x5 grid per block).
// ORIGINAL: source colors masked by character
// PALETTE:  palette colors masked by character

uniform sampler2D tDiffuse;
uniform vec2 uResolution;
uniform float uBlockSize;
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

float character(int n, vec2 p) {
    p = floor(p * vec2(-4.0, 4.0) + 2.5);
    if (clamp(p.x, 0.0, 4.0) == p.x) {
        if (clamp(p.y, 0.0, 4.0) == p.y) {
            int a = int(round(p.x) + 5.0 * round(p.y));
            if (((n >> a) & 1) == 1) return 1.0;
        }
    }
    return 0.0;
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

float getLuminance(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
}

void main() {
    float bSize = max(uBlockSize, 4.0);
    vec2 pix = vUv * uResolution;

    // Sample source at block level
    vec3 srcCol = texture2D(tDiffuse, floor(pix / bSize) * bSize / uResolution).rgb;

    // Luminance → character selection
    float gray = getLuminance(srcCol);
    int n = 4096;
    if (gray > 0.2) n = 65600;
    if (gray > 0.3) n = 163153;
    if (gray > 0.4) n = 15255086;
    if (gray > 0.5) n = 13121101;
    if (gray > 0.6) n = 15252014;
    if (gray > 0.7) n = 13195790;
    if (gray > 0.8) n = 11512810;

    // Character sub-grid position (centered 5x5 within block)
    vec2 p = mod(pix / (bSize * 0.5), 2.0) - vec2(1.0);
    float ch = character(n, p);

    vec3 finalColor;
    if (uUseOriginalColors > 0.5) {
        // ORIGINAL: source colors masked by character
        finalColor = srcCol * ch;
    } else {
        // PALETTE: palette color masked by character
        float lum = getLuminance(srcCol);
        int pSize = uPaletteSize;
        int idx = clamp(int(floor(lum * float(pSize - 1) + 0.5)), 0, pSize - 1);
        finalColor = getPaletteColor(idx) * ch;
    }

    gl_FragColor = vec4(finalColor, 1.0);
}
