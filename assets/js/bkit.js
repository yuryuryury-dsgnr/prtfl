// The shell Dive (and the Depth sandbox) runs on: scroll mapped to stages (four
// by default), captions and the rail, keys, the pointer, hovering and opening a
// cover, loading and the frame loop. A page brings only its renderer:
//
//   BKit({ cases, keys?, stops?, last?, renderer: { init(env) -> bool, load(tick) -> Promise,
//          build(env), frame(env), setDpr?(env), coverAt(x, y) -> k | -1, workAt?(stage) -> bool,
//          free?(stage) -> bool, coverRect?(k), coverImage?(k) } })
//
// keys and stops may be changed in place by build() (a new screen size, a new track): the shell
// re-measures after every build and keeps the reader on the same stage.
//
// A caption names its stage (data-cap="1") or a run of them (data-cap="2-5").
//
// Everything the renderer is handed is in screen CSS px, origin top-left.
(function () {
  window.BKit = function (opt) {
    var R = opt.renderer, CASES = opt.cases;
    // plateaus are only as wide as reading needs; the settle does the rest
    var KEYS = opt.keys || [[0, 0], [0.04, 0], [0.27, 1], [0.33, 1], [0.57, 2], [0.69, 2], [0.94, 3], [1, 3]];
    var STOPS = opt.stops || [0, 0.30, 0.63, 1];
    var LAST = opt.last || 3;
    // where the covers can be hovered and opened: by default the one stage that shows them all
    function inWork() { return R.workAt ? R.workAt(env.stage) : Math.abs(env.stage - 2) < 0.15; }
    var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var root = document.documentElement;

    var env = {
      W: innerWidth, H: (window.Perf ? Perf.vh() : innerHeight), mobile: innerWidth < 760, reduce: reduce,
      dpr: window.Perf ? Perf.dpr : Math.min(window.devicePixelRatio || 1, 2),
      t: 0, dt: 16.7, s: 0, stage: 0,
      mouse: { p: 0, x: -9999, y: -9999, on: 0 },
      hover: -1, hov: [0, 0, 0, 0], any: 0,
      go: -1, g: 0, wave: { x: 0, y: 0, t: -10 },
      tags: null
    };

    var list = document.getElementById('fallbackList');
    if (list) list.innerHTML = CASES.map(function (c) {
      return '<li><a href="' + c.href + '"><b>' + c.name + '</b><span>' + c.line + '</span></a>' +
        (c.links || []).map(function (l) { return ' <a href="' + l[1] + '" target="_blank" rel="noopener">' + l[0] + ' ↗</a>'; }).join('') + '</li>';
    }).join('');

    var ok = false;
    try { ok = R.init(env); } catch (e) { console.error(e); }
    if (!ok) { root.classList.add('no-gl'); return; }
    // the plain list stays for screen readers; the keyboard reaches the cases through their labels
    if (list) [].forEach.call(list.querySelectorAll('a'), function (a) { a.tabIndex = -1; });

    // ——— case labels under the covers; the renderer says where ———
    var capWork = document.getElementById('capWork');
    // a case with a live project (c.links) gets those links beside "View case"; links can't nest,
    // so then the label is a box holding the case link and the project links
    var tags = CASES.map(function (c, k) {
      var inner = '<span><b><i>0' + (k + 1) + '</i><span class="long">' + c.name + '</span><span class="short">' + (c.short || c.name) +
        '</span></b><small>' + c.line + '</small></span><em>View case →</em>';
      var a, main;
      if (c.links) {
        a = document.createElement('div'); a.className = 'tag';
        a.innerHTML = '<a class="tag-main" href="' + c.href + '">' + inner + '</a><span class="tag-st">' +
          c.links.map(function (l) { return '<a href="' + l[1] + '" target="_blank" rel="noopener">' + (l[2] || '') + l[0] + ' ↗</a>'; }).join('') + '</span>';
        main = a.querySelector('.tag-main');
      } else {
        a = main = document.createElement('a');
        a.className = 'tag'; a.href = c.href; a.innerHTML = inner;
      }
      a.addEventListener('mouseenter', function () { env.hover = k; });
      a.addEventListener('mouseleave', function () { env.hover = -1; });
      a.addEventListener('focusin', function () { env.hover = k; reveal(k); });
      a.addEventListener('focusout', function () { env.hover = -1; });
      // a modified click (a new tab, a new window) is the browser's
      main.addEventListener('click', function (e) { if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return; e.preventDefault(); go(k); });
      capWork.appendChild(a);
      return a;
    });
    // each label is written only where it changed (style writes cost a recalculation)
    var workTitle = document.getElementById('workTitle');
    function placeTags() {
      if (!env.tags) return;
      for (var k = 0; k < env.tags.length; k++) {
        var r = env.tags[k], el = tags[k];
        // a label that isn't seen is only hidden, not moved: nothing to lay out
        if (r.o != null && r.o <= 0.01) { put(el, 'opacity', '0'); put(el, 'visibility', 'hidden'); put(el, 'pointerEvents', 'none'); continue; }
        put(el, 'transform', 'translate(' + r.x.toFixed(1) + 'px,' + r.y.toFixed(1) + 'px)');
        put(el, 'width', r.w.toFixed(1) + 'px');
        // under a small picture only the name fits
        var narrow = r.w < (env.mobile ? 220 : 420);
        if (el._narrow !== narrow) { el._narrow = narrow; el.classList.toggle('narrow', narrow); }
        if (r.o != null) {
          put(el, 'opacity', r.o.toFixed(3));
          put(el, 'visibility', r.o > 0.01 ? '' : 'hidden');
          put(el, 'pointerEvents', r.o > 0.6 ? '' : 'none');
        }
      }
      if (workTitle && env.tags[0]) put(workTitle, 'transform', 'translateY(' + (env.tags[0].top - (env.mobile ? 48 : 58)).toFixed(1) + 'px)');
    }

    // ——— scroll ———
    function stageAt(s) {
      for (var i = 1; i < KEYS.length; i++) if (s <= KEYS[i][0]) {
        var a = KEYS[i - 1], b = KEYS[i], f = (s - a[0]) / (b[0] - a[0] || 1);
        return a[1] + (b[1] - a[1]) * f;
      }
      return LAST;
    }
    // read once and on resize: a layout read after the frame's style writes forces a reflow.
    // On a phone the range is taken against the tallest viewport, so the toolbar sliding in or out
    // doesn't rescale it (and move a page-like stretch under the finger)
    var maxS;
    function measureScroll() {
      maxS = Math.max(1, document.documentElement.scrollHeight - (touch && window.Perf ? Perf.vh() : innerHeight));
    }
    // a phone keeps its own scroll; a wheel gets Lenis once it has loaded
    var touch = window.Perf && Perf.touch;
    var lenis = null;
    measureScroll();
    addEventListener('resize', measureScroll);
    function maxScroll() { return maxS; }
    // the scroll position that shows a given stage
    function yAt(st) {
      for (var i = 1; i < KEYS.length; i++) if (st <= KEYS[i][1] && KEYS[i][1] > KEYS[i - 1][1]) {
        var a = KEYS[i - 1], b = KEYS[i]; return (a[0] + (b[0] - a[0]) * (st - a[1]) / (b[1] - a[1])) * maxScroll();
      }
      return maxScroll();
    }
    // a handle for the test scripts (any moment of the flight, from the console)
    window.__bkit = { env: env, lenis: null, yAt: yAt };
    if (window.Perf) Perf.smooth({ lerp: 0.18 }, function (l) { lenis = window.__bkit.lenis = l; });
    function scrollPos() { return lenis ? lenis.animatedScroll : scrollY; }
    if (window.Perf) Perf.info = function () { return 'stage ' + env.stage.toFixed(2) + '  y ' + Math.round(scrollPos()); };
    function scrollToY(y, dur) {
      if (lenis) lenis.scrollTo(y, { duration: dur || 1.2, easing: function (x) { return 1 - Math.pow(1 - x, 3); } });
      else scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
    }
    function scrollToStage(k, dur) { scrollToY(STOPS[k] * maxScroll(), dur); }
    // a label reached with Tab: its case is brought into view (the work, and in a page-like stretch the case itself)
    function reveal(k) {
      if (!inWork()) { scrollToStage(2); return; }
      var r = env.tags && env.tags[k], H = innerHeight;
      if (R.free && r && (r.top < H * 0.15 || r.y > H * 0.9)) scrollToY(Math.max(0, Math.min(maxScroll(), scrollPos() + r.top - H * 0.22)), 0.8);
    }
    document.querySelectorAll('[data-stage]').forEach(function (el) {
      el.addEventListener('click', function (e) { e.preventDefault(); scrollToStage(+el.dataset.stage); });
    });
    // never leave the reader mid-morph: once scrolling stops, settle on the nearest shape
    // (under a wheel only: a phone is left where the thumb put it — see Perf.whenStill)
    function settleNow() {
      var p = stageAt(scrollPos() / maxScroll());
      // a stretch the renderer scrolls like a page is left where it is
      if (R.free && R.free(p)) return;
      if (Math.abs(p - Math.round(p)) < 0.02) return;
      scrollToStage(Math.round(p), 0.7);
    }
    var settle, scheduleSettle = window.Perf ? Perf.whenStill(settleNow) : function () { clearTimeout(settle); settle = setTimeout(settleNow, 380); };
    // Lenis moves the window, so the window's own scroll event covers both
    var lastScroll = -1e9;
    addEventListener('scroll', function () { lastScroll = performance.now(); scheduleSettle(); }, { passive: true });
    addEventListener('keydown', function (e) {
      if (e.target.closest('input, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
      // Space on a focused button or link presses it, as anywhere else
      if (e.key === ' ' && e.target.closest('a, button')) return;
      var p = stageAt(scrollPos() / maxScroll()), cur = Math.round(p);
      var down = e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ' && !e.shiftKey;
      var up = e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === ' ' && e.shiftKey;
      // a stretch scrolled like a page is read like one: a key moves it most of a screen
      if ((down || up) && R.free && R.free(p)) {
        var y = scrollPos() + (down ? 1 : -1) * innerHeight * 0.8;
        if (down || R.free(stageAt(y / maxScroll()))) { e.preventDefault(); scrollToY(Math.max(0, Math.min(maxScroll(), y)), 0.8); return; }
      }
      if (down) { e.preventDefault(); scrollToStage(Math.min(LAST, cur + 1)); }
      if (up) { e.preventDefault(); scrollToStage(Math.max(0, cur - 1)); }
      if (e.key === 'Home') { e.preventDefault(); scrollToStage(0); }
      if (e.key === 'End') { e.preventDefault(); scrollToStage(LAST); }
    });

    // ——— pointer ———
    var tx = -9999, ty = -9999, lastMove = 0;
    var ring = document.getElementById('ring'), rx = 0, ry = 0, mouseSeen = false;
    addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY; lastMove = performance.now();
      if (e.pointerType === 'mouse') mouseSeen = true;
      if (ring && e.pointerType === 'mouse' && env.go < 0) ring.style.opacity = 1;
      var onCover = inWork() && !e.target.closest('.tag') ? R.coverAt(e.clientX, e.clientY) : -1;
      if (!e.target.closest('.tag')) env.hover = onCover;
      if (ring) ring.classList.toggle('big', onCover >= 0);
      document.body.style.cursor = onCover >= 0 ? 'pointer' : '';
    });
    function away() { tx = ty = -9999; if (ring) ring.style.opacity = 0; }
    document.addEventListener('pointerleave', away);
    addEventListener('pointerup', function (e) { if (e.pointerType !== 'mouse') away(); });
    addEventListener('pointercancel', away);
    // a tap rather than a click: iOS sends no click up to the window from a plain block over the canvas
    // A finger that lands while the page is still gliding stops it: iOS sends no click for that touch,
    // and neither does this
    var pdown = null;
    addEventListener('pointerdown', function (e) { pdown = { x: e.clientX, y: e.clientY, t: e.timeStamp, gliding: performance.now() - lastScroll < 100 }; });
    addEventListener('pointercancel', function () { pdown = null; });
    addEventListener('pointerup', function (e) {
      var d = pdown; pdown = null;
      if (!d || d.gliding || e.button || Math.abs(e.clientX - d.x) > 10 || Math.abs(e.clientY - d.y) > 10 || e.timeStamp - d.t > 600) return;
      if (e.target.closest('a, button, .dir-switch')) return;
      if (inWork()) {
        var k = R.coverAt(e.clientX, e.clientY);
        if (k >= 0) { go(k); return; }
      }
      if (!reduce) env.wave = { x: e.clientX, y: e.clientY, t: env.t };
    });

    // ——— into a case ———
    var goStart = 0;
    function go(k) {
      if (env.go >= 0) return;
      if (!inWork()) { location.href = CASES[k].href; return; }
      env.go = k; env.hover = k; goStart = performance.now();
      // the cover crosses into a box that grows to fill the screen (handoff.js); the camera still flies in under it
      if (window.Handoff && R.coverRect) Handoff.leave(R.coverImage(k), R.coverRect(k), { lit: Math.min(1.15, 0.3 + 0.9 * env.hov[k] + (1 - env.any) * 0.7), fade: true, done: function () { leaveFor(k); } });
      if (ring) ring.style.opacity = 0;
    }
    // the case page picks up from the last frame
    function leaveFor(k) {
      if (env.left) return;
      env.left = true;
      if (/cases\/|\.html/.test(CASES[k].href)) { try { sessionStorage.setItem('land', '1'); } catch (e) {} }
      location.href = CASES[k].href;
    }
    // back from the case: the page comes back as it was before the click, nothing still lifted
    addEventListener('pageshow', function (e) { if (e.persisted) { env.go = -1; env.g = 0; env.left = false; env.hover = -1; } });

    // ——— captions and rail ———
    function put(el, k, v) { var c = el._s || (el._s = {}); if (c[k] !== v) { c[k] = v; el.style[k] = v; } }
    var caps = [].slice.call(document.querySelectorAll('[data-cap]'));
    var meter = [].slice.call(document.querySelectorAll('#meter button'));
    // each caption's run of stages, and each rail button's stage, read once
    caps.forEach(function (el) { el._r = el.dataset.cap.split('-').map(Number); });
    var meterAt = meter.map(function (m) { return +m.dataset.stage; }), meterLit = -2;
    function captions(p) {
      for (var c = 0; c < caps.length; c++) {
        var el = caps[c], r = el._r;
        var off = p - Math.max(r[0], Math.min(r[r.length - 1], p)), d = Math.abs(off);
        var o = Math.max(0, 1 - d / 0.22) * (1 - env.g * 3 > 0 ? 1 - env.g * 3 : 0);
        put(el, 'opacity', o.toFixed(3));
        put(el, 'visibility', o > 0.01 ? 'visible' : 'hidden');
        put(el, 'transform', reduce || o < 0.01 ? '' : 'translateY(' + (off * -40).toFixed(1) + 'px)');
        put(el, 'pointerEvents', o > 0.6 ? '' : 'none');
      }
      var on = Math.round(p), lit = -1;
      for (var i = 0; i < meterAt.length; i++) if (meterAt[i] <= on) lit = i;
      if (lit !== meterLit) { meterLit = lit; for (i = 0; i < meter.length; i++) meter[i].classList.toggle('on', i === lit); }
    }

    // ——— frame ———
    var t0 = performance.now(), prev = t0, litTag = null;
    function frame(rafNow) {
      if (lenis) lenis.raf(rafNow);
      var now = performance.now();
      if (window.Perf) Perf.frame(now - prev);
      env.dt = Math.min(50, now - prev); prev = now;
      env.t = (now - t0) / 1000;
      var max = maxScroll();
      env.s = max > 0 ? Math.min(1, Math.max(0, scrollPos() / max)) : 0;
      // on a phone a shape takes its time to catch up with a flick; a stretch scrolled like a page keeps up
      // (only once the shape has caught up does a page-like stretch go one to one)
      var target = stageAt(env.s);
      env.stage = window.Perf && !(R.free && R.free(target) && R.free(env.stage)) ? Perf.follow(env.stage, target, env.dt) : target;

      var m = env.mouse, k = Math.min(1, env.dt / 16.7);
      // p: is a pointer there at all — full while a mouse is on the page or a finger is down, gone soon after a lift
      m.p += ((tx < -9000 ? 0 : 1) - m.p) * 0.12 * k;
      if (tx < -9000) { m.on += (0 - m.on) * 0.1 * k; }
      else {
        if (m.x < -9000 || m.p < 0.05) { m.x = tx; m.y = ty; }
        m.x += (tx - m.x) * 0.35 * k; m.y += (ty - m.y) * 0.35 * k;
        m.on += ((now - lastMove < 1200 ? 1 : 0.4) - m.on) * 0.1 * k;
      }
      if (ring && mouseSeen && tx > -9000) { rx += (tx - rx) * 0.22; ry += (ty - ry) * 0.22; put(ring, 'transform', 'translate(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px)'); }

      env.any = 0;
      for (var i = 0; i < 4; i++) { env.hov[i] += ((env.hover === i ? 1 : 0) - env.hov[i]) * 0.12 * k; env.any = Math.max(env.any, env.hov[i]); }
      if (env.hover !== litTag) { litTag = env.hover; for (i = 0; i < tags.length; i++) tags[i].classList.toggle('on', litTag === i); }

      if (env.go >= 0) {
        env.g = Math.min(1, (now - goStart) / (reduce ? 300 : 1100));
        if (env.g >= 1) leaveFor(env.go);
      }

      if (!env.lost) R.frame(env);
      placeTags();
      captions(env.stage);
      requestAnimationFrame(frame);
    }

    // ——— load ———
    var loading = document.getElementById('loading'), pct = document.getElementById('loadPct');
    function tick(f) { if (pct) pct.textContent = Math.round(f * 100); }
    if (window.Perf) Perf.onChange = function (d) { env.dpr = d; if (R.setDpr) R.setDpr(env); else R.build(env); };
    Promise.resolve(R.load(tick)).then(function () {
      R.build(env);
      if (loading) { loading.style.opacity = 0; setTimeout(function () { loading.remove(); }, 800); }
      requestAnimationFrame(frame);
      // an address that names a stage (/#work) opens on it
      var named = location.hash && document.querySelector('[data-stage][href="' + location.hash.replace(/"/g, '') + '"]');
      if (named) scrollTo(0, yAt(+named.dataset.stage));
      // a phone's toolbar sliding away changes the height a little; only rebuild for a real resize
      var to, lastW = innerWidth, lastH = innerHeight;
      addEventListener('resize', function () {
        if (innerWidth === lastW && (innerHeight === lastH || touch && Math.abs(innerHeight - lastH) < 120)) return;
        // a hidden or collapsing frame reports a zero size; there is nothing to build for
        if (innerWidth < 50 || innerHeight < 50) return;
        lastW = innerWidth; lastH = innerHeight;
        clearTimeout(to);
        to = setTimeout(rebuild, 200);
      });
      // iOS takes the GL context back under memory pressure or in the background; when it is returned
      // the scene is built again rather than left black
      var cv = document.getElementById('gl');
      if (cv) {
        cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); env.lost = true; });
        cv.addEventListener('webglcontextrestored', function () {
          try { if (R.restore) R.restore(env); else { R.init(env); R.build(env); } env.lost = false; } catch (e) { console.error(e); }
        });
      }
    }).catch(function (e) { console.error(e); root.classList.add('no-gl'); });

    // a new size: the scene is built for it, and the reader stays on the stage they were on
    // (the track may have changed under them)
    function rebuild() {
      var st = env.stage;
      env.W = innerWidth; env.H = (window.Perf ? Perf.vh() : innerHeight); env.mobile = innerWidth < 760;
      R.build(env);
      measureScroll();
      var y = yAt(st);
      if (Math.abs(scrollPos() - y) > 2) { if (lenis) lenis.scrollTo(y, { immediate: true }); else scrollTo(0, y); }
    }

    return env;
  };

  // shared helpers
  BKit.loadImages = function (srcs, tick, done0, total) {
    var done = done0 || 0;
    return Promise.all(srcs.map(function (src) {
      var im = new Image(); im.src = src;
      // load, not decode(): decode() can sit unresolved while the tab is in the background
      return new Promise(function (res, rej) {
        if (im.complete && im.naturalWidth) return res(im);
        im.onload = function () { res(im); }; im.onerror = rej;
      }).then(function (img) { done++; tick(done / total); return img; });
    }));
  };
  // the four covers on a 2×2 grid, sized by the screen (the Depth sandbox hangs them so)
  BKit.coverLayout = function (W, H, mobile) {
    // on a wide screen they keep clear of the section rail on the right
    var gw = mobile ? W * 0.92 : Math.min(W * 0.82, W >= 1100 ? W - 340 : W, 1240);
    var gh = mobile ? Math.min(H * 0.6, gw * 1.3) : Math.min(H * 0.64, gw * 0.62);
    var gap = mobile ? 12 : 22, labelH = mobile ? 34 : 54;
    var cw = (gw - gap) / 2, ch = (gh - gap - labelH * 2) / 2;
    var gx = (W - gw) / 2, gy = (H - gh) / 2 + (mobile ? 16 : 26);
    var out = [];
    for (var k = 0; k < 4; k++) {
      var x = gx + (k % 2) * (cw + gap), y = gy + Math.floor(k / 2) * (ch + labelH + gap);
      out.push({ x: x, y: y, w: cw, h: ch, cx: x + cw / 2, cy: y + ch / 2 });
    }
    return out;
  };
  BKit.greeting = function (W, H, mobile) {
    // the greeting as a filled bitmap, for sampling
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    var x = c.getContext('2d', { willReadFrequently: true });
    var lines = mobile ? ['Hi! I’m', 'Yurii'] : ['Hi! I’m Yurii'];
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#fff';
    x.font = '700 100px Inter, sans-serif';
    var widest = Math.max.apply(null, lines.map(function (l) { return x.measureText(l).width; }));
    var fs = Math.min(100 * (W * (mobile ? 0.84 : 0.76)) / widest, H * (mobile ? 0.2 : 0.3));
    x.font = '700 ' + fs + 'px Inter, sans-serif';
    var lh = fs * 0.98, cy = H * (mobile ? 0.34 : 0.4);
    lines.forEach(function (l, i) { x.fillText(l, W / 2, cy + (i - (lines.length - 1) / 2) * lh); });
    var d = x.getImageData(0, 0, W, H).data, pts = [];
    for (var yy = 0; yy < H; yy += 2) for (var xx = 0; xx < W; xx += 2) if (d[(yy * W + xx) * 4 + 3] > 128) pts.push(xx, yy);
    return pts;
  };
  BKit.hex = function (h) { return [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255]; };
})();
