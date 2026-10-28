/* ==========================================================
   sample-data.js : 仮の回答データ
   ----------------------------------------------------------
   回答が config.js の source.minResponses 人(初期値10人)に満たない間は、このデータで表示します。
   形はスプレッドシートの1行(=1人)と同じです。
     elementText : 一番重視する要素   level : 聴く量 1〜5
     subTexts    : ほかに重視する要素 dislikeTexts : 苦手な要素
     genres / artists / songs : よく聴くジャンル・アーティスト・好きな曲
     instrumental / discover : 歌なしの曲を聴く・新曲を探す('はい' / 'いいえ')
     platform    : 使うアプリ(配列)
   聴く量が多い人ほど「音色・ミックス・雰囲気」を選び、プラットフォームや新曲探しにも偏りが出るように作ってあります。
   ========================================================== */
window.SAMPLE_RESPONSES = (function () {
  var C = window.SITE_CONTENT;
  var people = { 1: 8, 2: 14, 3: 18, 4: 14, 5: 10 };
  var weights = {
    1: { lyrics: .24, melody: .26, beat: .06, mood: .04, timbre: .02, mix: .02, playing: .02, who: .22, trend: .12 },
    2: { lyrics: .26, melody: .24, beat: .08, mood: .06, timbre: .03, mix: .03, playing: .03, who: .19, trend: .08 },
    3: { lyrics: .24, melody: .20, beat: .10, mood: .10, timbre: .06, mix: .06, playing: .04, who: .15, trend: .05 },
    4: { lyrics: .16, melody: .14, beat: .12, mood: .14, timbre: .10, mix: .10, playing: .08, who: .12, trend: .04 },
    5: { lyrics: .10, melody: .10, beat: .12, mood: .16, timbre: .14, mix: .14, playing: .12, who: .08, trend: .04 }
  };
  var dislikes = {
    lyrics: ['歌詞に中身がない', '流行に寄せすぎ'], melody: ['展開がなく単調', '流行に寄せすぎ'], beat: ['展開がなく単調', 'セリフパート'],
    mood: ['音が大きいだけ', '流行に寄せすぎ'], timbre: ['音が大きいだけ', '同じフレーズの繰り返し'], mix: ['音が大きいだけ', '音がこもっている'],
    playing: ['打ち込みだけ', '展開がなく単調'], who: ['声が合わない', 'セリフパート'], trend: ['歌詞に中身がない', '同じフレーズの繰り返し']
  };
  var platforms = {
    1: ['YouTube', 'YouTube', 'YouTube', 'Spotify', 'TikTok'],
    2: ['YouTube', 'Spotify', 'YouTube', 'Apple Music'],
    3: ['Spotify', 'YouTube', 'Apple Music', 'Spotify'],
    4: ['Spotify', 'Spotify', 'YouTube Music', 'Apple Music'],
    5: ['Spotify', 'Spotify', 'Apple Music', 'Spotify', 'SoundCloud']
  };
  var yes = { // その聴く量の人が「はい」になる条件(seq は通し番号)
    rep: { 1: function (s) { return s % 3 !== 0; }, 2: function (s) { return s % 3 !== 0; }, 3: function (s) { return s % 2 === 0; }, 4: function (s) { return s % 3 === 0; }, 5: function (s) { return s % 4 === 0; } },
    inst: { 1: function (s) { return s % 8 === 0; }, 2: function (s) { return s % 5 === 0; }, 3: function (s) { return s % 3 === 0; }, 4: function (s) { return s % 2 === 0; }, 5: function (s) { return s % 3 !== 0; } },
    disc: { 1: function (s) { return s % 5 === 0; }, 2: function (s) { return s % 3 === 0; }, 3: function (s) { return s % 2 === 0; }, 4: function (s) { return s % 4 !== 0; }, 5: function (s) { return s % 6 !== 0; } }
  };
  var byId = {}; C.elements.forEach(function (e) { byId[e.id] = e; });
  var out = [], used = {}, order = Object.keys(weights[1]), seq = 0;
  Object.keys(people).forEach(function (lv) {
    var n = people[lv], ids = Object.keys(weights[lv]);
    var raw = ids.map(function (id) { return { id: id, v: weights[lv][id] * n }; });
    var cnt = raw.map(function (r) { return { id: r.id, c: Math.floor(r.v), f: r.v - Math.floor(r.v) }; });
    var left = n - cnt.reduce(function (s, r) { return s + r.c; }, 0);
    cnt.slice().sort(function (a, b) { return b.f - a.f; }).slice(0, left).forEach(function (r) { r.c++; });
    cnt.forEach(function (r) {
      for (var i = 0; i < r.c; i++) {
        used[r.id] = (used[r.id] || 0) + 1; seq++;
        var e = byId[r.id], u = used[r.id], other = byId[order[(order.indexOf(r.id) + 1 + (u % 3)) % order.length]];
        var pl = platforms[lv], p1 = pl[seq % pl.length], p2 = pl[(seq + 2) % pl.length];
        out.push({
          elementText: e.label, level: +lv, subTexts: [other.label], dislikeTexts: [dislikes[r.id][u % 2]],
          genres: [e.genres[u % e.genres.length]], artists: [e.artists[u % e.artists.length]], songs: [e.favs[u % e.favs.length]],
          repeat: yes.rep[lv](seq) ? 'はい' : 'いいえ', instrumental: yes.inst[lv](seq) ? 'はい' : 'いいえ', discover: yes.disc[lv](seq) ? 'はい' : 'いいえ',
          platform: seq % 3 === 0 && p2 !== p1 ? [p1, p2] : [p1],
          dislikeSongs: seq % 4 === 0 ? [{ title: '(仮)苦手な曲 ' + (1 + seq % 3), artist: 'サンプルアーティスト' }] : []   // 実データでは、リンク/曲名から自動で調べます
        });
      }
    });
  });
  return out;
})();
