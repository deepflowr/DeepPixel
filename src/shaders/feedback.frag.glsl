uniform sampler2D tDiffuse;
uniform sampler2D tFeedback;
uniform float uTime;
uniform float uFeedback;
uniform float uDecay;
uniform float uMix;
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

vec3 rgb2hsl(vec3 rgb) {
    float max = max(max(rgb.r, rgb.g), rgb.b);
    float min = min(min(rgb.r, rgb.g), rgb.b);
    float h, s, l = (max + min) / 2.0;
    if (max == min) {
        h = s = 0.0;
    } else {
        float d = max - min;
        s = l > 0.5 ? d / (2.0 - max - min) : d / (max + min);
        if (max == rgb.r) h = (rgb.g - rgb.b) / d + (rgb.g < rgb.b ? 6.0 : 0.0);
        else if (max == rgb.g) h = (rgb.b - rgb.r) / d + 2.0;
        else h = (rgb.r - rgb.g) / d + 4.0;
        h /= 6.0;
    }
    return vec3(h, s, l);
}

void main() {
    vec4 current = texture2D(tDiffuse, vUv);
    vec4 feedback = texture2D(tFeedback, vUv);

    float feedbackAmt = uFeedback;
    vec4 blended = mix(current, feedback, feedbackAmt);

    blended.rgb *= uDecay;

    float lum = dot(current.rgb, vec3(0.299, 0.587, 0.114));
    blended.rgb += current.rgb * lum * 0.3;

    vec3 finalRgb = mix(current.rgb, blended.rgb, uMix);

    vec3 hsl = rgb2hsl(finalRgb);
    hsl.x = uHue;
    hsl.y = mix(hsl.y, uSaturation, 0.5);
    vec3 tinted = hsl2rgb(hsl);

    float tintAmt = uSaturation * 0.4;
    finalRgb = mix(finalRgb, tinted, tintAmt);

    gl_FragColor = vec4(finalRgb, 1.0);
}
