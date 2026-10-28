/* ==========================================================
   scenes/_template.js : 新しいページ(場面)を足す時のひな形
   ----------------------------------------------------------
   1. このファイルをコピーして scenes/mypage.js のような名前にする
   2. 'mypage' と label / tone を自分のページに合わせて書き換える
   3. index.html の「ページを足したらここに1行」の所へ
        <script src="js/scenes/mypage.js"></script>
      を足す
   4. js/config.js の sceneOrder の好きな位置に 'mypage' を足す
   (文章だけのページなら、1〜4 は不要です。js/content.js の pages に書くだけで足せます)

   使える道具
     Site.state.stats   … 集計結果(n=人数, rank=順位, byLevel, corr, dislikes, habits など)
     Site.elOf(id)      … 要素(歌詞・メロディ…)の情報
     Site.ui.title(...) … 描かれる下線つきの見出し
     Site.deco.add(el, 'wave'|'rings'|'rays'|'zigzag'|'spiral'|'star', 'CSSの位置')  … 線の飾り
     data-reveal 属性   … 付けた要素が順番にふわっと出る(style="--d:2" で順番を指定)
   play(ctx) の中で使える道具
     ctx.sleep(ms)      … ms待つ(終わると自動で次の場面へ)
     ctx.waitAdvance()  … クリックされるまで待つ(自動では進まない)
     interactive: true  … 場面のどこをクリックしても進まない(ボタンで選ばせたい時)
   ========================================================== */
(function (S) {
  S.registerScene('mypage', {
    label: 'マイページ',
    tone: 'light',                                  // 'dark' | 'light' | 'accent'
    build: function (el) {                          // 場面に入るたびに呼ばれる(最新のデータで描き直す)
      el.innerHTML = '<div class="scene__inner"><div class="page">' +
        S.ui.title('h2', 'scene__title', 'ここに見出し') +
        '<p class="page__line" data-reveal style="--d:2">全部で ' + S.state.stats.n + ' 人に聞きました。</p></div></div>';
      S.deco.add(el, 'wave', 'left:0;right:0;bottom:44px;height:22px;color:var(--ink);opacity:.5');
    },
    play: function (ctx) { return ctx.sleep(6000); } // 6秒後に自動で次へ。クリックですぐ次へ
  });
})(window.Site);
