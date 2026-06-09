// Flowy — feedback fluido con zoom, rotación y distorsión
// Inspirado en Shadertoy: feedback continuo con desplazamiento por color,
// zoom infinito y rotación suave.
//
// ORIGINAL: feedback con colores fuente mezclados
// PALETTE:  feedback mapeado a paleta

uniform sampler2D tDiffuse;
uniform sampler2D tFeedback;
uniform vec2 uResolution;
uniform float uTime;
uniform float uSpeed;
uniform float uZoom;
uniform float uRotation;
uniform float uMix;
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

vec2 rotate(vec2 coords, float angle) {
    float s = sin(angle);
    float c = cos(angle);
    coords = vec2(coords.x - 0.5, coords.y - 0.5) * mat2(c, s, -s, c);
    coords += 0.5;
    return coords;
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
    vec2 res = uResolution;
    vec2 uv = vUv;

    // Zoom continuo (infinito)
    float zoomAmt = 1.0 - (1.0 - uZoom) * 0.002;
    uv *= zoomAmt;

    // Rotación continua
    float rotAmt = uRotation * 0.0015;
    uv = rotate(uv, rotAmt);

    // Sample feedback buffer con distorsión por color
    vec4 sum = texture2D(tFeedback, uv);
    vec4 color = texture2D(tFeedback, uv - sum.gb);
    sum += color * -0.15;

    // Sample input (cámara/imagen)
    vec4 src = texture2D(tDiffuse, vUv);

    // Mix feedback con input
    float mixAmt = max(uMix, 0.01);
    sum.rgb = mix(sum.rgb, src.rgb, src.rgb * mixAmt);

    // Asegurar que la fuente sea siempre visible (primer frame o feedback oscuro)
    sum.rgb = max(sum.rgb, src.rgb * 0.12);
    sum.rgb = clamp(sum.rgb, 0.0, 1.0);

    vec3 finalColor;

    if (uUseOriginalColors > 0.5) {
        finalColor = sum.rgb;
    } else {
        float lum = getLuminance(sum.rgb);
        int pSize = uPaletteSize;
        int idx = clamp(int(floor(lum * float(pSize - 1) + 0.5)), 0, pSize - 1);
        finalColor = getPaletteColor(idx);
    }

    gl_FragColor = vec4(finalColor, 1.0);
}
