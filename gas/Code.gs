/**
 * Code.gs : フォームの回答シートを、サイトが読める形(JSON)で返す GAS
 *
 * 回答シートをそのまま読ませる場合、この GAS は不要です(js/config.js の source.sheetId だけで動きます)。
 * 「シートを全員に公開したくない」「GASで集計や加工をしたい」時にだけ使ってください。
 *
 * 使い方
 *  1. 回答のスプレッドシートを開く → 拡張機能 → Apps Script
 *  2. このファイルの中身を貼り付けて保存
 *  3. デプロイ → 新しいデプロイ → 種類「ウェブアプリ」
 *     実行ユーザー「自分」 / アクセスできるユーザー「全員」
 *  4. 表示された URL を js/config.js の source.gasUrl に貼る
 *
 * 返す内容: { updatedAt, header: [見出し行], rows: [回答の行...] }
 * サイト側が見出しの言葉(config.js の columns)で列を探すので、列の順番が変わっても大丈夫です。
 *
 * 【サイトのアンケート画面から送られた回答を、シートに書き込む(doPost)】
 *  サイトの「あなたの音楽の聴き方を結果に反映」で答えた内容を、回答シートに書き込みます。
 *  アンケートの質問は、フォーム(FORM_ID)から読み取って表示します(フォームを変えると、サイトの質問も変わります)。
 *  読み込み(doGet)と同じ URL で動くので、デプロイは1回だけです。
 *  ※ コードを書き換えたら、デプロイ → デプロイを管理 → 編集 → 新バージョン で更新してください。
 */
var SHEET_GID = 347610620;          // 書き込み・読み込みをするタブ(URL の gid=)。見つからなければ下のタブ名を使います
var SHEET_NAME = 'フォームの回答 1';

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), all = ss.getSheets(), i;
  for (i = 0; i < all.length; i++) if (all[i].getSheetId() === SHEET_GID) return all[i];
  return ss.getSheetByName(SHEET_NAME);
}

/* アンケートの質問を読み取るフォーム(編集画面のURLの /d/ と /edit の間のID)。空ならシートにつながっているフォームを使います */
var FORM_ID = '1GjJmhtLtXVp0tw6eFzsWnvxoYKStryVSKD4_RaecRk4';

/* フォームの質問を、サイトのアンケート画面が使える形にして返す(?mode=form) */
function getForm() {
  if (FORM_ID) return FormApp.openById(FORM_ID);
  var url = SpreadsheetApp.getActiveSpreadsheet().getFormUrl();
  return url ? FormApp.openByUrl(url) : null;
}
function formDefinition() {
  var form = getForm(), qs = [];
  if (!form) return { ok: false, error: 'form not found' };
  form.getItems().forEach(function (item, idx) {
    var title = String(item.getTitle() || '').trim(), t = item.getType(), o = null;
    if (!title) return;                                   // タイトルのない項目(セクション区切りなど)は飛ばす
    var base = { index: idx, title: title, help: String(item.getHelpText() || ''), required: false, other: false, options: [] };
    function opts(choices) { return choices.map(function (c) { return c.getValue(); }); }
    if (t === FormApp.ItemType.TEXT) { o = item.asTextItem(); base.type = 'text'; }
    else if (t === FormApp.ItemType.PARAGRAPH_TEXT) { o = item.asParagraphTextItem(); base.type = 'long'; }
    else if (t === FormApp.ItemType.MULTIPLE_CHOICE) { o = item.asMultipleChoiceItem(); base.type = 'radio'; base.options = opts(o.getChoices()); base.other = !!o.hasOtherOption(); }
    else if (t === FormApp.ItemType.CHECKBOX) { o = item.asCheckboxItem(); base.type = 'checkbox'; base.options = opts(o.getChoices()); base.other = !!o.hasOtherOption(); }
    else if (t === FormApp.ItemType.LIST) { o = item.asListItem(); base.type = 'select'; base.options = opts(o.getChoices()); }
    else if (t === FormApp.ItemType.SCALE) { o = item.asScaleItem(); base.type = 'select'; for (var i = o.getLowerBound(); i <= o.getUpperBound(); i++) base.options.push(String(i)); }
    else return;                                          // 日付・時刻・表・ファイルなどは未対応(飛ばす)
    if ((base.type === 'radio' || base.type === 'checkbox' || base.type === 'select') && !base.options.length && !base.other) return;
    base.required = !!o.isRequired();
    qs.push(base);
  });
  return { ok: true, title: form.getTitle(), description: form.getDescription() || '', questions: qs };
}

