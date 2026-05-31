uniform sampler2D tDiffuse;
uniform float uTime;
uniform float uLevels;
uniform float uHue;
uniform float uSaturation;

varying vec2 vUv;

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
        rgb = vec3(hsl.z);
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

float getLuminance(vec3 color) {
    return dot(color, vec3(0.299, 0.587, 0.114));
}

void main() {
    vec4 texColor = texture2D(tDiffuse, vUv);
    float lum = getLuminance(texColor.rgb);

    // Quantize luminance into discrete levels
    float levels = max(uLevels, 2.0);
    float quantized = floor(lum * levels) / levels;

    // Edge emphasis: difference between original and quantized
    float edge = abs(lum - quantized) * 3.0;

    // Determine if this pixel is on a "band edge"
    float bandEdge = smoothstep(0.02, 0.08, edge);

    // HSL palette output (same scheme as other effects)
    float lightnessFg = 0.90 - (uSaturation * 0.40);
    vec3 colorBg = hsl2rgb(vec3(uHue, uSaturation, 0.01));
    vec3 colorFg = hsl2rgb(vec3(uHue, uSaturation, lightnessFg));

    // Map quantized luminance to color palette
    vec3 posterized = mix(colorBg, colorFg, quantized);

    // Subtle edge lines at band transitions for a "poster" look
    vec3 finalColor = mix(posterized, vec3(0.0), bandEdge * 0.3);

    gl_FragColor = vec4(finalColor, 1.0);
}
