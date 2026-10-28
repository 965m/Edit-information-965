/* core/data.js : 回答データの読み込み・整理・集計
   流れ: スプレッドシート(またはGAS) → 表 → 1人ずつの回答 → 集計(Site.state.stats)
   回答が config.source.minResponses 人に満たない間は sample-data.js の仮データで表示します。 */
(function (S) {
  var C = S.config, SRC = C.source || {};
  var state = S.state = { elements: [], responses: [], stats: null, level: null, source: 'sample', status: '', updated: null, autoMap: {} };
  var listeners = [];
  S.onData = function (fn) { listeners.push(fn); };
  function emit() { listeners.forEach(function (f) { try { f(); } catch (e) { console.error(e); } }); }
  S.elOf = function (id) { return state.elements.filter(function (e) { return e.id === id; })[0]; };

  /* ---------- 文字の整え ---------- */
  function norm(s) { return String(s == null ? '' : s).replace(/[（(][^）)]*[）)]/g, '').replace(/[\s　]+/g, '').trim(); }
  function toHalf(s) { return s.replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); }).replace(/．/g, '.'); }
  /* アーティスト名・曲名: 改行 , 、 ， ; のように、はっきり区切られている所だけで分ける(「・」や「/」は名前の一部のことがあるので分けません) */
  function splitStrict(s) { return String(s || '').split(/[\n\r、,，;；]+/).map(function (t) { return t.trim(); }).filter(Boolean); }
  /* プラットフォーム名は大文字小文字・全角半角・空白の違いを同じものとして扱う */
  function platKey(x) { return String(x).normalize('NFKC').toLowerCase().replace(/[\s　]+/g, ''); }
  function canonPlatforms(rs) {
    var tally = {};
    rs.forEach(function (r) { (r.platform || []).forEach(function (v) { var k = platKey(v); (tally[k] = tally[k] || {})[v] = (tally[k][v] || 0) + 1; }); });
    var best = {};
    Object.keys(tally).forEach(function (k) {
      var forms = Object.keys(tally[k]);
      forms.sort(function (a, b) {   // 登録済みの名前 > 大文字小文字が混ざった書き方 > 多く使われた書き方
        var ka = known(a), kb = known(b); if (ka !== kb) return ka ? -1 : 1;
        var ma = a !== a.toLowerCase() && a !== a.toUpperCase(), mb = b !== b.toLowerCase() && b !== b.toUpperCase(); if (ma !== mb) return ma ? -1 : 1;
        return tally[k][b] - tally[k][a];
      });
      best[k] = forms[0];
    });
    rs.forEach(function (r) { var seen = {}; r.platform = (r.platform || []).map(function (v) { return best[platKey(v)]; }).filter(function (v) { var k = platKey(v); if (seen[k]) return false; seen[k] = 1; return true; }); });
  }
  function known(n) { return (S.content.platforms || []).some(function (p) { return p[1] === n; }); }
  function splitList(s) { return String(s || '').split(/[、,，\n\/／・;；]+/).map(function (t) { return t.trim(); }).filter(Boolean); }
  function splitComma(s) { return String(s || '').split(/[、,，\n]+/).map(function (t) { return t.trim(); }).filter(Boolean); }
  function findCol(head, kw) {
    var list = [].concat(kw || []), i, k;
    for (k = 0; k < list.length; k++) for (i = 0; i < head.length; i++) if (head[i].indexOf(list[k]) >= 0) return i;
    return -1;
  }

  /* ---------- 聴く量(1〜5)の判定 ---------- */
  function parseMinutes(text) {
    var t = toHalf(String(text || '')).replace(/\s/g, ''), m, v = null;
    if (!t) return null;
    var mul = function (u) { return /時間|h/i.test(u) ? 60 : 1; };
    var range = t.match(/(\d+(?:\.\d+)?)(時間|分|h|min)?(?:〜|~|～|-|ー|から)(\d+(?:\.\d+)?)(時間|分|h|min)/i);
    if (range) v = (parseFloat(range[1]) * mul(range[2] || range[4]) + parseFloat(range[3]) * mul(range[4])) / 2;
    else {
      m = t.match(/(\d+(?:\.\d+)?)(時間半|時間|h|分|min)/i);
      if (m) { v = parseFloat(m[1]) * mul(m[2]); if (m[2] === '時間半') v += 30; }
    }
    if (v == null) return null;
    if (/未満|以内|以下/.test(t)) v *= 0.6; else if (/以上|超/.test(t)) v *= 1.25;
    return v;
  }
  function levelFromWords(text) {
    var t = String(text || ''); if (!t) return null;
    if (/常に|ずっと|一日中|長時間/.test(t)) return 5;
    if (/毎日|よく/.test(t)) return 4;
    if (/ほとんど|全く|めったに|聴かない|聞かない/.test(t)) return 1;
    if (/月に|たまに|時々|ときどき/.test(t)) return 2;
    if (/週|ふつう|普通/.test(t)) return 3;
    return null;
  }
  function levelOf(timeText, freqText) {
    var nLv = S.content.levels.length, t = String(timeText || '').trim(), f = String(freqText || '').trim();
    var nz = function (x) { return String(x).replace(/[〜~]/g, '～').replace(/[\s　]+/g, ''); };
    var map = {}; Object.keys(C.levelMap || {}).forEach(function (k) { map[nz(k)] = C.levelMap[k]; });
    if (t && map[nz(t)] != null) return map[nz(t)];
    if (!t && f && map[nz(f)] != null) return map[nz(f)];
    var opts = (C.timeOptions || []).map(nz);
    if (opts.length && t) { var idx = opts.indexOf(nz(t)); if (idx >= 0) return Math.round(1 + idx * (nLv - 1) / Math.max(1, opts.length - 1)); }
    var mins = parseMinutes(t);
    if (mins != null) { var lv = 1; (C.levelBreaks || [15, 45, 90, 180]).forEach(function (b) { if (mins >= b) lv++; }); return Math.min(lv, nLv); }
    return levelFromWords(t) || levelFromWords(f) || null;
  }

  /* ---------- 苦手な要素の「まとめ」: 表記ゆれ/似た内容を1つの名前にそろえる ----------
     優先順: ①AIのまとめ(GAS経由・シートの「苦手まとめ」タブ) ②content.js の dislikeAliases ③そのまま */
  var groupMap = {};
  function gkey(t) { return String(t || '').normalize('NFKC').toLowerCase().replace(/[\s　]+/g, ''); }
  function aliasOf(t) {
    var al = S.content.dislikeAliases || {}, pats = S.content.dislikePatterns || [], tt = String(t || '').normalize('NFKC');
    for (var i = 0; i < pats.length; i++) { if (new RegExp(pats[i][0], 'i').test(tt)) return pats[i][1]; }
    return groupMap[gkey(t)] || al[t] || al[String(t).normalize('NFKC')] || t;
  }
  S.groupOf = aliasOf;

  /* ---------- プラットフォーム名の整え(「Apple Music Spotify youtube」のような書き方も分けます) ---------- */
  function parsePlatforms(text) {
    var t = String(text || ''), out = [];
    if (!t.trim()) return out;
    (S.content.platforms || []).forEach(function (p) {
      var re = new RegExp(p[0], 'i');
      if (re.test(t)) { if (out.indexOf(p[1]) < 0) out.push(p[1]); t = t.replace(new RegExp(p[0], 'ig'), ' '); }
    });
    t.split(/[、,，\n\/／・;；&＆\s　]+|と|や/).forEach(function (x) { x = x.trim(); if (x && x.length <= 20 && !/^(など|等|です|を使っています|使っています)$/.test(x) && out.indexOf(x) < 0) out.push(x); });
    return out;
  }
  S.parsePlatforms = parsePlatforms;

  /* ---------- 「苦手な曲の例」「好きな曲」の中身を、リンクと文字に分ける ---------- */
  var NONE_RE = /^(なし|ない|無し|無い|特になし|特にない|特に無い|特に無し|とくになし|とくにない|ありません|特にありません|特に思いつかない|わからない|分からない|わかりません|分かりません|思いつかない|思い浮かばない|思いつきません|不明|未回答|無回答|ノーコメント|none|no|nothing|n\/a|na|nil|なし以上|[-ー―−x×✕]+|[\/／.。…・]+)$/i;
  var NONE = { test: function (x) { var t = String(x == null ? '' : x).normalize('NFKC').replace(/[\s　!！?？。．.、,，~〜～…]+/g, '').replace(/(です|でした|かな|かも|だな|ですね|ですかね|かなぁ?|ですが)+$/, ''); return !t || NONE_RE.test(t) || NONE_RE.test(String(x).normalize('NFKC').trim()); } };
  function parseItems(text) {
    var t = String(text || ''), out = [], urls = t.match(/https?:\/\/[^\s、,，]+/g) || [];
    urls.forEach(function (u) { out.push({ url: u }); });
    t.replace(/https?:\/\/[^\s、,，]+/g, ' ').split(/[、,，\n;；]+/).map(function (x) { return x.trim(); })
      .filter(function (x) { return x.length >= 2 && x.length <= 60 && !NONE.test(x); }).forEach(function (x) { out.push({ text: x }); });
    return out;
  }
  function resolveItem(it) { return it.url ? S.lookup.get('u', it.url) : S.lookup.get('q', it.text); }
  /* 1人の回答から、調べて分かった曲(好きな曲のリンク / 苦手な曲)を取り出す */
  function derive(r) {
    var fav = [], dis = [];
    (r.links || []).forEach(function (u) { var x = S.lookup.get('u', u); if (x) fav.push({ title: x.title, artist: x.artist, link: u }); });
    (r.favTexts || []).forEach(function (t) {   // リンクでない回答: 検索して1曲に決まった時だけ反映
      var x = S.lookup.get('s', t, r.artists); if (x && !fav.some(function (f) { return nrm(f.title) === nrm(x.title) && nrm(f.artist) === nrm(x.artist); })) fav.push({ title: x.title, artist: x.artist, link: '' });
    });
    if (r.dislikeSongs && r.dislikeSongs.length) dis = r.dislikeSongs.slice();    // 仮データは、調べ済みの形で持っている
    else parseItems(r.dislikeExample).forEach(function (it) { var x = resolveItem(it); if (x && !dis.some(function (d) { return nrm(d.title) === nrm(x.title); })) dis.push({ title: x.title, artist: x.artist }); });
    return { fav: fav, dis: dis };
  }
  function lookupItems() {
    var out = [];
    state.responses.forEach(function (r) {
      (r.links || []).forEach(function (u) { out.push({ url: u }); });
      (r.favTexts || []).forEach(function (t) { out.push({ song: t, hints: r.artists }); });
      (r.artists || []).forEach(function (a) { out.push({ artist: a }); });
      if (!(r.dislikeSongs && r.dislikeSongs.length)) parseItems(r.dislikeExample).forEach(function (it) { out.push(it); });
    });
    return out;
  }
  var nrm = function (x) { return S.nrmTitle ? S.nrmTitle(x) : String(x).toLowerCase(); };

  /* ---------- 表 → 1人ずつの回答 ---------- */
  function fromTable(table) {
    if (!table || table.length < 1) throw new Error('表が空です');
    var head = table[0].map(function (h) { return String(h == null ? '' : h); }), K = C.columns || {}, ci = {};
    Object.keys(K).forEach(function (k) { ci[k] = findCol(head, K[k]); });
    if (ci.element < 0) throw new Error('「' + [].concat(K.element) + '」を含む見出しの列が見つかりません。シートの共有設定と見出しを確認してください');
    var out = [];
    table.slice(1).forEach(function (row) {
      var get = function (k) { return ci[k] >= 0 && row[ci[k]] != null ? String(row[ci[k]]).trim() : ''; };
      if (!get('element')) return;
      out.push({
        name: get('name'), comment: get('comment'), elementText: get('element'), subTexts: splitComma(get('subElements')),
        dislikeTexts: splitList(get('dislike')).filter(function (t) { return !NONE.test(t); }), dislikeExample: get('dislikeExample'),
        level: levelOf(get('time'), get('frequency')), time: get('time'), frequency: get('frequency'),
        repeat: get('repeat'), instrumental: get('instrumental'), discover: get('discover'),
        genres: splitList(get('genres')), artists: splitStrict(get('artists')), songs: splitList(get('songs')),
        links: get('links').match(/https?:\/\/[^\s、,]+/g) || [], favTexts: parseItems(get('links')).filter(function (it) { return it.text; }).map(function (it) { return it.text; }), platform: parsePlatforms(get('platform'))
      });
    });
    return out;
  }

  /* ---------- 要素(円グラフの1切れ)への振り分け ---------- */
  function keysOf(e) { if (!e._keys) e._keys = [e.label, e.short].concat(e.match || []).map(norm).filter(Boolean); return e._keys; }
  function resolveEl(text, create) {
    var t = norm(text), els = state.elements, hit;
    if (!t) return null;
    hit = els.filter(function (e) { return keysOf(e).indexOf(t) >= 0; })[0] || els.filter(function (e) { return keysOf(e).some(function (k) { return t.indexOf(k) >= 0; }); })[0];
    if (hit) return hit;
    if (!create) return null;
    if (C.autoElements !== false && t.length <= 16) {
      var label = String(text).replace(/[（(][^）)]*[）)]/g, '').trim();
      var e = { id: 'auto' + (els.length + 1), label: label, short: label.length > 5 ? label.slice(0, 5) : label, match: [label], color: (els.length % 8) + 1, anim: 'pop', auto: true, genres: [], artists: [], favs: [], quotes: [], songs: [] };
      els.push(e); return e;
    }
    hit = els.filter(function (e) { return e.id === 'other'; })[0];
    if (!hit) { hit = { id: 'other', label: 'その他', short: 'その他', match: [], color: 8, anim: 'fade', auto: true, genres: [], artists: [], favs: [], quotes: [], songs: [] }; els.push(hit); }
    return hit;
  }

  /* ---------- 集計 ---------- */
  function tally(list, keyFn) {
    var m = {}, order = [];
    list.forEach(function (x) { var k = keyFn(x); if (!k) return; if (!m[k]) { m[k] = { name: x.name || x, count: 0, item: x }; order.push(k); } m[k].count++; });
    return order.map(function (k) { return m[k]; }).sort(function (a, b) { return b.count - a.count; });
  }
  /* 相関係数(ピアソン)。xs=聴く量, ys=0/1 など */
  function pearson(xs, ys) {
    var n = xs.length; if (n < 3) return 0;
    var mx = S.avg(xs), my = S.avg(ys), sx = S.sd(xs), sy = S.sd(ys), i, t = 0;
    if (!(sx > 0) || !(sy > 0)) return 0;
    for (i = 0; i < n; i++) t += (xs[i] - mx) * (ys[i] - my);
    return t / (n * sx * sy);
  }
  S.pearson = pearson;
  S.corrWord = function (r) { var a = Math.abs(r); return a < 0.1 ? 'ほぼ関係なし' : a < 0.25 ? 'ごく弱い' : a < 0.4 ? '弱い' : a < 0.6 ? 'やや強い' : '強い'; };
  S.fmtR = function (r) { return (r >= 0 ? '+' : '−') + Math.abs(r).toFixed(2); };

  /* 選択肢ごとに「その選択肢の人の平均の聴く量」と、聴く量との相関を出す */
  function optionStats(rs, getter, limit) {
    var lv = rs.filter(function (r) { return r.level; }), opts = {}, order = [];
    rs.forEach(function (r) { getter(r).forEach(function (v) { var k = norm(v); if (!k) return; if (!opts[k]) { opts[k] = { name: v, count: 0 }; order.push(k); } opts[k].count++; }); });
    var list = order.map(function (k) {
      var mine = lv.filter(function (r) { return getter(r).map(norm).indexOf(k) >= 0; }), xs = lv.map(function (r) { return r.level; });
      var ys = lv.map(function (r) { return getter(r).map(norm).indexOf(k) >= 0 ? 1 : 0; });
      return { name: opts[k].name, count: opts[k].count, avg: mine.length ? S.avg(mine.map(function (r) { return r.level; })) : null, r: pearson(xs, ys) };
    }).sort(function (a, b) { return b.count - a.count; });
    return limit ? list.slice(0, limit) : list;
  }
  function computeStats() {
    var els = state.elements, levels = S.content.levels.map(function (l) { return l.level; });
    var rs = state.responses, n = rs.length, count = {}, byLevel = {}, nLevel = 0;
    els.forEach(function (e) { count[e.id] = 0; });
    levels.forEach(function (l) { byLevel[l] = { n: 0, counts: {} }; els.forEach(function (e) { byLevel[l].counts[e.id] = 0; }); });
    rs.forEach(function (r) { count[r.element]++; if (r.level) { nLevel++; byLevel[r.level].n++; byLevel[r.level].counts[r.element]++; } });
    var rank = els.map(function (e, i) { return { id: e.id, index: i, count: count[e.id], share: n ? count[e.id] / n : 0 }; })
      .sort(function (a, b) { return b.count - a.count || a.index - b.index; });
    rank.forEach(function (r, i) { r.rank = i + 1; });
    var lv = rs.filter(function (r) { return r.level; }), xs = lv.map(function (r) { return r.level; }), sdx = S.sd(xs), mx = S.avg(xs);
    var corr = els.map(function (e) {
      var ys = lv.map(function (r) { return r.element === e.id ? 1 : 0; }), sdy = S.sd(ys), my = S.avg(ys), r = 0, i, s = 0;
      if (lv.length > 1 && sdx > 0 && sdy > 0) { for (i = 0; i < lv.length; i++) s += (xs[i] - mx) * (ys[i] - my); r = s / (lv.length * sdx * sdy); }
      return { id: e.id, r: r };
    });
    var dv = rs.map(derive);
    var aliasD = aliasOf, gm = {}, gOrder = [];
    rs.forEach(function (r, i) {
      var seen = {};
      r.dislikeTexts.forEach(function (t) {
        var name = aliasD(t), k = norm(name).toLowerCase(); if (!k || seen[k]) return; seen[k] = 1;
        if (!gm[k]) { gm[k] = { label: name, count: 0, people: [], members: {} }; gOrder.push(k); }
        gm[k].count++; gm[k].people.push(i); gm[k].members[t] = 1;
      });
    });
    var dislikes = gOrder.map(function (k) { return gm[k]; }).sort(function (a, b) { return b.count - a.count; }).slice(0, 12).map(function (g) {
      var songs = {}, order = [];   // この要素を苦手と答えた人が挙げた、苦手な曲の例
      g.people.forEach(function (i) { dv[i].dis.forEach(function (x) { var kk = nrm(x.title) + '|' + nrm(x.artist); if (!songs[kk]) { songs[kk] = { title: x.title, artist: x.artist, count: 0 }; order.push(kk); } songs[kk].count++; }); });
      return { label: g.label, count: g.count, words: Object.keys(g.members), songs: order.map(function (k) { return songs[k]; }).sort(function (a, b) { return b.count - a.count; }) };
    });
    var facts = {};
    function artistsOf(r, d) {
      var seen = {}, out = [];
      var typed = (r.artists || []).map(function (a) {   // 実在を確認できたアーティストだけ(仮データは確認済みとして扱う)
        if (state.source !== 'live' && !r._live) return a;
        var x = S.lookup && S.lookup.get('a', a); return x ? x.title : null;
      });
      typed.concat(d.fav.map(function (x) { return x.artist; })).forEach(function (a) { var k = a && S.nrmName ? S.nrmName(a) : norm(a || '').toLowerCase(); if (k && !seen[k]) { seen[k] = 1; out.push({ name: a }); } });
      return out;
    }
    els.forEach(function (e) {
      var idx = [], mine = rs.filter(function (r, i) { if (r.element === e.id) { idx.push(i); return true; } return false; });
      var songs = {}, sOrder = [];
      mine.forEach(function (r, mi) {
        var d = dv[idx[mi]], items = r.songs.map(function (t) { return { title: t, artist: '', link: '' }; });
        d.fav.forEach(function (x) {      // リンクから分かった曲名・アーティストを、書かれた曲名とそろえる
          var xn = nrm(x.title), hit = items.filter(function (it) { var n = nrm(it.title); return n && (n === xn || xn.indexOf(n) >= 0 || n.indexOf(xn) >= 0); })[0];
          if (hit) { hit.artist = hit.artist || x.artist; hit.link = hit.link || x.link; hit.title = x.title; } else items.push({ title: x.title, artist: x.artist, link: x.link });
        });
        r.links.forEach(function (u, i) {  // 調べられなかったリンクは、同じ順番の曲名につける
          if (d.fav.some(function (x) { return x.link === u; })) return;
          if (items[i] && !items[i].link) items[i].link = u;
        });
        items.forEach(function (it) {
          var k = nrm(it.title).toLowerCase(); if (!k) return;
          if (!songs[k]) { songs[k] = { title: it.title, artist: it.artist, link: it.link, levels: [], count: 0 }; sOrder.push(k); }
          var o = songs[k]; o.count++; if (r.level) o.levels.push(r.level); if (!o.link && it.link) o.link = it.link; if (!o.artist && it.artist) o.artist = it.artist;
        });
      });
      var dTexts = []; mine.forEach(function (r) { var seen = {}; r.dislikeTexts.forEach(function (t) { var k = norm(aliasD(t)); if (k && !seen[k]) { seen[k] = 1; dTexts.push({ key: k, name: aliasD(t) }); } }); });
      var dSongs = []; mine.forEach(function (r, mi) { dv[idx[mi]].dis.forEach(function (x) { dSongs.push({ key: nrm(x.title) + '|' + nrm(x.artist), name: x.title, artist: x.artist }); }); });
      var CM = C.comments || {}, seenC = {}, comments = [];
      mine.forEach(function (r) {
        var t = String(r.comment || '').replace(/\s+/g, ' ').trim(), k = nrm(t);
        if (t.length < 2 || NONE.test(t) || seenC[k]) return; seenC[k] = 1;
        if (CM.maxLength && t.length > CM.maxLength) t = t.slice(0, CM.maxLength) + '…';
        var who = []; if (CM.showName !== false && r.name) who.push(r.name); if (CM.showTime !== false && r.time) who.push('1日 ' + r.time);   // シートの「名前」と「1日どのくらい聴くか」
        comments.push({ text: t, who: who.join(' ・ ') });
      });
      facts[e.id] = {
        comments: comments.slice(0, CM.max || 12),
        genres: tally([].concat.apply([], mine.map(function (r) { return r.genres.map(function (g) { return { name: g }; }); })), function (x) { return norm(x.name).toLowerCase(); }).slice(0, 5),
        artists: tally([].concat.apply([], mine.map(function (r, mi) { return artistsOf(r, dv[idx[mi]]); })), function (x) { return norm(x.name).toLowerCase(); }).slice(0, 5),
        songs: sOrder.map(function (k) { var o = songs[k]; return { title: o.title, artist: o.artist, link: o.link, level: o.levels.length ? Math.round(S.avg(o.levels)) : 3, count: o.count }; }).sort(function (a, b) { return b.count - a.count; }).slice(0, 8),
        subs: tally([].concat.apply([], mine.map(function (r) { return r.subs.map(function (id) { return { name: id }; }); })), function (x) { return x.name; }).slice(0, 3).map(function (x) { return { id: x.name, count: x.count }; }),
        dislikes: tally(dTexts, function (x) { return x.key; }).slice(0, 4).map(function (d) { return { label: d.name, count: d.count }; }),
        dislikeSongs: tally(dSongs, function (x) { return x.key; }).slice(0, 4).map(function (d) { return { title: d.name, artist: d.item.artist, count: d.count }; })
      };
    });
    var allDis = []; dv.forEach(function (d) { d.dis.forEach(function (x) { allDis.push({ key: nrm(x.title) + '|' + nrm(x.artist), name: x.title, artist: x.artist }); }); });
    var examples = tally(allDis, function (x) { return x.key; }).slice(0, 10).map(function (d) { return { text: d.name + (d.item.artist ? ' / ' + d.item.artist : ''), title: d.name, artist: d.item.artist, count: d.count }; });
    var artistsAll = tally([].concat.apply([], rs.map(function (r, i) { return artistsOf(r, dv[i]); })), function (x) { return norm(x.name).toLowerCase(); }).slice(0, 12).map(function (a) { return { name: a.name, count: a.count }; });
    var yesNo = function (f) { return function (r) { var v = norm(r[f]); return v ? [/^(はい|yes|ある|よく|たまに|聴く)/i.test(v) ? 'はい' : 'いいえ'] : []; }; };
    var timeRank = levels.map(function (l, i) { return { level: l, count: byLevel[l].n, share: nLevel ? byLevel[l].n / nLevel : 0 }; })
      .sort(function (a, b) { return b.count - a.count || a.level - b.level; });
    var allLv = lv.map(function (r) { return r.level; });
    /* はい/いいえの質問ごとに: 人数・聴く量との相関・重視する要素との関係 */
    var quirk = function (f, title) {
      var ans = rs.filter(function (r) { return yesNo(f)(r).length; }), isYes = function (r) { return yesNo(f)(r)[0] === 'はい'; };
      var yes = ans.filter(isYes).length, lva = ans.filter(function (r) { return r.level; });
      var xs = lva.map(function (r) { return r.level; }), ys = lva.map(function (r) { return isYes(r) ? 1 : 0; });
      var yl = lva.filter(isYes).map(function (r) { return r.level; }), nl = lva.filter(function (r) { return !isYes(r); }).map(function (r) { return r.level; });
      var byEl = els.map(function (e) {
        var grp = ans.filter(function (r) { return r.element === e.id; }), y = grp.filter(isYes).length;
        var ex = ans.map(function (r) { return r.element === e.id ? 1 : 0; }), ey = ans.map(function (r) { return isYes(r) ? 1 : 0; });
        return { id: e.id, n: grp.length, yes: y, rate: grp.length ? y / grp.length : 0, r: pearson(ex, ey) };
      }).filter(function (x) { return x.n > 0; });
      return { key: f, title: title, n: ans.length, yes: yes, no: ans.length - yes, rate: ans.length ? yes / ans.length : 0,
        timeR: xs.length >= 3 ? pearson(xs, ys) : 0, nTime: xs.length, avgYes: yl.length ? S.avg(yl) : null, avgNo: nl.length ? S.avg(nl) : null, byEl: byEl };
    };
    var quirks = [quirk('repeat', '同じ曲を繰り返し聴く?'), quirk('instrumental', '歌の入っていない曲を聴く?'), quirk('discover', '新しい曲を自分から探す?')];
    var multiPlat = lv.length ? pearson(allLv, lv.map(function (r) { return r.platform.length; })) : 0;
    var all = function (f, multi) { return tally([].concat.apply([], rs.map(function (r) { var v = r[f]; return (multi ? v : (v ? [v] : [])).map(function (t) { return { name: t }; }); })), function (x) { return norm(x.name); }); };
    return { n: n, nLevel: nLevel, count: count, byLevel: byLevel, rank: rank, corr: corr, dislikes: dislikes, examples: examples, artists: artistsAll, facts: facts,
      habits: { instrumental: all('instrumental'), discover: all('discover'), platform: all('platform', true) },
      time: { rank: timeRank, avg: allLv.length ? S.avg(allLv) : null },
      platforms: optionStats(rs, function (r) { return r.platform; }, 8),
      platformCount: { avg: rs.length ? S.avg(rs.map(function (r) { return r.platform.length; })) : 0, r: multiPlat },
      quirks: quirks };
  }

  /* ---------- 反映 ---------- */
  function apply(raws, source) {
    state.elements = S.content.elements.map(function (e) { return Object.assign({}, e); });
    state.responses = raws.map(function (r) {
      var el = resolveEl(r.elementText, true);
      var subs = (r.subTexts || []).map(function (t) { var s = resolveEl(t, false); return s ? s.id : null; }).filter(function (id, i, a) { return id && id !== el.id && a.indexOf(id) === i; });
      return Object.assign({}, r, { element: el.id, subs: subs, level: r.level || null, dislikeTexts: r.dislikeTexts || [], dislikeExample: r.dislikeExample || '', genres: r.genres || [], artists: r.artists || [], songs: r.songs || [], links: r.links || [], platform: r.platform || [] });
    });
    canonPlatforms(state.responses);
    state.source = source;
    state.stats = computeStats();
    if (source === 'live' && S.lookup) S.lookup.want(lookupItems());   // リンク・曲名を調べる(終わるたびに集計をやり直す)
  }
  if (S.lookup) S.lookup.onChange(function () { if (state.responses.length) { state.stats = computeStats(); emit(); } });
  S.useSample = function () { apply(window.SAMPLE_RESPONSES || [], 'sample'); };

  /* ---------- 読み込み(スプレッドシート直接 / GAS) ---------- */
  function fetchT(url) {
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null, t = setTimeout(function () { if (ctrl) ctrl.abort(); }, C.fetchTimeoutMs || 8000);
    return fetch(url, ctrl ? { signal: ctrl.signal } : {}).then(function (r) { clearTimeout(t); return r; }, function (e) { clearTimeout(t); throw e; });
  }
  function jsonp(url) {
    return new Promise(function (res, rej) {
      var cb = '__gviz' + Date.now(), s = document.createElement('script'), to;
      function done() { clearTimeout(to); try { delete window[cb]; } catch (e) { window[cb] = undefined; } s.remove(); }
      to = setTimeout(function () { done(); rej(new Error('timeout')); }, C.fetchTimeoutMs || 8000);
      window[cb] = function (j) { done(); res(j); };
      s.onerror = function () { done(); rej(new Error('script error')); };
      s.src = url + '&tqx=responseHandler:' + cb; document.head.appendChild(s);
    });
  }
  function gvizTable(j) {
    if (j.status && j.status !== 'ok') throw new Error('シートを読めません(共有設定を「リンクを知っている全員が閲覧可」にしてください)');
    var t = j.table, head = t.cols.map(function (c) { return c.label || ''; });
    return [head].concat(t.rows.map(function (r) { return (r.c || []).map(function (c) { return c ? (c.f != null ? c.f : (c.v != null ? c.v : '')) : ''; }); }));
  }
  function fetchSheet(gidOverride) {
    var gid = gidOverride || SRC.gid;
    var base = 'https://docs.google.com/spreadsheets/d/' + SRC.sheetId + '/gviz/tq?headers=1&' + (gid ? 'gid=' + encodeURIComponent(gid) : 'sheet=' + encodeURIComponent(SRC.sheetName || ''));
    return fetchT(base + '&tqx=out:csv&t=' + Date.now()).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.text();
    }).then(function (text) { return S.parseCSV(text); }).catch(function (err) {
      console.info('[いい曲の条件] CSV読み込みに失敗(' + err.message + ')。別の方法で再試行します');
      return jsonp(base).then(gvizTable);
    });
  }
  function fetchGas() {
    var url = SRC.gasUrl.trim();
    if (!/\/exec(\?|$)/.test(url)) console.warn('[いい曲の条件] gasUrl が「…/exec」で終わっていません。GASの「デプロイ」→ウェブアプリのURL(/exec)を入れてください');
    return fetchT(url + (url.indexOf('?') >= 0 ? '&' : '?') + 't=' + Date.now()).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status); return res.text();
    }).then(function (text) {
      var j; try { j = JSON.parse(text); } catch (e) {
        throw new Error('GASがJSONを返していません。デプロイの「アクセスできるユーザー」を「全員」にして、URLが /exec か確認してください(ログインページが返っている可能性があります)');
      }
      if (j.ok === false) throw new Error('GASのエラー: ' + (j.error || ''));
      if (j.updatedAt) state.updated = new Date(j.updatedAt);
      if (j.table) return j.table;
      if (j.header && j.rows) return [j.header].concat(j.rows);
      throw new Error('GASの返り値に header と rows がありません(Code.gs を最新版にして「新しいデプロイ」をしてください)');
    }).catch(function (err) {   // GASが読めない時は、シートを直接読む方法に切り替える(シートが共有されていれば表示できる)
      if (!SRC.sheetId) throw err;
      console.warn('[いい曲の条件] GASから読めませんでした: ' + (err.message || err) + ' → シートを直接読みます');
      state.errorText = String(err.message || err);
      return fetchSheet();
    });
  }

  /* ---------- おすすめ曲タブ・苦手な要素のAIまとめ ---------- */
  var GKEY = 'ii-groups-v1';
  function setGroups(map) { groupMap = {}; Object.keys(map || {}).forEach(function (k) { if (map[k]) groupMap[gkey(k)] = String(map[k]); }); }
  try { setGroups(JSON.parse(localStorage.getItem(GKEY) || '{}')); } catch (e) { }
  function gasMode(mode, ms) {
    var u = SRC.gasUrl.trim(), ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null, t = setTimeout(function () { if (ctrl) ctrl.abort(); }, ms || 8000);
    return fetch(u + (u.indexOf('?') >= 0 ? '&' : '?') + 'mode=' + mode + '&t=' + Date.now(), ctrl ? { signal: ctrl.signal } : {})
      .then(function (r) { clearTimeout(t); return r.json(); }, function (e) { clearTimeout(t); throw e; });
  }
  var aiBusy = false;
  function loadGroups() {
    if (!SRC.gasUrl || (C.ai && C.ai.group === false)) return Promise.resolve();
    return gasMode('groups').then(function (j) {
      if (!j || !j.ok) return;
      setGroups(j.map); try { localStorage.setItem(GKEY, JSON.stringify(j.map || {})); } catch (e) { }
      if (j.pending > 0 && !aiBusy) {   // まとめていない表現が残っていれば、GAS側のAIにまとめてもらう(時間がかかるので裏で実行)
        aiBusy = true;
        gasMode('groups&fill=1', (C.ai && C.ai.timeoutMs) || 60000).then(function (k) {
          if (k && k.ok) { setGroups(k.map); try { localStorage.setItem(GKEY, JSON.stringify(k.map || {})); } catch (e) { } if (state.responses.length) { state.stats = computeStats(); emit(); } }
        }).catch(function (e) { console.info('[いい曲の条件] AIまとめを実行できませんでした:', e.message || e); }).then(function () { aiBusy = false; });
      }
    }).catch(function (e) { console.info('[いい曲の条件] 苦手な要素のまとめを読めませんでした:', e.message || e); });
  }
  function loadExtras() {
    var jobs = [];
    if (SRC.recommendGid && SRC.sheetId) jobs.push(fetchSheet(SRC.recommendGid).then(function (t) { S.recommend.setSheet(t); }).catch(function (e) { console.info('[いい曲の条件] おすすめ曲タブを読めませんでした:', e.message || e); }));
    jobs.push(loadGroups());
    return Promise.all(jobs);
  }

  /* ---------- 表示するデータの切り替え(回答データ / 仮データ) ---------- */
  var MKEY = 'ii-data-mode', forced = false;
  try { forced = localStorage.getItem(MKEY) === 'sample'; } catch (e) { }
  S.dataForced = function () { return forced; };
  S.setDataForced = function (v) {
    forced = !!v; try { localStorage.setItem(MKEY, forced ? 'sample' : 'live'); } catch (e) { }
    S.$$('[data-data-toggle]').forEach(paintToggle);
    return S.loadData();
  };
  function paintToggle(b) { b.setAttribute('aria-pressed', String(forced)); var st = b.querySelector('.sw__state'); if (st) st.textContent = forced ? 'ON' : 'OFF'; b.title = forced ? '仮のデータを表示しています(OFFで回答データに戻ります)' : '回答データを表示しています(ONで仮のデータに切り替えます)'; }
  S.dataToggleHTML = function () {
    return '<button type="button" class="sw" data-data-toggle role="switch" aria-pressed="' + forced + '"><span class="sw__knob" aria-hidden="true"></span><span class="sw__label">仮データで表示</span><b class="sw__state">' + (forced ? 'ON' : 'OFF') + '</b></button>';
  };
  document.addEventListener('click', function (ev) { var b = ev.target.closest && ev.target.closest('[data-data-toggle]'); if (b) S.setDataForced(!forced); });

  S.loadData = function () {
    if (forced) { S.useSample(); state.status = 'forced'; emit(); return Promise.resolve(false); }
    var p = (SRC.gasUrl ? fetchGas() : (SRC.sheetId ? fetchSheet() : Promise.resolve(null))).then(function (t) { return loadExtras().then(function () { return t; }); });
    return p.then(function (table) {
      if (!table) { state.status = ''; return false; }
      var raws = fromTable(table), need = SRC.minResponses == null ? 10 : SRC.minResponses;
      state.updated = state.updated || new Date();
      if (raws.length >= need) { apply(raws, 'live'); state.status = ''; state.liveCount = raws.length; emit(); return true; }
      state.status = 'waiting'; state.liveCount = raws.length; S.useSample(); emit(); return false;
    }).catch(function (err) {
      console.warn('[いい曲の条件] 回答データを読み込めなかったので、仮のデータで表示します:', err.message || err);
      state.status = 'error'; state.errorText = String(err.message || err); if (state.source !== 'sample') S.useSample(); emit(); return false;
    });
  };
})(window.Site);
