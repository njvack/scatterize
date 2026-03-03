// src/plot/webgl-renderer.js
// Thin WebGL renderer for scatter points and fringe tick lines.
// Receives CSS pixel coordinates; multiplies by dpr internally for the GPU.
//
// Points are rendered as anti-aliased point sprites (filled or hollow rings).
// Fringe ticks are rendered as gl.LINES.
// The canvas background is transparent so the back SVG layer shows through.
//
// Color convention: all colors passed in are STRAIGHT RGBA (0-1 each).
// The shaders pre-multiply alpha before writing to the framebuffer so the
// canvas composites correctly over the page (premultipliedAlpha: true default).

function compileShader(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
    throw new Error(gl.getShaderInfoLog(s));
  return s;
}

function buildProgram(gl, vertSrc, fragSrc) {
  const prog = gl.createProgram();
  gl.attachShader(prog, compileShader(gl, gl.VERTEX_SHADER,   vertSrc));
  gl.attachShader(prog, compileShader(gl, gl.FRAGMENT_SHADER, fragSrc));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
    throw new Error(gl.getProgramInfoLog(prog));
  return prog;
}

// ─── Point sprite program ────────────────────────────────────────────────────
// Positions in physical pixels; u_canvas is canvas physical size.
// v_size is the sprite diameter in physical pixels (passed via varying so the
// fragment shader can compute anti-aliasing width relative to point size).

const POINT_VERT = `
  precision mediump float;
  attribute vec2  a_pos;
  attribute vec4  a_color;
  attribute float a_size;
  attribute float a_innerR;
  uniform   vec2  u_canvas;
  varying   vec4  v_color;
  varying   float v_size;
  varying   float v_innerR;
  void main() {
    v_color  = a_color;
    v_size   = a_size;
    v_innerR = a_innerR;
    vec2 clip    = (a_pos / u_canvas) * 2.0 - 1.0;
    gl_Position  = vec4(clip.x, -clip.y, 0.0, 1.0);
    gl_PointSize = a_size;
  }`;

const POINT_FRAG = `
  precision mediump float;
  varying vec4  v_color;
  varying float v_size;
  varying float v_innerR;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    // Outer edge: anti-alias over ~1.5 physical pixels.
    float outerEdge = max(0.0, 0.5 - 1.5 / v_size);
    float mask = 1.0 - smoothstep(outerEdge, 0.5, d);
    // Inner edge for hollow (censored) circles.
    if (v_innerR > 0.0) {
      float innerEdge = max(0.0, v_innerR - 1.5 / v_size);
      mask *= smoothstep(innerEdge, v_innerR, d);
    }
    // Pre-multiply alpha before writing — canvas has premultipliedAlpha: true.
    float a      = v_color.a * mask;
    gl_FragColor = vec4(v_color.rgb * a, a);
  }`;

// ─── Line program (fringe ticks) ─────────────────────────────────────────────

const LINE_VERT = `
  precision mediump float;
  attribute vec2 a_pos;
  attribute vec4 a_color;
  uniform   vec2 u_canvas;
  varying   vec4 v_color;
  void main() {
    v_color = a_color;
    vec2 clip   = (a_pos / u_canvas) * 2.0 - 1.0;
    gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  }`;

const LINE_FRAG = `
  precision mediump float;
  varying vec4 v_color;
  void main() {
    // Pre-multiply alpha.
    float a      = v_color.a;
    gl_FragColor = vec4(v_color.rgb * a, a);
  }`;

// ─── Public API ──────────────────────────────────────────────────────────────

