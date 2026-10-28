/* core/util.js : 共通の小道具 */
(function () {
  var S = window.Site = window.Site || {};
  S.config = window.SITE_CONFIG || {};
  S.content = window.SITE_CONTENT || {};
  S.TAU = Math.PI * 2;
  S.reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  S.$ = function (s, r) { return (r || document).querySelector(s); };
  S.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  S.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); };
  S.pct = function (v) { return Math.round(v * 100); };
  S.colorVar = function (e) { return 'var(--c' + (e.color || 1) + ')'; };
  S.avg = function (a) { return a.length ? a.reduce(function (s, x) { return s + x; }, 0) / a.length : 0; };
  S.sd = function (a) { var m = S.avg(a); return Math.sqrt(S.avg(a.map(function (x) { return (x - m) * (x - m); }))); };

  /* CSV を表(2次元配列)にする。引用符・改行入りのセルにも対応 */
  S.parseCSV = function (text) {
    var rows = [], row = [], cur = '', q = false, i, c;
    text = String(text).replace(/^﻿/, '');
    for (i = 0; i < text.length; i++) {
      c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c;
      } else if (c === '"') q = true;
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
      else cur += c;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows;
  };

  /* 文章中の {{n}} {{top1}} などを実際の値に置き換える(content.js の pages などで使えます) */
  S.fmt = function (text) {
    var st = S.state && S.state.stats; if (!st) return text;
    var rank = st.rank.filter(function (r) { return r.count > 0; });
    return String(text).replace(/\{\{(\w+)\}\}/g, function (m, k) {
      if (k === 'n') return st.n;
      var mm = k.match(/^top(\d)(Share)?$/);
      if (mm) { var r = rank[+mm[1] - 1]; if (!r) return ''; return mm[2] ? S.pct(r.share) + '%' : S.elOf(r.id).label; }
      return m;
    });
  };
})();
