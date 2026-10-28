/* scenes/quirks.js : 「聴き方のクセ」ページ(繰り返し聴く / 歌なしの曲 / 新しい曲探し)
   はい/いいえの人数に加えて、聴く量・重視する要素との関係(相関)を表示します。中身は core/ui.js の habitsHTML('quirks')。 */
(function (S) {
  var esc = S.esc;
  S.registerScene('quirks', {
    label: 'クセ', tone: 'accent',
    build: function (el) {
      var c = S.content;
      el.innerHTML = '<div class="scene__inner" style="overflow:auto">' + S.ui.title('h2', 'scene__title', c.copy.quirksTitle) + '<p class="scene__lead" data-reveal style="--d:1">' + esc(c.copy.quirksLead) + '</p>' + S.ui.habitsHTML('quirks') + '</div>';
      S.deco.add(el, 'zigzag', 'left:0;right:0;bottom:44px;height:18px;color:var(--ink);opacity:.45');
    },
    play: function (ctx) { return ctx.sleep(ctx.T.habitsMs || 14000); }
  });
})(window.Site);
