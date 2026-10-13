// The case page shell, shared by both styles: the document scrolls as
// a document, and every section names a scene for the background. This
// works out which scene is up and how far into it the reader is, runs the
// tabs, the screen viewer and the journey maps, and hands each frame to
// the renderer the URL asks for (?v=matter or ?v=depth).
(function () {
  var params = new URLSearchParams(location.search);
  var style = params.get('v') === 'depth' ? 'depth' : 'matter';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;
  root.classList.add('style-' + style);

  // ——— chrome ———
  document.getElementById('home').href = style === 'depth' ? 'depth.html' : 'b.html';
  var sM = document.getElementById('sMatter'), sD = document.getElementById('sDepth');
  (style === 'depth' ? sD : sM).setAttribute('aria-current', 'page');
  // switching style keeps your place: it lands on the same chapter
  [sM, sD].forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var cur = sections[Math.min(sections.length - 1, Math.round(env.scene))];
      location.href = a.getAttribute('href') + (cur && cur.id && cur.id !== 'top' ? '#' + cur.id : '');
    });
  });

  var lenis = window.Lenis && !reduce ? new Lenis({ lerp: 0.16 }) : null;
  function scrollPos() { return lenis ? lenis.animatedScroll : scrollY; }
  function goTo(el) { if (lenis) lenis.scrollTo(el, { offset: -20, duration: 1.4 }); else el.scrollIntoView({ behavior: 'smooth' }); }

  var sections = [].slice.call(document.querySelectorAll('[data-scene]'));
  var rail = document.getElementById('rail');
  rail.innerHTML = sections.filter(function (s) { return s.dataset.title; }).map(function (s) {
    return '<a href="#' + s.id + '" data-id="' + s.id + '">' + s.querySelector('.num').textContent.slice(0, 2) + ' <span>' + s.dataset.title + '</span></a>';
  }).join('');
  rail.addEventListener('click', function (e) {
    var a = e.target.closest('a'); if (!a) return;
    e.preventDefault(); goTo(document.getElementById(a.dataset.id));
  });

  // ——— reveal ———
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.rv').forEach(function (el) { io.observe(el); });

  // ——— tabs ———
  document.querySelectorAll('[role="tablist"]').forEach(function (list) {
    list.addEventListener('click', function (e) {
      var b = e.target.closest('[role="tab"]'); if (!b) return;
      list.querySelectorAll('[role="tab"]').forEach(function (t) {
        var on = t === b;
        t.setAttribute('aria-selected', on);
        var p = document.getElementById(t.getAttribute('aria-controls'));
        if (p) { p.hidden = !on; if (on) p.querySelectorAll('.rv').forEach(function (r) { r.classList.add('in'); }); }
      });
      measure();
    });
  });

  // ——— journeys ———
  var J = [
    ['Group 1 — Data scientist / engineer', 'Finds a data product and gets access to it.', [
      ['Need', 'What data is available?', 'Uncertainty', -0.3, 'No single data catalog', 'Dataset recommendations'],
      ['Search', 'Does a dataset for this already exist?', 'Frustration', -0.8, 'Duplicates, chaos, outdated data', 'Unified marketplace + filters'],
      ['Evaluate', 'Can I trust these numbers?', 'Cautious optimism', 0.2, 'No quality, lineage, documentation', 'Quality score, lineage graph, user feedback and ratings'],
      ['Access', 'Why does it take so long?', 'Irritation', -0.6, 'Long approvals, no transparency', 'Auto-approval, status tracking'],
      ['Integrate', 'Is this dataset stable?', 'Focus', 0.4, 'No code examples, schema issues', 'Code snippets, schema contracts, open data in the relevant system'],
      ['Monitor', 'Is everything still working?', 'Calm or stress', 0, 'No alerts, late issue detection', 'Alerts, freshness indicators, impact analysis']]],
    ['Group 2 — Business user', 'Gets an answer out of numbers they can trust.', [
      ['Discover', 'Where is the report I need?', 'Confusion', -0.5, 'Too many raw tables, unclear naming, inconsistent metrics', 'Curated catalog, business-ready filters, certified metrics'],
      ['Understand', 'What exactly does this KPI measure?', 'Cognitive overload', -0.7, 'Inconsistent definitions, outdated data', 'Unified metric library, data dictionary, consistency checks, ratings'],
      ['Use', 'I need insights quickly.', 'Productive', 0.6, 'Reliance on engineers, errors due to outdated data', '“Open in BI” button, AI assistant for questions'],
      ['Share', 'Can others trust this data?', 'Confidence or uncertainty', 0.1, 'Low trust, unclear validation', 'Trust badges, automated business validation']]],
    ['Group 3 — Data product owner', 'Decides what gets built, and keeps it worth keeping.', [
      ['Proposal generation', 'Do we really need a new dataset?', 'Cautious', -0.1, 'Fragmented ownership, missing catalog', 'AI duplicate detection, governance templates'],
      ['Approvals', 'Is this data trustworthy?', 'Responsibility', 0.1, 'Manual checks, incomplete metadata', 'Auto-checklist, completeness score'],
      ['Monitor adoption', 'Is this product actually being used?', 'Confident', 0.6, 'Low visibility, scattered metrics', 'Unified adoption dashboard'],
      ['Maintain roadmap', 'What should we improve next?', 'Calm productivity', 0.5, '—', '—']]],
    ['Group 4 — Data POD lead', 'Builds the product and keeps it running.', [
      ['Understand requirements', 'What SLA is required?', 'Curiosity', 0.3, 'Lack of context, unclear business need', 'Business context block, similar-product suggestions, a way to see where the data is'],
      ['Build', 'Can I automate documentation?', 'Neutral, to frustration on manual work', -0.4, 'Manual metadata, lineage tracking', 'Auto-metadata, lineage auto-detection'],
      ['Publish', 'Is the description clear?', 'Confident', 0.6, 'No consistent templates', 'Auto-fill from the pipeline, publish-as-code, automated publishing to the marketplace'],
      ['Operate', 'Who will be affected by this incident?', 'Stress', -0.7, 'No user visibility, unclear root causes', 'Impact analysis, incident assistant'],
      ['Improve', 'What can be automated next?', 'Satisfaction', 0.7, '—', '—']]]
  ];
  document.getElementById('journeys').innerHTML = J.map(function (g, i) {
    var st = g[2], n = st.length;
    // the emotion line: one point per stage, above the line is better
    var pts = st.map(function (s, k) { return [(k + 0.5) / n * 100, 50 - s[3] * 40]; });
    var path = pts.map(function (p, k) { return (k ? 'L' : 'M') + p[0].toFixed(2) + ' ' + p[1].toFixed(2); }).join(' ');
    var svg = '<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' +
      '<line x1="0" y1="50" x2="100" y2="50" stroke="rgba(233,236,242,.15)" stroke-width="1" vector-effect="non-scaling-stroke"/>' +
      '<path d="' + path + '" fill="none" stroke="#E9ECF2" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>' +
      pts.map(function (p, k) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="1.6" fill="' + (st[k][3] < 0 ? '#E5484D' : '#B8F0C9') + '"/>'; }).join('') + '</svg>';
    return '<div class="card journey" role="tabpanel" id="j' + (i + 1) + '" aria-labelledby="t-j' + (i + 1) + '"' + (i ? ' hidden' : '') + ' style="margin-top:12px">' +
      '<span class="eyebrow">' + g[0] + '</span><p style="margin-top:6px">' + g[1] + '</p>' + svg +
      '<div class="stages">' + st.map(function (s, k) {
        return '<div class="st"><b>0' + (k + 1) + '</b><div><h4>' + s[0] + '<span class="emo">· ' + s[2] + '</span></h4><q>' + s[1] + '</q>' +
          '<div class="po"><span><b>Pain point</b>' + s[4] + '</span><span><b>Opportunity</b>' + s[5] + '</span></div></div></div>';
      }).join('') + '</div></div>';
  }).join('');

  // ——— screens ———
  var SH = [['main', 'Main', 'AI-powered home page with natural language search and personalized recommendations'],
    ['explore', 'Explore', 'Browse and filter data products across the organization'],
    ['detail', 'Detail', 'Dataset detail page with metadata, quality score, and access controls'],
    ['request', 'Request access', 'Multi-step access request flow with governance context'],
    ['admin', 'Admin', 'Admin panel for managing data products and access permissions']];
  var shotI = 0, theme = 'dark', front = 'A';
  var tabsEl = document.getElementById('screenTabs');
  tabsEl.innerHTML = SH.map(function (s, i) { return '<button role="tab" aria-selected="' + (i === 0) + '" data-i="' + i + '">' + s[1] + '</button>'; }).join('');
  function shotSrc(i, t) { return '../../cases/halliburton/images/mockups/' + SH[i][0] + '-' + t + '.webp'; }
  function showShot() {
    // crossfade: load into the hidden layer, then swap
    var a = document.getElementById('shot' + front), b = document.getElementById('shot' + (front === 'A' ? 'B' : 'A'));
    b.onload = function () { b.style.opacity = 1; a.style.opacity = 0; front = front === 'A' ? 'B' : 'A'; };
    b.src = shotSrc(shotI, theme); b.alt = SH[shotI][1] + ' — ' + theme + ' theme';
    document.getElementById('shotCap').textContent = SH[shotI][1] + ' — ' + SH[shotI][2];
  }
  document.getElementById('shotA').src = shotSrc(0, theme);
  document.getElementById('shotA').alt = 'Main — dark theme';
  document.getElementById('shotCap').textContent = SH[0][1] + ' — ' + SH[0][2];
  tabsEl.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    shotI = +b.dataset.i;
    [].forEach.call(tabsEl.children, function (x) { x.setAttribute('aria-selected', x === b); });
    showShot();
  });
  document.querySelector('.theme').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    theme = b.dataset.t;
    [].forEach.call(this.children, function (x) { x.setAttribute('aria-pressed', x === b); });
    showShot();
  });
  // preload the rest, quietly
  setTimeout(function () { SH.forEach(function (s, i) { ['light', 'dark'].forEach(function (t) { var im = new Image(); im.src = shotSrc(i, t); }); }); }, 2500);

  // ——— scene bookkeeping ———
  var tops = [], heights = [], stepEls = [].slice.call(document.querySelectorAll('#steps li'));
  var personaEls = [].slice.call(document.querySelectorAll('.persona')), hoverPersona = -1;
  personaEls.forEach(function (p, i) {
    p.addEventListener('mouseenter', function () { hoverPersona = i; });
    p.addEventListener('mouseleave', function () { hoverPersona = -1; });
  });
  function measure() {
    var y = scrollY;
    tops = sections.map(function (s) { return s.getBoundingClientRect().top + y; });
    heights = sections.map(function (s) { return s.offsetHeight; });
  }
  new ResizeObserver(function () { measure(); }).observe(document.querySelector('main'));

  var env = {
    W: innerWidth, H: innerHeight, dpr: Math.min(window.devicePixelRatio || 1, 2), mobile: innerWidth < 860, reduce: reduce,
    t: 0, dt: 16, scene: 0, sub: 0, step: 0, persona: 0, heroRect: { x: 0, y: 0, w: 1, h: 1 }, heroVis: 1,
    mouse: { x: -9999, y: -9999, vx: 0, vy: 0, on: 0 }
  };
  var tx = -9999, ty = -9999, lastMove = 0;
  addEventListener('pointermove', function (e) { tx = e.clientX; ty = e.clientY; lastMove = performance.now(); });
  document.addEventListener('pointerleave', function () { tx = ty = -9999; });

  var heroImg = document.getElementById('heroImg'), heroFig = document.getElementById('heroFig');
  var nav = document.getElementById('nav'), progress = document.getElementById('progress');
  var railLinks = [].slice.call(rail.querySelectorAll('a'));

  function update(now) {
    var y = scrollPos(), vh = innerHeight;
    // a section takes over as its top climbs from 80% to 25% of the screen
    var sc = 0;
    for (var i = 1; i < sections.length; i++) sc += Math.max(0, Math.min(1, (y - (tops[i] - vh * 0.8)) / (vh * 0.55)));
    env.scene = sc;
    var k = Math.min(sections.length - 1, Math.round(sc));
    env.sub = Math.max(0, Math.min(1, (y + vh * 0.5 - tops[k]) / Math.max(1, heights[k])));

    // the roadmap step nearest the middle of the screen
    var best = 0, bd = 1e9;
    stepEls.forEach(function (li, i) {
      var r = li.getBoundingClientRect(), d = Math.abs(r.top + r.height / 2 - vh * 0.5);
      if (d < bd) { bd = d; best = i; }
    });
    stepEls.forEach(function (li, i) { li.classList.toggle('on', i === best); });
    env.step = best;
    // and the persona: the hovered one, or the one in view
    var bp = 0; bd = 1e9;
    personaEls.forEach(function (p, i) {
      var r = p.getBoundingClientRect(), d = Math.abs(r.top + r.height / 2 - vh * 0.5);
      if (d < bd) { bd = d; bp = i; }
    });
    env.persona = hoverPersona >= 0 ? hoverPersona : bp;
    personaEls.forEach(function (p, i) { p.classList.toggle('on', i === env.persona && env.scene > 3.5 && env.scene < 4.5); });

    var hr = heroFig.getBoundingClientRect();
    env.heroRect = { x: hr.left, y: hr.top, w: hr.width, h: hr.height };
    // the picture gives way to the scene as soon as the next chapter starts to take over
    env.heroVis = 1 - Math.max(0, Math.min(1, (sc - 0.02) / 0.16));
    heroImg.style.opacity = env.heroVis;

    var max = document.documentElement.scrollHeight - vh;
    progress.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
    nav.classList.toggle('solid', y > vh * 0.6);
    railLinks.forEach(function (a, i) { a.classList.toggle('on', i === k - 1); });

    var m = env.mouse, kk = Math.min(1, env.dt / 16.7);
    if (tx < -9000) m.on += (0 - m.on) * 0.08 * kk;
    else {
      if (m.x < -9000) { m.x = tx; m.y = ty; }
      var nx = m.x + (tx - m.x) * 0.3 * kk, ny = m.y + (ty - m.y) * 0.3 * kk;
      m.vx = nx - m.x; m.vy = ny - m.y; m.x = nx; m.y = ny;
      m.on += ((now - lastMove < 1200 ? 1 : 0.3) - m.on) * 0.08 * kk;
    }
  }

  // ——— arriving from the home page: the cover lands in its place ———
  function land() {
    var from = null;
    try { from = sessionStorage.getItem('land'); sessionStorage.removeItem('land'); } catch (e) {}
    if (!from || reduce) return;
    var r = heroFig.getBoundingClientRect();
    var ov = document.createElement('img');
    ov.src = heroImg.src; ov.alt = '';
    ov.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;object-fit:cover;z-index:60;border-radius:0;pointer-events:none';
    document.body.appendChild(ov);
    heroImg.style.visibility = 'hidden';
    ov.animate([
      { left: '0px', top: '0px', width: innerWidth + 'px', height: innerHeight + 'px', borderRadius: '0px' },
      { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', borderRadius: '18px' }
    ], { duration: 1100, easing: 'cubic-bezier(.7,0,.2,1)', fill: 'forwards', delay: 150 }).onfinish = function () {
      heroImg.style.visibility = ''; ov.remove();
    };
  }

  // ——— run ———
  var R = (window.CaseRenderers || {})[style];
  var canvas = document.getElementById('gl');
  var t0 = performance.now(), prev = t0, running = false;
  function frame(raf) {
    if (lenis) lenis.raf(raf);
    var now = performance.now();
    env.dt = Math.min(50, now - prev); prev = now; env.t = (now - t0) / 1000;
    update(now);
    if (running) R.frame(env);
    requestAnimationFrame(frame);
  }
  measure();
  if (location.hash) { var target = document.querySelector(location.hash); if (target) setTimeout(function () { if (lenis) lenis.scrollTo(target, { immediate: true, offset: -20 }); else target.scrollIntoView(); measure(); }, 60); }
  land();
  requestAnimationFrame(frame);
  if (R) {
    var ok = false;
    try { ok = R.init(canvas, env); } catch (e) { console.error(e); }
    if (ok) Promise.resolve(R.load()).then(function () {
      R.build(env); running = true;
      var to, lw = innerWidth, lh = innerHeight;
      addEventListener('resize', function () {
        if (innerWidth < 50 || innerHeight < 50) return;
        if (innerWidth === lw && Math.abs(innerHeight - lh) < 120) return;
        lw = innerWidth; lh = innerHeight;
        clearTimeout(to);
        to = setTimeout(function () { env.W = innerWidth; env.H = innerHeight; env.mobile = innerWidth < 860; measure(); R.build(env); }, 200);
      });
    }).catch(function (e) { console.error(e); });
  }
  window.__case = { env: env, lenis: lenis, measure: measure };
})();
