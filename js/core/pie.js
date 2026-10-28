/* core/pie.js : 円グラフ(描画と出現アニメーション) */
(function (S) {
  var NS = 'http://www.w3.org/2000/svg', TAU = S.TAU, CX = 230, CY = 230, R = 170, pct = S.pct;
  function polar(r, a) { return [CX + r * Math.sin(a), CY - r * Math.cos(a)]; }
  function slicePath(a0, a1) {
    if (a1 - a0 >= TAU - 1e-4) return 'M' + (CX - R) + ' ' + CY + 'A' + R + ' ' + R + ' 0 1 1 ' + (CX + R) + ' ' + CY + 'A' + R + ' ' + R + ' 0 1 1 ' + (CX - R) + ' ' + CY + 'Z';
    var p0 = polar(R, a0), p1 = polar(R, a1), large = (a1 - a0) > Math.PI ? 1 : 0;
    return 'M' + CX + ' ' + CY + 'L' + p0[0].toFixed(2) + ' ' + p0[1].toFixed(2) + 'A' + R + ' ' + R + ' 0 ' + large + ' 1 ' + p1[0].toFixed(2) + ' ' + p1[1].toFixed(2) + 'Z';
  }
  function svgEl(name, attrs) { var n = document.createElementNS(NS, name); Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); }); return n; }
  function $$(s, r) { return S.$$(s, r); }

  function items() {
    var acc = 0, out = [], rank = S.state.stats.rank.filter(function (r) { return r.count > 0; });
    rank.forEach(function (r, i) {
      var a0 = acc * TAU; acc += r.share;
      var a1 = i === rank.length - 1 ? TAU : acc * TAU;
      out.push({ id: r.id, e: S.elOf(r.id), share: r.share, rank: r.rank, count: r.count, a0: a0, a1: a1, mid: (a0 + a1) / 2 });
    });
    return out;
  }
  function build(list) {
    var svg = svgEl('svg', { viewBox: '0 0 460 460', 'class': 'pie', role: 'img', 'aria-label': '重視する要素の割合の円グラフ' }), gs = {};
    list.forEach(function (it) {
      var g = svgEl('g', { 'class': 'slice', 'data-id': it.id });
      g.style.setProperty('--dx', (Math.sin(it.mid) * 14).toFixed(2) + 'px');
      g.style.setProperty('--dy', (-Math.cos(it.mid) * 14).toFixed(2) + 'px');
      g.style.setProperty('--c', S.colorVar(it.e));
      g.appendChild(svgEl('path', { d: slicePath(it.a0, it.a1) }));
      if (it.share >= 0.07) {
        var p = polar(R * (it.share > 0.3 ? 0.58 : 0.66), it.mid);
        var t1 = svgEl('text', { 'class': 't1', x: p[0].toFixed(1), y: (p[1] - 2).toFixed(1) }); t1.textContent = it.e.short || it.e.label;
        var t2 = svgEl('text', { 'class': 't2', x: p[0].toFixed(1), y: (p[1] + 17).toFixed(1) }); t2.textContent = pct(it.share) + '%';
        g.appendChild(t1); g.appendChild(t2);
      }
      svg.appendChild(g); gs[it.id] = g;
    });
    return { svg: svg, gs: gs, items: list };
  }
  function sweep(it, g, delay, dur) {
    return new Promise(function (resolve) {
      var path = g.querySelector('path'), texts = $$('text', g);
      path.setAttribute('d', '');
      texts.forEach(function (t) { t.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 350, delay: delay + dur * 0.75, fill: 'backwards' }); });
      var t0 = performance.now() + delay;
      (function tick(now) {
        if (now < t0) return requestAnimationFrame(tick);
        var p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
        path.setAttribute('d', slicePath(it.a0, it.a0 + (it.a1 - it.a0) * Math.max(e, 0.002)));
        if (p < 1) requestAnimationFrame(tick); else resolve();
      })(performance.now());
    });
  }
  function playAnim(it, g, i) {
    var kind = it.e.anim || 'pop', delay = it.e.animDelay != null ? it.e.animDelay : i * 150, dur = it.e.animMs || 750;
    var dx = Math.sin(it.mid) * 180, dy = -Math.cos(it.mid) * 180;
    if (kind === 'sweep') return sweep(it, g, delay, dur);
    var F = {
      pop: [{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1.12)', opacity: 1, offset: 0.65 }, { transform: 'scale(1)', opacity: 1 }],
      fade: [{ opacity: 0 }, { opacity: 1 }],
      rise: [{ transform: 'translateY(90px)', opacity: 0 }, { transform: 'none', opacity: 1 }],
      spin: [{ transform: 'rotate(-140deg) scale(.3)', opacity: 0 }, { transform: 'none', opacity: 1 }],
      fly: [{ transform: 'translate(' + dx + 'px,' + dy + 'px)', opacity: 0 }, { transform: 'none', opacity: 1 }]
    };
    var a = g.animate(F[kind] || F.pop, { duration: dur, delay: delay, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
    return a.finished.catch(function () { });
  }
  function animateIn(pie) {
    if (S.reduce || !pie.svg.animate) return Promise.resolve();
    return Promise.all(pie.items.map(function (it, i) { return playAnim(it, pie.gs[it.id], i); }));
  }
  /* 円グラフの周りを回る点線の輪(待機中のアニメーション) */
  function orbit(wrap) { return S.deco.add(wrap, 'orbit', 'inset:-7%'); }

  S.pie = { items: items, build: build, animateIn: animateIn, orbit: orbit, R: R, TAU: TAU };
})(window.Site);
