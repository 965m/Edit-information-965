/* scenes/overview.js : 全体の円グラフ */
(function (S) {
  var esc = S.esc, pct = S.pct;
  S.registerScene('overview', {
    label: '全体', tone: 'light',
    build: function (el) {
      var c = S.content, s = S.state.stats, items = S.pie.items();
      var legend = items.map(function (it, i) { return '<li style="--i:' + i + ';--c:' + S.colorVar(it.e) + '"><i></i>' + esc(it.e.label) + '<b>' + pct(it.share) + '%</b></li>'; }).join('');
      el.innerHTML = '<div class="scene__inner"><div class="split"><div class="overview-text">' + S.ui.title('h2', 'scene__title', c.copy.overviewTitle) + '<p class="scene__lead" data-reveal style="--d:2">' + esc(c.copy.overviewLead) + '(' + s.n + '人)</p><ul class="legend">' + legend + '</ul></div><div class="pie-wrap" data-pie></div></div></div>';
      var wrap = S.$('[data-pie]', el); S.pie.orbit(wrap);
      this.pie = S.pie.build(items); wrap.appendChild(this.pie.svg);
      S.deco.add(el, 'wave', 'left:0;right:0;bottom:44px;height:22px;color:var(--ink);opacity:.25');
    },
    play: function (ctx) { var self = this; return S.pie.animateIn(self.pie).then(function () { return ctx.sleep(ctx.T.overviewHoldMs); }); }
  });
})(window.Site);
