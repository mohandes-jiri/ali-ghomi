/* Image gallery for project detail pages.
 * Only one image is visible at a time. While the page is at the top, scrolling
 * (wheel, touch or keys) swaps the image in place instead of moving the page,
 * so the text and everything below stay put. Once the last image is showing,
 * further scrolling scrolls the page normally. Scrolling back up to the top
 * of the page steps through the images in reverse.
 * Must run before js/main.js so the old carousel is never initialised. */
(function () {
  var list = document.getElementById('slider1');
  if (!list) return;
  var wrapper = list.closest('.image-slider-wrapper') || list.parentNode;
  var srcs = Array.prototype.map.call(list.querySelectorAll('img'), function (i) {
    return i.getAttribute('src');
  });
  if (!srcs.length) return;

  var style = document.createElement('style');
  style.textContent =
    '.scroll-gallery{position:relative}' +
    '.sg-stage{position:relative;border-radius:22px;overflow:hidden;height:calc(100vh - 100px)}' +
    '.sg-frame{position:absolute;inset:0;opacity:0;transition:opacity .6s var(--ease,ease);display:flex;align-items:center;justify-content:center}' +
    '.sg-frame.is-active{opacity:1}' +
    '.sg-frame img{width:100%;height:100%;object-fit:contain;display:block;margin:0}' +
    '.sg-counter{position:absolute;right:18px;bottom:20px;font-size:12px;letter-spacing:.08em;color:var(--muted);font-variant-numeric:tabular-nums}' +
    '.sg-bar{position:absolute;left:18px;right:90px;bottom:26px;height:2px;background:var(--line);border-radius:2px;overflow:hidden}' +
    '.sg-bar span{display:block;height:100%;background:var(--fg);transform:scaleX(0);transform-origin:left;transition:transform .6s var(--ease,ease)}' +
    '@media (prefers-reduced-motion:reduce){.sg-frame,.sg-bar span{transition:none}}';
  document.head.appendChild(style);

  var gallery = document.createElement('div');
  gallery.className = 'scroll-gallery';
  var stage = document.createElement('div');
  stage.className = 'sg-stage';
  var frames = srcs.map(function (src, i) {
    var f = document.createElement('div');
    f.className = 'sg-frame' + (i === 0 ? ' is-active' : '');
    var img = document.createElement('img');
    img.src = src;
    img.alt = '';
    img.decoding = 'async';
    f.appendChild(img);
    stage.appendChild(f);
    return f;
  });
  var n = srcs.length, current = 0;
  var counter = document.createElement('div');
  counter.className = 'sg-counter';
  var bar = document.createElement('div');
  bar.className = 'sg-bar';
  var fill = document.createElement('span');
  bar.appendChild(fill);
  if (n > 1) { stage.appendChild(counter); stage.appendChild(bar); }
  gallery.appendChild(stage);
  wrapper.parentNode.replaceChild(gallery, wrapper);

  function show(i) {
    current = i;
    frames.forEach(function (f, k) { f.classList.toggle('is-active', k === i); });
    counter.textContent = (i + 1) + ' / ' + n;
    fill.style.transform = 'scaleX(' + (n > 1 ? i / (n - 1) : 1) + ')';
  }

  /* Same size the old carousel used: full content width, height follows the
     image aspect ratio (capped to the viewport). */
  function fitHeight() {
    var w = gallery.clientWidth, h = 0;
    frames.forEach(function (f) {
      var im = f.firstChild;
      if (im.naturalWidth) h = Math.max(h, w * im.naturalHeight / im.naturalWidth);
    });
    var cap = window.innerHeight - 100;
    stage.style.height = Math.round(h ? Math.min(h, cap) : cap) + 'px';
  }

  var lastMove = 0, COOLDOWN = 650;
  var atTop = function () { return (window.pageYOffset || document.documentElement.scrollTop) <= 1; };

  /* dir: +1 forward, -1 back. Returns true if the gallery consumed the input. */
  function step(dir) {
    if (n < 2 || !atTop()) return false;
    var next = current + dir;
    if (next < 0 || next > n - 1) return false;
    var now = Date.now();
    if (now - lastMove >= COOLDOWN) { lastMove = now; show(next); }
    return true; /* swallow input (also during cooldown) so the page doesn't move */
  }

  window.addEventListener('wheel', function (e) {
    if (e.ctrlKey || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
    if (e.deltaY !== 0 && step(e.deltaY > 0 ? 1 : -1)) e.preventDefault();
  }, { passive: false });

  var touchY = null;
  window.addEventListener('touchstart', function (e) { touchY = e.touches[0].clientY; }, { passive: true });
  window.addEventListener('touchmove', function (e) {
    if (touchY === null) return;
    var dy = touchY - e.touches[0].clientY;
    if (Math.abs(dy) < 24) { if (atTop() && n > 1) { var d = dy > 0 ? 1 : -1; var nx = current + d; if (nx >= 0 && nx <= n - 1) e.preventDefault(); } return; }
    if (step(dy > 0 ? 1 : -1)) { e.preventDefault(); touchY = e.touches[0].clientY; }
  }, { passive: false });
  window.addEventListener('touchend', function () { touchY = null; }, { passive: true });

  window.addEventListener('keydown', function (e) {
    var t = e.target, tag = t && t.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    var dir = 0;
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) dir = 1;
    else if (e.key === 'ArrowUp' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) dir = -1;
    if (dir && step(dir)) e.preventDefault();
  });

  frames.forEach(function (f) { f.firstChild.addEventListener('load', fitHeight); });
  window.addEventListener('resize', fitHeight);
  window.addEventListener('load', fitHeight);
  show(0);
  fitHeight();
})();
