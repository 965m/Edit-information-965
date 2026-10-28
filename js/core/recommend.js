/* core/recommend.js : おすすめ曲の設定(js/recommend.js と、シートの「おすすめ曲」タブ)を読み込む */
(function (S) {
  var base = [], sheet = [];
  function nrm(x) { return String(x == null ? '' : x).normalize('NFKC').toLowerCase().replace(/[\s　]+/g, ''); }
  function lvOf(v) {
    var n = parseInt(String(v == null ? '' : v).normalize('NFKC'), 10);
    if (n >= 1 && n <= 5) return n;
    var t = nrm(v), hit = ((S.content && S.content.levels) || []).filter(function (l) { return t && (nrm(l.short) === t || nrm(l.label) === t); })[0];
    return hit ? hit.level : 3;
  }
  function row(a) {
    var o = Array.isArray(a) ? { element: a[0], level: a[1], title: a[2], artist: a[3], note: a[4], link: a[5], ask: a[6], chorus: a[7] } : a;
    if (!o || !nrm(o.title) || !nrm(o.element)) return null;
    return { element: String(o.element), level: lvOf(o.level), title: String(o.title).trim(), artist: String(o.artist || '').trim(), note: String(o.note || '').trim(), link: String(o.link || '').trim(), ask: String(o.ask || '').trim(), chorus: o.chorus == null ? '' : String(o.chorus).trim() };
  }
  function build() { base = (window.SITE_RECOMMEND || []).map(row).filter(Boolean); }
  var HEAD = { element: '要素', level: '聴く量', title: '曲名', artist: 'アーティスト', note: 'ひとこと', link: 'リンク', ask: '質問', chorus: 'サビ' };
  function fromTable(t) {
    if (!t || t.length < 2) return [];
    var head = t[0].map(nrm), ci = {};
    Object.keys(HEAD).forEach(function (k) { ci[k] = head.findIndex(function (h) { return h && h.indexOf(nrm(HEAD[k])) >= 0; }); });
    if (ci.title < 0 || ci.element < 0) return [];
    return t.slice(1).map(function (r) { var o = {}; Object.keys(ci).forEach(function (k) { o[k] = ci[k] >= 0 ? r[ci[k]] : ''; }); return row(o); }).filter(Boolean);
  }
  function matchEl(r, e) {
    var k = nrm(r.element); if (!k) return false;
    return [e.id, e.label, e.short].concat(e.match || []).some(function (x) { return nrm(x) === k; });
  }
  S.recommend = {
    all: function () { return base.concat(sheet); },
    setSheet: function (t) { sheet = fromTable(t); },
    forElement: function (e) { return S.recommend.all().filter(function (r) { return matchEl(r, e); }).map(function (r) { return { title: r.title, artist: r.artist, note: r.note || '', level: r.level, link: r.link, chorus: r.chorus }; }); },
    /* 「おすすめを聞かれたら」の質問に合う曲。質問を指定した行があればそれだけ、なければその要素のおすすめ */
    forAsk: function (a, e) {
      var q = nrm(a.q), id = nrm(a.id || '');
      var own = S.recommend.all().filter(function (r) { var k = nrm(r.ask); return k && (k === q || (id && k === id)); });
      return own.length ? own.map(function (r) { return { title: r.title, artist: r.artist, note: r.note || '', level: r.level, link: r.link, chorus: r.chorus }; }) : null;
    }
  };
  build();
})(window.Site);
