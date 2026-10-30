export const vertexShader = `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

export const fragmentShader = `
precision highp float;
uniform sampler2D desktop;
uniform vec2 size;
uniform vec2 resolution;
uniform vec4 screen;
uniform vec4 panels[5];
uniform int panelCount;
uniform float transparency;
uniform vec2 pointer;
uniform vec3 ink;

float roundedBox(vec2 p, vec4 box) {
  float radius = min(box.z, box.w) < 100.0 ? min(box.z, box.w) * .46 : 24.0;
  vec2 q = abs(p - box.xy - box.zw * .5) - box.zw * .5 + radius;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - radius;
}
vec3 image(vec2 p) {
  vec2 uv = clamp((screen.xy + p) / screen.zw, .001, .999);
  return texture2D(desktop, uv).rgb;
}
void main() {
  vec2 p = vec2(gl_FragCoord.x, resolution.y - gl_FragCoord.y) * size / resolution;
  float distance = 10000.0;
  vec4 panel = vec4(0.0);
  for (int i = 0; i < 5; i++) {
    if (i < panelCount) {
      float d = roundedBox(p, panels[i]);
      if (d < distance) { distance = d; panel = panels[i]; }
    }
  }
  if (distance > 1.0) { gl_FragColor = vec4(0.0); return; }
  float depth = max(-distance, 0.0);
  float rim = 1.0 - smoothstep(0.0, 24.0, depth);
  vec2 normal = normalize(vec2(
    roundedBox(p + vec2(.5, 0.0), panel) - roundedBox(p - vec2(.5, 0.0), panel),
    roundedBox(p + vec2(0.0, .5), panel) - roundedBox(p - vec2(0.0, .5), panel)
  ) + vec2(.0001));
  // Convex edge bends and slightly magnifies the real desktop. Dispersion separates
  // RGB at the bevel, rather than drawing colored gradients over an opaque panel.
  vec2 bend = normal * (pow(rim, 2.0) * 28.0);
  vec2 samplePoint = p - bend;
  float soft = mix(3.5, 1.2, rim);
  vec3 color = image(samplePoint) * .2;
  color += image(samplePoint + vec2(soft, 0.0)) * .1;
  color += image(samplePoint - vec2(soft, 0.0)) * .1;
  color += image(samplePoint + vec2(0.0, soft)) * .1;
  color += image(samplePoint - vec2(0.0, soft)) * .1;
  color += image(samplePoint + vec2(soft, soft) * .72) * .1;
  color += image(samplePoint + vec2(-soft, soft) * .72) * .1;
  color += image(samplePoint + vec2(soft, -soft) * .72) * .1;
  color += image(samplePoint - vec2(soft, soft) * .72) * .1;
  float dispersion = rim * 1.4;
  color.r = mix(color.r, image(samplePoint + normal * dispersion).r, rim * .65);
  color.b = mix(color.b, image(samplePoint - normal * dispersion).b, rim * .65);
  color = mix(ink, color, transparency);
  vec2 lightDirection = normalize(pointer - p + vec2(.1));
  float light = max(dot(normal, normalize(vec2(-.7, -.8))), 0.0);
  float pointerLight = pow(max(dot(normal, lightDirection), 0.0), 8.0) * .15;
  float edge = exp(-pow((depth - 1.2) / 1.2, 2.0));
  float caustic = exp(-pow((depth - 9.0) / 4.0, 2.0)) * .08;
  color += vec3(.83, .88, 1.0) * (edge * (.14 + light * .46 + pointerLight) + caustic * light);
  color += vec3(.65, .7, .87) * pow(rim, 3.0) * .06;
  gl_FragColor = vec4(color, 1.0 - smoothstep(-.6, .8, distance));
}
`;
