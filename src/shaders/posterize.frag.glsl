// Posterize — quantized luminance with per-channel or palette mapping
// ORIGINAL: per-channel RGB quantization preserves source colors
// PALETTE:  quantized luminance mapped through full palette (like Bayer/Halftone)

uniform sampler2D tDiffuse;
uniform float uSteps;
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
    const vec3 W = vec3(0.2125, 0.7154, 0.0721);
    return dot(color, W);
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
    float luma = getLuminance(texColor.rgb);

    vec3 finalColor;

    if (uUseOriginalColors > 0.5) {
        // ── ORIGINAL: per-channel posterization ──
        // Quantize each RGB channel independently to preserve source colors
        float steps = max(uSteps, 2.0);
        vec3 quantized = floor(texColor.rgb * steps) / steps;
        finalColor = quantized;
    } else {
        // ── PALETTE: posterized luminance mapped through palette ──
        float steps = max(uSteps, 2.0);
        float qLuma = floor(luma * steps) / steps;

        int pSize = uPaletteSize;
        int idx = clamp(int(floor(qLuma * float(pSize - 1) + 0.5)), 0, pSize - 1);
        finalColor = getPaletteColor(idx);
    }

    gl_FragColor = vec4(finalColor, 1.0);
}
