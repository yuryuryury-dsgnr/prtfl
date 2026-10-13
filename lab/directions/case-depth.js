// Depth, for a case page: one long 3D world with a station per chapter,
// and the camera flies it as the text scrolls. The hero picture is a real
// plane that first sits exactly under the picture on the page, then is left
// behind. On a wide screen the lens is shifted so the world hangs to the
// right of the text.
(function () {
  var VS = [
    'precision highp float;',
    'attribute vec3 aPos; attribute vec3 aCol; attribute vec4 aInfo;',
    'uniform mat4 uView, uProj; uniform float uT, uDpr, uFocus, uF, uNear, uStep, uPersona, uIn, uMaxSize;',
    'uniform vec2 uRes, uMouse; uniform float uMouseOn;',
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
    '  else if (kind > 8.5) { p = uRingC + rotZ(p - uRingC, uT * 0.12); }',
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
    '  a *= exp(-max(d - uFocus, 0.0) / 1500.0) * smoothstep(uNear * 0.2, uNear, d) * uIn;',
    '  vC = col * a * (1.0 + push * 0.4);',
    '  gl_PointSize = min(size, uMaxSize) * uDpr;',
    '  gl_Position = clip;',
    '}'
  ].join('\n');
  var FS = 'precision mediump float; varying vec3 vC; void main(){ float r = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vC * (1.0 - smoothstep(0.36, 0.5, r)), 1.0); }';
  var QVS = 'attribute vec3 aPos; attribute vec2 aUv; uniform mat4 uView, uProj; varying vec2 vUv; void main(){ vUv = aUv; gl_Position = uProj * uView * vec4(aPos, 1.0); }';
  var QFS = 'precision mediump float; uniform sampler2D uTex; uniform float uA; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(uTex, vUv).rgb * uA, uA); }';

  var PAL = [[0.56, 0.83, 1.0], [1.0, 0.82, 0.54], [0.72, 0.94, 0.79], [1.0, 0.62, 0.69], [1.0, 0.36, 0.33]];
  var TOK = ['#CC0000', '#FFFFFF', '#ECEFF0', '#D4DADD', '#7F878D', '#CFF0DD', '#0C7135', '#A94722', '#E3ECF7'];
  var Z = [0, -2200, -4400, -6400, -8400, -10400, -12400, -14400, -16400, -18400];
  var PC = [[-320, 200, -8300], [320, 200, -8500], [-320, -200, -8500], [320, -200, -8300]];

  var gl, prog, qprog, U = {}, QU = {}, buf = {}, qbuf, qtex, count = 0, F = 800, keys = [], heroWorld = null, img;
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

  window.CaseRenderers = window.CaseRenderers || {};
  window.CaseRenderers.depth = {
    init: function (canvas) {
      gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, powerPreference: 'high-performance' });
      if (!gl) return false;
      function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
      function link(vs, fs) { var p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p; }
      prog = link(VS, FS); qprog = link(QVS, QFS);
      ['uView', 'uProj', 'uT', 'uDpr', 'uFocus', 'uF', 'uNear', 'uStep', 'uPersona', 'uIn', 'uMaxSize', 'uRes', 'uMouse', 'uMouseOn', 'uStreamC', 'uStreamSpan', 'uTierSpan', 'uTunnelLen',
       'uLoopC', 'uGlobeC', 'uRingC', 'uPC0', 'uPC1', 'uPC2', 'uPC3'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
      ['uView', 'uProj', 'uTex', 'uA'].forEach(function (n) { QU[n] = gl.getUniformLocation(qprog, n); });
      QU.aPos = gl.getAttribLocation(qprog, 'aPos'); QU.aUv = gl.getAttribLocation(qprog, 'aUv');
      ['aPos', 'aCol', 'aInfo'].forEach(function (n) { buf[n] = gl.createBuffer(); });
      qbuf = gl.createBuffer(); qtex = gl.createTexture();
      gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND);
      return true;
    },
    load: function () {
      return new Promise(function (res, rej) {
        img = new Image(); img.src = document.getElementById('heroImg').src;
        img.onload = res; img.onerror = rej;
        if (img.complete && img.naturalWidth) res();
      }).then(function () {
        // power-of-two, so it can be mipmapped as it falls away into the distance
        var c = document.createElement('canvas'); c.width = 2048; c.height = 1024;
        c.getContext('2d').drawImage(img, 0, 0, 2048, 1024);
        gl.bindTexture(gl.TEXTURE_2D, qtex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      });
    },
    build: function (env) {
      var W = env.W, H = env.H, R = Math.random, m = env.mobile ? 0.32 : 1;
      F = H * 0.96;
      var P = [], C = [], I = [];
      function put(x, y, z, c, kind, grp, ex) { P.push(x, y, z); C.push(c[0], c[1], c[2]); I.push(kind, grp || 0, R(), ex || 0); }
      function sc(c, k) { return [c[0] * k, c[1] * k, c[2] * k]; }
      var i, n;
      // stars, the length of the flight
      for (i = 0; i < 7000 * m; i++) { var l = 0.2 + R() * 0.45; put((R() - 0.5) * 5000, (R() - 0.5) * 3400, 800 - R() * 20500, [l * 0.8, l * 0.88, l], 0); }
      // 01 — the scatter, and the one ring at the end of it
      for (i = 0; i < 16000 * m; i++) put((R() - 0.5) * 1900, (R() - 0.5) * 1200, Z[1] + (R() - 0.5) * 1400, sc(PAL[Math.floor(R() * 4)], 0.25 + R() * 0.35), 8);
      for (i = 0; i < 4000 * m; i++) { var a = R() * 6.2832, rr = 380 + (R() - 0.5) * 30; put(Math.cos(a) * rr, Math.sin(a) * rr, Z[1] - 700 + (R() - 0.5) * 20, sc(PAL[4], 0.5 + R() * 0.4), 9); }
      // 02 — the road and its six stations
      function road(u) { return [-400 + 800 * u, 240 - 480 * u + Math.sin(u * 6.2832) * 120, Z[2] + 500 - 1000 * u + Math.sin(u * 3.1416) * -200]; }
      for (i = 0; i < 6000 * m; i++) { var q = road(R()); put(q[0] + (R() - 0.5) * 8, q[1] + (R() - 0.5) * 8, q[2], [0.3, 0.32, 0.38], 0); }
      for (n = 0; n < 6; n++) for (i = 0; i < 900 * m; i++) {
        var c0 = road((n + 0.5) / 6), th = R() * 6.2832, ph = Math.acos(2 * R() - 1), r0 = 46 * Math.cbrt(R());
        put(c0[0] + r0 * Math.sin(ph) * Math.cos(th), c0[1] + r0 * Math.cos(ph), c0[2] + r0 * Math.sin(ph) * Math.sin(th), sc(PAL[4], 0.18 + R() * 0.12), 2, n);
      }
      // 03 — streams, travelling one way
      for (i = 0; i < 18000 * m; i++) {
        var b = Math.floor(R() * 7);
        put((R() - 0.5) * 1900, -270 + b * 90 + (R() - 0.5) * 18, Z[3] + (b - 3) * 90 + (R() - 0.5) * 30, b === 3 ? sc(PAL[4], 0.6) : sc([0.5, 0.55, 0.66], 0.45 + R() * 0.3), 1, 0, 30 + R() * 50);
      }
      // 04 — four persona groups, four small worlds
      for (n = 0; n < 4; n++) for (i = 0; i < 4200 * m; i++) {
        var th2 = R() * 6.2832, ph2 = Math.acos(2 * R() - 1), r2 = 150 * Math.pow(R(), 0.35);
        put(PC[n][0] + r2 * Math.sin(ph2) * Math.cos(th2), PC[n][1] + r2 * Math.cos(ph2), PC[n][2] + r2 * Math.sin(ph2) * Math.sin(th2), sc(PAL[n], 0.2 + R() * 0.25), 3, n);
      }
      // 05 — three tiers, each as big as its share of the tokens
      var shares = [0.24, 0.07, 0.69], tierY = [200, 0, -200];
      for (n = 0; n < 3; n++) for (i = 0; i < 20000 * m * shares[n]; i++) {
        var a3 = R() * 6.2832, r3 = Math.sqrt(R());
        var tc = n === 0 ? sc(hex(TOK[Math.floor(R() * TOK.length)]), 0.85) : (n === 1 ? sc(hex(TOK[Math.floor(R() * 4)]), 0.5) : sc([0.62, 0.65, 0.72], 0.3 + R() * 0.25));
        put(Math.cos(a3) * 500 * r3, tierY[n] + (R() - 0.5) * 6, Z[5] + Math.sin(a3) * 320 * r3, tc, 0);
      }
      for (i = 0; i < 1800 * m; i++) put((R() - 0.5) * 900, tierY[0], Z[5] + (R() - 0.5) * 500, [0.9, 0.9, 0.95], 4);
      // 06 — two sessions, two rings that overlap
      for (i = 0; i < 7000 * m; i++) {
        var g = R() < 0.5 ? 0 : 1, a4 = R() * 6.2832, rr4 = 300 + (R() - 0.5) * 18;
        var x4 = Math.cos(a4) * rr4, y4 = Math.sin(a4) * rr4, z4 = g ? x4 * 0.5 : 0;
        put((g ? 150 : -150) + x4 * (g ? 0.86 : 1), y4, Z[6] + z4, sc(g ? PAL[2] : PAL[3], 0.35 + R() * 0.35), 0);
      }
      // 07 — the hand-off: four gates and the stream through them
      var gateZ = [-13800, -14200, -14600, -15000];
      gateZ.forEach(function (gz, k) { for (i = 0; i < 1600 * m; i++) { var a5 = R() * 6.2832, r5 = 250 + (R() - 0.5) * 14; put(Math.cos(a5) * r5, Math.sin(a5) * r5, gz, sc(PAL[k], 0.45 + R() * 0.3), 0); } });
      for (i = 0; i < 7000 * m; i++) { var a6 = R() * 6.2832, r6 = 200 * Math.sqrt(R()); put(Math.cos(a6) * r6, Math.sin(a6) * r6, -13600, sc([0.75, 0.8, 0.9], 0.3 + R() * 0.3), 5, 0, 120 + R() * 160); }
      // 08 — the loop: listen, synthesize, ship, validate
      var LC = [0, 0, Z[8]];
      for (i = 0; i < 6000 * m; i++) { var a7 = R() * 6.2832, r7 = 330 + (R() - 0.5) * 22; put(Math.cos(a7) * r7, Math.sin(a7) * r7, Z[8] + (R() - 0.5) * 22, sc(PAL[Math.floor(a7 / 1.5708) % 4], 0.3 + R() * 0.25), 6); }
      for (n = 0; n < 4; n++) for (i = 0; i < 800 * m; i++) { var an = n * 1.5708 + 0.785, th3 = R() * 6.2832, r8 = 40 * Math.sqrt(R()); put(Math.cos(an) * 330 + Math.cos(th3) * r8, Math.sin(an) * 330 + Math.sin(th3) * r8, Z[8], sc(PAL[n], 0.4), 6); }
      // 09 — one planet, the end of the flight
      var GC = [0, 40, Z[9]], gN = Math.floor(14000 * m);
      for (i = 0; i < gN; i++) {
        var yS = 1 - (i / (gN - 1)) * 2, rad = Math.sqrt(Math.max(0, 1 - yS * yS)), th4 = i * 2.39996323, qq = yS * 0.5 + 0.5;
        put(GC[0] + Math.cos(th4) * rad * 290, GC[1] + yS * 290, GC[2] + Math.sin(th4) * rad * 290, [0.62 + 0.35 * qq, 0.84 - 0.4 * qq, 0.78 - 0.36 * qq], 7);
      }
      count = P.length / 3;
      gl.useProgram(prog);
      [['aPos', P, 3], ['aCol', C, 3], ['aInfo', I, 4]].forEach(function (a) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buf[a[0]]); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(a[1]), gl.STATIC_DRAW);
      });
      gl.uniform3f(U.uStreamC, 0, 0, Z[3]); gl.uniform1f(U.uStreamSpan, 1900); gl.uniform1f(U.uTierSpan, 400); gl.uniform1f(U.uTunnelLen, 1600);
      gl.uniform3fv(U.uLoopC, LC); gl.uniform3fv(U.uGlobeC, GC); gl.uniform3f(U.uRingC, 0, 0, Z[1] - 700);
      gl.uniform3fv(U.uPC0, PC[0]); gl.uniform3fv(U.uPC1, PC[1]); gl.uniform3fv(U.uPC2, PC[2]); gl.uniform3fv(U.uPC3, PC[3]);
      gl.uniform2f(U.uRes, W, H); gl.uniform1f(U.uDpr, env.dpr); gl.uniform1f(U.uF, F); gl.uniform1f(U.uNear, F * 0.35);
      // big bokeh discs are what a phone's GPU pays for
      gl.uniform1f(U.uMaxSize, env.mobile ? 16 : 64);

      var c = gl.canvas;
      c.width = Math.round(W * env.dpr); c.height = Math.round(H * env.dpr);
      gl.viewport(0, 0, c.width, c.height);
      // a station per chapter; some move while their chapter is read (sub)
      keys = [
        { e: [0, 0, F], t: [0, 0, 0] },
        { e: [0, 60, -900], e2: [0, 0, Z[1] - 380], t: [0, 0, Z[1] - 700] },
        { e: [-260, 320, Z[2] + 1050], t: [0, 0, Z[2]] },
        { e: [0, 80, Z[3] + 820], t: [0, 0, Z[3]] },
        { e: [0, 60, -7150], t: [0, 0, -8400] },
        { e: [0, 760, Z[5] + 1450], t: [0, -30, Z[5]] },
        { e: [0, 0, Z[6] + 900], t: [0, 0, Z[6]] },
        { e: [0, 0, -13100], e2: [0, 0, -14750], t: [0, 0, -15200] },
        { e: [0, 140, Z[8] + 900], t: [0, 0, Z[8]] },
        { e: [0, 40, Z[9] + 1000], t: [0, 40, Z[9]] }
      ];
      this.W = W; this.H = H;
    },
    setDpr: function (env) {
      var c = gl.canvas;
      c.width = Math.round(env.W * env.dpr); c.height = Math.round(env.H * env.dpr);
      gl.viewport(0, 0, c.width, c.height);
      gl.useProgram(prog); gl.uniform1f(U.uDpr, env.dpr);
    },
    frame: function (env) {
      var W = env.W, H = env.H, sc = Math.min(8.9999, env.scene), i = Math.floor(sc), f = sc - i;
      f = f * f * (3 - 2 * f);
      var cur = Math.round(env.scene);
      function key(n) {
        var k = keys[Math.max(0, Math.min(9, n))];
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

      // the hero plane: matches the picture on the page until the flight starts, then stays where it was
      if (env.scene < 0.001 || !heroWorld) {
        var r = env.heroRect;
        heroWorld = [[r.x - W / 2, H / 2 - r.y], [r.x + r.w - W / 2, H / 2 - r.y], [r.x - W / 2, H / 2 - r.y - r.h], [r.x + r.w - W / 2, H / 2 - r.y - r.h]];
      }
      var ha = 1 - Math.min(1, Math.max(0, (env.scene - 0.9) / 0.5));
      if (ha > 0.001) {
        var hw = heroWorld;
        gl.useProgram(qprog);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.uniformMatrix4fv(QU.uView, false, view); gl.uniformMatrix4fv(QU.uProj, false, proj);
        gl.uniform1f(QU.uA, ha); gl.uniform1i(QU.uTex, 0);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, qtex);
        gl.bindBuffer(gl.ARRAY_BUFFER, qbuf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
          hw[0][0], hw[0][1], 0, 0, 0, hw[2][0], hw[2][1], 0, 0, 1, hw[1][0], hw[1][1], 0, 1, 0,
          hw[1][0], hw[1][1], 0, 1, 0, hw[2][0], hw[2][1], 0, 0, 1, hw[3][0], hw[3][1], 0, 1, 1]), gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(QU.aPos); gl.vertexAttribPointer(QU.aPos, 3, gl.FLOAT, false, 20, 0);
        gl.enableVertexAttribArray(QU.aUv); gl.vertexAttribPointer(QU.aUv, 2, gl.FLOAT, false, 20, 12);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }

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
