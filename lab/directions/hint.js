// The scroll hint on the Matter and Depth pages: a small gesture that plays by itself (a wheel
// for a mouse, a swipe for a thumb) and words that decode from one to the next, like the data
// around them. The element carries both sets of words; the device picks one:
//   <div data-hint data-mouse="scroll to …|click anywhere" data-touch="swipe up to …|tap anywhere"></div>
(function () {
  var el = document.querySelector('[data-hint]');
  if (!el) return;
  var touch = window.Perf ? Perf.touch : matchMedia('(hover: none) and (pointer: coarse)').matches;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var words = (el.getAttribute(touch ? 'data-touch' : 'data-mouse') || '').split('|');

  var css = document.createElement('style');
  css.textContent = [
    '[data-hint]{display:flex;align-items:center;gap:12px;margin-top:24px;font:500 11px/1 var(--mono);color:var(--muted);letter-spacing:.02em}',
    '.hint-t{white-space:pre;min-height:1em}',
    '.hint-t b{font-weight:500;color:var(--fg)}',
    '.hint-g{position:relative;flex:0 0 auto}',
    // a mouse: the wheel rolls down inside its outline
    '.is-mouse .hint-g{width:15px;height:23px;border:1.5px solid rgba(233,236,242,.55);border-radius:8px}',
    '.is-mouse .hint-g i{position:absolute;left:50%;top:4px;width:2px;height:5px;margin-left:-1px;border-radius:2px;background:var(--fg);animation:hint-wheel 1.9s cubic-bezier(.6,0,.3,1) infinite}',
    '@keyframes hint-wheel{0%{transform:translateY(0);opacity:0}18%{opacity:1}70%{transform:translateY(8px);opacity:0}100%{transform:translateY(8px);opacity:0}}',
    // a thumb: a point of light swipes up its track and leaves a trail
    '.is-touch .hint-g{width:2px;height:30px;border-radius:2px;background:rgba(233,236,242,.12)}',
    '.is-touch .hint-g::before{content:"";position:absolute;inset:0;border-radius:2px;background:linear-gradient(to top,rgba(233,236,242,0),rgba(233,236,242,.75));transform-origin:50% 100%;animation:hint-trail 2.2s cubic-bezier(.5,0,.15,1) infinite}',
    '.is-touch .hint-g i{position:absolute;left:-3px;bottom:-4px;width:8px;height:8px;border-radius:50%;background:var(--fg);box-shadow:0 0 14px rgba(233,236,242,.8);animation:hint-dot 2.2s cubic-bezier(.5,0,.15,1) infinite}',
    '@keyframes hint-trail{0%,12%{transform:scaleY(0);opacity:1}70%{transform:scaleY(1);opacity:1}100%{transform:scaleY(1);opacity:0}}',
    '@keyframes hint-dot{0%{transform:translateY(0) scale(.4);opacity:0}12%{transform:translateY(0) scale(1);opacity:1}70%{transform:translateY(-30px) scale(1);opacity:1}100%{transform:translateY(-30px) scale(.4);opacity:0}}',
    '@media (prefers-reduced-motion: reduce){.hint-g i,.hint-g::before{animation:none!important}}'
  ].join('');
  document.head.appendChild(css);

  el.classList.add(touch ? 'is-touch' : 'is-mouse');
  el.innerHTML = '<span class="hint-g" aria-hidden="true"><i></i></span><span class="hint-t" aria-hidden="true"></span><span class="sr-only"></span>';
  var t = el.querySelector('.hint-t');
  el.querySelector('.sr-only').textContent = words.join(' · ');
  // the verb is what to do, so it is the bright part
  function render(s) { var k = s.indexOf(' '); t.innerHTML = k < 0 ? '<b>' + s + '</b>' : '<b>' + s.slice(0, k) + '</b>' + s.slice(k); }
  render(words[0]);
  if (reduce || words.length < 2) return;

  // each character runs through data glyphs and settles, left to right
  var GLYPHS = '01·:/<>+=#';
  var i = 0;
  // only while its caption is on screen (a hidden tab pauses the frames that run it anyway)
  var cap = el.closest('.cap') || el;
  setInterval(function () {
    if (+(cap.style.opacity || 1) < 0.1) return;
    var from = words[i], to = words[i = (i + 1) % words.length], n = Math.max(from.length, to.length), f = 0;
    (function step() {
      f++;
      var out = '';
      for (var k = 0; k < n; k++) {
        var settle = 5 + k * 0.7;
        // past the end of the new words the old letters clear to blanks, so nothing shifts while it runs
        if (k >= to.length) out += f >= settle - 5 ? ' ' : (from[k] || '');
        else if (f >= settle) out += to[k];
        else if (f >= settle - 5) out += to[k] === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0];
        else out += from[k] || ' ';
      }
      // glyphs plain while they run, the verb lit once they land
      if (f < 5 + n * 0.7) { t.textContent = out; requestAnimationFrame(step); }
      else render(to);
    })();
  }, 3400);
})();
