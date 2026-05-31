uniform sampler2D tDiffuse;
uniform float uThreshold;
uniform int uMatrixSize;
uniform float uPixelSize;
uniform vec2 uResolution;
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

// Bayer 2x2 matrix values
float getBayer2(int x, int y) {
    int idx = (x % 2) + (y % 2) * 2;
    if (idx == 0) return 0.0;
    if (idx == 1) return 2.0;
    if (idx == 2) return 3.0;
    return 1.0;
}

// Bayer 4x4 matrix values
float getBayer4(int x, int y) {
    int idx = (x % 4) + (y % 4) * 4;
    if (idx == 0) return 0.0;  if (idx == 1) return 8.0;  if (idx == 2) return 2.0;  if (idx == 3) return 10.0;
    if (idx == 4) return 12.0; if (idx == 5) return 4.0;  if (idx == 6) return 14.0; if (idx == 7) return 6.0;
    if (idx == 8) return 3.0;  if (idx == 9) return 11.0; if (idx == 10) return 1.0; if (idx == 11) return 9.0;
    if (idx == 12) return 15.0;if (idx == 13) return 7.0; if (idx == 14) return 13.0;
    return 5.0;
}

// Bayer 8x8 matrix values
float getBayer8(int x, int y) {
    int px = x % 8;
    int py = y % 8;
    int qx = px / 4;
    int qy = py / 4;
    int rx = px % 4;
    int ry = py % 4;
    
    float subVal = getBayer4(rx, ry);
    float quadVal = getBayer2(qx, qy);
    
    return subVal * 4.0 + quadVal;
}

float getLuminance(vec3 color) {
    return dot(color, vec3(0.299, 0.587, 0.114));
}

void main() {
    vec2 uv = vUv;
    if (uPixelSize > 1.0) {
        vec2 size = uResolution / uPixelSize;
        uv = (floor(vUv * size) + 0.5) / size;
    }
    
    vec4 texColor = texture2D(tDiffuse, uv);
    float lum = getLuminance(texColor.rgb);
    
    vec2 fragCoord = gl_FragCoord.xy;
    if (uPixelSize > 1.0) {
        fragCoord = floor(gl_FragCoord.xy / uPixelSize) * uPixelSize;
    }
    
    int px = int(fragCoord.x / max(1.0, uPixelSize));
    int py = int(fragCoord.y / max(1.0, uPixelSize));
    
    float matrixValue = 0.0;
    float maxVal = 1.0;
    
    if (uMatrixSize == 2) {
        matrixValue = getBayer2(px, py);
        maxVal = 4.0;
    } else if (uMatrixSize == 8) {
        matrixValue = getBayer8(px, py);
        maxVal = 64.0;
    } else {
        matrixValue = getBayer4(px, py);
        maxVal = 16.0;
    }
    
    float ditherValue = (matrixValue + 0.5) / maxVal;
    float ditherResult = lum + (ditherValue - 0.5) * (1.0 - uThreshold * 0.5);
    float outputVal = step(uThreshold, ditherResult);
    
    // Generate dynamic HSL-based palette
    // Lightness 0.01 for background (dark, nearly black)
    // Lightness scales from 0.90 (saturation = 0, pure bright white)
    // down to 0.50 (saturation = 1, pure highly saturated color!)
    float lightnessFg = 0.90 - (uSaturation * 0.40);
    vec3 colorBg = hsl2rgb(vec3(uHue, uSaturation, 0.01));
    vec3 colorFg = hsl2rgb(vec3(uHue, uSaturation, lightnessFg));
    
    vec3 finalColor = mix(colorBg, colorFg, outputVal);
    
    gl_FragColor = vec4(finalColor, 1.0);
}
