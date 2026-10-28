/* Googleフォームの「entry.数字」を一覧にするスクリプト(GASなしでアンケートを直接フォームへ送る時に使います)
   使い方:
   1. 回答用のフォームを開く(…/viewform のページ。編集画面ではなく回答画面)
   2. キーボードの F12(Macは ⌥⌘I)で開発者ツールを開き、「Console(コンソール)」タブを選ぶ
   3. このファイルの中身をまるごと貼り付けて Enter
   4. 出てきた { ... } を js/config.js の survey.form.entries に貼る
   (貼り付けがブロックされたら、先に「allow pasting」と入力して Enter) */
(function () {
  var K = {
    name: '名前', comment: 'そう思った理由', repeat: '同じ曲を繰り返し', subElements: '他の大切にしている要素', element: '一番重要視している要素',
    dislikeExample: '苦手な楽曲の例', dislike: '苦手だと思う楽曲の要素', frequency: '普段どのくらい自発的', time: '1日でどのくらい',
    instrumental: '歌が入っていない', discover: '新しい楽曲', genres: 'ジャンル',
    artists: '良く聴くアーティスト', songs: '好きな楽曲を教えて', links: '好きな楽曲のリンク', platform: 'プラットフォーム'
  };
  var n = function (s) { return String(s || '').normalize('NFKC').replace(/\s+/g, ''); };
  var out = {}, miss = [];
  function put(title, id) {
    var key = Object.keys(K).filter(function (k) { return n(title).indexOf(n(K[k])) >= 0; })[0];
    if (key && !out[key]) out[key] = 'entry.' + id; else miss.push(title + ' → entry.' + id);
  }
  function fromData(d) {
    var items = d && d[1] && d[1][1]; if (!items) return false;
    items.forEach(function (it) { var id = it[4] && it[4][0] && it[4][0][0]; if (id) put(it[1], id); });
    return true;
  }
  function fromDom() {   // ページの入力欄から直接さがす
    var seen = {};
    Array.prototype.forEach.call(document.querySelectorAll('[name^="entry."],[data-params]'), function (el) {
      var m = (el.getAttribute('name') || '').match(/^entry\.(\d+)/), box = el.closest('[role="listitem"]');
      if (!m) { var dp = el.getAttribute('data-params') || '', q = dp.match(/\[\[(\d{6,}),/); if (!q) return; m = [0, q[1]]; }
      if (!box || seen[m[1]]) return; seen[m[1]] = 1;
      var h = box.querySelector('[role="heading"]'); put(h ? h.textContent : box.textContent.slice(0, 80), m[1]);
    });
    return Object.keys(out).length > 0;
  }
  function show() {
    var txt = '{\n' + Object.keys(out).map(function (k) { return "  " + k + ": '" + out[k] + "'"; }).join(',\n') + '\n}';
    console.log(txt);
    if (miss.length) console.warn('対応する項目がなかった質問:\n' + miss.join('\n'));
    try { copy(txt); console.log('(クリップボードにコピーしました)'); } catch (e) { }
  }
  if (fromData(window.FB_PUBLIC_LOAD_DATA_) || fromDom()) return show();
  // 最後の手段: このページのHTMLを読み直して中のデータを取り出す
  fetch(location.href, { credentials: 'include' }).then(function (r) { return r.text(); }).then(function (t) {
    var m = t.match(/FB_PUBLIC_LOAD_DATA_\s*=\s*([\s\S]*?);\s*<\/script>/);
    if (m && fromData(JSON.parse(m[1]))) return show();
    console.error('見つかりませんでした。今のページ: ' + location.href + '\nコンソール上部の「top」が選ばれているか、フォームの回答画面を直接開いているか確認してください');
  }).catch(function (e) { console.error('読み込めませんでした: ' + e.message + '\n今のページ: ' + location.href); });
  return;
})();
