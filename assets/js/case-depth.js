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
    // a point too faint to change a pixel is not drawn at all: far from the focus they are big discs, and
    // tens of thousands of them, each adding nothing, were most of what the GPU did
    '  bool seen = max(vC.r, max(vC.g, vC.b)) > 0.002;',
    '  gl_PointSize = seen ? min(size, uMaxSize) * uDpr : 0.0;',
    '  gl_Position = seen ? clip : vec4(2.0, 2.0, 2.0, 1.0);',
    '}'
  ].join('\n');
  var FS = 'precision mediump float; varying vec3 vC; void main(){ float r = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vC * (1.0 - smoothstep(0.36, 0.5, r)), 1.0); }';

  var TOK = ['#CC0000', '#FFFFFF', '#ECEFF0', '#D4DADD', '#7F878D', '#CFF0DD', '#0C7135', '#A94722', '#E3ECF7'].map(function (h) {
    return [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
  });
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
  // the colours the motifs share
  var ROAD = [0.3, 0.32, 0.38], STREAM = [0.5, 0.55, 0.66], WHITE = [0.9, 0.9, 0.95], GREY = [0.62, 0.65, 0.72],
    GLASS = [0.78, 0.82, 0.92], TUNNEL = [0.75, 0.8, 0.9], ONE = [1, 1, 1];

  var gl, prog, U = {}, buf = {}, loc = {}, count = 0, F = 800, keys = [];

  // ——— the points, written straight into typed arrays that grow as needed and are kept for the next build ———
  var cap = 0, n = 0, P, C, I;
  function grow() {
    cap = Math.max(65536, cap * 2);
    var p = new Float32Array(cap * 3), c = new Float32Array(cap * 3), q = new Float32Array(cap * 4);
    if (P) { p.set(P); c.set(C); q.set(I); }
    P = p; C = c; I = q;
  }
  var R = Math.random;
  // a point: where, its colour (scaled by k), what moves it (kind), its group, and an extra (a speed)
  function put(x, y, z, c, k, kind, grp, ex) {
    if (n === cap) grow();
    var o = n * 3, o4 = n * 4;
    P[o] = x; P[o + 1] = y; P[o + 2] = z;
    C[o] = c[0] * k; C[o + 1] = c[1] * k; C[o + 2] = c[2] * k;
    I[o4] = kind; I[o4 + 1] = grp || 0; I[o4 + 2] = R(); I[o4 + 3] = ex || 0;
    n++;
  }

  // ——— the motifs: each puts its points round its station (z) and says where the camera stands to see it ———
  var MOTIF = {
    // the hero: open sky
    '': function () { return { e: [0, 0, F], t: [0, 0, 0] }; },
    // things scattered, and the one ring at the end of them
    scatter: function (z, m) {
      var i;
      for (i = 0; i < 16000 * m; i++) put((R() - 0.5) * 1900, (R() - 0.5) * 1200, z + (R() - 0.5) * 1400, PAL[Math.floor(R() * 4)], 0.25 + R() * 0.35, 8);
      for (i = 0; i < 4000 * m; i++) { var a = R() * 6.2832, rr = 380 + (R() - 0.5) * 30; put(Math.cos(a) * rr, Math.sin(a) * rr, z - 700 + (R() - 0.5) * 20, PAL[4], 0.5 + R() * 0.4, 9); }
      gl.uniform3f(U.uRingC, 0, 0, z - 700);
      return { e: [0, 60, z + 1300], e2: [0, 0, z - 380], t: [0, 0, z - 700] };
    },
    // the road, a station on it per roadmap step; the step being read glows
    road: function (z, m, page) {
      var steps = page.steps, i, k, q = [0, 0, 0];
      function road(u) { q[0] = -400 + 800 * u; q[1] = 240 - 480 * u + Math.sin(u * 6.2832) * 120; q[2] = z + 500 - 1000 * u + Math.sin(u * 3.1416) * -200; return q; }
      for (i = 0; i < 6000 * m; i++) { road(R()); put(q[0] + (R() - 0.5) * 8, q[1] + (R() - 0.5) * 8, q[2], ROAD, 1, 0); }
      for (k = 0; k < steps; k++) {
        road((k + 0.5) / steps);
        var cx = q[0], cy = q[1], cz = q[2];
        for (i = 0; i < 5400 / steps * m; i++) {
          var th = R() * 6.2832, ph = Math.acos(2 * R() - 1), r0 = 46 * Math.cbrt(R());
          put(cx + r0 * Math.sin(ph) * Math.cos(th), cy + r0 * Math.cos(ph), cz + r0 * Math.sin(ph) * Math.sin(th), PAL[4], 0.18 + R() * 0.12, 2, k);
        }
      }
      return { e: [-260, 320, z + 1050], t: [0, 0, z] };
    },
    // streams, travelling one way
    streams: function (z, m) {
      for (var i = 0; i < 18000 * m; i++) {
        var b = Math.floor(R() * 7);
        put((R() - 0.5) * 1900, -270 + b * 90 + (R() - 0.5) * 18, z + (b - 3) * 90 + (R() - 0.5) * 30, b === 3 ? PAL[4] : STREAM, b === 3 ? 0.6 : 0.45 + R() * 0.3, 1, 0, 30 + R() * 50);
      }
      gl.uniform3f(U.uStreamC, 0, 0, z); gl.uniform1f(U.uStreamSpan, 1900);
      return { e: [0, 80, z + 820], t: [0, 0, z] };
    },
    // a small world per persona group (or research card); the one being read grows and glows
    clusters: function (z, m, page) {
      var g = Math.max(1, Math.min(4, page.groups)), i, k;
      var at = g === 4 ? [[-320, 200, 100], [320, 200, -100], [-320, -200, -100], [320, -200, 100]]
        : g === 3 ? [[-340, 170, 100], [340, 170, -100], [0, -230, 0]]
        : g === 2 ? [[-300, 0, 60], [300, 0, -60]] : [[0, 0, 0]];
      var pc = at.map(function (p) { return [p[0], p[1], z + p[2]]; });
      for (k = 0; k < g; k++) for (i = 0; i < 16800 / g * m; i++) {
        var th = R() * 6.2832, ph = Math.acos(2 * R() - 1), r = 150 * Math.pow(R(), 0.35);
        put(pc[k][0] + r * Math.sin(ph) * Math.cos(th), pc[k][1] + r * Math.cos(ph), pc[k][2] + r * Math.sin(ph) * Math.sin(th), PAL[k], 0.2 + R() * 0.25, 3, k);
      }
      while (pc.length < 4) pc.push([0, 0, z + 9e4]);
      gl.uniform3fv(U.uPC0, pc[0]); gl.uniform3fv(U.uPC1, pc[1]); gl.uniform3fv(U.uPC2, pc[2]); gl.uniform3fv(U.uPC3, pc[3]);
      return { e: [0, 60, z + 1250], t: [0, 0, z] };
    },
    // three tiers, each as big as its share of the tokens
    tiers: function (z, m) {
      var shares = [0.24, 0.07, 0.69], tierY = [200, 0, -200], i, t;
      for (t = 0; t < 3; t++) for (i = 0; i < 20000 * m * shares[t]; i++) {
        var a = R() * 6.2832, r = Math.sqrt(R());
        var c = t === 0 ? TOK[Math.floor(R() * TOK.length)] : t === 1 ? TOK[Math.floor(R() * 4)] : GREY;
        put(Math.cos(a) * 500 * r, tierY[t] + (R() - 0.5) * 6, z + Math.sin(a) * 320 * r, c, t === 0 ? 0.85 : t === 1 ? 0.5 : 0.3 + R() * 0.25, 0);
      }
      for (i = 0; i < 1800 * m; i++) put((R() - 0.5) * 900, tierY[0], z + (R() - 0.5) * 500, WHITE, 1, 4);
      gl.uniform1f(U.uTierSpan, 400);
      return { e: [0, 760, z + 1450], t: [0, -30, z] };
    },
    // the screens, standing in an arc and facing the camera, each on its own swell
    screens: function (z, m, page) {
      var s = Math.max(1, Math.min(6, page.screens)), wide = page.wide, i, j, k;
      var w = wide ? 300 : 132, h = wide ? 170 : 272, r = wide ? 22 : 26, gap = wide ? 70 : 50, rows = wide ? 5 : 8;
      var span = s * w + (s - 1) * gap;
      for (k = 0; k < s; k++) {
        var cx = -span / 2 + w / 2 + k * (w + gap), u = cx / (span / 2 || 1), cz = z - u * u * 260, yaw = -u * 0.32;
        var cy = (k % 2 ? -1 : 1) * (wide ? 40 : 30), cs = Math.cos(yaw), sn = Math.sin(yaw);
        // a point on the screen's plane, turned toward the camera
        var at = function (x, y, kk, c, b) { put(cx + x * cs, cy + y, cz - x * sn, c, b, 10, kk); };
        // the outline, a rounded rectangle
        for (i = 0; i < 1500 * m; i++) {
          var d = R() * (2 * (w + h)), x, y;
          if (d < w) { x = -w / 2 + d; y = h / 2; } else if (d < w + h) { x = w / 2; y = h / 2 - (d - w); } else if (d < 2 * w + h) { x = w / 2 - (d - w - h); y = -h / 2; } else { x = -w / 2; y = -h / 2 + (d - 2 * w - h); }
          var ox = Math.max(0, Math.abs(x) - (w / 2 - r)), oy = Math.max(0, Math.abs(y) - (h / 2 - r));
          if (ox > 0 && oy > 0) { var l = Math.hypot(ox, oy); x = Math.sign(x) * (w / 2 - r + ox / l * r); y = Math.sign(y) * (h / 2 - r + oy / l * r); }
          at(x, y, k, GLASS, 0.55);
        }
        // the content: rows of light, the first one the accent
        for (j = 0; j < rows; j++) {
          var ry = h / 2 - r - 8 - j * (h - 2 * r - 16) / (rows - 1), rw = (j === 0 ? 0.5 : 0.35 + R() * 0.5) * (w - 2 * r);
          for (i = 0; i < 140 * m; i++) at(-w / 2 + r + R() * rw, ry + (R() - 0.5) * 5, k, j === 0 ? PAL[4] : STREAM, j === 0 ? 0.7 : 0.45 + R() * 0.25);
        }
        // and a faint glass
        for (i = 0; i < 500 * m; i++) at((R() - 0.5) * (w - 8), (R() - 0.5) * (h - 8), k, STREAM, 0.12 + R() * 0.1);
      }
      return { e: [0, 30, z + Math.max(1050, span * 0.62)], t: [0, 0, z - 80] };
    },
    // two rounds, two rings that overlap
    rings: function (z, m) {
      for (var i = 0; i < 7000 * m; i++) {
        var g = R() < 0.5 ? 0 : 1, a = R() * 6.2832, rr = 300 + (R() - 0.5) * 18;
        var x = Math.cos(a) * rr, y = Math.sin(a) * rr;
        put((g ? 150 : -150) + x * (g ? 0.86 : 1), y, z + (g ? x * 0.5 : 0), g ? PAL[2] : PAL[3], 0.35 + R() * 0.35, 0);
      }
      return { e: [0, 0, z + 900], t: [0, 0, z] };
    },
    // four gates and the stream through them
    gates: function (z, m) {
      var i, k, gz = [600, 200, -200, -600];
      for (k = 0; k < 4; k++) for (i = 0; i < 1600 * m; i++) { var a = R() * 6.2832, r = 250 + (R() - 0.5) * 14; put(Math.cos(a) * r, Math.sin(a) * r, z + gz[k], PAL[k], 0.45 + R() * 0.3, 0); }
      for (i = 0; i < 7000 * m; i++) { var a2 = R() * 6.2832, r2 = 200 * Math.sqrt(R()); put(Math.cos(a2) * r2, Math.sin(a2) * r2, z + 800, TUNNEL, 0.3 + R() * 0.3, 5, 0, 120 + R() * 160); }
      gl.uniform1f(U.uTunnelLen, 1600);
      return { e: [0, 0, z + 1300], e2: [0, 0, z - 350], t: [0, 0, z - 800] };
    },
    // the loop: listen, synthesize, ship, validate
    loop: function (z, m) {
      var i, k;
      for (i = 0; i < 6000 * m; i++) { var a = R() * 6.2832, r = 330 + (R() - 0.5) * 22; put(Math.cos(a) * r, Math.sin(a) * r, z + (R() - 0.5) * 22, PAL[Math.floor(a / 1.5708) % 4], 0.3 + R() * 0.25, 6); }
      for (k = 0; k < 4; k++) for (i = 0; i < 800 * m; i++) { var an = k * 1.5708 + 0.785, th = R() * 6.2832, r2 = 40 * Math.sqrt(R()); put(Math.cos(an) * 330 + Math.cos(th) * r2, Math.sin(an) * 330 + Math.sin(th) * r2, z, PAL[k], 0.4, 6); }
      gl.uniform3f(U.uLoopC, 0, 0, z);
      return { e: [0, 140, z + 900], t: [0, 0, z] };
    },
    // one planet, the end of the flight
    planet: function (z, m) {
      var g = Math.floor(14000 * m), col = [0, 0, 0];
      for (var i = 0; i < g; i++) {
        var yS = 1 - (i / (g - 1)) * 2, rad = Math.sqrt(Math.max(0, 1 - yS * yS)), th = i * 2.39996323, q = yS * 0.5 + 0.5;
        col[0] = 0.62 + 0.35 * q; col[1] = 0.84 - 0.4 * q; col[2] = 0.78 - 0.36 * q;
        put(Math.cos(th) * rad * 290, 40 + yS * 290, z + Math.sin(th) * rad * 290, col, 1, 7);
      }
      gl.uniform3f(U.uGlobeC, 0, 40, z);
      return { e: [0, 40, z + 1000], t: [0, 40, z] };
    }
  };

  // ——— the camera's arithmetic, in place: nothing is allocated per frame ———
  var PROJ = new Float32Array(16), VIEW = new Float32Array(16), E = [0, 0, 0], T = [0, 0, 0];
  var KE = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]], KT = [null, null, null, null], VX = [0, 0, 0], VY = [0, 0, 0], VZ = [0, 0, 0];
  function perspective(fovy, aspect, near, far, shift) {
    var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far), m = PROJ;
    m[0] = f / aspect; m[5] = f; m[8] = -shift; m[10] = (far + near) * nf; m[11] = -1; m[14] = 2 * far * near * nf; m[15] = 0;
    return m;
  }
  function lookAt(e, t) {
    var z = VZ, x = VX, y = VY, m = VIEW;
    z[0] = e[0] - t[0]; z[1] = e[1] - t[1]; z[2] = e[2] - t[2];
    var zl = Math.hypot(z[0], z[1], z[2]); z[0] /= zl; z[1] /= zl; z[2] /= zl;
    var xl = Math.hypot(z[2], z[0]); x[0] = z[2] / xl; x[1] = 0; x[2] = -z[0] / xl;
    y[0] = z[1] * x[2] - z[2] * x[1]; y[1] = z[2] * x[0] - z[0] * x[2]; y[2] = z[0] * x[1] - z[1] * x[0];
    m[0] = x[0]; m[1] = y[0]; m[2] = z[0]; m[3] = 0; m[4] = x[1]; m[5] = y[1]; m[6] = z[1]; m[7] = 0; m[8] = x[2]; m[9] = y[2]; m[10] = z[2]; m[11] = 0;
    m[12] = -(x[0] * e[0] + x[1] * e[1] + x[2] * e[2]); m[13] = -(y[0] * e[0] + y[1] * e[1] + y[2] * e[2]); m[14] = -(z[0] * e[0] + z[1] * e[1] + z[2] * e[2]); m[15] = 1;
    return m;
  }
  function catmull(p0, p1, p2, p3, t, out) {
    var t2 = t * t, t3 = t2 * t;
    for (var i = 0; i < 3; i++) out[i] = 0.5 * ((2 * p1[i]) + (-p0[i] + p2[i]) * t + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t2 + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * t3);
    return out;
  }

  window.CaseRenderers = window.CaseRenderers || {};
  window.CaseRenderers.depth = {
    init: function (canvas) {
      gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, powerPreference: 'high-performance' });
      if (!gl) return false;
      function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
      function link(vs, fs) { var p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p; }
      prog = link(VS, FS);
      ['uView', 'uProj', 'uT', 'uDpr', 'uFocus', 'uF', 'uNear', 'uStep', 'uPersona', 'uIn', 'uMaxSize', 'uRes', 'uMouse', 'uMouseOn', 'uTextR', 'uBack', 'uStreamC', 'uStreamSpan', 'uTierSpan', 'uTunnelLen',
       'uLoopC', 'uGlobeC', 'uRingC', 'uPC0', 'uPC1', 'uPC2', 'uPC3'].forEach(function (k) { U[k] = gl.getUniformLocation(prog, k); });
      ['aPos', 'aCol', 'aInfo'].forEach(function (k) { buf[k] = gl.createBuffer(); loc[k] = gl.getAttribLocation(prog, k); });
      gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      gl.clearColor(0.024, 0.027, 0.039, 1);
      return true;
    },
    load: function () { return Promise.resolve(); },
    build: function (env) {
      var W = env.W, H = env.H, m = env.mobile ? 0.32 : 1, i;
      F = H * 0.96;
      plan();
      n = 0;
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
      var far = Z[Z.length - 1] - 2000, star = [0.8, 0.88, 1];
      for (i = 0; i < 7000 * m; i++) put((R() - 0.5) * 5000, (R() - 0.5) * 3400, 800 + R() * (far - 800), star, 0.2 + R() * 0.45, 0);
      // a station per chapter
      keys = WORLD.map(function (name, k) { return MOTIF[name] ? MOTIF[name](Z[k], m, page) : { e: [0, 0, Z[k] + 900], t: [0, 0, Z[k]] }; });
      count = n;
      // one program, one set of buffers: they are bound here once and stay bound
      [['aPos', P, 3, 3], ['aCol', C, 3, 3], ['aInfo', I, 4, 4]].forEach(function (a) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buf[a[0]]); gl.bufferData(gl.ARRAY_BUFFER, a[1].subarray(0, n * a[3]), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(loc[a[0]]); gl.vertexAttribPointer(loc[a[0]], a[2], gl.FLOAT, false, 0, 0);
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
    },
    setDpr: function (env) {
      var c = gl.canvas;
      c.width = Math.round(env.W * env.dpr); c.height = Math.round(env.H * env.dpr);
      gl.viewport(0, 0, c.width, c.height);
      gl.uniform1f(U.uDpr, env.dpr);
    },
    frame: function (env) {
      var W = env.W, H = env.H, last = keys.length - 1, sc = Math.min(last - 0.0001, env.scene), i = Math.floor(sc), f = sc - i;
      f = f * f * (3 - 2 * f);
      var cur = Math.round(env.scene);
      // the four stations round the camera; one that moves while its chapter is read (e2) slides with sub
      for (var j = 0; j < 4; j++) {
        var nn = Math.max(0, Math.min(last, i - 1 + j)), k = keys[nn], ke = KE[j];
        if (k.e2 && nn === cur) { for (var q = 0; q < 3; q++) ke[q] = k.e[q] + (k.e2[q] - k.e[q]) * env.sub; }
        else { ke[0] = k.e[0]; ke[1] = k.e[1]; ke[2] = k.e[2]; }
        KT[j] = k.t;
      }
      var e = catmull(KE[0], KE[1], KE[2], KE[3], f, E), t = catmull(KT[0], KT[1], KT[2], KT[3], f, T);
      var focus = Math.hypot(e[0] - t[0], e[1] - t[1], e[2] - t[2]);
      var mx = env.mouse.x < -9000 ? 0 : (env.mouse.x / W - 0.5) * 2, my = env.mouse.y < -9000 ? 0 : (env.mouse.y / H - 0.5) * 2;
      // eased by the clock, not the frame, so a 120 Hz screen follows no faster
      var ease = 1 - Math.pow(0.95, env.dt / 16.7);
      this.mx = (this.mx || 0) + (mx * env.mouse.on - (this.mx || 0)) * ease;
      this.my = (this.my || 0) + (my * env.mouse.on - (this.my || 0)) * ease;
      if (!env.reduce && env.scene > 0.3) { e[0] += this.mx * 60; e[1] -= this.my * 40; }
      if (this.introAt == null) this.introAt = performance.now();
      var inn = env.reduce ? 1 : Math.min(1, (performance.now() - this.introAt) / 1500);

      // the lens slides the world to the right of the text once the hero is gone
      var shift = env.mobile ? 0 : 0.38 * Math.min(1, env.scene / 0.6);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniformMatrix4fv(U.uView, false, lookAt(e, t)); gl.uniformMatrix4fv(U.uProj, false, perspective(2 * Math.atan(H / (2 * F)), W / H, 5, 30000, shift));
      gl.uniform1f(U.uT, env.t); gl.uniform1f(U.uFocus, focus); gl.uniform1f(U.uIn, inn);
      gl.uniform1f(U.uStep, env.step); gl.uniform1f(U.uPersona, env.persona);
      gl.uniform2f(U.uMouse, env.mouse.x, env.mouse.y); gl.uniform1f(U.uMouseOn, env.reduce ? 0 : env.mouse.on * (env.mobile ? 0 : 1));
      gl.drawArrays(gl.POINTS, 0, count);
    }
  };
})();
