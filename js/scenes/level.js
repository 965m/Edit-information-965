/* scenes/level.js : 聴く量を5段階で選ぶ(選ぶまで進まない) */
(function (S) {
  var esc = S.esc;
  S.registerScene('level', {
    label: 'あなたは', tone: 'accent', interactive: true,
    build: function (el) {
      var c = S.content;
      var tiles = c.levels.map(function (l, i) { return '<button class="level" type="button" data-level="' + l.level + '" data-reveal style="--d:' + (3 + i) + '"><span class="level__no">' + l.level + '</span><span class="level__label">' + esc(l.label) + '</span><span class="level__sub">' + esc(l.sub) + '</span></button>'; }).join('');
      el.innerHTML = '<div class="scene__inner"><div class="ask"><div>' + S.ui.title('h2', 'scene__title', c.copy.levelTitle) + '<p class="scene__lead" data-reveal style="--d:2">' + esc(c.copy.levelLead) + '</p></div><div class="levels">' + tiles + '</div></div></div>';
      S.deco.add(el, 'spiral', 'right:2%;top:7%;width:clamp(90px,16vw,200px);aspect-ratio:1;color:var(--ink);opacity:.6');
      S.deco.add(el, 'wave', 'left:0;right:0;bottom:44px;height:22px;color:var(--ink);opacity:.5');
      this.el = el;
    },
    play: function (ctx) {
      var self = this;
      return ctx.cancellable(function (done, entry) {
        S.$$('.level', self.el).forEach(function (b) {
          b.addEventListener('click', function () {
            S.state.level = +b.dataset.level; b.classList.add('is-picked');
            S.$$('.level', self.el).forEach(function (o) { o.disabled = true; });
            entry.t = setTimeout(done, 750);
          });
        });
      });
    }
  });
})(window.Site);
