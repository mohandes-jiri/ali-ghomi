// Password gate for the whole site (Cloudflare Pages Functions).
// Runs on the server before ANY file (pages, images, PDFs) is served.
//
// Setup: Cloudflare dashboard > Workers & Pages > your project > Settings >
// Variables and Secrets > add a secret named SITE_PASSWORD (Production, and
// Preview if you use it). The password is never stored in this repository.
// Optional: SESSION_DAYS (default 7) controls how long a login lasts.

import PHOTO from './lib/photo.js';

const COOKIE = 'site_auth';
const LOGIN_PATH = '/__login';

const enc = new TextEncoder();

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function sha(text) { // equal-length digests so comparison does not leak length
  const d = await crypto.subtle.digest('SHA-256', enc.encode(text));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function getCookie(request, name) {
  const m = (request.headers.get('Cookie') || '').match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : '';
}

async function hasValidSession(request, password) {
  const [exp, sig] = getCookie(request, COOKIE).split('.');
  if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) < Date.now()) return false;
  return safeEqual(sig, await hmac(password, 'session:' + exp));
}

function safeNext(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') &&
    !value.startsWith('/\\') && !value.startsWith(LOGIN_PATH) ? value : '/';
}

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const LINKEDIN = 'https://www.linkedin.com/in/ali-t-ghomi';
const BRIEF = 'Ali Tabatabaie Ghomi is a designer specializing in computational design and digital fabrication, with a Master of Science in Design from the University of Pennsylvania. His work spans architecture, furniture, product design, and experimental art.';