// createWebGLRenderer(canvas) → renderer | null
//
// Returns null if WebGL is unavailable (caller falls back to SVG rendering).
//
// Renderer interface:
//   updatePoints(pts, dpr)  — pts: [{x, y, r, color:[r,g,b,a], innerRadius}]
//   updateLines(lines, dpr) — lines: [{x1,y1,x2,y2,color:[r,g,b,a]}]
//   render()                — clear + draw lines then points
//   resize(physW, physH)    — resize canvas physical pixels + viewport
//   toSVGGroup(clipId)      — returns <g> with SVG equivalents for export
//   clear()                 — empty buffers, clear canvas
//   destroy()               — free GL resources
export function createWebGLRenderer(canvas) {
  const gl = canvas.getContext('webgl');
  if (!gl) return null;

  // Pre-multiplied alpha blending: src already has (r*a, g*a, b*a, a).
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  let pointProg, lineProg;
  try {
    pointProg = buildProgram(gl, POINT_VERT, POINT_FRAG);
    lineProg  = buildProgram(gl, LINE_VERT,  LINE_FRAG);
  } catch (e) {
    console.error('WebGL shader compile/link error:', e);
    return null;
  }

  const pp = {
    pos:    gl.getAttribLocation(pointProg,  'a_pos'),
    color:  gl.getAttribLocation(pointProg,  'a_color'),
    size:   gl.getAttribLocation(pointProg,  'a_size'),
    innerR: gl.getAttribLocation(pointProg,  'a_innerR'),
    canvas: gl.getUniformLocation(pointProg, 'u_canvas'),
  };
  const lp = {
    pos:    gl.getAttribLocation(lineProg,  'a_pos'),
    color:  gl.getAttribLocation(lineProg,  'a_color'),
    canvas: gl.getUniformLocation(lineProg, 'u_canvas'),
  };

  const ptPosBuf   = gl.createBuffer();
  const ptColorBuf = gl.createBuffer();
  const ptSizeBuf  = gl.createBuffer();
  const ptInnerBuf = gl.createBuffer();
  const lnPosBuf   = gl.createBuffer();
  const lnColorBuf = gl.createBuffer();

  let nPoints    = 0;
  let nLineVerts = 0;
  let _pointsData = [];   // CSS-pixel point data, retained for toSVGGroup()
  let _linesData  = [];   // CSS-pixel line data, retained for toSVGGroup()
  let _W = canvas.width, _H = canvas.height;

  function resize(physW, physH) {
    _W = physW;  _H = physH;
    canvas.width  = physW;
    canvas.height = physH;
    gl.viewport(0, 0, physW, physH);
  }

  // pts: [{ x, y, r, color: [r,g,b,a], innerRadius: 0..0.5 }]
  //   x, y : CSS pixel coords in the plot-container coordinate system
  //   r    : point radius in CSS pixels
  //   color: straight RGBA (0-1 each); alpha encodes point opacity
  //   innerRadius: gl_PointCoord fraction for hollow ring (0 = filled)
  function updatePoints(pts, dpr = 1) {
    _pointsData = pts;
    nPoints = pts.length;
    if (!nPoints) return;

    const pos    = new Float32Array(nPoints * 2);
    const colors = new Float32Array(nPoints * 4);
    const sizes  = new Float32Array(nPoints);
    const innerR = new Float32Array(nPoints);

    for (let i = 0; i < nPoints; i++) {
      const p = pts[i];
      pos[i*2]       = p.x * dpr;
      pos[i*2 + 1]   = p.y * dpr;
      colors[i*4]     = p.color[0];
      colors[i*4 + 1] = p.color[1];
      colors[i*4 + 2] = p.color[2];
      colors[i*4 + 3] = p.color[3];
      sizes[i]  = p.r * 2 * dpr;   // diameter = gl_PointSize in physical px
      innerR[i] = p.innerRadius ?? 0;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, ptPosBuf);
    gl.bufferData(gl.ARRAY_BUFFER, pos,    gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, ptColorBuf);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, ptSizeBuf);
    gl.bufferData(gl.ARRAY_BUFFER, sizes,  gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, ptInnerBuf);
    gl.bufferData(gl.ARRAY_BUFFER, innerR, gl.DYNAMIC_DRAW);
  }

  // lines: [{ x1, y1, x2, y2, color: [r,g,b,a] }]  — CSS pixels, straight RGBA.
  function updateLines(lines, dpr = 1) {
    _linesData = lines;
    nLineVerts = lines.length * 2;
    if (!nLineVerts) return;

    const pos    = new Float32Array(nLineVerts * 2);
    const colors = new Float32Array(nLineVerts * 4);

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      const j = i * 2;
      pos[j*2]     = l.x1 * dpr;   pos[j*2 + 1] = l.y1 * dpr;
      pos[j*2 + 2] = l.x2 * dpr;   pos[j*2 + 3] = l.y2 * dpr;
      for (let v = 0; v < 2; v++) {
        const k = (j + v) * 4;
        colors[k]   = l.color[0];
        colors[k+1] = l.color[1];
        colors[k+2] = l.color[2];
        colors[k+3] = l.color[3];
      }
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, lnPosBuf);
    gl.bufferData(gl.ARRAY_BUFFER, pos,    gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, lnColorBuf);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.DYNAMIC_DRAW);
  }

  function render() {
    gl.clearColor(0, 0, 0, 0);   // transparent — back SVG shows through
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (nLineVerts > 0) {
      gl.useProgram(lineProg);
      gl.uniform2f(lp.canvas, _W, _H);

      gl.bindBuffer(gl.ARRAY_BUFFER, lnPosBuf);
      gl.enableVertexAttribArray(lp.pos);
      gl.vertexAttribPointer(lp.pos, 2, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, lnColorBuf);
      gl.enableVertexAttribArray(lp.color);
      gl.vertexAttribPointer(lp.color, 4, gl.FLOAT, false, 0, 0);

      gl.drawArrays(gl.LINES, 0, nLineVerts);
    }

    if (nPoints > 0) {
      gl.useProgram(pointProg);
      gl.uniform2f(pp.canvas, _W, _H);

      gl.bindBuffer(gl.ARRAY_BUFFER, ptPosBuf);
      gl.enableVertexAttribArray(pp.pos);
      gl.vertexAttribPointer(pp.pos, 2, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, ptColorBuf);
      gl.enableVertexAttribArray(pp.color);
      gl.vertexAttribPointer(pp.color, 4, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, ptSizeBuf);
      gl.enableVertexAttribArray(pp.size);
      gl.vertexAttribPointer(pp.size, 1, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, ptInnerBuf);
      gl.enableVertexAttribArray(pp.innerR);
      gl.vertexAttribPointer(pp.innerR, 1, gl.FLOAT, false, 0, 0);

      gl.drawArrays(gl.POINTS, 0, nPoints);
    }
  }

  // Generate SVG elements equivalent to the current WebGL content.
  // Pass clipId (from the back SVG's defs) to clip the points group.
  // Fringe tick lines are not clipped — they live in the margin area.
  // Coordinates are in CSS pixels matching the SVG viewBox coordinate system.
  function toSVGGroup(clipId = null) {
    const ns   = 'http://www.w3.org/2000/svg';
    const root = document.createElementNS(ns, 'g');
    root.setAttribute('class', 'webgl-export');

    // Fringe tick lines (no clip).
    for (const l of _linesData) {
      const [r, g, b, a] = l.color;
      const colorStr = `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
      const el = document.createElementNS(ns, 'line');
      el.setAttribute('x1', l.x1);  el.setAttribute('y1', l.y1);
      el.setAttribute('x2', l.x2);  el.setAttribute('y2', l.y2);
      el.setAttribute('stroke',         colorStr);
      el.setAttribute('stroke-opacity', a);
      el.setAttribute('stroke-width',   '0.75');
      root.appendChild(el);
    }

    // Scatter points (optionally clipped to plot area).
    const pointsG = document.createElementNS(ns, 'g');
    if (clipId) pointsG.setAttribute('clip-path', `url(#${clipId})`);

    for (const p of _pointsData) {
      const [r, g, b, a] = p.color;
      const colorStr = `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
      const circle = document.createElementNS(ns, 'circle');
      circle.setAttribute('cx', p.x);
      circle.setAttribute('cy', p.y);
      circle.setAttribute('r',  p.r);

      if (p.innerRadius > 0) {
        // Censored hollow ring: derive stroke-width from innerRadius.
        // innerRadius = 0.5 * (r - sw) / r  ⟹  sw = r * (1 - 2 * innerRadius)
        const sw = (p.r * (1 - 2 * p.innerRadius)).toFixed(2);
        circle.setAttribute('fill',           'none');
        circle.setAttribute('stroke',         colorStr);
        circle.setAttribute('stroke-opacity', a);
        circle.setAttribute('stroke-width',   sw);
      } else {
        circle.setAttribute('fill',         colorStr);
        circle.setAttribute('fill-opacity', a);
      }
      pointsG.appendChild(circle);
    }

    root.appendChild(pointsG);
    return root;
  }

  function clear() {
    _pointsData = [];
    _linesData  = [];
    nPoints     = 0;
    nLineVerts  = 0;
    if (_W > 0 && _H > 0) {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
  }

  function destroy() {
    [ptPosBuf, ptColorBuf, ptSizeBuf, ptInnerBuf, lnPosBuf, lnColorBuf]
      .forEach(b => gl.deleteBuffer(b));
    gl.deleteProgram(pointProg);
    gl.deleteProgram(lineProg);
  }

  return { updatePoints, updateLines, render, resize, toSVGGroup, clear, destroy };
}
