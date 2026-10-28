/* core/lookup.js : 曲のリンク・曲名から「曲名」と「アーティスト名」を調べる
   ・リンク … YouTube / Spotify(曲のURL) / Apple Music(曲のURL) に対応。それ以外のリンクは反映しません。
   ・文字(曲名) … iTunes の検索で見つかった時だけ使います(見つからなければ反映しません)。
   ・好きな曲(文字) … 「曲名」「曲名 アーティスト名」を検索し、結果が1つに決まる時だけ反映します(同名の曲が複数あって確実でない時は反映しません)。
   ・アーティスト名 … iTunes(なければ MusicBrainz)で実在を確認できた時だけ反映します。
   ・調べた結果はブラウザに記憶されるので、2回目以降は通信しません。
   ・通信できない場所(公開前のプレビューなど)では、何も反映されないだけで、サイトは普通に動きます。
   設定は js/config.js の lookup。 */
(function (S) {
  var C = S.config, L = C.lookup || {}, enabled = L.enabled !== false, KEY = 'ii-lookup-v2';
  var cache = {}, failed = {}, queued = {}, queue = [], active = 0, MAXC = 3, timer = null, listeners = [], stat = { ok: 0, miss: 0, fail: 0 };
  try { cache = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { cache = {}; }
  function save() {
    try {
      var ks = Object.keys(cache); if (ks.length > 800) ks.slice(0, ks.length - 800).forEach(function (k) { delete cache[k]; });
      localStorage.setItem(KEY, JSON.stringify(cache));
    } catch (e) { }
  }
  function nrm(s) { return String(s == null ? '' : s).toLowerCase().replace(/[\s　・\-–—_~～!！?？.,，、。()（）\[\]【】「」『』"'’“”\/／:：&＆]+/g, ''); }
  S.nrmTitle = nrm;

  /* ---------- 通信 ---------- */
  function fetchJson(url) {
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null, t = setTimeout(function () { if (ctrl) ctrl.abort(); }, L.timeoutMs || 6000);
    return fetch(url, ctrl ? { signal: ctrl.signal } : {}).then(function (r) { clearTimeout(t); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }, function (e) { clearTimeout(t); throw e; });
  }
  function jsonp(url) {
    return new Promise(function (res, rej) {
      var cb = '__lk' + Date.now() + Math.floor(Math.random() * 1e6), s = document.createElement('script'), to;
      function done() { clearTimeout(to); try { delete window[cb]; } catch (e) { window[cb] = undefined; } s.remove(); }
      to = setTimeout(function () { done(); rej(new Error('timeout')); }, L.timeoutMs || 6000);
      window[cb] = function (j) { done(); res(j); };
      s.onerror = function () { done(); rej(new Error('script error')); };
      s.src = url + '&callback=' + cb; document.head.appendChild(s);
    });
  }
  function itunes(path) {
    var url = 'https://itunes.apple.com/' + path;
    return fetchJson(url).catch(function () { return jsonp(url); }).then(function (j) { return (j && j.results) || []; });
  }
  function itunesSearch(term) {
    return itunes('search?media=music&entity=song&limit=6&country=' + (L.country || 'JP') + '&term=' + encodeURIComponent(term));
  }

  /* ---------- 照合 ---------- */
  function pick(results, query, strictTitle) {
    var q = nrm(query), best = null, bs = 0;
    results.forEach(function (r) {
      var t = nrm(r.trackName), a = nrm(r.artistName), sc = 0;
      if (!t) return;
      if (t === q) sc = 100;
      else if (nrm(a + t) === q || nrm(t + a) === q) sc = 95;
      else if (!strictTitle && t.length >= 2 && q.indexOf(t) >= 0 && (q.indexOf(a) >= 0 || q.length - t.length <= a.length + 3)) sc = 80;
      else if (!strictTitle && q.length >= 2 && t.indexOf(q) >= 0 && q.length >= t.length * 0.7) sc = 60;
      if (sc > bs) { bs = sc; best = r; }
    });
    return best ? { t: best.trackName, a: best.artistName } : null;
  }
  function cleanTitle(s) {
    return String(s || '').replace(/[\(\[（【][^\)\]）】]*(official|mv|m\/v|music\s*video|lyric|audio|公式|フル|full|ver|video|歌詞|short)[^\)\]）】]*[\)\]）】]/ig, ' ')
      .replace(/\s*[|｜]\s*.*$/, '').replace(/\s+/g, ' ').trim();
  }
  function cleanArtist(s) {
    return String(s || '').replace(/\s*-\s*Topic$/i, '').replace(/VEVO$/i, '').replace(/\s*(公式|Official)\s*(Channel|チャンネル|YouTube\s*Channel)?\s*$/i, '').trim();
  }

  function byQuery(text) {      // 曲名(文字) → 検索
    return itunesSearch(text).then(function (rs) { return pick(rs, text, false); });
  }
  function byYouTube(url) {
    return fetchJson('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent(url)).then(function (j) {
      var title = cleanTitle(j.title), artist = cleanArtist(j.author_name), m = title.match(/^(.+?)\s+[-–—]\s+(.+)$/);
      if (m) { artist = cleanArtist(m[1]); title = m[2].trim(); }
      var fallback = { t: title, a: artist };
      return itunesSearch((artist ? artist + ' ' : '') + title).then(function (rs) { return pick(rs, title, true) || pick(rs, (artist ? artist + ' ' : '') + title, false) || fallback; }, function () { return fallback; });
    });
  }
  function bySpotify(url) {
    return fetchJson('https://open.spotify.com/oembed?url=' + encodeURIComponent(url)).then(function (j) {
      var title = cleanTitle(j.title); if (!title) return null;
      return itunesSearch(title).then(function (rs) { return pick(rs, title, true) || { t: title, a: '' }; }, function () { return { t: title, a: '' }; });
    });
  }
  function byApple(id) {
    return itunes('lookup?country=' + (L.country || 'jp') + '&id=' + id).then(function (rs) { var r = rs[0]; return r && r.trackName ? { t: r.trackName, a: r.artistName } : null; });
  }
  function resolveUrl(url) {
    var u = String(url).trim(), m;
    if (/^https?:\/\/((www|m|music)\.)?(youtube\.com|youtu\.be)\//i.test(u)) return byYouTube(u);
    if (/^https?:\/\/open\.spotify\.com\/(intl-[a-z]+\/)?track\//i.test(u)) return bySpotify(u);
    if (/^https?:\/\/music\.apple\.com\//i.test(u)) { m = u.match(/[?&]i=(\d+)/) || u.match(/\/song\/[^\/]*\/(\d+)/); return m ? byApple(m[1]) : Promise.resolve(null); }
    return Promise.resolve(null);   // 対応していないリンクは反映しない
  }


  /* ---------- アーティスト名・好きな曲(文字) ---------- */
  function nrmA(s) { return nrm(String(s || '').normalize('NFKC')).replace(/^the/, ''); }
  S.nrmName = nrmA;
  var mbGate = Promise.resolve();
  function mbArtist(name) {       // MusicBrainz は1秒に1回までなので、順番待ちさせる
    var run = function () { return fetchJson('https://musicbrainz.org/ws/2/artist?fmt=json&limit=5&query=' + encodeURIComponent('artist:"' + String(name).replace(/"/g, '') + '"')); };
    var p = mbGate.then(function () { return new Promise(function (r) { setTimeout(r, 1100); }); }).then(run);
    mbGate = p.catch(function () { });
    return p.then(function (j) {
      var q = nrmA(name), hit = null;
      ((j && j.artists) || []).forEach(function (a) {
        if (hit || (a.score != null && a.score < 90)) return;
        var names = [a.name, a['sort-name']].concat((a.aliases || []).map(function (x) { return x.name; }));
        if (names.some(function (n) { return nrmA(n) === q; })) hit = a;
      });
      return hit ? { t: hit.name, a: '' } : null;
    });
  }
  function byArtist(name) {
    var q = nrmA(name); if (q.length < 1) return Promise.resolve(null);
    return itunes('search?media=music&entity=musicArtist&limit=10&country=' + (L.country || 'JP') + '&term=' + encodeURIComponent(name)).then(function (rs) {
      var hit = rs.filter(function (r) { return nrmA(r.artistName) === q; })[0];
      return hit ? { t: hit.artistName, a: '' } : mbArtist(name);
    });
  }
  /* 曲名(+アーティスト名)の検索。結果が1つに決まる時だけ返す。hints=その人が答えたアーティスト名(同名の曲の絞り込みに使う) */
  function splitCandidates(text) {
    var t = String(text).normalize('NFKC').trim(), out = [], m;
    var seps = [/\s+[\/／\-–—－|]\s+/, /\s+by\s+/i, /\s+/, /[\/／|]/, /\s*[-–—－]\s*/];
    seps.forEach(function (re) { if ((m = t.split(re)) && m.length >= 2) { out.push([m[0], m.slice(1).join(' ')]); out.push([m.slice(0, -1).join(' '), m[m.length - 1]]); } });
    return out.filter(function (c) { return nrm(c[0]) && nrm(c[1]); });
  }
  function aMatch(a, b) { return a && b && (a === b || (Math.min(a.length, b.length) >= 3 && (a.indexOf(b) >= 0 || b.indexOf(a) >= 0))); }
  function bySong(text, hints) {
    return itunes('search?media=music&entity=song&limit=50&country=' + (L.country || 'JP') + '&term=' + encodeURIComponent(String(text).normalize('NFKC'))).then(function (rs) {
      var q = nrm(String(text).normalize('NFKC')), cands = splitCandidates(text), hs = (hints || []).map(nrmA).filter(Boolean), exact = {}, loose = {}, titleOnly = {};
      rs.forEach(function (r) {
        var tn = nrm(r.trackName), an = nrmA(r.artistName), key = tn + '|' + an;
        if (!tn) return;
        var combo = q === tn + nrm(r.artistName) || q === nrm(r.artistName) + tn;
        var viaSplit = cands.some(function (c) { return (tn === nrm(c[0]) && aMatch(an, nrmA(c[1]))) || (tn === nrm(c[1]) && aMatch(an, nrmA(c[0]))); });
        var exactSplit = cands.some(function (c) { return (tn === nrm(c[0]) && an === nrmA(c[1])) || (tn === nrm(c[1]) && an === nrmA(c[0])); });
        if (combo || exactSplit) exact[key] = r; else if (viaSplit) loose[key] = r;
        if (tn === q) titleOnly[key] = r;
      });
      var pickOne = function (m) { var ks = Object.keys(m); return ks.length === 1 ? m[ks[0]] : null; };
      var r = null, ex = Object.keys(exact).length ? exact : loose;
      if (Object.keys(ex).length) r = pickOne(ex);                      // 「曲名 アーティスト名」で1つに決まった
      else if (Object.keys(titleOnly).length) {                          // 曲名だけ
        r = pickOne(titleOnly);
        if (!r && hs.length) {                                           // 同名が複数 → 答えたアーティスト名で絞れた時だけ
          var h = {}; Object.keys(titleOnly).forEach(function (k) { if (hs.some(function (x) { return aMatch(nrmA(titleOnly[k].artistName), x); })) h[k] = titleOnly[k]; });
          r = pickOne(h);
        }
      }
      return r ? { t: r.trackName, a: r.artistName } : null;
    });
  }

  /* ---------- 試聴(iTunesの30秒プレビュー)のURL ---------- */
  var prevCache = {};
  function pv(r, tn, an) {          // 一致の強さ: 3=曲名もアーティストも一致 / 2=曲名が含まれ合い、アーティスト一致 / 1=曲名一致のみ(アーティスト情報なし)
    var t = nrm(r.trackName), a = nrmA(r.artistName); if (!r.previewUrl || !t) return 0;
    var aOk = !an || aMatch(a, an), same = t === tn, part = tn.length >= 2 && (t.indexOf(tn) === 0 || tn.indexOf(t) === 0);
    if (same && aOk) return 3; if (part && aOk && an) return 2; if (same && !an) return 1; return 0;
  }
  /* 返り値: { url } 見つかった / { none:true } 見つからなかった / { error:true } 通信できなかった */
  function previewFor(title, artist) {
    var key = nrm(title) + '|' + nrmA(artist);
    if (prevCache[key]) return Promise.resolve(prevCache[key]);
    var term = encodeURIComponent(String(title) + ' ' + String(artist || '')), cc = L.country || 'JP';
    var tn = nrm(title), an = nrmA(artist);
    function best(rs) { var b = null, bs = 0; rs.forEach(function (r) { var sc = pv(r, tn, an); if (sc > bs) { bs = sc; b = r; } }); return b; }
    return itunes('search?media=music&entity=song&limit=50&country=' + cc + '&term=' + term).then(function (rs) {
      var hit = best(rs);
      if (hit) return hit;
      return itunes('search?media=music&entity=song&limit=50&country=' + cc + '&term=' + encodeURIComponent(String(title))).then(best);   // 曲名だけでも探す
    }).then(function (hit) {
      var out = hit ? { url: hit.previewUrl } : { none: true };
      if (hit) prevCache[key] = out; return out;
    }, function () { return { error: true }; });
  }

  /* ---------- キューと記憶 ---------- */
  function hintKey(h) { return (h || []).map(nrmA).filter(Boolean).sort().join('+'); }
  function keyOf(kind, v, hints) {
    if (kind === 'u') return 'u:' + String(v).trim().replace(/[#&?](utm_[^&]*|si=[^&]*|feature=[^&]*)/g, '');
    if (kind === 's') return 's:' + nrm(String(v).normalize('NFKC')) + '|' + hintKey(hints);
    if (kind === 'a') return 'a:' + nrmA(v);
    return 'q:' + nrm(v);
  }
  function notify() {
    clearTimeout(timer);
    timer = setTimeout(function () { listeners.forEach(function (f) { try { f(); } catch (e) { console.error(e); } }); }, 350);
  }
  function pump() {
    while (active < MAXC && queue.length) {
      (function (job) {
        active++;
        var p = job.kind === 'u' ? resolveUrl(job.v) : job.kind === 'a' ? byArtist(job.v) : job.kind === 's' ? bySong(job.v, job.hints) : byQuery(job.v);
        p.then(function (r) {
          if (r && r.t) { cache[job.k] = { t: r.t, a: r.a || '' }; stat.ok++; } else { cache[job.k] = { miss: Date.now() }; stat.miss++; }
          save();
        }, function (e) { failed[job.k] = true; stat.fail++; console.info('[いい曲の条件] 曲の照合に失敗(' + job.v + '): ' + (e && e.message)); })
          .then(function () { delete queued[job.k]; active--; notify(); pump(); });
      })(queue.shift());
    }
  }
  function usable(c) { return c && (c.t || (c.miss && Date.now() - c.miss < 864e5 * 3)); }   // 見つからなかった結果は3日間おぼえる

  S.lookup = {
    enabled: enabled,
    /* 調べ済みなら { title, artist }、見つからなかった/まだなら null */
    preview: previewFor,
    get: function (kind, v, hints) { var c = cache[keyOf(kind, v, hints)]; return c && c.t ? { title: c.t, artist: c.a || '' } : null; },
    /* items: [{url} | {text}] を調べる予約。終わるたびに onChange が呼ばれます */
    want: function (items) {
      if (!enabled) return;
      items.forEach(function (it) {
        var kind = it.url ? 'u' : it.artist ? 'a' : it.song ? 's' : 'q', v = it.url || it.artist || it.song || it.text, k = keyOf(kind, v, it.hints);
        if (!v || usable(cache[k]) || failed[k] || queued[k]) return;
        queued[k] = true; queue.push({ k: k, kind: kind, v: v, hints: it.hints });
      });
      pump();
    },
    onChange: function (f) { listeners.push(f); },
    status: function () { return { pending: queue.length + active, ok: stat.ok, miss: stat.miss, fail: stat.fail }; }
  };
})(window.Site);
