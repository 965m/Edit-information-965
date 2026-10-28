/* scenes/intro.js : はじまりの画面 */
(function (S) {
  var esc = S.esc;
  S.registerScene('intro', {
    label: 'はじまり', tone: 'dark', interactive: true,   // interactive: クリックでは進まない(「はじめる」ボタンだけで始まる)
    build: function (el) {
      var c = S.content, lines = c.intro.titleLines.map(function (l, i) { return '<span class="line"><span style="--i:' + i + '">' + esc(l) + '</span></span>'; }).join('');
      el.innerHTML = '<div class="scene__inner"><div class="intro"><p class="intro__kicker" data-reveal>' + esc(c.meta.course) + ' ／ ' + esc(c.meta.respondentsNote) + '</p><h1 class="intro__title display">' + lines + '</h1><p class="intro__lead" data-reveal style="--d:6">' + esc(c.intro.lead) + '</p><div class="intro__go" data-reveal style="--d:8"><button class="start" type="button" data-start><span class="start__ring" aria-hidden="true"></span><span class="start__ring start__ring--2" aria-hidden="true"></span><span class="start__label display">' + esc(c.intro.startLabel || 'はじめる') + '</span><svg class="start__arrow" viewBox="0 0 48 16" aria-hidden="true"><path d="M2 8h42M36 2l8 6-8 6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></button><p class="intro__hint">押すとスタート。始まったあとは、画面のどこをクリックしても次へ進みます。</p></div></div></div>';
      S.deco.add(el, 'star', 'right:3%;top:9%;width:clamp(90px,18vw,220px);aspect-ratio:1;color:var(--accent)');
      S.deco.add(el, 'rings', 'right:-10%;bottom:-22%;width:min(62vw,560px);aspect-ratio:1;color:var(--accent);opacity:.4');
      S.deco.add(el, 'wave', 'left:0;right:0;bottom:46px;height:26px;color:var(--paper);opacity:.55');
      S.deco.add(el, 'zigzag', 'left:0;right:0;bottom:78px;height:20px;color:var(--accent);opacity:.8');
    },
    /* 「はじめる」が押されるまで、ここで止まって待つ(自動では進まない) */
    play: function (ctx) {
      var btn = S.$('[data-start]', this.el);
      return ctx.cancellable(function (done) {
        if (!btn) return done();
        setTimeout(function () { try { btn.focus({ preventScroll: true }); } catch (e) { } }, 1200);
        btn.addEventListener('click', function () { btn.classList.add('is-go'); done(); }, { once: true });
      }).then(function () { return ctx.sleep(420); })
        .then(function () { return Promise.race([ctx.data(), ctx.sleep(2000).catch(function () { })]); });
    }
  });
})(window.Site);
