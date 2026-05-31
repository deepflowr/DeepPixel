uniform sampler2D tDiffuse;
uniform float uTime;
uniform float uSegments;
uniform float uZoom;
uniform float uRotation;
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

void main() {
    // Center and scale UV
    vec2 uv = vUv - 0.5;
    
    // Apply zoom
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
    
    // Map back to 0-1 UV space
    vec2 sampleUV = mirrored + 0.5;
    
    // Edge of frame fade
    float edge = smoothstep(1.4, 0.8, r * 1.8);
    
    vec4 texColor = texture2D(tDiffuse, clamp(sampleUV, 0.0, 1.0));
    
    // HSL color overlay
    float lightnessFg = 0.90 - (uSaturation * 0.40);
    vec3 colorBg = hsl2rgb(vec3(uHue, uSaturation, 0.01));
    vec3 colorFg = hsl2rgb(vec3(uHue, uSaturation, lightnessFg));
    
    float lum = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
    vec3 tinted = mix(colorBg, colorFg, lum);
    
    // Mix original with tinted based on saturation param
    vec3 finalColor = mix(texColor.rgb * edge, tinted * edge, uSaturation);
    
    // Dark areas outside the mirrored region
    if (sampleUV.x < 0.0 || sampleUV.x > 1.0 || sampleUV.y < 0.0 || sampleUV.y > 1.0) {
        finalColor = vec3(0.0);
    }
    
    gl_FragColor = vec4(finalColor, 1.0);
}
