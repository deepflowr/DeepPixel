// Feedback — XOR feedback effect
// Inspired by Shadertoy: XORs adjacent pixels from the input,
// then blends with the previous frame (tFeedback) for temporal feedback trails.
//
// ORIGINAL: XOR feedback with source colors
// PALETTE:  XOR feedback luminance mapped through palette

uniform sampler2D tDiffuse;
uniform sampler2D tFeedback;
uniform vec2 uResolution;
uniform float uFeedback;
uniform float uDecay;
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

float getLuminance(vec3 color) {
    return dot(color, vec3(0.299, 0.587, 0.114));
}

void main() {
    vec2 uv = vUv;

    // Flip X for mirror effect (like a webcam mirror)
    vec2 uv_cam = vec2(1.0 - uv.x, uv.y);

    // Sample current pixel and pixel below from input
    vec3 col1 = texture2D(tDiffuse, uv_cam).rgb;
    vec3 col2 = texture2D(tDiffuse, uv_cam + vec2(0.0, 1.0) / uResolution).rgb;

    vec3 col;
    int pSize = uPaletteSize;

    if (uUseOriginalColors > 0.5) {
        // ── ORIGINAL: XOR raw input colors ──
        ivec3 icol1 = ivec3(col1 * 255.0);
        ivec3 icol2 = ivec3(col2 * 255.0);
        ivec3 icol = ivec3(icol1.r ^ icol2.r, icol1.g ^ icol2.g, icol1.b ^ icol2.b);
        col = vec3(icol) / 255.0;
    } else {
        // ── PALETTE: map input colors to palette BEFORE XOR ──
        // This keeps the feedback loop consistent — no recursive palette remapping.
        float lum1 = getLuminance(col1);
        int idx1 = clamp(int(floor(lum1 * float(pSize - 1) + 0.5)), 0, pSize - 1);
        vec3 pal1 = getPaletteColor(idx1);

        float lum2 = getLuminance(col2);
        int idx2 = clamp(int(floor(lum2 * float(pSize - 1) + 0.5)), 0, pSize - 1);
        vec3 pal2 = getPaletteColor(idx2);

        // XOR the palette colors directly
        ivec3 icol1 = ivec3(pal1 * 255.0);
        ivec3 icol2 = ivec3(pal2 * 255.0);
        ivec3 icol = ivec3(icol1.r ^ icol2.r, icol1.g ^ icol2.g, icol1.b ^ icol2.b);
        col = vec3(icol) / 255.0;
    }

    // Feedback from previous frame (tFeedback)
    // In PALETTE mode, tFeedback already contains palette-color-space output → consistent loop.
    vec3 bb_col = texture2D(tFeedback, uv - vec2(0.0, 2.0) / uResolution).rgb;

    // Blend feedback into current frame
    col = max(col, uFeedback * pow(bb_col * uDecay, vec3(1.0 / 0.9)));

    // No final palette mapping — already done before XOR (PALETTE) or not needed (ORIGINAL)
    gl_FragColor = vec4(col, 1.0);
}
