// What a phone needs to stay smooth, shared by the Matter and Depth pages:
//   · touch devices keep the browser's own scroll (no smoothing layer, no settling)
//   · the canvas starts at 2× on a phone, not its native 3×
//   · if frames still come in slow, the resolution steps down on its own
//   · blurred glass over a canvas that repaints every frame is dropped on touch
//   · ?fps on the URL shows the frame rate and the resolution in use
(function () {
  var touch = matchMedia('(hover: none) and (pointer: coarse)').matches;
  var steps = [2, 1.5, 1];
  var native = window.devicePixelRatio || 1;
  var level = 0;
  while (level < steps.length - 1 && steps[level] > native) level++;

  var P = window.Perf = {
    touch: touch,
    dpr: Math.min(native, steps[level]),
    onChange: null,
    info: null, // a page can add a line of its own state to the ?fps readout
    frame: frame
  };

  // the tallest the viewport gets (phone toolbar hidden): the canvas is drawn that tall, so the toolbar
  // sliding in or out neither stretches the picture nor bares the page under it
  var probe;
  P.vh = function () {
    if (!probe) {
      probe = document.createElement('div');
      probe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:100vh;height:100lvh;visibility:hidden;pointer-events:none';
      document.documentElement.appendChild(probe);
    }
    return Math.max(probe.offsetHeight, innerHeight);
  };

  // a flick can carry the page a whole section in a few frames; on a phone the shape still takes
  // its time to get there, so the morph is seen rather than skipped
  P.follow = function (cur, target, dt) {
    if (!touch) return target;
    var step = (target - cur) * (1 - Math.exp(-dt / 160)), cap = dt / 1000 * 1.4;
    return cur + Math.max(-cap, Math.min(cap, step));
  };

  // Once a wheel stops between two shapes the page eases onto the nearer one. A phone never settles:
  // pulled back, the scroll can't be felt under the thumb.
  // ?settle=2 tries a settle after that many seconds; ?settle=off turns it off everywhere.
  var asked = /[?&]settle=([\w.]+)/.exec(location.search);
  P.settleDelay = asked ? (asked[1] === 'off' ? -1 : +asked[1] * 1000) : touch ? -1 : 380;
  P.whenStill = function (fn) {
    var timer, held = false;
    function arm() { clearTimeout(timer); if (!held && P.settleDelay >= 0) timer = setTimeout(fn, P.settleDelay); }
    if (touch) {
      addEventListener('touchstart', function () { held = true; clearTimeout(timer); }, { passive: true });
      addEventListener('touchend', function () { held = false; arm(); }, { passive: true });
      addEventListener('touchcancel', function () { held = false; arm(); }, { passive: true });
    }
    return arm;
  };

  if (touch) {
    var css = document.createElement('style');
    css.textContent = '*{-webkit-backdrop-filter:none!important;backdrop-filter:none!important}.grain{display:none!important}';
    document.head.appendChild(css);
  }

  // slow for about a second, after the first two (the intro is allowed to be heavy) → one step down
  var ema = 16.7, slow = 0, since = performance.now(), last = 0;
  function frame(dt) {
    var now = performance.now();
    if (dt > 100) return; // a tab switch or a stall, not the page's speed
    ema += (dt - ema) * 0.08;
    if (hud) draw(now);
    if (now - since < 2000 || now - last < 2500 || level >= steps.length - 1) return;
    slow = ema > 21 ? slow + 1 : 0;
    if (slow > 60) {
      level++; slow = 0; last = now;
      P.dpr = Math.min(native, steps[level]);
      if (P.onChange) P.onChange(P.dpr);
    }
  }

  var hud = /[?&]fps/.test(location.search) ? document.createElement('div') : null, shown = 0;
  if (hud) {
    hud.style.cssText = 'position:fixed;left:8px;top:64px;z-index:99999;font:500 11px/1.4 ui-monospace,monospace;color:#B8F0C9;background:rgba(0,0,0,.75);padding:6px 8px;border-radius:6px;pointer-events:none;white-space:pre';
    document.addEventListener('DOMContentLoaded', function () { document.body.appendChild(hud); });
    if (document.body) document.body.appendChild(hud);
  }
  function draw(now) {
    if (now - shown < 250) return; shown = now;
    hud.textContent = Math.round(1000 / ema) + ' fps  ' + ema.toFixed(1) + ' ms\nres ' + P.dpr + '×' + (touch ? '  touch' : '') +
      '\nview ' + innerWidth + '×' + innerHeight + '  canvas ' + P.vh() + (P.info ? '\n' + P.info() : '');
  }
})();
