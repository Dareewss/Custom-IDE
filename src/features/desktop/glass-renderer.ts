import { vertexShader, fragmentShader } from './glass-shader';

export function createGlassRenderer(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext('webgl', {
    alpha: true,
    premultipliedAlpha: false,
    antialias: false,
    preserveDrawingBuffer: true,
  });
  if (!gl) throw new Error('Live glass requires WebGL');
  const compile = (type: number, text: string) => {
    const shader = gl.createShader(type);
    if (!shader) throw new Error('Unable to allocate glass shader');
    gl.shaderSource(shader, text);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
      throw new Error(gl.getShaderInfoLog(shader) ?? 'Glass shader failed');
    return shader;
  };
  const vertex = compile(gl.VERTEX_SHADER, vertexShader);
  const fragment = compile(gl.FRAGMENT_SHADER, fragmentShader);
  const program = gl.createProgram();
  if (!program) throw new Error('Unable to allocate glass program');
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    throw new Error(gl.getProgramInfoLog(program) ?? 'Glass linking failed');
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW,
  );
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  const uniforms = Object.fromEntries(
    ['size', 'resolution', 'screen', 'panels', 'panelCount', 'transparency', 'pointer', 'ink'].map(
      (key) => [key, gl.getUniformLocation(program, key)],
    ),
  );
  let panels = new Float32Array(20);
  let count = 0;
  const layout = () => {
    const width = window.innerWidth,
      height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);
    panels = new Float32Array(20);
    count = 0;
    document
      .querySelectorAll('.titlebar,.activitybar,.sidebar,.editor-card,.output-card')
      .forEach((node) => {
        const r = node.getBoundingClientRect();
        if (count < 5 && r.width > 0 && r.height > 0) {
          panels.set([r.x, r.y, r.width, r.height], count * 4);
          count++;
        }
      });
  };
  layout();
  return {
    layout,
    draw(
      video: HTMLVideoElement,
      geometry: DesktopGlassGeometry,
      transparency: number,
      light: [number, number],
      theme: string,
    ) {
      if (video.readyState < 2) return;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
      gl.uniform2f(uniforms.size, window.innerWidth, window.innerHeight);
      gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
      gl.uniform4f(
        uniforms.screen,
        geometry.x,
        geometry.y,
        geometry.displayWidth,
        geometry.displayHeight,
      );
      gl.uniform4fv(uniforms.panels, panels);
      gl.uniform1i(uniforms.panelCount, count);
      gl.uniform1f(uniforms.transparency, transparency / 100);
      gl.uniform2f(uniforms.pointer, ...light);
      gl.uniform3f(
        uniforms.ink,
        ...(theme === 'light'
          ? ([0.92, 0.93, 0.96] as const)
          : ([14 / 255, 19 / 255, 31 / 255] as const)),
      );
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    },
    dispose() {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    },
  };
}
