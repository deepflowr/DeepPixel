uniform sampler2D tDiffuse;
uniform vec2 uResolution;
uniform float uTime;
uniform float uDotSize;
uniform float uContrast;
uniform float uAngle;
uniform float uHue;
uniform float uSaturation;

varying vec2 vUv;

// Helper to convert Hue, Saturation, Lightness to RGB
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

// Standard luminance weights (ITU-R BT.601)
float getLuminance(vec3 color) {
    return dot(color, vec3(0.299, 0.587, 0.114));
}

void main() {
    // Sample the input texture
    vec4 texColor = texture2D(tDiffuse, vUv);
    float lum = getLuminance(texColor.rgb);

    // Work in pixel coordinates for the dot grid
    vec2 fragCoord = gl_FragCoord.xy;

    // Rotate coordinate system around screen center by uAngle
    float cosA = cos(uAngle);
    float sinA = sin(uAngle);
    vec2 center = uResolution * 0.5;
    vec2 centered = fragCoord - center;
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

    // Sample luminance at the cell center to determine dot size uniformly per cell
    // Inverse-rotate the cell center back to screen space, then to UV
    vec2 cellScreen = vec2(
        cellCenter.x * cosA + cellCenter.y * sinA,
        -cellCenter.x * sinA + cellCenter.y * cosA
    ) + center;
    vec2 cellUV = cellScreen / uResolution;
    // Clamp UV to valid range to avoid edge artifacts
    cellUV = clamp(cellUV, 0.0, 1.0);
    vec4 cellTexColor = texture2D(tDiffuse, cellUV);
    float cellLum = getLuminance(cellTexColor.rgb);

    // Darker areas → larger dots (radius proportional to (1 - luminance))
    // Maximum radius is half the cell size (dot fills the cell)
    float maxRadius = cellSize * 0.5;
    float dotRadius = maxRadius * (1.0 - cellLum);

    // Apply contrast to control edge sharpness of the dot
    // At contrast = 0, the edge is soft (smooth gradient)
    // At contrast = 1, the edge is perfectly crisp (hard step)
    float edgeSmoothness = mix(maxRadius * 0.4, 0.5, uContrast);
    float dot = 1.0 - smoothstep(dotRadius - edgeSmoothness, dotRadius + edgeSmoothness, dist);

    // Generate dynamic HSL-based palette (matching bayer shader scheme)
    // Lightness 0.01 for background (dark, nearly black)
    // Lightness scales from 0.90 (saturation = 0, pure bright white)
    // down to 0.50 (saturation = 1, pure highly saturated color!)
    float lightnessFg = 0.90 - (uSaturation * 0.40);
    vec3 colorBg = hsl2rgb(vec3(uHue, uSaturation, 0.01));
    vec3 colorFg = hsl2rgb(vec3(uHue, uSaturation, lightnessFg));

    // Mix foreground (dots) and background based on dot coverage
    vec3 finalColor = mix(colorBg, colorFg, dot);

    gl_FragColor = vec4(finalColor, 1.0);
}
