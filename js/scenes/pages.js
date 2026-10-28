/* scenes/pages.js : content.js の pages に書いた文章ページを、コードなしで場面として登録する */
(function (S) {
  var esc = S.esc;
  (S.content.pages || []).forEach(function (p) {
    S.registerScene(p.id, {
      label: p.label || p.title || p.id, tone: p.tone || 'dark',
      build: function (el) {
        var lines = (p.lines || []).map(function (l, i) { return '<p class="page__line" data-reveal style="--d:' + (i + 2) + '">' + esc(S.fmt(l)) + '</p>'; }).join('');
        el.innerHTML = '<div class="scene__inner"><div class="page">' + S.ui.title('h2', 'scene__title', S.fmt(p.title || '')) + lines + '</div></div>';
        (p.deco || ['wave']).forEach(function (k, i) {
          var pos = { wave: 'left:0;right:0;bottom:' + (44 + i * 30) + 'px;height:22px;opacity:.5', zigzag: 'left:0;right:0;bottom:' + (44 + i * 30) + 'px;height:18px;opacity:.6', rings: 'right:-8%;bottom:-20%;width:min(52vw,480px);aspect-ratio:1;opacity:.35', rays: 'right:4%;top:10%;width:min(30vw,300px);aspect-ratio:1;opacity:.45', spiral: 'right:4%;top:8%;width:min(18vw,200px);aspect-ratio:1;opacity:.6', star: 'right:6%;top:10%;width:min(18vw,200px);aspect-ratio:1' };
          S.deco.add(el, k, (pos[k] || '') + ';color:var(--line-c)');
        });
      },
      play: function (ctx) { return ctx.sleep(p.holdMs || 5000); }
    });
  });
})(window.Site);
