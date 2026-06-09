#version 300 es
precision highp float;

uniform float iTime;
uniform vec2 iResolution;

in vec2 vUv;
out vec4 fragColor;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    float time = iTime;
    vec2 uv = 0.5 * (2. * fragCoord.xy - iResolution.xy) / iResolution.y;
    
    // warp uv pre-perspective shift
    float displaceAmp = 0.1;
    float displaceFreq = 2.5;
    uv += vec2(displaceAmp * sin(time + uv.x * displaceFreq));
    
    // 3d params
    // 3d plane technique from: http://glslsandbox.com/e#37557.0 
    float horizon = 0.2 * cos(time); 
    float fov = 0.35 + 0.15 * sin(time); 
    float scaling = 0.3;
    // create a 2nd uv with warped perspective
    vec3 p = vec3(uv.x, fov, uv.y - horizon);      
    vec2 s = vec2(p.x/p.z, p.y/p.z) * scaling;
    
    // wobble the perspective-warped uv 
    float oscFreq = 12.;
    float oscAmp = 0.04;
    s += vec2(oscAmp * sin(time + s.x * oscFreq));
    
    // normal drawing here
    // lines/lattice
    float color = max(
        smoothstep(0.2, 0.8, 0.94 - pow(sin(s.y * 100.), 0.3)), 
        smoothstep(0.2, 0.8, 0.94 - pow(sin(s.x * 100.), 0.3))
    );

    // line depth range
    color *= p.z * p.z * 20.0;
    // line color
    fragColor = vec4(vec3(0, color, 0), 1);
}

void main() {
    mainImage(fragColor, gl_FragCoord.xy);
}
