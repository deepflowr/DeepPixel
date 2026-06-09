// Floyd-Steinberg Error Diffusion (GPU / local grid)
// Adapted from Shadertoy — single-pass error diffusion using a 3×3 local grid.
//
// ORIGINAL mode: per-channel error diffusion (R, G, B independently)
//   → preserves the source image's colors while adding dither texture
//
// PALETTE mode: luminance-based error diffusion through palette colors
//   → classic Floyd-Steinberg look mapped to user's palette

uniform sampler2D tDiffuse;
uniform vec2 uResolution;
uniform float uPixelSize;
uniform float uThreshold;
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

#define GRID_SIZE 3
#define ARR_SIZE (GRID_SIZE * GRID_SIZE)

int getIndex(ivec2 p) {
    if (p.x < 0 || p.x >= GRID_SIZE) return -1;
    if (p.y < 0 || p.y >= GRID_SIZE) return -1;
    return p.x + p.y * GRID_SIZE;
}

float getValue(float arr[ARR_SIZE], ivec2 p) {
    int idx = getIndex(p);
    if (idx < 0) return 0.0;
    return arr[idx];
}

void accValue(inout float arr[ARR_SIZE], ivec2 p, float value) {
    int idx = getIndex(p);
    if (idx < 0) return;
    arr[idx] += value;
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
    vec2 fragCoord = gl_FragCoord.xy;
    float scale = max(uPixelSize, 1.0);
    vec2 scaledCoord = fragCoord / scale;

    // Top-left of the local 3x3 grid for this pixel
    vec2 topLeft = floor(scaledCoord / float(GRID_SIZE)) * float(GRID_SIZE);

    // ── Error accumulators ──
    float errAcc[ARR_SIZE];     // for luminance (palette mode)
    float errAccR[ARR_SIZE];    // for red channel (original mode)
    float errAccG[ARR_SIZE];    // for green channel (original mode)
    float errAccB[ARR_SIZE];    // for blue channel (original mode)

    for (int i = 0; i < ARR_SIZE; i++) {
        errAcc[i] = 0.0;
        errAccR[i] = 0.0;
        errAccG[i] = 0.0;
        errAccB[i] = 0.0;
    }

    float outputLum = 0.0;
    vec3 outputColor = vec3(0.0);

    // Process grid in reverse (bottom-right → top-left)
    for (int gx = GRID_SIZE - 1; gx >= 0; gx--) {
        for (int gy = GRID_SIZE - 1; gy >= 0; gy--) {
            vec2 samplePt = scaledCoord - vec2(float(gx), float(gy));
            vec2 gridPos = samplePt - topLeft;

            if (gridPos.x < 0.0 || gridPos.y < 0.0) continue;

            // Sample original pixel color
            vec2 uv = samplePt / (uResolution / scale);
            if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) continue;
            vec3 oc = texture2D(tDiffuse, uv).rgb;

            ivec2 gp = ivec2(gridPos);

            if (uUseOriginalColors > 0.5) {
                // ── Per-channel error diffusion ──
                // Each RGB channel gets its own error accumulator,
                // so the dither preserves the source image's colors.

                float rErr = getValue(errAccR, gp);
                float gErr = getValue(errAccG, gp);
                float bErr = getValue(errAccB, gp);

                float rIdeal = oc.r + rErr;
                float gIdeal = oc.g + gErr;
                float bIdeal = oc.b + bErr;

                float rQ = step(uThreshold, rIdeal);
                float gQ = step(uThreshold, gIdeal);
                float bQ = step(uThreshold, bIdeal);

                float rDiff = rIdeal - rQ;
                float gDiff = gIdeal - gQ;
                float bDiff = bIdeal - bQ;

                outputColor = vec3(rQ, gQ, bQ);
                outputLum = dot(outputColor, vec3(0.299, 0.587, 0.114));

                // Diffuse each channel's error independently
                float w7 = 7.0 / 16.0, w3 = 3.0 / 16.0, w5 = 5.0 / 16.0, w1 = 1.0 / 16.0;
                accValue(errAccR, gp + ivec2(1, 0), rDiff * w7);
                accValue(errAccR, gp + ivec2(-1, 1), rDiff * w3);
                accValue(errAccR, gp + ivec2(0, 1), rDiff * w5);
                accValue(errAccR, gp + ivec2(1, 1), rDiff * w1);

                accValue(errAccG, gp + ivec2(1, 0), gDiff * w7);
                accValue(errAccG, gp + ivec2(-1, 1), gDiff * w3);
                accValue(errAccG, gp + ivec2(0, 1), gDiff * w5);
                accValue(errAccG, gp + ivec2(1, 1), gDiff * w1);

                accValue(errAccB, gp + ivec2(1, 0), bDiff * w7);
                accValue(errAccB, gp + ivec2(-1, 1), bDiff * w3);
                accValue(errAccB, gp + ivec2(0, 1), bDiff * w5);
                accValue(errAccB, gp + ivec2(1, 1), bDiff * w1);

            } else {
                // ── Luminance-based error diffusion (palette mode) ──
                float og = dot(oc, vec3(0.299, 0.587, 0.114));
                float err = getValue(errAcc, gp);
                float ideal = og + err;

                int pSize = uPaletteSize;
                float numLevels = float(pSize - 1);
                float scaled = ideal * numLevels;
                float baseLevel = floor(scaled);
                float fracLevel = fract(scaled);

                int level = int(baseLevel);
                if (fracLevel > 0.5) {
                    level = level + 1;
                }
                level = clamp(level, 0, pSize - 1);

                float qLum = float(level) / numLevels;
                outputLum = qLum;
                err = ideal - qLum;

                accValue(errAcc, gp + ivec2(1, 0), err * (7.0 / 16.0));
                accValue(errAcc, gp + ivec2(-1, 1), err * (3.0 / 16.0));
                accValue(errAcc, gp + ivec2(0, 1), err * (5.0 / 16.0));
                accValue(errAcc, gp + ivec2(1, 1), err * (1.0 / 16.0));
            }
        }
    }

    // ── Output ──
    vec3 finalColor;
    if (uUseOriginalColors > 0.5) {
        // Per-channel dither: output the independently-dithered RGB channels.
        // Each channel is either 0 or 1 (after step), giving 8 possible colors.
        // This preserves the source image's color distribution.
        finalColor = outputColor;
    } else {
        int pSize = uPaletteSize;
        float scaled = outputLum * float(pSize - 1);
        int idx = int(floor(scaled + 0.5));
        idx = clamp(idx, 0, pSize - 1);
        finalColor = getPaletteColor(idx);
    }

    gl_FragColor = vec4(finalColor, 1.0);
}
