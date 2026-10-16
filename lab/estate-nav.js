// The three real-estate concepts, one switcher on each of them: the points, the tour, the loft,
// and the way back to the lab's index.
// A pill at the top (under the bar on a phone); the page fades out before the next one loads.
(function () {
  var PAGES = [
    { href: '../estate/', n: '01', name: 'Points', key: '/estate/' },
    { href: '../estate-tour/', n: '02', name: 'Tour', key: '/estate-tour/' },
    { href: '../estate-loft/', n: '03', name: 'Loft', key: '/estate-loft/' }
  ];
  var here = location.pathname;
  var css = document.createElement('style');
  css.textContent = [
    '.ec-switch{position:fixed;z-index:25;top:16px;left:50%;transform:translateX(-50%);display:flex;gap:2px;padding:4px;border-radius:999px;',
    'background:rgba(16,17,22,.72);border:1px solid rgba(238,240,246,.14);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px)}',
    '.ec-switch a{display:flex;align-items:center;gap:7px;padding:7px 13px;border-radius:999px;font:500 12px/1 Inter,-apple-system,sans-serif;color:rgba(238,240,246,.6);text-decoration:none;transition:background .2s,color .2s;white-space:nowrap}',
    '.ec-switch a i{font:normal 500 10px/1 "JetBrains Mono",ui-monospace,monospace;color:rgba(238,240,246,.4)}',
    '.ec-switch a:hover{color:#EEF0F6;background:rgba(238,240,246,.07)}',
    '.ec-switch a.on{color:#06070A;background:#E8C27A}.ec-switch a.on i{color:rgba(6,7,10,.55)}',
    '.ec-switch a.ec-lab{color:rgba(238,240,246,.85);border-right:1px solid rgba(238,240,246,.14);border-radius:999px 0 0 999px;margin-right:2px}',
    '.ec-switch a:focus-visible{outline:2px solid #E8C27A;outline-offset:2px}',
    '@media (max-width:760px){.ec-switch{top:62px}.ec-switch a{padding:6px 11px}}',
    '.ec-fade{position:fixed;inset:0;z-index:100;background:#06070A;opacity:0;pointer-events:none;transition:opacity .35s}',
    '.ec-leaving .ec-fade{opacity:1}'
  ].join('');
  document.head.appendChild(css);
  var nav = document.createElement('nav');
  nav.className = 'ec-switch';
  nav.setAttribute('aria-label', 'Real-estate concepts');
  nav.innerHTML = '<a class="ec-lab" href="../" aria-label="All lab projects">Lab</a>' + PAGES.map(function (p) {
    var on = here.indexOf(p.key) >= 0;
    return '<a href="' + p.href + '"' + (on ? ' class="on" aria-current="page"' : '') + '><i>' + p.n + '</i>' + p.name + '</a>';
  }).join('');
  var fade = document.createElement('div');
  fade.className = 'ec-fade';
  document.body.appendChild(nav);
  document.body.appendChild(fade);
  // the page goes dark first, then the next one comes up out of its own dark
  nav.addEventListener('click', function (e) {
    var a = e.target.closest('a');
    if (!a || a.classList.contains('on') || e.metaKey || e.ctrlKey || e.shiftKey || e.button) { if (a && a.classList.contains('on')) e.preventDefault(); return; }
    e.preventDefault();
    document.documentElement.classList.add('ec-leaving');
    setTimeout(function () { location.href = a.href; }, 360);
  });
  // back to a page from the browser's cache: not dark
  addEventListener('pageshow', function (e) { if (e.persisted) document.documentElement.classList.remove('ec-leaving'); });
})();
