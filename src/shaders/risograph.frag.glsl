uniform sampler2D tDiffuse;
uniform vec2 uResolution;
uniform float uTime;

uniform float uOffsetX;
uniform float uOffsetY;
uniform float uGrain;
uniform float uHue;
uniform float uSaturation;
uniform float uSplit;

varying vec2 vUv;

// --- HSL to RGB conversion (matches bayer shader) ---

float hue2rgb(float f1, float f2, float hue) {
    if (hue < 0.0) hue += 1.0;
    if (hue > 1.0) hue -= 1.0;
    if (hue < 1.0/6.0) return f1 + (f2 - f1) * 6.0 * hue;
    if (hue < 1.0/2.0) return f2;
    if (hue < 2.0/3.0) return f1 + (f2 - f1) * (2.0/3.0 - hue) * 6.0;
    return f1;
}

vec3 hsl2rgb(vec3 hsl) {
    vec3 rgb;
    if (hsl.y == 0.0) {
        rgb = vec3(hsl.z); // Grayscale
    } else {
        float f2;
        if (hsl.z < 0.5)
            f2 = hsl.z * (1.0 + hsl.y);
        else
            f2 = hsl.z + hsl.y - hsl.z * hsl.y;
        float f1 = 2.0 * hsl.z - f2;
        rgb.r = hue2rgb(f1, f2, hsl.x + 1.0/3.0);
        rgb.g = hue2rgb(f1, f2, hsl.x);
        rgb.b = hue2rgb(f1, f2, hsl.x - 1.0/3.0);
    }
    return rgb;
}

// --- Pseudo-random noise for paper grain ---
// Classic hash-based noise, cheap and GPU-friendly
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

    // --- Misregistration offset in UV space (pixels → UV) ---
    vec2 offset = vec2(uOffsetX, uOffsetY) / uResolution;

    // Sample texture at two positions: base and offset (simulates plate misalignment)
    vec2 uvBase = vUv;
    vec2 uvOffset = vUv + offset;

    vec4 texBase   = texture2D(tDiffuse, uvBase);
    vec4 texOffset = texture2D(tDiffuse, uvOffset);

    float lumBase   = getLuminance(texBase.rgb);
    float lumOffset = getLuminance(texOffset.rgb);

    // --- Build ink colors ---
    // Primary ink: uses uHue at full depth (lightness 0.30 for rich ink)
    // Secondary ink: complementary hue (uHue + 0.5)
    float hue1 = uHue;
    float hue2 = fract(uHue + 0.5); // complementary, wraps around 1.0

    vec3 ink1 = hsl2rgb(vec3(hue1, uSaturation, 0.30));
    vec3 ink2 = hsl2rgb(vec3(hue2, uSaturation, 0.45));

    // --- Tonal split into two ink layers ---
    // Layer 1 (darks/shadows): where base luminance is below split threshold
    // Layer 2 (midtones/highlights): where offset luminance is above split threshold
    // Coverage is smooth (smoothstep) to avoid harsh banding

    // Layer 1: dark regions get primary ink — stronger where darker
    float coverage1 = 1.0 - smoothstep(uSplit - 0.10, uSplit + 0.10, lumBase);

    // Layer 2: mid/highlight regions get secondary ink — from offset sample
    float coverage2 = smoothstep(uSplit - 0.15, uSplit + 0.25, lumOffset);
    // Reduce layer 2 in very dark areas so it acts as a highlight/midtone layer
    coverage2 *= smoothstep(0.05, 0.30, lumOffset);

    // --- Compositing: simulate ink on paper ---
    // Start with paper, then apply each ink layer via multiply blend
    // Multiply blend: result = paper * ink (simulates translucent ink absorbing light)
    vec3 result = paper;

    // Apply layer 1 (primary ink on darks)
    vec3 layer1Color = mix(vec3(1.0), ink1, coverage1);
    result *= layer1Color;

    // Apply layer 2 (secondary ink on mids/highlights)
    vec3 layer2Color = mix(vec3(1.0), ink2, coverage2);
    result *= layer2Color;

    // Where both layers overlap, the multiply naturally creates the overprint effect

    // --- Paper grain noise ---
    // Use fragment position for stable pixel-level grain
    vec2 grainCoord = gl_FragCoord.xy;
    float noise = hash(grainCoord * 0.7 + 0.5) * 2.0 - 1.0; // range [-1, 1]
    result += noise * uGrain * 0.08; // subtle additive grain

    // Clamp to valid color range
    result = clamp(result, 0.0, 1.0);

    gl_FragColor = vec4(result, 1.0);
}
