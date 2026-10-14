// Depth: nothing morphs. Every point has one place in a 3D world and the
// camera flies between them — through the greeting, over a cut-away block
// of strata, up to the covers, out to a planet. Focus follows the camera,
// so what it looks at is sharp and the rest opens into bokeh.
(function () {
  var CASES = [
    { img: '../../assets/images/halliburton/halliburton-hero.webp', name: 'Data Marketplace · Halliburton', short: 'Halliburton', line: 'Cut data search from weeks to minutes', href: '../../cases/halliburton/?v=depth&from=depth' },
    { img: '../../assets/images/rebalancer/rebalancer-hero.webp', name: 'Rebalancer', line: 'Built solo, shipped to App Store', href: '../../cases/rebalancer/' },
    { img: '../../assets/images/dobrodoc/dobrodoc-cover-v3.webp', name: 'DobroDoc+', line: 'Cut booking time 40% in usability tests', href: '../../cases/dobrodoc/' },
    { img: '../../assets/images/dopas/dopas-cover-v3.webp', name: 'dopas.dp.ua', line: 'Launched from zero, now generating revenue', href: '../../cases/dopas/' }
  ];
  var PALETTE = ['#F2D3A0', '#E7A96B', '#C96B4B', '#8E3B46', '#4B3A5C', '#2F5D7C', '#3E9C9C', '#9ED8C8'];
  var LABELS = [
    { layer: 0, x: -0.2, text: 'Interface', note: 'Main, Explore, Detail, Request Access, Admin' },
    { layer: 2, x: 0.25, text: 'Design system', note: 'Three-tier token architecture' },
    { layer: 4, x: -0.35, text: 'Information architecture', note: '4 personas · 5 flows · IA' },
    { layer: 6, x: 0.15, text: 'Research', note: '10 participants across 4 roles' },
    { layer: 7, x: -0.05, text: 'Pipeline', note: 'Figma MCP · live specs' }
  ];
  // where things sit along the flight
  var Z_STRATA_FRONT = -1300, Z_STRATA_BACK = -2300, Z_COVERS = -3400, Z_GLOBE = -5200;
  var BLOCK_X = 900;

  var VS = [
    'precision highp float;',
    'attribute vec3 aPos; attribute vec3 aCol; attribute vec4 aInfo;',
    'uniform mat4 uView, uProj; uniform float uT, uDpr, uFocus, uSp, uF, uAny, uGo, uGoI, uIn, uNear, uCovVis, uMaxSize;',
    'uniform vec4 uHov; uniform vec2 uRes, uMouse; uniform float uMouseOn; uniform vec3 uWave, uGlobe; uniform vec2 uGlobeRot;',
    'varying vec3 vC; varying float vA; varying float vSq;',
    'void main(){',
    '  float kind = aInfo.x, grp = aInfo.y, rnd = aInfo.z;',
    '  vec3 p = aPos; float lit = 1.0; float sq = 0.0;',
    '  if (kind < 0.5) { p.xy += vec2(sin(uT * 0.8 + rnd * 6.28), cos(uT * 0.7 + rnd * 9.0)) * 1.2; }',
    '  else if (kind < 1.5) { p.y += sin(p.x * 0.004 + uT * 0.5 + grp) * 5.0; }',
    '  else if (kind < 2.5) {',
    '    float h = grp < 0.5 ? uHov.x : (grp < 1.5 ? uHov.y : (grp < 2.5 ? uHov.z : uHov.w));',
    '    p.z += h * 46.0;',
    '    lit = 0.3 + 0.9 * h + (1.0 - uAny) * 0.7;',
    '    float chosen = 1.0 - step(0.5, abs(grp - uGoI));',
    '    lit *= 1.0 - uGo * (1.0 - chosen);',
    '    sq = 1.0;',
    '  }',
    '  else if (kind < 3.5) {',
    '    vec3 d = p - uGlobe; float a = uGlobeRot.x;',
    '    d = vec3(d.x * cos(a) + d.z * sin(a), d.y, -d.x * sin(a) + d.z * cos(a));',
    '    float b = uGlobeRot.y; d = vec3(d.x, d.y * cos(b) - d.z * sin(b), d.y * sin(b) + d.z * cos(b));',
    '    p = uGlobe + d;',
    '  }',
    '  else { lit = 0.55 + 0.45 * sin(uT * (0.5 + rnd * 2.0) + rnd * 30.0); }',
    '  vec4 v = uView * vec4(p, 1.0);',
    '  float d = -v.z;',
    '  vec4 clip = uProj * v;',
    // the cursor and a click work on the picture, not the world
    '  vec2 ndc = clip.xy / clip.w;',
    '  vec2 s = (ndc * 0.5 + 0.5) * uRes; s.y = uRes.y - s.y;',
    '  vec2 dm = s - uMouse; float dist = length(dm);',
    '  float push = smoothstep(130.0, 0.0, dist) * (1.0 - sq * 0.85) * uMouseOn;',
    '  s += normalize(dm + 0.0001) * push * 28.0;',
    '  float age = uT - uWave.z; vec2 dw = s - uWave.xy; float dwl = length(dw);',
    '  float ring = exp(-pow((dwl - age * 900.0) / 60.0, 2.0)) * max(0.0, 1.0 - age / 1.3) * (1.0 - sq * 0.85);',
    '  s += normalize(dw + 0.0001) * ring * 34.0;',
    '  ndc = vec2(s.x / uRes.x, 1.0 - s.y / uRes.y) * 2.0 - 1.0;',
    '  clip.xy = ndc * clip.w;',
    // perspective size, plus a disc that opens up away from the focus distance
    '  float persp = uF / max(d, 1.0);',
    '  float blur = abs(d - uFocus) / uFocus;',
    '  float size; float alpha;',
    // the covers only show up when the flight reaches them, never through a caption
    '  if (sq > 0.5) { size = (uSp + 0.6) * persp; alpha = uCovVis; }',
    '  else {',
    '    size = (1.6 + rnd * 1.2) * persp + blur * blur * 14.0;',
    // a disc that grows keeps its light, it does not gain any
    '    alpha = min(1.0, 7.0 / (size * size));',
    '  }',
    '  alpha *= exp(-max(d - uFocus, 0.0) / 1300.0);',
    '  alpha *= smoothstep(uNear * 0.25, uNear, d);',
    '  alpha *= uIn;',
    // big bokeh discs are what a phone's GPU pays for: they stay smaller there
    '  size = min(size, uMaxSize);',
    '  vC = aCol * lit * alpha * (1.0 + (push + ring) * 0.5);',
    '  vA = alpha; vSq = sq;',
    '  gl_PointSize = size * uDpr;',
    '  gl_Position = clip;',
    '}'
  ].join('\n');
  var FS = [
    'precision mediump float;',
    'varying vec3 vC; varying float vA; varying float vSq;',
    'void main(){',
    '  float r = length(gl_PointCoord - 0.5);',
    // a bokeh disc is flat with a soft rim, not a gaussian
    '  float disc = 1.0 - smoothstep(0.38, 0.5, r);',
    '  float m = mix(disc, 1.0, vSq);',
    '  gl_FragColor = vec4(vC * m, vA * m);',
    '}'
  ].join('\n');

  var gl, prog, U = {}, buffers = {}, counts = { add: 0, cov: 0 }, layout = [], world = [], sp = 3, F = 800, images = [];
  // the covers are not points: each is a textured plane, mipmapped, so it stays sharp at any distance
  var QVS = [
    'attribute vec3 aPos; attribute vec2 aUv;',
    'uniform mat4 uView, uProj; uniform float uLift, uNear, uFocus;',
    'varying vec2 vUv; varying float vFade;',
    'void main(){',
    '  vec3 p = aPos; p.z += uLift;',
    '  vec4 v = uView * vec4(p, 1.0); float d = -v.z;',
    '  vFade = smoothstep(uNear * 0.25, uNear, d) * exp(-max(d - uFocus, 0.0) / 1300.0);',
    '  vUv = aUv; gl_Position = uProj * v;',
    '}'
  ].join('\n');
  var QFS = [
    'precision mediump float;',
    'uniform sampler2D uTex; uniform float uAlpha, uLit;',
    'varying vec2 vUv; varying float vFade;',
    'void main(){ float a = uAlpha * vFade; gl_FragColor = vec4(texture2D(uTex, vUv).rgb * uLit * a, a); }'
  ].join('\n');
  var qprog, QU = {}, quads = [];
  var view = new Float32Array(16), proj = new Float32Array(16), labels = [];

  function perspective(fovy, aspect, near, far) {
    var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
  }
  function lookAt(e, t) {
    var z = [e[0] - t[0], e[1] - t[1], e[2] - t[2]], zl = Math.hypot(z[0], z[1], z[2]);
    z = [z[0] / zl, z[1] / zl, z[2] / zl];
    var x = [z[2], 0, -z[0]], xl = Math.hypot(x[0], x[1], x[2]); // up × z with up = (0,1,0)
    x = [x[0] / xl, x[1] / xl, x[2] / xl];
    var y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
    return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0,
      -(x[0] * e[0] + x[1] * e[1] + x[2] * e[2]), -(y[0] * e[0] + y[1] * e[1] + y[2] * e[2]), -(z[0] * e[0] + z[1] * e[1] + z[2] * e[2]), 1]);
  }
  function project(p, W, H) {
    var v = view, q = proj;
    var vx = v[0] * p[0] + v[4] * p[1] + v[8] * p[2] + v[12];
    var vy = v[1] * p[0] + v[5] * p[1] + v[9] * p[2] + v[13];
    var vz = v[2] * p[0] + v[6] * p[1] + v[10] * p[2] + v[14];
    var cx = q[0] * vx, cy = q[5] * vy, cw = -vz;
    if (cw <= 1) return null;
    return { x: (cx / cw * 0.5 + 0.5) * W, y: (1 - (cy / cw * 0.5 + 0.5)) * H, d: cw };
  }
  // the strata's layer boundaries, shared by the points and the labels pinned to them
  function yb(L, x, z) {
    return -80 - L * 44 + Math.sin(x * 0.004 + L * 0.7) * 16 + Math.sin(z * 0.005 + L) * 12 + Math.cos((x + z) * 0.002) * 9;
  }
  function catmull(p0, p1, p2, p3, t) {
    var t2 = t * t, t3 = t2 * t;
    return p1.map(function (_, i) {
      return 0.5 * ((2 * p1[i]) + (-p0[i] + p2[i]) * t + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t2 + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * t3);
    });
  }

  var renderer = {
    init: function (env) {
      var canvas = document.getElementById('gl');
      gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, powerPreference: 'high-performance' });
      if (!gl) return false;
      function sh(type, src) {
        var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
        return s;
      }
      prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
      gl.useProgram(prog);
      ['uView', 'uProj', 'uT', 'uDpr', 'uFocus', 'uSp', 'uF', 'uAny', 'uGo', 'uGoI', 'uIn', 'uNear', 'uCovVis', 'uMaxSize', 'uHov', 'uRes', 'uMouse', 'uMouseOn', 'uWave', 'uGlobe', 'uGlobeRot']
        .forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
      [['aPos', 3], ['aCol', 3], ['aInfo', 4]].forEach(function (a) {
        buffers[a[0]] = gl.createBuffer();
        var loc = gl.getAttribLocation(prog, a[0]);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers[a[0]]);
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, a[1], gl.FLOAT, false, 0, 0);
      });
      qprog = gl.createProgram();
      gl.attachShader(qprog, sh(gl.VERTEX_SHADER, QVS)); gl.attachShader(qprog, sh(gl.FRAGMENT_SHADER, QFS));
      gl.linkProgram(qprog);
      if (!gl.getProgramParameter(qprog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(qprog));
      ['uView', 'uProj', 'uLift', 'uNear', 'uFocus', 'uTex', 'uAlpha', 'uLit'].forEach(function (n) { QU[n] = gl.getUniformLocation(qprog, n); });
      QU.aPos = gl.getAttribLocation(qprog, 'aPos'); QU.aUv = gl.getAttribLocation(qprog, 'aUv');
      for (var q = 0; q < 4; q++) quads.push({ buf: gl.createBuffer(), tex: gl.createTexture() });
      gl.useProgram(prog);
      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      var wrap = document.getElementById('depthLabels');
      labels = LABELS.map(function (l) {
        var el = document.createElement('div'); el.className = 'fl'; el.style.color = PALETTE[l.layer];
        el.innerHTML = '<i></i><span>' + l.text + ' <b>· ' + l.note + '</b></span>';
        wrap.appendChild(el); return el;
      });
      return true;
    },
    load: function (tick) {
      var fonts = document.fonts ? document.fonts.load('700 100px Inter') : Promise.resolve();
      return fonts.then(function () { tick(0.2); return BKit.loadImages(CASES.map(function (c) { return c.img; }), tick, 1, 5); })
        .then(function (imgs) { images = imgs; });
    },
    build: function (env) {
      var W = env.W, H = env.H, mobile = env.mobile, R = Math.random;
      F = H * 0.96;
      var add = { p: [], c: [], i: [] }, cov = { p: [], c: [], i: [] };
      function put(b, x, y, z, r, g, bl, kind, grp, size) { b.p.push(x, y, z); b.c.push(r, g, bl); b.i.push(kind, grp, R(), size || 0); }

      // stars, the length of the flight
      var stars = mobile ? 2000 : 7000;
      for (var i = 0; i < stars; i++) {
        var l = 0.25 + R() * 0.5;
        put(add, (R() - 0.5) * 5000, (R() - 0.5) * 3200, 900 - R() * 8000, l * 0.8, l * 0.88, l, 4, 0);
      }
      // the greeting, a slab a little thick, at the start of the flight
      var g = BKit.greeting(W, H, mobile), gn = g.length / 2, names = mobile ? 15000 : 42000;
      for (i = 0; i < names; i++) {
        var j = Math.floor(R() * gn) * 2, b = 0.55 + R() * 0.45;
        put(add, g[j] - W / 2 + (R() - 0.5) * 2, H / 2 - g[j + 1] + (R() - 0.5) * 2, (R() - 0.5) * 40, 0.82 * b, 0.86 * b, 0.95 * b, 0, 0);
      }
      // a cut-away block of strata: front face, top, sides, and three faint inner surfaces
      var faces = mobile ? 17000 : 56000, zf = Z_STRATA_FRONT, zb = Z_STRATA_BACK;
      function layerCol(L, k) { var c = BKit.hex(PALETTE[L]); return [c[0] * k, c[1] * k, c[2] * k]; }
      for (i = 0; i < faces; i++) {
        var u = R(), x, y, z, L = Math.floor(R() * PALETTE.length), col;
        if (u < 0.42) { x = (R() - 0.5) * 2 * BLOCK_X; z = zf; }
        else if (u < 0.62) { x = R() < 0.5 ? -BLOCK_X : BLOCK_X; z = zf + (zb - zf) * R(); }
        if (u < 0.62) {
          var y0 = yb(L, x, z), y1 = yb(L + 1, x, z);
          y = y1 + (y0 - y1) * R(); col = layerCol(L, 0.5 + R() * 0.45);
          put(add, x, y, z, col[0], col[1], col[2], 1, L * 0.9);
        } else if (u < 0.88) {
          x = (R() - 0.5) * 2 * BLOCK_X; z = zf + (zb - zf) * R();
          col = layerCol(0, 0.45 + R() * 0.4);
          put(add, x, yb(0, x, z), z, col[0], col[1], col[2], 1, 0);
        } else {
          var Li = 2 + Math.floor(R() * 3) * 2;
          x = (R() - 0.5) * 2 * BLOCK_X; z = zf + (zb - zf) * R();
          col = layerCol(Li, 0.18 + R() * 0.12);
          put(add, x, yb(Li, x, z), z, col[0], col[1], col[2], 1, Li * 0.9);
        }
      }
      // the planet at the end
      var globe = mobile ? 7000 : 16000, gr = Math.min(W, H) * (mobile ? 0.36 : 0.27);
      var gc = [0, H * 0.12, Z_GLOBE];
      for (i = 0; i < globe; i++) {
        var yS = 1 - (i / (globe - 1)) * 2, rad = Math.sqrt(Math.max(0, 1 - yS * yS)), th = i * 2.39996323;
        var q = (yS * 0.5 + 0.5);
        put(add, gc[0] + Math.cos(th) * rad * gr, gc[1] + yS * gr, gc[2] + Math.sin(th) * rad * gr,
          0.62 + 0.33 * q, 0.84 - 0.18 * q, 0.78 - 0.36 * q, 3, 0);
      }
      this.globe = gc;

      // the covers, a slightly opened book of four, each a real picture on a plane
      var Lr = BKit.coverLayout(W, H, mobile);
      layout = []; world = [];
      var TW = mobile ? 1024 : 2048, TH = TW / 2;
      for (var k = 0; k < 4; k++) {
        var r = Lr[k], cw = r.w, ch = r.h;
        var ang = (k % 2 ? -1 : 1) * 0.09, cxw = r.x + cw / 2 - W / 2;
        // crop to the cover's shape, then stretch into a power-of-two texture so it can be mipmapped;
        // the plane stretches it back
        var img = images[k], ia = img.naturalWidth / img.naturalHeight, ra = cw / ch;
        var sw = ia > ra ? img.naturalHeight * ra : img.naturalWidth, shh = ia > ra ? img.naturalHeight : img.naturalWidth / ra;
        var tc = document.createElement('canvas'); tc.width = TW; tc.height = TH;
        tc.getContext('2d').drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - shh) / 2, sw, shh, 0, 0, TW, TH);
        gl.bindTexture(gl.TEXTURE_2D, quads[k].tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tc);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        var aniso = gl.getExtension('EXT_texture_filter_anisotropic');
        if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
        // the corners, for hit tests and the labels under each cover
        var corners = [[r.x, r.y], [r.x + cw, r.y], [r.x, r.y + ch], [r.x + cw, r.y + ch]].map(function (pt) {
          var wx2 = pt[0] - W / 2, d2 = wx2 - cxw;
          return [cxw + d2 * Math.cos(ang), H / 2 - pt[1], Z_COVERS + d2 * Math.sin(ang)];
        });
        world.push({ corners: corners, center: [cxw, H / 2 - (r.y + ch / 2), Z_COVERS], w: cw, h: ch });
        var tl = corners[0], tr = corners[1], bl = corners[2], br = corners[3];
        gl.bindBuffer(gl.ARRAY_BUFFER, quads[k].buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
          tl[0], tl[1], tl[2], 0, 0, bl[0], bl[1], bl[2], 0, 1, tr[0], tr[1], tr[2], 1, 0,
          tr[0], tr[1], tr[2], 1, 0, bl[0], bl[1], bl[2], 0, 1, br[0], br[1], br[2], 1, 1
        ]), gl.STATIC_DRAW);
      }

      counts.add = add.p.length / 3; counts.cov = cov.p.length / 3;
      function cat(a, b) { var o = new Float32Array(a.length + b.length); o.set(a); o.set(b, a.length); return o; }
      var data = { aPos: cat(add.p, cov.p), aCol: cat(add.c, cov.c), aInfo: cat(add.i, cov.i) };
      Object.keys(data).forEach(function (n) { gl.bindBuffer(gl.ARRAY_BUFFER, buffers[n]); gl.bufferData(gl.ARRAY_BUFFER, data[n], gl.STATIC_DRAW); });
      this.near = F * 0.35;

      var canvas = gl.canvas;
      canvas.width = Math.round(W * env.dpr); canvas.height = Math.round(H * env.dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      proj = perspective(2 * Math.atan(H / (2 * F)), W / H, 5, 12000);
      gl.uniformMatrix4fv(U.uProj, false, proj);
      gl.uniform2f(U.uRes, W, H); gl.uniform1f(U.uDpr, env.dpr); gl.uniform1f(U.uSp, sp); gl.uniform1f(U.uF, F);
      gl.uniform1f(U.uMaxSize, mobile ? 16 : 70);
      gl.uniform1f(U.uNear, F * 0.35);
      gl.uniform3f(U.uGlobe, gc[0], gc[1], gc[2]);

      // the flight: one station per stage
      this.keys = [
        { e: [0, 0, F], t: [0, 0, 0], f: F },
        { e: [-260, 250, -420], t: [0, -230, -1750], f: 1150 },
        { e: [0, 0, Z_COVERS + F], t: [0, 0, Z_COVERS], f: F },
        { e: [0, 0, Z_GLOBE + F * 1.5], t: [0, 0, Z_GLOBE], f: F * 1.5 }
      ];
      this.rot = this.rot || 0;
    },
    frame: function (env) {
      var W = env.W, H = env.H, K = this.keys;
      // the camera: along a spline through the stations, eased into each
      var st = Math.min(2.9999, env.stage), i = Math.floor(st), f = st - i;
      f = f * f * (3 - 2 * f);
      function key(n) { return K[Math.max(0, Math.min(3, n))]; }
      var e = catmull(key(i - 1).e, key(i).e, key(i + 1).e, key(i + 2).e, f);
      var t = catmull(key(i - 1).t, key(i).t, key(i + 1).t, key(i + 2).t, f);
      var focus = key(i).f + (key(i + 1).f - key(i).f) * f;
      // on load the camera eases in from far back
      if (this.intro == null) this.intro = performance.now();
      var inn = env.reduce ? 1 : Math.min(1, (performance.now() - this.intro) / 2400);
      var ie = 1 - Math.pow(1 - inn, 3);
      e[2] += (1 - ie) * 1800; focus += (1 - ie) * 1800;
      // the cursor turns the head a little
      var mx = env.mouse.x < -9000 ? 0 : (env.mouse.x / W - 0.5) * 2, my = env.mouse.y < -9000 ? 0 : (env.mouse.y / H - 0.5) * 2;
      this.mx = (this.mx || 0) + (mx * env.mouse.on - (this.mx || 0)) * 0.06;
      this.my = (this.my || 0) + (my * env.mouse.on - (this.my || 0)) * 0.06;
      if (!env.reduce) { e[0] += this.mx * 70; e[1] -= this.my * 45; t[0] += this.mx * 18; t[1] -= this.my * 12; }
      // opening a case flies into its cover
      if (env.go >= 0) {
        var wc = world[env.go], g = env.g * env.g * (3 - 2 * env.g);
        var dFill = F * Math.min(wc.w / W, wc.h / H) * 0.98;
        var ge = [wc.center[0], wc.center[1], wc.center[2] + dFill];
        e = e.map(function (v, k) { return v + (ge[k] - v) * g; });
        t = t.map(function (v, k) { return v + (wc.center[k] - v) * g; });
        focus += (dFill - focus) * g;
      }
      view = lookAt(e, t);

      this.rot += 0.0025 + this.mx * 0.01;
      gl.uniformMatrix4fv(U.uView, false, view);
      gl.uniform1f(U.uT, env.t); gl.uniform1f(U.uFocus, focus); gl.uniform1f(U.uIn, Math.min(1, inn * 1.6));
      gl.uniform1f(U.uCovVis, Math.max(0, Math.min(1, 1.6 - Math.abs(env.stage - 2) * 1.8)));
      gl.uniform1f(U.uAny, env.any); gl.uniform1f(U.uGo, env.g); gl.uniform1f(U.uGoI, env.go >= 0 && !window.Handoff ? env.go : -9);
      gl.uniform4f(U.uHov, env.hov[0], env.hov[1], env.hov[2], env.hov[3]);
      gl.uniform2f(U.uMouse, env.reduce ? -9999 : env.mouse.x, env.mouse.y);
      gl.uniform1f(U.uMouseOn, env.reduce ? 0 : env.mouse.p);
      gl.uniform3f(U.uWave, env.wave.x, env.wave.y, env.wave.t);
      gl.uniform2f(U.uGlobeRot, this.rot, 0.35 + this.my * 0.4);

      gl.clearColor(0.024, 0.027, 0.039, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      // light first, added together; then the covers laid over it
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.drawArrays(gl.POINTS, 0, counts.add);
      var covVis = Math.max(0, Math.min(1, 1.6 - Math.abs(env.stage - 2) * 1.8));
      if (covVis > 0.001) {
        gl.useProgram(qprog);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.uniformMatrix4fv(QU.uView, false, view); gl.uniformMatrix4fv(QU.uProj, false, proj);
        gl.uniform1f(QU.uNear, this.near); gl.uniform1f(QU.uFocus, focus); gl.uniform1i(QU.uTex, 0);
        gl.activeTexture(gl.TEXTURE0);
        for (var k = 0; k < 4; k++) {
          var h = env.hov[k], chosen = env.go === k ? 1 : 0;
          gl.uniform1f(QU.uLift, h * 46);
          gl.uniform1f(QU.uLit, (0.3 + 0.9 * h + (1 - env.any) * 0.7) * (1 - env.g * (1 - chosen)));
          // once the box above the canvas has crossed in (handoff.js), the plane under it goes
          gl.uniform1f(QU.uAlpha, covVis * Math.min(1, inn * 1.6) * (chosen && env.g > 0.11 && window.Handoff ? 0 : 1));
          gl.bindTexture(gl.TEXTURE_2D, quads[k].tex);
          gl.bindBuffer(gl.ARRAY_BUFFER, quads[k].buf);
          gl.enableVertexAttribArray(QU.aPos); gl.vertexAttribPointer(QU.aPos, 3, gl.FLOAT, false, 20, 0);
          gl.enableVertexAttribArray(QU.aUv); gl.vertexAttribPointer(QU.aUv, 2, gl.FLOAT, false, 20, 12);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
        }
        // hand the attribute slots back to the points program
        gl.useProgram(prog);
        [['aPos', 3], ['aCol', 3], ['aInfo', 4]].forEach(function (a) {
          var loc = gl.getAttribLocation(prog, a[0]);
          gl.bindBuffer(gl.ARRAY_BUFFER, buffers[a[0]]);
          gl.enableVertexAttribArray(loc);
          gl.vertexAttribPointer(loc, a[1], gl.FLOAT, false, 0, 0);
        });
      }

      // labels pinned to the front face of the block
      var near = Math.max(0, 1 - Math.abs(env.stage - 1) / 0.35);
      LABELS.forEach(function (l, n) {
        var x = l.x * BLOCK_X * 2 * (env.mobile ? 0.3 : 1);
        var y = (yb(l.layer, x, Z_STRATA_FRONT) + yb(l.layer + 1, x, Z_STRATA_FRONT)) / 2;
        var s = project([x, y, Z_STRATA_FRONT + 2], W, H);
        var o = s ? Math.max(0, Math.min(1, near * 1.8 - n * 0.16)) : 0;
        var el = labels[n];
        el.style.opacity = o;
        if (!s) return;
        // kept on screen: on a phone the right-hand labels would run off the edge (width read once, not per frame)
        if (!el._w) el._w = el.offsetWidth;
        el.style.transform = 'translate(' + Math.max(12, Math.min(s.x - 3.5, W - el._w - 12)) + 'px,' + (s.y - 10) + 'px)';
      });

      // where the covers ended up on screen, for the hit test and the tags
      layout = world.map(function (wc) {
        var pts = wc.corners.map(function (c) { return project(c, W, H); });
        if (pts.some(function (p) { return !p; })) return { x: -1e4, y: -1e4, w: 0, h: 0 };
        var xs = pts.map(function (p) { return p.x; }), ys = pts.map(function (p) { return p.y; });
        var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
        return { x: x0, y: y0, w: x1 - x0, h: y1 - y0, bl: pts[2], br: pts[3] };
      });
      env.tags = layout.map(function (r) {
        return r.bl ? { x: r.bl.x, y: Math.max(r.bl.y, r.br.y), w: r.br.x - r.bl.x, top: r.y } : { x: -1e4, y: -1e4, w: 0, top: 0 };
      });
    },
    setDpr: function (env) {
      var c = gl.canvas;
      c.width = Math.round(env.W * env.dpr); c.height = Math.round(env.H * env.dpr);
      gl.useProgram(prog);
      gl.viewport(0, 0, c.width, c.height);
      gl.uniform1f(U.uDpr, env.dpr);
    },
    // where cover k is on screen now, and its picture, for the hand-off box
    coverRect: function (k) { var r = layout[k]; return { x: r.x, y: r.y, w: r.w, h: r.h }; },
    coverImage: function (k) { return images[k]; },
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
