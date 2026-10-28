/* scenes/prologue.js : 「はじめる」のあとに出る導入の文章(モーショングラフィックス + 文字アニメーション)
   文章は js/content.js の prologue に書きます。1画面に収まらない分は、画面の中で順番に切り替えます。
   読み終わるのに十分な時間(文字数から計算)がたつと、次のページへ進みます。クリックで先へ進むこともできます。 */
(function (S) {
  var esc = S.esc;
  var COLS = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)', 'var(--c6)', 'var(--c7)', 'var(--c8)', 'var(--c9)'];

  function plain(l) { return String(l).replace(/\*\*/g, ''); }
  /* **強調** を含む1行を、1文字ずつ動かせる形にする */
  function lineHTML(text, base) {
    var parts = String(text).split('**'), i = 0, out = '';
    parts.forEach(function (p, k) {
      var chars = Array.from(p).map(function (ch) { return '<span class="ch" style="--i:' + (base + (i++)) + '">' + (ch === ' ' ? '&nbsp;' : esc(ch)) + '</span>'; }).join('');
      out += k % 2 ? '<mark class="pro__em">' + chars + '</mark>' : chars;
    });
    return { html: '<span class="pro__line">' + out + '</span>', n: i };
  }
  /* 1画面の文字が多すぎる時は、行ごとに画面を分ける */
  S.fxLine = lineHTML;
  function paginate(pages, maxChars) {
    var out = [];
    pages.forEach(function (pg) {
      var cur = [], n = 0;
      pg.lines.forEach(function (l) {
        var c = Array.from(plain(l)).length;
        if (cur.length && n + c > maxChars) { out.push(Object.assign({}, pg, { lines: cur })); cur = []; n = 0; }
        cur.push(l); n += c;
      });
      if (cur.length) out.push(Object.assign({}, pg, { lines: cur }));
    });
    return out;
  }
  function bg() {
    var staff = '', ring = '', ripple = '', i, k;
    for (i = 0; i < 5; i++) staff += '<path class="st__l" pathLength="1" d="M-20 ' + (90 + i * 46) + ' H1020" style="--d:' + (i * .12) + 's"/>';
    var dots = '';
    for (k = 0; k < 14; k++) dots += '<circle class="st__dot" cx="-30" cy="' + (90 + (k % 5) * 46) + '" r="' + (5 + (k * 7) % 9) + '" style="--dl:' + (k * -1.3).toFixed(1) + 's;--du:' + (9 + (k * 3) % 8) + 's;fill:' + COLS[k % COLS.length] + '"/>';
    var seg = [14, 9, 17, 11, 8, 12, 10, 9, 10], acc = 0;
    seg.forEach(function (v, j) { ring += '<circle class="rg__s" cx="200" cy="200" r="150" pathLength="100" stroke-dasharray="' + (v - 1.2) + ' ' + (100 - v + 1.2) + '" stroke-dashoffset="' + (-acc) + '" style="--dl:' + (j * .16).toFixed(2) + 's;stroke:' + COLS[j] + '"/>'; acc += v; });
    for (k = 0; k < 4; k++) ripple += '<circle class="rp__c" cx="200" cy="200" r="150" style="--dl:' + (k * -1.8) + 's"/>';
    return '<svg class="pro__bg pro__bg--staff" viewBox="0 0 1000 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' + staff + dots + '</svg>' +
      '<svg class="pro__bg pro__bg--ring" viewBox="0 0 400 400" aria-hidden="true"><circle class="rg__base" cx="200" cy="200" r="150" pathLength="100"/>' + ring + '<circle class="rg__in" cx="200" cy="200" r="104"/></svg>' +
      '<svg class="pro__bg pro__bg--ripple" viewBox="0 0 400 400" aria-hidden="true">' + ripple + '</svg>';
  }

  S.registerScene('prologue', {
    label: 'はじめに', tone: 'dark',
    build: function (el) {
      var P = S.content.prologue || { pages: [] }, pages = paginate(P.pages || [], P.maxChars || 40);
      this.pages = pages; this.P = P;
      var beats = pages.map(function (pg, i) {
        var n = 0, lines = pg.lines.map(function (l) { var r = lineHTML(l, n); n += r.n + 2; return r.html; }).join('');
        pg.chars = pages[i].lines.reduce(function (a, l) { return a + Array.from(plain(l)).length; }, 0);
        return '<div class="pro__beat' + (pg.big ? ' pro__beat--big' : '') + '" data-m="' + esc(pg.motion || 'staff') + '" aria-hidden="true"><p class="pro__text display">' + lines + '</p></div>';
      }).join('');
      var beads = pages.map(function () { return '<i></i>'; }).join('');
      el.innerHTML = '<div class="pro" data-m="staff">' + bg() + '<div class="pro__stack">' + beats + '</div>' +
        '<div class="pro__foot" aria-hidden="true"><span class="pro__beads">' + beads + '</span><span class="pro__bar"><i></i></span></div></div>';
      S.deco.add(el, 'wave', 'left:0;right:0;bottom:46px;height:24px;color:var(--accent);opacity:.5');
    },
    play: function (ctx) {
      var el = this.el, pages = this.pages, P = this.P, root = S.$('.pro', el), beats = S.$$('.pro__beat', el), beads = S.$$('.pro__beads i', el), bar = S.$('.pro__bar i', el);
      var skip = null, idx = 0;
      function hold(ms) { return ctx.cancellable(function (done, entry) { entry.t = setTimeout(done, S.reduce ? 80 : ms); skip = function () { clearTimeout(entry.t); done(); }; }); }
      ctx.onAdvance(function () { if (skip && idx < pages.length - 1) { var f = skip; skip = null; f(); return true; } return false; });
      function show(i) {
        beats.forEach(function (b, k) { b.classList.remove('is-on', 'is-out'); if (k === i) { void b.offsetWidth; b.classList.add('is-on'); b.setAttribute('aria-hidden', 'false'); } else b.setAttribute('aria-hidden', 'true'); });
        beads.forEach(function (b, k) { b.classList.toggle('is-on', k === i); b.classList.toggle('is-done', k < i); });
        root.dataset.m = pages[i].motion || 'staff';
      }
      function ms(pg, last) { return Math.max(P.minMs || 4200, (P.baseMs || 2200) + pg.chars * (P.perCharMs || 190)) + (last ? 900 : 0); }
      return (async function () {
        for (idx = 0; idx < pages.length; idx++) {
          var d = ms(pages[idx], idx === pages.length - 1);
          show(idx);
          bar.style.transition = 'none'; bar.style.width = '0%'; void bar.offsetWidth; bar.style.transition = 'width ' + d + 'ms linear'; bar.style.width = '100%';
          await hold(d);
          beats[idx].classList.add('is-out');
          if (idx < pages.length - 1) await ctx.sleep(S.reduce ? 0 : 520);
        }
      })();
    }
  });
})(window.Site);
