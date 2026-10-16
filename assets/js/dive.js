// Dive: Matter's opening and Depth's flight in one world.
// The greeting is drawn in points on the screen's own plane, crisp, as in Matter, with Matter's
// dust drifting behind it. The first scroll pours the letters down into a cut-away block of
// strata, and the camera dives through the block to the work: four wide pictures in a column
// that then scrolls like a page, one to one with the finger or the wheel, every case readable and
// clickable the whole way. A planet at the end.
(function () {
  // the live projects' marks, the same as on the case pages' buttons
  var IC = {
    apple: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22.018 13.298l-3.919 2.218-3.515-3.493 3.543-3.521 3.891 2.202a1.49 1.49 0 0 1 0 2.594zM1.337.924a1.486 1.486 0 0 0-.112.568v21.017c0 .217.045.419.124.6l11.155-11.087L1.337.924zm12.207 10.065l3.258-3.238L3.45.195a1.466 1.466 0 0 0-.946-.179l11.04 10.973zm0 2.067l-11 10.933c.298.036.612-.016.906-.183l13.324-7.54-3.23-3.21z"/></svg>',
    web: '<svg class="web" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19M12 2.5c2.6 2.6 3.9 5.8 3.9 9.5s-1.3 6.9-3.9 9.5c-2.6-2.6-3.9-5.8-3.9-9.5S9.4 5.1 12 2.5z"/></svg>'
  };
  var CASES = [
    { img: 'assets/images/halliburton/halliburton-hero.webp', name: 'Data Marketplace · Halliburton', short: 'Halliburton', line: 'Cut data search from weeks to minutes', href: 'cases/halliburton/' },
    { img: 'assets/images/rebalancer/rebalancer-hero.webp', name: 'Rebalancer', line: 'Built solo, shipped to App Store', href: 'cases/rebalancer/', links: [['App Store', 'https://apps.apple.com/app/id6767200669', IC.apple]] },
    { img: 'assets/images/dobrodoc/dobrodoc-cover-v3.webp', name: 'DobroDoc+', line: 'Cut booking time 40% in usability tests', href: 'cases/dobrodoc/', links: [['App Store', 'https://apps.apple.com/app/id1483029353', IC.apple], ['Google Play', 'https://play.google.com/store/apps/details?id=domus.dobrodoc', IC.play]] },
    { img: 'assets/images/dopas/dopas-cover-v3.webp', name: 'dopas.dp.ua', line: 'Launched from zero, now generating revenue', href: 'cases/dopas/', links: [['Website', 'https://www.dopas.dp.ua/', IC.web]] }
  ];
  var PALETTE = ['#F2D3A0', '#E7A96B', '#C96B4B', '#8E3B46', '#4B3A5C', '#2F5D7C', '#3E9C9C', '#9ED8C8'];
  // the skills, one to a layer, from what shows on the surface down to what holds it up (words from the CV).
  // They hang in one column on the block's left: pinned at the same x, the layers' waves move them all
  // alike, so they stay in order and never run into each other
  var LABELS = [
    { layer: 0, text: 'Wireframes and mockups', note: 'Lo-fi & hi-fi prototypes' },
    { layer: 1, text: 'Design system architecture', note: 'Variables, tokens, components, layouts' },
    { layer: 2, text: 'Web and app development', note: 'Shipped to the App Store with Claude Code' },
    { layer: 3, text: 'Discovery & Research', note: 'Interviews, usability testing, CJM, IA' },
    { layer: 4, text: 'Market analysis', note: 'Competitors, comparative analysis, SWOT' },
    { layer: 5, text: 'Design team management', note: 'Hiring, mentoring, 1-to-1s, Scrum' },
    { layer: 6, text: 'Analytics', note: 'Google Analytics, RevenueCat' }
  ], LABEL_X = -0.42;
  // stages: 0 hello · 1 layers · 2 the top of the work · 3 its bottom · 4 contact.
  // Between 2 and 3 the column scrolls like a page: no stops, nothing settles there
  var TOP = 2, END = 3, LAST = 4;
  // where things sit along the flight
  var Z_STRATA_FRONT = -1300, Z_STRATA_BACK = -2300, BLOCK_X = 900;
  // where the column hangs
  var Z_COL = -5200;

  // past the last case the page keeps scrolling the same way, one to one, down to the planet below it
  var END_RUN = 1;
  // The column's layout and the scroll track, for a screen size. It is worked out before the shell
  // measures the track (and again for a new size) so the scroll through the column can be one to one:
  // a screen of scroll moves the column a screen. keys and stops are changed in place: the shell holds them
  var COL = {}, keys = [], stops = [], DUST_K = 1, laid = '';
  function layout(W, H, mob) {
    if (laid === W + 'x' + H + mob) return;
    laid = W + 'x' + H + mob;
    var F0 = H * 0.96;
    var cw = mob ? W * 0.9 : Math.min(W * 0.58, H * 0.62 * 1.6, 1100), ch = cw / (mob ? 1.3 : 1.6);
    // (a short screen leaves room under each picture for its label in three lines)
    var gap = ch * (mob ? 0.46 : H < 500 ? 0.42 : 0.24);
    // the distance at which a picture takes this much of the screen's width
    var d = F0 * cw / (W * (mob ? 0.92 : 0.46));
    var k = F0 / d; // world to screen
    // the camera's height with the first picture's top at 22% of the screen, and with the last one's bottom at 74%
    // (on a short screen the first picture starts lower, clear of the title above it)
    var topAt = Math.max(0.22, 120 / H);
    var top = -(H * 0.5 - H * topAt) / k + ch / 2, bottom = -3 * (ch + gap) - ch / 2 + (H * 0.74 - H * 0.5) / k;
    COL.cw = cw; COL.ch = ch; COL.gap = gap; COL.d = d; COL.top = top; COL.bottom = bottom; COL.run = (top - bottom) * k / H;
    // the scroll track, in screens: a short hold where a shape is read, none from the column on
    var RUNS = [1.2, 1.7, COL.run, END_RUN], HOLDS = [0.45, 0, 0], pos = 0.12;
    keys.length = 0; stops.length = 0;
    keys.push([0, 0], [pos, 0]); stops.push(0);
    RUNS.forEach(function (r, i) {
      pos += r; keys.push([pos, i + 1]);
      stops.push(pos);
      if (i + 1 < LAST && HOLDS[i]) { pos += HOLDS[i]; keys.push([pos, i + 1]); }
    });
    keys.forEach(function (kk) { kk[0] /= pos; });
    for (var i = 1; i < stops.length; i++) stops[i] /= pos;
    // Matter's dust slides about a screen per screen of its own track; this one is longer
    DUST_K = pos / 3.8;
    // the track is as long as the flight
    document.querySelector('.track').style.height = ((pos + 1) * 100) + 'vh';
  }
  // a phone held upright gets the phone's layout; on its side it is laid out like a small screen
  function upright(W, H) { return W < 760 && H > W; }
  layout(innerWidth, window.Perf ? Perf.vh() : innerHeight, upright(innerWidth, window.Perf ? Perf.vh() : innerHeight));

  var VS = [
    'precision highp float;',
    'attribute vec3 aPos; attribute vec3 aCol; attribute vec4 aInfo; attribute vec3 aAlt;',
    'uniform mat4 uView, uProj; uniform float uT, uDpr, uFocus, uF, uNear, uMaxSize, uIn, uStage, uFly, uScroll, uDim;',
    'uniform vec2 uRes, uMouse; uniform float uMouseOn; uniform vec3 uWave, uGlobe; uniform vec2 uGlobeRot;',
    'varying vec3 vC; varying float vA; varying float vSoft;',
    'void main(){',
    '  float kind = aInfo.x, grp = aInfo.y, rnd = aInfo.z, rnd2 = aInfo.w;',
    '  vec3 p = aPos; vec3 col = aCol; float lit = 1.0, base = 1.6 + rnd * 1.2, bk = 1.0, a0 = 1.0, intro = uIn; vSoft = 0.0;',
    // stars: the flight's, so they come in as it starts (the greeting stands on Matter's dust alone)
    '  if (kind < 0.5) { lit = 0.55 + 0.45 * sin(uT * (0.5 + rnd * 2.0) + rnd * 30.0); a0 = smoothstep(0.1, 0.5, uStage); }',
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
    '    a0 = smoothstep(2.95, 3.35, uStage);',
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
    '    size = 1.0 + fract(rnd2 * 7.9) * 1.6; alpha = uIn; vSoft = 1.0;',
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
    '  vec2 dm = s - uMouse; float push = smoothstep(150.0, 0.0, length(dm)) * uMouseOn;',
    '  s += normalize(dm + 0.0001) * push * 46.0;',
    '  float age = uT - uWave.z; vec2 dw = s - uWave.xy;',
    '  float ring = exp(-pow((length(dw) - age * 900.0) / 60.0, 2.0)) * max(0.0, 1.0 - age / 1.3);',
    '  s += normalize(dw + 0.0001) * ring * 38.0;',
    '  clip.xy = (vec2(s.x / uRes.x, 1.0 - s.y / uRes.y) * 2.0 - 1.0) * clip.w;',
    '  vC = (col * lit + (push + ring) * 0.22) * alpha; vA = alpha;',
    '  gl_PointSize = size * uDpr * (1.0 + push * 0.8 + ring * 0.6);',
    '  gl_Position = clip;',
    // a point that can't be seen costs nothing: off the screen, no pixels drawn
    '  if (alpha < 0.003) { gl_PointSize = 0.0; gl_Position = vec4(2.0, 2.0, 2.0, 1.0); }',
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
    'uniform mat4 uView, uProj; uniform float uLift, uNear, uFocus;',
    'varying vec2 vUv; varying float vFog;',
    'void main(){',
    '  vec3 p = aPos; p.z += uLift;',
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
  var ATTRS = [['aPos', 3], ['aCol', 3], ['aInfo', 4], ['aAlt', 3]];
  var PAL = PALETTE.map(function (h) { return BKit.hex(h); });
  // what each frame works out, kept from frame to frame rather than made anew sixty times a second
  var E = [0, 0, 0], T = [0, 0, 0], PT = { x: 0, y: 0 };
  var rects = [0, 1, 2, 3].map(function () { return { ok: false, x: 0, y: 0, w: 0, h: 0 }; });
  var tags = [0, 1, 2, 3].map(function () { return { x: -1e4, y: -1e4, w: 0, top: 0, o: 0 }; });

  function perspective(fovy, aspect, near, far) {
    var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
  }
  // the camera at e looking at t, written into m (world up is +y)
  function lookAt(m, e, t) {
    var zx = e[0] - t[0], zy = e[1] - t[1], zz = e[2] - t[2], zl = Math.hypot(zx, zy, zz);
    zx /= zl; zy /= zl; zz /= zl;
    var xx = zz, xz = -zx, xl = Math.hypot(xx, xz);
    xx /= xl; xz /= xl;
    var yx = zy * xz, yy = zz * xx - zx * xz, yz = -zy * xx;
    m[0] = xx; m[1] = yx; m[2] = zx; m[3] = 0;
    m[4] = 0; m[5] = yy; m[6] = zy; m[7] = 0;
    m[8] = xz; m[9] = yz; m[10] = zz; m[11] = 0;
    m[12] = -(xx * e[0] + xz * e[2]); m[13] = -(yx * e[0] + yy * e[1] + yz * e[2]); m[14] = -(zx * e[0] + zy * e[1] + zz * e[2]); m[15] = 1;
  }
  // a world point to the screen, into PT; false when it is behind the camera
  function project(x, y, z, W, H) {
    var v = view, q = proj;
    var vx = v[0] * x + v[4] * y + v[8] * z + v[12];
    var vy = v[1] * x + v[5] * y + v[9] * z + v[13];
    var cw = -(v[2] * x + v[6] * y + v[10] * z + v[14]);
    if (cw <= 1) return false;
    PT.x = (q[0] * vx / cw * 0.5 + 0.5) * W; PT.y = (1 - (q[5] * vy / cw * 0.5 + 0.5)) * H;
    return true;
  }
  // the strata's layer boundaries, shared by the points and the labels pinned to them
  function yb(L, x, z) {
    return -80 - L * 44 + Math.sin(x * 0.004 + L * 0.7) * 16 + Math.sin(z * 0.005 + L) * 12 + Math.cos((x + z) * 0.002) * 9;
  }
  function catmull(out, p0, p1, p2, p3, t) {
    var t2 = t * t, t3 = t2 * t;
    for (var i = 0; i < 3; i++) out[i] = 0.5 * ((2 * p1[i]) + (-p0[i] + p2[i]) * t + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t2 + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * t3);
  }
  function lerp3(out, a, b, f) { for (var i = 0; i < 3; i++) out[i] = a[i] + (b[i] - a[i]) * f; }
  // a style written only when it changes
  function css(el, k, v) { var c = el._s || (el._s = {}); if (c[k] !== v) { c[k] = v; el.style[k] = v; } }
  function smooth(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }
  // how many points Matter (matter.html) draws its greeting with: one per pixel sampled from its four
  // covers, so it depends on the screen. Kept in step with Matter's build()
  function matterCount(W, H, mobile) {
    var gw = mobile ? W * 0.92 : Math.min(W * 0.82, W >= 1100 ? W - 340 : W, 1240);
    var gh = mobile ? Math.min(H * 0.6, gw * 1.3) : Math.min(H * 0.64, gw * 0.62);
    var gap = mobile ? 12 : 22, labelH = mobile ? 34 : 54;
    var cw = (gw - gap) / 2, chh = (gh - gap - labelH * 2) / 2;
    var sp = Math.max(2.2, Math.sqrt((cw * chh * 4) / (mobile ? 32000 : 120000)));
    return Math.floor(cw / sp) * Math.floor(chh / sp) * 4;
  }
  // the scroll hint rests while the page moves
  var lastScroll = -1e9, hintAt = -1;
  addEventListener('scroll', function () { lastScroll = performance.now(); }, { passive: true });

  // the column comes up out of the dark after the dive; from then on it scrolls away like a page
  function shown(stage) { return smooth((stage - 1.45) / 0.45); }
  // every case can be opened the whole time the column is up
  function openable(stage) { return shown(stage) > 0.9; }

  var renderer = {
    init: function () {
      if (!this.initGL()) return false;
      var wrap = document.getElementById('diveLabels');
      labels = LABELS.map(function (l) {
        var el = document.createElement('div'); el.className = 'fl'; el.style.color = PALETTE[l.layer];
        el.setAttribute('aria-hidden', 'true');
        el.innerHTML = '<i></i><span>' + l.text + ' <b>· ' + l.note + '</b></span>';
        wrap.appendChild(el); return el;
      });
      return true;
    },
    // after the GL context was lost and given back: everything on the GPU is made again
    restore: function (env) { if (this.initGL()) this.build(env); },
    initGL: function () {
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
      ['uView', 'uProj', 'uT', 'uDpr', 'uFocus', 'uF', 'uNear', 'uMaxSize', 'uIn', 'uStage', 'uFly', 'uScroll', 'uDim', 'uRes', 'uMouse', 'uMouseOn', 'uWave', 'uGlobe', 'uGlobeRot']
        .forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
      ['aPos', 'aCol', 'aInfo', 'aAlt'].forEach(function (n) { buffers[n] = gl.createBuffer(); A[n] = gl.getAttribLocation(prog, n); });
      ['uView', 'uProj', 'uLift', 'uNear', 'uFocus', 'uTex', 'uAlpha', 'uLit', 'uRad', 'uSize', 'uTop'].forEach(function (n) { QU[n] = gl.getUniformLocation(qprog, n); });
      QU.aPos = gl.getAttribLocation(qprog, 'aPos'); QU.aUv = gl.getAttribLocation(qprog, 'aUv');
      planes = [];
      for (var k = 0; k < 4; k++) planes.push({ buf: gl.createBuffer(), tex: gl.createTexture() });
      gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND);
      return true;
    },
    // the greeting needs only its font; the pictures come in behind it, long before the column is reached
    load: function (tick) {
      var self = this;
      images = CASES.map(function (c, k) {
        var im = new Image();
        // decoded off the main thread first, so the upload doesn't stall the greeting
        im.onload = function () { (im.decode ? im.decode() : Promise.resolve()).catch(function () {}).then(function () { if (self.size) self.picture(k); }); };
        im.src = c.img;
        return im;
      });
      return (document.fonts ? document.fonts.load('700 100px Inter') : Promise.resolve()).then(function () { tick(1); });
    },
    // a case's picture, cropped to its plane at the size it is seen on the screen, onto the GPU
    picture: function (k) {
      var img = images[k];
      if (!img.complete || !img.naturalWidth) return;
      var cw = this.size[0] * this.texScale, ch = this.size[1] * this.texScale, dpr = this.texDpr;
      var ia = img.naturalWidth / img.naturalHeight, ra = cw / ch;
      var sw = ia > ra ? img.naturalHeight * ra : img.naturalWidth, shh = ia > ra ? img.naturalHeight : img.naturalWidth / ra;
      var tc = document.createElement('canvas'); tc.width = Math.round(cw * dpr); tc.height = Math.round(ch * dpr);
      tc.getContext('2d').drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - shh) / 2, sw, shh, 0, 0, tc.width, tc.height);
      gl.bindTexture(gl.TEXTURE_2D, planes[k].tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tc);
      // not a power of two, so no mipmaps: linear is enough at the sizes the column is seen at
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      planes[k].ready = true;
    },
    build: function (env) {
      // mobile: a phone's point budget; up: a phone held upright, for the layout
      var W = env.W, H = env.H, mobile = env.mobile, up = upright(W, H), R = Math.random, i;
      F = H * 0.96;
      layout(W, H, up);
      this.up = up;
      this.labelX = null;
      // the greeting, each point with a place waiting for it in the strata; exactly as many grains
      // as Matter draws its greeting with on this screen, scattered as Matter scatters them
      var g = BKit.greeting(W, H, up), gn = g.length / 2, names = matterCount(W, H, up);
      var stars = mobile ? 3000 : 9000, extra = mobile ? 7000 : 26000, dust = mobile ? 700 : 2600, globe = mobile ? 7000 : 16000;
      count = stars + names + extra + dust + globe;
      // straight into the arrays the GPU takes, no lists growing on the way
      var P = new Float32Array(count * 3), C = new Float32Array(count * 3), I = new Float32Array(count * 4), L2 = new Float32Array(count * 3), n = 0;
      function put(x, y, z, r, gg, b, kind, grp) {
        var j = n * 3;
        P[j] = x; P[j + 1] = y; P[j + 2] = z; C[j] = r; C[j + 1] = gg; C[j + 2] = b;
        j = n * 4; I[j] = kind; I[j + 1] = grp; I[j + 2] = R(); I[j + 3] = R();
        return n++;
      }
      // a point somewhere on the block: its front face, the sides, the top, or a faint inner surface
      function strata(kind) {
        var u = R(), x, y, z, k, L = Math.floor(R() * PALETTE.length), zf = Z_STRATA_FRONT, zb = Z_STRATA_BACK;
        if (u < 0.62) {
          if (u < 0.46) { x = (R() - 0.5) * 2 * BLOCK_X; z = zf; }
          else { x = R() < 0.5 ? -BLOCK_X : BLOCK_X; z = zf + (zb - zf) * R(); }
          var y0 = yb(L, x, z), y1 = yb(L + 1, x, z);
          y = y1 + (y0 - y1) * R(); k = 0.5 + R() * 0.45;
        } else {
          x = (R() - 0.5) * 2 * BLOCK_X; z = zf + (zb - zf) * R();
          if (u < 0.88 || kind === 1) { L = 0; k = 0.45 + R() * 0.4; }
          else { L = 2 + Math.floor(R() * 3) * 2; k = 0.18 + R() * 0.12; }
          y = yb(L, x, z);
        }
        var c = PAL[L];
        return put(x, y, z, c[0] * k, c[1] * k, c[2] * k, kind, L * 0.9);
      }

      // stars, the length of the flight
      for (i = 0; i < stars; i++) { var l = 0.25 + R() * 0.5; put((R() - 0.5) * 7000, (R() - 0.5) * 4200, 900 - R() * 13000, l * 0.8, l * 0.88, l, 0, 0); }
      for (i = 0; i < names; i++) {
        var j = Math.floor(R() * gn) * 2, m = strata(1) * 3;
        L2[m] = g[j] - W / 2 + (R() - 0.5) * 2.4; L2[m + 1] = H / 2 - g[j + 1] + (R() - 0.5) * 2.4;
      }
      // the rest of the strata, inner surfaces included: the dive passes between them
      for (i = 0; i < extra; i++) strata(2);

      // the work: four wide pictures in a column, read top to bottom
      var cw = COL.cw, ch = COL.ch, gap = COL.gap;
      // world units to screen px where the column is read
      this.size = [cw, ch]; this.texScale = F / COL.d; this.texDpr = Math.min(2, env.dpr || 1);
      for (var p = 0; p < 4; p++) planes[p].ready = false;
      this.cases = [];
      for (var k = 0; k < 4; k++) {
        var cy = -k * (ch + gap), z = Z_COL, x0 = -cw / 2, x1 = cw / 2, ya = cy + ch / 2, yz = cy - ch / 2;
        this.picture(k);
        gl.bindBuffer(gl.ARRAY_BUFFER, planes[k].buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
          x0, ya, z, 0, 0, x0, yz, z, 0, 1, x1, ya, z, 1, 0,
          x1, ya, z, 1, 0, x0, yz, z, 0, 1, x1, yz, z, 1, 1
        ]), gl.STATIC_DRAW);
        // corners: top left, top right, bottom left, bottom right
        this.cases.push({ center: [0, cy, z], corners: [[x0, ya, z], [x1, ya, z], [x0, yz, z], [x1, yz, z]], w: cw, h: ch });
      }
      // Matter's dust, in screen px from the top left (Matter counts from the centre), across the whole width
      for (i = 0; i < dust; i++) { var dl = 0.12 + R() * 0.22; put(R() * W, R() * H, 0, 0.7 * dl, 0.8 * dl, 0.95 * dl, 4, 0); }
      // the planet at the end
      // the planet hangs below the column, as far down as a screen of scroll carries the camera,
      // a little deeper than the pictures, so it rises into view a little slower than they leave
      var zCam = Z_COL + COL.d, yEnd = COL.bottom - END_RUN * H * COL.d / F;
      var Z_GLOBE = zCam - F * 1.5, gr = Math.min(W, H) * (up ? 0.36 : 0.27), gc = [0, yEnd + H * (H < 500 ? 0.24 : 0.12), Z_GLOBE];
      for (i = 0; i < globe; i++) {
        var yS = 1 - (i / (globe - 1)) * 2, rad = Math.sqrt(Math.max(0, 1 - yS * yS)), th = i * 2.39996323, qq = yS * 0.5 + 0.5;
        put(gc[0] + Math.cos(th) * rad * gr, gc[1] + yS * gr, gc[2] + Math.sin(th) * rad * gr, 1.0 - 0.55 * qq, 0.78 - 0.10 * qq, 0.36 + 0.64 * qq, 3, 0);
      }
      gl.useProgram(prog);
      [['aPos', P], ['aCol', C], ['aInfo', I], ['aAlt', L2]].forEach(function (bf) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers[bf[0]]); gl.bufferData(gl.ARRAY_BUFFER, bf[1], gl.STATIC_DRAW);
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
        { s: TOP, e: [0, COL.top, Z_COL + COL.d], t: [0, COL.top, Z_COL], f: COL.d },
        { s: END, e: [0, COL.bottom, Z_COL + COL.d], t: [0, COL.bottom, Z_COL], f: COL.d },
        { s: LAST, e: [0, yEnd, zCam], t: [0, yEnd, Z_GLOBE], f: F * 1.5 }
      ];
      this.stations = stations;
      this.yEnd = yEnd;
      this.rot = this.rot || 0;
    },
    setDpr: function (env) {
      var c = gl.canvas;
      c.width = Math.round(env.W * env.dpr); c.height = Math.round(env.H * env.dpr);
      gl.useProgram(prog); gl.viewport(0, 0, c.width, c.height); gl.uniform1f(U.uDpr, env.dpr);
    },
    frame: function (env) {
      var W = env.W, H = env.H, S = this.stations, stage = Math.min(LAST, env.stage), k;
      // eased into and out of every station, except from the column on, where the camera moves with the scroll
      var n = Math.min(LAST - 1, Math.floor(stage)), sE = n >= TOP ? stage : n + smooth(stage - n);
      var i = 0; while (i < S.length - 2 && S[i + 1].s <= sE) i++;
      var f = Math.max(0, Math.min(1, (sE - S[i].s) / (S[i + 1].s - S[i].s)));
      // a spline through the dive, ending at the top of the column (no point past it, so no overshoot);
      // from there straight from station to station
      var iRow = 3, e = E, t = T;
      var s0 = S[Math.max(0, i - 1)], s1 = S[Math.min(iRow, i)], s2 = S[Math.min(iRow, i + 1)], s3 = S[Math.min(iRow, i + 2)];
      if (i < iRow) { catmull(e, s0.e, s1.e, s2.e, s3.e, f); catmull(t, s0.t, s1.t, s2.t, s3.t, f); }
      else { lerp3(e, S[i].e, S[i + 1].e, f); lerp3(t, S[i].t, S[i + 1].t, f); }
      var focus = s1.f + (s2.f - s1.f) * f;
      var camY = e[1];
      // the greeting gathers by the clock, so a slow phone still gets it in time
      if (this.introAt == null) this.introAt = performance.now();
      var inn = env.reduce ? 1 : Math.min(1, (performance.now() - this.introAt) / 1800);
      // the cursor turns the head a little
      // (by the clock, not by the frame: a 120 Hz screen turns no faster than a 60 Hz one)
      var mx = env.mouse.x < -9000 ? 0 : (env.mouse.x / W - 0.5) * 2, my = env.mouse.y < -9000 ? 0 : (env.mouse.y / H - 0.5) * 2, kt = env.dt / 16.7;
      var ease = 1 - Math.pow(0.94, kt);
      this.mx = (this.mx || 0) + (mx * env.mouse.on - (this.mx || 0)) * ease;
      this.my = (this.my || 0) + (my * env.mouse.on - (this.my || 0)) * ease;
      if (!env.reduce && stage > 0.2) { var lk = Math.min(1, stage - 0.2); e[0] += this.mx * 50 * lk; e[1] -= this.my * 32 * lk; t[0] += this.mx * 12 * lk; t[1] -= this.my * 8 * lk; }
      // opening a case flies square into its picture, under the hand-off box
      if (env.go >= 0) {
        var cs = this.cases[env.go], gg = smooth(env.g), cc = cs.center;
        var dFill = F * Math.min(cs.w / W, cs.h / H) * 0.98;
        e[0] += (cc[0] - e[0]) * gg; e[1] += (cc[1] - e[1]) * gg; e[2] += (cc[2] + dFill - e[2]) * gg;
        lerp3(t, t, cc, gg);
        focus += (dFill - focus) * gg;
      }
      lookAt(view, e, t);
      this.rot += (0.0025 + this.mx * 0.01) * kt;

      gl.useProgram(prog);
      for (k = 0; k < ATTRS.length; k++) {
        var at = ATTRS[k];
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers[at[0]]); gl.enableVertexAttribArray(A[at[0]]); gl.vertexAttribPointer(A[at[0]], at[1], gl.FLOAT, false, 0, 0);
      }
      gl.uniformMatrix4fv(U.uView, false, view);
      gl.uniform1f(U.uT, env.t); gl.uniform1f(U.uFocus, focus); gl.uniform1f(U.uIn, inn); gl.uniform1f(U.uStage, stage);
      gl.uniform1f(U.uScroll, env.s * DUST_K);
      gl.uniform2f(U.uMouse, env.reduce ? -9999 : env.mouse.x, env.mouse.y);
      gl.uniform1f(U.uMouseOn, env.reduce ? 0 : env.mouse.p);
      gl.uniform3f(U.uWave, env.wave.x, env.wave.y, env.wave.t);
      gl.uniform2f(U.uGlobeRot, this.rot, 0.35 + this.my * 0.4);
      gl.clearColor(0.027, 0.031, 0.043, 1); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.drawArrays(gl.POINTS, 0, count);

      // the pictures, laid over the light, all equally lit. Hovering lifts a picture and lets the
      // others fall back a little, rather than lighting it up
      var drew = false, sz = this.size, vis = shown(stage);
      for (k = 0; k < 4; k++) {
        var q = vis;
        // once the hand-off box above the canvas has crossed in, the plane under it goes
        if (env.go === k && env.g > 0.11 && window.Handoff) q = 0;
        if (q < 0.002 || !planes[k].ready) continue;
        if (!drew) {
          gl.useProgram(qprog); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
          for (var a2 = 0; a2 < ATTRS.length; a2++) gl.disableVertexAttribArray(A[ATTRS[a2][0]]);
          gl.uniformMatrix4fv(QU.uView, false, view); gl.uniformMatrix4fv(QU.uProj, false, proj);
          gl.uniform1i(QU.uTex, 0); gl.activeTexture(gl.TEXTURE0);
          gl.uniform1f(QU.uNear, F * 0.35); gl.uniform1f(QU.uFocus, focus);
          gl.uniform2f(QU.uSize, sz[0], sz[1]); gl.uniform1f(QU.uRad, env.mobile ? 12 : 18);
          // in device px: the canvas height, and the band under the bar where pictures fade out
          var dp = gl.canvas.height / H;
          gl.uniform3f(QU.uTop, gl.canvas.height, (env.mobile ? 58 : 64) * dp, (env.mobile ? 118 : 132) * dp);
          drew = true;
        }
        var h = env.hov[k];
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

      // the skills, on the block's front face: a column under the headline's left edge, running from the
      // middle of the top layer to the middle of the last one at an even step (the layers' own thickness
      // varies with their waves); once they have faded they are left alone
      var near = Math.max(0, 1 - Math.abs(stage - 1) / 0.35);
      if (near > 0 || this.labelsUp) {
        this.labelsUp = near > 0;
        var lx = LABEL_X * BLOCK_X * 2 * (this.up ? 0.3 : 1), nl = LABELS.length;
        var top = LABELS[0].layer, bot = LABELS[nl - 1].layer;
        var seen = project(lx, (yb(top, lx, Z_STRATA_FRONT) + yb(top + 1, lx, Z_STRATA_FRONT)) / 2, Z_STRATA_FRONT + 2, W, H), y0 = PT.y;
        seen = seen && project(lx, (yb(bot, lx, Z_STRATA_FRONT) + yb(bot + 1, lx, Z_STRATA_FRONT)) / 2, Z_STRATA_FRONT + 2, W, H);
        var y1 = PT.y, colX = this.labelX == null ? (this.labelX = document.querySelector('.cap-layers').offsetLeft) : this.labelX;
        // a short screen has a thin block: the labels keep their own room, and the column stays on the screen
        var step = Math.max((y1 - y0) / (nl - 1), 21);
        y0 = Math.min(y0, H - 28 - step * (nl - 1)); y1 = y0 + step * (nl - 1);
        for (k = 0; k < nl; k++) {
          var el = labels[k];
          css(el, 'opacity', seen ? Math.max(0, Math.min(1, near * 2 - k * 0.1)).toFixed(3) : '0');
          if (seen) css(el, 'transform', 'translate(' + colX + 'px,' + (y0 + (y1 - y0) * k / (nl - 1) - 10).toFixed(1) + 'px)');
        }
      }

      // where each case is on screen now, for the hit test, the hand-off and its label;
      // a label fades out under the bar, as its picture does
      var bar0 = env.mobile ? 58 : 64, bar1 = env.mobile ? 104 : 120;
      for (k = 0; k < 4; k++) {
        var cn = this.cases[k].corners, r = rects[k], tg = tags[k];
        var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, blx = 0, bly = 0, brx = 0, bry = 0;
        r.ok = true;
        for (var c = 0; c < 4 && r.ok; c++) {
          r.ok = project(cn[c][0], cn[c][1], cn[c][2], W, H);
          x0 = Math.min(x0, PT.x); x1 = Math.max(x1, PT.x); y0 = Math.min(y0, PT.y); y1 = Math.max(y1, PT.y);
          if (c === 2) { blx = PT.x; bly = PT.y; } else if (c === 3) { brx = PT.x; bry = PT.y; }
        }
        if (!r.ok) { tg.x = tg.y = -1e4; tg.w = tg.top = tg.o = 0; continue; }
        r.x = x0; r.y = y0; r.w = x1 - x0; r.h = y1 - y0;
        // the label hangs from the picture's bottom edge
        var by = Math.max(bly, bry);
        tg.x = blx; tg.y = by; tg.w = brx - blx; tg.top = y0; tg.o = vis * smooth((by - bar0) / (bar1 - bar0));
      }
      env.tags = tags;
      // the closing words ride up with the planet, as one block of the page (translate: the shell owns transform)
      var capEnd = this.capEnd || (this.capEnd = document.querySelector('.cap-end'));
      if (capEnd) css(capEnd, 'translate', '0 ' + (stage > END ? Math.max(0, (camY - this.yEnd) / 1.5) : 0).toFixed(1) + 'px');
      // the scroll hint: at the top, on the way, at the bottom; it shows once the page is still, and not
      // over the cases where they fill a narrow screen
      var hint = window.Hint;
      if (hint) {
        var at = stage < 0.05 ? 0 : stage > LAST - 0.02 ? 2 : 1;
        if (at !== hintAt) { hintAt = at; hint.say(at); hint.el.classList.toggle('is-back', at === 2); }
        // and not where it would sit on the skills or the cases, where they fill a narrow or a short screen
        var overCases = W < 1000 && stage > 1.6 && stage < END + 0.4, overSkills = H < 560 && Math.abs(stage - 1) < 0.45;
        css(hint.el, 'opacity', performance.now() - lastScroll > 900 && env.go < 0 && !overCases && !overSkills ? '1' : '0');
      }
      // the section title is the top of the column: it scrolls away with it, fading out under the bar
      var title = this.title || (this.title = document.querySelector('.work-title'));
      if (title) {
        if (this.titleY == null) this.titleY = title.offsetTop + title.offsetHeight; // its bottom edge
        var shift = stage > TOP ? Math.max(0, (COL.top - camY) * F / COL.d) : 0;
        var to = (vis * smooth((this.titleY - shift - bar0) / (bar1 - bar0))).toFixed(2), tt = 'translateY(' + (-shift).toFixed(1) + 'px)';
        css(title, 'opacity', to); css(title, 'transform', tt);
        // it starts where the pictures start: the column's left edge as it stands on the screen
        css(title, 'left', (W / 2 - COL.cw * F / COL.d / 2).toFixed(1) + 'px');
      }
    },
    workAt: function (stage) { return openable(stage); },
    // from the column to the end the scroll is a page's: nothing settles it and the picture keeps up with it
    free: function (stage) { return stage > TOP - 0.03; },
    coverRect: function (k) { var r = rects[k]; return { x: r.x, y: r.y, w: r.w, h: r.h }; },
    coverImage: function (k) { return images[k]; },
    coverAt: function (x, y) {
      for (var k = 0; k < 4; k++) {
        var r = rects[k];
        if (r.ok && openable(env0.stage) && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return k;
      }
      return -1;
    }
  };

  var env0 = BKit({ cases: CASES, renderer: renderer, keys: keys, stops: stops, last: LAST });
})();
