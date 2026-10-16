// Residence 14B, the tour: the first concept's flat, walked through at eye height.
// It starts as the first concept's points and is swept into a solid model, a white maquette lit
// the way a real room is: daylight coming in through each window (more near it, less across the
// room, a little into the next room), the June sun as hard patches through the panes and the
// mullions' shadows, light bounced off the sunlit floor, lamps at night, contact shadows baked
// into the corners. Outside the windows is a real 360° photograph of a city, a sunny noon that
// gives way to a sunset and then to night as the day is scrolled.
// Raw WebGL, no libraries; runs on the portfolio's shell (bkit.js). Units are centimetres; the
// flat's north-west corner is the origin, x runs east, z runs south, y up.
(function () {
  var CEIL = 300;
  var ROOMS = [
    { name: 'Living & dining', area: '39.5', rects: [[0, 480, 760, 1000]], floor: [0.66, 0.5, 0.34], wood: 1 },
    { name: 'Kitchen', area: '18.7', rects: [[760, 480, 1120, 1000]], floor: [0.72, 0.71, 0.68], wood: 0 },
    { name: 'Bedroom', area: '27.8', rects: [[1120, 420, 1600, 1000]], floor: [0.64, 0.49, 0.35], wood: 1 },
    { name: 'Study', area: '20.2', rects: [[0, 0, 420, 480]], floor: [0.6, 0.46, 0.32], wood: 1 },
    { name: 'Bath', area: '9.0', rects: [[420, 0, 720, 300]], floor: [0.62, 0.64, 0.64], wood: 0 },
    { name: 'Hall', area: '24.6', rects: [[420, 300, 1120, 480], [720, 0, 1120, 300]], floor: [0.62, 0.48, 0.34], wood: 1 },
    { name: 'Dressing & bath', area: '20.2', rects: [[1120, 0, 1600, 420]], floor: [0.66, 0.66, 0.64], wood: 0 }
  ];
  function roomAt(x, z) {
    for (var i = 0; i < ROOMS.length; i++) for (var j = 0; j < ROOMS[i].rects.length; j++) {
      var r = ROOMS[i].rects[j];
      if (x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3]) return i;
    }
    return -1;
  }
  // walls from a to b; openings along them [from, to, bottom, top], 'w' for a window. The first four are the facades
  var WALLS = [
    { a: [0, 0], b: [0, 1000], fac: 2, open: [[120, 380, 60, 270, 'w'], [560, 920, 20, 285, 'w']] },
    { a: [0, 1000], b: [1600, 1000], fac: 1, open: [[90, 660, 20, 285, 'w'], [830, 1050, 95, 270, 'w'], [1200, 1520, 20, 285, 'w']] },
    { a: [0, 0], b: [1600, 0], fac: 3, open: [[860, 960, 0, 220]] },
    { a: [1600, 0], b: [1600, 1000], fac: 4 },
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
  var FRAME = 6;
  // the windows, for the light: the glass inside its frame, the facade it is in, how many panes
  var WINS = [];
  WALLS.forEach(function (w) {
    (w.open || []).forEach(function (o) {
      if (o[4] !== 'w') return;
      var west = w.fac === 2, m = (o[0] + o[1]) / 2;
      WINS.push({
        r: [o[0] + FRAME, o[1] - FRAME, o[2] + FRAME, o[3] - FRAME], west: west,
        room: west ? roomAt(30, m) : roomAt(m, 970),
        c: west ? [0, (o[2] + o[3]) / 2, m] : [m, (o[2] + o[3]) / 2, 1000],
        n: west ? [-1, 0, 0] : [0, 0, 1],
        area: (o[1] - o[0] - 2 * FRAME) * (o[3] - o[2] - 2 * FRAME),
        bays: Math.max(1, Math.round((o[1] - o[0]) / 130))
      });
    });
  });
  // how much of a window's daylight reaches a room: its own all of it, the open-plan kitchen most,
  // the rooms through a doorway a little. Above 0.5 the sun comes through too
  var OPEN = { '0,1': 0.85, '0,5': 0.3, '1,5': 0.12, '3,5': 0.1, '2,6': 0.15, '5,6': 0.06 };
  function reach(a, b) { return a === b ? 1 : OPEN[Math.min(a, b) + ',' + Math.max(a, b)] || 0.03; }
  var WW = new Float32Array(42);
  for (var wi = 0; wi < 6; wi++) for (var rj = 0; rj < 7; rj++) WW[wi * 7 + rj] = WINS[wi] ? reach(WINS[wi].room, rj) : 0;

  // ——— the furniture ———
  var PLASTER = [0.88, 0.87, 0.84], OAK = [0.64, 0.52, 0.4], WALNUT = [0.3, 0.2, 0.14], LINEN = [0.92, 0.91, 0.88],
    SAND = [0.74, 0.68, 0.6], FABRIC = [0.62, 0.6, 0.57], STONE = [0.9, 0.89, 0.86], BLACK = [0.06, 0.06, 0.07],
    RUST = [0.6, 0.3, 0.2], RUG = [0.56, 0.36, 0.28], WHITE = [0.9, 0.9, 0.9], LEAF = [0.2, 0.36, 0.18],
    FACADE = [0.3, 0.31, 0.33], CUT = [0.1, 0.1, 0.11], METAL = [0.16, 0.16, 0.17];
  // [room, x0, y0, z0, x1, y1, z1, colour, material (4 matte, 5 glossy)]
  var FURN = [
    [0, 80, 0, 490, 420, 50, 530, WALNUT, 4], [0, 150, 70, 531, 350, 180, 536, BLACK, 5],
    [0, 80, 0, 760, 440, 40, 850, FABRIC, 4], [0, 80, 40, 818, 440, 84, 850, FABRIC, 4], [0, 80, 40, 760, 112, 62, 818, FABRIC, 4], [0, 408, 40, 760, 440, 62, 818, FABRIC, 4],
    [0, 116, 40, 764, 258, 47, 816, SAND, 4], [0, 262, 40, 764, 404, 47, 816, SAND, 4],
    [0, 180, 0, 630, 340, 36, 710, OAK, 5],
    [0, 60, 0, 580, 460, 1.2, 900, RUG, 4],
    [0, 520, 70, 620, 700, 76, 860, OAK, 5], [0, 530, 0, 630, 540, 70, 640, OAK, 4], [0, 680, 0, 630, 690, 70, 640, OAK, 4], [0, 530, 0, 840, 540, 70, 850, OAK, 4], [0, 680, 0, 840, 690, 70, 850, OAK, 4],
    [0, 20, 0, 940, 60, 42, 980, WALNUT, 4],
    [0, 751, 110, 500, 754, 200, 610, [0.7, 0.56, 0.4], 4],
    [1, 1062, 0, 560, 1120, 88, 980, WHITE, 4], [1, 1056, 88, 560, 1120, 92, 980, STONE, 5], [1, 1062, 0, 480, 1120, 225, 560, OAK, 4],
    [1, 1074, 92, 690, 1112, 92.6, 770, BLACK, 5], [1, 1074, 92, 820, 1112, 92.4, 885, METAL, 5],
    [1, 856, 0, 655, 954, 88, 855, OAK, 4], [1, 850, 88, 650, 960, 92, 860, STONE, 5],
    [2, 1270, 0, 440, 1450, 42, 650, WALNUT, 4], [2, 1275, 42, 445, 1445, 56, 648, LINEN, 4], [2, 1270, 0, 428, 1450, 115, 446, WALNUT, 4],
    [2, 1285, 56, 452, 1355, 70, 500, WHITE, 4], [2, 1365, 56, 452, 1435, 70, 500, WHITE, 4], [2, 1272, 56, 560, 1448, 60, 652, SAND, 4],
    [2, 1210, 0, 440, 1260, 52, 490, OAK, 4], [2, 1460, 0, 440, 1510, 52, 490, OAK, 4],
    [2, 1300, 0, 672, 1420, 45, 706, SAND, 4],
    [2, 1470, 0, 850, 1560, 40, 940, RUST, 4], [2, 1470, 40, 925, 1560, 84, 940, RUST, 4],
    [2, 1220, 0, 600, 1500, 1.2, 820, [0.5, 0.48, 0.44], 4],
    [2, 1590, 110, 560, 1593, 230, 700, [0.72, 0.58, 0.42], 4], [2, 1590, 110, 720, 1593, 200, 820, [0.42, 0.48, 0.54], 4],
    [3, 30, 70, 140, 110, 76, 360, OAK, 5], [3, 30, 0, 140, 110, 70, 148, OAK, 4], [3, 30, 0, 352, 110, 70, 360, OAK, 4],
    [3, 130, 0, 215, 180, 46, 265, BLACK, 4], [3, 172, 46, 215, 180, 92, 265, BLACK, 4],
    [3, 120, 0, 10, 400, 210, 45, WALNUT, 4],
    [3, 290, 0, 330, 380, 42, 410, SAND, 4],
    [4, 440, 0, 20, 700, 55, 100, WHITE, 5], [4, 620, 0, 220, 710, 85, 290, OAK, 4], [4, 711, 110, 215, 713, 200, 295, [0.72, 0.76, 0.8], 5],
    [5, 990, 0, 20, 1110, 90, 60, WALNUT, 4], [5, 440, 0, 400, 600, 45, 440, OAK, 4],
    [6, 1140, 0, 10, 1590, 225, 70, OAK, 4], [6, 1460, 0, 300, 1590, 8, 410, WHITE, 4], [6, 1140, 0, 330, 1250, 85, 410, STONE, 5]
  ];
  // stools at the island, chairs at the table: [room, x, z, seat height, back (-1 none, 0 west, 1 east)]
  var SEATS = [[1, 800, 670, 68, -1], [1, 800, 740, 68, -1], [1, 800, 810, 68, -1],
    [0, 478, 650, 45, 0], [0, 478, 725, 45, 0], [0, 478, 800, 45, 0], [0, 708, 650, 45, 1], [0, 708, 725, 45, 1], [0, 708, 800, 45, 1]];
  // a seat, on legs, and a back where it has one
  SEATS.forEach(function (s) {
    var c = s[0] === 1 ? WALNUT : [0.14, 0.13, 0.12], x = s[1], z = s[2], h = s[3];
    FURN.push([s[0], x, h - 5, z, x + 34, h, z + 34, c, 4]);
    [[1, 1], [29, 1], [1, 29], [29, 29]].forEach(function (l) { FURN.push([s[0], x + l[0], 0, z + l[1], x + l[0] + 4, h - 5, z + l[1] + 4, c, 4]); });
    if (s[4] === 0) FURN.push([s[0], x, h, z, x + 4, h + 40, z + 34, c, 4]);
    if (s[4] === 1) FURN.push([s[0], x + 30, h, z, x + 34, h + 40, z + 34, c, 4]);
  });
  // the lamps: two over the table, two over the island, two by the bed
  var LAMPS = [610, 195, 690, 610, 195, 790, 905, 200, 710, 905, 200, 800, 1235, 75, 465, 1485, 75, 465];

  // ——— the stages ———
  // 0 the model in points · 1 swept solid · 2 the plan · 3 the hall · 4 living · 5 kitchen · 6 bedroom ·
  // 7 → 8 a day at the window · 9 details
  var LAST = 9, DAY = 7;
  // per stage: eye, target, field of view (wide screen, phone), the picture's shift, the hour;
  // orbit: a view from outside, which a phone takes from further back; lift: the way in rises over the walls
  var ST = [
    { e: [-950, 1500, 2300], t: [800, 0, 480], fov: 46, fovM: 56, lx: 0.24, ly: 0.16, h: 15, orbit: 1 },
    { e: [-650, 1750, 2350], t: [800, 0, 480], fov: 46, fovM: 56, lx: 0.24, ly: 0.16, h: 15, orbit: 1 },
    { e: [800, 2650, 640], t: [800, 0, 500], fov: 46, fovM: 56, lx: 0.27, ly: 0.18, h: 13, orbit: 1 },
    { e: [640, 158, 380], t: [420, 125, 900], fov: 68, fovM: 72, lx: 0, ly: 0.2, h: 11 },
    { e: [735, 162, 930], t: [40, 115, 660], fov: 68, fovM: 72, lx: 0, ly: 0.2, h: 15.5 },
    { e: [600, 165, 935], t: [1100, 100, 850], fov: 66, fovM: 72, lx: 0, ly: 0.2, h: 10.5 },
    { e: [1190, 162, 560], t: [1470, 100, 940], fov: 68, fovM: 72, lx: 0, ly: 0.2, h: 13, lift: 520 },
    { e: [720, 165, 940], t: [60, 120, 920], fov: 64, fovM: 72, lx: 0, ly: 0.2, h: 12, lift: 520 },
    { e: [720, 165, 940], t: [60, 120, 640], fov: 64, fovM: 72, lx: 0, ly: 0.2, h: 21.3 },
    { e: [-900, 1650, 2350], t: [800, 0, 480], fov: 46, fovM: 56, lx: 0.26, ly: 0.32, h: 22, orbit: 1 }
  ];
  var keys = [], stops = [];
  (function () {
    var RUNS = [1.4, 1.3, 1.5, 1.3, 1.1, 1.4, 1.4, 3.4, 1.6], HOLD = 0.4, pos = 0.15, i;
    keys.push([0, 0], [pos, 0]); stops.push(0);
    for (i = 0; i < RUNS.length; i++) {
      pos += RUNS[i]; keys.push([pos, i + 1]); stops.push(pos);
      if (i + 1 < LAST && i + 1 !== DAY) { pos += HOLD; keys.push([pos, i + 1]); }
    }
    for (i = 0; i < keys.length; i++) keys[i][0] /= pos;
    for (i = 1; i < stops.length; i++) stops[i] /= pos;
    document.querySelector('.track').style.height = ((pos + 1) * 100) + 'vh';
  })();

  // ——— shaders ———
  // the sun through a room's windows, shared by the points and the solid model: the ray from q towards
  // the sun leaves through a pane (the frame and the mullions keep their shadows)
  var SUN_FN = [
    'float sunLit(vec3 q, vec3 w1, vec3 w2){',
    '  float lit = 0.0;',
    '  for (int i = 0; i < 6; i++) {',
    '    float wr = i == 0 ? w1.x : i == 1 ? w1.y : i == 2 ? w1.z : i == 3 ? w2.x : i == 4 ? w2.y : w2.z;',
    '    if (wr < 0.5) continue;',
    '    vec4 w = uWin[i]; float t, a;',
    '    if (uWinN[i].z > 0.5) { if (uSun.z < 0.02) continue; t = (1000.0 - q.z) / uSun.z; a = q.x + t * uSun.x; }',
    '    else { if (uSun.x > -0.02) continue; t = -q.x / uSun.x; a = q.z + t * uSun.z; }',
    '    if (t < 0.0) continue;',
    '    float h = q.y + t * uSun.y, e = 0.6 + t * 0.008;',
    '    float in_ = smoothstep(w.x - e, w.x + e, a) * (1.0 - smoothstep(w.y - e, w.y + e, a)) * smoothstep(w.z - e, w.z + e, h) * (1.0 - smoothstep(w.w - e, w.w + e, h));',
    '    float bw = (w.y - w.x) / uWinB[i], fr = fract((a - w.x) / bw), m = min(fr, 1.0 - fr) * bw;',
    '    lit += in_ * smoothstep(1.6 - e, 1.6 + e, m);',
    '  }',
    '  return min(lit, 1.0);',
    '}'
  ].join('\n');
  var WIN_UNI = 'uniform vec4 uWin[6]; uniform vec3 uWinC[6], uWinN[6]; uniform float uWinA[6], uWinB[6], uWW[42]; uniform vec3 uSun;';

  // the solid model
  var SVS = [
    'precision highp float;',
    'attribute vec3 aPos, aNrm, aCol; attribute vec4 aInfo;',
    'uniform mat4 uView, uProj; uniform float uWW[42], uBounce[7];',
    'varying vec3 vPos, vNrm, vCol, vW1, vW2; varying vec4 vInfo; varying float vBounce;',
    'void main(){',
    '  vPos = aPos; vNrm = aNrm; vCol = aCol; vInfo = aInfo;',
    '  float room = aInfo.y;',
    '  if (room > -0.5) { int r = int(room + 0.5);',
    '    vW1 = vec3(uWW[r], uWW[7 + r], uWW[14 + r]); vW2 = vec3(uWW[21 + r], uWW[28 + r], uWW[35 + r]); vBounce = uBounce[r]; }',
    '  else { vW1 = vec3(0.0); vW2 = vec3(0.0); vBounce = 0.0; }',
    '  gl_Position = uProj * uView * vec4(aPos, 1.0);',
    '}'
  ].join('\n');
  var SFS = [
    'precision highp float;',
    WIN_UNI,
    'uniform vec3 uEye, uSunCol, uSky, uLamp[6];',
    'uniform float uSunOn, uLampOn, uAmb, uExpo, uSweep, uCeil, uPix;',
    'varying vec3 vPos, vNrm, vCol, vW1, vW2; varying vec4 vInfo; varying float vBounce;',
    SUN_FN,
    'float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }',
    'vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }',
    // a line drawn into a surface, as thin as fw allows without shimmering
    'float seam(float d, float w, float fw){ return smoothstep(w, w + fw, d); }',
    'void main(){',
    '  vec3 q = vPos, n = normalize(vNrm);',
    '  float mat = vInfo.x, fac = vInfo.w, ao = vInfo.z;',
    // the sweep from points to the model, and the facades between the camera and the rooms
    '  if (dot(q.xz, vec2(0.8, 0.6)) > uSweep) discard;',
    '  if (fac > 0.5) { vec3 fn = fac < 1.5 ? vec3(0.0, 0.0, 1.0) : fac < 2.5 ? vec3(-1.0, 0.0, 0.0) : fac < 3.5 ? vec3(0.0, 0.0, -1.0) : vec3(1.0, 0.0, 0.0); if (dot(fn, uEye - q) > 0.0) discard; }',
    // the ceiling fades out as the eye rises through it (a dither, so it stays opaque)
    '  if (n.y < -0.5 && q.y > 290.0 && hash(gl_FragCoord.xy) > uCeil) discard;',
    '  float dist = length(uEye - q), fw = dist * uPix * 1.5;',
    '  vec3 alb = vCol; float gloss = 0.04;',
    '  if (mat > 0.5 && mat < 1.5) {',
    // oak: planks 18 cm wide, laid east to west in staggered lengths, each its own tone, with grain
    '    float row = floor(q.z / 18.0), along = q.x + hash(vec2(row, 3.7)) * 300.0, piece = floor(along / 150.0);',
    '    float tone = hash(vec2(row, piece));',
    '    alb *= 0.88 + 0.2 * tone;',
    '    alb *= 0.96 + 0.04 * sin(q.z * 2.3 + sin(along * 0.045 + tone * 9.0) * 2.5 + tone * 30.0);',
    '    float fz = fract(q.z / 18.0), fx = fract(along / 150.0);',
    '    alb *= mix(0.72, 1.0, seam(min(fz, 1.0 - fz) * 18.0, 0.2, fw) * seam(min(fx, 1.0 - fx) * 150.0, 0.2, fw));',
    '    gloss = 0.22;',
    '  } else if (mat > 1.5 && mat < 2.5) {',
    // stone tiles, 60 cm, with grout
    '    vec2 c = floor(q.xz / 60.0), f = fract(q.xz / 60.0);',
    '    alb *= 0.93 + 0.1 * hash(c);',
    '    alb *= mix(0.7, 1.0, seam(min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y)) * 60.0, 0.2, fw));',
    '    gloss = 0.3;',
    '  } else if (mat > 2.5 && mat < 3.5) {',
    // the bath's walls: tiles 30 × 60
    '    vec2 p = vec2(abs(n.x) > 0.5 ? q.z : q.x, q.y) / vec2(60.0, 30.0), f = fract(p);',
    '    alb *= 0.95 + 0.06 * hash(floor(p));',
    '    alb *= mix(0.75, 1.0, seam(min(min(f.x, 1.0 - f.x) * 60.0, min(f.y, 1.0 - f.y) * 30.0), 0.15, fw));',
    '    gloss = 0.3;',
    '  } else if (mat > 4.5 && mat < 5.5) gloss = 0.35;',
    '  alb = pow(alb, vec3(2.2));',
    // daylight from each window: the more of it the point sees, and the nearer, the brighter
    '  vec3 V = normalize(uEye - q), R = reflect(-V, n);',
    '  float sky = 0.0, spec = 0.0;',
    '  for (int i = 0; i < 6; i++) {',
    '    float w = i == 0 ? vW1.x : i == 1 ? vW1.y : i == 2 ? vW1.z : i == 3 ? vW2.x : i == 4 ? vW2.y : vW2.z;',
    '    if (w < 0.01) continue;',
    '    vec3 d = uWinC[i] - q; float d2 = dot(d, d); vec3 l = d * inversesqrt(d2);',
    '    float c2 = max(dot(uWinN[i], l), 0.0);',
    '    sky += uWinA[i] * max(dot(n, l), 0.0) * c2 / (3.1416 * d2 + uWinA[i] * 0.6) * w;',
    '    spec += pow(max(dot(R, l), 0.0), 40.0) * c2 * w * min(1.0, uWinA[i] / d2);',
    '  }',
    '  float sun = vW1.x + vW1.y + vW1.z + vW2.x + vW2.y + vW2.z > 0.5 ? sunLit(q, vW1, vW2) * max(dot(n, uSun), 0.0) * uSunOn : 0.0;',
    '  float lamp = 0.0;',
    '  for (int i = 0; i < 6; i++) { vec3 d = uLamp[i] - q; float d2 = dot(d, d); lamp += (0.35 + 0.65 * max(dot(n, d * inversesqrt(d2)), 0.0)) * 6000.0 / (d2 + 2500.0); }',
    '  vec3 light = uSky * sky * 2.2 + uSunCol * sun + uSunCol * vec3(1.0, 0.86, 0.7) * vBounce + vec3(1.0, 0.7, 0.42) * lamp * uLampOn + vec3(uAmb);',
    '  vec3 col = alb * light * ao + (uSky * spec * 1.4 + uSunCol * sun * pow(max(dot(R, uSun), 0.0), 60.0) * 2.0) * gloss;',
    // the lamps' shades glow
    '  if (mat > 6.5) col = alb * (light * 0.6 + vec3(5.0, 3.6, 2.2) * uLampOn);',
    '  col = aces(col * uExpo);',
    '  gl_FragColor = vec4(pow(col, vec3(1.0 / 2.2)), 1.0);',
    '}'
  ].join('\n');

  // the glass: whatever is outside, in the direction the eye looks through it
  var GVS = [
    'precision highp float;',
    'attribute vec3 aPos; attribute float aFac;',
    'uniform mat4 uView, uProj;',
    'varying vec3 vPos; varying float vFac;',
    'void main(){ vPos = aPos; vFac = aFac; gl_Position = uProj * uView * vec4(aPos, 1.0); }'
  ].join('\n');
  var GFS = [
    'precision highp float;',
    'uniform sampler2D uA, uB; uniform vec3 uEye, uTint; uniform float uOffA, uOffB, uMix, uOut, uExpo, uSweep, uReady;',
    'varying vec3 vPos; varying float vFac;',
    'vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }',
    'void main(){',
    '  if (dot(vPos.xz, vec2(0.8, 0.6)) > uSweep) discard;',
    '  vec3 fn = vFac < 1.5 ? vec3(0.0, 0.0, 1.0) : vec3(-1.0, 0.0, 0.0);',
    '  if (dot(fn, uEye - vPos) > 0.0) discard;',
    '  vec3 d = normalize(vPos - uEye);',
    '  float az = atan(d.x, d.z), el = asin(clamp(d.y, -1.0, 1.0));',
    // fourteen floors up the ground falls away: the photograph's lower half is pressed towards the horizon
    '  float e2 = el < 0.0 ? el * 0.17 : el;',
    '  float v = clamp((0.9425 - e2) / 1.5708, 0.002, 0.998);',
    '  vec3 a = pow(texture2D(uA, vec2(uOffA - az / 6.28318, v)).rgb, vec3(2.2));',
    '  vec3 b = pow(texture2D(uB, vec2(uOffB - az / 6.28318, v)).rgb, vec3(2.2));',
    '  vec3 c = mix(a, b, uMix) * uTint * uOut;',
    // from above, the panes are only dark glass
    '  c = mix(vec3(0.004, 0.006, 0.01), c, uReady);',
    '  gl_FragColor = vec4(pow(aces(c * uExpo), vec3(1.0 / 2.2)), 1.0);',
    '}'
  ].join('\n');

  // the first concept's points, for the start; the sweep turns them into the model
  var PVS = [
    'precision highp float;',
    'attribute vec3 aPos; attribute vec3 aCol; attribute vec4 aInfo;',
    'uniform mat4 uView, uProj;',
    WIN_UNI,
    'uniform float uT, uDpr, uF, uFocus, uMaxSize, uIn, uSweep, uSunOn, uLampOn; uniform vec3 uSunCol, uLamp[6];',
    'varying vec3 vC; varying float vA;',
    SUN_FN,
    'void main(){',
    '  float kind = aInfo.x, grp = aInfo.y, rnd = aInfo.z, rnd2 = aInfo.w;',
    '  vec3 p = aPos, col = aCol; float r = kind < 10.5 ? 1.7 : kind < 11.5 ? 1.9 : kind < 12.5 ? 1.7 : kind < 13.5 ? 1.4 : 2.6, vis = 1.0, grow = 0.0;',
    '  if (kind > 12.5 && kind < 13.5) p += vec3(sin(uT * 0.21 + rnd * 6.28) * 7.0, sin(uT * 0.13 + rnd2 * 6.28) * 9.0, cos(uT * 0.17 + rnd * 9.0) * 7.0);',
    '  vec3 w1 = vec3(0.0), w2 = vec3(0.0);',
    '  if (grp > -0.5) { int g = int(grp + 0.5); w1 = vec3(uWW[g], uWW[7 + g], uWW[14 + g]); w2 = vec3(uWW[21 + g], uWW[28 + g], uWW[35 + g]); }',
    '  float sun = grp > -0.5 ? sunLit(p, w1, w2) * uSunOn : 0.0;',
    '  if (kind > 12.5 && kind < 13.5) { vis = sun * 0.55; col = uSunCol * 0.25; }',
    '  else {',
    // ahead of the sweep the points, at its edge a bright line, behind it the model
    '    float s = dot(p.xz, vec2(0.8, 0.6)), edge = 1.0 - smoothstep(0.0, 70.0, abs(s - uSweep));',
    '    vis = step(uSweep - 20.0, s);',
    '    col = col * (1.0 - 0.3 * uSunOn) + uSunCol * 0.25 * sun + vec3(1.0, 0.78, 0.45) * edge * 1.4;',
    '    grow = sun * 0.9 + edge;',
    '    if (kind > 13.5) col *= 0.3 + uLampOn * 1.5;',
    '  }',
    '  vec4 v = uView * vec4(p, 1.0); float d = -v.z;',
    '  gl_Position = uProj * v;',
    '  float size = r * uF / max(d, 1.0) * (1.0 + grow);',
    '  float blur = abs(d - uFocus) / uFocus; size += blur * blur * 2.5;',
    '  float a = 1.0; if (size < 1.0) { a = size * size; size = 1.0; }',
    '  a *= min(1.0, 2.4 / (size * size)) * exp(-max(d - uFocus, 0.0) / (uFocus * 1.3)) * smoothstep(uFocus * 0.03, uFocus * 0.12, d) * vis * uIn;',
    '  size = min(size, uMaxSize);',
    '  vC = col * a; vA = a; gl_PointSize = size * uDpr;',
    '  if (a < 0.003) { gl_PointSize = 0.0; gl_Position = vec4(2.0, 2.0, 2.0, 1.0); }',
    '}'
  ].join('\n');
  var PFS = [
    'precision mediump float;',
    'varying vec3 vC; varying float vA;',
    'void main(){ float m = 1.0 - smoothstep(0.28, 0.5, length(gl_PointCoord - 0.5)); gl_FragColor = vec4(vC * m, vA * m); }'
  ].join('\n');

  // ——— building ———
  var seed = 14;
  function rnd() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
  function Buf(stride) { this.k = stride; this.n = 0; this.a = new Float32Array(stride * 65536); }
  Buf.prototype.room = function () { if ((this.n + 1) * this.k > this.a.length) { var b = new Float32Array(this.a.length * 2); b.set(this.a); this.a = b; } return this.n++ * this.k; };

  // ——— the light's corners: soft contact shadows baked into the vertices ———
  function segDist(x, z, w) {
    var ax = w.a[0], az = w.a[1], dx = w.b[0] - ax, dz = w.b[1] - az, L2 = dx * dx + dz * dz;
    var t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)), s = t * Math.sqrt(L2), open = w.open || [];
    for (var i = 0; i < open.length; i++) if (open[i][2] === 0 && s > open[i][0] && s < open[i][1]) return 1e9;
    var px = ax + dx * t - x, pz = az + dz * t - z;
    return Math.sqrt(px * px + pz * pz);
  }
  function boxDist(x, y, z, f) {
    var dx = Math.max(f[1] - x, 0, x - f[4]), dy = Math.max(f[2] - y, 0, y - f[5]), dz = Math.max(f[3] - z, 0, z - f[6]);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  function aoAt(x, y, z, nx, ny, nz, self, isWall) {
    var ao = 1, i, d;
    for (i = 0; i < WALLS.length; i++) {
      d = segDist(x, z, WALLS[i]) - 7;
      if (d < 1.5) continue;
      ao *= 1 - (ny < -0.5 ? 0.22 : 0.3) * Math.exp(-d / 20);
    }
    if (Math.abs(ny) < 0.5) {
      ao *= 1 - 0.32 * Math.exp(-y / 16);
      if (isWall) ao *= 1 - 0.18 * Math.exp(-(CEIL - y) / 20);
    }
    if (ny > 0.5 && y < 2) {
      for (i = 0; i < FURN.length; i++) {
        var f = FURN[i]; if (f[2] > 3 || f[5] - f[2] < 4) continue;
        var dr = Math.max(f[1] - x, 0, x - f[4], 0) + 0, dz2 = Math.max(f[3] - z, 0, z - f[6]);
        d = Math.sqrt(dr * dr + dz2 * dz2);
        ao *= d <= 0 ? 0.4 : 1 - 0.5 * Math.exp(-d / 11) * Math.min(1, (f[5] - f[2]) / 40);
      }
    } else if (isWall) {
      for (i = 0; i < FURN.length; i++) {
        d = boxDist(x, y, z, FURN[i]);
        if (d < 50 && FURN[i][5] - FURN[i][2] > 30) ao *= 1 - 0.35 * Math.exp(-d / 12);
      }
    }
    return Math.max(0.25, ao);
  }

  // a flat rectangle split into a grid: corner o, edges u and v (their cross product faces out),
  // nu × nv cells, each vertex with its own shadowing
  function rect(B, o, u, v, nu, nv, n, c, mat, room, fac, isWall, self) {
    var cx = u[1] * v[2] - u[2] * v[1], cy = u[2] * v[0] - u[0] * v[2], cz = u[0] * v[1] - u[1] * v[0];
    if (cx * n[0] + cy * n[1] + cz * n[2] < 0) { var t = u; u = v; v = t; t = nu; nu = nv; nv = t; }
    var G = [], i, j;
    for (j = 0; j <= nv; j++) for (i = 0; i <= nu; i++) {
      var x = o[0] + u[0] * i / nu + v[0] * j / nv, y = o[1] + u[1] * i / nu + v[1] * j / nv, z = o[2] + u[2] * i / nu + v[2] * j / nv;
      G.push([x, y, z, mat === 7 ? 1 : aoAt(x, y, z, n[0], n[1], n[2], self, isWall)]);
    }
    function put(g) {
      var k = B.room(), a = B.a;
      a[k] = g[0]; a[k + 1] = g[1]; a[k + 2] = g[2]; a[k + 3] = n[0]; a[k + 4] = n[1]; a[k + 5] = n[2];
      a[k + 6] = c[0]; a[k + 7] = c[1]; a[k + 8] = c[2]; a[k + 9] = mat; a[k + 10] = room; a[k + 11] = g[3]; a[k + 12] = fac;
    }
    for (j = 0; j < nv; j++) for (i = 0; i < nu; i++) {
      var g00 = G[j * (nu + 1) + i], g10 = G[j * (nu + 1) + i + 1], g01 = G[(j + 1) * (nu + 1) + i], g11 = G[(j + 1) * (nu + 1) + i + 1];
      put(g00); put(g10); put(g11); put(g00); put(g11); put(g01);
    }
  }
  function cells(len, step) { return Math.max(1, Math.ceil(Math.abs(len) / step)); }
  // a box, its faces lit; the floor under it is never seen
  function box(B, x0, y0, z0, x1, y1, z1, c, mat, room, fac, self) {
    var sx = x1 - x0, sy = y1 - y0, sz = z1 - z0, ny = cells(sy, 40);
    rect(B, [x0, y1, z0], [sx, 0, 0], [0, 0, sz], cells(sx, 60), cells(sz, 60), [0, 1, 0], c, mat, room, fac, false, self);
    if (y0 > 2) rect(B, [x0, y0, z0], [sx, 0, 0], [0, 0, sz], 1, 1, [0, -1, 0], c, mat, room, fac, false, self);
    rect(B, [x0, y0, z1], [sx, 0, 0], [0, sy, 0], cells(sx, 60), ny, [0, 0, 1], c, mat, room, fac, false, self);
    rect(B, [x0, y0, z0], [sx, 0, 0], [0, sy, 0], cells(sx, 60), ny, [0, 0, -1], c, mat, room, fac, false, self);
    rect(B, [x1, y0, z0], [0, 0, sz], [0, sy, 0], cells(sz, 60), ny, [1, 0, 0], c, mat, room, fac, false, self);
    rect(B, [x0, y0, z0], [0, 0, sz], [0, sy, 0], cells(sz, 60), ny, [-1, 0, 0], c, mat, room, fac, false, self);
  }
  function sphere(B, cx, cy, cz, rx, ry, rz, c, mat, room) {
    var la = 8, lo = 14, i, j;
    function p(i, j) { var th = i / la * Math.PI, ph = j / lo * 2 * Math.PI; return [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)]; }
    function put(q) {
      var k = B.room(), a = B.a, nl = Math.hypot(q[0] / rx, q[1] / ry, q[2] / rz);
      a[k] = cx + q[0] * rx; a[k + 1] = cy + q[1] * ry; a[k + 2] = cz + q[2] * rz;
      a[k + 3] = q[0] / rx / nl; a[k + 4] = q[1] / ry / nl; a[k + 5] = q[2] / rz / nl;
      a[k + 6] = c[0]; a[k + 7] = c[1]; a[k + 8] = c[2]; a[k + 9] = mat; a[k + 10] = room; a[k + 11] = 1; a[k + 12] = 0;
    }
    for (i = 0; i < la; i++) for (j = 0; j < lo; j++) {
      var a = p(i, j), b = p(i + 1, j), cc = p(i + 1, j + 1), d = p(i, j + 1);
      put(a); put(d); put(cc); put(a); put(cc); put(b);
    }
  }

  function solid() {
    var B = new Buf(13), Y = [0, 10, 25, 50, 90, 150, 210, 255, 280, 292, 300];
    // floors and ceilings, room by room
    ROOMS.forEach(function (rm, id) {
      rm.rects.forEach(function (r) {
        var w = r[2] - r[0], d = r[3] - r[1];
        rect(B, [r[0], 0, r[1]], [w, 0, 0], [0, 0, d], cells(w, 22), cells(d, 22), [0, 1, 0], rm.floor, rm.wood ? 1 : 2, id, 0, false, -1);
        rect(B, [r[0], CEIL, r[1]], [w, 0, 0], [0, 0, d], cells(w, 40), cells(d, 40), [0, -1, 0], PLASTER, 0, id, 0, false, -1);
      });
    });
    // the walls: each face cut where it changes room and around its openings, as fine near the floor
    // and the ceiling as the shadows there need
    WALLS.forEach(function (w, wi) {
      var ax = w.a[0], az = w.a[1], len = Math.hypot(w.b[0] - ax, w.b[1] - az), ux = (w.b[0] - ax) / len, uz = (w.b[1] - az) / len;
      var nx = -uz, nz = ux, open = w.open || [], ext = !!w.fac, e0 = ext ? -7 : 0, e1 = ext ? len + 7 : len;
      function at(s, d) { return [ax + ux * s + nx * d, az + uz * s + nz * d]; }
      function roomBy(s, side) { var p = at(Math.max(1, Math.min(len - 1, s)), 30 * side); return roomAt(p[0], p[1]); }
      [-1, 1].forEach(function (side) {
        var cuts = [e0, e1], s, prev = null, i;
        open.forEach(function (o) { cuts.push(o[0], o[1]); });
        for (s = 0; s <= len; s += 10) { var r0 = roomBy(s, side); if (prev !== null && r0 !== prev) cuts.push(s - 5); prev = r0; }
        cuts.sort(function (a, b) { return a - b; });
        for (i = 0; i < cuts.length - 1; i++) {
          var s0 = cuts[i], s1 = cuts[i + 1]; if (s1 - s0 < 0.5) continue;
          var mid = (s0 + s1) / 2, room = roomBy(mid, side), o = null;
          open.forEach(function (op) { if (mid > op[0] && mid < op[1]) o = op; });
          var spans = o ? [[0, o[2]], [o[3], CEIL]] : [[0, CEIL]];
          var mat = room < 0 ? 0 : room === 4 ? 3 : 0, col = room < 0 ? FACADE : room === 4 ? [0.85, 0.86, 0.85] : PLASTER;
          spans.forEach(function (sp) {
            if (sp[1] - sp[0] < 0.5) return;
            var rows = Y.filter(function (y) { return y > sp[0] && y < sp[1]; }), ys = [sp[0]].concat(rows, [sp[1]]), p0 = at(s0, 7 * side);
            for (var k = 0; k < ys.length - 1; k++)
              rect(B, [p0[0], ys[k], p0[1]], [ux * (s1 - s0), 0, uz * (s1 - s0)], [0, ys[k + 1] - ys[k], 0], cells(s1 - s0, 30), 1, [nx * side, 0, nz * side], col, mat, room, room < 0 ? w.fac : 0, true, -1);
          });
        }
      });
      // the openings' reveals: the jambs, the head and the sill, the wall's own thickness
      open.forEach(function (o) {
        var rin = roomBy((o[0] + o[1]) / 2, 1), rout = roomBy((o[0] + o[1]) / 2, -1), room = rin >= 0 ? rin : rout, fac = o[4] === 'w' ? w.fac : 0;
        var a0 = at(o[0], -7), a1 = at(o[1], -7), h = o[3] - o[2];
        rect(B, [a0[0], o[2], a0[1]], [nx * 14, 0, nz * 14], [0, h, 0], 1, 4, [ux, 0, uz], PLASTER, 0, room, fac, true, -1);
        rect(B, [a1[0], o[2], a1[1]], [nx * 14, 0, nz * 14], [0, h, 0], 1, 4, [-ux, 0, -uz], PLASTER, 0, room, fac, true, -1);
        if (o[3] < CEIL) rect(B, [a0[0], o[3], a0[1]], [ux * (o[1] - o[0]), 0, uz * (o[1] - o[0])], [nx * 14, 0, nz * 14], cells(o[1] - o[0], 40), 1, [0, -1, 0], PLASTER, 0, room, fac, false, -1);
        if (o[2] > 0) rect(B, [a0[0], o[2], a0[1]], [ux * (o[1] - o[0]), 0, uz * (o[1] - o[0])], [nx * 14, 0, nz * 14], cells(o[1] - o[0], 40), 1, [0, 1, 0], o[4] === 'w' ? STONE : PLASTER, 0, room, fac, false, -1);
        // window frames and mullions
        if (o[4] === 'w') {
          var bays = Math.max(1, Math.round((o[1] - o[0]) / 130)), fr = function (s0, s1, y0, y1, d0, d1) {
            var p = at(s0, d0), q = at(s1, d1);
            box(B, Math.min(p[0], q[0]), y0, Math.min(p[1], q[1]), Math.max(p[0], q[0]), y1, Math.max(p[1], q[1]), METAL, 5, room, fac, -1);
          };
          fr(o[0], o[0] + FRAME, o[2], o[3], -4, 4); fr(o[1] - FRAME, o[1], o[2], o[3], -4, 4);
          fr(o[0], o[1], o[3] - FRAME, o[3], -4, 4); fr(o[0], o[1], o[2], o[2] + FRAME, -4, 4);
          for (var b = 1; b < bays; b++) { var sm = o[0] + (o[1] - o[0]) * b / bays; fr(sm - 2, sm + 2, o[2], o[3], -3, 3); }
        }
      });
      // the top of the wall, the cut through it
      var t0 = at(e0, -7);
      rect(B, [t0[0], CEIL, t0[1]], [ux * (e1 - e0), 0, uz * (e1 - e0)], [nx * 14, 0, nz * 14], 1, 1, [0, 1, 0], CUT, 0, -1, 0, false, -1);
      if (!ext) [[0, -1], [len, 1]].forEach(function (end) {
        var p = at(end[0], -7);
        rect(B, [p[0], 0, p[1]], [nx * 14, 0, nz * 14], [0, CEIL, 0], 1, 4, [ux * end[1], 0, uz * end[1]], PLASTER, 0, roomBy(end[0], 1), 0, true, -1);
      });
    });
    // the front door
    box(B, 860, 0, -3, 960, 220, 3, WALNUT, 4, 5, 0, -1);
    FURN.forEach(function (f, i) { box(B, f[1], f[2], f[3], f[4], f[5], f[6], f[7], f[8], f[0], 0, i); });
    // the lamps: glass globes on cords, small shades by the bed
    for (var l = 0; l < LAMPS.length; l += 3) {
      var lx = LAMPS[l], ly = LAMPS[l + 1], lz = LAMPS[l + 2], lr = roomAt(lx, lz);
      if (ly > 150) { sphere(B, lx, ly, lz, 10, 9, 10, [0.95, 0.9, 0.82], 7, lr); box(B, lx - 0.5, ly + 10, lz - 0.5, lx + 0.5, CEIL, lz + 0.5, BLACK, 4, lr, 0, -1); }
      else { box(B, lx - 3, 52, lz - 3, lx + 3, 64, lz + 3, METAL, 4, lr, 0, -1); sphere(B, lx, ly, lz, 12, 10, 12, [0.95, 0.88, 0.78], 7, lr); }
    }
    // a plant by the window
    sphere(B, 40, 100, 958, 34, 40, 30, LEAF, 4, 0); sphere(B, 28, 140, 968, 24, 32, 22, LEAF, 4, 0); sphere(B, 52, 128, 950, 22, 28, 24, [0.24, 0.42, 0.2], 4, 0);
    return B;
  }

  // the glass, one pane per window, in the middle of the wall
  function glass() {
    var B = new Buf(4);
    WALLS.forEach(function (w) {
      (w.open || []).forEach(function (o) {
        if (o[4] !== 'w') return;
        var ax = w.a[0], az = w.a[1], len = Math.hypot(w.b[0] - ax, w.b[1] - az), ux = (w.b[0] - ax) / len, uz = (w.b[1] - az) / len;
        var p = [[o[0], o[2]], [o[1], o[2]], [o[1], o[3]], [o[0], o[2]], [o[1], o[3]], [o[0], o[3]]];
        p.forEach(function (q) { var k = B.room(); B.a[k] = ax + ux * q[0]; B.a[k + 1] = q[1]; B.a[k + 2] = az + uz * q[0]; B.a[k + 3] = w.fac; });
      });
    });
    return B;
  }

  // the first concept's points, for the start
  function points(Q) {
    var B = new Buf(10), STEP = Q < 1 ? 4.5 : 3, WALL = [0.66, 0.7, 0.8], OUT = [0.4, 0.44, 0.52], GL = [0.4, 0.55, 0.7];
    function put(x, y, z, c, k, kind, grp) {
      var j = B.room(), a = B.a;
      a[j] = x; a[j + 1] = y; a[j + 2] = z; a[j + 3] = c[0] * k; a[j + 4] = c[1] * k; a[j + 5] = c[2] * k;
      a[j + 6] = kind; a[j + 7] = grp; a[j + 8] = rnd(); a[j + 9] = rnd();
    }
    function line(x0, y0, z0, x1, y1, z1, step, c, k, kind, grp) {
      var n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0, z1 - z0) / step));
      for (var i = 0; i <= n; i++) { var f = i / n; put(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f, z0 + (z1 - z0) * f, c, k, kind, grp); }
    }
    WALLS.forEach(function (w) {
      var ax = w.a[0], az = w.a[1], bx = w.b[0], bz = w.b[1], len = Math.hypot(bx - ax, bz - az);
      var ux = (bx - ax) / len, uz = (bz - az) / len, nx = -uz, nz = ux, open = w.open || [], s, y, i;
      function hole(s, y) { for (var i = 0; i < open.length; i++) { var o = open[i]; if (s > o[0] && s < o[1] && y > o[2] && y < o[3]) return true; } return false; }
      [-1, 1].forEach(function (side) {
        function pt(s, y, edge) {
          var rm = roomAt(ax + ux * s + nx * 30 * side, az + uz * s + nz * 30 * side);
          put(ax + ux * s + nx * 7 * side, y, az + uz * s + nz * 7 * side, rm < 0 ? OUT : WALL, edge ? 0.9 : 0.32 + rnd() * 0.2, 10, rm);
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
      open.forEach(function (o) {
        if (o[4] !== 'w') return;
        var g = (o[1] - o[0]) * (o[3] - o[2]) / 900 * Q;
        for (i = 0; i < g; i++) { s = o[0] + rnd() * (o[1] - o[0]); put(ax + ux * s, o[2] + rnd() * (o[3] - o[2]), az + uz * s, GL, 0.3, 10, -1); }
      });
    });
    ROOMS.forEach(function (rm, id) {
      rm.rects.forEach(function (r) {
        var n = (r[2] - r[0]) * (r[3] - r[1]) / 55 * Q;
        for (var i = 0; i < n; i++) {
          var x = r[0] + rnd() * (r[2] - r[0]), z = r[1] + rnd() * (r[3] - r[1]), u = rnd();
          if (rm.wood && u < 0.6) z = Math.min(r[3], Math.max(r[1], Math.round(z / 18) * 18));
          put(x, 0.5, z, rm.floor, (u < 0.6 ? 0.7 : 0.4) + rnd() * 0.2, 11, id);
        }
      });
    });
    FURN.forEach(function (f) {
      var x0 = f[1], y0 = f[2], z0 = f[3], x1 = f[4], y1 = f[5], z1 = f[6], c = f[7], E = STEP * 0.85, rm = f[0];
      var ex = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
      for (var k = 0; k < 4; k++) {
        var a = ex[k], b = ex[(k + 1) % 4];
        line(a[0], y1, a[1], b[0], y1, b[1], E, c, 0.95, 12, rm);
        if (y1 - y0 > 4) line(a[0], y0, a[1], a[0], y1, a[1], E, c, 0.85, 12, rm);
      }
      var top = (x1 - x0) * (z1 - z0), n = top / 45 * Q;
      for (var i = 0; i < n; i++) put(x0 + rnd() * (x1 - x0), y1, z0 + rnd() * (z1 - z0), c, 0.4 + rnd() * 0.25, 12, rm);
    });
    [0, 1, 2, 3].forEach(function (id) {
      var r = ROOMS[id].rects[0], n = (r[2] - r[0]) * (r[3] - r[1]) / 30 * Q;
      for (var i = 0; i < n; i++) put(r[0] + rnd() * (r[2] - r[0]), 10 + rnd() * (CEIL - 20), r[1] + rnd() * (r[3] - r[1]), [1, 1, 1], 1, 13, id);
    });
    return B;
  }

  // ——— the camera, the sun, the screen ———
  var gl, S = {}, G = {}, Pp = {}, bufs = {}, nSolid = 0, nGlass = 0, nPts = 0, F = 800, labels = [], pano = { A: null, B: null, ready: 0 };
  var view = new Float32Array(16), proj = new Float32Array(16);
  var E = [0, 0, 0], T = [0, 0, 0], PT = { x: 0, y: 0 }, SUN = [0, 1, 0], BOUNCE = new Float32Array(7);
  function perspective(m, fovy, aspect, near, far) {
    var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    m.fill(0); m[0] = f / aspect; m[5] = f; m[10] = (far + near) * nf; m[11] = -1; m[14] = 2 * far * near * nf;
  }
  function lookAt(m, e, t) {
    var zx = e[0] - t[0], zy = e[1] - t[1], zz = e[2] - t[2], zl = Math.hypot(zx, zy, zz);
    zx /= zl; zy /= zl; zz /= zl;
    var xx = zz, xz = -zx, xl = Math.hypot(xx, xz) || 1e-6;
    xx /= xl; xz /= xl;
    var yx = zy * xz, yy = zz * xx - zx * xz, yz = -zy * xx;
    m[0] = xx; m[1] = yx; m[2] = zx; m[3] = 0;
    m[4] = 0; m[5] = yy; m[6] = zy; m[7] = 0;
    m[8] = xz; m[9] = yz; m[10] = zz; m[11] = 0;
    m[12] = -(xx * e[0] + xz * e[2]); m[13] = -(yx * e[0] + yy * e[1] + yz * e[2]); m[14] = -(zx * e[0] + zy * e[1] + zz * e[2]); m[15] = 1;
  }
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
  function near(stage, s, w) { return Math.max(0, 1 - Math.abs(stage - s) / w); }
  // the sun on a June day around 50° north: up at five, due south at one, down at nine
  function sunAt(h) {
    var az = (h - 13) / 8 * 2.23, el = 1.1 * Math.sin(Math.PI * (h - 5) / 16);
    SUN[0] = -Math.sin(az) * Math.cos(el); SUN[1] = Math.sin(el); SUN[2] = Math.cos(az) * Math.cos(el);
    return el;
  }
  // the same test on the CPU, for the light the sunlit floor throws back into its room
  function sunHits(x, z, room) {
    for (var i = 0; i < WINS.length; i++) {
      var w = WINS[i]; if (WW[i * 7 + room] < 0.5) continue;
      var t, a;
      if (!w.west) { if (SUN[2] < 0.02) continue; t = (1000 - z) / SUN[2]; a = x + t * SUN[0]; }
      else { if (SUN[0] > -0.02) continue; t = -x / SUN[0]; a = z + t * SUN[2]; }
      var h = t * SUN[1];
      if (a > w.r[0] && a < w.r[1] && h > w.r[2] && h < w.r[3]) return true;
    }
    return false;
  }
  function bounce(sunOn) {
    for (var r = 0; r < 7; r++) {
      var rc = ROOMS[r].rects[0], hit = 0;
      if (sunOn > 0.01) for (var i = 0; i < 6; i++) for (var j = 0; j < 6; j++)
        if (sunHits(rc[0] + (rc[2] - rc[0]) * (i + 0.5) / 6, rc[1] + (rc[3] - rc[1]) * (j + 0.5) / 6, r)) hit++;
      BOUNCE[r] = hit / 36 * 0.55 * sunOn;
    }
    BOUNCE[1] = Math.max(BOUNCE[1], BOUNCE[0] * 0.6); BOUNCE[5] = Math.max(BOUNCE[5], BOUNCE[0] * 0.25);
  }
  function upright(W, H) { return W < 760 && H > W; }
  // a station's way of looking: yaw (0 towards the south), pitch, and how far off its target is
  function dirOf(s) {
    if (!s.dir) { var dx = s.t[0] - s.e[0], dy = s.t[1] - s.e[1], dz = s.t[2] - s.e[2], hz = Math.hypot(dx, dz); s.dir = [Math.atan2(dx, dz), Math.atan2(dy, hz), Math.hypot(hz, dy)]; }
    return s.dir;
  }
  function mix3(a, b, f) { return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]; }

  var lastScroll = -1e9, hintAt = -1, clockMin = -1, sayAt = '';
  addEventListener('scroll', function () { lastScroll = performance.now(); }, { passive: true });
  var clockT = document.getElementById('clockT'), clockS = document.getElementById('clockS'), clockEl = document.getElementById('clock'), sunDot = document.getElementById('sunDot');
  function sunWords(h) {
    return h < 15 ? 'Midday: south light across the living room' : h < 18.3 ? 'Afternoon: the sun comes round to the west' :
      h < 20.2 ? 'Golden hour, through the west windows' : h < 21 ? 'Sunset over the city' : 'Night: the lamps come on';
  }
  var book = document.getElementById('book'), note = document.getElementById('note');
  if (book) book.addEventListener('click', function () { note.textContent = 'Nothing to book: this home is made up. The page is the point.'; note.classList.add('lit'); });

  var renderer = {
    init: function () {
      if (!this.initGL()) return false;
      var wrap = document.getElementById('labels');
      ROOMS.forEach(function (rm) {
        var r = rm.rects[0], el = document.createElement('div');
        el.className = 'fl room'; el.innerHTML = '<span>' + rm.name + '<b>' + rm.area + ' m²</b></span>';
        wrap.appendChild(el);
        labels.push({ el: el, at: [(r[0] + r[2]) / 2, 0, (r[1] + r[3]) / 2], show: function (s) { return near(s, 2, 0.4); }, on: false });
      });
      return true;
    },
    restore: function (env) { if (this.initGL()) { this.Q = null; if (pano.imgs) this.panos(); this.build(env); } },
    initGL: function () {
      var canvas = document.getElementById('gl');
      gl = canvas.getContext('webgl', { antialias: true, alpha: false, depth: true, powerPreference: 'high-performance' });
      if (!gl) return false;
      function sh(type, src) {
        var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
        return s;
      }
      function prog(vs, fs, uni, att) {
        var p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
        gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
        var o = { p: p, u: {}, a: {} };
        uni.forEach(function (n) { o.u[n] = gl.getUniformLocation(p, n); });
        att.forEach(function (n) { o.a[n] = gl.getAttribLocation(p, n); });
        return o;
      }
      var WU = ['uWin', 'uWinC', 'uWinN', 'uWinA', 'uWinB', 'uWW', 'uSun'];
      S = prog(SVS, SFS, ['uView', 'uProj', 'uBounce', 'uEye', 'uSunCol', 'uSky', 'uLamp', 'uSunOn', 'uLampOn', 'uAmb', 'uExpo', 'uSweep', 'uCeil', 'uPix'].concat(WU), ['aPos', 'aNrm', 'aCol', 'aInfo']);
      G = prog(GVS, GFS, ['uView', 'uProj', 'uA', 'uB', 'uEye', 'uTint', 'uOffA', 'uOffB', 'uMix', 'uOut', 'uExpo', 'uSweep', 'uReady'], ['aPos', 'aFac']);
      Pp = prog(PVS, PFS, ['uView', 'uProj', 'uT', 'uDpr', 'uF', 'uFocus', 'uMaxSize', 'uIn', 'uSweep', 'uSunOn', 'uLampOn', 'uSunCol', 'uLamp'].concat(WU), ['aPos', 'aCol', 'aInfo']);
      bufs = { solid: gl.createBuffer(), glass: gl.createBuffer(), pts: gl.createBuffer() };
      pano.A = gl.createTexture(); pano.B = gl.createTexture();
      // the windows, the same for every program that lights by them
      var win = new Float32Array(24), wc = new Float32Array(18), wn = new Float32Array(18), wa = new Float32Array(6), wb = new Float32Array(6);
      WINS.forEach(function (w, i) {
        win.set(w.r, i * 4); wc.set(w.c, i * 3); wn.set(w.n, i * 3); wa[i] = w.area; wb[i] = w.bays;
      });
      for (var i = WINS.length; i < 6; i++) { wn[i * 3 + 2] = 1; wb[i] = 1; }
      [S, Pp].forEach(function (o) {
        gl.useProgram(o.p);
        gl.uniform4fv(o.u.uWin, win); gl.uniform3fv(o.u.uWinC, wc); gl.uniform3fv(o.u.uWinN, wn);
        gl.uniform1fv(o.u.uWinA, wa); gl.uniform1fv(o.u.uWinB, wb); gl.uniform1fv(o.u.uWW, WW);
        if (o.u.uLamp) gl.uniform3fv(o.u.uLamp, new Float32Array(LAMPS));
      });
      gl.useProgram(G.p); gl.uniform1i(G.u.uA, 0); gl.uniform1i(G.u.uB, 1);
      // which way each photograph faces: the city's towers to the south, the sunset to the west
      gl.uniform1f(G.u.uOffA, 0.6); gl.uniform1f(G.u.uOffB, 0.12);
      return true;
    },
    // the model needs only its font; the photographs outside come in behind it
    load: function (tick) {
      var self = this, big = !(window.Perf && Perf.touch) && innerWidth > 900 && gl.getParameter(gl.MAX_TEXTURE_SIZE) >= 8192;
      pano.imgs = ['day', 'dusk'].map(function (n) {
        var im = new Image();
        im.onload = function () { (im.decode ? im.decode() : Promise.resolve()).catch(function () {}).then(function () { im.ok = true; self.panos(); }); };
        im.src = 'pano/' + n + (big ? '-8k' : '-4k') + '.jpg';
        return im;
      });
      return (document.fonts ? document.fonts.load('600 40px Inter') : Promise.resolve()).then(function () { tick(1); });
    },
    panos: function () {
      pano.imgs.forEach(function (im, i) {
        if (!im.ok || im.up === gl) return;
        im.up = gl;
        gl.activeTexture(i ? gl.TEXTURE1 : gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, i ? pano.B : pano.A);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      });
      pano.ready = pano.imgs[0].ok && pano.imgs[1].ok ? 1 : 0;
    },
    build: function (env) {
      var W = env.W, H = env.H, Q = env.mobile ? 0.45 : 1;
      this.up = upright(W, H);
      if (this.Q !== Q) {
        this.Q = Q; seed = 14;
        var s = solid(), g = glass(), p = points(Q);
        nSolid = s.n; nGlass = g.n; nPts = p.n;
        gl.bindBuffer(gl.ARRAY_BUFFER, bufs.solid); gl.bufferData(gl.ARRAY_BUFFER, s.a.subarray(0, s.n * 13), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, bufs.glass); gl.bufferData(gl.ARRAY_BUFFER, g.a.subarray(0, g.n * 4), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, bufs.pts); gl.bufferData(gl.ARRAY_BUFFER, p.a.subarray(0, p.n * 10), gl.STATIC_DRAW);
      }
      var c = gl.canvas;
      c.width = Math.round(W * env.dpr); c.height = Math.round(H * env.dpr);
      gl.viewport(0, 0, c.width, c.height);
      this.dk = this.up ? 1.55 : W / H < 1.2 ? 1.25 : 1;
    },
    setDpr: function (env) {
      var c = gl.canvas;
      c.width = Math.round(env.W * env.dpr); c.height = Math.round(env.H * env.dpr);
      gl.viewport(0, 0, c.width, c.height);
    },
    attribs: function (list, stride) {
      for (var i = 0; i < 8; i++) gl.disableVertexAttribArray(i);
      var off = 0;
      list.forEach(function (a) { if (a[0] >= 0) { gl.enableVertexAttribArray(a[0]); gl.vertexAttribPointer(a[0], a[1], gl.FLOAT, false, stride * 4, off * 4); } off += a[1]; });
    },
    frame: function (env) {
      var W = env.W, H = env.H, stage = Math.min(LAST, Math.max(0, env.stage)), k, up = this.up;
      var n = Math.min(LAST - 1, Math.floor(stage)), f = stage - n;
      if (n !== DAY) f = smooth(f);
      var a = ST[n], b = ST[n + 1];
      // into a room over its walls: up first, across, then down
      var g = f, bump = 0;
      if (b.lift) { g = smooth((f - 0.22) / 0.56); bump = b.lift * smooth(f / 0.3) * smooth((1 - f) / 0.3); }
      // the eye moves in a line; the head turns (yaw and pitch), so turning round on the spot is a turn
      var ya = dirOf(a), yb = dirOf(b), dyaw = yb[0] - ya[0];
      if (dyaw > Math.PI) dyaw -= 2 * Math.PI; else if (dyaw < -Math.PI) dyaw += 2 * Math.PI;
      // dropping into the flat from above the head stays down until the floor is near; rising out, it looks down first
      var pg = a.orbit && !b.orbit ? Math.pow(g, 2.5) : b.orbit && !a.orbit ? 1 - Math.pow(1 - g, 2.5) : g;
      var yaw = ya[0] + dyaw * pg, pitch = ya[1] + (yb[1] - ya[1]) * pg - (b.lift ? bump / b.lift * 0.9 : 0), dist = ya[2] + (yb[2] - ya[2]) * pg;
      for (k = 0; k < 3; k++) E[k] = a.e[k] + (b.e[k] - a.e[k]) * g;
      E[1] += bump;
      var cpi = Math.cos(pitch);
      T[0] = E[0] + Math.sin(yaw) * cpi * dist; T[1] = E[1] + Math.sin(pitch) * dist; T[2] = E[2] + Math.cos(yaw) * cpi * dist;
      // a phone stands further back from the views from outside
      var ok = (a.orbit ? 1 - f : 0) + (b.orbit ? f : 0);
      if (up && ok > 0) { var kk = 1 + (this.dk - 1) * ok; for (k = 0; k < 3; k++) E[k] = T[k] + (E[k] - T[k]) * kk; }
      // the cursor turns the head a little
      var kt = env.dt / 16.7, ease = 1 - Math.pow(0.94, kt);
      var mx = env.mouse.x < -9000 ? 0 : (env.mouse.x / W - 0.5) * 2, my = env.mouse.y < -9000 ? 0 : (env.mouse.y / H - 0.5) * 2;
      this.mx = (this.mx || 0) + (mx * env.mouse.on - (this.mx || 0)) * ease;
      this.my = (this.my || 0) + (my * env.mouse.on - (this.my || 0)) * ease;
      var dx = T[0] - E[0], dz = T[2] - E[2], dl = Math.hypot(dx, T[1] - E[1], dz), hl = Math.hypot(dx, dz) || 1;
      if (!env.reduce) { T[0] += -dz / hl * this.mx * dl * 0.07; T[2] += dx / hl * this.mx * dl * 0.07; T[1] -= this.my * dl * 0.04; }
      lookAt(view, E, T);
      var fov = (up ? a.fovM + (b.fovM - a.fovM) * f : a.fov + (b.fov - a.fov) * f) * Math.PI / 180;
      F = H / (2 * Math.tan(fov / 2));
      perspective(proj, fov, W / H, 4, 30000);
      proj[8] = -(up ? 0 : a.lx + (b.lx - a.lx) * f); proj[9] = -(up ? a.ly + (b.ly - a.ly) * f : 0);

      // the hour, the sun and the sky it makes
      var h = a.h + (b.h - a.h) * f, el = sunAt(h);
      var dayK = smooth(el / 0.35), up0 = smooth(el / 0.04), dusk = smooth((-el + 0.02) / 0.2);
      var sky = mix3([1.0, 0.6, 0.42], [0.66, 0.76, 0.95], dayK);
      var skyI = el > 0 ? 0.55 + 0.45 * dayK : 0.55 * (1 - dusk) + 0.02;
      var sunCol = mix3([1.0, 0.48, 0.2], [1.0, 0.92, 0.8], smooth(el / 0.6));
      var sunI = (1.6 + 1.8 * smooth(el / 0.6)) * up0;
      var lampOn = smooth((h - 19.2) / 1.3);
      var sweep = stage < 1 ? -150 + 2150 * smooth(stage / 0.9) : 1e5;
      var ceil = 1 - smooth((E[1] - 235) / 70);
      bounce(sunI > 0 ? 1 : 0);
      var expo = 1.25 + 1.4 * (1 - dayK) * (1 - lampOn * 0.4);
      if (this.introAt == null) this.introAt = performance.now();
      var inn = env.reduce ? 1 : smooth((performance.now() - this.introAt) / 1600);

      gl.clearColor(0.024, 0.027, 0.04, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.disable(gl.BLEND);
      if (sweep > -100) {
        gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
        gl.useProgram(S.p);
        gl.uniformMatrix4fv(S.u.uView, false, view); gl.uniformMatrix4fv(S.u.uProj, false, proj);
        gl.uniform3f(S.u.uEye, E[0], E[1], E[2]);
        gl.uniform3f(S.u.uSun, SUN[0], SUN[1], SUN[2]); gl.uniform1f(S.u.uSunOn, 1);
        gl.uniform3f(S.u.uSunCol, sunCol[0] * sunI, sunCol[1] * sunI, sunCol[2] * sunI);
        gl.uniform3f(S.u.uSky, sky[0] * skyI, sky[1] * skyI, sky[2] * skyI);
        gl.uniform1f(S.u.uLampOn, lampOn); gl.uniform1f(S.u.uAmb, 0.012 + 0.02 * dayK);
        gl.uniform1f(S.u.uExpo, expo); gl.uniform1f(S.u.uSweep, sweep); gl.uniform1f(S.u.uCeil, ceil);
        gl.uniform1f(S.u.uPix, 1 / (F * env.dpr));
        gl.uniform1fv(S.u.uBounce, BOUNCE);
        gl.bindBuffer(gl.ARRAY_BUFFER, bufs.solid);
        this.attribs([[S.a.aPos, 3], [S.a.aNrm, 3], [S.a.aCol, 3], [S.a.aInfo, 4]], 13);
        gl.drawArrays(gl.TRIANGLES, 0, nSolid);
        gl.disable(gl.CULL_FACE);

        // outside: noon, then the sunset photograph, then the same at night
        gl.useProgram(G.p);
        gl.uniformMatrix4fv(G.u.uView, false, view); gl.uniformMatrix4fv(G.u.uProj, false, proj);
        gl.uniform3f(G.u.uEye, E[0], E[1], E[2]);
        var night = smooth((h - 20.4) / 1.0);
        gl.uniform1f(G.u.uMix, smooth((h - 16.8) / 2.6));
        gl.uniform3f(G.u.uTint, 1 - 0.45 * night, 1 - 0.3 * night, 1 + 0.15 * night);
        gl.uniform1f(G.u.uOut, (1 - 0.88 * night) * 1.35);
        gl.uniform1f(G.u.uExpo, expo * 0.8 + 0.2); gl.uniform1f(G.u.uSweep, sweep);
        gl.uniform1f(G.u.uReady, pano.ready * (1 - smooth((E[1] - 300) / 150)));
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, pano.A);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, pano.B);
        gl.bindBuffer(gl.ARRAY_BUFFER, bufs.glass);
        this.attribs([[G.a.aPos, 3], [G.a.aFac, 1]], 4);
        gl.drawArrays(gl.TRIANGLES, 0, nGlass);
      }

      // the points: the model before the sweep, and the dust in the sunbeams after it
      gl.depthMask(false); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(Pp.p);
      gl.uniformMatrix4fv(Pp.u.uView, false, view); gl.uniformMatrix4fv(Pp.u.uProj, false, proj);
      gl.uniform1f(Pp.u.uT, env.reduce ? 0 : env.t); gl.uniform1f(Pp.u.uDpr, env.dpr); gl.uniform1f(Pp.u.uF, F);
      gl.uniform1f(Pp.u.uFocus, Math.hypot(T[0] - E[0], T[1] - E[1], T[2] - E[2])); gl.uniform1f(Pp.u.uMaxSize, env.mobile ? 24 : 48);
      gl.uniform1f(Pp.u.uIn, inn); gl.uniform1f(Pp.u.uSweep, sweep);
      gl.uniform3f(Pp.u.uSun, SUN[0], SUN[1], SUN[2]); gl.uniform1f(Pp.u.uSunOn, up0);
      gl.uniform3f(Pp.u.uSunCol, sunCol[0], sunCol[1], sunCol[2]); gl.uniform1f(Pp.u.uLampOn, lampOn);
      gl.bindBuffer(gl.ARRAY_BUFFER, bufs.pts);
      this.attribs([[Pp.a.aPos, 3], [Pp.a.aCol, 3], [Pp.a.aInfo, 4]], 10);
      gl.drawArrays(gl.POINTS, 0, nPts);
      gl.depthMask(true);

      // the rooms' names on the plan
      for (k = 0; k < labels.length; k++) {
        var lb = labels[k], o = lb.show(stage);
        if (o <= 0.01) { if (lb.on) { lb.on = false; css(lb.el, 'opacity', '0'); css(lb.el, 'visibility', 'hidden'); } continue; }
        if (!project(lb.at[0], lb.at[1], lb.at[2], W, H)) continue;
        lb.on = true;
        css(lb.el, 'visibility', 'visible'); css(lb.el, 'opacity', Math.min(1, o * 1.6).toFixed(3));
        css(lb.el, 'transform', 'translate(' + PT.x.toFixed(1) + 'px,' + PT.y.toFixed(1) + 'px) translate(-50%,-50%)');
      }

      // the clock of the day
      var co = smooth((stage - 6.55) / 0.35) * (1 - smooth((stage - 8.2) / 0.3));
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

      var hint = window.Hint;
      if (hint) {
        var at = stage < 0.05 ? 0 : stage > LAST - 0.02 ? 2 : 1;
        if (at !== hintAt) { hintAt = at; hint.say(at); hint.el.classList.toggle('is-back', at === 2); }
        var room = W >= 1000 && H >= 700 ? stage < 2.5 : stage < 0.05;
        css(hint.el, 'opacity', performance.now() - lastScroll > 900 && room ? '1' : '0');
      }
    },
    workAt: function () { return false; },
    coverAt: function () { return -1; },
    free: function (stage) { return stage > DAY - 0.02 && stage < DAY + 1.02; }
  };

  BKit({ cases: [], renderer: renderer, keys: keys, stops: stops, last: LAST });
  if (window.Perf && Perf.info) { var info = Perf.info; Perf.info = function () { return info() + '  tris ' + (nSolid / 3 | 0) + '  pts ' + nPts; }; }
})();
