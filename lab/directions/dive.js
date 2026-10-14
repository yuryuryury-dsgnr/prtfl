// Dive: Matter's opening and Depth's flight in one world.
// The greeting is drawn in points on the screen's own plane, crisp, as in Matter, with Matter's
// dust drifting behind it. The first scroll pours the letters down into a cut-away block of
// strata, and the camera dives through the block to the work: four wide pictures in a column
// that then scrolls like a page, one to one with the finger or the wheel, every case readable and
// clickable the whole way. A planet at the end.
(function () {
  var CASES = [
    { img: '../../assets/images/halliburton/halliburton-hero.webp', name: 'Data Marketplace · Halliburton', short: 'Halliburton', line: 'Cut data search from weeks to minutes', href: 'halliburton.html?v=depth&from=dive' },
    { img: '../../assets/images/rebalancer/rebalancer-hero.webp', name: 'Rebalancer', line: 'Built solo, shipped to App Store', href: '../../cases/rebalancer/', links: [['App Store', 'https://apps.apple.com/app/id6767200669']] },
    { img: '../../assets/images/dobrodoc/dobrodoc-cover-v3.webp', name: 'DobroDoc+', line: 'Cut booking time 40% in usability tests', href: '../../cases/dobrodoc/', links: [['App Store', 'https://apps.apple.com/app/id1483029353'], ['Google Play', 'https://play.google.com/store/apps/details?id=domus.dobrodoc']] },
    { img: '../../assets/images/dopas/dopas-cover-v3.webp', name: 'dopas.dp.ua', line: 'Launched from zero, now generating revenue', href: '../../cases/dopas/', links: [['Website', 'https://www.dopas.dp.ua/']] }
  ];
  var PALETTE = ['#F2D3A0', '#E7A96B', '#C96B4B', '#8E3B46', '#4B3A5C', '#2F5D7C', '#3E9C9C', '#9ED8C8'];
  var LABELS = [
    { layer: 0, x: -0.2, text: 'Interface', note: 'Main, Explore, Detail, Request Access, Admin' },
    { layer: 2, x: 0.25, text: 'Design system', note: 'Three-tier token architecture' },
    { layer: 4, x: -0.35, text: 'Information architecture', note: '4 personas · 5 flows · IA' },
    { layer: 6, x: 0.15, text: 'Research', note: '10 participants across 4 roles' },
    { layer: 7, x: -0.05, text: 'Pipeline', note: 'Figma MCP · live specs' }
  ];
  // stages: 0 hello · 1 layers · 2 the top of the work · 3 its bottom · 4 contact.
  // Between 2 and 3 the column scrolls like a page: no stops, nothing settles there
  var ROW = 2, END = 3, LAST = 4;
  // where things sit along the flight
  var Z_STRATA_FRONT = -1300, Z_STRATA_BACK = -2300, BLOCK_X = 900;
  // where the row hangs
  var Z_ROW = -5200;

  // the column's layout, worked out here (before the shell measures the track) so the scroll
  // through it can be one to one: a screen of scroll moves the column a screen
  var W0 = innerWidth, H0 = window.Perf ? Perf.vh() : innerHeight, MOB = W0 < 760, F0 = H0 * 0.96;
  var COL = (function () {
    var cw = MOB ? W0 * 0.9 : Math.min(W0 * 0.58, H0 * 0.62 * 1.6, 1100), ch = cw / (MOB ? 1.3 : 1.6);
    var gap = ch * (MOB ? 0.46 : 0.24);
    // the distance at which a picture takes this much of the screen's width
    var d = F0 * cw / (W0 * (MOB ? 0.92 : 0.46));
    var k = F0 / d; // world to screen
    // the camera's height with the first picture's top at 22% of the screen, and with the last one's bottom at 74%
    var top = -(H0 * 0.5 - H0 * 0.22) / k + ch / 2, bottom = -3 * (ch + gap) - ch / 2 + (H0 * 0.74 - H0 * 0.5) / k;
    return { cw: cw, ch: ch, gap: gap, d: d, top: top, bottom: bottom, run: (top - bottom) * k / H0 };
  })();
  // the scroll track, in screens: a short hold where a shape is read, none through the column
  var RUNS = [1.2, 1.7, COL.run, 1.3], HOLDS = [0.45, 0, 0.2], LEAD = 0.12;
  var keys = [[0, 0]], stops = [0], pos = LEAD;
  keys.push([pos, 0]);
  RUNS.forEach(function (r, i) {
    pos += r; keys.push([pos, i + 1]);
    stops.push(pos);
    if (i + 1 < LAST && HOLDS[i]) { pos += HOLDS[i]; keys.push([pos, i + 1]); }
  });
  var TOTAL = pos;
  // Matter's dust slides about a screen per screen of its own track; this one is longer
  var DUST_K = TOTAL / 3.8;
  keys = keys.map(function (k) { return [k[0] / TOTAL, k[1]]; });
  stops = stops.map(function (s, i) { return i === 0 ? 0 : s / TOTAL; });
  // the track is as long as the flight
  document.querySelector('.track').style.height = ((TOTAL + 1) * 100) + 'vh';

  var VS = [
    'precision highp float;',
    'attribute vec3 aPos; attribute vec3 aCol; attribute vec4 aInfo; attribute vec3 aAlt;',
    'uniform mat4 uView, uProj; uniform float uT, uDpr, uFocus, uF, uNear, uMaxSize, uIn, uStage, uFly, uScroll, uDim;',
    'uniform vec2 uRes, uMouse; uniform vec3 uWave, uGlobe; uniform vec2 uGlobeRot;',
    'varying vec3 vC; varying float vA; varying float vSoft;',
    'void main(){',
    '  float kind = aInfo.x, grp = aInfo.y, rnd = aInfo.z, rnd2 = aInfo.w;',
    '  vec3 p = aPos; vec3 col = aCol; float lit = 1.0, base = 1.6 + rnd * 1.2, bk = 1.0, a0 = 1.0, intro = uIn; vSoft = 0.0;',
    '  if (kind < 0.5) { lit = 0.55 + 0.45 * sin(uT * (0.5 + rnd * 2.0) + rnd * 30.0); }',
    '  else if (kind < 1.5) {',
    // the greeting: on load it condenses out of a scatter; the first scroll pours it into the strata
    '    float inn = clamp(uIn * 1.6 - rnd2 * 0.6, 0.0, 1.0); inn = 1.0 - pow(1.0 - inn, 3.0);',
    '    vec3 letter = aAlt + vec3(sin(uT * 0.8 + rnd * 6.28), cos(uT * 0.7 + rnd2 * 6.28), 0.0) * 1.4;',
    '    letter += vec3((rnd - 0.5) * uRes.x * 1.3, (rnd2 - 0.5) * uRes.y * 1.3, (rnd - rnd2) * 500.0) * (1.0 - inn);',
    '    float t = clamp((clamp(uStage, 0.0, 1.0) - rnd2 * 0.4) / 0.6, 0.0, 1.0); t = t * t * (3.0 - 2.0 * t);',
    '    vec3 strat = aPos; strat.y += sin(strat.x * 0.004 + uT * 0.5 + grp) * 5.0;',
    '    p = mix(letter, strat, t);',
    '    float fly = sin(t * 3.14159) * uFly;',
    '    p.xy += (vec2(rnd, fract(rnd * 7.13 + rnd2)) - 0.5) * 320.0 * fly;',
    '    p.y -= fly * 300.0 * rnd2;',
    // Matter's letters: fine soft grains, their brightness spread wide
    // (dimmed by their number, as Matter does, so many overlapping grains stay grey rather than burn white)
    '    col = mix(vec3(0.82, 0.86, 0.95) * (0.55 + 0.45 * rnd) * uDim, aCol, t);',
    '    base = mix(1.7, base, t); bk = t; intro = 1.0; vSoft = 1.0 - t;',
    '  }',
    '  else if (kind < 2.5) {',
    // the rest of the strata fills in as the letters land
    '    p.y += sin(p.x * 0.004 + uT * 0.5 + grp) * 5.0;',
    '    a0 = smoothstep(0.35, 0.95, uStage);',
    '  }',
    '  else if (kind < 3.5) {',
    '    a0 = smoothstep(3.08, 3.55, uStage);',
    '    vec3 d = p - uGlobe; float ga = uGlobeRot.x;',
    '    d = vec3(d.x * cos(ga) + d.z * sin(ga), d.y, -d.x * sin(ga) + d.z * cos(ga));',
    '    float gb = uGlobeRot.y; d = vec3(d.x, d.y * cos(gb) - d.z * sin(gb), d.y * sin(gb) + d.z * cos(gb));',
    '    p = uGlobe + d;',
    '  }',
    '  vec4 clip; vec2 s; float size, alpha;',
    '  if (kind > 3.5) {',
    // dust, as in Matter: never part of the world, it drifts on the screen and slides with the scroll
    '    s = aPos.xy;',
    '    s.x += sin(uT * 0.07 + rnd2 * 6.28) * 24.0;',
    '    s.y = mod(s.y - uScroll * uRes.y * (0.4 + rnd * 1.2) - uT * (2.0 + fract(rnd * 13.7) * 6.0), uRes.y);',
    '    col *= 0.5 + 0.5 * sin(uT * (0.6 + rnd2) + rnd * 6.28);',
    '    size = 1.0 + fract(rnd2 * 7.9) * 1.6; alpha = uIn;',
    '    clip = vec4(0.0, 0.0, 0.0, 1.0);',
    '  } else {',
    '    vec4 v = uView * vec4(p, 1.0); float d = -v.z;',
    '    clip = uProj * v;',
    '    vec2 ndc = clip.xy / clip.w; s = (ndc * 0.5 + 0.5) * uRes; s.y = uRes.y - s.y;',
    // perspective size, plus a disc that opens away from the focus; the letters stay sharp
    '    float persp = uF / max(d, 1.0), blur = abs(d - uFocus) / uFocus;',
    '    size = base * persp + blur * blur * 14.0 * bk;',
    '    alpha = min(1.0, 7.0 / (size * size));',
    '    alpha *= exp(-max(d - uFocus, 0.0) / 1300.0) * smoothstep(uNear * 0.25, uNear, d) * a0 * intro;',
    '    size = min(size, uMaxSize);',
    '  }',
    // the cursor parts the field and a click sends a ring through it, as in Matter
    '  vec2 dm = s - uMouse; float push = smoothstep(150.0, 0.0, length(dm));',
    '  s += normalize(dm + 0.0001) * push * 46.0;',
    '  float age = uT - uWave.z; vec2 dw = s - uWave.xy;',
    '  float ring = exp(-pow((length(dw) - age * 900.0) / 60.0, 2.0)) * max(0.0, 1.0 - age / 1.3);',
    '  s += normalize(dw + 0.0001) * ring * 38.0;',
    '  clip.xy = (vec2(s.x / uRes.x, 1.0 - s.y / uRes.y) * 2.0 - 1.0) * clip.w;',
    '  vC = (col * lit + (push + ring) * 0.22) * alpha; vA = alpha;',
    '  gl_PointSize = size * uDpr * (1.0 + push * 0.8 + ring * 0.6);',
    '  gl_Position = clip;',
    '}'
  ].join('\n');
  var FS = [
    'precision mediump float;',
    'varying vec3 vC; varying float vA; varying float vSoft;',
    'void main(){',
    '  float r = length(gl_PointCoord - 0.5);',
    '  float m = mix(1.0 - smoothstep(0.36, 0.5, r), 1.0 - smoothstep(0.2, 0.5, r), vSoft);',
    '  gl_FragColor = vec4(vC * m, vA * m);',
    '}'
  ].join('\n');
  // each case is a real picture on a plane, sharp at the screen's own resolution, with rounded
  // corners; far off it is lost in the dark, and it fades as it slips past the camera
  var QVS = [
    'attribute vec3 aPos; attribute vec2 aUv;',
    'uniform mat4 uView, uProj; uniform vec3 uNormal; uniform float uLift, uNear, uFocus;',
    'varying vec2 vUv; varying float vFog;',
    'void main(){',
    '  vec3 p = aPos + uNormal * uLift;',
    '  vec4 v = uView * vec4(p, 1.0); float d = -v.z;',
    '  vFog = exp(-max(d - uFocus, 0.0) / 1500.0) * smoothstep(uNear * 0.3, uNear * 0.9, d);',
    '  vUv = aUv; gl_Position = uProj * v;',
    '}'
  ].join('\n');
  var QFS = [
    'precision mediump float;',
    'uniform sampler2D uTex; uniform float uAlpha, uLit, uRad; uniform vec2 uSize; uniform vec3 uTop;',
    'varying vec2 vUv; varying float vFog;',
    'void main(){',
    '  vec2 q = abs((vUv - 0.5) * uSize) - (uSize * 0.5 - uRad);',
    '  float sd = length(max(q, 0.0)) - uRad;',
    // scrolling up under the bar, a picture dissolves into the dark rather than show through it
    '  float fromTop = uTop.x - gl_FragCoord.y;',
    '  float a = uAlpha * vFog * (1.0 - smoothstep(-1.0, 1.0, sd)) * smoothstep(uTop.y, uTop.z, fromTop);',
    '  gl_FragColor = vec4(texture2D(uTex, vUv).rgb * uLit * a, a);',
    '}'
  ].join('\n');

  var gl, prog, qprog, U = {}, QU = {}, A = {}, buffers = {}, count = 0, F = 800, images = [], planes = [], labels = [];
  var view = new Float32Array(16), proj = new Float32Array(16);

  function perspective(fovy, aspect, near, far) {
    var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
  }
  function lookAt(e, t) {
    var z = [e[0] - t[0], e[1] - t[1], e[2] - t[2]], zl = Math.hypot(z[0], z[1], z[2]);
    z = [z[0] / zl, z[1] / zl, z[2] / zl];
    var x = [z[2], 0, -z[0]], xl = Math.hypot(x[0], x[1], x[2]);
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
    var cw = -vz;
    if (cw <= 1) return null;
    return { x: (q[0] * vx / cw * 0.5 + 0.5) * W, y: (1 - (q[5] * vy / cw * 0.5 + 0.5)) * H, d: cw };
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
  function smooth(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }
  // the column comes up out of the dark after the dive, and lets go on the way to the planet
  function shown(stage) { return smooth((stage - 1.45) / 0.45) * (1 - smooth((stage - (END + 0.04)) / 0.16)); }
  // every case can be opened the whole time the column is up
  function openable(stage) { return shown(stage) > 0.9; }

  var renderer = {
    init: function () {
      var canvas = document.getElementById('gl');
      gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, powerPreference: 'high-performance' });
      if (!gl) return false;
      function sh(type, src) {
        var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
        return s;
      }
      function link(vs, fs) {
        var p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
        gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
        return p;
      }
      prog = link(VS, FS); qprog = link(QVS, QFS);
      ['uView', 'uProj', 'uT', 'uDpr', 'uFocus', 'uF', 'uNear', 'uMaxSize', 'uIn', 'uStage', 'uFly', 'uScroll', 'uDim', 'uRes', 'uMouse', 'uWave', 'uGlobe', 'uGlobeRot']
        .forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
      ['aPos', 'aCol', 'aInfo', 'aAlt'].forEach(function (n) { buffers[n] = gl.createBuffer(); A[n] = gl.getAttribLocation(prog, n); });
      ['uView', 'uProj', 'uNormal', 'uLift', 'uNear', 'uFocus', 'uTex', 'uAlpha', 'uLit', 'uRad', 'uSize', 'uTop'].forEach(function (n) { QU[n] = gl.getUniformLocation(qprog, n); });
      QU.aPos = gl.getAttribLocation(qprog, 'aPos'); QU.aUv = gl.getAttribLocation(qprog, 'aUv');
      for (var k = 0; k < 4; k++) planes.push({ buf: gl.createBuffer(), tex: gl.createTexture() });
      gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND);
      var wrap = document.getElementById('diveLabels');
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
      var W = env.W, H = env.H, mobile = env.mobile, R = Math.random, i;
      F = H * 0.96;
      var P = [], C = [], I = [], L2 = [];
      function put(x, y, z, c, kind, grp, alt) {
        P.push(x, y, z); C.push(c[0], c[1], c[2]); I.push(kind, grp || 0, R(), R());
        L2.push(alt ? alt[0] : 0, alt ? alt[1] : 0, alt ? alt[2] : 0);
      }
      function layerCol(L, k) { var c = BKit.hex(PALETTE[L]); return [c[0] * k, c[1] * k, c[2] * k]; }
      // a point somewhere on the block: its front face, the sides, the top, or a faint inner surface
      function strataPoint(inner) {
        var u = R(), x, z, L = Math.floor(R() * PALETTE.length), zf = Z_STRATA_FRONT, zb = Z_STRATA_BACK;
        if (u < 0.46) { x = (R() - 0.5) * 2 * BLOCK_X; z = zf; }
        else if (u < 0.62) { x = R() < 0.5 ? -BLOCK_X : BLOCK_X; z = zf + (zb - zf) * R(); }
        if (u < 0.62) {
          var y0 = yb(L, x, z), y1 = yb(L + 1, x, z);
          return { p: [x, y1 + (y0 - y1) * R(), z], c: layerCol(L, 0.5 + R() * 0.45), g: L * 0.9 };
        }
        if (u < 0.88 || !inner) {
          x = (R() - 0.5) * 2 * BLOCK_X; z = zf + (zb - zf) * R();
          return { p: [x, yb(0, x, z), z], c: layerCol(0, 0.45 + R() * 0.4), g: 0 };
        }
        var Li = 2 + Math.floor(R() * 3) * 2;
        x = (R() - 0.5) * 2 * BLOCK_X; z = zf + (zb - zf) * R();
        return { p: [x, yb(Li, x, z), z], c: layerCol(Li, 0.18 + R() * 0.12), g: Li * 0.9 };
      }

      // stars, the length of the flight
      var stars = mobile ? 3000 : 9000;
      for (i = 0; i < stars; i++) { var l = 0.25 + R() * 0.5; put((R() - 0.5) * 7000, (R() - 0.5) * 4200, 900 - R() * 13000, [l * 0.8, l * 0.88, l], 0); }
      // the greeting, each point with a place waiting for it in the strata
      var g = BKit.greeting(W, H, mobile), gn = g.length / 2, names = mobile ? 30000 : 110000;
      for (i = 0; i < names; i++) {
        var j = Math.floor(R() * gn) * 2, sp0 = strataPoint(false);
        put(sp0.p[0], sp0.p[1], sp0.p[2], sp0.c, 1, sp0.g, [g[j] - W / 2 + (R() - 0.5) * 2, H / 2 - g[j + 1] + (R() - 0.5) * 2, 0]);
      }
      // the rest of the strata, inner surfaces included: the dive passes between them
      var extra = mobile ? 7000 : 26000;
      for (i = 0; i < extra; i++) { var sp1 = strataPoint(true); put(sp1.p[0], sp1.p[1], sp1.p[2], sp1.c, 2, sp1.g); }

      // the work: four wide pictures in a column, read top to bottom
      var cw = COL.cw, ch = COL.ch, gap = COL.gap, dpr = Math.min(2, env.dpr || 1);
      this.size = [cw, ch];
      this.cases = [];
      for (var k = 0; k < 4; k++) {
        var ax = [1, 0, 0], nrm = [0, 0, 1];
        var c = [0, -k * (ch + gap), Z_ROW];
        // the picture cropped to the plane, at the size it will be seen up close
        var img = images[k], ia = img.naturalWidth / img.naturalHeight, ra = cw / ch;
        var sw = ia > ra ? img.naturalHeight * ra : img.naturalWidth, shh = ia > ra ? img.naturalHeight : img.naturalWidth / ra;
        var tc = document.createElement('canvas'); tc.width = Math.round(cw * dpr); tc.height = Math.round(ch * dpr);
        tc.getContext('2d').drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - shh) / 2, sw, shh, 0, 0, tc.width, tc.height);
        gl.bindTexture(gl.TEXTURE_2D, planes[k].tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tc);
        // not a power of two, so no mipmaps: linear is enough at the sizes the row is seen at
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        var corners = [[-cw / 2, ch / 2], [cw / 2, ch / 2], [-cw / 2, -ch / 2], [cw / 2, -ch / 2]].map(function (l2) {
          return [c[0] + ax[0] * l2[0], c[1] + l2[1], c[2] + ax[2] * l2[0]];
        });
        var tl = corners[0], tr = corners[1], bl = corners[2], br = corners[3];
        gl.bindBuffer(gl.ARRAY_BUFFER, planes[k].buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
          tl[0], tl[1], tl[2], 0, 0, bl[0], bl[1], bl[2], 0, 1, tr[0], tr[1], tr[2], 1, 0,
          tr[0], tr[1], tr[2], 1, 0, bl[0], bl[1], bl[2], 0, 1, br[0], br[1], br[2], 1, 1
        ]), gl.STATIC_DRAW);
        this.cases.push({ center: c, normal: nrm, corners: corners, w: cw, h: ch });
      }
      // Matter's dust, in screen px
      var dust = mobile ? 700 : 2600;
      for (i = 0; i < dust; i++) { var dl = 0.12 + R() * 0.22; put((R() - 0.5) * W, R() * H, 0, [0.7 * dl, 0.8 * dl, 0.95 * dl], 4); }
      // the planet at the end
      var Z_GLOBE = Z_ROW - 3200;
      var globe = mobile ? 7000 : 16000, gr = Math.min(W, H) * (mobile ? 0.36 : 0.27), gc = [0, H * 0.12, Z_GLOBE];
      for (i = 0; i < globe; i++) {
        var yS = 1 - (i / (globe - 1)) * 2, rad = Math.sqrt(Math.max(0, 1 - yS * yS)), th = i * 2.39996323, qq = yS * 0.5 + 0.5;
        put(gc[0] + Math.cos(th) * rad * gr, gc[1] + yS * gr, gc[2] + Math.sin(th) * rad * gr, [0.62 + 0.33 * qq, 0.84 - 0.18 * qq, 0.78 - 0.36 * qq], 3);
      }
      count = P.length / 3;
      gl.useProgram(prog);
      [['aPos', P], ['aCol', C], ['aInfo', I], ['aAlt', L2]].forEach(function (b) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers[b[0]]); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(b[1]), gl.STATIC_DRAW);
      });

      var canvas = gl.canvas;
      canvas.width = Math.round(W * env.dpr); canvas.height = Math.round(H * env.dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      proj = perspective(2 * Math.atan(H / (2 * F)), W / H, 5, 16000);
      gl.uniformMatrix4fv(U.uProj, false, proj);
      gl.uniform2f(U.uRes, W, H); gl.uniform1f(U.uDpr, env.dpr); gl.uniform1f(U.uF, F);
      gl.uniform1f(U.uMaxSize, mobile ? 16 : 64);
      gl.uniform1f(U.uNear, F * 0.35);
      gl.uniform3f(U.uGlobe, gc[0], gc[1], gc[2]);
      gl.uniform1f(U.uFly, env.reduce ? 0 : 1);
      gl.uniform1f(U.uDim, Math.pow(Math.min(1, 40000 / names), 0.75));

      // the flight: a station per stage, and one more inside the block, between its layers;
      // through the work the camera only slides down the column
      var stations = [
        { s: 0, e: [0, 0, F], t: [0, 0, 0], f: F },
        { s: 1, e: [-260, 250, -420], t: [0, -230, -1750], f: 1150 },
        { s: 1.5, e: [30, -232, -1180], t: [0, -236, -2600], f: 520 },
        { s: ROW, e: [0, COL.top, Z_ROW + COL.d], t: [0, COL.top, Z_ROW], f: COL.d },
        { s: END, e: [0, COL.bottom, Z_ROW + COL.d], t: [0, COL.bottom, Z_ROW], f: COL.d },
        { s: LAST, e: [0, 0, Z_GLOBE + F * 1.5], t: [0, 0, Z_GLOBE], f: F * 1.5 }
      ];
      this.stations = stations;
      this.rot = this.rot || 0;
    },
    setDpr: function (env) {
      var c = gl.canvas;
      c.width = Math.round(env.W * env.dpr); c.height = Math.round(env.H * env.dpr);
      gl.useProgram(prog); gl.viewport(0, 0, c.width, c.height); gl.uniform1f(U.uDpr, env.dpr);
    },
    frame: function (env) {
      var W = env.W, H = env.H, S = this.stations, stage = Math.min(LAST, env.stage);
      // eased within each stage, then straight through any station inside it
      // eased into and out of every station, except through the column, which moves with the scroll
      var n = Math.min(LAST - 1, Math.floor(stage)), sE = n === ROW ? stage : n + smooth(stage - n);
      var i = 0; while (i < S.length - 2 && S[i + 1].s <= sE) i++;
      var f = Math.max(0, Math.min(1, (sE - S[i].s) / (S[i + 1].s - S[i].s)));
      // a spline through the dive, ending on the overview (no point past it, so no overshoot);
      // from there straight from station to station, each eased by its own stage
      var iRow = 3, e, t;
      function st(m) { return S[Math.max(0, Math.min(iRow, m))]; }
      if (i < iRow) {
        e = catmull(st(i - 1).e, st(i).e, st(i + 1).e, st(i + 2).e, f);
        t = catmull(st(i - 1).t, st(i).t, st(i + 1).t, st(i + 2).t, f);
      } else {
        e = S[i].e.map(function (v, m) { return v + (S[i + 1].e[m] - v) * f; });
        t = S[i].t.map(function (v, m) { return v + (S[i + 1].t[m] - v) * f; });
      }
      var focus = st(i).f + (st(i + 1).f - st(i).f) * f;
      var camY = e[1];
      // the greeting gathers by the clock, so a slow phone still gets it in time
      if (this.introAt == null) this.introAt = performance.now();
      var inn = env.reduce ? 1 : Math.min(1, (performance.now() - this.introAt) / 1800);
      // the cursor turns the head a little
      var mx = env.mouse.x < -9000 ? 0 : (env.mouse.x / W - 0.5) * 2, my = env.mouse.y < -9000 ? 0 : (env.mouse.y / H - 0.5) * 2;
      this.mx = (this.mx || 0) + (mx * env.mouse.on - (this.mx || 0)) * 0.06;
      this.my = (this.my || 0) + (my * env.mouse.on - (this.my || 0)) * 0.06;
      if (!env.reduce && stage > 0.2) { var lk = Math.min(1, stage - 0.2); e[0] += this.mx * 50 * lk; e[1] -= this.my * 32 * lk; t[0] += this.mx * 12 * lk; t[1] -= this.my * 8 * lk; }
      // opening a case flies square into its picture, under the hand-off box
      if (env.go >= 0) {
        var cs = this.cases[env.go], gg = smooth(env.g);
        var dFill = F * Math.min(cs.w / W, cs.h / H) * 0.98;
        var ge = [cs.center[0] + cs.normal[0] * dFill, cs.center[1], cs.center[2] + cs.normal[2] * dFill];
        e = e.map(function (v, m) { return v + (ge[m] - v) * gg; });
        t = t.map(function (v, m) { return v + (cs.center[m] - v) * gg; });
        focus += (dFill - focus) * gg;
      }
      view = lookAt(e, t);
      this.rot += 0.0025 + this.mx * 0.01;

      gl.useProgram(prog);
      [['aPos', 3], ['aCol', 3], ['aInfo', 4], ['aAlt', 3]].forEach(function (b) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers[b[0]]); gl.enableVertexAttribArray(A[b[0]]); gl.vertexAttribPointer(A[b[0]], b[1], gl.FLOAT, false, 0, 0);
      });
      gl.uniformMatrix4fv(U.uView, false, view);
      gl.uniform1f(U.uT, env.t); gl.uniform1f(U.uFocus, focus); gl.uniform1f(U.uIn, inn); gl.uniform1f(U.uStage, stage);
      gl.uniform1f(U.uScroll, env.s * DUST_K);
      gl.uniform2f(U.uMouse, env.reduce ? -9999 : env.mouse.x, env.mouse.y);
      gl.uniform3f(U.uWave, env.wave.x, env.wave.y, env.wave.t);
      gl.uniform2f(U.uGlobeRot, this.rot, 0.35 + this.my * 0.4);
      gl.clearColor(0.024, 0.027, 0.039, 1); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.drawArrays(gl.POINTS, 0, count);

      // the pictures, laid over the light, all equally lit. Hovering lifts a picture and lets the
      // others fall back a little, rather than lighting it up
      var drew = false, sz = this.size, vis = shown(stage);
      for (var k = 0; k < 4; k++) {
        var q = vis;
        // once the hand-off box above the canvas has crossed in, the plane under it goes
        if (env.go === k && env.g > 0.11 && window.Handoff) q = 0;
        if (q < 0.002) continue;
        if (!drew) {
          gl.useProgram(qprog); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
          ['aPos', 'aCol', 'aInfo', 'aAlt'].forEach(function (n2) { gl.disableVertexAttribArray(A[n2]); });
          gl.uniformMatrix4fv(QU.uView, false, view); gl.uniformMatrix4fv(QU.uProj, false, proj);
          gl.uniform1i(QU.uTex, 0); gl.activeTexture(gl.TEXTURE0);
          gl.uniform1f(QU.uNear, F * 0.35); gl.uniform1f(QU.uFocus, focus);
          gl.uniform2f(QU.uSize, sz[0], sz[1]); gl.uniform1f(QU.uRad, env.mobile ? 12 : 18);
          // in device px: the canvas height, and the band under the bar where pictures fade out
          var dp = gl.canvas.height / H;
          gl.uniform3f(QU.uTop, gl.canvas.height, (env.mobile ? 58 : 64) * dp, (env.mobile ? 118 : 132) * dp);
          drew = true;
        }
        var h = env.hov[k], nm = this.cases[k].normal;
        gl.uniform3f(QU.uNormal, nm[0], nm[1], nm[2]);
        gl.uniform1f(QU.uLift, h * 22);
        gl.uniform1f(QU.uLit, 1 - 0.28 * (env.any - h));
        gl.uniform1f(QU.uAlpha, q);
        gl.bindTexture(gl.TEXTURE_2D, planes[k].tex);
        gl.bindBuffer(gl.ARRAY_BUFFER, planes[k].buf);
        gl.enableVertexAttribArray(QU.aPos); gl.vertexAttribPointer(QU.aPos, 3, gl.FLOAT, false, 20, 0);
        gl.enableVertexAttribArray(QU.aUv); gl.vertexAttribPointer(QU.aUv, 2, gl.FLOAT, false, 20, 12);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
      if (drew) { gl.disableVertexAttribArray(QU.aPos); gl.disableVertexAttribArray(QU.aUv); }

      // labels pinned to the front face of the block
      var near = Math.max(0, 1 - Math.abs(stage - 1) / 0.35);
      LABELS.forEach(function (l, m) {
        var x = l.x * BLOCK_X * 2 * (env.mobile ? 0.3 : 1);
        var y = (yb(l.layer, x, Z_STRATA_FRONT) + yb(l.layer + 1, x, Z_STRATA_FRONT)) / 2;
        var s = project([x, y, Z_STRATA_FRONT + 2], W, H), el = labels[m];
        el.style.opacity = s ? Math.max(0, Math.min(1, near * 1.8 - m * 0.16)) : 0;
        if (!s) return;
        if (!el._w) el._w = el.offsetWidth;
        el.style.transform = 'translate(' + Math.max(12, Math.min(s.x - 3.5, W - el._w - 12)) + 'px,' + (s.y - 10) + 'px)';
      });

      // where each case is on screen now, for the hit test, the hand-off and its label;
      // the label shows only while the camera is turned to its picture
      this.rects = this.cases.map(function (cs2, k2) {
        var pts = cs2.corners.map(function (c) { return project(c, W, H); });
        if (pts.some(function (p) { return !p; })) return null;
        var xs = pts.map(function (p) { return p.x; }), ys = pts.map(function (p) { return p.y; });
        var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
        return { x: x0, y: y0, w: x1 - x0, h: y1 - y0, bl: pts[2], br: pts[3], o: vis };
      });
      // a label fades out under the bar, as its picture does
      var bar0 = env.mobile ? 58 : 64, bar1 = env.mobile ? 104 : 120;
      env.tags = this.rects.map(function (r) {
        if (!r) return { x: -1e4, y: -1e4, w: 0, top: 0, o: 0 };
        var y = Math.max(r.bl.y, r.br.y);
        return { x: r.bl.x, y: y, w: r.br.x - r.bl.x, top: r.y, o: r.o * smooth((y - bar0) / (bar1 - bar0)) };
      });
      // the section title is the top of the column: it scrolls away with it, fading out under the bar
      var title = this.title || (this.title = document.querySelector('.work-title'));
      if (title) {
        if (this.titleY == null) this.titleY = title.offsetTop + title.offsetHeight; // its bottom edge
        var shift = stage > ROW ? Math.max(0, (COL.top - camY) * F / COL.d) : 0;
        var to = (vis * smooth((this.titleY - shift - bar0) / (bar1 - bar0))).toFixed(2), tt = 'translateY(' + (-shift).toFixed(1) + 'px)';
        if (title._o !== to) { title._o = to; title.style.opacity = to; }
        if (title._t !== tt) { title._t = tt; title.style.transform = tt; }
      }
    },
    workAt: function (stage) { return openable(stage); },
    // through the column the scroll is a page's: nothing settles it and the picture keeps up with it
    free: function (stage) { return stage > ROW - 0.03 && stage < END + 0.03; },
    coverRect: function (k) { var r = this.rects[k]; return { x: r.x, y: r.y, w: r.w, h: r.h }; },
    coverImage: function (k) { return images[k]; },
    coverAt: function (x, y) {
      for (var k = 0; k < 4; k++) {
        var r = this.rects && this.rects[k];
        if (r && openable(env0.stage) && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return k;
      }
      return -1;
    }
  };

  var env0 = BKit({ cases: CASES, renderer: renderer, keys: keys, stops: stops, last: LAST });
})();
