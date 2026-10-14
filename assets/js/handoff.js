// Opening a case from the home page carries one picture across two pages.
// The chosen cover is lifted out of the canvas into a plain box that crops its picture like
// object-fit: cover, so the crop follows the box's shape the whole way. The box grows from the
// cover to the whole screen (leave), the case page puts the same box up in its very first frame,
// and it settles into the hero's place (land). One element, one crop rule, no jump at the seam.
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // cubic-bezier(.3, 0, .12, 1): answers the click at once, then a long soft landing
  function bez(x1, y1, x2, y2) {
    function at(a1, a2, t) { return ((1 - 3 * a2 + 3 * a1) * t + (3 * a2 - 6 * a1)) * t * t + 3 * a1 * t; }
    return function (x) {
      var lo = 0, hi = 1, t = x;
      for (var i = 0; i < 24; i++) { t = (lo + hi) / 2; if (at(x1, x2, t) < x) lo = t; else hi = t; }
      return at(y1, y2, t);
    };
  }
  var ease = bez(0.3, 0, 0.12, 1);

  var css = document.createElement('style');
  css.textContent =
    '.handoff{position:fixed;left:0;top:0;z-index:70;overflow:hidden;pointer-events:none;background:#1a1c22;visibility:visible}' +
    '.handoff img{display:block;width:100%;height:100%;object-fit:cover}' +
    // leaving: the page's own chrome steps back under the growing picture
    '.handing .dir-switch,.handing .nav,.handing .meter{opacity:0;transition:opacity .3s}' +
    // arriving: nothing of the case shows until the picture is up (the old page stays on screen till then)
    '.landing body{visibility:hidden}';
  document.head.appendChild(css);

  function box(img) {
    var el = document.createElement('div');
    el.className = 'handoff'; el.setAttribute('aria-hidden', 'true');
    // a copy of an image the page has already decoded paints in its first frame
    var im = img.cloneNode(false); im.removeAttribute('id'); im.alt = '';
    el.appendChild(im);
    return el;
  }
  function place(el, r, rad, o) {
    var s = el.style;
    s.left = r.x + 'px'; s.top = r.y + 'px'; s.width = r.w + 'px'; s.height = r.h + 'px';
    s.borderRadius = (rad || 0) + 'px';
    if (o != null) s.opacity = o;
  }
  function mix(a, b, e) { return { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e, w: a.w + (b.w - a.w) * e, h: a.h + (b.h - a.h) * e }; }
  function screen() { return { x: 0, y: 0, w: innerWidth, h: innerHeight }; }
  // frames by the clock, so a busy main thread drops frames but never time.
  // calm: hold still until frames come steadily (a page that has just loaded is still building
  // its scene), so the move starts smooth instead of opening with a jump; at most a second
  function tween(ms, step, done, calm) {
    var t0 = null, last = performance.now(), steady = 0, asked = last;
    (function f() {
      var now = performance.now();
      if (t0 === null) {
        steady = now - last < 34 ? steady + 1 : 0; last = now;
        if (!calm || steady >= 3 || now - asked > 1000) t0 = now;
        else { step(0); return requestAnimationFrame(f); }
      }
      var k = Math.min(1, (now - t0) / ms);
      step(ease(k), k);
      if (k < 1) requestAnimationFrame(f); else if (done) done();
    })();
  }

  var H = window.Handoff = {
    duration: reduce ? 250 : 900,
    // the home page: grow from `from` (the cover's rect on screen now) to the whole screen.
    // lit: how bright the canvas draws the cover; fade: cross in over the canvas's own cover
    leave: function (img, from, opt) {
      opt = opt || {};
      var el = box(img), lit = opt.lit || 1;
      place(el, from, 0, opt.fade ? 0 : 1);
      document.body.appendChild(el);
      document.documentElement.classList.add('handing');
      tween(H.duration, function (e, k) {
        // the cross-fade runs on the clock, quickly, so the box is solid before the canvas lets go of its cover
        place(el, mix(from, screen(), e), 0, opt.fade ? Math.min(1, k / 0.12) : null);
        el.style.filter = lit === 1 ? '' : 'brightness(' + (lit + (1 - lit) * e).toFixed(3) + ')';
      }, opt.done);
      // back from the case with the back button: the page comes back as it was left
      addEventListener('pageshow', function (ev) {
        if (!ev.persisted) return;
        el.remove(); document.documentElement.classList.remove('handing');
      }, { once: true });
    },
    // the case page, called from <head>: is this a landing? Then hide the page until the box is up
    expect: function () {
      try {
        if (sessionStorage.getItem('land')) {
          var root = document.documentElement;
          root.classList.add('landing');
          // should the landing never run, the page still shows
          setTimeout(function () { root.classList.remove('landing'); }, 2500);
          return true;
        }
      } catch (e) {}
      return false;
    },
    // the case page, called right after the hero figure is parsed: the box starts as the whole
    // screen and settles onto the figure, wherever the figure is by then
    land: function (fig, img, opt) {
      var root = document.documentElement;
      if (!root.classList.contains('landing')) return;
      try { sessionStorage.removeItem('land'); } catch (e) {}
      opt = opt || {};
      var el = box(img), from = screen();
      place(el, from, 0, 1);
      document.body.appendChild(el);
      img.style.visibility = 'hidden';
      root.classList.remove('landing');
      tween(reduce ? 1 : 1100, function (e) {
        var b = fig.getBoundingClientRect(), to = { x: b.left, y: b.top, w: b.width, h: b.height };
        // on a phone the hero sits below the fold: the picture takes its size and slips down past
        // the bottom edge, toward where it waits, instead of vanishing on the spot
        if (b.top > innerHeight - 80) to.y = innerHeight + 16;
        place(el, mix(from, to, e), (opt.radius || 0) * e, 1);
      }, function () { img.style.visibility = ''; el.remove(); }, true);
    }
  };
})();
