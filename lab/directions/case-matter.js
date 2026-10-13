// Matter, for a case page: the points have no stored shapes at all. Every
// scene is worked out in the vertex shader from the point's index, so ten
// chapters cost one draw call and no buffers. Scene 0 is the hero picture,
// sampled from its texture; the picture on the page dissolves into it.
(function () {
  var VS = [
    '#version 300 es',
    'precision highp float;',
    'uniform vec2 uRes, uGrid, uMouse;',
    'uniform vec4 uHero;',
    'uniform float uT, uScene, uSub, uStep, uPersona, uDpr, uMobile, uMouseOn, uN, uHeroVis, uDim;',
    'uniform sampler2D uImg;',
    'out vec3 vC; out float vR;',
    'const float TAU = 6.2831853;',
    'float h1(float n){ return fract(sin(n * 12.9898 + 4.1) * 43758.5453); }',
    // persona colours, then the red the brand is built on
    'const vec3 PAL[5] = vec3[5](vec3(0.56,0.83,1.0), vec3(1.0,0.82,0.54), vec3(0.72,0.94,0.79), vec3(1.0,0.62,0.69), vec3(1.0,0.36,0.33));',
    // the primitives of the real token set
    'const vec3 TOK[8] = vec3[8](vec3(0.8,0.0,0.0), vec3(1.0), vec3(0.925,0.937,0.941), vec3(0.831,0.855,0.867), vec3(0.498,0.529,0.553), vec3(0.812,0.941,0.867), vec3(0.047,0.443,0.208), vec3(0.663,0.278,0.133));',
    'void shape(int k, float id, vec4 r, out vec2 p, out vec3 c, out float sz, out float sq){',
    '  vec2 C = uMobile > 0.5 ? vec2(uRes.x * 0.5, uRes.y * 0.42) : vec2(uRes.x * 0.7, uRes.y * 0.5);',
    '  float R = uMobile > 0.5 ? min(uRes.x * 0.42, uRes.y * 0.3) : min(uRes.x * 0.24, uRes.y * 0.34);',
    '  sq = 0.0; sz = 1.4 + r.w;',
    '  if (k == 0) {',
    '    float col = mod(id, uGrid.x), row = floor(id / uGrid.x);',
    '    if (row >= uGrid.y) { p = vec2(r.x * uRes.x, uHero.y + r.y * uHero.w); c = vec3(0.06); return; }',
    '    vec2 uv = (vec2(col, row) + 0.5) / uGrid;',
    '    p = uHero.xy + uv * uHero.zw;',
    '    c = texture(uImg, uv).rgb * 0.92; sz = uHero.z / uGrid.x; sq = 1.0; return;',
    '  }',
    // 01 — everything scattered; reading on pulls it into one ring, one entry point
    '  if (k == 1) {',
    '    vec2 sc = vec2(r.x * uRes.x * 1.1 - uRes.x * 0.05, r.y * uRes.y) + vec2(sin(uT * 0.3 + r.z * TAU), cos(uT * 0.27 + r.w * TAU)) * 26.0;',
    '    float a = r.x * TAU + uT * 0.22, rr = R * (0.86 + 0.14 * r.y);',
    '    vec2 ring = C + vec2(cos(a), sin(a)) * rr;',
    '    float s = clamp((uSub * 1.7 - 0.35 - r.z * 0.5) / 0.5, 0.0, 1.0); s = s * s * (3.0 - 2.0 * s);',
    '    p = mix(sc, ring, s);',
    '    c = mix(PAL[int(floor(r.w * 4.0))] * (0.3 + 0.4 * r.y), PAL[4] * (0.55 + 0.45 * r.y), s);',
    '    return;',
    '  }',
    // 02 — a road with six stations; the one being read is lit
    '  if (k == 2) {',
    '    float node = floor(r.z * 6.0); bool at = r.y < 0.32;',
    '    float u = at ? (node + 0.5) / 6.0 : r.x;',
    '    vec2 a = C + vec2(-R * 0.5, -R * 1.15), b = C + vec2(R * 0.5, R * 1.15);',
    '    vec2 d = b - a, n = normalize(vec2(-d.y, d.x));',
    '    vec2 q = a + d * u + n * sin(u * TAU) * R * 0.6;',
    '    float on = 1.0 - step(0.5, abs(node - uStep));',
    '    if (at) { float g = r.w * TAU; q += vec2(cos(g), sin(g)) * R * (0.07 + 0.08 * on) * sqrt(fract(r.x * 7.31)); }',
    '    else q += n * (fract(r.w * 13.1) - 0.5) * 5.0;',
    '    p = q;',
    '    c = at ? mix(vec3(0.5, 0.53, 0.6) * 0.22, PAL[4] * 0.5, on) * (0.55 + 0.45 * fract(r.x * 3.7)) : vec3(0.3, 0.32, 0.38) * 0.8;',
    '    sz = at ? 1.3 + on * 0.6 : 1.1;',
    '    return;',
    '  }',
    // 03 — strategy: quiet streams moving one way
    '  if (k == 3) {',
    // on a wide screen the streams keep to the right, clear of the text
    '    float x0 = uMobile > 0.5 ? -uRes.x * 0.15 : uRes.x * 0.46;',
    '    float band = floor(r.y * 7.0), span = uRes.x * (uMobile > 0.5 ? 1.3 : 0.62);',
    '    float x = x0 + mod(r.x * span + uT * (16.0 + r.z * 26.0), span);',
    '    p = vec2(x, C.y - R + band * (R * 2.0 / 6.0) + sin(x * 0.004 + uT * 0.4 + band) * 14.0 + (r.w - 0.5) * 9.0);',
    '    c = (band == 3.0 ? PAL[4] : vec3(0.42, 0.46, 0.56)) * (0.45 + 0.35 * r.z);',
    '    return;',
    '  }',
    // 04 — four persona groups; the one in view leans forward
    '  if (k == 4) {',
    '    float g = floor(r.x * 4.0), on = 1.0 - step(0.5, abs(g - uPersona));',
    '    vec2 off = vec2(mod(g, 2.0) - 0.5, floor(g / 2.0) - 0.5) * R * 1.15;',
    '    float a = r.z * TAU + uT * (0.12 + 0.12 * on);',
    '    p = C + off + vec2(cos(a), sin(a)) * R * (0.3 + 0.1 * on) * sqrt(r.y);',
    '    c = PAL[int(g)] * (0.28 + 0.72 * on) * (0.55 + 0.45 * r.w);',
    '    sz = 1.3 + on;',
    '    return;',
    '  }',
    // 05 — three tiers of tokens, each as big as its share: 158, 45, 459
    '  if (k == 5) {',
    '    float tier = r.x < 0.239 ? 0.0 : (r.x < 0.307 ? 1.0 : 2.0);',
    '    vec2 cc = C + vec2(0.0, (tier - 1.0) * R * 0.78);',
    '    float a = r.y * TAU, rad = sqrt(r.z);',
    '    p = cc + vec2(cos(a) * R * 1.0, sin(a) * R * 0.22) * rad;',
    '    if (r.w > 0.93) { float ph = fract(uT * 0.22 + r.y); p = mix(C + vec2((r.z - 0.5) * R * 1.6, -R * 0.78), C + vec2((r.z - 0.5) * R * 1.6, R * 0.78), ph); }',
    '    vec3 tk = TOK[int(floor(fract(r.w * 17.3) * 8.0))];',
    '    c = tier == 0.0 ? tk * 0.85 : (tier == 1.0 ? mix(tk, vec3(0.7), 0.5) * 0.7 : vec3(0.62, 0.65, 0.72) * (0.35 + 0.3 * r.w));',
    '    sz = tier == 0.0 ? 2.4 : (tier == 1.0 ? 1.8 : 1.3);',
    '    return;',
    '  }',
    // 06 — two sessions, two rings, overlapping where they agreed
    '  if (k == 6) {',
    '    float g = step(0.5, r.x);',
    '    vec2 cc = C + vec2((g - 0.5) * R * 0.75, 0.0);',
    '    float a = r.y * TAU + uT * (g > 0.5 ? 0.18 : -0.18);',
    '    p = cc + vec2(cos(a), sin(a)) * R * (0.62 + (r.z - 0.5) * 0.08);',
    '    c = (g > 0.5 ? PAL[2] : PAL[3]) * (0.45 + 0.45 * r.w);',
    '    return;',
    '  }',
    // 07 — Figma → MCP → IDE → production: four stations and what flows between them
    '  if (k == 7) {',
    '    vec2 a = C + vec2(-R * 1.3, 0.0), b = C + vec2(R * 1.3, 0.0);',
    '    if (r.y < 0.42) { float node = floor(r.z * 4.0); float g = r.w * TAU;',
    '      p = mix(a, b, node / 3.0) + vec2(cos(g), sin(g)) * R * 0.12 * sqrt(fract(r.x * 5.7));',
    '      c = PAL[int(node)] * (0.22 + 0.25 * fract(r.x * 3.1)); sz = 1.5; }',
    '    else { float u = fract(r.x + uT * 0.06 * (0.6 + r.z));',
    '      p = mix(a, b, u) + vec2(0.0, sin(u * TAU * 2.0 + r.w * 2.0) * R * 0.05 + (r.w - 0.5) * R * 0.08);',
    '      c = vec3(0.75, 0.8, 0.9) * (0.25 + 0.35 * r.z); sz = 1.2; }',
    '    return;',
    '  }',
    // 08 — listen, synthesize, ship, validate: a loop that keeps turning
    '  if (k == 8) {',
    '    float a = r.x * TAU + uT * 0.35;',
    '    float node = floor(r.z * 4.0);',
    '    if (r.y < 0.35) { a = node * TAU / 4.0 - TAU / 4.0 + uT * 0.35; float g = r.w * TAU;',
    '      p = C + vec2(cos(a), sin(a)) * R * 0.85 + vec2(cos(g), sin(g)) * R * 0.1 * sqrt(fract(r.x * 9.1));',
    '      c = PAL[int(node)] * 0.35; sz = 1.5; }',
    '    else { p = C + vec2(cos(a), sin(a)) * R * (0.85 + (r.w - 0.5) * 0.06); c = mix(PAL[0], PAL[3], 0.5 + 0.5 * sin(r.x * TAU)) * 0.45; }',
    '    return;',
    '  }',
    // 09 — it all becomes one thing, turning slowly
    '  float yS = 1.0 - (id / uN) * 2.0, rad = sqrt(max(0.0, 1.0 - yS * yS)), th = id * 2.39996323;',
    '  vec3 s = vec3(cos(th) * rad, yS, sin(th) * rad);',
    '  float a = uT * 0.15; s = vec3(s.x * cos(a) + s.z * sin(a), s.y, -s.x * sin(a) + s.z * cos(a));',
    '  float tl = 0.35; s = vec3(s.x, s.y * cos(tl) - s.z * sin(tl), s.y * sin(tl) + s.z * cos(tl));',
    '  p = C + s.xy * R * 0.95 / (1.5 - s.z * 0.5);',
    '  c = mix(vec3(0.62, 0.84, 0.78), vec3(1.0, 0.45, 0.42), s.y * 0.5 + 0.5) * (0.35 + 0.65 * (s.z * 0.5 + 0.5));',
    '}',
    'void main(){',
    '  float id = float(gl_VertexID);',
    '  vec4 r = vec4(h1(id), h1(id + 71.3), h1(id + 193.7), h1(id + 311.1));',
    '  float seg = min(floor(uScene), 8.0), f = uScene - seg;',
    '  float t = clamp((f - r.x * 0.35) / 0.65, 0.0, 1.0); t = t * t * (3.0 - 2.0 * t);',
    '  vec2 pA, pB; vec3 cA, cB; float sA, sB, qA, qB;',
    '  shape(int(seg), id, r, pA, cA, sA, qA);',
    '  shape(int(seg) + 1, id, r, pB, cB, sB, qB);',
    '  vec2 pos = mix(pA, pB, t);',
    '  float fly = sin(t * 3.14159);',
    '  pos += (vec2(h1(id + 5.1), h1(id + 9.7)) - 0.5) * 2.0 * 150.0 * fly;',
    '  float sq = mix(qA, qB, t);',
    '  vec2 dm = pos - uMouse; float push = smoothstep(130.0, 0.0, length(dm)) * uMouseOn * (1.0 - sq * 0.85);',
    '  pos += normalize(dm + 0.0001) * push * 34.0;',
    '  vec3 c = mix(cA, cB, t) + push * 0.2;',
    // on a phone the scene sits behind the text, so it steps back
    // more points overlap more: keep the dense scenes from burning out
    '  c *= mix(uDim, 1.0, sq);',
    '  c *= mix(1.0, 0.6, uMobile * (1.0 - sq));',
    '  vC = c; vR = 1.0 - sq;',
    '  gl_PointSize = mix(sA, sB, t) * uDpr;',
    '  gl_Position = vec4(pos.x / uRes.x * 2.0 - 1.0, 1.0 - pos.y / uRes.y * 2.0, 0.0, 1.0);',
    '}'
  ].join('\n');
  var FS = [
    '#version 300 es',
    'precision mediump float;',
    'in vec3 vC; in float vR; out vec4 o;',
    'void main(){ float m = mix(1.0, 1.0 - smoothstep(0.22, 0.5, length(gl_PointCoord - 0.5)), vR); o = vec4(vC * m, 1.0); }'
  ].join('\n');

  var gl, prog, U = {}, N, grid = [1, 1], img;
  window.CaseRenderers = window.CaseRenderers || {};
  window.CaseRenderers.matter = {
    init: function (canvas, env) {
      gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, powerPreference: 'high-performance' });
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
      ['uRes', 'uGrid', 'uMouse', 'uHero', 'uT', 'uScene', 'uSub', 'uStep', 'uPersona', 'uDpr', 'uMobile', 'uMouseOn', 'uN', 'uHeroVis', 'uImg', 'uDim']
        .forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
      gl.bindVertexArray(gl.createVertexArray());
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      return true;
    },
    load: function () {
      return new Promise(function (res, rej) {
        img = new Image(); img.src = document.getElementById('heroImg').src;
        img.onload = res; img.onerror = rej;
        if (img.complete && img.naturalWidth) res();
      }).then(function () {
        var t = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      });
    },
    build: function (env) {
      N = env.mobile ? 42000 : 96000;
      var aspect = img.naturalWidth / img.naturalHeight;
      grid[0] = Math.floor(Math.sqrt(N * aspect)); grid[1] = Math.floor(N / grid[0]);
      var c = gl.canvas;
      c.width = Math.round(env.W * env.dpr); c.height = Math.round(env.H * env.dpr);
      gl.viewport(0, 0, c.width, c.height);
      gl.uniform2f(U.uRes, env.W, env.H); gl.uniform2f(U.uGrid, grid[0], grid[1]);
      gl.uniform1f(U.uDpr, env.dpr); gl.uniform1f(U.uMobile, env.mobile ? 1 : 0); gl.uniform1f(U.uN, N);
      gl.uniform1i(U.uImg, 0);
      gl.uniform1f(U.uDim, Math.pow(Math.min(1, 38000 / N), 0.8));
    },
    frame: function (env) {
      var hr = env.heroRect;
      gl.uniform4f(U.uHero, hr.x, hr.y, hr.w, hr.h);
      gl.uniform1f(U.uT, env.t); gl.uniform1f(U.uScene, Math.min(9, env.scene)); gl.uniform1f(U.uSub, env.sub);
      gl.uniform1f(U.uStep, env.step); gl.uniform1f(U.uPersona, env.persona);
      gl.uniform2f(U.uMouse, env.mouse.x, env.mouse.y); gl.uniform1f(U.uMouseOn, env.reduce ? 0 : env.mouse.on);
      gl.uniform1f(U.uHeroVis, env.heroVis);
      gl.clearColor(0.027, 0.031, 0.043, 1); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.POINTS, 0, N);
    }
  };
})();
