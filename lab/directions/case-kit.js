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
  // back to the home page the case was opened from
  var from = params.get('from');
  document.getElementById('home').href = from === 'matter' ? 'matter.html' : from === 'depth' ? 'depth.html' : './';
  // the style pill compares the sandbox's two looks; opened from Dive the case simply is what it is
  if (from !== 'matter' && from !== 'depth') document.querySelector('.nav .style').style.display = 'none';
  var sM = document.getElementById('sMatter'), sD = document.getElementById('sDepth');
  (style === 'depth' ? sD : sM).setAttribute('aria-current', 'page');
  // switching style keeps your place: it lands on the same chapter
  [sM, sD].forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var cur = sections[Math.min(sections.length - 1, Math.round(env.scene))];
      location.href = a.getAttribute('href') + (from ? '&from=' + from : '') + (cur && cur.id && cur.id !== 'top' ? '#' + cur.id : '');
    });
  });

  // a phone keeps its own scroll: iOS momentum is smoother than anything layered on top of it
  var touch = window.Perf && Perf.touch;
  var lenis = window.Lenis && !reduce && !touch ? new Lenis({ lerp: 0.16 }) : null;
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
  // A journey map is a table: stages across, lanes down. The emotion lane is one cell across every
  // stage, so its curve can run from stage to stage, a point under each one.
  var CASE = window.CASE || {};
  function esc(v) { return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function cell(v) { return Array.isArray(v) ? '<ul>' + v.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : esc(v); }
  // emotion, 1 (worst) to 4 (best): its height in the lane, and its colour
  var LEVEL = { 1: [76, '#E5484D'], 2: [57, '#F2A07B'], 3: [36, '#C9CED8'], 4: [14, '#8FE3AE'] };
  function f2(v) { return v.toFixed(2); }
  // through every point, smoothly (Catmull-Rom as cubic Béziers), held inside the lane (0…h)
  function smooth(p, h) {
    var d = 'M' + f2(p[0][0]) + ' ' + f2(p[0][1]);
    for (var i = 0; i < p.length - 1; i++) {
      var a = p[i - 1] || p[i], b = p[i], c = p[i + 1], e = p[i + 2] || c;
      var c1y = Math.max(h * 0.04, Math.min(h * 0.96, b[1] + (c[1] - a[1]) / 6)), c2y = Math.max(h * 0.04, Math.min(h * 0.96, c[1] - (e[1] - b[1]) / 6));
      d += ' C' + f2(b[0] + (c[0] - a[0]) / 6) + ' ' + f2(c1y) + ' ' + f2(c[0] - (e[0] - b[0]) / 6) + ' ' + f2(c2y) + ' ' + f2(c[0]) + ' ' + f2(c[1]);
    }
    return d;
  }
  var jmEl = document.getElementById('journeys');
  if (jmEl && CASE.journeys) jmEl.innerHTML = CASE.journeys.map(function (g, gi) {
    var st = g[2], n = st.length, id = 'j' + (gi + 1);
    function row(cls, name, k) {
      return '<tr class="' + cls + '"><th scope="row" class="lane"><span>' + name + '</span></th>' +
        st.map(function (s, c) { return '<td data-c="' + c + '">' + cell(s[k]) + '</td>'; }).join('') + '</tr>';
    }
    // the curve is drawn in the lane's own pixels (jmLayout), so it never stretches and its colour runs true
    var plot = '<div class="jm-plot" data-lv="' + st.map(function (s) { return s[3]; }).join('') + '"><span class="jm-band"></span>' +
      '<svg aria-hidden="true"><defs><linearGradient id="jmg' + gi + '" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="100">' +
      '<stop offset=".14" stop-color="#8FE3AE"/><stop offset=".4" stop-color="#E9ECF2"/><stop offset=".76" stop-color="#E5484D"/></linearGradient></defs>' +
      '<line stroke="rgba(233,236,242,.14)" stroke-dasharray="2 5"/>' +
      '<path fill="none" stroke="url(#jmg' + gi + ')" stroke-width="2" stroke-linecap="round"/></svg>' +
      st.map(function (s, c) {
        return '<span class="jm-pt" data-c="' + c + '" style="left:' + f2(c / n * 100) + '%;top:' + LEVEL[s[3]][0] + '%;--c:' + LEVEL[s[3]][1] + ';--d:' + (0.35 + c * 0.16).toFixed(2) + 's"><i></i><em>' + esc(s[4]) + '</em></span>';
      }).join('') + '</div>';
    return '<div class="jm-panel" role="tabpanel" id="' + id + '" aria-labelledby="t-' + id + '"' + (gi ? ' hidden' : '') + '>' +
      '<p class="jm-goal"><span class="eyebrow">' + esc(g[0]) + '</span>' + esc(g[1]) + '</p>' +
      '<div class="jm-sheet" tabindex="0" role="group" data-hxs="thead th" aria-label="' + esc(g[0]) + ' journey map, ' + n + ' stages — scrollable">' +
      '<table class="jm" style="--n:' + n + '"><caption class="sr-only">' + esc(g[0]) + ' — current journey, ' + n + ' stages.</caption>' +
      '<colgroup><col class="lc"><col span="' + n + '"></colgroup>' +
      '<thead><tr><td class="lane"><span>Stage</span></td>' + st.map(function (s, c) { return '<th scope="col" data-c="' + c + '"><b>0' + (c + 1) + '</b>' + esc(s[0]) + '</th>'; }).join('') + '</tr></thead>' +
      '<tbody>' + row('act', 'Actions', 1) + row('think', 'Thinking', 2) +
      '<tr class="emo"><th scope="row" class="lane"><span>Emotion</span></th><td colspan="' + n + '">' + plot + '</td></tr>' +
      row('pain', 'Pain point', 5) + row('opp', 'Opportunity', 6) + '</tbody></table></div></div>';
  }).join('');
  function jmLayout() {
    [].forEach.call(document.querySelectorAll('.jm-plot'), function (plot) {
      var w = plot.offsetWidth, h = plot.offsetHeight;
      if (!w || plot._w === w && plot._h === h) return;
      plot._w = w; plot._h = h;
      var lv = plot.dataset.lv.split(''), n = lv.length;
      var pts = lv.map(function (l, c) { return [(c + 0.5) / n * w, LEVEL[l][0] / 100 * h]; });
      var svg = plot.querySelector('svg'), g = svg.querySelector('linearGradient'), mid = svg.querySelector('line');
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
      g.setAttribute('y2', h);
      mid.setAttribute('x1', 0); mid.setAttribute('x2', w); mid.setAttribute('y1', h * 0.36); mid.setAttribute('y2', h * 0.36);
      svg.querySelector('path').setAttribute('d', smooth([[0, pts[0][1]]].concat(pts, [[w, pts[n - 1][1]]]), h));
    });
  }
  // one stage at a time is lit: under the pointer, or (on a phone) the one swiped into view
  var jmPanels = [].slice.call(document.querySelectorAll('.jm-panel'));
  jmPanels.forEach(function (panel) {
    var n = panel.querySelectorAll('thead th').length, cells = [].slice.call(panel.querySelectorAll('[data-c]'));
    var band = panel.querySelector('.jm-band'), plot = panel.querySelector('.jm-plot'), on = -1;
    panel.light = function (c) {
      if (c === on) return; on = c;
      cells.forEach(function (el) { el.classList.toggle('on', +el.dataset.c === c); });
      band.classList.toggle('on', c >= 0);
      if (c >= 0) band.style.left = (c / n * 100) + '%';
    };
    var sheet = panel.querySelector('.jm-sheet');
    sheet.addEventListener('pointerover', function (e) {
      if (e.pointerType !== 'mouse') return;
      var el = e.target.closest('[data-c]'); if (el) panel.light(+el.dataset.c);
    });
    plot.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var r = plot.getBoundingClientRect(); panel.light(Math.max(0, Math.min(n - 1, Math.floor((e.clientX - r.left) / r.width * n))));
    });
    sheet.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') panel.light(-1); });
  });
  // the curve draws itself the first time its map is seen (and again for each map a tab brings up)
  var drawIO = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('drawn'); drawIO.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -15% 0px' });
  jmPanels.forEach(function (p) { drawIO.observe(p.querySelector('.jm-plot').parentNode); });

  // ——— the final screens: all five on the page, any one full size ———
  var gal = document.getElementById('gallery');
  var shots = gal ? [].slice.call(gal.querySelectorAll('.shot')) : [];
  var galTheme = 'dark';
  function setPressed(group, t) { [].forEach.call(group.querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', b.dataset.t === t); }); }
  function shotSrc(i, t) { return shots[i].querySelector('img.' + (t === 'light' ? 'l' : 'd')).getAttribute('src'); }
  if (gal) {
    gal.querySelector('.theme').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      galTheme = b.dataset.t; gal.classList.toggle('light', galTheme === 'light'); setPressed(this, galTheme);
      // both themes are on the page, so the lit one must be there before it shows
      shots.forEach(function (s) { var im = s.querySelector('img.' + (galTheme === 'light' ? 'l' : 'd')); im.loading = 'eager'; });
    });
    gal.addEventListener('click', function (e) { var b = e.target.closest('.shot-f'); if (b) openShot(+b.dataset.i, b); });
  }
  // the full-size view grows out of the picture that was clicked and goes back into it
  var lb = null, lbI = 0, lbFrom = null;
  function lbBuild() {
    lb = document.createElement('div');
    lb.className = 'lb'; lb.hidden = true;
    lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Screen, full size');
    lb.innerHTML = '<div class="lb-top"><span class="lb-n"></span><div class="lb-r">' +
      '<div class="theme" role="group" aria-label="Theme"><button type="button" data-t="light">Light</button><button type="button" data-t="dark">Dark</button></div>' +
      '<button type="button" class="lb-b lb-x" aria-label="Close">✕</button></div></div>' +
      '<div class="lb-stage"><img class="lb-img" alt=""></div>' +
      '<div class="lb-bot"><p class="lb-cap"></p><div class="lb-nav"><button type="button" class="lb-b" data-d="-1" aria-label="Previous screen">←</button><button type="button" class="lb-b" data-d="1" aria-label="Next screen">→</button></div></div>';
    document.body.appendChild(lb);
    lb.querySelector('.lb-x').addEventListener('click', closeShot);
    lb.querySelector('.lb-nav').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) stepShot(+b.dataset.d); });
    lb.querySelector('.theme').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      // the page's screens follow, so closing lands on the same look
      gal.querySelector('.theme [data-t="' + b.dataset.t + '"]').click(); lbShow();
    });
    lb.querySelector('.lb-stage').addEventListener('click', function (e) { if (e.target === this) closeShot(); });
    lb.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeShot();
      else if (e.key === 'ArrowRight') stepShot(1);
      else if (e.key === 'ArrowLeft') stepShot(-1);
      else if (e.key === 'Tab') {
        // focus stays inside while it is open
        var f = [].slice.call(lb.querySelectorAll('button')), k = f.indexOf(document.activeElement);
        e.preventDefault(); f[(k + (e.shiftKey ? f.length - 1 : 1)) % f.length].focus();
      }
    });
  }
  function lbShow() {
    var cap = shots[lbI].querySelector('figcaption');
    lb.querySelector('.lb-img').src = shotSrc(lbI, galTheme);
    lb.querySelector('.lb-img').alt = shots[lbI].querySelector('b').textContent + ' screen, ' + galTheme + ' theme';
    lb.querySelector('.lb-cap').innerHTML = cap.innerHTML.replace(/<span>\d+<\/span>/, '');
    lb.querySelector('.lb-n').textContent = pad(lbI + 1) + ' / ' + pad(shots.length);
    setPressed(lb.querySelector('.theme'), galTheme);
    lb.querySelector('.lb-stage').scrollLeft = 0;
  }
  function rectOf(el) { var r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }
  // a picture moved and scaled from one box onto another, as a transform on the full-size picture
  function flip(img, from, to, back, done) {
    var dx = from.x + from.w / 2 - (to.x + to.w / 2), dy = from.y + from.h / 2 - (to.y + to.h / 2), s = from.w / to.w;
    var a = 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ')', b = 'none';
    if (reduce || !img.animate) { if (done) done(); return; }
    var an = img.animate([{ transform: back ? b : a }, { transform: back ? a : b }], { duration: back ? 420 : 560, easing: 'cubic-bezier(.3,0,.12,1)', fill: 'both' });
    an.onfinish = function () { if (done) done(); else an.cancel(); };
  }
  function openShot(i, from) {
    if (!lb) lbBuild();
    lbI = i; lbFrom = from; lbShow();
    lb.hidden = false;
    root.style.overflow = 'hidden'; if (lenis) lenis.stop();
    var img = lb.querySelector('.lb-img');
    requestAnimationFrame(function () {
      lb.classList.add('open');
      // on a phone the full-size picture is wider than the screen and starts at its left edge
      if (!env.mobile && img.complete) flip(img, rectOf(from), rectOf(img));
      lb.querySelector('.lb-x').focus();
    });
  }
  function stepShot(d) { lbI = (lbI + d + shots.length) % shots.length; lbFrom = shots[lbI].querySelector('.shot-f'); lbShow(); }
  function closeShot() {
    var img = lb.querySelector('.lb-img'), to = lbFrom;
    function gone() { lb.hidden = true; root.style.overflow = ''; if (lenis) lenis.start(); img.getAnimations && img.getAnimations().forEach(function (a) { a.cancel(); }); to.focus({ preventScroll: true }); }
    lb.classList.remove('open');
    var r = rectOf(to);
    if (!env.mobile && r.y > -r.h && r.y < innerHeight) flip(img, r, rectOf(img), true, gone); else setTimeout(gone, 350);
  }

  // ——— the token graph ———
  // three columns, a line from each token to the ones made of it; touch one and its whole chain lights
  var tgEl = document.getElementById('tg'), T = CASE.tokens, tgTheme = 'light';
  var tgOf = {}, tgLinks = [], tgPin = null;
  if (tgEl && T) {
    var semOf = {};
    T.edges.forEach(function (e) { if (e[1].indexOf('comp-') === 0) semOf[e[1]] = e[0]; });
    var col = function (title, count, items) {
      return '<div class="tg-col"><h4>' + title + '<span>' + count + '</span></h4><ul>' + items.map(function (t) {
        return '<li><button type="button" class="tk" data-id="' + t[0] + '"><i></i><b>' + esc(t[1]) + '</b><em></em></button></li>';
      }).join('') + '</ul></div>';
    };
    tgEl.innerHTML = '<svg class="tg-lines" aria-hidden="true"></svg>' + col('Primitives', '~158', T.prim) + col('Semantic', '~45', T.sem) + col('Component', '~459', T.comp);
    [].forEach.call(tgEl.querySelectorAll('.tk'), function (b) { tgOf[b.dataset.id] = b; });
    var svgNS = 'http://www.w3.org/2000/svg', lines = tgEl.querySelector('.tg-lines');
    tgLinks = T.edges.map(function (e) {
      var p = document.createElementNS(svgNS, 'path');
      p.setAttribute('pathLength', '1');
      if (e[1].indexOf('comp-') === 0) p.setAttribute('class', 't2');
      lines.appendChild(p);
      return { a: e[0], b: e[1], el: p };
    });
    var hint = tgEl.parentNode.previousElementSibling.querySelector('.eyebrow');
    if (hint) hint.textContent = (touch ? 'Tap' : 'Hover') + ' a token to follow its chain';
  }
  function tgValue(id) {
    for (var k = 0; k < T.prim.length; k++) if (T.prim[k][0] === id) return T.prim[k][2];
    for (k = 0; k < T.sem.length; k++) if (T.sem[k][0] === id) return T.sem[k][tgTheme === 'light' ? 2 : 3];
    return tgValue(semOf[id]);
  }
  function tgPaint() {
    Object.keys(tgOf).forEach(function (id) {
      var v = tgValue(id), b = tgOf[id];
      b.querySelector('i').style.background = v;
      if (id.indexOf('comp-') !== 0) b.querySelector('em').textContent = v;
    });
    // in the dark theme a semantic token takes another primitive: the light one lets go of it
    tgLinks.forEach(function (l) { l.el.classList.toggle('off', l.a.indexOf('prim-') === 0 && tgValue(l.a) !== tgValue(l.b)); });
  }
  function tgLayout() {
    if (!tgEl || !T) return;
    var svg = tgEl.querySelector('.tg-lines'), w = tgEl.scrollWidth, h = tgEl.offsetHeight;
    svg.setAttribute('width', w); svg.setAttribute('height', h); svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    tgLinks.forEach(function (l) {
      var a = tgOf[l.a], b = tgOf[l.b];
      var x1 = a.offsetLeft + a.offsetWidth, y1 = a.offsetTop + a.offsetHeight / 2, x2 = b.offsetLeft, y2 = b.offsetTop + b.offsetHeight / 2, m = (x2 - x1) / 2;
      l.el.setAttribute('d', 'M' + x1 + ' ' + y1 + ' C' + (x1 + m) + ' ' + y1 + ' ' + (x2 - m) + ' ' + y2 + ' ' + x2 + ' ' + y2);
    });
  }
  function tgLight(id) {
    if (!tgEl) return;
    var seen = {};
    if (id) {
      // everything joined to it, both ways
      var q = [id]; seen[id] = 1;
      while (q.length) {
        var n = q.shift();
        tgLinks.forEach(function (l) {
          // a link the theme has let go of joins nothing
          var o = l.el.classList.contains('off') ? null : l.a === n ? l.b : l.b === n ? l.a : null;
          if (o && !seen[o]) { seen[o] = 1; q.push(o); }
        });
      }
    }
    tgEl.classList.toggle('hl', !!id);
    Object.keys(tgOf).forEach(function (k) { tgOf[k].classList.toggle('on', !!seen[k]); tgOf[k].classList.toggle('me', k === id); });
    tgLinks.forEach(function (l) { l.el.classList.toggle('on', !!(seen[l.a] && seen[l.b])); });
  }
  if (tgEl && T) {
    tgPaint();
    tgEl.addEventListener('pointerover', function (e) { var b = e.target.closest('.tk'); if (b && e.pointerType === 'mouse' && !tgPin) tgLight(b.dataset.id); });
    tgEl.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse' && !tgPin) tgLight(null); });
    tgEl.addEventListener('focusin', function (e) { var b = e.target.closest('.tk'); if (b && !tgPin) tgLight(b.dataset.id); });
    tgEl.addEventListener('focusout', function () { if (!tgPin) tgLight(null); });
    // a tap (or a click) holds the chain until the next one
    tgEl.addEventListener('click', function (e) {
      var b = e.target.closest('.tk'); if (!b) return;
      tgPin = tgPin === b.dataset.id ? null : b.dataset.id; tgLight(tgPin || (touch ? null : b.dataset.id));
    });
    document.addEventListener('pointerdown', function (e) { if (tgPin && !e.target.closest('#tg')) { tgPin = null; tgLight(null); } });
    document.getElementById('tgTheme').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      tgTheme = b.dataset.t; setPressed(this, tgTheme); tgPaint(); tgLight(tgPin);
    });
    var tgIO = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { tgLayout(); tgEl.classList.add('in'); tgIO.disconnect(); } }, { rootMargin: '0px 0px -20% 0px' });
    tgIO.observe(tgEl);
    if (document.fonts) document.fonts.ready.then(tgLayout);
  }

  // ——— the iteration loop comes round while it is on screen ———
  var cyc = document.getElementById('cyc');
  if (cyc && !reduce) {
    var cycI = 0, cycOn = false, cycLis = [].slice.call(cyc.children);
    new IntersectionObserver(function (es) { cycOn = es[0].isIntersecting; }).observe(cyc);
    setInterval(function () {
      if (!cycOn) return;
      cycLis.forEach(function (li, k) { li.classList.toggle('on', k === cycI); });
      cycI = (cycI + 1) % cycLis.length;
    }, 1500);
  }

  // ——— scene bookkeeping ———
  var tops = [], heights = [], stepEls = [].slice.call(document.querySelectorAll('#steps li'));
  var personaEls = [].slice.call(document.querySelectorAll('.persona')), hoverPersona = -1;
  personaEls.forEach(function (p, i) {
    p.addEventListener('mouseenter', function () { hoverPersona = i; });
    p.addEventListener('mouseleave', function () { hoverPersona = -1; });
  });
  // Everything the frame needs from the layout is read here, on resize and when
  // content changes — never per frame. A read after the frame's style writes
  // forces a reflow, and on a phone that is the stutter.
  var stepY = [], personaY = [], heroAbs = { x: 0, y: 0, w: 1, h: 1 }, maxS = 1;

  // ——— on a phone the long lists run sideways (.hx): a counter, a track, and a nudge until first swiped ———
  // A wide sheet that scrolls sideways ([data-hxs]) counts the parts its attribute names instead of its children.
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function railItems(el) { return el.dataset.hxs ? el.querySelectorAll(el.dataset.hxs) : el.children; }
  var rails = [].slice.call(document.querySelectorAll('.hx, [data-hxs]')).map(function (el) {
    var bar = document.createElement('div');
    bar.className = 'hx-bar'; bar.setAttribute('aria-hidden', 'true');
    bar.innerHTML = '<span class="hx-n"></span><i><b></b></i><span class="hx-go">swipe</span>';
    el.parentNode.insertBefore(bar, el.nextSibling);
    var r = { el: el, bar: bar, n: railItems(el).length, idx: -1, on: false, step: 1, max: 1, num: bar.querySelector('.hx-n'), thumb: bar.querySelector('b') };
    r.thumb.style.width = (100 / r.n) + '%';
    el.addEventListener('scroll', function () { railUpdate(r); if (r.el.scrollLeft > 8) bar.classList.add('used'); }, { passive: true });
    // the bar itself steps to the next card, and wraps to the first after the last
    bar.addEventListener('click', function () { el.scrollTo({ left: r.idx >= r.n - 1 ? 0 : (r.idx + 1) * r.step, behavior: 'smooth' }); });
    return r;
  });
  function railMeasure() {
    rails.forEach(function (r) {
      var was = r.on;
      r.on = r.el.scrollWidth > r.el.clientWidth + 2;
      // a rail that has just come up (a tab shown) tells its listener where it stands
      if (was !== r.on) r.idx = -1;
      var it = railItems(r.el);
      r.step = r.on && it[1] ? it[1].offsetLeft - it[0].offsetLeft : 1;
      r.max = Math.max(1, r.el.scrollWidth - r.el.clientWidth);
      railUpdate(r);
    });
  }
  function railUpdate(r) {
    var x = r.el.scrollLeft, i = !r.on ? 0 : x >= r.max - 2 ? r.n - 1 : Math.min(r.n - 1, Math.round(x / r.step));
    put(r.thumb, 'transform', 'translateX(' + (Math.min(1, x / r.max) * (r.n - 1) * 100).toFixed(1) + '%)');
    if (i !== r.idx) { r.idx = i; r.num.textContent = pad(i + 1) + ' / ' + pad(r.n); if (r.onIdx) r.onIdx(i); }
  }
  // a journey map, swiped: the stage in view is the lit one
  rails.forEach(function (r) {
    var panel = r.el.classList.contains('jm-sheet') && r.el.parentNode;
    if (panel) r.onIdx = function (i) { if (r.on) panel.light(i); };
  });
  function railOf(el) { for (var k = 0; k < rails.length; k++) if (rails[k].el === el) return rails[k]; return null; }
  var stepRail = railOf(document.getElementById('steps')), personaRail = railOf(document.getElementById('personas'));
  var stepOn = -1;
  function centre(el, y) { var r = el.getBoundingClientRect(); return r.top + y + r.height / 2; }
  function measure() {
    var y = scrollY;
    tops = sections.map(function (s) { return s.getBoundingClientRect().top + y; });
    heights = sections.map(function (s) { return s.offsetHeight; });
    stepY = stepEls.map(function (el) { return centre(el, y); });
    personaY = personaEls.map(function (el) { return centre(el, y); });
    var hr = heroFig.getBoundingClientRect();
    heroAbs = { x: hr.left, y: hr.top + y, w: hr.width, h: hr.height };
    maxS = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    railMeasure();
    tgLayout();
    jmLayout();
  }
  function put(el, k, v) { var c = el._s || (el._s = {}); if (c[k] !== v) { c[k] = v; el.style[k] = v; } }
  new ResizeObserver(function () { measure(); }).observe(document.querySelector('main'));

  var env = {
    W: innerWidth, H: (window.Perf ? Perf.vh() : innerHeight), dpr: window.Perf ? Perf.dpr : Math.min(window.devicePixelRatio || 1, 2), mobile: innerWidth < 860, reduce: reduce,
    t: 0, dt: 16, scene: 0, sub: 0, step: 0, persona: 0, heroRect: { x: 0, y: 0, w: 1, h: 1 }, heroVis: 1,
    mouse: { x: -9999, y: -9999, on: 0 }
  };
  var tx = -9999, ty = -9999, lastMove = 0;
  addEventListener('pointermove', function (e) { tx = e.clientX; ty = e.clientY; lastMove = performance.now(); });
  document.addEventListener('pointerleave', function () { tx = ty = -9999; });
  addEventListener('pointerup', function (e) { if (e.pointerType !== 'mouse') tx = ty = -9999; });
  addEventListener('pointercancel', function () { tx = ty = -9999; });

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

    // the roadmap step nearest the middle of the screen, from cached positions
    var mid = y + vh * 0.5, best = 0, bd = 1e9;
    stepY.forEach(function (c, i) { var d = Math.abs(c - mid); if (d < bd) { bd = d; best = i; } });
    // sideways, the card in view is the step
    if (stepRail && stepRail.on) best = stepRail.idx;
    if (best !== stepOn) { stepEls.forEach(function (li, i) { li.classList.toggle('on', i === best); }); stepOn = best; }
    env.step = best;
    // and the persona: the hovered one, or the one in view
    var bp = 0; bd = 1e9;
    personaY.forEach(function (c, i) { var d = Math.abs(c - mid); if (d < bd) { bd = d; bp = i; } });
    if (personaRail && personaRail.on) bp = personaRail.idx;
    var pOn = hoverPersona >= 0 ? hoverPersona : bp, inRes = env.scene > 3.5 && env.scene < 4.5;
    if (pOn !== env.persona || inRes !== env.inRes) personaEls.forEach(function (p, i) { p.classList.toggle('on', i === pOn && inRes); });
    env.persona = pOn; env.inRes = inRes;

    env.heroRect = { x: heroAbs.x, y: heroAbs.y - y, w: heroAbs.w, h: heroAbs.h };
    // the picture scrolls away with the page and fades as it leaves the top (the figure whole, its dark
    // ground too); in the Matter look on a wide screen it gives way to the scene, which takes it apart
    env.heroVis = env.mobile || style === 'depth'
      ? Math.max(0, Math.min(1, (heroAbs.y - y + heroAbs.h * 0.5) / (vh * 0.3)))
      : 1 - Math.max(0, Math.min(1, (sc - 0.02) / 0.16));
    put(style === 'depth' ? heroFig : heroImg, 'opacity', env.heroVis.toFixed(3));

    put(progress, 'transform', 'scaleX(' + (y / maxS).toFixed(4) + ')');
    var solid = y > 24;
    if (solid !== env.solid) { nav.classList.toggle('solid', solid); env.solid = solid; }
    if (k !== env.k) { railLinks.forEach(function (a, i) { a.classList.toggle('on', i === k - 1); }); env.k = k; }

    var m = env.mouse, kk = Math.min(1, env.dt / 16.7);
    if (tx < -9000) m.on += (0 - m.on) * 0.08 * kk;
    else {
      if (m.x < -9000 || m.on < 0.05) { m.x = tx; m.y = ty; }
      m.x += (tx - m.x) * 0.3 * kk; m.y += (ty - m.y) * 0.3 * kk;
      m.on += ((now - lastMove < 1200 ? 1 : 0.3) - m.on) * 0.08 * kk;
    }
  }

  // (arriving from the home page, the cover lands in the hero's place: handoff.js, called from the page itself)

  // ——— run ———
  var R = (window.CaseRenderers || {})[style];
  var canvas = document.getElementById('gl');
  var t0 = performance.now(), prev = t0, running = false;
  function frame(raf) {
    if (lenis) lenis.raf(raf);
    var now = performance.now();
    if (window.Perf) Perf.frame(now - prev);
    env.dt = Math.min(50, now - prev); prev = now; env.t = (now - t0) / 1000;
    update(now);
    if (running) R.frame(env);
    requestAnimationFrame(frame);
  }
  measure();
  if (location.hash) { var target = document.querySelector(location.hash); if (target) setTimeout(function () { if (lenis) lenis.scrollTo(target, { immediate: true, offset: -20 }); else target.scrollIntoView(); measure(); }, 60); }
  requestAnimationFrame(frame);
  if (R && window.Perf) Perf.onChange = function (d) { env.dpr = d; if (running) { if (R.setDpr) R.setDpr(env); else R.build(env); } };
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
        to = setTimeout(function () { env.W = innerWidth; env.H = (window.Perf ? Perf.vh() : innerHeight); env.mobile = innerWidth < 860; measure(); R.build(env); }, 200);
      });
    }).catch(function (e) { console.error(e); });
  }
  window.__case = { env: env, lenis: lenis, measure: measure };
  if (window.Perf) Perf.info = function () { return 'scene ' + env.scene.toFixed(2) + '  hero ' + env.heroVis.toFixed(2) + (env.solid ? '  nav' : ''); };
})();
