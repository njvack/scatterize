// src/plot/webgl-renderer.js
// Thin WebGL renderer for scatter points and fringe tick lines.
// Receives CSS pixel coordinates; multiplies by dpr internally for the GPU.
//
// Points are rendered as anti-aliased point sprites (filled or hollow rings/diamonds).
// Fringe ticks are rendered as gl.LINES.
// The canvas background is transparent so the back SVG layer shows through.
//
// Color convention: all colors passed in are STRAIGHT RGBA (0-1 each).
// The shaders pre-multiply alpha before writing to the framebuffer so the
// canvas composites correctly over the page (premultipliedAlpha: true default).
//
// Point data shape:
//   { x, y, r, color: [r,g,b,a], innerRadius: 0..0.5, shape: 0..1 }
//   shape: 0 = circle (L2 distance), 1 = diamond (L1 distance).
//   Fractional shape values are valid — transitionTo() interpolates through them,
//   producing a visible circle→diamond morph during the animation.

const ANIM_DUR = 200; // ms for animated transitions

function easeCubicInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

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
// v_size is the sprite diameter in physical pixels.
// a_shape: 0 = circle (L2), 1 = diamond (L1); interpolates during transitions.

const POINT_VERT = `
  precision mediump float;
  attribute vec2  a_pos;
  attribute vec4  a_color;
  attribute float a_size;
  attribute float a_innerR;
  attribute float a_shape;
  uniform   vec2  u_canvas;
  varying   vec4  v_color;
  varying   float v_size;
  varying   float v_innerR;
  varying   float v_shape;
  void main() {
    v_color  = a_color;
    v_size   = a_size;
    v_innerR = a_innerR;
    v_shape  = a_shape;
    vec2 clip    = (a_pos / u_canvas) * 2.0 - 1.0;
    gl_Position  = vec4(clip.x, -clip.y, 0.0, 1.0);
    gl_PointSize = a_size;
  }`;

