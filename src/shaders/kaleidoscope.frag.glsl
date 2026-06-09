// Kaleidoscope — mirrored reflection transform
// ORIGINAL: reflects the source image with kaleidoscope symmetry, preserving original colors
// PALETTE:  reflects the source image, then maps luminance through palette colors
//
// The key difference from the old shader: UV coordinates outside [0,1] are
// mirrored back via reflection instead of filled with black. This creates a
// true kaleidoscope effect where every part of the screen shows reflected
// image content.

uniform sampler2D tDiffuse;
uniform float uSegments;
uniform float uZoom;
uniform float uRotation;
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

// --- Mirror-wraps a coordinate into [0, 1] by reflecting back and forth ---
// Like a kaleidoscope, out-of-bounds values are mirrored instead of clamped.
vec2 mirrorWrap(vec2 uv) {
    uv = fract(uv * 0.5) * 2.0;     // fold into [0, 2]
    uv = 1.0 - abs(uv - 1.0);        // mirror into [0, 1]
    return uv;
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
    // Center and scale UV
    vec2 uv = vUv - 0.5;
    uv *= uZoom;

    // Convert to polar coordinates
    float a = atan(uv.y, uv.x);
    float r = length(uv);

    // Apply rotation
    a += uRotation;

    // Mirror into segments
    float segments = max(uSegments, 1.0);
    float segAngle = 6.2832 / segments;
    a = mod(a, segAngle);
    a = abs(a - segAngle * 0.5);

    // Convert back to cartesian
    vec2 mirrored = vec2(cos(a), sin(a)) * r;

    // Map to UV space
    vec2 sampleUV = mirrored + 0.5;

    // Mirror-wrap instead of clamping — no black areas!
    sampleUV = mirrorWrap(sampleUV);

    vec4 texColor = texture2D(tDiffuse, sampleUV);

    vec3 finalColor;

    if (uUseOriginalColors > 0.5) {
        // ── ORIGINAL: show the mirrored source image ──
        finalColor = texColor.rgb;
    } else {
        // ── PALETTE: map luminance through palette ──
        float lum = getLuminance(texColor.rgb);
        int pSize = uPaletteSize;
        int idx = clamp(int(floor(lum * float(pSize - 1) + 0.5)), 0, pSize - 1);
        finalColor = getPaletteColor(idx);
    }

    gl_FragColor = vec4(finalColor, 1.0);
}
