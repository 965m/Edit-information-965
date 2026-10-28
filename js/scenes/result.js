/* scenes/result.js : あなたの聴き方を選ぶ → おすすめ曲 */
(function (S) {
  var esc = S.esc;
  S.registerScene('result', {
    label: '結果', tone: 'dark', interactive: true,
    build: function (el) {
      var c = S.content, order = S.state.stats.rank.filter(function (r) { return r.count > 0; }).map(function (r) { return S.elOf(r.id); });
      var cards = order.map(function (e, i) { var st = S.ui.style(e); return '<li><button class="style-card" type="button" data-id="' + esc(e.id) + '" data-reveal style="--c:' + S.colorVar(e) + ';--d:' + (2 + i) + '"><span class="style-card__el">' + esc(e.label) + '</span><span class="style-card__name display">' + esc(st.name) + '</span><span class="style-card__desc">' + esc(st.desc) + '</span></button></li>'; }).join('');
      el.innerHTML = '<div class="scene__inner"><div class="result"><div>' + S.ui.title('h2', 'result__title', c.copy.resultTitle) + '<p class="scene__lead" data-reveal style="--d:1;margin-top:.4em">' + esc(c.copy.resultLead) + '</p><p class="result__join" data-reveal style="--d:2"><button class="btn btn--main" type="button" data-survey-open>' + esc(c.copy.surveyBtn) + '</button><span>2分ほど。送信すると集計に加わります</span></p></div><ul class="styles">' + cards + '</ul></div></div>' +
        '<div class="drawer" aria-hidden="true"><div class="drawer__panel" role="dialog" aria-label="おすすめの曲"><button class="drawer__close" type="button" aria-label="閉じる">×</button><div data-drawer></div></div></div>';
      S.deco.add(el, 'rings', 'right:-6%;top:-14%;width:min(46vw,420px);aspect-ratio:1;color:var(--accent);opacity:.35');
      var drawer = S.$('.drawer', el), body = S.$('[data-drawer]', el), stage = S.$('#stage'), cur = null;
      function paint() {
        var e = S.elOf(cur), lv = S.state.level || 3, st = S.ui.style(e);
        var chips = c.levels.map(function (l) { return '<button type="button" data-lv="' + l.level + '" aria-pressed="' + (l.level === lv) + '">' + esc(l.short) + '</button>'; }).join('');
        drawer.style.setProperty('--c', S.colorVar(e));
        body.innerHTML = '<h3 class="drawer__name display">' + esc(st.name) + '</h3><p class="drawer__desc">' + esc(st.desc) + '</p><p style="margin-top:1.2em;font-weight:900;font-size:.88rem">普段の聴く量</p><div class="chips">' + chips + '</div><ul class="songs">' + (S.ui.songsFor(e, lv) || '<li><b>この聴き方の曲は、まだありません</b></li>') + '</ul>';
        S.$$('[data-lv]', body).forEach(function (b) { b.addEventListener('click', function () { S.state.level = +b.dataset.lv; paint(); }); });
      }
      function open(id) { cur = id; paint(); stage.classList.add('is-drawer'); drawer.classList.add('is-open'); drawer.setAttribute('aria-hidden', 'false'); S.$('.drawer__close', el).focus({ preventScroll: true }); }
      function close() { stage.classList.remove('is-drawer'); drawer.classList.remove('is-open'); drawer.setAttribute('aria-hidden', 'true'); }
      S.$$('.style-card', el).forEach(function (b) { b.addEventListener('click', function () { open(b.dataset.id); }); });
      S.$('.drawer__close', el).addEventListener('click', close);
      drawer.addEventListener('click', function (ev) { if (ev.target === drawer) close(); });
      this.leave = close;
    },
    play: function () { return Promise.resolve(); }
  });
})(window.Site);
