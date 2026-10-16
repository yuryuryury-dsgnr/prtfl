// Residence 14B — a concept: a home presented by the scroll, the way the portfolio's home page is.
// One world at every scale: a city at night, the tower in it, the fourteenth floor, the flat on it,
// its rooms one by one, and a June day of sun through its windows. All of it is points (raw WebGL).
// The camera is an orbit (target, distance, yaw, pitch) per stage, its distance eased on a log scale,
// so a flight from a district down to a sofa spends as long at each end.
// The sun is real geometry: a point of the flat is lit when the ray from it towards the sun leaves
// through one of its room's windows, so the patches move across the floor and up the walls by the hour.
// Runs on the portfolio's shell (bkit.js: scroll → stage, captions, rail, keys, settle).
(function () {
  // ——— the place, in centimetres ———
  var FH = 320, FLOORS = 22, Y14 = 13 * FH;
  // the tower's half-width (x, west → east) and half-depth (z, north → south)
  var TW = 1500, TD = 1000;
  // the flat: the tower's south-west corner on the fourteenth floor; local x from its west wall, z from its north wall
  var AX = -TW, AZ = 0, AW = 1600, AD = 1000, CEIL = 300;
  var BLOCK = 13000, STREET = 2600;

  var ROOMS = [
    { name: 'Living & dining', area: '39.5', rects: [[0, 480, 760, 1000]], floor: [0.62, 0.47, 0.32], wood: 1 },
    { name: 'Kitchen', area: '18.7', rects: [[760, 480, 1120, 1000]], floor: [0.52, 0.52, 0.55], wood: 0 },
    { name: 'Bedroom', area: '27.8', rects: [[1120, 420, 1600, 1000]], floor: [0.6, 0.46, 0.36], wood: 1 },
    { name: 'Study', area: '20.2', rects: [[0, 0, 420, 480]], floor: [0.56, 0.44, 0.32], wood: 1 },
    { name: 'Bath', area: '9.0', rects: [[420, 0, 720, 300]], floor: [0.42, 0.52, 0.58], wood: 0 },
    { name: 'Hall', area: '24.6', rects: [[420, 300, 1120, 480], [720, 0, 1120, 300]], floor: [0.52, 0.45, 0.36], wood: 1 },
    { name: 'Dressing & bath', area: '20.2', rects: [[1120, 0, 1600, 420]], floor: [0.48, 0.48, 0.52], wood: 0 }
  ];
  function roomAt(x, z) {
    for (var i = 0; i < ROOMS.length; i++) for (var j = 0; j < ROOMS[i].rects.length; j++) {
      var r = ROOMS[i].rects[j];
      if (x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3]) return i;
    }
    return -1;
  }
  // walls from a to b; openings along them [from, to, bottom, top], 'w' for a window in the facade
  var WALLS = [
    { a: [0, 0], b: [0, 1000], open: [[120, 380, 60, 270, 'w'], [560, 920, 20, 285, 'w']] },
    { a: [0, 1000], b: [1600, 1000], open: [[90, 660, 20, 285, 'w'], [830, 1050, 95, 270, 'w'], [1200, 1520, 20, 285, 'w']] },
    { a: [0, 0], b: [1600, 0], open: [[860, 960, 0, 220]] },
    { a: [1600, 0], b: [1600, 1000] },
    { a: [0, 480], b: [760, 480], open: [[460, 720, 0, 240]] },
    { a: [760, 480], b: [760, 620] },
    { a: [760, 480], b: [1120, 480], open: [[120, 240, 0, 220]] },
    { a: [1120, 420], b: [1120, 1000] },
    { a: [1120, 420], b: [1600, 420], open: [[60, 150, 0, 220]] },
    { a: [1120, 0], b: [1120, 420], open: [[150, 240, 0, 220]] },
    { a: [420, 0], b: [420, 480], open: [[360, 450, 0, 220]] },
    { a: [420, 300], b: [720, 300], open: [[180, 270, 0, 220]] },
    { a: [720, 0], b: [720, 300] }
  ];
  // the windows the sun comes through: (from, to, sill, head) along the facade, and (room, facade: 0 south, 1 west)
  var WIN = [], WINR = [];
  WALLS.forEach(function (w) {
    var west = w.a[0] === 0 && w.b[0] === 0, south = w.a[1] === 1000 && w.b[1] === 1000;
    (w.open || []).forEach(function (o) {
      if (o[4] !== 'w') return;
      var m = (o[0] + o[1]) / 2;
      WIN.push(o[0], o[1], o[2], o[3]);
      WINR.push(west ? roomAt(30, m) : roomAt(m, 970), south ? 0 : 1);
    });
  });
  var FAB = [0.74, 0.64, 0.54], WOOD = [0.64, 0.46, 0.3], DARK = [0.36, 0.37, 0.42], LINEN = [0.86, 0.86, 0.9],
    STONE = [0.8, 0.8, 0.83], RUG = [0.58, 0.32, 0.27], LEAF = [0.32, 0.62, 0.44], GLASS = [0.4, 0.55, 0.7];
  // [room, x0, z0, x1, z1, y0, y1, colour]
  var FURN = [
    [0, 80, 490, 420, 530, 0, 50, DARK],
    [0, 80, 760, 440, 850, 0, 42, FAB], [0, 80, 820, 440, 850, 42, 84, FAB], [0, 80, 760, 112, 820, 42, 60, FAB], [0, 408, 760, 440, 820, 42, 60, FAB],
    [0, 180, 630, 340, 710, 0, 36, WOOD],
    [0, 60, 580, 460, 900, 0, 1.5, RUG],
    [0, 520, 620, 700, 860, 70, 76, WOOD], [0, 530, 630, 540, 640, 0, 70, WOOD], [0, 680, 630, 690, 640, 0, 70, WOOD], [0, 530, 840, 540, 850, 0, 70, WOOD], [0, 680, 840, 690, 850, 0, 70, WOOD],
    [0, 20, 940, 60, 980, 0, 40, DARK],
    [1, 1060, 560, 1120, 980, 0, 92, STONE], [1, 1060, 480, 1120, 560, 0, 220, WOOD],
    [1, 850, 650, 960, 860, 0, 92, STONE],
    [2, 1270, 440, 1450, 650, 0, 48, LINEN], [2, 1270, 428, 1450, 446, 0, 112, WOOD], [2, 1285, 452, 1435, 500, 48, 60, LINEN], [2, 1270, 560, 1450, 650, 48, 53, FAB],
    [2, 1210, 440, 1260, 490, 0, 55, WOOD], [2, 1460, 440, 1510, 490, 0, 55, WOOD],
    [2, 1300, 672, 1420, 706, 0, 45, FAB],
    [2, 1470, 850, 1560, 940, 0, 42, FAB], [2, 1470, 925, 1560, 940, 42, 86, FAB],
    [2, 1220, 600, 1500, 820, 0, 1.5, RUG],
    [3, 30, 140, 110, 360, 70, 76, WOOD], [3, 30, 140, 110, 148, 0, 70, WOOD], [3, 30, 352, 110, 360, 0, 70, WOOD],
    [3, 130, 215, 180, 265, 0, 48, DARK], [3, 172, 215, 180, 265, 48, 92, DARK],
    [3, 120, 10, 400, 45, 0, 210, WOOD], [3, 120, 10, 400, 45, 70, 71, WOOD], [3, 120, 10, 400, 45, 140, 141, WOOD],
    [3, 290, 330, 380, 410, 0, 42, FAB],
    [4, 440, 20, 700, 100, 0, 55, STONE], [4, 620, 220, 710, 290, 0, 85, WOOD],
    [5, 990, 20, 1110, 60, 0, 90, WOOD], [5, 440, 400, 600, 440, 0, 45, WOOD],
    [6, 1140, 10, 1590, 70, 0, 220, WOOD], [6, 1460, 300, 1590, 410, 0, 210, GLASS], [6, 1140, 330, 1250, 410, 0, 85, STONE]
  ];
  // stools at the island and chairs at the table: [room, x, z, seat, back side (-1 none, 0 west, 1 east)]
  var SEATS = [[1, 800, 670, 68, -1], [1, 800, 740, 68, -1], [1, 800, 810, 68, -1],
    [0, 478, 650, 45, 0], [0, 478, 725, 45, 0], [0, 478, 800, 45, 0], [0, 708, 650, 45, 1], [0, 708, 725, 45, 1], [0, 708, 800, 45, 1]];
  // the lamps (local): two over the table, two over the island, two by the bed
  var LAMPS = [610, 195, 690, 610, 195, 790, 905, 200, 710, 905, 200, 800, 1235, 75, 465, 1485, 75, 465];

  // ——— the stages ———
  // 0 the city · 1 where it is · 2 the tower · 3 the plan · 4 living · 5 kitchen · 6 bedroom · 7 → 8 a day · 9 details
  var LAST = 9, DAY = 7;
  // per stage: target, distance, yaw (0: from the south), pitch, the picture's shift on a wide screen (x)
  // and on a phone (y), and the hour (-1: night)
  var ST = [
    { t: [0, 3300, 0], d: 14000, yaw: -0.55, pitch: 0.17, lx: 0.3, ly: 0.14, h: -1 },
    { t: [2000, 0, 3000], d: 64000, yaw: -0.3, pitch: 0.98, lx: 0.24, ly: 0.2, h: -1 },
    { t: [-700, 4300, 500], d: 8200, yaw: -0.66, pitch: 0.1, lx: 0.3, ly: 0.16, h: -1 },
    { t: [AX + 800, Y14, AZ + 520], d: 2300, yaw: 0, pitch: 1.3, lx: 0.2, ly: 0.22, h: 15 },
    { t: [AX + 400, Y14 + 60, AZ + 720], d: 1250, yaw: -0.75, pitch: 0.62, lx: 0.24, ly: 0.24, h: 17.5 },
    { t: [AX + 940, Y14 + 60, AZ + 740], d: 1250, yaw: 0.3, pitch: 0.7, lx: 0.24, ly: 0.24, h: 10 },
    { t: [AX + 1360, Y14 + 50, AZ + 700], d: 1250, yaw: 0.62, pitch: 0.66, lx: 0.24, ly: 0.24, h: 13 },
    { t: [AX + 800, Y14, AZ + 500], d: 2100, yaw: -0.6, pitch: 0.9, lx: 0.12, ly: 0.12, h: 7 },
    { t: [AX + 800, Y14, AZ + 500], d: 2100, yaw: 0.6, pitch: 0.9, lx: 0.12, ly: 0.12, h: 20.3 },
    { t: [0, 3600, 0], d: 12500, yaw: 0.5, pitch: 0.15, lx: 0.3, ly: 0.5, h: -1 }
  ];

  // the scroll track: how many screens each flight takes, and a short hold where a stage is read;
  // the day has none, it is scrolled like a page
  var keys = [], stops = [];
  (function () {
    var RUNS = [1.4, 1.5, 1.6, 1.2, 1.1, 1.1, 1.3, 3.2, 1.6], HOLD = 0.4, pos = 0.15, i;
    keys.push([0, 0], [pos, 0]); stops.push(0);
    for (i = 0; i < RUNS.length; i++) {
      pos += RUNS[i]; keys.push([pos, i + 1]); stops.push(pos);
      if (i + 1 < LAST && i + 1 !== DAY) { pos += HOLD; keys.push([pos, i + 1]); }
    }
    for (i = 0; i < keys.length; i++) keys[i][0] /= pos;
    for (i = 1; i < stops.length; i++) stops[i] /= pos;
    document.querySelector('.track').style.height = ((pos + 1) * 100) + 'vh';
  })();

  var VS = [
    'precision highp float;',
    'attribute vec3 aPos; attribute vec3 aCol; attribute vec4 aInfo; attribute vec3 aAlt;',
    'uniform mat4 uView, uProj; uniform vec3 uEye, uApt;',
    'uniform float uT, uDpr, uF, uFocus, uBokeh, uMaxSize, uIn, uExt;',
    'uniform float uCity, uTower, uFlat, uHi, uPoi, uLampOn, uSunOn, uOut;',
    'uniform vec3 uSun, uSunCol;',
    'uniform vec4 uWin[6]; uniform vec2 uWinR[6]; uniform vec3 uLamp[6]; uniform float uRoomLit[7];',
    'varying vec3 vC; varying float vA;',
    // is the ray from q (the flat's own coordinates) to the sun leaving through one of the room's windows?
    // The edge of the patch softens with the distance to the window, as a real one does
    'float sunAt(vec3 q, float room){',
    '  float lit = 0.0;',
    '  for (int i = 0; i < 6; i++) {',
    '    vec2 wr = uWinR[i]; if (abs(wr.x - room) > 0.5) continue;',
    '    vec4 w = uWin[i]; float t, a;',
    '    if (wr.y < 0.5) { if (uSun.z < 0.03) continue; t = (1000.0 - q.z) / uSun.z; a = q.x + t * uSun.x; }',
    '    else { if (uSun.x > -0.03) continue; t = -q.x / uSun.x; a = q.z + t * uSun.z; }',
    '    if (t < 0.0) continue;',
    '    float h = q.y + t * uSun.y, e = 2.0 + t * 0.012;',
    '    lit += smoothstep(w.x - e, w.x + e, a) * (1.0 - smoothstep(w.y - e, w.y + e, a)) * smoothstep(w.z - e, w.z + e, h) * (1.0 - smoothstep(w.w - e, w.w + e, h));',
    '  }',
    '  return min(lit, 1.0);',
    '}',
    'void main(){',
    '  float kind = aInfo.x, grp = aInfo.y, rnd = aInfo.z, rnd2 = aInfo.w;',
    '  vec3 p = aPos, col = aCol; float r = 2.0, vis = 1.0, grow = 0.0;',
    // stars: directions, as far off as the eye goes
    '  if (kind < 0.5) {',
    '    gl_Position = uProj * (uView * vec4(uEye + aPos * 150000.0, 1.0));',
    '    float sa = (0.3 + 0.25 * sin(uT * (0.4 + rnd) + rnd2 * 30.0)) * uCity * uIn;',
    '    vC = col * sa; vA = sa; gl_PointSize = uDpr * (1.0 + rnd2 * 0.6); return;',
    '  }',
    // the city: buildings, street lights, cars, the river, the park, rings round the places nearby
    '  if (kind < 1.5) { r = 105.0; vis = uCity; col *= 0.8 + 0.2 * sin(uT * (0.3 + rnd) + rnd2 * 40.0); }',
    '  else if (kind < 2.5) { r = 110.0; vis = uCity; }',
    '  else if (kind < 3.5) { r = 60.0; vis = uCity; p += aAlt * uT;',
    '    if (abs(aAlt.x) > 0.0) p.x = mod(p.x + uExt, 2.0 * uExt) - uExt; else p.z = mod(p.z + uExt, 2.0 * uExt) - uExt; }',
    '  else if (kind < 4.5) { r = 95.0; vis = uCity; col *= 0.55 + 0.45 * sin(uT * 1.1 + p.x * 0.0005 + rnd * 6.28); }',
    '  else if (kind < 5.5) { r = 100.0; vis = uCity; }',
    '  else if (kind < 6.5) { r = 110.0; vis = uCity * uPoi;',
    '    if (rnd2 < 0.5) { float k = fract(uT * 0.45 + grp * 0.27); p = aAlt + (p - aAlt) * (0.2 + k * 1.6); vis *= 1.0 - k; } }',
    // the tower: its lines (7) and lit windows (8); the flat's floor of it lights up gold
    '  else if (kind < 8.5) {',
    '    r = kind < 7.5 ? 13.0 : 15.0; vis = uTower;',
    '    vec3 q = p - uApt;',
    '    float on = step(-3.0, q.x) * step(q.x, 1603.0) * step(-3.0, q.z) * step(q.z, 1003.0) * step(-3.0, q.y) * step(q.y, 323.0) * uHi;',
    '    col = mix(col, vec3(1.0, 0.76, 0.4) * (kind < 7.5 ? 1.2 : 1.8), on); r *= 1.0 + on * 0.5;',
    '  }',
    // the flat: walls (10), floor (11), furniture (12), dust in the air (13), lamps (14)
    '  else {',
    '    vis = uFlat;',
    '    vec3 q = p - uApt;',
    '    r = kind < 10.5 ? 1.7 : kind < 11.5 ? 1.9 : kind < 12.5 ? 1.7 : kind < 13.5 ? 1.4 : 2.6;',
    '    if (kind > 12.5 && kind < 13.5) q += vec3(sin(uT * 0.21 + rnd * 6.28) * 7.0, sin(uT * 0.13 + rnd2 * 6.28) * 9.0, cos(uT * 0.17 + rnd * 9.0) * 7.0);',
    '    float sun = grp > -0.5 ? sunAt(q, grp) * uSunOn : 0.0;',
    '    float lamp = 0.0;',
    '    for (int i = 0; i < 6; i++) { vec3 dl = q - uLamp[i]; lamp += exp(-dot(dl, dl) / 26000.0); }',
    '    lamp *= uLampOn;',
    '    if (kind > 12.5 && kind < 13.5) { vis *= sun; col = uSunCol * 1.3; }',
    '    else if (kind > 13.5) { col *= 0.3 + uLampOn * 1.5; }',
    '    else {',
    '      float rl = grp > -0.5 ? uRoomLit[int(grp + 0.5)] : uOut;',
    '      col = col * rl * (1.0 - 0.3 * uSunOn) + uSunCol * sun * (kind < 10.5 ? 0.7 : 1.1) + vec3(1.0, 0.68, 0.38) * lamp * 0.7;',
    '      grow = sun * 0.9;',
    '    }',
    '    p = q + uApt;',
    '  }',
    '  vec4 v = uView * vec4(p, 1.0); float d = -v.z;',
    '  gl_Position = uProj * v;',
    // perspective size, a disc that opens away from the focus, and a point too small for a pixel
    // gives up its light rather than its size
    '  float size = r * uF / max(d, 1.0) * (1.0 + grow);',
    '  float blur = abs(d - uFocus) / uFocus;',
    '  size += blur * blur * uBokeh;',
    '  float a = 1.0;',
    '  if (size < 1.0) { a = size * size; size = 1.0; }',
    '  a *= kind < 6.5 ? min(1.0, 2.4 / size) : min(1.0, 2.4 / (size * size));',
    '  a *= exp(-max(d - uFocus, 0.0) / (uFocus * 1.3)) * smoothstep(uFocus * 0.1, uFocus * 0.28, d) * vis * uIn;',
    '  size = min(size, uMaxSize);',
    '  vC = col * a; vA = a;',
    '  gl_PointSize = size * uDpr;',
    // a point that can't be seen costs nothing
    '  if (a < 0.003) { gl_PointSize = 0.0; gl_Position = vec4(2.0, 2.0, 2.0, 1.0); }',
    '}'
  ].join('\n');
  var FS = [
    'precision mediump float;',
    'varying vec3 vC; varying float vA;',
    'void main(){',
    '  float m = 1.0 - smoothstep(0.28, 0.5, length(gl_PointCoord - 0.5));',
    '  gl_FragColor = vec4(vC * m, vA * m);',
    '}'
  ].join('\n');

  // ——— the points, straight into the arrays the GPU takes ———
  var seed = 14;
  function rnd() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
  var CAP = 0, N = 0, P, C, I, X;
  function grow(min) {
    var cap = Math.max(min, CAP * 2 || 131072);
    function g(a, k) { var b = new Float32Array(cap * k); if (a) b.set(a.subarray(0, N * k)); return b; }
    P = g(P, 3); C = g(C, 3); I = g(I, 4); X = g(X, 3); CAP = cap;
  }
  function put(x, y, z, c, k, kind, grp, ax, ay, az) {
    if (N >= CAP) grow(N + 1);
    var j = N * 3;
    P[j] = x; P[j + 1] = y; P[j + 2] = z; C[j] = c[0] * k; C[j + 1] = c[1] * k; C[j + 2] = c[2] * k;
    X[j] = ax || 0; X[j + 1] = ay || 0; X[j + 2] = az || 0;
    j = N * 4; I[j] = kind; I[j + 1] = grp; I[j + 2] = rnd(); I[j + 3] = rnd();
    N++;
  }
  function line(x0, y0, z0, x1, y1, z1, step, c, k, kind, grp) {
    var n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0, z1 - z0) / step));
    for (var i = 0; i <= n; i++) { var f = i / n; put(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f, z0 + (z1 - z0) * f, c, k, kind, grp); }
  }

  // the flat, in its own coordinates, put into the world
  function flat(Q) {
    var STEP = Q < 1 ? 4.5 : 3, WALL = [0.66, 0.7, 0.8], OUT = [0.4, 0.44, 0.52];
    function at(x, y, z, c, k, kind, grp) { put(AX + x, Y14 + y, AZ + z, c, k, kind, grp); }
    WALLS.forEach(function (w) {
      var ax = w.a[0], az = w.a[1], bx = w.b[0], bz = w.b[1], len = Math.hypot(bx - ax, bz - az);
      var ux = (bx - ax) / len, uz = (bz - az) / len, nx = -uz, nz = ux, open = w.open || [], s, y, i;
      function hole(s, y) { for (var i = 0; i < open.length; i++) { var o = open[i]; if (s > o[0] && s < o[1] && y > o[2] && y < o[3]) return true; } return false; }
      [-1, 1].forEach(function (side) {
        // a wall has two faces, each lit by the room it faces
        function pt(s, y, edge) {
          var rm = roomAt(ax + ux * s + nx * 30 * side, az + uz * s + nz * 30 * side);
          at(ax + ux * s + nx * 7 * side, y, az + uz * s + nz * 7 * side, rm < 0 ? OUT : WALL, edge ? 0.9 : 0.32 + rnd() * 0.2, 10, rm);
        }
        for (s = 0; s <= len; s += STEP) { pt(s, CEIL, true); if (!hole(s, 1)) pt(s, 0, true); }
        for (y = 0; y <= CEIL; y += STEP) { pt(0, y, true); pt(len, y, true); }
        open.forEach(function (o) {
          for (y = o[2]; y <= o[3]; y += STEP) { pt(o[0], y, true); pt(o[1], y, true); }
          for (s = o[0]; s <= o[1]; s += STEP) { pt(s, o[3], true); if (o[2] > 0) pt(s, o[2], true); }
        });
        var n = len * CEIL / 450 * Q;
        for (i = 0; i < n; i++) { s = rnd() * len; y = rnd() * CEIL; if (!hole(s, y)) pt(s, y, false); }
      });
      // the glass: mullions and a faint pane
      open.forEach(function (o) {
        if (o[4] !== 'w') return;
        var bays = Math.max(1, Math.round((o[1] - o[0]) / 130)), b;
        for (b = 1; b < bays; b++) {
          s = o[0] + (o[1] - o[0]) * b / bays;
          for (y = o[2]; y <= o[3]; y += STEP) at(ax + ux * s, y, az + uz * s, WALL, 0.55, 10, -1);
        }
        var g = (o[1] - o[0]) * (o[3] - o[2]) / 900 * Q;
        for (i = 0; i < g; i++) { s = o[0] + rnd() * (o[1] - o[0]); at(ax + ux * s, o[2] + rnd() * (o[3] - o[2]), az + uz * s, GLASS, 0.3, 10, -1); }
      });
    });
    // the floors: oak in planks, stone in tiles, each room its own tone
    ROOMS.forEach(function (rm, id) {
      rm.rects.forEach(function (r) {
        var n = (r[2] - r[0]) * (r[3] - r[1]) / 55 * Q;
        for (var i = 0; i < n; i++) {
          var x = r[0] + rnd() * (r[2] - r[0]), z = r[1] + rnd() * (r[3] - r[1]), u = rnd();
          if (rm.wood && u < 0.6) z = Math.min(r[3], Math.max(r[1], Math.round(z / 16) * 16 + (rnd() - 0.5) * 1.2));
          else if (!rm.wood && u < 0.6) { if (u < 0.3) x = Math.round(x / 60) * 60; else z = Math.round(z / 60) * 60; }
          at(x, 0.5, z, rm.floor, (u < 0.6 ? 0.75 : 0.45) + rnd() * 0.2, 11, id);
        }
      });
    });
    // the furniture: boxes, their edges drawn and their faces filled
    function box(f) {
      var rm = f[0], x0 = f[1], z0 = f[2], x1 = f[3], z1 = f[4], y0 = f[5], y1 = f[6], c = f[7], E = STEP * 0.85;
      var ex = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]], i, k;
      for (k = 0; k < 4; k++) {
        var a = ex[k], b = ex[(k + 1) % 4];
        line(AX + a[0], Y14 + y1, AZ + a[1], AX + b[0], Y14 + y1, AZ + b[1], E, c, 0.95, 12, rm);
        if (y1 - y0 > 4) {
          line(AX + a[0], Y14 + y0, AZ + a[1], AX + b[0], Y14 + y0, AZ + b[1], E * 1.6, c, 0.6, 12, rm);
          line(AX + a[0], Y14 + y0, AZ + a[1], AX + a[0], Y14 + y1, AZ + a[1], E, c, 0.85, 12, rm);
        }
      }
      var top = (x1 - x0) * (z1 - z0), sx = (x1 - x0) * (y1 - y0), sz = (z1 - z0) * (y1 - y0);
      var n = (top + 2 * sx + 2 * sz) / 45 * Q;
      for (i = 0; i < n; i++) {
        var u = rnd() * (top + 2 * sx + 2 * sz), x, y, z;
        if (u < top) { x = x0 + rnd() * (x1 - x0); z = z0 + rnd() * (z1 - z0); y = y1; }
        else if (u < top + 2 * sx) { x = x0 + rnd() * (x1 - x0); y = y0 + rnd() * (y1 - y0); z = rnd() < 0.5 ? z0 : z1; }
        else { z = z0 + rnd() * (z1 - z0); y = y0 + rnd() * (y1 - y0); x = rnd() < 0.5 ? x0 : x1; }
        at(x, y, z, c, 0.4 + rnd() * 0.25, 12, rm);
      }
    }
    FURN.forEach(box);
    SEATS.forEach(function (s) {
      var c = s[0] === 1 ? DARK : WOOD;
      box([s[0], s[1], s[2], s[1] + 34, s[2] + 34, 0, s[3], c]);
      if (s[4] === 0) box([s[0], s[1], s[2], s[1] + 5, s[2] + 34, s[3], s[3] + 42, c]);
      if (s[4] === 1) box([s[0], s[1] + 29, s[2], s[1] + 34, s[2] + 34, s[3], s[3] + 42, c]);
    });
    // a plant by the window
    for (var i = 0; i < 500 * Q; i++) {
      var t = rnd() * 6.283, ph = Math.acos(2 * rnd() - 1), rr = Math.cbrt(rnd());
      at(40 + Math.sin(ph) * Math.cos(t) * 36 * rr, 105 + Math.cos(ph) * 62 * rr, 960 + Math.sin(ph) * Math.sin(t) * 36 * rr, LEAF, 0.5 + rnd() * 0.4, 12, 0);
    }
    // the lamps, and their cords to the ceiling
    for (var l = 0; l < LAMPS.length; l += 3) {
      for (i = 0; i < 90 * Q + 30; i++) {
        var a2 = rnd() * 6.283, b2 = Math.acos(2 * rnd() - 1);
        at(LAMPS[l] + Math.sin(b2) * Math.cos(a2) * 11, LAMPS[l + 1] + Math.cos(b2) * 9, LAMPS[l + 2] + Math.sin(b2) * Math.sin(a2) * 11, [1, 0.74, 0.45], 0.9, 14, -1);
      }
      if (LAMPS[l + 1] > 150) line(AX + LAMPS[l], Y14 + LAMPS[l + 1] + 9, AZ + LAMPS[l + 2], AX + LAMPS[l], Y14 + CEIL, AZ + LAMPS[l + 2], STEP, DARK, 0.6, 12, -1);
    }
    // dust in the air of the sunny rooms, seen only where a sunbeam crosses it
    [0, 1, 2, 3].forEach(function (id) {
      var r = ROOMS[id].rects[0], n = (r[2] - r[0]) * (r[3] - r[1]) / 45 * Q;
      for (var i = 0; i < n; i++) at(r[0] + rnd() * (r[2] - r[0]), 10 + rnd() * (CEIL - 20), r[1] + rnd() * (r[3] - r[1]), [1, 1, 1], 1, 13, id);
    });
  }

  // the tower, in the world: a slab line at every floor, mullions, windows lit here and there
  function tower(Q) {
    var L = 4 * (TW + TD), H = FLOORS * FH, STEEL = [0.5, 0.58, 0.72], WARM = [1, 0.78, 0.5], i, s, k;
    function per(s) {
      s = ((s % L) + L) % L;
      if (s < 2 * TW) return [-TW + s, -TD];
      s -= 2 * TW; if (s < 2 * TD) return [TW, -TD + s];
      s -= 2 * TD; if (s < 2 * TW) return [TW - s, TD];
      s -= 2 * TW; return [-TW, TD - s];
    }
    var slab = Q < 1 ? 32 : 20;
    for (k = 0; k <= FLOORS; k++) {
      for (s = 0; s < L; s += slab) { var a = per(s); put(a[0], k * FH, a[1], STEEL, 0.8, 7, k); }
      for (s = 0; s < L; s += slab * 2) { var b = per(s); put(b[0], k * FH - 30, b[1], STEEL, 0.4, 7, k); }
    }
    var bay = 250, ms = Q < 1 ? 60 : 36;
    for (s = 0; s < L; s += bay) {
      var m = per(s);
      for (var y = 0; y <= H; y += ms) put(m[0], y, m[1], STEEL, 0.45, 7, -1);
    }
    for (k = 0; k < FLOORS; k++) for (s = 0; s < L; s += bay) {
      var lobby = k === 0, mine = k === 13;
      if (!lobby && !mine && rnd() > 0.32) continue;
      var n = lobby ? 26 : 9, w = rnd() < 0.5 ? WARM : [0.75, 0.82, 1];
      for (i = 0; i < n * (Q < 1 ? 0.6 : 1); i++) {
        var q = per(s + 10 + rnd() * (bay - 20));
        put(q[0], k * FH + 30 + rnd() * (FH - 70), q[1], mine ? WARM : w, (lobby ? 0.9 : 0.45) + rnd() * 0.3, 8, k);
      }
    }
    // the roof: a parapet and the plant room
    for (s = 0; s < L; s += slab) { var r = per(s); put(r[0], H + 110, r[1], STEEL, 0.6, 7, -1); }
    var rx = 700, rz = 500;
    [[-rx, -rz, rx, -rz], [rx, -rz, rx, rz], [rx, rz, -rx, rz], [-rx, rz, -rx, -rz]].forEach(function (e) {
      line(e[0], H + 420, e[1], e[2], H + 420, e[3], slab, STEEL, 0.6, 7, -1);
      line(e[0], H, e[1], e[0], H + 420, e[1], slab, STEEL, 0.6, 7, -1);
    });
    // a red light on top
    for (i = 0; i < 12; i++) put((rnd() - 0.5) * 30, H + 640 + rnd() * 30, (rnd() - 0.5) * 30, [1, 0.25, 0.2], 1, 8, -1);
  }

  // the city around it, at night
  var NB = 4, EXT = 0;
  function riverZ(x) { return 2.05 * BLOCK + 0.55 * BLOCK * Math.sin(x / (2.2 * BLOCK) + 0.4); }
  function city(Q) {
    NB = Q < 1 ? 3 : 4; EXT = (NB + 0.5) * BLOCK;
    var EDGE = [0.45, 0.53, 0.72], WARM = [1, 0.74, 0.44], COOL = [0.62, 0.74, 1], SODIUM = [1, 0.66, 0.32], RW = 3600, i, j, k;
    function inRiver(x0, z0, x1, z1) {
      for (var x = x0; x <= x1; x += 500) { var zr = riverZ(x); if (z1 > zr - RW - 300 && z0 < zr + RW + 300) return true; }
      return false;
    }
    function building(x0, z0, x1, z1, h) {
      var es = Q < 1 ? 200 : 140, c = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]], e, y;
      for (e = 0; e < 4; e++) {
        for (y = 0; y <= h; y += es) put(c[e][0], y, c[e][1], EDGE, 0.8, 1, 0);
        line(c[e][0], h, c[e][1], c[(e + 1) % 4][0], h, c[(e + 1) % 4][1], es, EDGE, 0.8, 1, 0);
      }
      var w = x1 - x0, d = z1 - z0, g = Math.min(130, Math.max(16, (w + d) * 2 * h / 500000)) * Q;
      for (i = 0; i < g; i++) {
        var u = rnd() * (w + d) * 2, x, z;
        if (u < w) { x = x0 + u; z = z0; } else if (u < 2 * w) { x = x0 + u - w; z = z1; }
        else if (u < 2 * w + d) { x = x0; z = z0 + u - 2 * w; } else { x = x1; z = z0 + u - 2 * w - d; }
        var fl = Math.floor(rnd() * h / FH);
        put(x, fl * FH + FH * 0.5, z, rnd() < 0.7 ? WARM : COOL, 0.35 + rnd() * 0.55, 1, 1);
      }
    }
    var PARK = { '-1,1': 1, '-2,1': 1 }, SCHOOL = '-2,-2';
    for (i = -NB; i <= NB; i++) for (j = -NB; j <= NB; j++) {
      var cx = i * BLOCK, cz = j * BLOCK, hb = (BLOCK - STREET) / 2;
      if (i === 0 && j === 0) {
        // the tower's own square: a ring of lamps round it
        for (k = 0; k < 64; k++) { var an = k / 64 * 6.283; put(Math.cos(an) * 3600, 30, Math.sin(an) * 2800, SODIUM, 0.7, 2, 0); }
        continue;
      }
      if (PARK[i + ',' + j]) {
        for (k = 0; k < 70; k++) {
          var tx = cx + (rnd() - 0.5) * 2 * hb, tz = cz + (rnd() - 0.5) * 2 * hb;
          if (inRiver(tx - 1, tz - 1, tx + 1, tz + 1)) continue;
          for (var p = 0; p < 16 * Q + 6; p++) put(tx + (rnd() - 0.5) * 900, 500 + rnd() * 700, tz + (rnd() - 0.5) * 900, [0.24, 0.5, 0.4], 0.4 + rnd() * 0.4, 5, 0);
        }
        line(cx - hb, 20, cz, cx + hb, 20, cz + hb * 0.3, 300, SODIUM, 0.5, 2, 0);
        continue;
      }
      if (i + ',' + j === SCHOOL) {
        building(cx - hb + 600, cz - hb + 600, cx + 1000, cz - 1000, 1200);
        var fx0 = cx + 1600, fz0 = cz - hb + 600, fx1 = cx + hb - 600, fz1 = cz + hb - 600;
        [[fx0, fz0, fx1, fz0], [fx1, fz0, fx1, fz1], [fx1, fz1, fx0, fz1], [fx0, fz1, fx0, fz0]].forEach(function (e) { line(e[0], 10, e[1], e[2], 10, e[3], 160, [0.3, 0.7, 0.45], 0.6, 5, 0); });
        continue;
      }
      // one to four lots, each a building of its own height; closer in they stand lower than the tower
      var split = rnd(), lots = split < 0.3 ? [[0, 0, 1, 1]] : split < 0.65 ? [[0, 0, 0.5, 1], [0.5, 0, 1, 1]] : [[0, 0, 0.5, 0.5], [0.5, 0, 1, 0.5], [0, 0.5, 0.5, 1], [0.5, 0.5, 1, 1]];
      lots.forEach(function (l) {
        var x0 = cx - hb + l[0] * 2 * hb + 450, x1 = cx - hb + l[2] * 2 * hb - 450, z0 = cz - hb + l[1] * 2 * hb + 450, z1 = cz - hb + l[3] * 2 * hb - 450;
        if (inRiver(x0, z0, x1, z1)) return;
        var far = Math.max(Math.abs(i), Math.abs(j)), h = 1200 + rnd() * (far < 2 ? 2600 : 3800);
        if (rnd() < 0.08 && far > 1) h = 4800 + rnd() * 1800;
        building(x0, z0, x1, z1, h);
      });
    }
    // street lights, both sides of every street; bridges where the river cuts them
    var ls = Q < 1 ? 1600 : 1100;
    for (i = -NB - 1; i <= NB; i++) {
      var sx = (i + 0.5) * BLOCK, bridge = i === -2 || i === 1 || i === 3;
      for (var z = -EXT; z <= EXT; z += ls) {
        var wet = Math.abs(z - riverZ(sx)) < RW;
        if (wet && !bridge) continue;
        put(sx - 900, wet ? 400 : 60, z, SODIUM, 0.9, 2, 0); put(sx + 900, wet ? 400 : 60, z, SODIUM, 0.9, 2, 0);
      }
      var sz = (i + 0.5) * BLOCK;
      for (var x = -EXT; x <= EXT; x += ls) {
        if (Math.abs(sz - riverZ(x)) < RW) continue;
        put(x, 60, sz - 900, SODIUM, 0.9, 2, 0); put(x, 60, sz + 900, SODIUM, 0.9, 2, 0);
      }
    }
    // the kerbs, faint, so the streets read as a map from above
    var ks = Q < 1 ? 460 : 260, KERB = [0.2, 0.25, 0.36];
    for (i = -NB - 1; i <= NB; i++) {
      var kx = (i + 0.5) * BLOCK;
      for (var kz = -EXT; kz <= EXT; kz += ks) {
        if (Math.abs(kz - riverZ(kx)) < RW && !(i === -2 || i === 1 || i === 3)) continue;
        put(kx - STREET / 2, 0, kz, KERB, 0.8, 2, 0); put(kx + STREET / 2, 0, kz, KERB, 0.8, 2, 0);
      }
      for (var kx2 = -EXT; kx2 <= EXT; kx2 += ks) {
        if (Math.abs(kx - riverZ(kx2)) < RW) continue;
        put(kx2, 0, kx - STREET / 2, KERB, 0.8, 2, 0); put(kx2, 0, kx + STREET / 2, KERB, 0.8, 2, 0);
      }
    }
    // cars: head lamps one way, tail lamps the other
    for (k = 0; k < 900 * Q; k++) {
      var along = rnd() < 0.5, li = Math.floor(rnd() * (2 * NB + 2)) - NB - 1, dir = rnd() < 0.5 ? 1 : -1, v = (900 + rnd() * 900) * dir;
      var pos = (rnd() - 0.5) * 2 * EXT, lane = (li + 0.5) * BLOCK + dir * 350;
      if (along) { if (Math.abs(pos - riverZ(lane)) < RW && !(li === -2 || li === 1 || li === 3)) continue; put(lane, 60, pos, dir > 0 ? [0.95, 0.95, 1] : [1, 0.25, 0.2], 0.8, 3, 0, 0, 0, v); }
      else { if (Math.abs(lane - riverZ(pos)) < RW) continue; put(pos, 60, lane, dir > 0 ? [0.95, 0.95, 1] : [1, 0.25, 0.2], 0.8, 3, 0, v, 0, 0); }
    }
    // the river, and the lamps along its banks
    for (k = 0; k < 5000 * Q; k++) { var rx = (rnd() - 0.5) * 2 * EXT; put(rx, 0, riverZ(rx) + (rnd() - 0.5) * 2 * RW * 0.9, [0.2, 0.38, 0.62], 0.3 + rnd() * 0.4, 4, 0); }
    for (var bx = -EXT; bx <= EXT; bx += 600) { put(bx, 40, riverZ(bx) - RW, SODIUM, 0.6, 2, 0); put(bx, 40, riverZ(bx) + RW, SODIUM, 0.6, 2, 0); }
    // rings round the places nearby
    PLACES.forEach(function (pl, n) {
      if (pl.here) return;
      for (k = 0; k < 140; k++) { var a = k / 140 * 6.283; put(pl.at[0] + Math.cos(a) * 1700, 50, pl.at[2] + Math.sin(a) * 1700, [1, 0.8, 0.5], 0.9, 6, n, pl.at[0], 50, pl.at[2]); }
    });
    // stars
    for (k = 0; k < 1400 * Q; k++) {
      var sy = 0.06 + rnd() * 0.94, sr = Math.sqrt(1 - sy * sy), sa = rnd() * 6.283, l2 = 0.4 + rnd() * 0.6;
      put(Math.cos(sa) * sr, sy, Math.sin(sa) * sr, [0.8 * l2, 0.86 * l2, l2], 1, 0, 0);
    }
  }

  // the places around, and the labels pinned to the world
  var PLACES = [
    { at: [0, FLOORS * FH + 700, 0], text: 'Residence 14B', note: 'Halden Hill', here: 1 },
    { at: [1.5 * BLOCK, 0, -1.5 * BLOCK], text: 'Metro', note: '4 min walk' },
    { at: [1.2 * BLOCK, 0, riverZ(1.2 * BLOCK) - 2400], text: 'Riverfront', note: '3 min' },
    { at: [-1.5 * BLOCK, 0, BLOCK], text: 'Riverside park', note: '6 min' },
    { at: [-2 * BLOCK, 0, -2 * BLOCK], text: 'School', note: '8 min' },
    { at: [3 * BLOCK, 0, -2 * BLOCK], text: 'Old town', note: '9 min' }
  ];

  // ——— the camera and the screen ———
  var gl, prog, U = {}, A = {}, buffers = {}, count = 0, F = 800, labels = [];
  var view = new Float32Array(16), proj = new Float32Array(16);
  var ATTRS = [['aPos', 3], ['aCol', 3], ['aInfo', 4], ['aAlt', 3]];
  var E = [0, 0, 0], T = [0, 0, 0], PT = { x: 0, y: 0 }, SUN = [0, 1, 0], LIT = new Float32Array(7);
  function perspective(m, fovy, aspect, near, far) {
    var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    m.fill(0); m[0] = f / aspect; m[5] = f; m[10] = (far + near) * nf; m[11] = -1; m[14] = 2 * far * near * nf;
  }
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
  // a world point to the screen, into PT (the lens shift included); false when it is behind the camera
  function project(x, y, z, W, H) {
    var v = view, q = proj;
    var vx = v[0] * x + v[4] * y + v[8] * z + v[12], vy = v[1] * x + v[5] * y + v[9] * z + v[13];
    var cw = -(v[2] * x + v[6] * y + v[10] * z + v[14]);
    if (cw <= 1) return false;
    PT.x = ((q[0] * vx / cw - q[8]) * 0.5 + 0.5) * W; PT.y = (1 - ((q[5] * vy / cw - q[9]) * 0.5 + 0.5)) * H;
    return true;
  }
  function css(el, k, v) { var c = el._s || (el._s = {}); if (c[k] !== v) { c[k] = v; el.style[k] = v; } }
  function smooth(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }
  function sm(a, b, x) { return smooth((x - a) / (b - a)); }
  function near(stage, s, w) { return Math.max(0, 1 - Math.abs(stage - s) / w); }
  // the sun on a June day around 50° north: up at five, due south at one, down at nine
  function sunAt(h) {
    var az = (h - 13) / 8 * 2.23, el = 1.1 * Math.sin(Math.PI * (h - 5) / 16);
    SUN[0] = -Math.sin(az) * Math.cos(el); SUN[1] = Math.sin(el); SUN[2] = Math.cos(az) * Math.cos(el);
    return el;
  }
  function upright(W, H) { return W < 760 && H > W; }

  var lastScroll = -1e9, hintAt = -1, clockMin = -1;
  addEventListener('scroll', function () { lastScroll = performance.now(); }, { passive: true });
  var clockT = document.getElementById('clockT'), clockS = document.getElementById('clockS'), clockEl = document.getElementById('clock'), sunDot = document.getElementById('sunDot');
  var sayAt = '';
  function sunWords(h) {
    return h < 8.2 ? 'First light: the sun is still on the other side' : h < 11.5 ? 'Morning: south light in the kitchen' :
      h < 15 ? 'Midday: the bedroom and the living room' : h < 18.5 ? 'Afternoon: deep into the living room' : 'Sunset, through the west windows';
  }
  var book = document.getElementById('book'), note = document.getElementById('note');
  if (book) book.addEventListener('click', function () { note.textContent = 'Nothing to book: this home is made up. The page is the point.'; note.classList.add('lit'); });

  var renderer = {
    init: function () {
      if (!this.initGL()) return false;
      var wrap = document.getElementById('labels');
      function label(cls, html, at, show) {
        var el = document.createElement('div'); el.className = 'fl ' + cls; el.innerHTML = html;
        wrap.appendChild(el); labels.push({ el: el, at: at, show: show, on: false });
      }
      PLACES.forEach(function (pl) {
        label(pl.here ? 'here' : 'place', '<i></i><span>' + pl.text + ' <b>· ' + pl.note + '</b></span>', pl.at, function (s) { return near(s, 1, 0.45); });
      });
      label('here', '<i></i><span>Floor 14 <b>· 46 m up</b></span>', [AX, Y14 + FH * 0.5, AZ + AD], function (s) { return near(s, 2, 0.4); });
      ROOMS.forEach(function (rm) {
        var r = rm.rects[0];
        label('room', '<span>' + rm.name + '<b>' + rm.area + ' m²</b></span>', [AX + (r[0] + r[2]) / 2, Y14, AZ + (r[1] + r[3]) / 2], function (s) { return near(s, 3, 0.4); });
      });
      return true;
    },
    restore: function (env) { if (this.initGL()) { this.uploaded = false; this.build(env); } },
    initGL: function () {
      var canvas = document.getElementById('gl');
      gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, powerPreference: 'high-performance' });
      if (!gl) return false;
      function sh(type, src) {
        var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
        return s;
      }
      prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(prog); if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
      ['uView', 'uProj', 'uEye', 'uApt', 'uT', 'uDpr', 'uF', 'uFocus', 'uBokeh', 'uMaxSize', 'uIn', 'uExt', 'uCity', 'uTower', 'uFlat', 'uHi', 'uPoi',
        'uLampOn', 'uSunOn', 'uOut', 'uSun', 'uSunCol', 'uWin', 'uWinR', 'uLamp', 'uRoomLit']
        .forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
      ATTRS.forEach(function (a) { buffers[a[0]] = gl.createBuffer(); A[a[0]] = gl.getAttribLocation(prog, a[0]); });
      gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(prog);
      return true;
    },
    load: function (tick) { return (document.fonts ? document.fonts.load('600 40px Inter') : Promise.resolve()).then(function () { tick(1); }); },
    build: function (env) {
      var W = env.W, H = env.H, Q = env.mobile ? 0.45 : 1;
      this.up = upright(W, H);
      // the world is built once (again only for a phone's budget), the screen for every size
      if (this.Q !== Q) { this.Q = Q; seed = 14; N = 0; city(Q); tower(Q); flat(Q); count = N; this.uploaded = false; }
      if (!this.uploaded) {
        [['aPos', P, 3], ['aCol', C, 3], ['aInfo', I, 4], ['aAlt', X, 3]].forEach(function (b) {
          gl.bindBuffer(gl.ARRAY_BUFFER, buffers[b[0]]); gl.bufferData(gl.ARRAY_BUFFER, b[1].subarray(0, count * b[2]), gl.STATIC_DRAW);
          gl.enableVertexAttribArray(A[b[0]]); gl.vertexAttribPointer(A[b[0]], b[2], gl.FLOAT, false, 0, 0);
        });
        gl.uniform4fv(U.uWin, new Float32Array(WIN.concat([0, 0, 0, 0, 0, 0, 0, 0]).slice(0, 24)));
        gl.uniform2fv(U.uWinR, new Float32Array(WINR.concat([-9, 0, -9, 0]).slice(0, 12)));
        gl.uniform3fv(U.uLamp, new Float32Array(LAMPS));
        gl.uniform3f(U.uApt, AX, Y14, AZ);
        gl.uniform1f(U.uExt, EXT);
        this.uploaded = true;
      }
      F = H * 0.96;
      var c = gl.canvas;
      c.width = Math.round(W * env.dpr); c.height = Math.round(H * env.dpr);
      gl.viewport(0, 0, c.width, c.height);
      perspective(proj, 2 * Math.atan(H / (2 * F)), W / H, 10, 400000);
      gl.uniform1f(U.uDpr, env.dpr); gl.uniform1f(U.uF, F);
      gl.uniform1f(U.uMaxSize, env.mobile ? 24 : 48);
      // a narrow screen sees less across, so the camera stands back
      this.dk = this.up ? 1.6 : W / H < 1.2 ? 1.25 : 1;
    },
    setDpr: function (env) {
      var c = gl.canvas;
      c.width = Math.round(env.W * env.dpr); c.height = Math.round(env.H * env.dpr);
      gl.viewport(0, 0, c.width, c.height); gl.uniform1f(U.uDpr, env.dpr);
    },
    frame: function (env) {
      var W = env.W, H = env.H, stage = Math.min(LAST, Math.max(0, env.stage)), k;
      // between two stages: eased in and out, except through the day, which follows the scroll
      var n = Math.min(LAST - 1, Math.floor(stage)), f = stage - n;
      if (n !== DAY) f = smooth(f);
      var a = ST[n], b = ST[n + 1];
      // the distance on a log scale; the target keeps pace with it, so where the camera is going stays in view
      var dist = a.d * Math.pow(b.d / a.d, f);
      var w = Math.abs(a.d - b.d) / Math.max(a.d, b.d) > 0.25 ? (a.d - dist) / (a.d - b.d) : f;
      for (k = 0; k < 3; k++) T[k] = a.t[k] + (b.t[k] - a.t[k]) * w;
      var yaw = a.yaw + (b.yaw - a.yaw) * f, pitch = a.pitch + (b.pitch - a.pitch) * f;
      var lx = this.up ? 0 : a.lx + (b.lx - a.lx) * f, ly = this.up ? a.ly + (b.ly - a.ly) * f : 0;
      // the cursor turns the head a little
      var kt = env.dt / 16.7, ease = 1 - Math.pow(0.94, kt);
      var mx = env.mouse.x < -9000 ? 0 : (env.mouse.x / W - 0.5) * 2, my = env.mouse.y < -9000 ? 0 : (env.mouse.y / H - 0.5) * 2;
      this.mx = (this.mx || 0) + (mx * env.mouse.on - (this.mx || 0)) * ease;
      this.my = (this.my || 0) + (my * env.mouse.on - (this.my || 0)) * ease;
      if (!env.reduce) { yaw += this.mx * 0.06; pitch = Math.min(1.42, pitch - this.my * 0.03); }
      dist *= this.dk;
      var cp = Math.cos(pitch);
      E[0] = T[0] + dist * cp * Math.sin(yaw); E[1] = T[1] + dist * Math.sin(pitch); E[2] = T[2] + dist * cp * Math.cos(yaw);
      lookAt(view, E, T);
      proj[8] = -lx; proj[9] = -ly;

      // what is seen at this stage: the city and the tower give way to the flat, and come back at the end
      var city = 1 - sm(2.15, 2.75, stage) + sm(8.35, 8.95, stage);
      var tow = 1 - sm(2.3, 2.85, stage) + sm(8.3, 8.9, stage);
      var flat = sm(2.25, 2.85, stage) * (1 - sm(8.45, 8.95, stage));
      var hi = sm(1.4, 1.95, stage) * (1 - sm(2.6, 2.9, stage)) + sm(8.4, 8.95, stage);
      // the hour, and the sun from it
      var h = a.h < 0 ? b.h : b.h < 0 ? a.h : a.h + (b.h - a.h) * f;
      var el = sunAt(h), sunOn = flat * smooth(el / 0.12), low = Math.max(0, Math.min(1, el / 0.9));
      var lampOn = flat * smooth((h - 18.6) / 1.6);
      // a room's own stage lights it and lets the others fall back
      var focusAmt = 0;
      for (k = 0; k < 7; k++) LIT[k] = 0;
      for (k = 0; k < 3; k++) { var nr = near(stage, 4 + k, 0.7); focusAmt = Math.max(focusAmt, nr); LIT[k === 0 ? 0 : k === 1 ? 1 : 2] += nr; }
      LIT[1] += near(stage, 4, 0.7) * 0.5;
      for (k = 0; k < 7; k++) LIT[k] = 1 - 0.72 * focusAmt + 0.97 * Math.min(1, LIT[k]);
      gl.uniform1f(U.uOut, 0.7 * (1 - 0.6 * focusAmt));

      if (this.introAt == null) this.introAt = performance.now();
      var inn = env.reduce ? 1 : smooth((performance.now() - this.introAt) / 1600);

      gl.uniformMatrix4fv(U.uView, false, view); gl.uniformMatrix4fv(U.uProj, false, proj);
      gl.uniform3f(U.uEye, E[0], E[1], E[2]);
      gl.uniform1f(U.uT, env.reduce ? 0 : env.t); gl.uniform1f(U.uFocus, dist); gl.uniform1f(U.uIn, inn);
      gl.uniform1f(U.uBokeh, 1.2 + 1.3 * flat);
      gl.uniform1f(U.uCity, city); gl.uniform1f(U.uTower, tow); gl.uniform1f(U.uFlat, flat); gl.uniform1f(U.uHi, hi);
      gl.uniform1f(U.uPoi, near(stage, 1, 0.6));
      gl.uniform3f(U.uSun, SUN[0], SUN[1], SUN[2]); gl.uniform1f(U.uSunOn, sunOn);
      gl.uniform3f(U.uSunCol, 1, 0.62 + 0.3 * low, 0.32 + 0.42 * low);
      gl.uniform1f(U.uLampOn, lampOn);
      gl.uniform1fv(U.uRoomLit, LIT);
      gl.clearColor(0.024, 0.027, 0.04, 1); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.POINTS, 0, count);

      // the labels pinned to the world; one that has faded is left alone
      for (k = 0; k < labels.length; k++) {
        var lb = labels[k], o = lb.show(stage);
        if (o <= 0.01) { if (lb.on) { lb.on = false; css(lb.el, 'opacity', '0'); css(lb.el, 'visibility', 'hidden'); } continue; }
        if (!project(lb.at[0], lb.at[1], lb.at[2], W, H)) continue;
        lb.on = true;
        css(lb.el, 'visibility', 'visible'); css(lb.el, 'opacity', Math.min(1, o * 1.6).toFixed(3));
        var room = lb.el.classList.contains('room');
        css(lb.el, 'transform', 'translate(' + PT.x.toFixed(1) + 'px,' + PT.y.toFixed(1) + 'px) translate(' + (room ? '-50%,-50%' : '-3px,-50%') + ')');
      }

      // the clock of the day
      var co = sm(6.55, 6.9, stage) * (1 - sm(8.2, 8.5, stage));
      css(clockEl, 'opacity', co.toFixed(3)); css(clockEl, 'visibility', co > 0.01 ? 'visible' : 'hidden');
      if (co > 0.01) {
        var mins = Math.round(h * 6) * 10;
        if (mins !== clockMin) {
          clockMin = mins;
          var hh = Math.floor(mins / 60), mm = mins % 60;
          clockT.textContent = (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
          var u = Math.max(0, Math.min(1, (h - 5) / 16));
          sunDot.setAttribute('cx', ((1 - u) * (1 - u) * 4 + 2 * u * (1 - u) * 110 + u * u * 216).toFixed(1));
          sunDot.setAttribute('cy', ((1 - u) * (1 - u) * 62 + 2 * u * (1 - u) * -40 + u * u * 62).toFixed(1));
          var said = sunWords(h);
          if (said !== sayAt) { sayAt = said; clockS.textContent = said; }
        }
      }

      // the scroll hint, as on the home page: at the top, on the way, at the bottom; only once the page is still
      var hint = window.Hint;
      if (hint) {
        var at = stage < 0.05 ? 0 : stage > LAST - 0.02 ? 2 : 1;
        if (at !== hintAt) { hintAt = at; hint.say(at); hint.el.classList.toggle('is-back', at === 2); }
        // on a narrow or short screen the captions take the bottom: the hint only shows at the start
        var room = W >= 1000 && H >= 700 ? !(stage > 3.5 && stage < 8.5) && stage < 8.5 : stage < 0.05;
        css(hint.el, 'opacity', performance.now() - lastScroll > 900 && room ? '1' : '0');
      }
    },
    // nothing here opens; the day is scrolled like a page and never settles
    workAt: function () { return false; },
    coverAt: function () { return -1; },
    free: function (stage) { return stage > DAY - 0.02 && stage < DAY + 1.02; }
  };

  BKit({ cases: [], renderer: renderer, keys: keys, stops: stops, last: LAST });
  // ?fps also counts the points
  if (window.Perf && Perf.info) { var info = Perf.info; Perf.info = function () { return info() + '  pts ' + count; }; }
})();
