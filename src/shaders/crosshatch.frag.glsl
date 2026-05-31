uniform sampler2D tDiffuse;
uniform vec2 uResolution;
uniform float uScale;
uniform float uContrast;
uniform float uAngle;
uniform float uTime;
uniform float uSpeed;
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
    float lum = getLuminance(texColor.rgb);

    // Crosshatch pattern: overlapping diagonal lines
    vec2 uv = vUv * 2.0;
    float animAngle = uAngle + uTime * uSpeed * 0.4;
    float c = cos(animAngle);
    float s = sin(animAngle);
    vec2 rotated = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c);

    float scale = max(uScale, 2.0);
    float d1 = abs(sin((rotated.x + rotated.y) * scale * 3.14159));
    float d2 = abs(sin((rotated.x - rotated.y) * scale * 3.14159));

    // Mix both crosshatch directions with luminance
    float hatch = min(d1, d2);
    // Dark areas → more crosshatch lines (lower hatch = more ink)
    float outputVal = smoothstep(lum - uContrast * 0.5, lum + uContrast * 0.5, hatch);

    int paletteSize = uPaletteSize;
    float palLum = outputVal;
    int idx = int(floor(palLum * float(paletteSize - 1) + 0.5));
    idx = clamp(idx, 0, paletteSize - 1);
    vec3 finalColor = getPaletteColor(idx);

    gl_FragColor = vec4(finalColor, 1.0);
}
