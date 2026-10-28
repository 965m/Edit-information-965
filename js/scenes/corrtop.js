/* scenes/corrtop.js : 聴く量との関係が最も強かった要素を、1つだけ取り上げて紹介するページ
   文章 + 軽いグラフ(聴く量ごとに、その要素を選んだ人の割合)。corr の次に並びます。 */
(function (S) {
  var esc = S.esc;
  function pick() {
    var s = S.state.stats, list = s.corr.filter(function (x) { return s.count[x.id] > 0; });
    if (!list.length) return null;
    return list.slice().sort(function (a, b) { return Math.abs(b.r) - Math.abs(a.r); })[0];
  }
  S.registerScene('corrTop', {
    label: '最も関係が強い要素', tone: 'dark',
    skip: function () { return !pick() || S.state.stats.nLevel < 6; },
    build: function (el) {
      var s = S.state.stats, c = S.content, top = pick();
      if (!top) { el.innerHTML = ''; return; }
      var e = S.elOf(top.id), col = S.colorVar(e), r = top.r, strong = Math.abs(r) >= 0.1;
      var bars = c.levels.map(function (l) {
        var b = s.byLevel[l.level], p = b.n ? (b.counts[top.id] || 0) / b.n * 100 : 0;
        return '<div class="ct__col"><span class="ct__v">' + Math.round(p) + '%</span><span class="ct__bar"><i style="--h:' + p.toFixed(1) + '%"></i></span><span class="ct__l"><b>' + l.level + '</b>' + esc(l.short) + '</span></div>';
      }).join('');
      var sentence = !strong ? '聴く量と重視する要素の間に、はっきりした関係は見つかりませんでした。'
        : (r > 0 ? 'よく聴く人ほど' : 'あまり聴かない人ほど') + '「' + esc(e.label) + '」を一番に選びやすい、という傾向です。';
      el.innerHTML = '<div class="scene__inner ct" style="--c:' + col + '">' +
        '<p class="ct__kicker" data-reveal style="--d:0">聴く量との関係が、いちばん強かった要素</p>' +
        '<h2 class="ct__name display" data-reveal style="--d:1">' + esc(e.label) + '</h2>' +
        '<p class="ct__r" data-reveal style="--d:2"><b>r = ' + S.fmtR(r) + '</b><span>' + esc(S.corrWord(r)) + '</span></p>' +
        '<p class="ct__sentence" data-reveal style="--d:3">' + sentence + '</p>' +
        '<div class="ct__chart" data-reveal style="--d:4" aria-label="聴く量ごとに「' + esc(e.label) + '」を選んだ人の割合">' + bars + '</div>' +
        '<p class="ct__note" data-reveal style="--d:5">棒は、聴く量のグループごとに「' + esc(e.label) + '」を一番重視すると答えた人の割合。' + s.nLevel + '人の回答から計算。</p></div>';
      var ripples = [0, 1, 2].map(function (i) { return '<i style="--dl:' + (i * -3).toFixed(1) + 's"></i>'; }).join('');
      el.insertAdjacentHTML('afterbegin', '<div class="ct-bg" style="--c:' + col + '" aria-hidden="true"><div class="ct-bg__ripples">' + ripples + '</div></div>');
      S.deco.add(el, 'rings', 'right:-6%;top:-14%;width:min(54vw,500px);aspect-ratio:1;color:' + col + ';opacity:.42');
      S.deco.add(el, 'spiral', 'left:-8%;bottom:-22%;width:min(38vw,360px);aspect-ratio:1;color:' + col + ';opacity:.22');
      S.deco.add(el, 'wave', 'left:0;right:0;bottom:46px;height:24px;color:var(--paper);opacity:.45');
    },
    play: function (ctx) {
      var el = this.el;
      return ctx.sleep(600).then(function () { S.$$('.ct__chart', el).forEach(function (n) { n.classList.add('in'); }); return ctx.sleep(ctx.T.corrTopMs || 9000); });
    }
  });
})(window.Site);