function doGet(e) {
  if (e && e.parameter && e.parameter.mode === 'groups') {
    try { return reply(groupsReply(e.parameter.fill === '1')); } catch (err) { return reply({ ok: false, error: String(err) }); }
  }
  if (e && e.parameter && e.parameter.mode === 'form') {
    try { return reply(formDefinition()); } catch (err) { return reply({ ok: false, error: String(err) }); }
  }
  var sh = getSheet();
  var values = sh ? sh.getDataRange().getDisplayValues() : [[]];
  var out = { updatedAt: new Date().toISOString(), header: values[0], rows: values.slice(1) };
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

/* 見出しにこの言葉が入っている列へ書き込みます(js/config.js の columns と同じ言葉) */
var KEYS = {
  name: '名前', element: '一番重要視している要素', subElements: '一番重要だと思う要素以外', comment: 'そう思った理由',
  dislike: '苦手だと思う楽曲の要素', dislikeExample: '苦手な楽曲の例',
  frequency: '普段どのくらい自発的', time: '1日でどのくらい',
  repeat: '同じ曲を繰り返し', instrumental: '歌が入っていない', discover: '新しい楽曲',
  genres: 'ジャンル', artists: '良く聴くアーティスト', songs: '好きな楽曲を教えて', links: '好きな楽曲のリンク',
  platform: 'プラットフォーム'
};

var ORDER = ['name', 'element', 'comment', 'subElements', 'dislike', 'dislikeExample', 'frequency', 'time', 'repeat', 'instrumental', 'discover', 'genres', 'artists', 'links', 'platform'];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var body = JSON.parse(e.postData.contents || '{}'), v = body.values || {}, answers = body.answers || [];
    var any = answers.some(function (a) { return a && String(a.value || '').trim(); }) || !!v.element;
    if (!any) return reply({ ok: false, error: 'empty answers' });
    var sh = getSheet();
    if (!sh) return reply({ ok: false, error: 'sheet not found' });
    var cols = Math.max(sh.getLastColumn(), 1);
    var header = sh.getRange(1, 1, 1, cols).getValues()[0], matched = 0;
    var nz = function (x) { return String(x == null ? '' : x).normalize('NFKC').replace(/\s+/g, ''); };   // 全角/半角・空白の違いは無視して比べる
    var byTitle = {};
    answers.forEach(function (a) { if (a && a.title) byTitle[nz(a.title)] = a.value; });
    var titles = Object.keys(byTitle);
    var row = header.map(function (h) {
      var hs = String(h);
      if (/タイムスタンプ|Timestamp/i.test(hs)) { matched++; return new Date(); }
      var hn = nz(hs), hit = null, i;
      if (hn && titles.length) {                         // 1) 質問文と見出しが同じ列 → 2) どちらかがもう一方を含む列
        if (byTitle.hasOwnProperty(hn)) hit = hn;
        else for (i = 0; i < titles.length; i++) if (hn.indexOf(titles[i]) >= 0 || titles[i].indexOf(hn) >= 0) { hit = titles[i]; break; }
      }
      if (hit != null) { matched++; return clean(byTitle[hit]); }
      for (var k in KEYS) if (hs.indexOf(KEYS[k]) >= 0 && v[k] != null) { matched++; return clean(v[k]); }   // 旧方式(values)
      return '';
    });
    if (!matched) {      // 見出しが見つからないタブなら、質問の順番に A 列から書く
      row = [new Date()].concat(answers.length ? answers.map(function (a) { return clean(a.value); }) : ORDER.map(function (k) { return clean(v[k]); }));
    }
    // すでに値が入っている行は書き換えない: 2行目から見て、すべてのセルが空の最初の行に書く(なければ最後の行の次)
    var last = sh.getLastRow(), width = Math.max(cols, row.length), target = last + 1;
    if (last > 1) {
      var data = sh.getRange(2, 1, last - 1, width).getValues();
      for (var i = 0; i < data.length; i++) {
        if (data[i].every(function (c) { return c === '' || c === null; })) { target = i + 2; break; }
      }
    }
    sh.getRange(target, 1, 1, row.length).setValues([row]);
    return reply({ ok: true, row: target });
  } catch (err) {
    return reply({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/* 長すぎる入力を切り、「=」などで始まる文字が数式として動かないようにする */
function clean(x) {
  var t = String(x == null ? '' : x).slice(0, 2000);
  return /^[=+\-@]/.test(t) ? "'" + t : t;
}
function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}


/* ==========================================================
   苦手な要素を、似た内容ごとにAIでまとめる
   ・シートに「苦手まとめ」タブができます(A列=元の表現、B列=まとめ名、C列=AI/手動)。
   ・B列が空の行を、AIがまとめ名で埋めます。B列に自分で書いた行は上書きしません(手で直したい時はここを書き換える)。
   ・AIを使うには: スクリプトプロパティ(プロジェクトの設定 → スクリプト プロパティ)に ANTHROPIC_API_KEY を追加。
     ない場合も動きます(元の表現が並ぶので、B列を手で埋めればサイトに反映されます)。
   ・AIには「苦手な要素」の短い文言だけが送られます(名前や他の回答は送りません)。
   ========================================================== */
var GROUP_SHEET = '苦手まとめ';
var AI_MODEL = 'claude-haiku-5-5';     // 使うモデル
var DISLIKE_HEADER = '苦手だと思う楽曲の要素';
var GROUP_BATCH = 60;                  // 1回にAIへ渡す表現の数

function gkey(t) { return String(t || '').normalize('NFKC').toLowerCase().replace(/[\s\u3000]+/g, ''); }

function dislikePhrases() {
  var sh = getSheet(); if (!sh || sh.getLastRow() < 2) return [];
  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0], col = -1, i;
  for (i = 0; i < head.length; i++) if (gkey(head[i]).indexOf(gkey(DISLIKE_HEADER)) >= 0) { col = i; break; }
  if (col < 0) return [];
  var vals = sh.getRange(2, col + 1, sh.getLastRow() - 1, 1).getValues(), seen = {}, out = [];
  vals.forEach(function (r) {
    String(r[0] || '').split(/[\n\r、,，;；\/／・]+/).forEach(function (t) {
      t = t.trim(); var k = gkey(t); if (t && t.length <= 40 && !seen[k]) { seen[k] = 1; out.push(t); }
    });
  });
  return out;
}

function groupSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName(GROUP_SHEET);
  if (!sh) { sh = ss.insertSheet(GROUP_SHEET); sh.getRange(1, 1, 1, 3).setValues([['元の表現', 'まとめ名', '決めた人(AI/手動)']]); }
  return sh;
}

