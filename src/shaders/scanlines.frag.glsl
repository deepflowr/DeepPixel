uniform sampler2D tDiffuse;
uniform float uIntensity;
uniform int uSpacing;
uniform float uTime;
uniform float uSpeed;
uniform vec2 uResolution;

varying vec2 vUv;

void main() {
    vec4 texColor = texture2D(tDiffuse, vUv);
    
    // Calculate vertical scanline pattern based on UV coordinates and canvas resolution
    // Spacing determines how many pixels between scanline peaks
    // Temporal: scroll scanlines downward
    float yPixel = vUv.y * uResolution.y + uTime * uSpeed * 30.0;
    
    // Analog sine-wave scanline modulation (more CRT-authentic than simple hard steps)
    float wave = sin(yPixel * 3.14159265 / float(uSpacing)) * 0.5 + 0.5;
    
    // Modulate intensity: 1.0 - uIntensity * wave
    // If intensity is 0, multiplier is 1.0 (no effect)
    // If intensity is 1, multiplier goes down to 0.0 at the trough of the wave
    float scanlineVal = 1.0 - (uIntensity * (1.0 - wave));
    
    vec3 finalColor = texColor.rgb * scanlineVal;
    
    gl_FragColor = vec4(finalColor, 1.0);
}
