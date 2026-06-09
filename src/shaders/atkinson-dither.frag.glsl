// Atkinson Dither — GPU local-grid error diffusion
// Each fragment processes a 3x3 neighbourhood, propagating quantization
// error through cells that have not yet been processed.
//
// ORIGINAL: per-channel error diffusion (R, G, B independently) — preserves source colors
// PALETTE:  luminance error diffusion mapped through palette colors

uniform sampler2D tDiffuse;
uniform vec2 uResolution;
uniform float uThreshold;
uniform float uScale;
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

#define GRID 3
#define ARR_SIZE 9

float errLum[ARR_SIZE];
float errR[ARR_SIZE];
float errG[ARR_SIZE];
float errB[ARR_SIZE];

int getIdx(int x, int y) {
    if (x < 0 || x >= GRID || y < 0 || y >= GRID) return -1;
    return x + y * GRID;
}

float getVal(int x, int y) {
    int idx = getIdx(x, y);
    if (idx < 0) return 0.0;
    return errLum[idx];
}

float getValR(int x, int y) {
    int idx = getIdx(x, y);
    if (idx < 0) return 0.0;
    return errR[idx];
}

float getValG(int x, int y) {
    int idx = getIdx(x, y);
    if (idx < 0) return 0.0;
    return errG[idx];
}

float getValB(int x, int y) {
    int idx = getIdx(x, y);
    if (idx < 0) return 0.0;
    return errB[idx];
}

void accLum(int x, int y, float val) {
    int idx = getIdx(x, y);
    if (idx < 0) return;
    errLum[idx] += val;
}

void accR(int x, int y, float val) {
    int idx = getIdx(x, y);
    if (idx < 0) return;
    errR[idx] += val;
}

void accG(int x, int y, float val) {
    int idx = getIdx(x, y);
    if (idx < 0) return;
    errG[idx] += val;
}

void accB(int x, int y, float val) {
    int idx = getIdx(x, y);
    if (idx < 0) return;
    errB[idx] += val;
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
    float scale = max(uScale, 1.0);
    vec2 fragCoord = vUv * uResolution;
    vec2 scaledCoord = fragCoord / scale;

    for (int i = 0; i < ARR_SIZE; i++) {
        errLum[i] = 0.0;
        errR[i] = 0.0;
        errG[i] = 0.0;
        errB[i] = 0.0;
    }

    vec3 outputColor = vec3(0.0);
    int pSize = uPaletteSize;

    for (int gx = GRID - 1; gx >= 0; gx--) {
        for (int gy = GRID - 1; gy >= 0; gy--) {
            vec2 samplePt = scaledCoord - vec2(float(gx), float(gy));
            vec2 uv = samplePt / (uResolution / scale);
            uv = clamp(uv, 0.0, 1.0);
            vec3 src = texture2D(tDiffuse, uv).rgb;

            if (uUseOriginalColors > 0.5) {
                float rErr = getValR(gx, gy);
                float gErr = getValG(gx, gy);
                float bErr = getValB(gx, gy);

                float rIdeal = src.r * 255.0 + rErr;
                float gIdeal = src.g * 255.0 + gErr;
                float bIdeal = src.b * 255.0 + bErr;

                float rQ = step(uThreshold * 255.0, rIdeal) * 255.0;
                float gQ = step(uThreshold * 255.0, gIdeal) * 255.0;
                float bQ = step(uThreshold * 255.0, bIdeal) * 255.0;

                float rDiff = rIdeal - rQ;
                float gDiff = gIdeal - gQ;
                float bDiff = bIdeal - bQ;

                float eighth = 1.0 / 8.0;
                if (gx >= 1) {
                    accR(gx - 1, gy, rDiff * eighth);
                    accG(gx - 1, gy, gDiff * eighth);
                    accB(gx - 1, gy, bDiff * eighth);
                }
                if (gx >= 2) {
                    accR(gx - 2, gy, rDiff * eighth);
                    accG(gx - 2, gy, gDiff * eighth);
                    accB(gx - 2, gy, bDiff * eighth);
                }
                if (gx >= 1 && gy >= 1) {
                    accR(gx - 1, gy - 1, rDiff * eighth);
                    accG(gx - 1, gy - 1, gDiff * eighth);
                    accB(gx - 1, gy - 1, bDiff * eighth);
                }

                if (gx == 0 && gy == 0) {
                    outputColor = vec3(rQ, gQ, bQ) / 255.0;
                }
            } else {
                float lum = getLuminance(src) * 255.0;
                float err = getVal(gx, gy);
                float ideal = lum + err;

                int bestIdx = 0;
                float bestDist = 1e10;
                for (int p = 0; p < 8; p++) {
                    if (p < pSize) {
                        vec3 palCol = getPaletteColor(p);
                        float palLum = getLuminance(palCol) * 255.0;
                        float d = abs(ideal - palLum);
                        if (d < bestDist) {
                            bestDist = d;
                            bestIdx = p;
                        }
                    }
                }
                float qLum = getLuminance(getPaletteColor(bestIdx)) * 255.0;
                float diff = ideal - qLum;

                float eighth = 1.0 / 8.0;
                if (gx >= 1) accLum(gx - 1, gy, diff * eighth);
                if (gx >= 2) accLum(gx - 2, gy, diff * eighth);
                if (gx >= 1 && gy >= 1) accLum(gx - 1, gy - 1, diff * eighth);

                if (gx == 0 && gy == 0) {
                    outputColor = getPaletteColor(bestIdx);
                }
            }
        }
    }

    gl_FragColor = vec4(outputColor, 1.0);
}
