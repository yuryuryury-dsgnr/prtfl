// Gallery: every screen from the four cases on an endless field. One
// fullscreen shader works out, for each pixel, which tile it falls in, so
// the field costs the same at any size. Moving it bends it like a lens and
// pulls the colours apart; stopping lets it settle flat.
(function () {
  var IMG = '../../assets/images/', HAL = '../../cases/halliburton/images/mockups/';
  var CASES = [
    { name: 'Data Marketplace · Halliburton', short: 'Halliburton', line: 'Data search: from weeks to under five minutes', href: '../../cases/halliburton/', tint: '#E9ECF2' },
    { name: 'Rebalancer', short: 'Rebalancer', line: 'Designed and built solo, concept to App Store', href: '../../cases/rebalancer/', tint: '#E7E2F6' },
    { name: 'DobroDoc+', short: 'DobroDoc+', line: 'Time to booking cut 40% in usability tests', href: '../../cases/dobrodoc/', tint: '#E8F0FB' },
    { name: 'dopas.dp.ua', short: 'dopas', line: 'Launched from zero in 2020, earning since', href: '../../cases/dopas/', tint: '#EEF1F6' }
  ];
  var SHOTS = [
    [0, IMG + 'halliburton/halliburton-card.webp', 'Overview'],
    [0, IMG + 'halliburton/halliburton-hero.webp', 'Hero'],
    [0, HAL + 'main-light.webp', 'Main · light'], [0, HAL + 'main-dark.webp', 'Main · dark'],
    [0, HAL + 'explore-light.webp', 'Explore · light'], [0, HAL + 'explore-dark.webp', 'Explore · dark'],
    [0, HAL + 'detail-light.webp', 'Detail · light'], [0, HAL + 'detail-dark.webp', 'Detail · dark'],
    [0, HAL + 'request-light.webp', 'Request access · light'], [0, HAL + 'request-dark.webp', 'Request access · dark'],
    [0, HAL + 'admin-light.webp', 'Admin · light'], [0, HAL + 'admin-dark.webp', 'Admin · dark'],
    [1, IMG + 'rebalancer/rebalancer-hero.webp', 'Hero'],
    [1, IMG + 'rebalancer/rebalancer-app-store-page.webp', 'App Store page'],
    [1, IMG + 'rebalancer/rebalancer-pairs-watchlist.webp', 'Watchlist'],
    [1, IMG + 'rebalancer/rebalancer-pair-detail.webp', 'Pair detail'],
    [1, IMG + 'rebalancer/rebalancer-simulator.webp', 'Simulator'],
    [1, IMG + 'rebalancer/rebalancer-alerts-push.webp', 'Alert'],
    [2, IMG + 'dobrodoc/dobrodoc-cover-v3.webp', 'Cover'],
    [2, IMG + 'dobrodoc/dd-onboarding-appointment-v3.webp', 'Onboarding · booking'],
    [2, IMG + 'dobrodoc/dd-onboarding-record-v3.webp', 'Onboarding · med record'],
    [2, IMG + 'dobrodoc/dd-onboarding-results-v3.webp', 'Onboarding · results'],
    [2, IMG + 'dobrodoc/dd-home-v3.webp', 'Home'],
    [2, IMG + 'dobrodoc/dd-specialist-v3.webp', 'Specialist'],
    [2, IMG + 'dobrodoc/dd-chat-v3.webp', 'Chat'],
    [2, IMG + 'dobrodoc/dd-video-call-v3.webp', 'Video call'],
    [2, IMG + 'dobrodoc/dd-audio-call-v3.webp', 'Audio call'],
    [2, IMG + 'dobrodoc/dd-medical-cards-v3.webp', 'Medical cards'],
    [2, IMG + 'dobrodoc/dd-notifications-v3.webp', 'Notifications'],
    [2, IMG + 'dobrodoc/dd-account-v3.webp', 'Account'],
    [3, IMG + 'dopas/dopas-cover-v3.webp', 'Cover'],
    [3, IMG + 'dopas/dopas-main.webp', 'Main'],
    [3, IMG + 'dopas/dopas-search-results.webp', 'Search results'],
    [3, IMG + 'dopas/dopas-choose-places.webp', 'Choose seats'],
    [3, IMG + 'dopas/dopas-passenger-info.webp', 'Passenger info'],
    [3, IMG + 'dopas/dopas-payment.webp', 'Payment'],
    [3, IMG + 'dopas/dopas-confirmation.webp', 'Confirmation']
  ];
  var N = SHOTS.length;
  var root = document.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.getElementById('fallbackList').innerHTML = CASES.map(function (c) {
    return '<li><a href="' + c.href + '"><b>' + c.name + '</b><span>' + c.line + '</span></a></li>';
  }).join('');
  document.getElementById('loadTotal').textContent = N;
  document.getElementById('countScreens').textContent = N;

  var canvas = document.getElementById('gl');
  var gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false });
  if (!gl) { root.classList.add('no-gl'); return; }

  // the same integer hash on both sides, so the page knows which tile the shader drew
  var HASH = [
    'uint hu(uint x){ x ^= x >> 16; x *= 0x7feb352du; x ^= x >> 15; x *= 0x846ca68bu; x ^= x >> 16; return x; }',
    'float h2(float a, float b, uint salt){',
    '  uint x = (uint(int(a) + 32768) * 73856093u) ^ (uint(int(b) + 32768) * 19349663u) ^ (salt * 83492791u);',
    '  return float(hu(x) & 0xffffffu) / 16777216.0;',
    '}'
  ].join('\n');
  function hu(x) { x ^= x >>> 16; x = Math.imul(x, 0x7feb352d); x ^= x >>> 15; x = Math.imul(x, 0x846ca68b); x ^= x >>> 16; return x >>> 0; }
  function h2(a, b, salt) {
    var x = (Math.imul(a + 32768, 73856093) ^ Math.imul(b + 32768, 19349663) ^ Math.imul(salt, 83492791)) >>> 0;
    return (hu(x) & 0xffffff) / 16777216;
  }

  var FS = [
    '#version 300 es',
    'precision highp float;',
    'uniform sampler2D uAtlas, uDetail;',
    'uniform vec2 uRes, uOff, uVel, uHover;',
    'uniform float uDpr, uTW, uTH, uGap, uCols, uRows, uN, uIntro, uFilter, uHoverOn, uOpen, uDetailAspect, uOpenIdx;',
    'uniform vec4 uOpenRect;',
    'uniform float uCase[40];',
    'out vec4 o;',
    HASH,
    'float sdRound(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }',
    'vec4 gallery(vec2 w){',
    '  float pw = uTW + uGap, ph = uTH + uGap;',
    '  float col = floor(w.x / pw);',
    // columns are staggered, so it reads as a wall and not a spreadsheet
    '  float yoff = h2(col, 0.0, 1u) * ph;',
    '  float row = floor((w.y + yoff) / ph);',
    '  vec2 cell = vec2(col, row);',
    '  vec2 local = vec2(w.x - col * pw, w.y + yoff - row * ph) - uGap * 0.5;',
    // steps of 7 across and 17 down, modulo a prime count: no screen ever sits next to itself
    '  float idx = mod(col * 7.0 + row * 17.0, uN);',
    '  float delay = h2(col, row, 3u) * 0.4;',
    '  float s = clamp((uIntro - delay) / 0.6, 0.0, 1.0); s = 1.0 - pow(1.0 - s, 3.0);',
    '  vec2 hs = vec2(uTW, uTH) * 0.5;',
    '  vec2 p = local - hs;',
    '  float hv = uHoverOn * (1.0 - step(0.5, length(cell - uHover)));',
    '  float d = sdRound(p, hs * mix(0.6, 1.0, s), 12.0);',
    '  float mask = (1.0 - smoothstep(-0.6, 0.6, d)) * s;',
    // the picture sits a little larger than its frame and drifts against the motion
    '  float zoom = 1.06 + hv * 0.05;',
    '  vec2 uvl = p / (hs * 2.0) / zoom + 0.5 - uVel * 0.0012;',
    '  uvl = clamp(uvl, 0.004, 0.996);',
    '  vec2 cuv = vec2(mod(idx, uCols), floor(idx / uCols));',
    '  vec3 c = texture(uAtlas, (cuv + uvl) / vec2(uCols, uRows)).rgb;',
    '  float cs = uCase[int(idx)];',
    '  float on = uFilter < -0.5 ? 1.0 : 1.0 - step(0.5, abs(cs - uFilter));',
    '  float l = dot(c, vec3(0.299, 0.587, 0.114));',
    '  c = mix(vec3(l) * 0.16, c, on);',
    '  c *= 1.0 + hv * 0.06;',
    '  return vec4(c, mask);',
    '}',
    'void main(){',
    '  vec2 px = vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr;',
    '  vec2 ctr = uRes * 0.5; vec2 q = px - ctr;',
    '  float speed = length(uVel);',
    // the faster it moves, the more it bulges
    '  float k = clamp(speed * 0.0045, 0.0, 0.3);',
    '  vec2 qn = q / ctr;',
    '  vec2 w = q * (1.0 + k * (dot(qn, qn) - 0.6)) + ctr + uOff;',
    '  vec2 dir = speed > 0.01 ? uVel / speed : vec2(0.0);',
    '  vec2 split = dir * min(speed * 0.35, 10.0);',
    '  vec4 g = gallery(w);',
    '  float r = gallery(w + split).r, b = gallery(w - split).b;',
    '  vec3 bg = vec3(0.043, 0.043, 0.047);',
    '  vec3 col = mix(bg, vec3(r, g.g, b), g.a);',
    // a screen opened from the wall
    '  if (uOpen > 0.001) {',
    '    col = mix(col, bg * 0.4, uOpen * 0.88);',
    '    vec2 c2 = uOpenRect.xy + uOpenRect.zw * 0.5;',
    '    float d = sdRound(px - c2, uOpenRect.zw * 0.5, mix(12.0, 16.0, uOpen));',
    '    float m = 1.0 - smoothstep(-0.6, 0.6, d);',
    '    vec2 uv = (px - uOpenRect.xy) / uOpenRect.zw;',
    '    float ra = uOpenRect.z / uOpenRect.w;',
    '    uv = (uv - 0.5) * vec2(min(1.0, ra / uDetailAspect), min(1.0, uDetailAspect / ra)) + 0.5;',
    '    col = mix(col, texture(uDetail, uv).rgb, m);',
    '  }',
    '  o = vec4(col, 1.0);',
    '}'
  ].join('\n');
  var VS = '#version 300 es\nvoid main(){ vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2); gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }';

  function sh(type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  var prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { root.classList.add('no-gl'); throw new Error(gl.getProgramInfoLog(prog)); }
  gl.useProgram(prog);
  var U = {};
  ['uAtlas', 'uDetail', 'uRes', 'uOff', 'uVel', 'uHover', 'uDpr', 'uTW', 'uTH', 'uGap', 'uCols', 'uRows', 'uN', 'uIntro', 'uFilter',
   'uHoverOn', 'uOpen', 'uDetailAspect', 'uOpenIdx', 'uOpenRect', 'uCase'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
  gl.bindVertexArray(gl.createVertexArray());
  function makeTex() {
    var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  var atlasTex = makeTex(), detailTex = makeTex();

  // ——— state ———
  var W, H, dpr = Math.min(window.devicePixelRatio || 1, 2), mobile;
  var TW, TH, GAP, ACOLS = 8, AROWS = Math.ceil(N / 8);
  var off = { x: 0, y: 0 }, vel = { x: 0, y: 0 }, glide = { x: 0, y: 0 };
  var images = [], filter = -1, intro = reduce ? 1 : 0, introStart = 0;
  var hover = null, hoverOn = 0, open = null, openT = 0;

  function size() {
    W = innerWidth; H = innerHeight; mobile = W < 760;
    TW = mobile ? 200 : 340; TH = Math.round(TW * 0.75); GAP = mobile ? 14 : 26;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  // which tile is under a screen point, with the shader's own arithmetic
  function tileAt(sx, sy) {
    var wx = sx + off.x, wy = sy + off.y, pw = TW + GAP, ph = TH + GAP;
    var col = Math.floor(wx / pw), yoff = h2(col, 0, 1) * ph, row = Math.floor((wy + yoff) / ph);
    var lx = wx - col * pw - GAP / 2, ly = wy + yoff - row * ph - GAP / 2;
    var inside = lx >= 0 && lx <= TW && ly >= 0 && ly <= TH;
    var idx = (((col * 7 + row * 17) % N) + N) % N;
    return { col: col, row: row, idx: idx, inside: inside, rect: { x: sx - lx, y: sy - ly, w: TW, h: TH } };
  }

  // ——— filters ———
  var fwrap = document.getElementById('filters');
  var fdefs = [[-1, 'All', N]].concat(CASES.map(function (c, k) { return [k, c.short, SHOTS.filter(function (s) { return s[0] === k; }).length]; }));
  fwrap.innerHTML = fdefs.map(function (f) { return '<button data-f="' + f[0] + '" aria-pressed="' + (f[0] === -1) + '">' + f[1] + '<sup>' + f[2] + '</sup></button>'; }).join('');
  fwrap.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    filter = +b.dataset.f;
    [].forEach.call(fwrap.children, function (x) { x.setAttribute('aria-pressed', x === b); });
  });

  // ——— pointer: drag the field, glide on release, click a tile to open it ———
  var cursor = document.getElementById('cursor'), label = document.getElementById('label');
  var cx = 0, cy = 0, tcx = 0, tcy = 0, down = null, moved = 0, trail = [];
  canvas.addEventListener('pointerdown', function (e) {
    if (open) return;
    canvas.setPointerCapture(e.pointerId);
    down = { x: e.clientX, y: e.clientY }; moved = 0; trail = [{ x: e.clientX, y: e.clientY, t: performance.now() }];
    glide.x = glide.y = 0;
    cursor.classList.add('down');
  });
  canvas.addEventListener('pointermove', function (e) {
    tcx = e.clientX; tcy = e.clientY; pointerIn = true;
    if (e.pointerType === 'mouse') cursor.style.opacity = 1;
    if (!down) return;
    var dx = e.clientX - down.x, dy = e.clientY - down.y;
    off.x -= dx; off.y -= dy; moved += Math.abs(dx) + Math.abs(dy);
    down = { x: e.clientX, y: e.clientY };
    trail.push({ x: e.clientX, y: e.clientY, t: performance.now() });
    if (trail.length > 8) trail.shift();
  });
  function release(e) {
    if (!down) return;
    cursor.classList.remove('down');
    var now = performance.now();
    trail = trail.filter(function (p) { return now - p.t < 100; });
    if (moved < 6) {
      var t = tileAt(e.clientX, e.clientY);
      if (t.inside) openShot(t.idx, t.rect);
    } else if (trail.length > 1 && !reduce) {
      var a = trail[0], span = Math.max(16, now - a.t);
      glide.x = -(e.clientX - a.x) / span * 16; glide.y = -(e.clientY - a.y) / span * 16;
    }
    down = null;
  }
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  var pointerIn = false;
  canvas.addEventListener('pointerenter', function () { pointerIn = true; });
  canvas.addEventListener('pointerleave', function () { cursor.style.opacity = 0; pointerIn = false; });
  addEventListener('wheel', function (e) {
    if (open) return;
    e.preventDefault();
    off.x += e.deltaX; off.y += e.deltaY;
  }, { passive: false });
  addEventListener('keydown', function (e) {
    if (open) {
      if (e.key === 'Escape') closeShot();
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
      return;
    }
    var k = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (k) { e.preventDefault(); glide.x = k[0] * (TW + GAP) * 0.075; glide.y = k[1] * (TH + GAP) * 0.075; }
  });

  // ——— a screen, opened ———
  var detail = document.getElementById('detail');
  function stageRect(aspect) {
    var mw = W * (mobile ? 0.94 : 0.8), mh = H * (mobile ? 0.62 : 0.66);
    var w = Math.min(mw, mh * aspect), h = w / aspect;
    return { x: (W - w) / 2, y: (H - h) / 2 + (mobile ? 0 : 6), w: w, h: h };
  }
  function fill(idx) {
    var s = SHOTS[idx], c = CASES[s[0]], img = images[idx];
    // some screens have transparent corners: flatten them onto the case's tint first
    var sc = Math.min(1, 2048 / Math.max(img.naturalWidth, img.naturalHeight));
    var flat = document.createElement('canvas');
    flat.width = Math.round(img.naturalWidth * sc); flat.height = Math.round(img.naturalHeight * sc);
    var fx = flat.getContext('2d');
    fx.fillStyle = c.tint; fx.fillRect(0, 0, flat.width, flat.height);
    fx.drawImage(img, 0, 0, flat.width, flat.height);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, detailTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, flat);
    open.aspect = img.naturalWidth / img.naturalHeight;
    open.to = stageRect(open.aspect);
    document.getElementById('dTitle').textContent = c.name;
    document.getElementById('dScreen').textContent = s[2];
    document.getElementById('dLine').textContent = c.line;
    document.getElementById('dOpen').href = c.href;
    var same = SHOTS.map(function (x, i) { return x[0] === s[0] ? i : -1; }).filter(function (i) { return i >= 0; });
    document.getElementById('dCount').textContent = (same.indexOf(idx) + 1) + ' / ' + same.length;
  }
  function openShot(idx, rect) {
    open = { idx: idx, home: rect, from: rect, cur: rect };
    fill(idx);
    root.classList.add('detail-open');
    openStart = performance.now(); openDir = 1;
    setTimeout(function () { document.getElementById('dClose').focus({ preventScroll: true }); }, 50);
  }
  function closeShot() {
    if (!open || openDir < 0) return;
    open.from = open.cur;
    openStart = performance.now(); openDir = -1;
    root.classList.remove('detail-open');
  }
  function step(d) {
    var s = SHOTS[open.idx];
    var same = SHOTS.map(function (x, i) { return x[0] === s[0] ? i : -1; }).filter(function (i) { return i >= 0; });
    var i = (same.indexOf(open.idx) + d + same.length) % same.length;
    open.idx = same[i];
    open.from = open.cur;
    fill(open.idx);
    openStart = performance.now(); openDir = 1;
  }
  var openStart = 0, openDir = 0;
  document.getElementById('dClose').onclick = closeShot;
  document.getElementById('dPrev').onclick = function () { step(-1); };
  document.getElementById('dNext').onclick = function () { step(1); };
  detail.addEventListener('click', function (e) { if (e.target === detail) closeShot(); });

  // ——— frame ———
  var prevOff = { x: 0, y: 0 };
  function frame(now) {
    if (!introStart) introStart = now;
    if (!reduce) intro = Math.min(1, (performance.now() - introStart) / 1600);
    if (!down) {
      off.x += glide.x; off.y += glide.y;
      glide.x *= 0.94; glide.y *= 0.94;
      if (Math.abs(glide.x) + Math.abs(glide.y) < 0.05) glide.x = glide.y = 0;
    }
    var vx = off.x - prevOff.x, vy = off.y - prevOff.y;
    prevOff = { x: off.x, y: off.y };
    vel.x += (vx - vel.x) * 0.2; vel.y += (vy - vel.y) * 0.2;
    if (reduce) vel.x = vel.y = 0;

    // cursor and hover
    cx += (tcx - cx) * 0.25; cy += (tcy - cy) * 0.25;
    cursor.style.transform = 'translate(' + cx + 'px,' + cy + 'px)';
    var t = !open && !down && pointerIn ? tileAt(tcx, tcy) : null;
    hover = t && t.inside && Math.hypot(vel.x, vel.y) < 2 ? t : null;
    hoverOn += ((hover ? 1 : 0) - hoverOn) * 0.15;
    cursor.classList.toggle('view', !!hover);
    var word = hover ? 'View' : 'Drag';
    if (cursor.textContent !== word) cursor.textContent = word;
    if (hover) {
      var s = SHOTS[hover.idx];
      label.innerHTML = CASES[s[0]].short + ' <i>· ' + s[2] + '</i>';
      label.style.transform = 'translate(' + (cx + 44) + 'px,' + (cy - 10) + 'px)';
    }
    label.style.opacity = hover ? 1 : 0;

    // opening and closing
    if (open) {
      var p = Math.min(1, (performance.now() - openStart) / (reduce ? 1 : 700)), e = 1 - Math.pow(1 - p, 4);
      if (openDir > 0) { open.cur = lerpRect(open.from, open.to, e); openT = Math.max(openT, e); }
      else {
        // closing returns the screen to the tile it came from
        open.cur = lerpRect(open.from, open.home, e); openT = 1 - e;
        if (p >= 1) { open = null; openT = 0; }
      }
    }

    gl.useProgram(prog);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, atlasTex); gl.uniform1i(U.uAtlas, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, detailTex); gl.uniform1i(U.uDetail, 1);
    gl.uniform2f(U.uRes, W, H); gl.uniform1f(U.uDpr, dpr);
    gl.uniform2f(U.uOff, off.x, off.y); gl.uniform2f(U.uVel, vel.x, vel.y);
    gl.uniform1f(U.uTW, TW); gl.uniform1f(U.uTH, TH); gl.uniform1f(U.uGap, GAP);
    gl.uniform1f(U.uCols, ACOLS); gl.uniform1f(U.uRows, AROWS); gl.uniform1f(U.uN, N);
    gl.uniform1f(U.uIntro, intro); gl.uniform1f(U.uFilter, filter);
    gl.uniform2f(U.uHover, hover ? hover.col : -9999, hover ? hover.row : -9999); gl.uniform1f(U.uHoverOn, hover ? hoverOn : 0);
    gl.uniform1f(U.uOpen, open ? openT : 0);
    if (open) {
      gl.uniform4f(U.uOpenRect, open.cur.x, open.cur.y, open.cur.w, open.cur.h);
      gl.uniform1f(U.uDetailAspect, open.aspect);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    requestAnimationFrame(frame);
  }
  function lerpRect(a, b, t) { return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, w: a.w + (b.w - a.w) * t, h: a.h + (b.h - a.h) * t }; }

  // ——— load: every screen into one atlas ———
  var done = 0, pct = document.getElementById('loadPct');
  function load(src) {
    return new Promise(function (res) {
      var im = new Image(); im.src = src;
      im.onload = function () { done++; pct.textContent = done; res(im); };
      im.onerror = function () { done++; pct.textContent = done; res(null); };
    });
  }
  size();
  Promise.all([document.fonts ? document.fonts.ready : null].concat(SHOTS.map(function (s) { return load(s[1]); }))).then(function (res) {
    images = res.slice(1);
    // the atlas: landscape screens fill their cell, phone screens stand on the case's own tint
    var cw = mobile ? 360 : 512, ch = cw * 0.75; // 8 × 512 = 4096, the widest texture every GPU takes
    var a = document.createElement('canvas'); a.width = cw * ACOLS; a.height = ch * AROWS;
    var x = a.getContext('2d');
    images.forEach(function (im, i) {
      var cxp = (i % ACOLS) * cw, cyp = Math.floor(i / ACOLS) * ch;
      x.save(); x.translate(cxp, cyp); x.beginPath(); x.rect(0, 0, cw, ch); x.clip();
      x.fillStyle = CASES[SHOTS[i][0]].tint; x.fillRect(0, 0, cw, ch);
      if (im) {
        var ar = im.naturalWidth / im.naturalHeight;
        if (ar > 1.1) {
          var s = Math.max(cw / im.naturalWidth, ch / im.naturalHeight);
          x.drawImage(im, (cw - im.naturalWidth * s) / 2, (ch - im.naturalHeight * s) / 2, im.naturalWidth * s, im.naturalHeight * s);
        } else {
          var hh = ch * 0.88, ww = hh * ar;
          x.drawImage(im, (cw - ww) / 2, (ch - hh) / 2, ww, hh);
        }
      }
      x.restore();
    });
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, atlasTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, a);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.uniform1fv(U.uCase, SHOTS.map(function (s) { return s[0]; }).concat(new Array(40 - N).fill(-1)));
    // start with a tile's corner near the middle, not mid-gap
    off.x = -W * 0.32; off.y = -H * 0.18;
    var l = document.getElementById('loading'); l.style.opacity = 0; setTimeout(function () { l.remove(); }, 800);
    requestAnimationFrame(frame);
    addEventListener('resize', function () { if (innerWidth > 50 && innerHeight > 50) size(); });
  });
})();
