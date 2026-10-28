/* core/deco.js : 線の飾り(待機中も動き続けるアニメーション)
   使い方: Site.deco.add(要素, '種類', 'CSSの位置指定')
   種類: rings(同心円) / rays(放射線) / wave(流れる波線) / zigzag / spiral / star(描かれる星) / orbit(円グラフの周りの点線) / underline(描かれる下線) */
(function (S) {
  function spiral() {
    var d = '', a, r;
    for (a = 0; a <= 12.5; a += 0.2) { r = 4 + a * 7; d += (a === 0 ? 'M' : 'L') + (100 + r * Math.cos(a)).toFixed(1) + ' ' + (100 + r * Math.sin(a)).toFixed(1); }
    return d;
  }
  function wavePath(w, h, len) {
    var d = 'M0 ' + h / 2, x = 0, up = true;
    while (x < w) { d += ' Q ' + (x + len / 2) + ' ' + (up ? 0 : h) + ' ' + (x + len) + ' ' + h / 2; x += len; up = !up; }
    return d;
  }
  var KIND = {
    rings: function () {
      var s = '<svg viewBox="0 0 200 200">';
      [95, 78, 62, 47, 33, 20].forEach(function (r, i) {
        s += '<g class="spin" style="animation-duration:' + (38 + i * 9) + 's;animation-direction:' + (i % 2 ? 'reverse' : 'normal') + '"><circle cx="100" cy="100" r="' + r + '" stroke-dasharray="' + (i % 2 ? '2 9' : '60 22 10 22') + '"/></g>';
      });
      return s + '</svg>';
    },
    rays: function () {
      var s = '<svg viewBox="0 0 200 200"><g class="spin" style="animation-duration:90s">', i, a;
      for (i = 0; i < 36; i++) { a = i * Math.PI / 18; s += '<line x1="' + (100 + 80 * Math.cos(a)).toFixed(1) + '" y1="' + (100 + 80 * Math.sin(a)).toFixed(1) + '" x2="' + (100 + (i % 3 ? 92 : 99) * Math.cos(a)).toFixed(1) + '" y2="' + (100 + (i % 3 ? 92 : 99) * Math.sin(a)).toFixed(1) + '"/>'; }
      return s + '</g></svg>';
    },
    wave: function () { return '<svg viewBox="0 0 600 40" preserveAspectRatio="none"><path class="flow" d="' + wavePath(640, 40, 40) + '"/></svg>'; },
    zigzag: function () { var d = 'M0 30', x; for (x = 0; x < 600; x += 20) d += 'L' + (x + 10) + ' 8L' + (x + 20) + ' 30'; return '<svg viewBox="0 0 600 40" preserveAspectRatio="none"><path class="flow" d="' + d + '"/></svg>'; },
    spiral: function () { return '<svg viewBox="0 0 200 200"><path class="draw" pathLength="1" d="' + spiral() + '"/></svg>'; },
    star: function () { return '<svg viewBox="0 0 120 120"><g class="wobble"><path class="draw" pathLength="1" d="M60 8 L74 46 L113 47 L82 71 L93 110 L60 87 L27 110 L38 71 L7 47 L46 46 Z"/></g></svg>'; },
    orbit: function () {
      var s = '<svg viewBox="0 0 200 200"><g class="spin" style="animation-duration:60s"><circle cx="100" cy="100" r="97" stroke-dasharray="1 7"/></g><g class="spin" style="animation-duration:80s;animation-direction:reverse"><circle cx="100" cy="100" r="92" stroke-dasharray="30 18" opacity=".7"/></g></svg>';
      return s;
    },
    underline: function () { return '<svg viewBox="0 0 300 14" preserveAspectRatio="none"><path class="draw" pathLength="1" d="M2 9 C 30 2, 50 13, 80 7 S 130 2, 160 8 S 220 13, 250 6 S 285 4, 298 8"/></svg>'; }
  };
  S.deco = {
    kinds: KIND,
    add: function (el, kind, css) {
      var d = document.createElement('div'); d.className = 'deco deco--' + kind; d.setAttribute('aria-hidden', 'true');
      d.style.cssText = css || ''; d.innerHTML = KIND[kind](); el.appendChild(d); return d;
    },
    svg: function (kind) { return KIND[kind](); }
  };
})(window.Site);
