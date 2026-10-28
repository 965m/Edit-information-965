/* scenes/summary.js : まとめ(1ページの中で、文章とモーショングラフィックスが順番に入れ替わる)
   文章・分け方・自分の言葉は js/content.js の summary に書きます。数字や引用は回答から自動で入ります。 */
(function (S) {
  var esc = S.esc, BC = ['var(--accent)', 'var(--c3)', 'var(--c2)', 'var(--c4)', 'var(--accent)', 'var(--c5)', 'var(--c1)', 'var(--accent)'];
  function plain(l) { return String(l).replace(/\*\*/g, ''); }
  function clip(t, n) { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n) + '…' : t; }

  /* ---- 回答から、まとめに使う材料を作る ---- */
  function facts() {
    var s = S.state.stats, C = S.content.summary, G = C.groups || {}, snd = G.sound || [], n = s.n || 1, soundN = 0, ctxN = 0, k;
    var all = S.state.elements.filter(function (e) { return s.count[e.id] > 0; });
    all.forEach(function (e) { if (snd.indexOf(e.id) >= 0) soundN += s.count[e.id]; else ctxN += s.count[e.id]; });
    var tot = soundN + ctxN || 1, sp = Math.round(soundN / tot * 100), cp = 100 - sp;
    var lyr = S.elOf('lyrics'), lyricsN = lyr ? (s.count[lyr.id] || 0) : 0;
    // 歌詞の両極端: 歌詞を重視する人のコメントと、「歌詞は聴いていない」という記述
    var forQ = '', againstQ = '', NEG = /歌詞[^。\n]{0,10}(聴い|聞い|読ん|見|気にし|意識し|入ってこ|頭に入|関係)[^。\n]{0,4}(て)?(い)?(な|ま)|歌詞[^。\n]{0,6}(ほとんど|あまり|全く|まったく)|歌詞(は|を)?(どうでも|重視しな|興味がな)|歌詞(は|を)?(聴かな|聞かな|見ない|読まない)/;
    if (lyr) { var cm = S.ui.commentsFor(lyr); if (cm.length) forQ = cm[0].text; }
    if (S.state.source === 'live') {
      S.state.responses.forEach(function (r) {
        var texts = [r.comment].concat(r.dislikeTexts || [], [r.dislikeExample]);
        texts.forEach(function (t) { if (!againstQ && t && NEG.test(t)) againstQ = t; });
      });
    }
    var P = C.polar || {};
    // 苦手の方向性: 上位の要素 → その人たちの苦手
    var pairs = s.rank.filter(function (r) { return r.count > 0; }).slice(0, 3).map(function (r) {
      var e = S.elOf(r.id), d = ((s.facts[e.id] || {}).dislikes || [])[0];
      return { from: e.label, to: d ? d.label : (e.dislike || ''), color: S.colorVar(e) };
    }).filter(function (p) { return p.to; });
    // 他の人の聴き方から: 要素ごとのコメントを1つずつ
    var quotes = [];
    s.rank.filter(function (r) { return r.count > 0; }).forEach(function (r) {
      if (quotes.length >= 3) return;
      var e = S.elOf(r.id), c = S.ui.commentsFor(e)[0]; if (c && c.text) quotes.push({ label: e.label, text: c.text, color: S.colorVar(e) });
    });
    var segs = all.slice().sort(function (a, b) { return (snd.indexOf(b.id) >= 0) - (snd.indexOf(a.id) >= 0) || s.count[b.id] - s.count[a.id]; }).map(function (e) {
      return { label: e.short || e.label, p: s.count[e.id] / tot * 100, color: S.colorVar(e), sound: snd.indexOf(e.id) >= 0 };
    });
    return { soundPct: sp, ctxPct: cp, lyricsN: lyricsN, n: s.n, forQ: forQ || P.for || '', againstQ: againstQ || P.against || '', againstReal: !!againstQ, pairs: pairs, quotes: quotes, segs: segs, G: G };
  }
  function fill(t, f) { return String(t).replace(/\{\{(\w+)\}\}/g, function (m, k) { var v = f[k]; if (k === 'soundPct' || k === 'ctxPct') return v + '%'; return v == null ? '' : v; }); }

  /* ---- 1つ1つの図 ---- */
  var VIZ = {
    0: function () {
      return '<div class="v0" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>';
    },
    1: function (f) {
      var segs = f.segs.map(function (g, i) { return '<i class="' + (g.sound ? 'is-s' : 'is-c') + '" style="--w:' + g.p.toFixed(2) + '%;--c:' + g.color + ';--i:' + i + '" title="' + esc(g.label) + ' ' + Math.round(g.p) + '%">' + (g.p >= 8 ? '<span>' + esc(g.label) + '</span>' : '') + '</i>'; }).join('');
      return '<div class="v1"><div class="v1__bar">' + segs + '</div><div class="v1__lab"><p class="is-s"><b data-count="' + f.soundPct + '">0</b><em>%</em><span>' + esc(f.G.soundLabel || '音の要素') + '</span></p><p class="is-c"><b data-count="' + f.ctxPct + '">0</b><em>%</em><span>' + esc(f.G.ctxLabel || '音の外側') + '</span></p></div></div>';
    },
    2: function (f) {
      var arrows = '<svg viewBox="0 0 120 40" aria-hidden="true"><path class="a1" d="M60 20 H8 M20 8 L8 20 L20 32"/><path class="a2" d="M60 20 H112 M100 8 L112 20 L100 32"/></svg>';
      return '<div class="v2"><div class="v2__c v2__c--a"><span class="v2__t">歌詞で聴く</span><p>「' + esc(clip(f.forQ, 70)) + '」</p></div><div class="v2__mid">' + arrows + '</div><div class="v2__c v2__c--b"><span class="v2__t">歌詞は聴いていない</span><p>「' + esc(clip(f.againstQ, 70)) + '」</p></div></div>';
    },
    3: function (f) {
      var rows = f.pairs.map(function (p, i) { return '<li style="--c:' + p.color + ';--i:' + i + '"><span class="v3__a">' + esc(p.from) + '<small>を重視</small></span><svg viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="M2 10 H92 M84 3 L93 10 L84 17"/></svg><span class="v3__b">' + esc(p.to) + '<small>が苦手</small></span></li>'; }).join('');
      return '<ul class="v3">' + (rows || '<li class="v3__none">回答が集まると、ここに表示されます</li>') + '</ul>';
    },
    4: function () {
      var rings = [[30, '音', 154], [62, '言葉', 104], [94, '文脈', 72]].map(function (r, i) { return '<circle class="v4__r" cx="150" cy="150" r="' + r[0] + '" pathLength="1" style="--i:' + i + '"/><text class="v4__t" x="150" y="' + r[2] + '" style="--i:' + i + '">' + r[1] + '</text>'; }).join('');
      return '<svg class="v4" viewBox="0 0 300 300" aria-hidden="true">' + rings + '<circle class="v4__out" cx="150" cy="150" r="130"/><text class="v4__o" x="150" y="294">受けつけないもの</text></svg>';
    },
    5: function (f) {
      var cs = f.quotes.map(function (q, i) { return '<figure class="v5__c" style="--c:' + q.color + ';--i:' + i + '"><figcaption>' + esc(q.label) + 'を重視</figcaption><blockquote>「' + esc(clip(q.text, 60)) + '」</blockquote></figure>'; }).join('');
      return '<div class="v5">' + cs + '</div>';
    },
    6: function () { return '<svg class="v6" viewBox="0 0 400 40" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="M0 20 Q 25 0 50 20 T 100 20 T 150 20 T 200 20 T 250 20 T 300 20 T 350 20 T 400 20"/></svg>'; },
    7: function () { return '<div class="v7"><button class="btn btn--main btn--big" type="button" data-survey-open>' + esc(S.content.copy.surveyBtn || '回答する') + '</button></div>'; }
  };

  function bgHTML() {
    var rings = [[120, '3 14', 70], [210, '60 24 10 24', 110], [300, '2 10', 160]].map(function (r, i) { return '<g class="sm__spin" style="animation-duration:' + r[2] + 's;animation-direction:' + (i % 2 ? 'reverse' : 'normal') + '"><circle cx="500" cy="300" r="' + r[0] + '" stroke-dasharray="' + r[1] + '"/></g>'; }).join('');
    var waves = '', d, y, k, x;
    for (k = 0; k < 4; k++) { y = 90 + k * 140; d = 'M-200 ' + y; for (x = -200; x < 1300; x += 100) d += ' q 25 ' + (k % 2 ? -26 : 26) + ' 50 0 t 50 0'; waves += '<path class="sm__w" d="' + d + '" style="animation-duration:' + (14 + k * 4) + 's;animation-direction:' + (k % 2 ? 'reverse' : 'normal') + '"/>'; }
    var dots = ''; for (k = 0; k < 16; k++) dots += '<circle class="sm__p" cx="' + (40 + (k * 61) % 920) + '" cy="620" r="' + (2 + k % 4) + '" style="animation-duration:' + (9 + (k * 5) % 9) + 's;animation-delay:' + (-k * 1.1).toFixed(1) + 's"/>';
    return '<svg class="sm__bg" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' + rings + waves + dots + '<line class="sm__scan" x1="0" y1="0" x2="0" y2="600"/></svg>';
  }

  S.registerScene('summary', {
    label: 'まとめ', tone: 'dark',
    build: function (el) {
      var C = S.content.summary || { beats: [] }, f = facts(); this.f = f; this.C = C;
      var beats = C.beats.map(function (b, i) {
        var n = 0, lines = (b.mine ? C.mine : b.lines).map(function (l) { var r = S.fxLine(fill(l, f), n); n += r.n + 2; return r.html; }).join('');
        var chars = (b.mine ? C.mine : b.lines).reduce(function (a, l) { return a + Array.from(plain(fill(l, f))).length; }, 0) + (b.sub ? Array.from(b.sub).length * .5 : 0);
        b._chars = chars;
        var viz = VIZ[b.mine ? 6 : (b.last ? 7 : i)] ? VIZ[b.mine ? 6 : (b.last ? 7 : i)](f) : '';
        return '<div class="sm__beat' + (b.last ? ' is-last' : '') + (b.mine ? ' is-mine' : '') + (((b.lines||[]).join('').length>22 && !b.mine && !b.last) ? ' is-long' : '') + '" data-i="' + i + '" aria-hidden="true"><p class="sm__text display">' + lines + '</p>' +
          '<div class="sm__viz">' + viz + '</div>' + (b.sub ? '<p class="sm__sub">' + esc(fill(b.sub, f)) + '</p>' : '') + '</div>';
      }).join('');
      var beads = C.beats.map(function () { return '<i></i>'; }).join('');
      var wipe = ''; for (var k = 0; k < 6; k++) wipe += '<i style="--i:' + k + '"></i>';
      el.innerHTML = '<div class="sm" style="--bc:' + BC[0] + '">' + bgHTML() + '<div class="sm__stack">' + beats + '</div><div class="sm__wipe" aria-hidden="true">' + wipe + '</div>' +
        '<div class="sm__foot" aria-hidden="true"><span class="sm__beads">' + beads + '</span></div></div>';
    },
    play: function (ctx) {
      var el = this.el, C = this.C, root = S.$('.sm', el), beats = S.$$('.sm__beat', el), beads = S.$$('.sm__beads i', el), stripes = S.$$('.sm__wipe i', el);
      var skip = null, busy = false, pending = false, idx = 0, last = C.beats.length - 1;
      function hold(ms) { return ctx.cancellable(function (done, entry) { busy = false; if (pending) { pending = false; if (idx < last) { busy = true; setTimeout(done, 60); return; } } entry.t = setTimeout(done, S.reduce ? 80 : ms); skip = function () { clearTimeout(entry.t); done(); }; }); }
      ctx.onAdvance(function () { if (skip && idx < last) { var f = skip; skip = null; busy = true; f(); return true; } if (busy) { pending = true; return true; } return false; });
      function count(b) {
        S.$$('[data-count]', b).forEach(function (n) {
          var to = +n.dataset.count, t0 = performance.now(), dur = S.reduce ? 0 : 1300;
          (function step(t) { var k = dur ? Math.min(1, (t - t0) / dur) : 1; n.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1 && n.isConnected) requestAnimationFrame(step); })(t0);
        });
      }
      function wipe(inn) {
        if (S.reduce || !stripes[0].animate) return Promise.resolve();
        var as = stripes.map(function (s, k) {
          s.style.transformOrigin = inn ? 'left center' : 'right center';
          return s.animate(inn ? [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }] : [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: inn ? 230 : 300, delay: k * 22, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' });
        });
        return Promise.all(as.map(function (a) { return a.finished; }));
      }
      function show(i) {
        beats.forEach(function (b, k) { b.classList.remove('is-on', 'is-out'); b.setAttribute('aria-hidden', String(k !== i)); });
        void root.offsetWidth; beats[i].classList.add('is-on'); count(beats[i]);
        beads.forEach(function (b, k) { b.classList.toggle('is-on', k === i); b.classList.toggle('is-done', k < i); });
        root.style.setProperty('--bc', BC[i % BC.length]);
      }
      function ms(b, i) { var P = C; return Math.max(b.short ? 4200 : (P.minMs || 6200), (P.baseMs || 3200) + b._chars * (P.perCharMs || 150)) + (i === last ? 4000 : 0); }
      return (async function () {
        show(0);
        for (idx = 0; idx < C.beats.length; idx++) {
          if (idx > 0) { await wipe(true); show(idx); wipe(false); }
          await hold(ms(C.beats[idx], idx)); skip = null; if (idx < last) busy = true;
          if (idx < last) { beats[idx].classList.add('is-out'); await ctx.sleep(S.reduce ? 0 : 220); }
        }
      })();
    }
  });
})(window.Site);
