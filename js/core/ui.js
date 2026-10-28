/* core/ui.js : 複数のページで使う部品(相関グラフ、説明の事実、曲リスト) */
(function (S) {
  var esc = S.esc, pct = S.pct, state = S.state;
  function content() { return S.content; }

  function factsFor(e) {
    var f = state.stats.facts[e.id] || {};
    var names = function (a) { return (a || []).map(function (x) { return x.name; }); };
    return {
      genres: names(f.genres).length ? names(f.genres) : (e.genres || []),
      artists: names(f.artists).length ? names(f.artists) : (e.artists || []),
      favs: (f.songs && f.songs.length) ? f.songs.map(function (x) { return x.title; }) : (e.favs || []),
      subs: (f.subs || []).map(function (x) { var o = S.elOf(x.id); return o ? o.label : ''; }).filter(Boolean),
      dislikes: (f.dislikes || []).map(function (x) { return x.label + (x.count > 1 ? ' ×' + x.count : ''); }),
      dislikeSongs: (f.dislikeSongs || []).map(function (x) { return x.title + (x.artist ? ' / ' + x.artist : ''); })
    };
  }
  function chips(a) { return (a || []).map(function (x) { return '<span class="chip">' + esc(x) + '</span>'; }).join(''); }
  function factsHTML(e) {
    var f = factsFor(e);
    return [['よく聴くジャンル', f.genres], ['よく聴くアーティスト', f.artists], ['好きな曲', f.favs], ['ほかに大事にしていること', f.subs], ['苦手な要素', f.dislikes], ['苦手な曲の例', f.dislikeSongs]]
      .filter(function (x) { return x[1] && x[1].length; })
      .map(function (x) { return '<div><dt>' + x[0] + '</dt><dd>' + chips(x[1]) + '</dd></div>'; }).join('');
  }
  function tagline(e) { return e.tagline || '「' + e.label + '」を一番に挙げた人たち'; }
  function bodyFor(e) {
    if (e.body) return e.body;
    var r = state.stats.rank.filter(function (x) { return x.id === e.id; })[0];
    return r ? r.count + '人(' + pct(r.share) + '%)が、音楽でいちばん重視する要素に「' + e.label + '」を挙げました。' : '';
  }
  function style(e) { return e.style || { name: e.label + 'で聴く聴き方', desc: '「' + e.label + '」を一番に聴く人向け。' }; }

  function tierLabel(level) { var t = content().tiers.filter(function (x) { return level <= x.max; })[0]; return t ? t.label : ''; }
  /* おすすめ曲 = 回答者が挙げた曲 + content.js に書いた曲 */
  function songList(e) {
    var fromData = ((state.stats.facts[e.id] || {}).songs || []).map(function (s) { return { title: s.title, artist: s.artist || '', note: '回答者のおすすめ', level: s.level, link: s.link, data: true }; });
    return fromData.concat((e.songs || []).map(function (s) { return Object.assign({}, s); })).concat(S.recommend ? S.recommend.forElement(e) : []);
  }
  function songRow(s, badge) {
    var link = s.link ? ' <a href="' + esc(s.link) + '" target="_blank" rel="noopener">聴いてみる</a>' : '';
    var play = s.title ? '<button type="button" class="play" data-play data-title="' + esc(s.title) + '" data-artist="' + esc(s.artist || '') + '" data-link="' + esc(s.link || '') + '" data-chorus="' + esc(s.chorus || '') + '" aria-label="' + esc(s.title) + 'を再生(サビ付近)" title="サビ付近を試聴"><span aria-hidden="true">▶</span></button>' : '';
    return '<li class="song"><div class="song__main"><b>' + esc(s.title) + '</b><span>' + esc(s.artist) + (s.artist && s.note ? ' ／ ' : '') + esc(s.note || '') + link + '</span>' + badge + '</div>' + play + '</li>';
  }
  function songsFor(e, level) {
    return songList(e).sort(function (a, b) { return Math.abs(a.level - level) - Math.abs(b.level - level) || a.level - b.level; }).slice(0, 6)
      .map(function (s) { return songRow(s, Math.abs(s.level - level) <= 1 ? '<em class="fit">あなたの聴く量にちょうどいい</em>' : '<em>' + esc(tierLabel(s.level)) + '</em>'); }).join('');
  }
  function songsAll(e) {
    return songList(e).sort(function (a, b) { return a.level - b.level; }).map(function (s) { return songRow(s, '<em>' + esc(tierLabel(s.level)) + '</em>'); }).join('');
  }

  function songsTop(e, n) {
    return songList(e).sort(function (a, b) { return a.level - b.level; }).slice(0, n || 6).map(function (s) { return songRow(s, '<em>' + esc(tierLabel(s.level)) + '</em>'); }).join('');
  }
  /* 「おすすめを聞かれたら」の質問に合う曲(右側に出す) */
  function askSongs(a, e) {
    var own = S.recommend ? S.recommend.forAsk(a, e) : null;
    if (!own) return songList(e).sort(function (a, b) { return a.level - b.level; }).slice(0, 6).map(function (s) { return songRow(s, '<em>' + esc(tierLabel(s.level)) + '</em>'); }).join('');
    return own.slice(0, 8).sort(function (x, y) { return x.level - y.level; }).map(function (s) { return songRow(s, '<em>' + esc(tierLabel(s.level)) + '</em>'); }).join('');
  }

  /* 相関グラフ */
  function strengthWord(r) { var a = Math.abs(r); return a < 0.1 ? 'ほぼ関係なし' : a < 0.25 ? '弱い関係' : a < 0.45 ? 'ある程度の関係' : '強い関係'; }
  function verdictHTML() {
    var s = state.stats;
    if (s.nLevel < 6) return '<div class="verdict">聴く量の回答がまだ少ないため、傾向は出していません。<small>回答が集まると自動で更新されます。</small></div>';
    var top = s.corr.slice().sort(function (a, b) { return Math.abs(b.r) - Math.abs(a.r); })[0], e = S.elOf(top.id);
    var body = Math.abs(top.r) < 0.1
      ? '聴く量と重視する要素の間に、はっきりした関係は見つかりませんでした。'
      : '聴く量と最も関係が強かったのは「' + esc(e.label) + '」(r = ' + (top.r > 0 ? '+' : '') + top.r.toFixed(2) + ')。' + (top.r > 0 ? 'よく聴く人ほど' : 'あまり聴かない人ほど') + '選びやすい傾向です。';
    return '<div class="verdict" style="--c-v:' + S.colorVar(e) + '">' + body + '<small>' + s.nLevel + '人の回答から計算。相関係数 r が+1に近いほど「よく聴く人ほど選ぶ」、−1に近いほど「あまり聴かない人ほど選ぶ」。' + (Math.abs(top.r) >= 0.1 ? '今回は「' + strengthWord(top.r) + '」。' : '') + '</small></div>';
  }
  function corrChart() {
    var c = content(), s = state.stats, els = state.elements;
    var rows = c.levels.map(function (l) {
      var b = s.byLevel[l.level];
      var segs = els.filter(function (e) { return b.counts[e.id] > 0; }).map(function (e) {
        var p = b.counts[e.id] / b.n * 100;
        return '<i class="seg" style="--w:' + p.toFixed(2) + '%;--c:' + S.colorVar(e) + '" title="' + esc(e.label) + ' ' + Math.round(p) + '%"><span>' + (p >= 12 ? Math.round(p) + '%' : '') + '</span></i>';
      }).join('');
      return '<div class="bar"><div class="bar__label"><b>' + l.level + '</b>' + esc(l.short) + '</div><div class="bar__track">' + (segs || '<em>回答なし</em>') + '</div><span class="bar__n">' + b.n + '人</span></div>';
    }).join('');
    var legend = els.filter(function (e) { return s.count[e.id] > 0; }).map(function (e) { return '<span><i style="--c:' + S.colorVar(e) + '"></i>' + esc(e.short || e.label) + '</span>'; }).join('');
    var rl = s.corr.filter(function (x) { return s.count[x.id] > 0; }).sort(function (a, b) { return b.r - a.r; }).map(function (x) {
      var e = S.elOf(x.id), a = Math.min(1, Math.abs(x.r));
      return '<li><span>' + esc(e.short || e.label) + '</span><span class="rscale"><i class="' + (x.r >= 0 ? 'pos' : 'neg') + '" style="--a:' + a.toFixed(3) + ';--c:' + S.colorVar(e) + '"></i></span><span class="rval">' + (x.r > 0 ? '+' : '') + x.r.toFixed(2) + '</span></li>';
    }).join('');
    var root = document.createElement('div'); root.className = 'corr';
    root.innerHTML = '<div><div class="bars">' + rows + '</div><div class="bar-legend">' + legend + '</div></div>' +
      '<div class="corr__side"><div class="rblock"><h3 class="display" style="font-size:1.05rem">要素ごとの相関(r)</h3><ul class="rlist" style="margin-top:10px">' + rl + '</ul><div class="raxis" style="margin-top:6px"><span>← あまり聴かない人</span><span>よく聴く人 →</span></div></div>' + verdictHTML() + '</div>';
    return root;
  }
  function revealCorr(root) {
    var go = function () { S.$$('.bars, .rlist', root).forEach(function (n) { n.classList.add('in'); }); };
    if (S.reduce) go(); else requestAnimationFrame(function () { requestAnimationFrame(go); });
  }


  /* みんなの聴き方(聴く時間・プラットフォーム・新曲探し)のランキングと相関。場面とスクロールページの両方で使います */
  function lvLabel(l) { return (content().levels.filter(function (x) { return x.level === l; })[0] || {}).label || ('Lv' + l); }
  function lvSub(l) { return (content().levels.filter(function (x) { return x.level === l; })[0] || {}).sub || ''; }
  function barRows(items) {
    var max = items.length ? Math.max.apply(null, items.map(function (x) { return x.count; })) || 1 : 1;
    return items.map(function (x) { return '<li><span>' + esc(x.name) + (x.note ? '<small>' + esc(x.note) + '</small>' : '') + '</span><span class="track2"><i style="--w:' + (x.count / max * 100).toFixed(1) + '%"></i></span><b>' + x.count + '</b></li>'; }).join('');
  }
  function rNote(label, r, extra) {
    return '<p class="habit__r"><b>' + esc(label) + '</b> r = ' + S.fmtR(r) + '(' + esc(S.corrWord(r)) + ')' + (extra ? '<small>' + extra + '</small>' : '') + '</p>';
  }
  function habitsHTML(part) {
    var s = state.stats, n = s.n, t = s.time, pl = s.platforms, h = s.habits, enough = s.nLevel >= 6;
    // 1. 聴く時間
    var tRows = t.rank.map(function (x) { return { name: lvLabel(x.level), note: lvSub(x.level), count: x.count }; });
    var topEl = enough ? s.corr.slice().sort(function (a, b) { return Math.abs(b.r) - Math.abs(a.r); })[0] : null, topE = topEl && S.elOf(topEl.id);
    var timeCard = '<section class="habit" data-reveal style="--d:2"><h3 class="display">1日に聴く時間ランキング</h3>' +
      '<ul class="dislike-bars">' + barRows(tRows) + '</ul>' +
      (enough && t.avg != null ? '<p class="habit__r"><b>平均</b> ' + (t.rank[0] && t.rank[0].count ? '最も多いのは「' + esc(lvLabel(t.rank[0].level)) + '」' : '') + '(平均 ' + t.avg.toFixed(1) + ' / 5)</p>' : '') +
      (topE && Math.abs(topEl.r) >= 0.1 ? rNote('重視する要素との相関', topEl.r, '最も関係が強いのは「' + esc(topE.label) + '」。' + (topEl.r > 0 ? 'よく聴く人ほど' : 'あまり聴かない人ほど') + '選ぶ傾向です。') : '') + '</section>';
    // 2. プラットフォーム
    var heavy = pl.filter(function (x) { return x.count >= 2 && x.avg != null; }).sort(function (a, b) { return b.avg - a.avg; })[0];
    var plRows = pl.slice(0, 6).map(function (x) { return { name: x.name, note: x.avg != null ? '平均' + x.avg.toFixed(1) + '・r ' + S.fmtR(x.r) : '', count: x.count }; });
    var platCard = '<section class="habit" data-reveal style="--d:3"><h3 class="display">よく使うプラットフォーム</h3>' +
      (pl.length ? '<ul class="dislike-bars">' + barRows(plRows) + '</ul>' : '<p class="empty">まだ回答がありません</p>') +
      (heavy && enough ? '<p class="habit__r"><b>聴く量が最も多い</b> 「' + esc(heavy.name) + '」を使う人(平均 ' + heavy.avg.toFixed(1) + ' / 5)</p>' : '') +
      (enough ? rNote('使うアプリの数との相関', s.platformCount.r, '1人あたり平均 ' + s.platformCount.avg.toFixed(1) + ' 個') : '') + '</section>';
    if (part === 'quirks') return '<div class="habits">' + s.quirks.map(quirkCard).join('') + '</div>';
    return '<div class="habits habits--2">' + timeCard + platCard + '</div>';
  }
  /* はい/いいえの質問 1枚ぶん: 主役は「重視する要素との相関」。人数(はい/いいえ)は細い帯で、聴く量との相関は補足として小さく */
  function quirkCard(q, i) {
    var enough = q.n >= 6, cand = q.byEl.filter(function (x) { return x.n >= 2; }), hero = '';
    if (!q.n) hero = '<p class="empty">まだ回答がありません</p>';
    else if (!enough || cand.length < 2) hero = '<div class="hero hero--wait"><p>回答が少ないため、重視する要素との関係はまだ出していません。</p></div>';
    else {
      var byR = cand.slice().sort(function (a, b) { return Math.abs(b.r) - Math.abs(a.r); }), top = byR[0], te = S.elOf(top.id) || { label: top.id }, tc = S.elOf(top.id) ? S.colorVar(S.elOf(top.id)) : 'var(--accent)';
      var hi = cand.slice().sort(function (a, b) { return b.rate - a.rate || b.n - a.n; })[0], lo = cand.slice().sort(function (a, b) { return a.rate - b.rate || b.n - a.n; })[0];
      var nm = function (x) { var e = S.elOf(x.id); return esc(e ? e.label : x.id) + ' ' + Math.round(x.rate * 100) + '%'; };
      var strong = Math.abs(top.r) >= 0.1;
      var chips3 = byR.slice(0, 3).map(function (x) { var e = S.elOf(x.id); return '<span class="hero__chip" style="--c:' + (e ? S.colorVar(e) : 'var(--accent)') + '">' + esc(e ? e.label : x.id) + ' <b>' + S.fmtR(x.r) + '</b></span>'; }).join('');
      hero = '<div class="hero" style="--c:' + tc + '"><p class="hero__k">重視する要素との相関</p>' +
        (strong ? '<p class="hero__main"><span class="hero__el display">' + esc(te.label) + '</span><span class="hero__r">r = ' + S.fmtR(top.r) + '</span></p><p class="hero__w">' + esc(S.corrWord(top.r)) + '。「はい」と答えやすい要素: ' + nm(hi) + (lo.id !== hi.id ? ' ／ 答えにくい要素: ' + nm(lo) : '') + '</p>'
          : '<p class="hero__main"><span class="hero__el display">はっきりした関係なし</span></p><p class="hero__w">どの要素とも r の絶対値が 0.1 未満でした。</p>') +
        '<p class="hero__chips">' + chips3 + '</p></div>';
    }
    var yn = q.n ? '<div class="yn"><div class="yn__bar" role="img" aria-label="はい ' + q.yes + '人、いいえ ' + q.no + '人"><i style="--w:' + (q.yes / q.n * 100).toFixed(1) + '%"></i></div><p class="yn__t"><b>' + Math.round(q.rate * 100) + '%</b>が「はい」(' + q.yes + '/' + q.n + '人)</p></div>' : '';
    var tNote = enough && q.avgYes != null && q.avgNo != null ? '<p class="habit__sub">聴く量との相関 r = ' + S.fmtR(q.timeR) + '(' + esc(S.corrWord(q.timeR)) + ') ・ 「はい」の人は平均 ' + q.avgYes.toFixed(1) + '、「いいえ」は ' + q.avgNo.toFixed(1) + '(5段階)</p>' : '';
    return '<section class="habit habit--quirk" data-reveal style="--d:' + (2 + i) + '"><h3 class="display">' + esc(q.title) + '</h3>' + hero + yn + tNote + '</section>';
  }

  /* ---- コメントの切り替え表示(要素ごと) ---- */
  function commentsFor(e) {
    var live = ((state.stats.facts[e.id] || {}).comments || []);
    if (state.source === 'live') return live;
    var q = (e.quotes || []).map(function (x) { return { text: x.text, who: x.who || '' }; });
    return live.concat(q);
  }
  function commentFig(c) { return '<blockquote>「' + esc(c.text) + '」</blockquote>' + (c.who ? '<figcaption>' + esc(c.who) + '</figcaption>' : ''); }
  function commentsHTML(e) {
    var list = commentsFor(e), CM = S.config.comments || {};
    if (!list.length) return '';
    var rich = (CM.animation || 'lines') === 'lines';
    return '<div class="comments" data-comments="' + esc(e.id) + '" data-anim="' + esc(CM.animation || 'lines') + '" style="--ms:' + (CM.intervalMs || 3000) + 'ms;--tms:' + (CM.transitionMs || 900) + 'ms">' +
      '<figure class="quote comment"><div class="cm-text">' + commentFig(list[0]) + '</div>' +
      (rich ? '<div class="cm-curtain" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><svg class="cm-border" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><rect x="0.6" y="0.6" width="98.8" height="98.8" rx="5" pathLength="1"/></svg>' : '') + '</figure>' +
      (list.length > 1 ? '<div class="comments__meta" aria-hidden="true"><span class="comments__bar"><i></i></span><span class="comments__n">1 / ' + list.length + '</span></div>' : '') + '</div>';
  }
  /* scope の中の .comments を動かす。画面から消えたら(再描画・場面の切り替え)自動で止まります */
  function mountComments(scope) {
    var CM = S.config.comments || {}, every = Math.max(800, CM.intervalMs || 3000), tms = Math.max(0, CM.transitionMs == null ? 900 : CM.transitionMs), mode = CM.animation || 'lines';
    var EASE = 'cubic-bezier(.65,0,.35,1)', OUT = 'cubic-bezier(.22,1,.36,1)';
    S.$$('[data-comments]', scope).forEach(function (root) {
      var e = S.elOf(root.dataset.comments), list = e ? commentsFor(e) : [], i = 0, hover = false, busy = false;
      var fig = S.$('.comment', root), txt = S.$('.cm-text', root), n = S.$('.comments__n', root), bar = S.$('.comments__bar', root);
      var stripes = S.$$('.cm-curtain i', root), border = S.$('.cm-border rect', root);
      if (list.length < 2 && !border) return;
      function setText() { txt.innerHTML = commentFig(list[i]); if (n) n.textContent = (i + 1) + ' / ' + list.length; }
      function restartBar() { if (!bar) return; bar.classList.remove('run'); void bar.offsetWidth; bar.classList.add('run'); }
      function drawBorder(dur) {      // カードの外周を、線がなぞる
        if (!border || !border.animate || S.reduce) return;
        border.animate([{ strokeDashoffset: 1, opacity: 1 }, { strokeDashoffset: 0, opacity: 1, offset: .72 }, { strokeDashoffset: 0, opacity: 0 }], { duration: dur * 1.9, easing: OUT, fill: 'none' });
      }
      /* 豊かな切り替え: 線の幕が走って旧コメントを覆う → 入れ替え → 幕が抜けて新コメントが浮かび上がる */
      function swapLines() {
        var half = tms * .46, st = Math.min(55, tms * .06), k;
        stripes.forEach(function (s) { s.getAnimations().forEach(function (a) { a.cancel(); }); s.style.transformOrigin = 'left center'; });
        var outs = stripes.map(function (s, k) { return s.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: half, delay: k * st, easing: EASE, fill: 'forwards' }); });
        txt.animate([{ opacity: 1, transform: 'none', filter: 'blur(0)' }, { opacity: 0, transform: 'translateY(-8px)', filter: 'blur(3px)' }], { duration: half, easing: EASE, fill: 'forwards' });
        return Promise.all(outs.map(function (a) { return a.finished; })).then(function () {
          if (!root.isConnected) return;
          i = (i + 1) % list.length; setText(); drawBorder(tms * .6);
          stripes.forEach(function (s) { s.style.transformOrigin = 'right center'; });
          var ins = stripes.map(function (s, k) { return s.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: half * 1.15, delay: k * st, easing: OUT, fill: 'forwards' }); });
          txt.getAnimations().forEach(function (a) { a.cancel(); });
          txt.animate([{ opacity: 0, transform: 'translateY(14px)', filter: 'blur(5px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: half * 1.35, delay: half * .35, easing: OUT, fill: 'backwards' });
          return Promise.all(ins.map(function (a) { return a.finished; }));
        });
      }
      function swapClass() {          // 従来の動き(slide / flip / wipe / fade)
        fig.classList.remove('is-in'); fig.classList.add('is-out');
        return new Promise(function (res) { setTimeout(function () { if (!root.isConnected) return res(); i = (i + 1) % list.length; setText(); fig.classList.remove('is-out'); fig.classList.add('is-in'); res(); }, tms); });
      }
      function swapNow() { i = (i + 1) % list.length; setText(); return Promise.resolve(); }
      if (CM.pauseOnHover === true) {
        root.addEventListener('pointermove', function () { hover = true; root.classList.add('is-paused'); });
        root.addEventListener('pointerleave', function () { hover = false; root.classList.remove('is-paused'); });
      }
      function tick() {
        if (!root.isConnected) return;
        if (hover || busy) { setTimeout(tick, 250); return; }
        busy = true;
        var p = (S.reduce || !tms) ? swapNow() : (mode === 'lines' && stripes.length && fig.animate ? swapLines() : swapClass());
        p.then(function () { busy = false; restartBar(); setTimeout(tick, every); });
      }
      if (mode !== 'lines') fig.classList.add('is-in');
      drawBorder(tms * .8);
      if (list.length < 2) return;
      restartBar(); setTimeout(tick, every);
    });
  }

  /* 見出し + 描かれる下線 */
  function title(tag, cls, text, d) { return '<' + tag + ' class="' + cls + ' display" data-reveal style="--d:' + (d || 0) + '">' + esc(text) + '</' + tag + '><span class="scribble" aria-hidden="true">' + S.deco.svg('underline') + '</span>'; }

  S.ui = { factsFor: factsFor, factsHTML: factsHTML, tagline: tagline, bodyFor: bodyFor, style: style, tierLabel: tierLabel, songsFor: songsFor, songsAll: songsAll, songsTop: songsTop, askSongs: askSongs, corrChart: corrChart, revealCorr: revealCorr, title: title, chips: chips, habitsHTML: habitsHTML, commentsHTML: commentsHTML, mountComments: mountComments, commentsFor: commentsFor };
})(window.Site);
