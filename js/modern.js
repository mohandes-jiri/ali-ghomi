/* Modern UX layer: header, theme, reveal, cursor, page transitions,
   particle sculpture, word-reveal, hover preview. Vanilla JS, no deps. */
(function () {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var lerp = function (a, b, t) { return a + (b - a) * t; };

  /* ---------- header: scrolled / hide on scroll-down ---------- */
  var header = $('.site-header');
  var progress = $('.progress');
  var lastY = window.scrollY;
  function onScroll() {
    var y = window.scrollY;
    if (header) {
      header.classList.toggle('is-scrolled', y > 24);
      var down = y > lastY && y > 400;
      header.classList.toggle('is-hidden', down && !document.body.classList.contains('menu-open'));
    }
    lastY = y;
    if (progress) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- work dropdown ---------- */
  $$('.has-menu').forEach(function (m) {
    var trigger = $('.nav-trigger', m);
    var closeT;
    function open() { clearTimeout(closeT); m.classList.add('is-open'); trigger.setAttribute('aria-expanded', 'true'); }
    function close() { closeT = setTimeout(function () { m.classList.remove('is-open'); trigger.setAttribute('aria-expanded', 'false'); }, 120); }
    trigger.addEventListener('click', function (e) { e.stopPropagation(); m.classList.contains('is-open') ? close() : open(); });
    if (finePointer) { m.addEventListener('mouseenter', open); m.addEventListener('mouseleave', close); }
    document.addEventListener('click', function (e) { if (!m.contains(e.target)) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  });

  /* ---------- mobile menu ---------- */
  var burger = $('.burger'), mm = $('.mobile-menu');
  if (burger && mm) {
    burger.addEventListener('click', function () {
      var open = !mm.classList.contains('is-open');
      mm.classList.toggle('is-open', open);
      document.body.classList.toggle('menu-open', open);
      burger.setAttribute('aria-expanded', open);
    });
  }

  /* ---------- scroll reveal ---------- */
  var autoReveal = ['.work-card', '.recent-card', '.disc', '.section-head', '.about-copy p', '.portrait',
    'body.page .my-detail-title', 'body.page .my-detail-content', 'body.page .my-video-container',
    'body.page .image-slider-wrapper', '.footer-big', '.marquee', '.page-hero .meta'];
  $$(autoReveal.join(',')).forEach(function (el, i) {
    if (!el.hasAttribute('data-reveal')) el.setAttribute('data-reveal', '');
    if (el.matches('.work-card')) el.style.setProperty('--d', ((i % 3) * 0.09) + 's');
    if (el.matches('.recent-card')) el.style.setProperty('--d', ((i % 3) * 0.12) + 's');
  });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    $$('[data-reveal], .line-group').forEach(function (el) { io.observe(el); });
  } else {
    $$('[data-reveal]').forEach(function (el) { el.classList.add('is-in'); });
  }
  window.addEventListener('load', function () { root.classList.add('is-loaded'); document.body.classList.add('is-loaded'); });
  setTimeout(function () { document.body.classList.add('is-loaded'); }, 120);

  /* ---------- page transitions ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    if (a.target === '_blank' || a.hasAttribute('download')) return;
    var url;
    try { url = new URL(a.href, location.href); } catch (err) { return; }
    if (url.origin !== location.origin || /\.(jpg|png|pdf|zip)$/i.test(url.pathname)) return;
    if (url.pathname === location.pathname && url.hash) return;
    e.preventDefault();
    document.body.classList.add('is-leaving');
    setTimeout(function () { location.href = a.href; }, reduce ? 0 : 320);
  });
  window.addEventListener('pageshow', function (e) { if (e.persisted) document.body.classList.remove('is-leaving'); });

  /* ---------- cursor ---------- */
  if (finePointer && !reduce) {
    var ring = document.createElement('div'); ring.className = 'cursor';
    var dot = document.createElement('div'); dot.className = 'cursor-dot';
    document.body.appendChild(ring); document.body.appendChild(dot);
    var mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    window.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      document.body.classList.add('has-cursor');
      dot.style.transform = 'translate(' + mx + 'px,' + my + 'px)';
    }, { passive: true });
    document.addEventListener('mouseleave', function () { document.body.classList.remove('has-cursor'); });
    (function loop() {
      rx = lerp(rx, mx, 0.18); ry = lerp(ry, my, 0.18);
      ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px)';
      requestAnimationFrame(loop);
    })();
    document.addEventListener('mouseover', function (e) {
      var t = e.target;
      var view = t.closest && t.closest('.work-card, .recent-card');
      var link = t.closest && t.closest('a, button, .disc');
      ring.classList.toggle('is-view', !!view);
      ring.classList.toggle('is-link', !!link && !view);
      ring.textContent = view ? 'View' : '';
    });
  }

  /* ---------- magnetic buttons + card tilt ---------- */
  if (finePointer && !reduce) {
    $$('.btn, .pill, .icon-btn').forEach(function (b) {
      b.addEventListener('mousemove', function (e) {
        var r = b.getBoundingClientRect();
        b.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * 0.22) + 'px,' + ((e.clientY - r.top - r.height / 2) * 0.3) + 'px)';
      });
      b.addEventListener('mouseleave', function () { b.style.transform = ''; });
    });
    $$('.work-card .media, .recent-card .media').forEach(function (m) {
      m.addEventListener('mousemove', function (e) {
        var r = m.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        m.style.transform = 'perspective(900px) rotateY(' + (x * 7) + 'deg) rotateX(' + (-y * 7) + 'deg)';
      });
      m.addEventListener('mouseleave', function () { m.style.transform = ''; m.style.transition = 'transform .8s cubic-bezier(.22,1,.36,1)'; });
      m.addEventListener('mouseenter', function () { m.style.transition = 'transform .15s linear'; });
    });
  }

  /* ---------- word-by-word scroll reveal ---------- */
  var rw = $('.reveal-words');
  if (rw) {
    var words = rw.textContent.trim().split(/\s+/);
    rw.innerHTML = words.map(function (w) { return '<span class="w">' + w + '</span>'; }).join(' ');
    var spans = $$('.w', rw);
    var upd = function () {
      var r = rw.getBoundingClientRect();
      var p = (innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.35);
      p = Math.max(0, Math.min(1, p));
      var n = Math.round(p * spans.length);
      spans.forEach(function (s, i) { s.classList.toggle('on', i < n); });
    };
    if (reduce) spans.forEach(function (s) { s.classList.add('on'); });
    else { window.addEventListener('scroll', upd, { passive: true }); upd(); }
  }

  /* ---------- discipline hover preview ---------- */
  var prev = $('.preview');
  if (prev) {
    var imgs = $$('img', prev);
    var px = 0, py = 0, tx = 0, ty = 0, active = false;
    window.addEventListener('mousemove', function (e) { tx = e.clientX + 28; ty = e.clientY - 90; }, { passive: true });
    $$('.disc').forEach(function (d) {
      d.addEventListener('mouseenter', function () {
        var k = d.getAttribute('data-preview');
        imgs.forEach(function (i) { i.classList.toggle('on', i.getAttribute('data-k') === k); });
        prev.classList.add('is-on'); prev.style.scale = '1'; active = true;
      });
      d.addEventListener('mouseleave', function () { prev.classList.remove('is-on'); prev.style.scale = '.6'; active = false; });
    });
    (function loop() {
      px = lerp(px, tx, 0.12); py = lerp(py, ty, 0.12);
      prev.style.transform = 'translate(' + px + 'px,' + py + 'px) rotate(' + ((tx - px) * 0.05) + 'deg)';
      requestAnimationFrame(loop);
    })();
  }

  /* ---------- hero: ghost parallax ---------- */
  var ghost = $('.hero-ghost');
  if (ghost && !reduce) {
    window.addEventListener('scroll', function () {
      var y = Math.min(window.scrollY, innerHeight);
      ghost.style.transform = 'translate(-50%, calc(-50% + ' + (y * 0.25) + 'px))';
    }, { passive: true });
  }

  /* ---------- hero: particle sculpture ---------- */
  var cv = $('#sculpture');
  function initKnot() {
    var ctx = cv.getContext('2d');
    var W, H, dpr, cx, cy, S;
    var small = innerWidth < 700;
    var N = small ? 2200 : 4800;
    var P = [];
    var pK = 2, qK = 3;
    function knot(t) {
      var r = Math.cos(qK * t) + 2;
      return [r * Math.cos(pK * t), r * Math.sin(pK * t), -Math.sin(qK * t)];
    }
    function norm(v) { var l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
    function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
    var STRANDS = 9;
    for (var i = 0; i < N; i++) {
      var dust = Math.random() < 0.08;
      var t = Math.random() * Math.PI * 2;
      var c0 = knot(t), c1 = knot(t + 0.01);
      var T = norm([c1[0] - c0[0], c1[1] - c0[1], c1[2] - c0[2]]);
      var Nv = norm(cross(T, [0.2, 0.1, 1]));
      var B = cross(T, Nv);
      var strand = i % STRANDS;
      var ang = (strand / STRANDS) * Math.PI * 2 + t * 5.0;
      var rad = 0.2 + 0.07 * Math.sin(t * 3 + strand);
      var jit = dust ? 0.6 + Math.random() * 1.1 : 0.02 + Math.random() * 0.05;
      var ox = Math.cos(ang) * rad + (Math.random() - 0.5) * jit;
      var oy = Math.sin(ang) * rad + (Math.random() - 0.5) * jit;
      var oz = (Math.random() - 0.5) * jit;
      P.push({
        x: c0[0] + Nv[0] * ox + B[0] * oy + oz * 0.3,
        y: c0[1] + Nv[1] * ox + B[1] * oy + oz * 0.3,
        z: c0[2] + Nv[2] * ox + B[2] * oy + oz * 0.3,
        dx: 0, dy: 0, vx: 0, vy: 0,
        s: dust ? 0.7 + Math.random() * 0.6 : 0.7 + Math.random() * 0.9,
        acc: Math.random() < 0.3, dust: dust,
        ph: Math.random() * 6.28
      });
    }
    var cFg = '#141413', cAcc = '#a9835a';
    function readColors() {
      var cs = getComputedStyle(root);
      cFg = cs.getPropertyValue('--fg').trim() || cFg;
      cAcc = cs.getPropertyValue('--accent').trim() || cAcc;
    }
    readColors();
    document.addEventListener('themechange', readColors);

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      var r = cv.getBoundingClientRect();
      W = r.width; H = r.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = W * (W > 900 ? 0.5 : 0.5); cy = H * (W > 900 ? 0.4 : 0.3);
      S = Math.min(W, H) * (W > 900 ? 0.088 : 0.1);
    }
    resize();
    window.addEventListener('resize', resize);

    var mouse = { x: -9999, y: -9999, nx: 0, ny: 0, in: false };
    var tilt = { x: 0, y: 0 };
    cv.addEventListener('mousemove', function (e) {
      var r = cv.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
      mouse.nx = (mouse.x / W - 0.5) * 2; mouse.ny = (mouse.y / H - 0.5) * 2; mouse.in = true;
    });
    cv.addEventListener('mouseleave', function () { mouse.x = mouse.y = -9999; mouse.nx = mouse.ny = 0; mouse.in = false; });
    // hero text sits above canvas (pointer-events none on wrapper) so track on window too
    window.addEventListener('mousemove', function (e) {
      var r = cv.getBoundingClientRect();
      if (e.clientY < r.top || e.clientY > r.bottom) return;
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
      mouse.nx = (mouse.x / W - 0.5) * 2; mouse.ny = (mouse.y / H - 0.5) * 2;
    }, { passive: true });
    // touch: drag to rotate/disturb
    cv.addEventListener('touchmove', function (e) {
      var r = cv.getBoundingClientRect(), t0 = e.touches[0];
      mouse.x = t0.clientX - r.left; mouse.y = t0.clientY - r.top;
      mouse.nx = (mouse.x / W - 0.5) * 2; mouse.ny = (mouse.y / H - 0.5) * 2;
    }, { passive: true });
    cv.addEventListener('touchend', function () { mouse.x = mouse.y = -9999; }, { passive: true });

    var visible = true, t0 = performance.now(), intro = 0;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }, { threshold: 0 }).observe(cv);
    }

    function frame(now) {
      requestAnimationFrame(frame);
      if (!visible && !reduce) return;
      var time = reduce ? 2 : (now - t0) / 1000;
      intro = Math.min(1, (now - t0) / 2600);
      var introE = 1 - Math.pow(1 - intro, 3);
      var scroll = Math.min(1, window.scrollY / (innerHeight * 0.9));
      tilt.x = lerp(tilt.x, mouse.nx, 0.05); tilt.y = lerp(tilt.y, mouse.ny, 0.05);
      var ry = time * 0.22 + tilt.x * 0.7;
      var rx = 0.45 + tilt.y * 0.35 + scroll * 0.6;
      var cyA = Math.cos(ry), syA = Math.sin(ry), cxA = Math.cos(rx), sxA = Math.sin(rx);
      var spread = (1 - introE) * 2.4 + scroll * 1.2;
      var sc = S * (1 + scroll * 0.35);
      ctx.clearRect(0, 0, W, H);
      var R = Math.min(W, H) * 0.12, R2 = R * R;
      var buckets = [[], [], []];
      for (var i = 0; i < P.length; i++) {
        var p = P[i];
        var bx = p.x, by = p.y, bz = p.z;
        // gentle breathing flow along the strand
        var wob = Math.sin(time * 0.9 + p.ph) * 0.02;
        bx += wob; by += wob * 0.6;
        // spread (intro + scroll)
        bx *= 1 + spread * 0.5 + (p.dust ? scroll * 0.8 : 0);
        by *= 1 + spread * 0.5 + (p.dust ? scroll * 0.8 : 0);
        bz *= 1 + spread * 0.5;
        // rotate Y then X
        var x1 = bx * cyA + bz * syA, z1 = -bx * syA + bz * cyA;
        var y2 = by * cxA - z1 * sxA, z2 = by * sxA + z1 * cxA;
        var f = 5.2 / (5.2 - z2 * 0.55);
        var sx = cx + x1 * sc * f + p.dx, sy = cy + y2 * sc * f + p.dy;
        // pointer repulsion with spring return
        var ddx = sx - mouse.x, ddy = sy - mouse.y, d2 = ddx * ddx + ddy * ddy;
        if (d2 < R2 && d2 > 0.01) {
          var d = Math.sqrt(d2), k = (1 - d / R);
          p.vx += (ddx / d) * k * 3.2; p.vy += (ddy / d) * k * 3.2;
        }
        p.vx += -p.dx * 0.045; p.vy += -p.dy * 0.045;
        p.vx *= 0.86; p.vy *= 0.86;
        p.dx += p.vx; p.dy += p.vy;
        var depth = (z2 + 3) / 6; // 0..1
        var b = depth > 0.62 ? 2 : depth > 0.38 ? 1 : 0;
        var size = p.s * f * (0.8 + depth * 0.9) * (dpr > 1 ? 1 : 1.05);
        buckets[b].push(sx, sy, size, p.acc ? 1 : 0);
      }
      var alphas = [0.28, 0.6, 0.95];
      var fade = (1 - scroll * 0.85) * (0.15 + introE * 0.85);
      for (var bi = 0; bi < 3; bi++) {
        var arr = buckets[bi];
        for (var pass = 0; pass < 2; pass++) {
          ctx.globalAlpha = alphas[bi] * fade;
          ctx.fillStyle = pass ? cAcc : cFg;
          for (var j = 0; j < arr.length; j += 4) {
            if (arr[j + 3] !== pass) continue;
            var s2 = arr[j + 2];
            ctx.fillRect(arr[j] - s2 / 2, arr[j + 1] - s2 / 2, s2, s2);
          }
        }
      }
      ctx.globalAlpha = 1;
    }
    if (reduce) { intro = 1; frame(performance.now()); } else requestAnimationFrame(frame);
  }

  /* ---------- hero: photo point cloud (hero slides become particles) ---------- */
  function initPhotoCloud(slides) {
    var ctx = cv.getContext('2d');
    var imgs = [], loaded = 0, failed = false;
    slides.forEach(function (src, k) {
      var im = new Image();
      im.onload = function () { if (++loaded === slides.length && !failed) start(); };
      im.onerror = function () { if (!failed) { failed = true; initKnot(); } };
      im.src = src; imgs[k] = im;
    });

    var W, H, d, step, cols, rows, n, buf32, imgData;
    var bx, by, lum, cr, cg, cb, dx, dy, vx, vy, sw, pend, colorsBySlide;
    var cur = 0, nextAt = 0, mouse = { x: -9999, y: -9999, nx: 0, ny: 0 }, tilt = { x: 0, y: 0 };
    var visible = true, quality = 1, lastT = 0, ema = 16, adapts = 0;

    function sample() {
      var r = cv.getBoundingClientRect();
      W = r.width; H = r.height;
      d = 1;
      cv.width = Math.round(W * d); cv.height = Math.round(H * d);
      step = Math.round((W < 700 ? 8 : 7) * quality);
      cols = Math.ceil(W / step); rows = Math.ceil(H / step); n = cols * rows;
      imgData = ctx.createImageData(cv.width, cv.height);
      buf32 = new Uint32Array(imgData.data.buffer);
      bx = new Float32Array(n); by = new Float32Array(n); lum = new Float32Array(n);
      dx = new Float32Array(n); dy = new Float32Array(n); vx = new Float32Array(n); vy = new Float32Array(n);
      sw = new Float32Array(n); pend = new Uint8Array(n);
      cr = new Uint8Array(n); cg = new Uint8Array(n); cb = new Uint8Array(n);
      var off = document.createElement('canvas'); off.width = cols; off.height = rows;
      var octx = off.getContext('2d', { willReadFrequently: true });
      colorsBySlide = imgs.map(function (im) {
        var sc = Math.max(cols / im.naturalWidth, rows / im.naturalHeight);
        var w = im.naturalWidth * sc, h = im.naturalHeight * sc;
        octx.clearRect(0, 0, cols, rows);
        octx.drawImage(im, (cols - w) / 2, (rows - h) / 2, w, h);
        return octx.getImageData(0, 0, cols, rows).data; // throws if canvas is tainted
      });
      for (var i = 0; i < n; i++) {
        bx[i] = (i % cols) * step + step / 2; by[i] = Math.floor(i / cols) * step + step / 2;
        var c = colorsBySlide[cur];
        cr[i] = c[i * 4]; cg[i] = c[i * 4 + 1]; cb[i] = c[i * 4 + 2];
        lum[i] = (0.3 * cr[i] + 0.59 * cg[i] + 0.11 * cb[i]) / 255;
        var a = Math.random() * 6.283, m = 30 + Math.random() * 260;
        dx[i] = Math.cos(a) * m; dy[i] = Math.sin(a) * m;
      }
    }

    function goTo(k, now) {
      cur = k;
      for (var i = 0; i < n; i++) { sw[i] = now + Math.random() * 1000; pend[i] = 1; }
      nextAt = now + 7000;
      var cnt = $('.slide-count b'); if (cnt) cnt.textContent = '0' + (cur + 1);
    }

    function start() {
      try { sample(); } catch (e) { initKnot(); return; }
      nextAt = performance.now() + 6500;
      var rt; window.addEventListener('resize', function () {
        clearTimeout(rt); rt = setTimeout(function () { try { sample(); } catch (e) {} }, 250);
      });
      window.addEventListener('mousemove', function (e) {
        var r = cv.getBoundingClientRect();
        mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
        mouse.nx = (mouse.x / W - 0.5) * 2; mouse.ny = (mouse.y / H - 0.5) * 2;
      }, { passive: true });
      cv.addEventListener('touchmove', function (e) {
        var r = cv.getBoundingClientRect(), q = e.touches[0];
        mouse.x = q.clientX - r.left; mouse.y = q.clientY - r.top;
      }, { passive: true });
      cv.addEventListener('touchend', function () { mouse.x = mouse.y = -9999; }, { passive: true });
      if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(cv);
      if (reduce) { for (var i = 0; i < n; i++) { dx[i] = dy[i] = 0; } draw(performance.now(), 0); }
      else requestAnimationFrame(loop);
    }

    function draw(now, scroll) {
      buf32.fill(0);
      var sz = Math.max(1, Math.round(step * d * 0.8));
      var cw = cv.width, ch = cv.height;
      var R = 90, R2 = R * R;
      var alpha = Math.round(255 * (1 - scroll * 0.9));
      var cxm = W / 2, cym = H / 2;
      var c = colorsBySlide[cur];
      for (var i = 0; i < n; i++) {
        if (pend[i] && now >= sw[i]) {
          pend[i] = 0;
          cr[i] = c[i * 4]; cg[i] = c[i * 4 + 1]; cb[i] = c[i * 4 + 2];
          lum[i] = (0.3 * cr[i] + 0.59 * cg[i] + 0.11 * cb[i]) / 255;
          var a = Math.random() * 6.283, m = 6 + Math.random() * 18;
          vx[i] += Math.cos(a) * m; vy[i] += Math.sin(a) * m;
        }
        var px = bx[i] + dx[i] + tilt.x * (lum[i] - 0.45) * 34 + (bx[i] - cxm) * scroll * 0.5;
        var py = by[i] + dy[i] + tilt.y * (lum[i] - 0.45) * 34 + (by[i] - cym) * scroll * 0.5;
        var ex = px - mouse.x, ey = py - mouse.y, d2 = ex * ex + ey * ey;
        if (d2 < R2 && d2 > 0.5) { var dd = Math.sqrt(d2), k = 1 - dd / R; vx[i] += ex / dd * k * 2.4; vy[i] += ey / dd * k * 2.4; }
        vx[i] += -dx[i] * 0.055; vy[i] += -dy[i] * 0.055; vx[i] *= 0.84; vy[i] *= 0.84;
        dx[i] += vx[i]; dy[i] += vy[i];
        var X = Math.round(px * d), Y = Math.round(py * d);
        if (X < 0 || Y < 0 || X + sz >= cw || Y + sz >= ch) continue;
        var r = Math.min(255, cr[i] * 1.3), g = Math.min(255, cg[i] * 1.3), b = Math.min(255, cb[i] * 1.3);
        var px32 = (alpha << 24) | (b << 16) | (g << 8) | r;
        for (var yy = 0; yy < sz; yy++) { var row = (Y + yy) * cw + X; for (var xx = 0; xx < sz; xx++) buf32[row + xx] = px32; }
      }
      ctx.putImageData(imgData, 0, 0);
    }

    function loop(now) {
      requestAnimationFrame(loop);
      if (!visible) { lastT = 0; return; }
      if (lastT) { ema = ema * 0.9 + Math.min(100, now - lastT) * 0.1; }
      lastT = now;
      if (ema > 36 && adapts < 2) { adapts++; quality *= 1.4; ema = 16; try { sample(); } catch (e) {} }
      tilt.x = lerp(tilt.x, mouse.nx, 0.05); tilt.y = lerp(tilt.y, mouse.ny, 0.05);
      if (now >= nextAt && window.scrollY < innerHeight * 0.5) goTo((cur + 1) % imgs.length, now);
      else if (now >= nextAt) nextAt = now + 1000;
      draw(now, Math.min(1, window.scrollY / (innerHeight * 0.9)));
    }
  }

  if (cv && cv.getContext) {
    // Slides come from real <img> tags so bundlers (e.g. Parcel) include and hash them
    var slideSrcs = $$('.hero-slides img').map(function (im) { return im.getAttribute('src'); });
    if (!slideSrcs.length && cv.getAttribute('data-slides')) slideSrcs = cv.getAttribute('data-slides').split(',');
    if (slideSrcs.length) initPhotoCloud(slideSrcs); else initKnot();
  }
})();