function loginPage(next, error) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Ali Ghomi</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@300;400;500;600&family=Space+Grotesk:wght@300&display=swap" rel="stylesheet">
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  html, body { min-height: 100%; margin: 0; }
  body { background: #0e0e0d; color: #eeebe4; display: grid; place-items: center; padding: 40px 24px;
         font-family: "Inter Tight", "Inter", system-ui, -apple-system, "Segoe UI", sans-serif; }
  main { width: 100%; max-width: 440px; text-align: center; }
  .portrait { width: 240px; height: 240px; margin: 0 auto 28px; border-radius: 50%; overflow: hidden;
              background: #1a1a18; box-shadow: 0 0 0 1px rgba(238,235,228,.18), 0 0 0 8px #0e0e0d, 0 0 0 9px rgba(238,235,228,.1); cursor: pointer; }
  .portrait canvas, .portrait img { width: 100%; height: 100%; display: block; }
  .brand { font-family: "Space Grotesk", "Inter Tight", system-ui, sans-serif; font-weight: 300; font-size: 40px; letter-spacing: -.01em; margin: 0 0 14px; }
  .brand em { font-family: inherit; font-weight: inherit; font-style: normal; }
  .brief { margin: 0 0 32px; color: #a29e93; font-size: 14.5px; line-height: 1.65; }
  form { display: flex; gap: 8px; }
  input { flex: 1; min-width: 0; padding: 14px 18px; border-radius: 999px; border: 1px solid rgba(238,235,228,.18);
          background: #1a1a18; color: inherit; font: inherit; font-size: 15px; outline: none; }
  input:focus { border-color: rgba(238,235,228,.55); }
  button, .btn { padding: 14px 22px; border-radius: 999px; border: 0; background: #eeebe4; color: #0e0e0d; font: inherit; font-size: 15px; font-weight: 500; cursor: pointer;
                 text-decoration: none; display: inline-flex; align-items: center; gap: 8px; }
  button:hover, .btn:hover { background: #fff; }
  .err { color: #e58b7a; font-size: 13px; margin: 14px 0 0; min-height: 1.2em; }
  .contact { margin-top: 36px; padding-top: 28px; border-top: 1px solid rgba(238,235,228,.12); }
  .contact p { margin: 0 0 16px; color: #a29e93; font-size: 14px; line-height: 1.5; }
  .btn.ghost { background: transparent; color: #eeebe4; border: 1px solid rgba(238,235,228,.35); }
  .btn.ghost:hover { background: #eeebe4; color: #0e0e0d; }
</style>
</head>
<body>
<main>
  <div class="portrait" id="portrait" title="Click to scatter">
    <img id="photo" src="${PHOTO}" alt="Ali Tabatabaie Ghomi">
  </div>
  <h1 class="brand">Ali <em>Ghomi</em></h1>
  <p class="brief">${esc(BRIEF)}</p>
  <form method="post" action="${LOGIN_PATH}">
    <input type="hidden" name="next" value="${esc(next)}">
    <input type="password" name="password" placeholder="Password" autocomplete="current-password" autofocus required aria-label="Password">
    <button type="submit">Enter</button>
  </form>
  <div class="err" role="alert">${error ? 'Incorrect password. Please try again.' : ''}</div>
  <div class="contact">
    <p>This portfolio is private. Interested in seeing the work or need the password? Get in touch.</p>
    <a class="btn ghost" href="${LINKEDIN}" target="_blank" rel="noopener">Get in contact
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 8h11M9 4l4 4-4 4"/></svg></a>
  </div>
</main>
<script>
/* Same particle-pixel effect as the home page hero (js/modern.js), scaled to the circular portrait:
   the photo is sampled into a grid of small squares that start scattered, spring back into the
   portrait, and react to the cursor. Click to scatter them again. */
(function () {
  var img = document.getElementById('photo'), box = document.getElementById('portrait');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function start() {
    var W = box.clientWidth, H = box.clientHeight;
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d');
    var step = 5, cols = Math.ceil(W / step), rows = Math.ceil(H / step), n = cols * rows;
    var imgData = ctx.createImageData(W, H), buf32 = new Uint32Array(imgData.data.buffer);
    var off = document.createElement('canvas'); off.width = cols; off.height = rows;
    var octx = off.getContext('2d', { willReadFrequently: true });
    var sc = Math.max(cols / img.naturalWidth, rows / img.naturalHeight);
    var w = img.naturalWidth * sc, h = img.naturalHeight * sc;
    var c;
    try { octx.drawImage(img, (cols - w) / 2, (rows - h) / 2, w, h); c = octx.getImageData(0, 0, cols, rows).data; }
    catch (e) { return; }
    var bx = new Float32Array(n), by = new Float32Array(n), lum = new Float32Array(n);
    var dx = new Float32Array(n), dy = new Float32Array(n), vx = new Float32Array(n), vy = new Float32Array(n);
    var cr = new Uint8Array(n), cg = new Uint8Array(n), cb = new Uint8Array(n);
    var sw = new Float32Array(n), pend = new Uint8Array(n);
    for (var i = 0; i < n; i++) {
      bx[i] = (i % cols) * step + step / 2; by[i] = Math.floor(i / cols) * step + step / 2;
      cr[i] = c[i * 4]; cg[i] = c[i * 4 + 1]; cb[i] = c[i * 4 + 2];
      lum[i] = (0.3 * cr[i] + 0.59 * cg[i] + 0.11 * cb[i]) / 255;
      if (!reduce) { var a = Math.random() * 6.283, m = 20 + Math.random() * 130; dx[i] = Math.cos(a) * m; dy[i] = Math.sin(a) * m; }
    }
    box.replaceChild(cv, img);
    var mouse = { x: -9999, y: -9999, nx: 0, ny: 0 }, tilt = { x: 0, y: 0 }, visible = true;
    function lerp(a, b, t) { return a + (b - a) * t; }

    function scatter(now) {            // same "pop" the hero uses when the slide changes
      for (var i = 0; i < n; i++) { sw[i] = now + Math.random() * 600; pend[i] = 1; }
    }

    function draw(now) {
      buf32.fill(0);
      var sz = Math.max(1, Math.round(step * 0.8)), R = 45, R2 = R * R;
      for (var i = 0; i < n; i++) {
        if (pend[i] && now >= sw[i]) {
          pend[i] = 0;
          var a = Math.random() * 6.283, m = 5 + Math.random() * 14;
          vx[i] += Math.cos(a) * m; vy[i] += Math.sin(a) * m;
        }
        var px = bx[i] + dx[i] + tilt.x * (lum[i] - 0.45) * 12;
        var py = by[i] + dy[i] + tilt.y * (lum[i] - 0.45) * 12;
        var ex = px - mouse.x, ey = py - mouse.y, d2 = ex * ex + ey * ey;
        if (d2 < R2 && d2 > 0.5) { var dd = Math.sqrt(d2), k = 1 - dd / R; vx[i] += ex / dd * k * 2.4; vy[i] += ey / dd * k * 2.4; }
        vx[i] += -dx[i] * 0.055; vy[i] += -dy[i] * 0.055; vx[i] *= 0.84; vy[i] *= 0.84;
        dx[i] += vx[i]; dy[i] += vy[i];
        var X = Math.round(px), Y = Math.round(py);
        if (X < 0 || Y < 0 || X + sz >= W || Y + sz >= H) continue;
        var r = Math.min(255, cr[i] * 1.3), g = Math.min(255, cg[i] * 1.3), b = Math.min(255, cb[i] * 1.3);
        var px32 = (255 << 24) | (b << 16) | (g << 8) | r;
        for (var yy = 0; yy < sz; yy++) { var row = (Y + yy) * W + X; for (var xx = 0; xx < sz; xx++) buf32[row + xx] = px32; }
      }
      ctx.putImageData(imgData, 0, 0);
    }

    function loop(now) {
      requestAnimationFrame(loop);
      if (!visible) return;
      tilt.x = lerp(tilt.x, mouse.nx, 0.05); tilt.y = lerp(tilt.y, mouse.ny, 0.05);
      draw(now);
    }
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
    cv.addEventListener('click', function () { if (!reduce) scatter(performance.now()); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(cv);
    if (reduce) draw(performance.now()); else requestAnimationFrame(loop);
  }
  if (img.complete && img.naturalWidth) start(); else img.addEventListener('load', start);
})();
</script>
</body>
</html>`;
}

function htmlResponse(body, status) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}

export async function onRequest(context) {
  const { request, env } = context;
  const password = env.SITE_PASSWORD;

  // Fail closed: never serve the site if the password has not been configured.
  if (!password) {
    return new Response('Site is locked: SITE_PASSWORD is not configured.', {
      status: 503, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
  }

  const url = new URL(request.url);

  if (url.pathname === LOGIN_PATH && request.method === 'POST') {
    let form;
    try { form = await request.formData(); } catch (e) { return htmlResponse(loginPage('/', true), 400); }
    const given = String(form.get('password') || '');
    const next = safeNext(String(form.get('next') || '/'));
    if (safeEqual(await sha(given), await sha(password))) {
      const days = Math.max(1, Number(env.SESSION_DAYS) || 7);
      const exp = Date.now() + days * 86400000;
      const token = exp + '.' + await hmac(password, 'session:' + exp);
      return new Response(null, {
        status: 303,
        headers: {
          Location: next,
          'Cache-Control': 'no-store',
          'Set-Cookie': `${COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${days * 86400}; HttpOnly; Secure; SameSite=Lax`,
        },
      });
    }
    await new Promise(r => setTimeout(r, 800)); // slow down guessing
    return htmlResponse(loginPage(next, true), 401);
  }

  if (await hasValidSession(request, password)) {
    if (url.pathname === LOGIN_PATH) return Response.redirect(url.origin + '/', 303);
    return context.next();
  }

  // Not logged in. Show the password page for page loads; plain 401 for everything else (images, scripts, PDFs...).
  const wantsPage = request.method === 'GET' && (request.headers.get('Accept') || '').includes('text/html');
  if (wantsPage) return htmlResponse(loginPage(safeNext(url.pathname + url.search), false), 401);
  return new Response('Unauthorized', { status: 401, headers: { 'Cache-Control': 'no-store' } });
}
