/* flow.js : 横スクロールのあとの、縦スクロールのページ(回答データに合わせて自動で描き直されます) */
(function (S) {
  var esc = S.esc, pct = S.pct, state = S.state, $ = S.$, $$ = S.$$, TAU = S.TAU;
  var curDetail = null, lastSig = '';
  /* 円グラフ(または右の順位表)をクリックした時だけ、その要素の説明を1つ出す(ページが長くならないように) */
  function showDetail(id, quiet) {
    var slot = $('#detailSlot'), r = state.stats.rank.filter(function (x) { return x.id === id && x.count > 0; })[0];
    if (!slot || !r) return;
    curDetail = id;
    slot.innerHTML = detailHTML(r);
    slot.classList.toggle('is-quiet', !!quiet);
    slot.classList.add('is-open');
    S.ui.mountComments(slot);
    $$('[data-back]', slot).forEach(function (a) { a.addEventListener('click', function (ev) { ev.preventDefault(); hideDetail(); var o = $('#overview'); if (o) o.scrollIntoView({ behavior: S.reduce ? 'auto' : 'smooth' }); }); });
    $$('#rankList li').forEach(function (li) { li.classList.toggle('is-picked', li.dataset.id === id); });
    if (!quiet) { var t = $('.detail', slot); if (t) t.scrollIntoView({ behavior: S.reduce ? 'auto' : 'smooth', block: 'start' }); }
  }
  function hideDetail() { curDetail = null; var slot = $('#detailSlot'); if (slot) { slot.innerHTML = ''; slot.classList.remove('is-open'); } $$('#rankList li').forEach(function (li) { li.classList.remove('is-picked'); }); }
  function jumpTo(id) { showDetail(id); }
  function heading(cls, text) { return '<h2 class="' + cls + ' display">' + esc(text) + '</h2><span class="scribble" aria-hidden="true">' + S.deco.svg('underline') + '</span>'; }

  function detailHTML(r) {
    var e = S.elOf(r.id), s = state.stats;
    var quotes = S.ui.commentsHTML(e);
    var songs = S.ui.songsTop(e, 6);
    return '<section class="detail" id="el-' + esc(e.id) + '" style="--c:' + S.colorVar(e) + '"><div class="wrap detail__grid">' +
      '<div class="detail__rank"><span class="detail__no">' + r.rank + '</span><div><p class="detail__pct display">' + pct(r.share) + '%</p><p class="detail__n">' + r.count + '人 / ' + s.n + '人</p></div></div>' +
      '<div><h3 class="detail__label display">' + esc(e.label) + '</h3><p class="detail__tag display">' + esc(S.ui.tagline(e)) + '</p><p class="detail__body">' + esc(S.ui.bodyFor(e)) + '</p><dl class="facts">' + S.ui.factsHTML(e) + '</dl>' + quotes +
      (function () { var d = (s.facts[e.id] || {}).dislikes || []; var t = d.length ? d.map(function (x) { return x.label + (x.count > 1 ? '(' + x.count + '人)' : ''); }).join('、') : e.dislike; return t ? '<p class="detail__dislike"><b>この聴き方の人が苦手なのは</b>' + esc(t) + '</p>' : ''; })() +
      (songs ? '<h4 class="detail__songs-title">この聴き方に合う曲</h4><ul class="songs">' + songs + '</ul>' : '') +
      '<a class="backlink" href="#overview" data-back>円グラフにもどる</a></div></div></section>';
  }

  function mountPie(items) {
    var zone = $('#flowPie'), listRoot = $('#rankList'), readout = $('#readout');
    var pie = S.pie.build(items); zone.appendChild(pie.svg);
    var def = '円グラフに近づく(またはタップ)と、項目が浮き上がります。', active = null, R = S.pie.R;
    readout.textContent = def;
    function set(id) {
      if (id === active) return; active = id;
      Object.keys(pie.gs).forEach(function (k) { pie.gs[k].classList.toggle('is-hot', k === id); pie.gs[k].classList.toggle('is-faded', !!id && k !== id); });
      $$('li', listRoot).forEach(function (li) { li.classList.toggle('is-hot', li.dataset.id === id); });
      var it = items.filter(function (x) { return x.id === id; })[0];
      readout.textContent = it ? it.e.label + ' ' + pct(it.share) + '%(' + it.count + '人)  クリックで説明を表示' : def;
      zone.style.cursor = id ? 'pointer' : '';
    }
    function hit(ev) {
      var r = pie.svg.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      var dx = ev.clientX - cx, dy = ev.clientY - cy, rad = r.width * (R / 460);
      if (Math.hypot(dx, dy) > rad * 1.3) return null;
      var a = Math.atan2(dx, -dy); if (a < 0) a += TAU;
      return items.filter(function (it) { return a >= it.a0 && a < it.a1; })[0] || null;
    }
    zone.addEventListener('pointermove', function (ev) { var h = hit(ev); set(h ? h.id : null); });
    zone.addEventListener('pointerleave', function () { set(null); });
    zone.addEventListener('click', function (ev) { var h = hit(ev); if (h) jumpTo(h.id); });
    items.forEach(function (it) {
      var g = pie.gs[it.id];
      g.setAttribute('tabindex', '0'); g.setAttribute('role', 'link'); g.setAttribute('aria-label', it.e.label + ' ' + pct(it.share) + '%、説明を表示');
      g.addEventListener('focus', function () { set(it.id); }); g.addEventListener('blur', function () { set(null); });
      g.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); jumpTo(it.id); } });
    });
    $$('li', listRoot).forEach(function (li) {
      li.addEventListener('mouseenter', function () { set(li.dataset.id); });
      li.addEventListener('mouseleave', function () { set(null); });
      $('a', li).addEventListener('click', function (ev) { ev.preventDefault(); jumpTo(li.dataset.id); });
    });
  }

  function lookupNote() {
    if (!S.lookup || !S.lookup.enabled || state.source !== 'live') return '';
    var t = S.lookup.status();
    return '<p id="lookupNote">曲のリンク・曲名の照合: ' + (t.pending ? '調べ中(残り ' + t.pending + ' 件)' : '完了') + (t.ok ? ' ／ 見つかった ' + t.ok + ' 件' : '') + '</p>';
  }
  var io = null, disSel = 0, askSel = 0;
  function songLi(x) { return '<li><b>' + esc(x.title) + '</b><span>' + esc(x.artist || '') + '</span>' + (x.count > 1 ? '<em>×' + x.count + '</em>' : '') + '</li>'; }
  function paintDis(root) {
    var s = state.stats, d = s.dislikes[disSel], p = $('#disPanel', root); if (!p || !d) return;
    var words = (d.words || []).filter(function (w) { return w !== d.label; });
    p.innerHTML = '<h3 class="display">「' + esc(d.label) + '」が苦手</h3><p class="side__sub">' + d.count + '人' + (words.length ? ' ／ まとめた表現: ' + esc(words.join('、')) : '') + '</p>' +
      (d.songs.length ? '<p class="side__lead">この要素が苦手な人があげた、苦手な曲の例</p><ul class="songs songs--dis">' + d.songs.map(songLi).join('') + '</ul>'
        : '<p class="empty">この要素が苦手な人から、苦手な曲の例はまだ集まっていません。</p>');
  }
  function paintAsk(root) {
    var c = S.content, s = state.stats, tips = (c.askTips || []).map(function (a) { return { a: a, e: S.elOf(a.element) }; }).filter(function (x) { return x.e && s.count[x.e.id]; });
    var x = tips[askSel], p = $('#askPanel', root); if (!p || !x) return;
    var st = S.ui.style(x.e), html = S.ui.askSongs(x.a, x.e);
    p.style.setProperty('--c', S.colorVar(x.e));
    p.innerHTML = '<h3 class="display">' + esc(x.a.q) + '</h3><p class="side__sub">「はい」なら → ' + esc(st.name) + '</p>' + (x.a.hint ? '<p class="side__lead">' + esc(x.a.hint) + '</p>' : '') +
      (html ? '<ul class="songs">' + html + '</ul>' : '<p class="empty">この質問のおすすめ曲は、まだ設定されていません。</p>');
  }
  function mountSplit(root) {
    $$('[data-dis]', root).forEach(function (b) { b.addEventListener('click', function () { disSel = +b.dataset.dis; $$('[data-dis]', root).forEach(function (o) { var on = o === b; o.classList.toggle('is-on', on); o.setAttribute('aria-pressed', on); }); paintDis(root); }); });
    $$('[data-ask]', root).forEach(function (b) { b.addEventListener('click', function () { askSel = +b.dataset.ask; $$('[data-ask]', root).forEach(function (o) { var on = o === b; o.classList.toggle('is-on', on); o.setAttribute('aria-pressed', on); }); paintAsk(root); }); });
    paintDis(root); paintAsk(root);
  }
  function render() {
    var c = S.content, s = state.stats, root = $('#flow'); if (!root) return;
    /* 中身が変わっていない再描画はしない(曲の照合が1件終わるたびに画面が揺れるのを防ぐ) */
    var sig = JSON.stringify([s, state.source, state.status, state.liveCount, S.recommend ? S.recommend.all().length : 0, S.dataForced && S.dataForced()]);
    if (sig === lastSig && root.children.length) { var ln = $('#lookupNote', root); if (ln) ln.outerHTML = lookupNote(); return; }
    if (S.preview) S.preview.stop();
    var again = !!lastSig && root.children.length > 0, keepY = window.scrollY;
    lastSig = sig;
    var ranked = s.rank.filter(function (r) { return r.count > 0; });
    var list = ranked.map(function (r) { var e = S.elOf(r.id); return '<li data-id="' + esc(e.id) + '" style="--c:' + S.colorVar(e) + '"><a href="#el-' + esc(e.id) + '"><i></i><span>' + esc(e.label) + '</span><b>' + pct(r.share) + '%</b></a></li>'; }).join('');
    if (disSel >= s.dislikes.length) disSel = 0;
    var dis = s.dislikes.length
      ? '<div class="split"><ul class="dislike-bars">' + s.dislikes.map(function (d, i) { return '<li><button type="button" class="pick' + (i === disSel ? ' is-on' : '') + '" data-dis="' + i + '" aria-pressed="' + (i === disSel) + '"><span>' + esc(d.label) + '</span><span class="track2"><i style="--w:' + (d.count / s.dislikes[0].count * 100).toFixed(1) + '%"></i></span><b>' + d.count + '</b></button></li>'; }).join('') + '</ul><aside class="side" id="disPanel" aria-live="polite"></aside></div>'
      : '<p class="empty" style="margin-top:1.4em">苦手な音楽の回答はまだありません。</p>';
    var ex = '';
    var tips = (c.askTips || []).map(function (a) { return { a: a, e: S.elOf(a.element) }; }).filter(function (x) { return x.e && s.count[x.e.id]; });
    if (askSel >= tips.length) askSel = 0;
    var asks = tips.map(function (x, i) { return '<li style="--c:' + S.colorVar(x.e) + '"><button type="button" class="pick pick--ask' + (i === askSel ? ' is-on' : '') + '" data-ask="' + i + '" aria-pressed="' + (i === askSel) + '"><span class="q">' + esc(x.a.q) + '</span><span class="a">' + esc(x.a.hint || '') + '</span></button></li>'; }).join('');
    var src = state.source === 'live' ? 'フォームの回答' : (state.status === 'waiting' ? '仮のデータ(回答が ' + (state.liveCount || 0) + ' 人。' + ((S.config.source || {}).minResponses == null ? 10 : S.config.source.minResponses) + ' 人集まると、回答に切り替わります)' : (state.status === 'error' ? '仮のデータ(回答を読み込めませんでした)' : '仮のデータ'));
    var upd = '';
    root.innerHTML =
      '<div class="checker" aria-hidden="true"></div>' +
      '<section class="band band--light" id="overview"><div class="wrap">' + heading('band__title', c.copy.overviewTitle) + '<p class="band__lead">円グラフに近づくと、その項目が浮き上がります。クリックすると、その項目のくわしい説明がすぐ下に出ます。</p>' +
      '<div class="overview"><div class="pie-zone" id="flowPie"></div><ol class="rank-list" id="rankList">' + list + '</ol></div><p class="readout" id="readout" aria-live="polite"></p></div></section>' +
      '<div class="detail-slot" id="detailSlot" aria-live="polite"></div>' +
      '<section class="band" id="correlation"><div class="wrap">' + heading('band__title', c.copy.corrTitle) + '<p class="band__lead">' + esc(c.copy.corrLead) + '</p><div class="flow-corr" id="flowCorr"></div></div></section>' +
      '<section class="band band--light" id="habits"><div class="wrap">' + heading('band__title', c.copy.habitsTitle) + '<p class="band__lead">' + esc(c.copy.habitsLead) + '</p>' + S.ui.habitsHTML('rank') + (s.artists && s.artists.length ? '<h3 class="display" style="margin-top:2.2em;font-size:1.2rem">' + esc(c.copy.artistsTitle) + '</h3><div class="chips" style="margin-top:.8em">' + s.artists.map(function (a) { return '<span class="chip">' + esc(a.name) + (a.count > 1 ? ' ×' + a.count : '') + '</span>'; }).join('') + '</div>' : '') + '</div></section>' +
      '<section class="band" id="quirks"><div class="wrap">' + heading('band__title', c.copy.quirksTitle) + '<p class="band__lead">' + esc(c.copy.quirksLead) + '</p>' + S.ui.habitsHTML('quirks') + '</div></section>' +
      '<section class="band band--light" id="dislikes"><div class="wrap">' + heading('band__title', c.copy.dislikeTitle) + '<p class="band__lead">' + esc(c.copy.dislikeLead) + '</p>' + dis + ex + '</div></section>' +
      '<section class="band" id="ask"><div class="wrap">' + heading('band__title', c.copy.askTitle) + '<p class="band__lead">' + esc(c.copy.askLead) + '</p><div class="split split--ask"><ul class="asks">' + asks + '</ul><aside class="side" id="askPanel" aria-live="polite"></aside></div></div></section>' +
      (S.config.survey && S.config.survey.enabled === false ? '' : '<section class="band band--cta" id="join"><div class="wrap">' + heading('band__title', c.copy.surveyCtaTitle) + '<p class="band__lead">' + esc(c.copy.surveyCtaLead) + '</p><button class="btn btn--main btn--big" type="button" data-survey-open>' + esc(c.copy.surveyBtn) + '</button></div></section>') +
      '<footer class="foot"><div class="wrap"><p>' + esc(c.copy.footerNote) + '</p>' + lookupNote() + '<div class="foot__idle">' + S.dataToggleHTML() + S.idle.toggleHTML() + '</div></div></footer>';

    root.classList.toggle('flow--again', again);
    var corr = S.ui.corrChart(), fc = $('#flowCorr', root); fc.appendChild(corr.children[0]); fc.appendChild(corr.children[0]);
    if (io) io.disconnect();
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in-view'); if (en.target.id === 'flowCorr') S.ui.revealCorr(en.target); io.unobserve(en.target); } }); }, { threshold: 0.25 });
      $$('.band__title', root).forEach(function (h) { io.observe(h.parentNode); });
      io.observe(fc);
    } else { $$('.band__title', root).forEach(function (h) { h.parentNode.classList.add('in-view'); }); S.ui.revealCorr(fc); }
    S.ui.mountComments(root);
    mountSplit(root);
    mountPie(S.pie.items());
    if (curDetail) showDetail(curDetail, true);
    if (again) window.scrollTo({ top: keepY, behavior: 'instant' });
  }
  /* 要素の説明を開いている時、ボタン以外の場所をクリックしたら閉じて円グラフにもどる */
  var awayBound = false;
  function bindAway() {
    if (awayBound) return; awayBound = true;
    document.addEventListener('click', function (ev) {
      if (!curDetail || document.documentElement.classList.contains('is-modal')) return;
      var t = ev.target; if (!t.closest || !t.closest('#flow')) return;
      if (t.closest('button, a, input, select, textarea, label, iframe, [role="switch"], [data-play], .song__player, .songs, .detail__songs-title, #flowPie, #rankList, .survey')) return;
      if (window.getSelection && String(window.getSelection())) return;        // 文字を選択している時は閉じない
      hideDetail();
      var o = $('#overview'); if (o) o.scrollIntoView({ behavior: S.reduce ? 'auto' : 'smooth' });
    });
  }
  bindAway();
  S.flow = { render: render };
})(window.Site);
