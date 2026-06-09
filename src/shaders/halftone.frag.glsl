uniform sampler2D tDiffuse;
uniform vec2 uResolution;
uniform float uDotSize;
uniform float uContrast;
uniform float uAngle;
uniform float uTime;
uniform float uSpeed;
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
    // Sample the input texture at this fragment's UV
    vec4 texColor = texture2D(tDiffuse, vUv);
    float lum = getLuminance(texColor.rgb);

    // ── Use UV-based coordinates instead of gl_FragCoord ──
    vec2 uvCoord = vUv * uResolution;

    // Rotate coordinate system around UV center by uAngle + temporal rotation
    float animAngle = uAngle + uTime * uSpeed * 0.3;
    float cosA = cos(animAngle);
    float sinA = sin(animAngle);
    vec2 center = uResolution * 0.5;
    vec2 centered = uvCoord - center;
    vec2 rotated = vec2(
        centered.x * cosA - centered.y * sinA,
        centered.x * sinA + centered.y * cosA
    );

    // Compute the cell coordinate in the rotated grid
    float cellSize = max(uDotSize, 2.0);
    vec2 cell = floor(rotated / cellSize);
    vec2 cellCenter = (cell + 0.5) * cellSize;

    // Distance from the current fragment to its cell center (in rotated space)
    float dist = length(rotated - cellCenter);

    // Inverse-rotate the cell center back to UV space
    vec2 cellUV = vec2(
        cellCenter.x * cosA + cellCenter.y * sinA,
        -cellCenter.x * sinA + cellCenter.y * cosA
    ) + center;
    cellUV = cellUV / uResolution;
    cellUV = clamp(cellUV, 0.0, 1.0);

    // Sample luminance at the cell center for dot sizing
    vec4 cellTexColor = texture2D(tDiffuse, cellUV);
    float cellLum = getLuminance(cellTexColor.rgb);

    // Darker areas → larger dots
    float maxRadius = cellSize * 0.5;
    float dotRadius = maxRadius * (1.0 - cellLum);

    // Edge sharpness controlled by contrast
    float edgeSmoothness = mix(maxRadius * 0.4, 0.5, uContrast);
    float dot = 1.0 - smoothstep(dotRadius - edgeSmoothness, dotRadius + edgeSmoothness, dist);

    // ── Output ──
    vec3 finalColor;
    if (uUseOriginalColors > 0.5) {
        // Original mode: dot shows the original cell color on black background
        // dot = 1 inside the dot (dark area), dot = 0 outside (bright area)
        finalColor = mix(vec3(0.0), cellTexColor.rgb, dot);
    } else {
        // Palette mode: map dot luminance through palette colors
        int paletteSize = uPaletteSize;
        float palLum = dot;
        int idx = int(floor(palLum * float(paletteSize - 1) + 0.5));
        idx = clamp(idx, 0, paletteSize - 1);
        finalColor = getPaletteColor(idx);
    }

    gl_FragColor = vec4(finalColor, 1.0);
}