function readGroups(sh) {
  var n = sh.getLastRow() - 1, rows = n > 0 ? sh.getRange(2, 1, n, 3).getValues() : [], map = {}, known = {}, blanks = [];
  rows.forEach(function (r, i) {
    var p = String(r[0] || '').trim(), g = String(r[1] || '').trim(); if (!p) return;
    known[gkey(p)] = i + 2;
    if (g) map[p] = g; else blanks.push({ phrase: p, row: i + 2 });
  });
  return { map: map, known: known, blanks: blanks };
}

function askClaude(phrases, existing) {
  var key = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY'); if (!key) return null;
  var prompt = '音楽アンケートで「苦手だと思う楽曲の要素」として書かれた短い表現を、似た内容ごとにまとめてください。\n' +
    '・意味が同じ/ほぼ同じものは同じ「まとめ名」にする(例: 声が高い・高音・キンキン声 → 高い声)。表記ゆれ(ひらがな/カタカナ/長音)も同じにする。\n' +
    '・無理に広くまとめない。違いが大事なもの(例: セリフパート と 歌声)は分ける。\n' +
    '・まとめ名は短く自然な日本語(10文字程度まで)。既にあるまとめ名があれば、当てはまる時はそれを使う。\n' +
    '既にあるまとめ名: ' + JSON.stringify(existing) + '\n' +
    'まとめる表現: ' + JSON.stringify(phrases) + '\n' +
    '出力は {"元の表現":"まとめ名", ...} のJSONだけ。すべての表現を含めること。';
  var res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post', muteHttpExceptions: true, contentType: 'application/json',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify({ model: AI_MODEL, max_tokens: 4000, messages: [{ role: 'user', content: prompt }] })
  });
  if (res.getResponseCode() !== 200) throw new Error('AI API ' + res.getResponseCode() + ': ' + String(res.getContentText()).slice(0, 200));
  var text = (JSON.parse(res.getContentText()).content || []).map(function (c) { return c.text || ''; }).join(''), m = text.match(/\{[\s\S]*\}/);
  return m ? JSON.parse(m[0]) : null;
}

function groupsReply(fill) {
  var sh = groupSheet(), st = readGroups(sh), phrases = dislikePhrases(), add = [];
  phrases.forEach(function (p) { if (!st.known[gkey(p)]) add.push([p, '', '']); });
  if (add.length) { sh.getRange(sh.getLastRow() + 1, 1, add.length, 3).setValues(add); st = readGroups(sh); }
  var hasKey = !!PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  if (fill && hasKey && st.blanks.length) {
    var lock = LockService.getScriptLock(); lock.waitLock(20000);
    try {
      st = readGroups(sh);
      var todo = st.blanks.slice(0, GROUP_BATCH), existing = [], seen = {};
      Object.keys(st.map).forEach(function (k) { var g = st.map[k]; if (!seen[g]) { seen[g] = 1; existing.push(g); } });
      var ans = askClaude(todo.map(function (b) { return b.phrase; }), existing) || {};
      todo.forEach(function (b) {
        var g = String(ans[b.phrase] || '').trim().slice(0, 30);
        if (g) sh.getRange(b.row, 2, 1, 2).setValues([[g, 'AI']]);
      });
      st = readGroups(sh);
    } finally { lock.releaseLock(); }
  }
  return { ok: true, map: st.map, pending: hasKey ? st.blanks.length : 0, ai: hasKey };
}
