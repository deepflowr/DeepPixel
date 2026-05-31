uniform sampler2D tDiffuse;
uniform vec2 uResolution;
uniform float uTime;

uniform float uIntensity;
uniform float uBlockSize;
uniform float uRgbShift;
uniform float uSpeed;
uniform float uScanDistortion;

varying vec2 vUv;

// --- Pseudo-random hash (stateless, GPU-friendly) ---
float hash(vec2 co) {
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

// Secondary hash with different magic numbers to avoid correlation
float hash2(vec2 co) {
    return fract(sin(dot(co, vec2(63.7718, 27.1139))) * 29483.2951);
}

void main() {
    // Discrete time step — produces stuttery jumps instead of smooth animation
    float t = floor(uTime * uSpeed);

    // Start with original UV coordinates
    vec2 uv = vUv;

    // -------------------------------------------------
    // 1. VHS-style wavy horizontal scan distortion
    //    Simulates a damaged tape with wobbly scanlines
    // -------------------------------------------------
    float scanWave = sin(vUv.y * 80.0 + uTime * uSpeed * 3.0)
                   * sin(vUv.y * 22.0 - uTime * uSpeed * 1.7)
                   * uScanDistortion * uIntensity * 0.01;
    uv.x += scanWave;

    // -------------------------------------------------
    // 2. Horizontal block displacement
    //    Divides the image into strips and shifts some
    //    strips left or right at random each time-step
    // -------------------------------------------------
    // Quantize the vertical position into blocks
    float blockY = floor(uv.y / uBlockSize) * uBlockSize;

    // Decide per-block: should this block glitch?
    float blockRand = hash(vec2(blockY, t));

    // Only displace blocks that pass a random threshold scaled by intensity
    float displace = 0.0;
    if (blockRand > 1.0 - uIntensity) {
        // Displacement amount: signed, proportional to intensity
        displace = (hash(vec2(blockY + 1.0, t)) - 0.5) * 2.0 * uIntensity * 0.15;
    }
    uv.x += displace;

    // -------------------------------------------------
    // 3. RGB channel separation (chromatic aberration)
    //    Each channel is sampled at a slightly different
    //    horizontal offset, producing colour fringing
    // -------------------------------------------------
    float shift = uRgbShift * uIntensity;

    // Per-frame random direction tweak keeps the shift lively
    float shiftDir = hash2(vec2(t, 3.71)) - 0.5;

    vec2 rOff = vec2( shift * shiftDir,  shift * 0.3);
    vec2 gOff = vec2(0.0, 0.0);
    vec2 bOff = vec2(-shift * shiftDir, -shift * 0.3);

    float r = texture2D(tDiffuse, uv + rOff).r;
    float g = texture2D(tDiffuse, uv + gOff).g;
    float b = texture2D(tDiffuse, uv + bOff).b;

    // Preserve original alpha from center sample
    float a = texture2D(tDiffuse, uv).a;

    // -------------------------------------------------
    // 4. Occasional bright horizontal glitch line
    //    Adds a thin white flash across a random strip
    // -------------------------------------------------
    float lineGlitch = 0.0;
    float lineSlot = floor(vUv.y * 200.0);
    float lineRand = hash(vec2(lineSlot, t + 9.3));
    if (lineRand > 1.0 - uIntensity * 0.05) {
        lineGlitch = 0.6 * uIntensity;
    }

    vec3 color = vec3(r, g, b) + lineGlitch;

    // When intensity is 0 all offsets & additions are 0 → image passes through
    gl_FragColor = vec4(color, a);
}
