// Visit counts for yuryury.com: PostHog, EU Cloud (Frankfurt). What it records and why is on /privacy/.
//   · nothing is fetched until the page has loaded, its frames run smooth and the browser is idle, so the
//     library never competes with the fonts, the pictures or the WebGL warm-up; it runs once
//   · cookieless: no cookies, nothing in the browser's storage, no recordings, no identify()
//   · the library is served from the site itself, in the build that never loads code from anywhere else;
//     its one extension, web vitals (how fast the page loads), sits next to it from the same npm release
//   · only yuryury.com counts: the GitHub Pages copy, previews and the workbench stay out
(function () {
  if (!/(^|\.)yuryury\.com$/.test(location.hostname)) return;
  var dir = '/assets/vendor/posthog-js-1.438.24/';

  function add(name) {
    var s = document.createElement('script');
    s.src = dir + name;
    s.async = false; // inserted by a script: both download at once and run in this order
    document.head.appendChild(s);
    return s;
  }

  function start() {
    // the web-vitals callbacks first: the library looks for them when it starts
    add('web-vitals-with-attribution.js');
    add('array.no-external.js').onload = function () {
      if (!window.posthog || !posthog.init) return;
      posthog.init('phc_s8RLYXFxEE89DCb3hnRoRdSCDTPauLCTnwJMAt2j9nfR', {
        api_host: 'https://eu.i.posthog.com',
        ui_host: 'https://eu.posthog.com',
        cookieless_mode: 'always',
        person_profiles: 'identified_only',
        disable_session_recording: true, // recordings can't run cookieless anyway
        capture_pageview: true,
        capture_pageleave: true
      });
    };
  }

  // Safari has no idle callback: a fixed wait stands in for it
  function idle() {
    if (window.requestIdleCallback) requestIdleCallback(start, { timeout: 4000 });
    else setTimeout(start, 1000);
  }
  // After load the scene is often still on its first frames (built, shaders compiled, first pictures
  // uploaded), and an idle moment between two frames comes long before that is over. So the wait is for
  // the frames to run smooth: ten in a row under 25 ms. A page whose frames never get there (a slow phone,
  // Low Power Mode) or that draws none (a hidden tab) goes on after 4 s.
  function afterLoad() {
    var last = 0, calm = 0, done = false;
    function go() { if (!done) { done = true; idle(); } }
    function tick(t) {
      if (done) return;
      calm = last && t - last < 25 ? calm + 1 : 0;
      last = t;
      if (calm >= 10) go(); else requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    setTimeout(go, 4000);
  }

  if (document.readyState === 'complete') afterLoad();
  else addEventListener('load', afterLoad);
})();
