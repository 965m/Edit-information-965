/* scenes/corr.js : 聴く量と重視する要素の相関 */
(function (S) {
  var esc = S.esc;
  S.registerScene('corr', {
    label: '相関', tone: 'light',
    build: function (el) {
      var c = S.content;
      el.innerHTML = '<div class="scene__inner" style="overflow:auto">' + S.ui.title('h2', 'corr-title', c.copy.corrTitle) + '<p class="scene__lead" data-reveal style="--d:2;margin-bottom:.4em">' + esc(c.copy.corrLead) + '</p></div>';
      this.chart = S.ui.corrChart(); S.$('.scene__inner', el).appendChild(this.chart);
      S.deco.add(el, 'zigzag', 'left:0;right:0;bottom:44px;height:18px;color:var(--c2);opacity:.7');
    },
    play: function (ctx) { var self = this; return ctx.sleep(500).then(function () { S.ui.revealCorr(self.chart); return ctx.sleep(ctx.T.corrDwellMs); }); }
  });
})(window.Site);
