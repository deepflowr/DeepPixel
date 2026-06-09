// Glitch / VHS distortion
// Inspired by Shadertoy — horizontal block glitch, RGB separation, cell quantization,
// animated grain, vignette, and red center glow.
// Adapted to DeepPixel with ORIGINAL / PALETTE mode support.

uniform sampler2D tDiffuse;
uniform vec2 uResolution;
uniform float uTime;

uniform float uIntensity;
uniform float uCellSize;
uniform float uSpeed;
uniform float uRgbShift;
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

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float hash2(vec2 p) {
    return fract(sin(dot(p, vec2(269.5, 183.3))) * 43758.5453123);
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

float getLuminance(vec3 color) {
    return dot(color, vec3(0.299, 0.587, 0.114));
}

void main() {
    vec2 uv = vUv;
    float t = uTime * uSpeed;

    // ── Glitch amplitude (noise-driven, replaces Shadertoy's audio input) ──
    float amp = hash(vec2(floor(t), 0.0)) * uIntensity;

    // ── Normalized coords (-1 to 1) ──
    vec2 fragCoord = uv * uResolution;
    vec2 V = 1.0 - 2.0 * fragCoord / uResolution;

    // ── Horizontal glitch offset ──
    // The offset is modulated by a vertical cosine wave so different rows
    // shift at different phases, creating a tearing / VHS feel.
    float offX = smoothstep(
        0.0,
        amp * uCellSize * 0.5,
        cos(t + uv.y * 5.0)
    ) - 0.5;

    vec2 off = vec2(offX, 0.0);

    // ── RGB channel separation at different offset depths ──
    float rShift = uRgbShift * 0.04;
    float gShift = uRgbShift * 0.05;
    float bShift = uRgbShift * 0.06;

    float r = texture2D(tDiffuse, uv + off * rShift * 15.0).r;
    float g = texture2D(tDiffuse, uv + off * gShift * 15.0).g;
    float b = texture2D(tDiffuse, uv + off * bShift * 15.0).b;

    vec3 glitchTex = vec3(r, g, b);

    // ── Base color depends on mode ──
    vec3 baseColor;

    if (uUseOriginalColors > 0.5) {
        // ORIGINAL: full source image with glitch texture overlaid
        vec3 src = texture2D(tDiffuse, uv).rgb;
        // Mix source with glitch texture for the RGB-fringe look
        baseColor = mix(src, glitchTex, 0.6 * uIntensity);
    } else {
        // PALETTE: dark base with glitch texture quantized to palette
        float lum = getLuminance(glitchTex);
        int pSize = uPaletteSize;
        int idx = clamp(int(floor(lum * float(pSize - 1) + 0.5)), 0, pSize - 1);
        baseColor = getPaletteColor(idx);
    }

    // ── Animated grain ──
    float grain = 0.06 * hash2(t + V * vec2(1462.439, 297.185));

    // ── Vignette ──
    float vignette = 1.25 * (1.0 - smoothstep(0.1, 1.8, length(V * V)));
    vignette = clamp(vignette, 0.0, 1.0);

    // ── Cell glitch blocks ──
    // Quantizes vertical position into horizontal blocks.
    // Thin dark separator line at the bottom of each block,
    // rest of the block is bright (matches the original Shadertoy).
    float cellUV = fract(uv.y / uCellSize);
    float cellMask = (cellUV < 0.01) ? 0.4 : 1.4;

    // ── Red center glow ──
    float redGlow = 0.14 * pow(1.0 - length(V * vec2(0.5, 0.35)), 3.0);
    redGlow = max(redGlow, 0.0);

    // ── Composite ──
    vec3 finalColor = baseColor;
    finalColor += grain;
    finalColor *= vignette;
    finalColor *= cellMask;
    finalColor += vec3(redGlow, 0.0, 0.0);

    gl_FragColor = vec4(finalColor, 1.0);
}
