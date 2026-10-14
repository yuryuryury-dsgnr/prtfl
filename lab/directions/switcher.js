// The pill pinned to the bottom of the home page, switching between its two
// styles: Matter is the folder's own page, Depth sits beside it.
(function () {
  var pages = [
    ['', './', 'Материя'],
    ['depth', 'depth.html', 'Глубина'],
    ['dive', 'dive.html', 'Погружение']
  ];
  // the live site serves pages without .html, the local server with it; the folder itself is Matter
  var here = (location.pathname.match(/\/([a-z]+)(?:\.html)?$/) || [])[1] || '';
  if (here === 'index') here = '';
  var nav = document.createElement('nav');
  nav.className = 'dir-switch';
  nav.setAttribute('aria-label', 'Directions');
  nav.innerHTML = pages.map(function (p) {
    return '<a href="' + p[1] + '"' + (p[0] === here ? ' aria-current="page"' : '') + '>' + p[2] + '</a>';
  }).join('');

  var css = document.createElement('style');
  css.textContent =
    '.dir-switch{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:9999;' +
    'display:flex;gap:2px;padding:4px;border-radius:999px;background:rgba(20,20,22,.78);' +
    '-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);box-shadow:0 6px 24px rgba(0,0,0,.18);' +
    'font:500 12px/1 Inter,-apple-system,sans-serif;letter-spacing:0;max-width:calc(100vw - 24px);overflow-x:auto;scrollbar-width:none}' +
    '.dir-switch::-webkit-scrollbar{display:none}' +
    '.dir-switch a{display:flex;align-items:center;padding:8px 12px;border-radius:999px;white-space:nowrap;' +
    'color:rgba(255,255,255,.62);text-decoration:none;transition:background .2s,color .2s}' +
    '.dir-switch a:hover{color:#fff;background:rgba(255,255,255,.08)}' +
    '.dir-switch a[aria-current]{color:#111;background:#fff}' +
    '@media (max-width:420px){.dir-switch a{padding:8px 9px;font-size:11px}}';
  document.head.appendChild(css);
  document.body.appendChild(nav);
})();
