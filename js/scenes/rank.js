/* scenes/rank.js : 上位の要素を切り抜いて広げる(rank1〜rank5を登録。使う数は config.js の sceneOrder で決まる) */
(function (S) {
  var esc = S.esc, pct = S.pct;
  function ranked(k) { return S.state.stats.rank.filter(function (x) { return x.count > 0; })[k]; }

  function cardHTML(it, e) {
    return '<div class="focus__hint">クリックで次へ</div><div class="focus__body"><div><span class="focus__pill">' + it.rank + '位 ・ ' + pct(it.share) + '%(' + it.count + '人)</span><h3 class="focus__title display">' + esc(e.label) + '</h3><p class="focus__tag display">' + esc(S.ui.tagline(e)) + '</p>' + S.ui.commentsHTML(e) + '</div>' +
      '<div><p class="focus__text">' + esc(S.ui.bodyFor(e)) + '</p><dl class="facts">' + S.ui.factsHTML(e) + '</dl></div></div>';
  }

  function make(k) {
    return {
      label: (k + 1) + '位', tone: k % 2 === 0 ? 'dark' : 'light',
      skip: function () { return !ranked(k); },
      build: function (el) {
        var r = ranked(k); if (!r) { el.innerHTML = ''; return; }
        var e = S.elOf(r.id), items = S.pie.items(), it = items.filter(function (i) { return i.id === r.id; })[0];
        el.style.setProperty('--c', S.colorVar(e));
        el.innerHTML = '<div class="scene__inner"><div class="split"><div class="rank__text"><p class="rank__no" data-reveal>' + r.rank + '<small>位</small></p>' + S.ui.title('p', 'rank__label', e.label, 1) + '<p class="rank__pct" data-reveal style="--d:2">' + pct(r.share) + '%<span> ' + r.count + '人</span></p></div><div class="pie-wrap" data-pie></div></div></div>';
        var wrap = S.$('[data-pie]', el);
        S.deco.add(wrap, 'rays', 'inset:-16%;color:var(--c);opacity:.5');
        this.pie = S.pie.build(items); this.it = it; this.e = e; this.el = el;
        wrap.appendChild(this.pie.svg);
        S.deco.add(el, 'wave', 'left:0;right:0;bottom:44px;height:22px;color:var(--c);opacity:.6');
      },
      play: async function (ctx) {
        var self = this, g = self.pie.gs[self.it.id], fast = false, opened = false, fastRes, card, anim = null;
        var fastP = new Promise(function (r) { fastRes = r; });
        var others = Object.keys(self.pie.gs).filter(function (id) { return id !== self.it.id; }).map(function (id) { return self.pie.gs[id]; });
        /* 待つ。アニメーション中にクリックされたら、すぐ結果(開いた状態)まで進める */
        function wait(ms) { if (fast) return Promise.resolve(); var s = ctx.sleep(ms); s.catch(function () { }); return Promise.race([s, fastP]); }
        ctx.onAdvance(function () {
          if (!opened && !fast) { fast = true; self.el.classList.add('is-instant'); fastRes(); return true; }
          return false;
        });
        await wait(700);
        others.forEach(function (o) { o.classList.add('is-dim'); });
        await wait(750);
        g.classList.add('is-out');
        await wait(800);
        card = document.createElement('div'); card.className = 'focus'; card.innerHTML = cardHTML(self.it, self.e);
        self.el.appendChild(card);
        S.ui.mountComments(card);
        var cr = card.getBoundingClientRect(), gr = g.querySelector('path').getBoundingClientRect();
        g.classList.add('is-gone');
        if (!fast && card.animate && !S.reduce) {
          var dx = gr.left + gr.width / 2 - (cr.left + cr.width / 2), dy = gr.top + gr.height / 2 - (cr.top + cr.height / 2);
          anim = card.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + (gr.width / cr.width) + ',' + (gr.height / cr.height) + ')', borderRadius: '45%' }, { transform: 'none', borderRadius: '30px' }], { duration: 900, easing: 'cubic-bezier(.7,0,.2,1)', fill: 'both' });
        }
        if (fast) card.classList.add('is-open'); else requestAnimationFrame(function () { card.classList.add('is-open'); });
        await wait(950);
        if (anim) anim.finish();
        card.classList.add('is-open');
        opened = true;
        self.el.classList.remove('is-instant');   // 開いたあとは、コメントなどの動きを通常にもどす
        await ctx.waitAdvance();        // 開いたあとは、クリックされるまで進まない
      }
    };
  }
  for (var k = 0; k < 5; k++) S.registerScene('rank' + (k + 1), make(k));
})(window.Site);
