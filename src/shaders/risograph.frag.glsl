uniform sampler2D tDiffuse;
uniform vec2 uResolution;
uniform float uTime;

uniform float uOffsetX;
uniform float uOffsetY;
uniform float uGrain;
uniform float uSplit;
uniform float uUseOriginalColors;
uniform int uPaletteSize;
uniform vec3 uColor0;
uniform vec3 uColor1;

varying vec2 vUv;

// --- Pseudo-random noise for paper grain ---
float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

// --- Luminance ---
float getLuminance(vec3 color) {
    return dot(color, vec3(0.299, 0.587, 0.114));
}

void main() {
    // --- Paper background: warm off-white #f0ebe3 ---
    vec3 paper = vec3(0.94, 0.92, 0.89);

    // --- Misregistration offset in UV space ---
    vec2 offset = vec2(uOffsetX, uOffsetY) / uResolution;

    // Sample texture at two positions: base and offset
    vec2 uvBase = vUv;
    vec2 uvOffset = vUv + offset;

    vec4 texBase   = texture2D(tDiffuse, uvBase);
    vec4 texOffset = texture2D(tDiffuse, uvOffset);

    float lumBase   = getLuminance(texBase.rgb);
    float lumOffset = getLuminance(texOffset.rgb);

    // --- Tonal split into two ink layers ---
    // Layer 1 (shadows/darks): where base luminance is below split threshold
    // Layer 2 (midtones/highlights): where offset luminance is above split threshold

    float coverage1 = 1.0 - smoothstep(uSplit - 0.10, uSplit + 0.10, lumBase);
    float coverage2 = smoothstep(uSplit - 0.15, uSplit + 0.25, lumOffset);
    coverage2 *= smoothstep(0.05, 0.30, lumOffset);

    // --- Choose ink colors based on mode ---
    vec3 ink1, ink2;

    if (uUseOriginalColors > 0.5) {
        // ORIGINAL: ink colors are extracted from the source image
        ink1 = texBase.rgb;   // dark ink = source color at dark regions
        ink2 = texOffset.rgb; // light ink = source color at light regions
    } else {
        // PALETTE: ink colors come from the UI palette (max 2)
        int pSize = uPaletteSize;
        ink1 = (pSize >= 1) ? uColor0 : vec3(0.0);
        ink2 = (pSize >= 2) ? uColor1 : uColor0;
    }

    // --- Compositing: simulate ink on paper ---
    vec3 result = paper;

    // Layer 1 (dark ink on shadows)
    vec3 layer1Color = mix(vec3(1.0), ink1, coverage1);
    result *= layer1Color;

    // Layer 2 (light ink on mids/highlights)
    vec3 layer2Color = mix(vec3(1.0), ink2, coverage2);
    result *= layer2Color;

    // --- Paper grain noise ---
    vec2 grainCoord = gl_FragCoord.xy;
    float noise = hash(grainCoord * 0.7 + 0.5) * 2.0 - 1.0;
    result += noise * uGrain * 0.08;

    result = clamp(result, 0.0, 1.0);

    gl_FragColor = vec4(result, 1.0);
}
