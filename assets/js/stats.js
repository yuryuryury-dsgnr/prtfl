// Visit counts for yuryury.com: PostHog, EU Cloud (Frankfurt). What it records and why is on /privacy/.
//   · a page asks for this file only from its load event (one inline line), and this file fetches the
//     library only once the frames run smooth and the browser is idle, so nothing here competes with the
//     fonts, the pictures or the WebGL warm-up; it runs once
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
      posthog.init('phc_sCFQExz2a9WHJBRnTeuGZKvW7MQARWFXQqnfFRKf4ydU', {
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
  // the frames to run smooth: a quarter of a second of frames under 40 ms each (warm-up hitches run
  // longer; 30, 60 and 120 Hz screens all pass). A page whose frames never get there (a slow phone) or
  // that draws none (a hidden tab) goes on after 4 s.
  function afterLoad() {
    var last = 0, calm = 0, done = false;
    function go() { if (!done) { done = true; idle(); } }
    function tick(t) {
      if (done) return;
      var d = last ? t - last : 1e9;
      last = t;
      calm = d < 40 ? calm + d : 0;
      if (calm >= 250) go(); else requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    setTimeout(go, 4000);
  }

  if (document.readyState === 'complete') afterLoad();
  else addEventListener('load', afterLoad);
})();
