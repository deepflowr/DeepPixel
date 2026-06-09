#version 300 es
precision highp float;

uniform float iTime;
uniform vec2 iResolution;

in vec2 vUv;
out vec4 fragColor;

float cir(float _x, float _y, float s)
{
  float x = _x * float(iResolution.x) * 0.02;
  float y = _y * float(iResolution.y) * 0.02;
  return pow(((sin(x * 4.28)*0.5+0.5) + sin((x + y) * 8.28)*0.5+0.5) * (sin(y * 6.28)*0.6+0.7), s);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
  vec2 scrP = fragCoord.xy;
  scrP = ceil(scrP / 4.0) * 4.0;
    
  vec2 q = scrP / iResolution.xy;
  q.x /= 4.5; q.y /= 6.0;

  float gt = iTime;
  float t = (gt+157.7) * 0.003;
  float ir = 0.9 + sin(1.33 + gt * 2.1) * 0.5;
  float ig = 1.0 + sin(2.14 + gt * 3.7) * 0.5;
  float ib = 1.1 + sin(4.87 + gt * 1.2) * 0.5;

  float r1 = cir(t *  1.5  + q.x / 3.54, t *  1.28 - q.y / 2.64, ir);
  float r2 = cir(t *  3.94 - q.x / 2.54, t *  3.21 + q.y / 4.55, ig);
  float r3 = cir(t * -2.73 + q.x / 2.82, t *  2.27 + q.y / 1.99, ig);
  float g1 = cir(t * -3.41 - q.x / 2.84, t * -5.98 - q.y / 2.46, ig);
  float g2 = cir(t * -2.83 + q.x / 1.23, t *  1.55 + q.y / 1.37, ib);
  float g3 = cir(t *  1.89 - q.x / 2.62, t * -2.37 - q.y / 1.54, ib);
  float b1 = cir(t *  4.12 - q.x / 3.21, t * -1.24 + q.y / 1.28, ib);
  float b2 = cir(t * -2.99 + q.x / 1.54, t *  3.38 - q.y / 2.19, ir);
  float b3 = cir(t *  1.17 - q.x / 5.23, t *  2.18 + q.y / 3.02, ir);
  
  float coef = sin((r1-b2)*g3*10.0) * 1.2 + 0.5;
  float r = (r1 + r2 * r3) * (g1 - b1*coef);
  float g = (g1 + g2 * g3) * (b1 - r1*coef);
  float b = (b1 + b2 * b3) * (r1 - g1*coef);
  r = ceil(r * 255.0 / 16.0) * 16.0 / 256.0;
  g = ceil(g * 255.0 / 16.0) * 16.0 / 256.0;
  b = ceil(b * 255.0 / 16.0) * 16.0 / 256.0;

  fragColor = vec4(r, g, b, 1);
}

void main() {
  mainImage(fragColor, gl_FragCoord.xy);
}
