/* ==========================================================
   config.js : 動き方とデータの接続先
   ========================================================== */
window.SITE_CONFIG = {
  palette: 'wrapped',        // 'wrapped' | 'sorbet' | 'night'  (css/theme.css)

  /* ---- 場面(ページ)の並び順。ページを足す・消す・入れ替える時はここを編集 ---- */
  sceneOrder: ['intro', 'prologue', 'overview', 'rank1', 'rank2', 'rank3', 'corr', 'corrTop', 'habits', 'quirks', 'summary', 'level', 'result'],
  // 追加できる場面: 'method'(content.js の pages にある文章ページ) / 自分で作ったページのid

  /* ---- 回答データ ---- */
  source: {
    sheetId: '1dp5vBt6ldhJeK_H_JCLMxq--W34L1QZ9BlDTHEfwU7w',  // フォームの回答スプレッドシートのID
    gid: '347610620',                                          // 回答が入っているタブの gid(シートのURLの gid=)。空なら下のタブ名を使う
    sheetName: 'フォームの回答 1',                              // gid が空のときに使う、回答のタブ名
    gasUrl: '',                                                // GAS(gas/Code.gs)のウェブアプリURL。入れると読み込みも送信もここ経由になります
    recommendGid: '',                                          // 「おすすめ曲」タブの gid(js/recommend.js の代わりにシートで管理する時)。空なら使いません
    minResponses: 10                                           // この人数に満たない間は、仮のデータで表示
  },
  refreshSeconds: 60,        // 開いたまま何秒ごとに回答を読み直すか(0=読み込みは開いた時だけ)
  fetchTimeoutMs: 8000,
  autoElements: true,        // フォームの選択肢が content.js に無くても、自動で円グラフの1切れにする

  /* ---- フォームの列(見出しにこの言葉が含まれている列を使います) ---- */
  columns: {
    name: '名前',
    element: '一番重要視している要素',
    subElements: ['一番重要だと思う要素以外', '他の大切にしている要素'],
    comment: ['そう思った理由', '理由やコメント'],
    dislike: '苦手だと思う楽曲の要素',
    dislikeExample: '苦手な楽曲の例',
    frequency: '普段どのくらい自発的',
    time: '1日でどのくらい',
    repeat: '同じ曲を繰り返し',
    instrumental: '歌が入っていない',
    discover: '新しい楽曲',
    genres: 'ジャンル',
    artists: '良く聴くアーティスト',
    songs: '好きな楽曲を教えて',
    links: '好きな楽曲のリンク',
    platform: 'プラットフォーム'
  },

  /* ---- 「1日の聴く時間」を5段階にする方法 ----
     フォームの選択肢を、短い順に書くと一番確実です(5つなら1〜5段階にそのまま対応)。
       timeOptions: ['30分未満', '30分〜1時間', '1〜2時間', '2〜3時間', '3時間以上'],
     選択肢ごとに段階を指定したい時は levelMap。
       levelMap: { '30分未満': 1, '3時間以上': 5 },
     どちらも空なら、「1時間」「30分」などの数字から自動で判断します(levelBreaks=分の区切り)。 */
  timeOptions: [],
  levelMap: {                // フォームの「1日でどのくらい」の選択肢 → 5段階
    '10分未満': 1, '10～30分程度': 2, '～1時間程度': 3, '～2時間程度': 4,
    '～3時間程度': 4, '～4時間程度': 5, '～5時間以上': 5, '平日は聴かない': 1
  },
  levelBreaks: [15, 45, 90, 180],

  /* ---- コメント(「そう思った理由やコメント」)の切り替え表示 ----
     重視している要素ごとの説明に、その要素を選んだ人のコメントを順番に表示します(1件だけなら切り替えなし)。 */
  comments: {
    intervalMs: 2000,        // 次のコメントに切り替わるまでの時間(ミリ秒)
    transitionMs: 900,       // 切り替えアニメーションの長さ(ミリ秒)
    animation: 'lines',      // 切り替えの動き: 'lines'(線の幕が走る・外周を線がなぞる) / 'slide'(下から) / 'flip'(めくる) / 'wipe'(線が走る) / 'fade'
    max: 12,                 // 1つの要素で使うコメントの最大数
    maxLength: 140,          // これより長いコメントは「…」で省略
    showName: true,          // コメントの下にシートの「名前」を表示(false で非表示)
    showTime: true,          // コメントの下にシートの「1日どのくらい聴くか」を表示(false で非表示)
    pauseOnHover: false      // true にすると、マウスを乗せている間は切り替えを止める(クリックしたままマウスがカードに重なると止まって見えるため、初期値はオフ)
  },

  /* ---- 苦手な要素を、似た内容ごとにAIでまとめる(GAS経由) ----
     gas/Code.gs を使っている時だけ働きます。シートに「苦手まとめ」タブができ、AIが決めたまとめ名が入ります(手で直してもOK)。 */
  ai: {
    group: true,             // false にするとAIまとめを使いません(content.js の dislikeAliases だけ使う)
    timeoutMs: 60000         // AIの返事を待つ最大時間(ミリ秒)
  },

  /* ---- 曲のリンク・曲名から、曲名とアーティスト名を調べる ----
     「好きな曲のリンク」と「苦手な楽曲の例」が対象です(YouTube / Spotify / Apple Music の曲のリンク、曲名の文字)。
     文字は iTunes の検索で見つかった時だけ反映し、見つからなければ反映しません。 */
  lookup: {
    enabled: true,
    country: 'JP',           // 検索する国(日本の曲が中心なら JP)
    timeoutMs: 6000
  },

  /* ---- 放置したら最初の画面に戻るモード ----
     ページの一番下(右下)にあるスイッチでも切り替えられます(閲覧する人のブラウザに記憶されます)。 */
  idle: {
    enabled: true,           // 初期状態。true=ON
    seconds: 90              // 何も操作しないで何秒たつと戻るか
  },

  /* ---- アンケート(「あなたの音楽の聴き方を結果に反映」ボタン) ----
     送信先は次のどちらか(上が優先)。どちらも空だと、送信できない旨が表示されます。
       1. gas … 上の source.gasUrl に gas/Code.gs のURLを入れる(いちばん簡単。列は見出しで自動対応)
       2. form … Googleフォームへ直接送る。formId と、各質問の entry.数字 を entries に書く(README参照) */
  survey: {
    enabled: true,
    liveQuestions: true,     // true: GAS(source.gasUrl)経由でフォームの質問を読んで、アンケート画面に反映(読めない時は content.js の質問を使う)
    form: {
      formId: '1FAIpQLSepduvJY-p59Ef0FIlC7dmig_2i_z991dGenG-pTjkPQfSUEQ',
      entries: {
        name: 'entry.1531866281', element: 'entry.1419949830', dislike: 'entry.1554512008', dislikeExample: 'entry.866474562',
        frequency: 'entry.1240959761', time: 'entry.525220629', instrumental: 'entry.2059158574', discover: 'entry.1041755416',
        genres: 'entry.860510148', artists: 'entry.292780934', links: 'entry.804238263', platform: 'entry.779933655',
        comment: 'entry.1943670629', subElements: 'entry.876506405', repeat: 'entry.348593136'
      }
    }
  },

  /* ---- 操作 ---- */
  autoplay: true,            // false にすると最初から最後の場面で始まります(trueでも、最初の画面の「はじめる」を押すまで進みません)
  clickToAdvance: true,      // 画面のどこをクリックしても次へ進む
  transition: 'lines',       // 場面が切り替わる時の線のアニメーション('lines' | 'none')
  showSampleBadge: true,     // 仮のデータの時、右上に表示する

  /* ---- 各場面の長さ(ミリ秒) ---- */
  timing: {
    introMs: 3600,
    overviewHoldMs: 3200,
    corrDwellMs: 12000,
    corrTopMs: 9000,         // 「最も関係が強い要素」ページ
    habitsMs: 14000,
    slideMs: 900
  }
};