const POINT_FRAG = `
  precision mediump float;
  varying vec4  v_color;
  varying float v_size;
  varying float v_innerR;
  varying float v_shape;
  void main() {
    vec2  p         = gl_PointCoord - vec2(0.5);
    float d_circle  = length(p);
    // Diamond uses an anisotropic L1 norm scaled by sqrt(3) on x, matching
    // D3 symbolDiamond's tan(30°) aspect ratio (height = sqrt(3) × width).
    float d_diamond = abs(p.x * 1.7320508) + abs(p.y);
    // Blend L2 (circle) and L1 (diamond) metrics — animates the shape morph.
    float d = mix(d_circle, d_diamond, v_shape);
    // Outer edge: anti-alias over ~1.5 physical pixels.
    float outerEdge = max(0.0, 0.5 - 1.5 / v_size);
    float mask = 1.0 - smoothstep(outerEdge, 0.5, d);
    // Inner edge for hollow circles and diamonds.
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
//   transitionTo(pts, lines, dpr) — animate from current state to new pts/lines
//   updatePoints(pts, dpr)        — immediate upload (used by SVG export path)
//   updateLines(lines, dpr)       — immediate upload (used by SVG export path)
//   render()                      — clear + draw lines then points
//   resize(physW, physH)          — resize canvas physical pixels + viewport
//   toSVGGroup(clipId)            — returns <g> with SVG equivalents for export
//   clear()                       — cancel animation, empty buffers, clear canvas
//   destroy()                     — free GL resources
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
    shape:  gl.getAttribLocation(pointProg,  'a_shape'),
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
  const ptShapeBuf = gl.createBuffer();
  const lnPosBuf   = gl.createBuffer();
  const lnColorBuf = gl.createBuffer();

  let nPoints    = 0;
  let nLineVerts = 0;
  let _pointsData = [];   // target pts retained for toSVGGroup()
  let _linesData  = [];   // target lines retained for toSVGGroup()
  let _W = canvas.width, _H = canvas.height;

  // ── Transition state ────────────────────────────────────────────────────────
  let _fromPts      = [];  // pts at start of current transition
  let _fromLines    = [];
  let _displayedPts   = [];  // most recently rendered interpolated state
  let _displayedLines = [];
  let _targetPts    = [];
  let _targetLines  = [];
  let _animId       = null;
  let _animStart    = 0;
  let _dpr          = 1;

  function resize(physW, physH) {
    _W = physW;  _H = physH;
    canvas.width  = physW;
    canvas.height = physH;
    gl.viewport(0, 0, physW, physH);
  }

  // ── Raw GPU uploads ─────────────────────────────────────────────────────────

  function _uploadPts(pts, dpr) {
    nPoints = pts.length;
    if (!nPoints) return;

    const pos    = new Float32Array(nPoints * 2);
    const colors = new Float32Array(nPoints * 4);
    const sizes  = new Float32Array(nPoints);
    const innerR = new Float32Array(nPoints);
    const shapes = new Float32Array(nPoints);

    for (let i = 0; i < nPoints; i++) {
      const p = pts[i];
      pos[i*2]       = p.x * dpr;
      pos[i*2 + 1]   = p.y * dpr;
      colors[i*4]     = p.color[0];
      colors[i*4 + 1] = p.color[1];
      colors[i*4 + 2] = p.color[2];
      colors[i*4 + 3] = p.color[3];
      sizes[i]  = p.r * 2 * dpr;
      innerR[i] = p.innerRadius ?? 0;
      shapes[i] = p.shape ?? 0;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, ptPosBuf);
    gl.bufferData(gl.ARRAY_BUFFER, pos,    gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, ptColorBuf);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, ptSizeBuf);
    gl.bufferData(gl.ARRAY_BUFFER, sizes,  gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, ptInnerBuf);
    gl.bufferData(gl.ARRAY_BUFFER, innerR, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, ptShapeBuf);
    gl.bufferData(gl.ARRAY_BUFFER, shapes, gl.DYNAMIC_DRAW);
  }

  function _uploadLines(lines, dpr) {
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

  // Public immediate-mode updates (kept for SVG export path compatibility).
  function updatePoints(pts, dpr = 1) {
    _pointsData   = pts;
    _displayedPts = pts;
    _uploadPts(pts, dpr);
  }

  function updateLines(lines, dpr = 1) {
    _linesData    = lines;
    _displayedLines = lines;
    _uploadLines(lines, dpr);
  }

  // ── Interpolation helpers ───────────────────────────────────────────────────

  function _interpPt(a, b, t) {
    return {
      x:           a.x           + (b.x           - a.x)           * t,
      y:           a.y           + (b.y           - a.y)           * t,
      r:           a.r           + (b.r           - a.r)           * t,
      innerRadius: a.innerRadius + (b.innerRadius - a.innerRadius) * t,
      shape:       a.shape       + (b.shape       - a.shape)       * t,
      color: [
        a.color[0] + (b.color[0] - a.color[0]) * t,
        a.color[1] + (b.color[1] - a.color[1]) * t,
        a.color[2] + (b.color[2] - a.color[2]) * t,
        a.color[3] + (b.color[3] - a.color[3]) * t,
      ],
    };
  }

  function _interpLine(a, b, t) {
    return {
      x1: a.x1 + (b.x1 - a.x1) * t,
      y1: a.y1 + (b.y1 - a.y1) * t,
      x2: a.x2 + (b.x2 - a.x2) * t,
      y2: a.y2 + (b.y2 - a.y2) * t,
      color: b.color,
    };
  }

  // ── Animation loop ──────────────────────────────────────────────────────────

  function _tick(now) {
    const t  = Math.min(1, (now - _animStart) / ANIM_DUR);
    const te = easeCubicInOut(t);

    // Interpolate if counts match; snap if they differ (e.g. new dataset loaded).
    const pts = _fromPts.length === _targetPts.length
      ? _targetPts.map((b, i) => _interpPt(_fromPts[i], b, te))
      : _targetPts;
    const lines = _fromLines.length === _targetLines.length
      ? _targetLines.map((b, i) => _interpLine(_fromLines[i], b, te))
      : _targetLines;

    _uploadPts(pts, _dpr);
    _uploadLines(lines, _dpr);
    render();

    _displayedPts   = pts;
    _displayedLines = lines;

    if (t < 1) {
      _animId = requestAnimationFrame(_tick);
    } else {
      _animId         = null;
      _displayedPts   = _targetPts;
      _displayedLines = _targetLines;
    }
  }

  // Animate from the current displayed state to newPts/newLines over ANIM_DUR ms.
  // If a transition is already running, it chains smoothly from wherever it is.
  // Pass animate=false to snap immediately (e.g. on window resize).
  function transitionTo(newPts, newLines, dpr = 1, animate = true) {
    _pointsData  = newPts;   // export always reflects target
    _linesData   = newLines;
    _targetPts   = newPts;
    _targetLines = newLines;
    _dpr         = dpr;

    if (_animId != null) cancelAnimationFrame(_animId);

    if (!animate) {
      _uploadPts(newPts, dpr);
      _uploadLines(newLines, dpr);
      _displayedPts   = newPts;
      _displayedLines = newLines;
      _fromPts        = newPts;
      _fromLines      = newLines;
      render();
      return;
    }

    _fromPts   = _displayedPts;
    _fromLines = _displayedLines;
    _animStart = performance.now();
    _animId    = requestAnimationFrame(_tick);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

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

      gl.bindBuffer(gl.ARRAY_BUFFER, ptShapeBuf);
      gl.enableVertexAttribArray(pp.shape);
      gl.vertexAttribPointer(pp.shape, 1, gl.FLOAT, false, 0, 0);

      gl.drawArrays(gl.POINTS, 0, nPoints);
    }
  }

  // Generate SVG elements equivalent to the current WebGL content.
  // Pass clipId (from the back SVG's defs) to clip the points group.
  // Corner diamonds (shape >= 0.5) are not clipped — they live in margin strips.
  // Fringe tick lines are not clipped — they also live in the margin area.
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

    // Corner diamonds (no clip — outside plot area by definition).
    const cornersG = document.createElementNS(ns, 'g');

    // Scatter circles (clipped to plot area).
    const pointsG = document.createElementNS(ns, 'g');
    if (clipId) pointsG.setAttribute('clip-path', `url(#${clipId})`);

    for (const p of _pointsData) {
      const [r, g, b, a] = p.color;
      const colorStr = `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;

      if ((p.shape ?? 0) >= 0.5) {
        // Diamond: same anisotropic proportions as the shader (sqrt(3) taller than wide).
        const hw = (p.r / Math.sqrt(3)).toFixed(2);
        const d = `M ${p.x} ${p.y - p.r} L ${p.x + hw} ${p.y} L ${p.x} ${p.y + p.r} L ${p.x - hw} ${p.y} Z`;
        const el = document.createElementNS(ns, 'path');
        el.setAttribute('d', d);
        if (p.innerRadius > 0) {
          const sw = (p.r * (1 - 2 * p.innerRadius)).toFixed(2);
          el.setAttribute('fill',           'none');
          el.setAttribute('stroke',         colorStr);
          el.setAttribute('stroke-opacity', a);
          el.setAttribute('stroke-width',   sw);
        } else {
          el.setAttribute('fill',         colorStr);
          el.setAttribute('fill-opacity', a);
        }
        cornersG.appendChild(el);
      } else {
        const circle = document.createElementNS(ns, 'circle');
        circle.setAttribute('cx', p.x);
        circle.setAttribute('cy', p.y);
        circle.setAttribute('r',  p.r);
        if (p.innerRadius > 0) {
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
    }

    root.appendChild(cornersG);
    root.appendChild(pointsG);
    return root;
  }

  function clear() {
    if (_animId != null) { cancelAnimationFrame(_animId); _animId = null; }
    _pointsData     = [];
    _linesData      = [];
    _fromPts        = [];
    _fromLines      = [];
    _displayedPts   = [];
    _displayedLines = [];
    _targetPts      = [];
    _targetLines    = [];
    nPoints    = 0;
    nLineVerts = 0;
    if (_W > 0 && _H > 0) {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
  }

  function destroy() {
    if (_animId != null) cancelAnimationFrame(_animId);
    [ptPosBuf, ptColorBuf, ptSizeBuf, ptInnerBuf, ptShapeBuf, lnPosBuf, lnColorBuf]
      .forEach(b => gl.deleteBuffer(b));
    gl.deleteProgram(pointProg);
    gl.deleteProgram(lineProg);
  }

  return { updatePoints, updateLines, render, resize, toSVGGroup, clear, destroy, transitionTo };
}
