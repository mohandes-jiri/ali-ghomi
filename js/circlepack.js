/* Circle-packed work grid.
   Turns .work-grid (rectangular CSS grid) into circular cards in three sizes,
   packed tightly with a greedy tangent-circle algorithm. Without JS the
   regular grid is left untouched. */
(function () {
  'use strict';
  var grid = document.querySelector('.work-grid');
  if (!grid) return;
  var cards = Array.prototype.slice.call(grid.querySelectorAll('.work-card'));
  if (!cards.length) return;

  // Size pattern (L / M / S), cycled so every page gets a mix of all three.
  var PATTERN = ['L', 'S', 'M', 'S', 'M', 'L', 'S', 'M', 'S', 'L', 'M', 'S'];
  var sizes = cards.map(function (_, i) { return PATTERN[i % PATTERN.length]; });
  if (cards.length === 3) sizes = ['L', 'M', 'S'];
  // Manual control: <a class="work-card" data-size="L|M|S"> overrides the automatic pattern.
  cards.forEach(function (c, i) {
    var s = (c.getAttribute('data-size') || '').toUpperCase();
    if (s === 'L' || s === 'M' || s === 'S') sizes[i] = s;
  });
  cards.forEach(function (c, i) {
    c.classList.remove('size-L', 'size-M', 'size-S');
    c.classList.add('size-' + sizes[i]);
  });

  // Diameters as a fraction of container width (wide / narrow screens).
  function fractions(W) {
    return W < 560 ? { L: 0.64, M: 0.46, S: 0.32 }
         : W < 900 ? { L: 0.46, M: 0.32, S: 0.22 }
         :           { L: 0.33, M: 0.235, S: 0.16 };
  }

  function hit(x, y, R, placed) {
    for (var k = 0; k < placed.length; k++) {
      var p = placed[k], dx = x - p.x, dy = y - p.y, min = R + p.R - 0.01;
      if (dx * dx + dy * dy < min * min) return true;
    }
    return false;
  }

  // Candidate centres for a circle of radius R tangent to two objects.
  function tangentPoints(a, ra, b, rb, out) {
    var dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy);
    if (d < 1e-6 || d > ra + rb) return;
    var x = (ra * ra - rb * rb + d * d) / (2 * d), h2 = ra * ra - x * x;
    if (h2 < 0) return;
    var h = Math.sqrt(h2), mx = a.x + dx * x / d, my = a.y + dy * x / d;
    out.push({ x: mx + dy * h / d, y: my - dx * h / d }, { x: mx - dy * h / d, y: my + dx * h / d });
  }

  function pack(radii, W, gap) {
    var placed = [];
    radii.forEach(function (r) {
      var R = r + gap / 2, cand = [];
      cand.push({ x: R, y: R }, { x: W - R, y: R });
      placed.forEach(function (p) {
        // tangent to this circle and the left / right / top wall
        [R, W - R].forEach(function (wx) {
          var dx = wx - p.x, t = p.R + R, v = t * t - dx * dx;
          if (v >= 0) { var dy = Math.sqrt(v); cand.push({ x: wx, y: p.y - dy }, { x: wx, y: p.y + dy }); }
        });
        var dy2 = R - p.y, t2 = p.R + R, v2 = t2 * t2 - dy2 * dy2;
        if (v2 >= 0) { var dx2 = Math.sqrt(v2); cand.push({ x: p.x - dx2, y: R }, { x: p.x + dx2, y: R }); }
      });
      for (var i = 0; i < placed.length; i++)
        for (var j = i + 1; j < placed.length; j++)
          tangentPoints(placed[i], placed[i].R + R, placed[j], placed[j].R + R, cand);

      var best = null, bestScore = Infinity;
      cand.forEach(function (c) {
        if (c.x < R - 0.01 || c.x > W - R + 0.01 || c.y < R - 0.01) return;
        if (hit(c.x, c.y, R, placed)) return;
        var score = c.y + c.x * 0.02;
        if (score < bestScore) { bestScore = score; best = c; }
      });
      if (!best) { // fallback: drop below everything
        var bottom = placed.reduce(function (m, p) { return Math.max(m, p.y + p.R); }, 0);
        best = { x: W / 2, y: bottom + R };
      }
      placed.push({ x: best.x, y: best.y, R: R, r: r });
    });
    return placed;
  }

  function layout() {
    var W = grid.clientWidth;
    if (!W) return;
    var f = fractions(W), gap = Math.max(10, W * 0.012);
    var radii = sizes.map(function (s) { return f[s] * W / 2; });
    var placed = pack(radii, W, gap);

    // centre the cluster horizontally, trim vertical extent
    var minX = Infinity, maxX = -Infinity, maxY = 0;
    placed.forEach(function (p) {
      minX = Math.min(minX, p.x - p.R); maxX = Math.max(maxX, p.x + p.R); maxY = Math.max(maxY, p.y + p.R);
    });
    var shift = (W - (maxX - minX)) / 2 - minX;

    grid.classList.add('is-packed');
    grid.style.height = Math.ceil(maxY) + 'px';
    placed.forEach(function (p, i) {
      var c = cards[i], d = p.r * 2;
      c.style.width = c.style.height = d + 'px';
      c.style.left = (p.x + shift - p.r) + 'px';
      c.style.top = (p.y - p.r) + 'px';
    });
  }

  layout();
  var lastW = grid.clientWidth, raf;
  function schedule() {
    var w = grid.clientWidth;
    if (w === lastW) return;
    lastW = w; cancelAnimationFrame(raf); raf = requestAnimationFrame(layout);
  }
  if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(grid);
  else window.addEventListener('resize', schedule);
})();
