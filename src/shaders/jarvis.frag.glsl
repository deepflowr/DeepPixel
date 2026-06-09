// ZX Spectrum — retro 8-bit block dither
// Inspired by ZX Spectrum attribute clash: analyzes 8x8 pixel blocks,
// finds min/max colors, and applies checkerboard dither.
//
// ORIGINAL: ZX Spectrum gray palette (full/half brightness)
// PALETTE:  ZX block analysis mapped through custom palette colors

uniform sampler2D tDiffuse;
uniform vec2 uResolution;
uniform float uPixelSize;
uniform float uDither;
uniform float uGamma;
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

vec4 bmap(vec3 c, float thr) {
    c = pow(c, vec3(uGamma));
    if (c.r > thr || c.g > thr || c.b > thr)
        return vec4(floor(c.rgb + vec3(0.5)), 1.0);
    else
        return vec4(min(floor(c.rgb / thr + vec3(0.5)), vec3(1.0)), 0.0);
}

vec3 fmap(vec4 c, float full, float hval) {
    return c.a >= 0.5 ? c.rgb * full : c.rgb * hval;
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
    float lowrez = max(uPixelSize, 2.0);
    float thr = 0.843;
    float dith = clamp(uDither, 0.0, 1.0);
    int pSize = uPaletteSize;

    vec2 fc = vUv * uResolution;
    vec2 pv = floor(fc / lowrez);
    vec2 bv = floor(pv / 8.0) * 8.0;
    vec2 sv = floor(uResolution / lowrez);

    vec4 min_cs = vec4(1.0), max_cs = vec4(0.0);
    float bright = 0.0;

    for (int py = 1; py < 8; py++) {
        for (int px = 0; px < 8; px++) {
            vec2 uv = clamp((bv + vec2(float(px), float(py))) / sv, 0.0, 1.0);
            vec3 src = texture2D(tDiffuse, uv).rgb;
            vec4 cs = bmap(src, thr);
            bright += cs.a;
            min_cs = min(min_cs, cs);
            max_cs = max(max_cs, cs);
        }
    }

    bright = (bright >= 24.0) ? 1.0 : 0.0;

    if (all(equal(max_cs.rgb, min_cs.rgb))) min_cs.rgb = vec3(0.0);
    if (all(equal(max_cs.rgb, vec3(0.0)))) {
        bright = 0.0;
        max_cs.rgb = vec3(0.0, 0.0, 1.0);
        min_cs.rgb = vec3(0.0);
    }

    vec3 zxC1 = fmap(vec4(max_cs.rgb, bright), 1.0, thr);
    vec3 zxC2 = fmap(vec4(min_cs.rgb, bright), 1.0, thr);

    vec3 cs = texture2D(tDiffuse, pv / sv).rgb;
    vec3 d = (cs + cs) - (zxC1 + zxC2);
    float dd = d.r + d.g + d.b;

    float parity = mod(pv.x + pv.y, 2.0);
    vec3 zxColor;
    if (parity == 1.0)
        zxColor = (dd >= -(dith * 0.5)) ? zxC1 : zxC2;
    else
        zxColor = (dd >= (dith * 0.5)) ? zxC1 : zxC2;

    vec3 finalColor;
    if (uUseOriginalColors > 0.5) {
        finalColor = zxColor;
    } else {
        float lum = getLuminance(zxColor);
        int idx = clamp(int(floor(lum * float(pSize - 1) + 0.5)), 0, pSize - 1);
        finalColor = getPaletteColor(idx);
    }

    gl_FragColor = vec4(finalColor, 1.0);
}
