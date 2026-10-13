// What a phone needs to stay smooth, shared by the Matter and Depth pages:
//   · touch devices keep the browser's own scroll (no smoothing layer, no snapping)
//   · the canvas starts at 1.5× on a phone, not its native 3×
//   · if frames still come in slow, the resolution steps down on its own
//   · blurred glass over a canvas that repaints every frame is dropped on touch
//   · ?fps on the URL shows the frame rate and the resolution in use
(function () {
  var touch = matchMedia('(hover: none) and (pointer: coarse)').matches;
  var steps = touch ? [1.5, 1, 0.75] : [2, 1.5, 1];
  var native = window.devicePixelRatio || 1;
  var level = 0;
  while (level < steps.length - 1 && steps[level] > native) level++;

  var P = window.Perf = {
    touch: touch,
    dpr: Math.min(native, steps[level]),
    onChange: null,
    frame: frame
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
    hud.textContent = Math.round(1000 / ema) + ' fps  ' + ema.toFixed(1) + ' ms\nres ' + P.dpr + '×' + (touch ? '  touch' : '');
  }
})();
