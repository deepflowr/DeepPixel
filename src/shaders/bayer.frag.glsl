// Bayer Ordered Dither
// Inspired by https://www.shadertoy.com/view/lllSRj
//
// Core idea (110 chars):
//   o = step(texture(iChannel0, i/8.).r, texture(iChannel1,i/iResolution.xy));
//
// The Bayer 8×8 texture tiles every 8 pixels (i/8.).
// uPixelSize scales the tile: pixelSize=1 → tiles every 8px (original),
// pixelSize=2 → tiles every 16px (each bayer cell covers 2×2 pixels), etc.
//
// uUseOriginalColors = 1.0 → per-channel Bayer dither using source colors (like Shadertoy color version)
// uUseOriginalColors = 0.0 → per-channel Bayer dither mapped through palette colors

uniform sampler2D tDiffuse;
uniform vec2 uResolution;
uniform float uPixelSize;
uniform float uGamma;
uniform float uContrast;
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

// ── Bayer 8×8 matrix ──────────────────────────────────

float getBayer4(int x, int y) {
    int idx = (x % 4) + (y % 4) * 4;
    if (idx == 0) return 0.0;  if (idx == 1) return 8.0;  if (idx == 2) return 2.0;  if (idx == 3) return 10.0;
    if (idx == 4) return 12.0; if (idx == 5) return 4.0;  if (idx == 6) return 14.0; if (idx == 7) return 6.0;
    if (idx == 8) return 3.0;  if (idx == 9) return 11.0; if (idx == 10) return 1.0; if (idx == 11) return 9.0;
    if (idx == 12) return 15.0;if (idx == 13) return 7.0; if (idx == 14) return 13.0;
    return 5.0;
}

float getBayer2(int x, int y) {
    int idx = (x % 2) + (y % 2) * 2;
    if (idx == 0) return 0.0;
    if (idx == 1) return 2.0;
    if (idx == 2) return 3.0;
    return 1.0;
}

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

// ── Main ─────────────────────────────────────────────

void main() {
    vec2 fragCoord = gl_FragCoord.xy;

    // ── Sample input at normalized UV ──
    vec4 texColor = texture2D(tDiffuse, vUv);

    // ── Bayer threshold (like Shadertoy's i/8., but with scale) ──
    // i/8. in the Shadertoy maps pixel coords to bayer UVs, tiling every 8px.
    // We do: mod(x, tileWidth) / pixelSize to get the bayer cell index (0-7)
    float scale = max(uPixelSize, 1.0);
    float tileW = scale * 8.0;
    int px = int(mod(fragCoord.x, tileW) / scale);
    int py = int(mod(fragCoord.y, tileW) / scale);
    px = clamp(px, 0, 7);
    py = clamp(py, 0, 7);
    float bayerVal = getBayer8(px, py) / 64.0;

    // ── Optional gamma correction ──
    vec4 col = texColor;
    if (uGamma > 0.0) {
        float g = 1.0 / (1.0 + uGamma * 0.55);
        col = pow(max(col, vec4(0.001)), vec4(g));
    }

    // ── Optional contrast boost ──
    vec4 adjusted = (col - 0.5) * (1.0 + uContrast * 2.0) + 0.5;
    adjusted = clamp(adjusted, 0.0, 1.0);

    // ── Per-channel step comparison (110 chars magic ✨) ──
    vec4 dithered = vec4(
        step(bayerVal, adjusted.r),
        step(bayerVal, adjusted.g),
        step(bayerVal, adjusted.b),
        1.0
    );

    // ── Output ──
    vec3 finalColor;
    if (uUseOriginalColors > 0.5) {
        // Original colors: use the per-channel dither result directly (0/1 per RGB)
        // This is exactly what the Shadertoy does — 8 colors from source
        finalColor = dithered.rgb;
    } else {
        // Palette mode: map dithered luminance through the user's palette
        float lum = dot(dithered.rgb, vec3(0.299, 0.587, 0.114));
        int pSize = uPaletteSize;
        float scaled = lum * float(pSize - 1);
        int idx = int(floor(scaled + 0.5));
        idx = clamp(idx, 0, pSize - 1);
        finalColor = getPaletteColor(idx);
    }

    gl_FragColor = vec4(finalColor, 1.0);
}
