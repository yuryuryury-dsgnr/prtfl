// Signal: the page is a terminal. Every scene is rendered first at the
// resolution of a character grid and then drawn as glyphs; the cursor is a
// lens that shows the real picture underneath. Between scenes each cell
// scrambles before it decodes into the next one.
(function () {
  var CASES = [
    { img: '../../assets/images/halliburton/halliburton-card.webp', name: 'Data Marketplace · Halliburton', short: 'Halliburton', line: 'Data search: from weeks to under five minutes', href: '../../cases/halliburton/' },
    { img: '../../assets/images/rebalancer/rebalancer-hero.webp', name: 'Rebalancer', line: 'Designed and built solo, concept to App Store', href: '../../cases/rebalancer/' },
    { img: '../../assets/images/dobrodoc/dobrodoc-cover-v3.webp', name: 'DobroDoc+', line: 'Time to booking cut 40% in usability tests', href: '../../cases/dobrodoc/' },
    { img: '../../assets/images/dopas/dopas-cover-v3.webp', name: 'dopas.dp.ua', line: 'Launched from zero in 2020, earning since', href: '../../cases/dopas/' }
  ];
  var PALETTE = ['#F2D3A0', '#E7A96B', '#C96B4B', '#8E3B46', '#4B3A5C', '#2F5D7C', '#3E9C9C', '#9ED8C8'];
  var LABELS = [
    { band: 0, x: 0.56, text: 'Interface', note: 'what people actually touch' },
    { band: 2, x: 0.2, text: 'Design system', note: 'tokens, components' },
    { band: 4, x: 0.6, text: 'Information architecture', note: '4 personas, 5 flows' },
    { band: 6, x: 0.3, text: 'Research', note: '10 people across 4 roles' },
    { band: 7, x: 0.66, text: 'Pipeline', note: 'Figma → MCP → IDE' }
  ];
  var RAMP = ' .:-=+*#%@';
  var SCRAMBLE = '01<>/\\[]{}$&?!ABCDEFGHKMNPRSTUVXYZ';
  var GLYPHS = RAMP + SCRAMBLE;

  // scenes, shared by the grid pass and the lens
  var COMMON = [
    '#version 300 es',
    'precision highp float;',
    'uniform sampler2D uText, uCov;',
    'uniform vec2 uRes; uniform float uT, uAny, uMobile;',
    'uniform vec4 uHov, uR0, uR1, uR2, uR3;',
    'float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }',
    'const vec3 PAL[8] = vec3[8](' + PALETTE.map(function (h) { var c = BKit.hex(h); return 'vec3(' + c.map(function (v) { return v.toFixed(3); }).join(',') + ')'; }).join(',') + ');',
    'float inR(vec2 p, vec4 r){ return step(r.x, p.x) * step(p.x, r.x + r.z) * step(r.y, p.y) * step(p.y, r.y + r.w); }',
    'vec3 greet(vec2 px){ float m = texture(uText, px / uRes).r; return vec3(0.86, 0.95, 0.9) * m; }',
    'vec3 strata(vec2 px){',
    '  float y0 = uRes.y * (uMobile > 0.5 ? 0.5 : 0.52), band = uRes.y * 0.4 / 8.0; vec3 c = vec3(0.0);',
    '  for (int L = 0; L < 8; L++) {',
    '    float fl = float(L);',
    '    float cy = y0 + fl * band + sin(px.x * 0.0045 + uT * 0.55 + fl * 0.9) * 9.0 + sin(px.x * 0.011 - uT * 0.4) * 3.0;',
    '    float d = (px.y - cy) / (band * 0.45);',
    '    c += PAL[L] * exp(-d * d * 2.2) * (0.55 + 0.45 * sin(px.x * 0.018 - uT * 2.2 + fl * 1.7));',
    '  }',
    '  return c;',
    '}',
    'vec3 covers(vec2 px){',
    '  vec3 c = texture(uCov, px / uRes).rgb;',
    '  float h = inR(px, uR0) * uHov.x + inR(px, uR1) * uHov.y + inR(px, uR2) * uHov.z + inR(px, uR3) * uHov.w;',
    '  return c * (0.35 + 0.65 * (1.0 - uAny) + 0.65 * h);',
    '}'
  ].join('\n');

  // pass 1: one fragment per character cell
  var CELLS = COMMON + '\n' + [
    'uniform vec2 uCell; uniform float uRows, uStage, uGo, uGoI; uniform vec3 uWave;',
    'out vec4 o;',
    'mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }',
    // the donut, as it has always been drawn in characters
    'vec3 donut(vec2 px){',
    '  vec2 c = vec2(uRes.x * 0.5, uRes.y * 0.36); float sc = min(uRes.x, uRes.y) * (uMobile > 0.5 ? 0.32 : 0.22);',
    '  vec2 q = (px - c) / sc; q.y = -q.y;',
    '  vec3 ro = vec3(0.0, 0.0, -4.2), rd = normalize(vec3(q, 3.0));',
    '  float tt = 0.0, d = 1.0; vec3 p;',
    '  for (int i = 0; i < 56; i++) {',
    '    p = ro + rd * tt;',
    '    vec3 r = p; r.yz *= rot(uT * 0.7); r.xy *= rot(uT * 0.43);',
    '    vec2 tq = vec2(length(r.xz) - 1.0, r.y); d = length(tq) - 0.44;',
    '    if (d < 0.002 || tt > 9.0) break; tt += d;',
    '  }',
    '  if (tt > 9.0 || d > 0.01) return vec3(0.0);',
    '  vec3 r = p; r.yz *= rot(uT * 0.7); r.xy *= rot(uT * 0.43);',
    '  vec2 e = vec2(0.002, 0.0);',
    '  vec3 n = normalize(vec3(length(vec2(length(r.xz + e.xy) - 1.0, r.y)) - length(vec2(length(r.xz - e.xy) - 1.0, r.y)),',
    '    length(vec2(length(r.xz) - 1.0, r.y + e.x)) - length(vec2(length(r.xz) - 1.0, r.y - e.x)),',
    '    length(vec2(length(r.xz + e.yx) - 1.0, r.y)) - length(vec2(length(r.xz - e.yx) - 1.0, r.y))));',
    '  float li = 0.1 + 0.9 * max(dot(n, normalize(vec3(-0.4, 0.7, -0.6))), 0.0);',
    '  return mix(vec3(0.62, 0.84, 0.78), vec3(0.95, 0.66, 0.42), r.y * 0.9 + 0.5) * li;',
    '}',
    // four taps, so a cell half on a stroke reads as half bright
    'vec3 sceneCell(int k, vec2 px){',
    '  if (k == 0) { vec2 h = uCell * 0.25; return (greet(px + vec2(-h.x, -h.y)) + greet(px + vec2(h.x, -h.y)) + greet(px + vec2(-h.x, h.y)) + greet(px + h)) * 0.25; }',
    '  if (k == 1) return strata(px);',
    // covers are light UI: drawn as a negative, so the white falls away and the type and the controls stay
    '  if (k == 2) {',
    '    vec2 h = uCell * 0.25;',
    '    vec3 c = (covers(px + vec2(-h.x, -h.y)) + covers(px + vec2(h.x, -h.y)) + covers(px + vec2(-h.x, h.y)) + covers(px + h)) * 0.25;',
    '    float inside = max(max(inR(px, uR0), inR(px, uR1)), max(inR(px, uR2), inR(px, uR3)));',
    '    float hv = inR(px, uR0) * uHov.x + inR(px, uR1) * uHov.y + inR(px, uR2) * uHov.z + inR(px, uR3) * uHov.w;',
    '    float dim = 0.35 + 0.65 * (1.0 - uAny) + 0.65 * hv;',
    '    vec3 raw = texture(uCov, px / uRes).rgb;',
    '    float mx = max(raw.r, max(raw.g, raw.b));',
    '    float l = dot((c / max(dim, 0.01)), vec3(0.299, 0.587, 0.114));',
    // UI greys sit between 0.6 and 1: stretch that range, or the type disappears into the dots
    '    float inv = max(pow(smoothstep(0.985, 0.55, l), 0.7), 0.1);',
    '    return inside * (raw / max(mx, 0.04)) * inv * dim;',
    '  }',
    '  return donut(px);',
    '}',
    'void main(){',
    '  vec2 ij = floor(gl_FragCoord.xy);',
    '  vec2 px = vec2((ij.x + 0.5) * uCell.x, uRes.y - (ij.y + 0.5) * uCell.y);',
    '  float rnd = hash(ij);',
    '  float seg = min(floor(uStage), 2.0), f = uStage - seg;',
    '  float t = clamp((f - rnd * 0.4) / 0.6, 0.0, 1.0);',
    '  int A = int(seg);',
    '  vec3 c = t < 0.5 ? sceneCell(A, px) : sceneCell(A + 1, px);',
    // in between, a cell is noise
    '  float scr = step(0.1, t) * step(t, 0.9);',
    // the greeting sits on a field of faint static
    '  if (A == 0 && t < 0.5) c += vec3(0.25, 0.35, 0.3) * step(0.988, hash(ij + floor(uT * 1.7)));',
    // a click sends a ring of noise out from where it landed
    '  float age = uT - uWave.z; float dw = length(px - uWave.xy);',
    '  scr = max(scr, step(abs(dw - age * 700.0), 36.0) * step(age, 1.3));',
    // opening a case: everything else breaks up
    '  vec4 R = uGoI < 0.5 ? uR0 : (uGoI < 1.5 ? uR1 : (uGoI < 2.5 ? uR2 : uR3));',
    '  float keep = inR(px, R) * step(-0.5, uGoI);',
    '  scr = max(scr, step(rnd, uGo * 1.2) * (1.0 - keep));',
    '  c *= 1.0 - smoothstep(0.5, 1.0, uGo) * (1.0 - keep);',
    '  o = vec4(c, scr);',
    '}'
  ].join('\n');

  // pass 2: glyphs on screen, the lens, a hint of a tube
  var GLYPH = COMMON + '\n' + [
    'uniform sampler2D uCells, uAtlas;',
    'uniform vec2 uCell, uMouse; uniform float uDpr, uG, uRamp, uLens, uLensOn, uStage, uGo, uGoI, uScan;',
    'in vec2 vUv; out vec4 o;',
    'vec3 sceneFull(int k, vec2 px){ if (k == 0) return greet(px); if (k == 1) return strata(px); if (k == 2) return covers(px); return vec3(-1.0); }',
    'void main(){',
    '  vec2 fp = gl_FragCoord.xy / uDpr;',
    '  vec2 ij = floor(fp / uCell); vec2 lc = fract(fp / uCell);',
    '  vec4 cell = texelFetch(uCells, ivec2(ij), 0);',
    '  vec3 c = cell.rgb;',
    '  float lum = dot(c, vec3(0.299, 0.587, 0.114));',
    '  float gi;',
    '  vec3 col;',
    '  if (cell.a > 0.5) {',
    '    gi = uRamp + floor(hash(ij + floor(uT * 16.0)) * (uG - uRamp));',
    '    col = vec3(0.49, 1.0, 0.7) * (0.55 + 0.45 * hash(ij * 1.7 + floor(uT * 9.0)));',
    '  } else {',
    '    gi = floor(clamp(pow(lum, 0.75) * 1.15, 0.0, 0.999) * uRamp);',
    // the glyph carries the brightness; the colour keeps only the hue
    '    float mx = max(c.r, max(c.g, c.b));',
    '    col = c / max(mx, 0.04) * (0.5 + 0.5 * min(1.0, mx * 1.3));',
    '  }',
    '  vec2 auv = vec2((gi + 0.06 + lc.x * 0.88) / uG, 1.0 - (0.04 + lc.y * 0.92));',
    '  float m = texture(uAtlas, auv).r;',
    '  vec3 outc = col * m;',
    // the lens, and a hovered or opening cover, show what the characters stand for
    '  vec2 px = vec2(fp.x, uRes.y - fp.y);',
    '  float dl = length(px - uMouse);',
    '  float seg = min(floor(uStage), 2.0), f = uStage - seg; int A = int(seg);',
    '  float w3 = A == 2 ? smoothstep(0.3, 0.7, f) : 0.0;',
    '  float lens = (1.0 - smoothstep(uLens - 1.5, uLens, dl)) * uLensOn * (1.0 - w3);',
    '  float cov = A == 2 ? 1.0 - smoothstep(0.0, 0.3, f) : (A == 1 ? smoothstep(0.7, 1.0, f) : 0.0);',
    '  float h = inR(px, uR0) * uHov.x + inR(px, uR1) * uHov.y + inR(px, uR2) * uHov.z + inR(px, uR3) * uHov.w;',
    '  vec4 R = uGoI < 0.5 ? uR0 : (uGoI < 1.5 ? uR1 : (uGoI < 2.5 ? uR2 : uR3));',
    '  float reveal = max(lens, max(h * cov * 0.92, inR(px, R) * step(-0.5, uGoI) * smoothstep(0.0, 0.35, uGo)));',
    '  if (reveal > 0.001) {',
    '    vec3 a = sceneFull(A, px);',
    '    vec3 b = A < 2 ? sceneFull(A + 1, px) : a;',
    '    vec3 real = mix(a, b, smoothstep(0.35, 0.65, f));',
    '    outc = mix(outc, real, reveal);',
    '  }',
    '  outc += vec3(0.49, 1.0, 0.7) * (1.0 - smoothstep(0.0, 1.6, abs(dl - uLens))) * 0.55 * uLensOn * (1.0 - w3);',
    '  outc *= 1.0 - uScan * 0.12 * step(0.5, fract(gl_FragCoord.y * 0.5));',
    '  o = vec4(max(outc, vec3(0.016, 0.024, 0.02)), 1.0);',
    '}'
  ].join('\n');
  var QUAD_VS = '#version 300 es\nout vec2 vUv;\nvoid main(){ vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2); vUv = p; gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }';

  var gl, P = {}, tex = {}, cellFbo, cols = 0, rows = 0, cell = [9, 15], layout = [], images = [], labels = [], vao;

  function program(fs, names) {
    function sh(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    var p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, QUAD_VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    var u = {}; names.forEach(function (n) { u[n] = gl.getUniformLocation(p, n); });
    return { p: p, u: u };
  }
  function canvasTex(t, canvas, filter) {
    t = t || gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter || gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter || gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  var SHARED = ['uText', 'uCov', 'uRes', 'uT', 'uAny', 'uMobile', 'uHov', 'uR0', 'uR1', 'uR2', 'uR3'];
  var renderer = {
    init: function (env) {
      gl = document.getElementById('gl').getContext('webgl2', { antialias: false, alpha: false, depth: false });
      if (!gl) return false;
      P.cells = program(CELLS, SHARED.concat(['uCell', 'uRows', 'uStage', 'uGo', 'uGoI', 'uWave']));
      P.glyph = program(GLYPH, SHARED.concat(['uCells', 'uAtlas', 'uCell', 'uMouse', 'uDpr', 'uG', 'uRamp', 'uLens', 'uLensOn', 'uStage', 'uGo', 'uGoI', 'uScan']));
      vao = gl.createVertexArray();
      tex.cells = gl.createTexture();
      cellFbo = gl.createFramebuffer();
      var wrap = document.getElementById('sigLabels');
      labels = LABELS.map(function (l) {
        var el = document.createElement('div'); el.className = 'fl'; el.style.color = PALETTE[l.band];
        el.innerHTML = '<i></i><span>' + l.text + ' <b>· ' + l.note + '</b></span>';
        wrap.appendChild(el); return el;
      });
      return true;
    },
    load: function (tick) {
      var fonts = document.fonts ? Promise.all([document.fonts.load('700 100px Inter'), document.fonts.load('500 40px "JetBrains Mono"')]) : Promise.resolve();
      return fonts.then(function () { tick(0.2); return BKit.loadImages(CASES.map(function (c) { return c.img; }), tick, 1, 5); })
        .then(function (imgs) {
          images = imgs;
          // the glyph atlas: one row, white on black
          var gw = 40, gh = 64, a = document.createElement('canvas');
          a.width = gw * GLYPHS.length; a.height = gh;
          var x = a.getContext('2d');
          x.fillStyle = '#000'; x.fillRect(0, 0, a.width, a.height);
          x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
          x.font = '500 ' + Math.round(gh * 0.74) + 'px "JetBrains Mono", monospace';
          for (var i = 0; i < GLYPHS.length; i++) x.fillText(GLYPHS[i], i * gw + gw / 2, gh / 2 + 2);
          tex.atlas = canvasTex(null, a);
        });
    },
    build: function (env) {
      var W = env.W, H = env.H, mobile = env.mobile;
      cell = mobile ? [7, 12] : [9, 15];
      cols = Math.ceil(W / cell[0]); rows = Math.ceil(H / cell[1]);

      // the greeting, as a plain bitmap
      var tc = document.createElement('canvas'); tc.width = W; tc.height = H;
      var x = tc.getContext('2d');
      x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
      var lines = mobile ? ['Hi! I’m', 'Yurii'] : ['Hi! I’m Yurii'];
      x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#fff';
      x.font = '700 100px Inter, sans-serif';
      var widest = Math.max.apply(null, lines.map(function (l) { return x.measureText(l).width; }));
      var fs = Math.min(100 * (W * (mobile ? 0.86 : 0.8)) / widest, H * (mobile ? 0.22 : 0.32));
      x.font = '700 ' + fs + 'px Inter, sans-serif';
      lines.forEach(function (l, i) { x.fillText(l, W / 2, H * (mobile ? 0.34 : 0.4) + (i - (lines.length - 1) / 2) * fs * 0.98); });
      tex.text = canvasTex(tex.text, tc);

      // the covers composed where they hang
      layout = BKit.coverLayout(W, H, mobile);
      var cc = document.createElement('canvas'); cc.width = W; cc.height = H;
      var cx = cc.getContext('2d');
      cx.fillStyle = '#000'; cx.fillRect(0, 0, W, H);
      layout.forEach(function (r, k) {
        cx.save(); cx.translate(r.x, r.y); cx.beginPath(); cx.rect(0, 0, r.w, r.h); cx.clip();
        BKit.coverDraw(cx, images[k], r.w, r.h); cx.restore();
      });
      tex.cov = canvasTex(tex.cov, cc);

      // the cell grid the first pass draws into
      gl.bindTexture(gl.TEXTURE_2D, tex.cells);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, cols, rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.bindFramebuffer(gl.FRAMEBUFFER, cellFbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex.cells, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      var canvas = gl.canvas;
      canvas.width = Math.round(W * env.dpr); canvas.height = Math.round(H * env.dpr);
      env.tags = layout.map(function (r) { return { x: r.x, y: r.y + r.h, w: r.w, top: r.y }; });
    },
    frame: function (env) {
      var W = env.W, H = env.H, stage = Math.min(2.9999, env.stage);
      gl.bindVertexArray(vao);
      function shared(u) {
        gl.uniform1i(u.uText, 1); gl.uniform1i(u.uCov, 2);
        gl.uniform2f(u.uRes, W, H); gl.uniform1f(u.uT, env.t); gl.uniform1f(u.uAny, env.any); gl.uniform1f(u.uMobile, env.mobile ? 1 : 0);
        gl.uniform4f(u.uHov, env.hov[0], env.hov[1], env.hov[2], env.hov[3]);
        [u.uR0, u.uR1, u.uR2, u.uR3].forEach(function (loc, k) { var r = layout[k]; gl.uniform4f(loc, r.x, r.y, r.w, r.h); });
      }
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tex.text);
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, tex.cov);

      // pass 1 — the scene at character resolution
      var u = P.cells.u;
      gl.useProgram(P.cells.p);
      gl.bindFramebuffer(gl.FRAMEBUFFER, cellFbo);
      gl.viewport(0, 0, cols, rows);
      shared(u);
      gl.uniform2f(u.uCell, cell[0], cell[1]); gl.uniform1f(u.uRows, rows); gl.uniform1f(u.uStage, stage);
      gl.uniform1f(u.uGo, env.g); gl.uniform1f(u.uGoI, env.go >= 0 ? env.go : -9);
      gl.uniform3f(u.uWave, env.wave.x, env.wave.y, env.reduce ? -10 : env.wave.t);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // pass 2 — glyphs
      u = P.glyph.u;
      gl.useProgram(P.glyph.p);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      shared(u);
      gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, tex.cells); gl.uniform1i(u.uCells, 3);
      gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, tex.atlas); gl.uniform1i(u.uAtlas, 4);
      gl.uniform2f(u.uCell, cell[0], cell[1]); gl.uniform2f(u.uMouse, env.mouse.x, env.mouse.y);
      gl.uniform1f(u.uDpr, env.dpr); gl.uniform1f(u.uG, GLYPHS.length); gl.uniform1f(u.uRamp, RAMP.length);
      this.lens = (this.lens || 0) + ((env.mouse.x > -9000 && !env.mobile ? 1 : 0) * Math.min(1, env.mouse.on * 1.4) - (this.lens || 0)) * 0.12;
      gl.uniform1f(u.uLens, env.mobile ? 90 : 120); gl.uniform1f(u.uLensOn, this.lens);
      gl.uniform1f(u.uStage, stage); gl.uniform1f(u.uGo, env.g); gl.uniform1f(u.uGoI, env.go >= 0 ? env.go : -9);
      gl.uniform1f(u.uScan, env.reduce ? 0 : 1);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // labels on the bands, as in the other two
      var near = Math.max(0, 1 - Math.abs(env.stage - 1) / 0.35);
      var band = H * 0.4 / 8, top0 = H * (env.mobile ? 0.5 : 0.52);
      LABELS.forEach(function (l, i) {
        var x = (env.mobile ? 0.06 : l.x) * W;
        var y = top0 + l.band * band + Math.sin(x * 0.0045 + env.t * 0.55 + l.band * 0.9) * 9 + Math.sin(x * 0.011 - env.t * 0.4) * 3;
        var o = Math.max(0, Math.min(1, near * 1.8 - i * 0.16));
        labels[i].style.opacity = o;
        labels[i].style.transform = 'translate(' + (x - 3.5) + 'px,' + (y - 10) + 'px)';
      });
    },
    coverAt: function (x, y) {
      for (var k = 0; k < layout.length; k++) {
        var r = layout[k];
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return k;
      }
      return -1;
    }
  };

  BKit({ cases: CASES, renderer: renderer });
})();
