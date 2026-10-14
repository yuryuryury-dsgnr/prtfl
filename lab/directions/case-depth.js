// Depth, for a case page: one long 3D world with a station per chapter,
// and the camera flies it as the text scrolls. The hero picture stays on the
// page and scrolls away with it. On a wide screen the lens is shifted so the
// world hangs to the right of the text.
// Every case builds its world from the same motifs, one per chapter, named in
// CASE.world; counts come from the page (the roadmap's steps, the personas, the screens).
(function () {
  var VS = [
    'precision highp float;',
    'attribute vec3 aPos; attribute vec3 aCol; attribute vec4 aInfo;',
    'uniform mat4 uView, uProj; uniform float uT, uDpr, uFocus, uF, uNear, uStep, uPersona, uIn, uMaxSize;',
    'uniform vec2 uRes, uMouse; uniform float uMouseOn, uTextR, uBack;',
    'uniform vec3 uStreamC; uniform float uStreamSpan, uTierSpan, uTunnelLen;',
    'uniform vec3 uLoopC, uGlobeC, uRingC; uniform vec3 uPC0, uPC1, uPC2, uPC3;',
    'varying vec3 vC;',
    'vec3 rotY(vec3 d, float a){ return vec3(d.x * cos(a) + d.z * sin(a), d.y, -d.x * sin(a) + d.z * cos(a)); }',
    'vec3 rotZ(vec3 d, float a){ return vec3(d.x * cos(a) - d.y * sin(a), d.x * sin(a) + d.y * cos(a), d.z); }',
    'void main(){',
    '  float kind = aInfo.x, grp = aInfo.y, rnd = aInfo.z, ex = aInfo.w;',
    '  vec3 p = aPos; vec3 col = aCol; float glow = 0.0;',
    '  if (kind > 0.5 && kind < 1.5) { p.x = uStreamC.x + mod(p.x - uStreamC.x + uT * ex + uStreamSpan * 0.5, uStreamSpan) - uStreamSpan * 0.5; }',
    '  else if (kind < 2.5 && kind > 1.5) { glow = 1.0 - step(0.5, abs(grp - uStep)); }',
    '  else if (kind < 3.5 && kind > 2.5) {',
    '    vec3 c = grp < 0.5 ? uPC0 : (grp < 1.5 ? uPC1 : (grp < 2.5 ? uPC2 : uPC3));',
    '    glow = 1.0 - step(0.5, abs(grp - uPersona));',
    '    p = c + rotY(p - c, uT * 0.2) * (1.0 + 0.18 * glow);',
    '  }',
    '  else if (kind < 4.5 && kind > 3.5) { p.y -= fract(uT * 0.18 + rnd) * uTierSpan; }',
    '  else if (kind < 5.5 && kind > 4.5) { p.z -= mod(uT * ex + rnd * uTunnelLen, uTunnelLen); }',
    '  else if (kind < 6.5 && kind > 5.5) { p = uLoopC + rotZ(p - uLoopC, uT * 0.3); }',
    '  else if (kind < 7.5 && kind > 6.5) { vec3 d = rotY(p - uGlobeC, uT * 0.15); p = uGlobeC + vec3(d.x, d.y * cos(0.35) - d.z * sin(0.35), d.y * sin(0.35) + d.z * cos(0.35)); }',
    '  else if (kind < 8.5 && kind > 7.5) { p += vec3(sin(uT * 0.3 + rnd * 6.28), cos(uT * 0.25 + rnd * 9.0), sin(uT * 0.2 + rnd * 4.0)) * 18.0; }',
    '  else if (kind < 9.5 && kind > 8.5) { p = uRingC + rotZ(p - uRingC, uT * 0.12); }',
    // a screen floats on its own slow swell
    '  else if (kind > 9.5) { p.y += sin(uT * 0.6 + grp * 1.9) * 12.0; }',
    '  col *= (1.0 + glow * 1.6) * 1.7;',
    '  vec4 v = uView * vec4(p, 1.0); float d = -v.z;',
    '  vec4 clip = uProj * v;',
    '  vec2 ndc = clip.xy / clip.w; vec2 s = (ndc * 0.5 + 0.5) * uRes; s.y = uRes.y - s.y;',
    '  vec2 dm = s - uMouse; float push = smoothstep(120.0, 0.0, length(dm)) * uMouseOn;',
    '  s += normalize(dm + 0.0001) * push * 24.0;',
    '  clip.xy = (vec2(s.x / uRes.x, 1.0 - s.y / uRes.y) * 2.0 - 1.0) * clip.w;',
    '  float persp = uF / max(d, 1.0), blur = abs(d - uFocus) / uFocus;',
    '  float size = (1.5 + rnd * 1.2) * persp + blur * blur * 12.0;',
    '  float a = min(1.0, 7.0 / (size * size));',
    // the next station shows only as a hint: past the focus, light falls away fast
    '  a *= exp(-max(d - uFocus, 0.0) / 650.0) * smoothstep(uNear * 0.2, uNear, d) * uIn;',
    // behind the column of text the world steps back, so the copy stays readable
    '  float behind = 1.0 - smoothstep(uTextR - 40.0, uTextR + 160.0, s.x);',
    '  vC = col * a * (1.0 + push * 0.4) * (1.0 - behind * uBack);',
    '  gl_PointSize = min(size, uMaxSize) * uDpr;',
    '  gl_Position = clip;',
    '}'
  ].join('\n');
  var FS = 'precision mediump float; varying vec3 vC; void main(){ float r = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vC * (1.0 - smoothstep(0.36, 0.5, r)), 1.0); }';

  var TOK = ['#CC0000', '#FFFFFF', '#ECEFF0', '#D4DADD', '#7F878D', '#CFF0DD', '#0C7135', '#A94722', '#E3ECF7'];
  // read from the case when the world is built: the chapters' motifs in order (the first is the hero's
  // open sky), the persona colours then the case's accent, and a station per chapter down −Z
  var WORLD, PAL, Z;
  function plan() {
    var CASE = window.CASE || {};
    WORLD = CASE.world || ['', 'scatter', 'road', 'streams', 'clusters', 'tiers', 'rings', 'gates', 'loop', 'planet'];
    PAL = [[0.56, 0.83, 1.0], [1.0, 0.82, 0.54], [0.72, 0.94, 0.79], [1.0, 0.62, 0.69], CASE.accent || [1.0, 0.36, 0.33]];
    // the first two stations a little further apart
    Z = WORLD.map(function (_, k) { return k < 2 ? -2200 * k : -4400 - 2000 * (k - 2); });
  }

  var gl, prog, U = {}, buf = {}, count = 0, F = 800, keys = [];
  function hex(h) { return [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255]; }
  function perspective(fovy, aspect, near, far, shift) {
    var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, -shift, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
  }
  function lookAt(e, t) {
    var z = [e[0] - t[0], e[1] - t[1], e[2] - t[2]], zl = Math.hypot(z[0], z[1], z[2]); z = z.map(function (v) { return v / zl; });
    var x = [z[2], 0, -z[0]], xl = Math.hypot(x[0], x[1], x[2]); x = x.map(function (v) { return v / xl; });
    var y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
    return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0,
      -(x[0] * e[0] + x[1] * e[1] + x[2] * e[2]), -(y[0] * e[0] + y[1] * e[1] + y[2] * e[2]), -(z[0] * e[0] + z[1] * e[1] + z[2] * e[2]), 1]);
  }
  function catmull(p0, p1, p2, p3, t) {
    var t2 = t * t, t3 = t2 * t;
    return p1.map(function (_, i) { return 0.5 * ((2 * p1[i]) + (-p0[i] + p2[i]) * t + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t2 + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * t3); });
  }

  // ——— the motifs: each puts its points round its station (z) and says where the camera stands to see it ———
  var R = Math.random;
  function sc(c, k) { return [c[0] * k, c[1] * k, c[2] * k]; }
  var MOTIF = {
    // the hero: open sky
    '': function () { return { e: [0, 0, F], t: [0, 0, 0] }; },
    // things scattered, and the one ring at the end of them
    scatter: function (z, put, m) {
      var i;
      for (i = 0; i < 16000 * m; i++) put((R() - 0.5) * 1900, (R() - 0.5) * 1200, z + (R() - 0.5) * 1400, sc(PAL[Math.floor(R() * 4)], 0.25 + R() * 0.35), 8);
      for (i = 0; i < 4000 * m; i++) { var a = R() * 6.2832, rr = 380 + (R() - 0.5) * 30; put(Math.cos(a) * rr, Math.sin(a) * rr, z - 700 + (R() - 0.5) * 20, sc(PAL[4], 0.5 + R() * 0.4), 9); }
      gl.uniform3f(U.uRingC, 0, 0, z - 700);
      return { e: [0, 60, z + 1300], e2: [0, 0, z - 380], t: [0, 0, z - 700] };
    },
    // the road, a station on it per roadmap step; the step being read glows
    road: function (z, put, m, page) {
      var n = page.steps, i, k;
      function road(u) { return [-400 + 800 * u, 240 - 480 * u + Math.sin(u * 6.2832) * 120, z + 500 - 1000 * u + Math.sin(u * 3.1416) * -200]; }
      for (i = 0; i < 6000 * m; i++) { var q = road(R()); put(q[0] + (R() - 0.5) * 8, q[1] + (R() - 0.5) * 8, q[2], [0.3, 0.32, 0.38], 0); }
      for (k = 0; k < n; k++) for (i = 0; i < 5400 / n * m; i++) {
        var c0 = road((k + 0.5) / n), th = R() * 6.2832, ph = Math.acos(2 * R() - 1), r0 = 46 * Math.cbrt(R());
        put(c0[0] + r0 * Math.sin(ph) * Math.cos(th), c0[1] + r0 * Math.cos(ph), c0[2] + r0 * Math.sin(ph) * Math.sin(th), sc(PAL[4], 0.18 + R() * 0.12), 2, k);
      }
      return { e: [-260, 320, z + 1050], t: [0, 0, z] };
    },
    // streams, travelling one way
    streams: function (z, put, m) {
      for (var i = 0; i < 18000 * m; i++) {
        var b = Math.floor(R() * 7);
        put((R() - 0.5) * 1900, -270 + b * 90 + (R() - 0.5) * 18, z + (b - 3) * 90 + (R() - 0.5) * 30, b === 3 ? sc(PAL[4], 0.6) : sc([0.5, 0.55, 0.66], 0.45 + R() * 0.3), 1, 0, 30 + R() * 50);
      }
      gl.uniform3f(U.uStreamC, 0, 0, z); gl.uniform1f(U.uStreamSpan, 1900);
      return { e: [0, 80, z + 820], t: [0, 0, z] };
    },
    // a small world per persona group (or research card); the one being read grows and glows
    clusters: function (z, put, m, page) {
      var n = Math.max(1, Math.min(4, page.groups)), i, k;
      var at = n === 4 ? [[-320, 200, 100], [320, 200, -100], [-320, -200, -100], [320, -200, 100]]
        : n === 3 ? [[-340, 170, 100], [340, 170, -100], [0, -230, 0]]
        : n === 2 ? [[-300, 0, 60], [300, 0, -60]] : [[0, 0, 0]];
      var pc = at.map(function (p) { return [p[0], p[1], z + p[2]]; });
      for (k = 0; k < n; k++) for (i = 0; i < 16800 / n * m; i++) {
        var th = R() * 6.2832, ph = Math.acos(2 * R() - 1), r = 150 * Math.pow(R(), 0.35);
        put(pc[k][0] + r * Math.sin(ph) * Math.cos(th), pc[k][1] + r * Math.cos(ph), pc[k][2] + r * Math.sin(ph) * Math.sin(th), sc(PAL[k], 0.2 + R() * 0.25), 3, k);
      }
      while (pc.length < 4) pc.push([0, 0, z + 9e4]);
      gl.uniform3fv(U.uPC0, pc[0]); gl.uniform3fv(U.uPC1, pc[1]); gl.uniform3fv(U.uPC2, pc[2]); gl.uniform3fv(U.uPC3, pc[3]);
      return { e: [0, 60, z + 1250], t: [0, 0, z] };
    },
    // three tiers, each as big as its share of the tokens
    tiers: function (z, put, m) {
      var shares = [0.24, 0.07, 0.69], tierY = [200, 0, -200], i, n;
      for (n = 0; n < 3; n++) for (i = 0; i < 20000 * m * shares[n]; i++) {
        var a = R() * 6.2832, r = Math.sqrt(R());
        var tc = n === 0 ? sc(hex(TOK[Math.floor(R() * TOK.length)]), 0.85) : (n === 1 ? sc(hex(TOK[Math.floor(R() * 4)]), 0.5) : sc([0.62, 0.65, 0.72], 0.3 + R() * 0.25));
        put(Math.cos(a) * 500 * r, tierY[n] + (R() - 0.5) * 6, z + Math.sin(a) * 320 * r, tc, 0);
      }
      for (i = 0; i < 1800 * m; i++) put((R() - 0.5) * 900, tierY[0], z + (R() - 0.5) * 500, [0.9, 0.9, 0.95], 4);
      gl.uniform1f(U.uTierSpan, 400);
      return { e: [0, 760, z + 1450], t: [0, -30, z] };
    },
    // the screens, standing in an arc and facing the camera, each on its own swell
    screens: function (z, put, m, page) {
      var n = Math.max(1, Math.min(6, page.screens)), wide = page.wide, i, k;
      var w = wide ? 300 : 132, h = wide ? 170 : 272, r = wide ? 22 : 26, gap = wide ? 70 : 50;
      var span = n * w + (n - 1) * gap;
      for (k = 0; k < n; k++) {
        var cx = -span / 2 + w / 2 + k * (w + gap), u = cx / (span / 2 || 1), cz = z - u * u * 260, yaw = -u * 0.32;
        var cy = (k % 2 ? -1 : 1) * (wide ? 40 : 30);
        var px = function (x, y, d) { return [cx + x * Math.cos(yaw) + d * Math.sin(yaw), cy + y, cz - x * Math.sin(yaw) + d * Math.cos(yaw)]; };
        var lit = sc([0.78, 0.82, 0.92], 0.55);
        // the outline, a rounded rectangle
        for (i = 0; i < 1500 * m; i++) {
          var s = R() * (2 * (w + h)), x, y;
          if (s < w) { x = -w / 2 + s; y = h / 2; } else if (s < w + h) { x = w / 2; y = h / 2 - (s - w); } else if (s < 2 * w + h) { x = w / 2 - (s - w - h); y = -h / 2; } else { x = -w / 2; y = -h / 2 + (s - 2 * w - h); }
          // round the corners
          var ox = Math.max(0, Math.abs(x) - (w / 2 - r)), oy = Math.max(0, Math.abs(y) - (h / 2 - r));
          if (ox > 0 && oy > 0) { var l = Math.hypot(ox, oy); x = Math.sign(x) * (w / 2 - r + ox / l * r); y = Math.sign(y) * (h / 2 - r + oy / l * r); }
          var q = px(x, y, 0); put(q[0], q[1], q[2], lit, 10, k);
        }
        // the content: rows of light, the first one the accent
        var rows = wide ? 5 : 8;
        for (var j = 0; j < rows; j++) {
          var ry = h / 2 - r - 8 - j * (h - 2 * r - 16) / (rows - 1), rw = (j === 0 ? 0.5 : 0.35 + R() * 0.5) * (w - 2 * r);
          for (i = 0; i < 140 * m; i++) { var q2 = px(-w / 2 + r + R() * rw, ry + (R() - 0.5) * 5, 0); put(q2[0], q2[1], q2[2], j === 0 ? sc(PAL[4], 0.7) : sc([0.6, 0.64, 0.74], 0.35 + R() * 0.2), 10, k); }
        }
        // and a faint glass
        for (i = 0; i < 500 * m; i++) { var q3 = px((R() - 0.5) * (w - 8), (R() - 0.5) * (h - 8), 0); put(q3[0], q3[1], q3[2], sc([0.5, 0.55, 0.66], 0.12 + R() * 0.1), 10, k); }
      }
      return { e: [0, 30, z + Math.max(1050, span * 0.62)], t: [0, 0, z - 80] };
    },
    // two rounds, two rings that overlap
    rings: function (z, put, m) {
      for (var i = 0; i < 7000 * m; i++) {
        var g = R() < 0.5 ? 0 : 1, a = R() * 6.2832, rr = 300 + (R() - 0.5) * 18;
        var x = Math.cos(a) * rr, y = Math.sin(a) * rr, dz = g ? x * 0.5 : 0;
        put((g ? 150 : -150) + x * (g ? 0.86 : 1), y, z + dz, sc(g ? PAL[2] : PAL[3], 0.35 + R() * 0.35), 0);
      }
      return { e: [0, 0, z + 900], t: [0, 0, z] };
    },
    // four gates and the stream through them
    gates: function (z, put, m) {
      var i;
      [600, 200, -200, -600].forEach(function (gz, k) { for (i = 0; i < 1600 * m; i++) { var a = R() * 6.2832, r = 250 + (R() - 0.5) * 14; put(Math.cos(a) * r, Math.sin(a) * r, z + gz, sc(PAL[k], 0.45 + R() * 0.3), 0); } });
      for (i = 0; i < 7000 * m; i++) { var a2 = R() * 6.2832, r2 = 200 * Math.sqrt(R()); put(Math.cos(a2) * r2, Math.sin(a2) * r2, z + 800, sc([0.75, 0.8, 0.9], 0.3 + R() * 0.3), 5, 0, 120 + R() * 160); }
      gl.uniform1f(U.uTunnelLen, 1600);
      return { e: [0, 0, z + 1300], e2: [0, 0, z - 350], t: [0, 0, z - 800] };
    },
    // the loop: listen, synthesize, ship, validate
    loop: function (z, put, m) {
      var i, n;
      for (i = 0; i < 6000 * m; i++) { var a = R() * 6.2832, r = 330 + (R() - 0.5) * 22; put(Math.cos(a) * r, Math.sin(a) * r, z + (R() - 0.5) * 22, sc(PAL[Math.floor(a / 1.5708) % 4], 0.3 + R() * 0.25), 6); }
      for (n = 0; n < 4; n++) for (i = 0; i < 800 * m; i++) { var an = n * 1.5708 + 0.785, th = R() * 6.2832, r2 = 40 * Math.sqrt(R()); put(Math.cos(an) * 330 + Math.cos(th) * r2, Math.sin(an) * 330 + Math.sin(th) * r2, z, sc(PAL[n], 0.4), 6); }
      gl.uniform3f(U.uLoopC, 0, 0, z);
      return { e: [0, 140, z + 900], t: [0, 0, z] };
    },
    // one planet, the end of the flight
    planet: function (z, put, m) {
      var GC = [0, 40, z], n = Math.floor(14000 * m);
      for (var i = 0; i < n; i++) {
        var yS = 1 - (i / (n - 1)) * 2, rad = Math.sqrt(Math.max(0, 1 - yS * yS)), th = i * 2.39996323, q = yS * 0.5 + 0.5;
        put(GC[0] + Math.cos(th) * rad * 290, GC[1] + yS * 290, GC[2] + Math.sin(th) * rad * 290, [0.62 + 0.35 * q, 0.84 - 0.4 * q, 0.78 - 0.36 * q], 7);
      }
      gl.uniform3fv(U.uGlobeC, GC);
      return { e: [0, 40, z + 1000], t: [0, 40, z] };
    }
  };

  window.CaseRenderers = window.CaseRenderers || {};
  window.CaseRenderers.depth = {
    init: function (canvas) {
      gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, powerPreference: 'high-performance' });
      if (!gl) return false;
      function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
      function link(vs, fs) { var p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p; }
      prog = link(VS, FS);
      ['uView', 'uProj', 'uT', 'uDpr', 'uFocus', 'uF', 'uNear', 'uStep', 'uPersona', 'uIn', 'uMaxSize', 'uRes', 'uMouse', 'uMouseOn', 'uTextR', 'uBack', 'uStreamC', 'uStreamSpan', 'uTierSpan', 'uTunnelLen',
       'uLoopC', 'uGlobeC', 'uRingC', 'uPC0', 'uPC1', 'uPC2', 'uPC3'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
      ['aPos', 'aCol', 'aInfo'].forEach(function (n) { buf[n] = gl.createBuffer(); });
      gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND);
      return true;
    },
    load: function () { return Promise.resolve(); },
    build: function (env) {
      var W = env.W, H = env.H, m = env.mobile ? 0.32 : 1;
      F = H * 0.96;
      plan();
      var P = [], C = [], I = [];
      function put(x, y, z, c, kind, grp, ex) { P.push(x, y, z); C.push(c[0], c[1], c[2]); I.push(kind, grp || 0, R(), ex || 0); }
      // what the page holds, for the motifs that count it
      var shot = document.querySelector('.gal:not(.one) .shot-f img');
      var page = {
        steps: document.querySelectorAll('#steps li').length || 6,
        groups: document.querySelectorAll('[data-g]').length || 4,
        screens: document.querySelectorAll('.gal:not(.one) .shot').length || 4,
        wide: !shot || +shot.getAttribute('width') > +shot.getAttribute('height')
      };
      gl.useProgram(prog);
      // stars, the length of the flight
      var far = Z[Z.length - 1] - 2000;
      for (var i = 0; i < 7000 * m; i++) { var l = 0.2 + R() * 0.45; put((R() - 0.5) * 5000, (R() - 0.5) * 3400, 800 + R() * (far - 800), [l * 0.8, l * 0.88, l], 0); }
      // a station per chapter
      keys = WORLD.map(function (name, k) { return MOTIF[name] ? MOTIF[name](Z[k], put, m, page) : { e: [0, 0, Z[k] + 900], t: [0, 0, Z[k]] }; });
      count = P.length / 3;
      [['aPos', P, 3], ['aCol', C, 3], ['aInfo', I, 4]].forEach(function (a) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buf[a[0]]); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(a[1]), gl.STATIC_DRAW);
      });
      gl.uniform2f(U.uRes, W, H); gl.uniform1f(U.uDpr, env.dpr); gl.uniform1f(U.uF, F); gl.uniform1f(U.uNear, F * 0.35);
      // where the text column ends
      var col = document.querySelector('.col');
      // on a phone the text spans the screen, so the whole world is behind it: it steps back less, but everywhere
      gl.uniform1f(U.uTextR, !col ? -1e4 : env.mobile ? 1e5 : col.getBoundingClientRect().right);
      gl.uniform1f(U.uBack, env.mobile ? 0.5 : 0.82);
      // big bokeh discs are what a phone's GPU pays for
      gl.uniform1f(U.uMaxSize, env.mobile ? 16 : 64);

      var c = gl.canvas;
      c.width = Math.round(W * env.dpr); c.height = Math.round(H * env.dpr);
      gl.viewport(0, 0, c.width, c.height);
      this.W = W; this.H = H;
    },
    setDpr: function (env) {
      var c = gl.canvas;
      c.width = Math.round(env.W * env.dpr); c.height = Math.round(env.H * env.dpr);
      gl.viewport(0, 0, c.width, c.height);
      gl.useProgram(prog); gl.uniform1f(U.uDpr, env.dpr);
    },
    frame: function (env) {
      var W = env.W, H = env.H, last = keys.length - 1, sc = Math.min(last - 0.0001, env.scene), i = Math.floor(sc), f = sc - i;
      f = f * f * (3 - 2 * f);
      var cur = Math.round(env.scene);
      // some stations move while their chapter is read (sub)
      function key(n) {
        var k = keys[Math.max(0, Math.min(last, n))];
        var e = k.e2 && n === cur ? k.e.map(function (v, j) { return v + (k.e2[j] - v) * env.sub; }) : k.e;
        return { e: e, t: k.t };
      }
      var e = catmull(key(i - 1).e, key(i).e, key(i + 1).e, key(i + 2).e, f);
      var t = catmull(key(i - 1).t, key(i).t, key(i + 1).t, key(i + 2).t, f);
      var focus = Math.hypot(e[0] - t[0], e[1] - t[1], e[2] - t[2]);
      var mx = env.mouse.x < -9000 ? 0 : (env.mouse.x / W - 0.5) * 2, my = env.mouse.y < -9000 ? 0 : (env.mouse.y / H - 0.5) * 2;
      this.mx = (this.mx || 0) + (mx * env.mouse.on - (this.mx || 0)) * 0.05;
      this.my = (this.my || 0) + (my * env.mouse.on - (this.my || 0)) * 0.05;
      if (!env.reduce && env.scene > 0.3) { e[0] += this.mx * 60; e[1] -= this.my * 40; }
      if (this.introAt == null) this.introAt = performance.now();
      var inn = env.reduce ? 1 : Math.min(1, (performance.now() - this.introAt) / 1500);

      // the lens slides the world to the right of the text once the hero is gone
      var shift = env.mobile ? 0 : 0.38 * Math.min(1, env.scene / 0.6);
      var proj = perspective(2 * Math.atan(H / (2 * F)), W / H, 5, 30000, shift);
      var view = lookAt(e, t);

      gl.clearColor(0.024, 0.027, 0.039, 1); gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(prog);
      gl.blendFunc(gl.ONE, gl.ONE);
      [['aPos', 3], ['aCol', 3], ['aInfo', 4]].forEach(function (a) {
        var loc = gl.getAttribLocation(prog, a[0]);
        gl.bindBuffer(gl.ARRAY_BUFFER, buf[a[0]]); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, a[1], gl.FLOAT, false, 0, 0);
      });
      gl.uniformMatrix4fv(U.uView, false, view); gl.uniformMatrix4fv(U.uProj, false, proj);
      gl.uniform1f(U.uT, env.t); gl.uniform1f(U.uFocus, focus); gl.uniform1f(U.uIn, inn);
      gl.uniform1f(U.uStep, env.step); gl.uniform1f(U.uPersona, env.persona);
      gl.uniform2f(U.uMouse, env.mouse.x, env.mouse.y); gl.uniform1f(U.uMouseOn, env.reduce ? 0 : env.mouse.on * (env.mobile ? 0 : 1));
      gl.drawArrays(gl.POINTS, 0, count);
    }
  };
})();
