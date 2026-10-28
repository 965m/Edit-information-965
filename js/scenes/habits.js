/* scenes/habits.js : 「みんなの聴き方」ページ
   聴く時間のランキング・よく使うプラットフォーム・新曲探しなどを、聴く量との相関つきで表示します。
   中身は core/ui.js の habitsHTML()(縦スクロールのページと共通)。表示する・しないは config.js の sceneOrder で切り替えます。 */
(function (S) {
  var esc = S.esc;
  S.registerScene('habits', {
    label: '聴き方', tone: 'light',
    build: function (el) {
      var c = S.content, n = S.state.stats.n;
      el.innerHTML = '<div class="scene__inner" style="overflow:auto">' + S.ui.title('h2', 'scene__title', c.copy.habitsTitle) + '<p class="scene__lead" data-reveal style="--d:1">' + esc(c.copy.habitsLead) + '(' + n + '人)</p>' + S.ui.habitsHTML() + '</div>';
      S.deco.add(el, 'wave', 'left:0;right:0;bottom:44px;height:22px;color:var(--ink);opacity:.35');
    },
    play: function (ctx) { return ctx.sleep(ctx.T.habitsMs || 14000); }
  });
})(window.Site);
