/* core/survey.js : アンケート画面(ページに覆いかぶさって表示)と送信
   設問は js/content.js の survey.questions にあります(Googleフォームと同じ内容)。
   送信先(js/config.js):
     1. source.gasUrl があれば … GAS(gas/Code.gs の doPost)へ送り、回答シートに1行追加
     2. なければ survey.form の formId と entries があれば … Googleフォームへ直接送信
     3. どちらも無ければ … 送信できない旨を表示(回答は消えません) */
(function (S) {
  var C = S.config, esc = S.esc, $ = S.$, $$ = S.$$;
  var SV = (C.survey || {}), root = null, st = null, lastFocus = null;

  var live = null, liveSig = '';                    // GAS から読んだ、フォームの最新の質問
  function qs() { return (live && live.questions) || (S.content.survey && S.content.survey.questions) || []; }
  function sv() { var base = S.content.survey || {}; return live ? Object.assign({}, base, { title: live.title || base.title, lead: live.description != null ? live.description : base.lead }) : base; }
  function fresh() { return { i: 0, a: {}, busy: false, done: false, err: '' }; }
  st = fresh();

  /* ---------- 値の取り出し ---------- */
  function ans(q) { return st.a[q.key] || (st.a[q.key] = { v: q.type === 'checkbox' ? [] : '', other: '', useOther: false }); }
  function valueOf(q) {
    var a = ans(q), t = q.type, o = (a.other || '').trim();
    if (t === 'checkbox') return a.v.concat(a.useOther && o ? [o] : []).join(', ');
    if (t === 'radio' || t === 'select') return a.useOther ? o : a.v;
    return String(a.v || '').trim();
  }
  function filled(q) { return !!valueOf(q); }
  function allValues() { var o = {}; qs().forEach(function (q) { o[q.key] = valueOf(q); }); return o; }
  /* フォームから読んだ質問に、サイトが使う key をつける(config.columns の言葉が質問文に含まれていれば、その key) */
  function keyFor(title, idx) {
    var K = C.columns || {}, k, list, j;
    for (k in K) { list = [].concat(K[k]); for (j = 0; j < list.length; j++) if (list[j] && title.indexOf(list[j]) >= 0) return k; }
    return 'q' + idx;
  }
  function adopt(def) {      // 読んだ質問を使う
    var used = {};
    var qsLive = (def.questions || []).map(function (q, i) {
      var key = keyFor(q.title, i); if (used[key]) key = 'q' + i; used[key] = 1;
      return { key: key, type: q.type, title: q.title, help: q.help || '', required: !!q.required, other: !!q.other, options: q.options || [] };
    });
    if (!qsLive.length) return false;
    var sig = JSON.stringify([def.title, def.description, qsLive]);
    if (sig === liveSig) return false;
    var untouched = !Object.keys(st.a).length && st.i === 0;
    if (untouched || !root || root.hidden) { live = { title: def.title, description: def.description, questions: qsLive }; liveSig = sig; if (root && !root.hidden) render(); return true; }
    pendingDef = def; return false;       // 回答の途中なら、次に開く時に反映
  }
  var pendingDef = null;
  function refreshQuestions() {
    var src = C.source || {};
    if (SV.liveQuestions === false || !src.gasUrl) return Promise.resolve(false);
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null, t = setTimeout(function () { if (ctrl) ctrl.abort(); }, C.fetchTimeoutMs || 8000);
    return fetch(src.gasUrl + (src.gasUrl.indexOf('?') >= 0 ? '&' : '?') + 'mode=form&t=' + Date.now(), ctrl ? { signal: ctrl.signal } : {})
      .then(function (r) { clearTimeout(t); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) { if (!j || !j.ok) throw new Error((j && j.error) || 'form'); return adopt(j); })
      .catch(function (e) { clearTimeout(t); console.info('[いい曲の条件] フォームの質問を読めなかったので、content.js の質問を使います: ' + (e && e.message)); return false; });
  }

  /* ---------- 描画 ---------- */
  function pillsHTML(q) {
    var a = ans(q), multi = q.type === 'checkbox';
    var h = (q.options || []).map(function (opt, k) {
      var on = multi ? a.v.indexOf(opt) >= 0 : (!a.useOther && a.v === opt);
      return '<button type="button" class="opt' + (on ? ' is-on' : '') + '" data-opt="' + k + '" aria-pressed="' + on + '">' + esc(opt) + '</button>';
    }).join('');
    if (q.other) h += '<button type="button" class="opt opt--other' + (a.useOther ? ' is-on' : '') + '" data-other aria-pressed="' + !!a.useOther + '">その他</button>';
    return '<div class="opts' + (q.type === 'select' ? ' opts--select' : '') + '" role="' + (multi ? 'group' : 'radiogroup') + '">' + h + '</div>' +
      (q.other ? '<input class="field field--other" type="text" data-otherin placeholder="その他の内容を入力"' + (a.useOther ? '' : ' hidden') + ' value="' + esc(a.other || '') + '">' : '');
  }
  function controlHTML(q) {
    var a = ans(q);
    if (q.type === 'text') return '<input class="field" type="text" data-in value="' + esc(a.v) + '" autocomplete="off">';
    if (q.type === 'long') return '<textarea class="field field--long" data-in rows="4">' + esc(a.v) + '</textarea>';
    return pillsHTML(q);
  }
  function sv_() { return sv(); }
  function render() {
    var list = qs(), n = list.length, box = $('.survey__body', root), sv = sv_();
    if (st.done) {
      box.innerHTML = '<div class="survey__done"><h2 class="display">' + esc(sv.thanksTitle || 'ありがとうございました') + '</h2><p>' + esc(sv.thanksBody || '') + '</p><button type="button" class="btn btn--main" data-close>' + esc(sv.close || '閉じる') + '</button></div>';
      $('.survey__bar i', root).style.width = '100%'; $('.survey__count', root).textContent = '完了';
      $('[data-close]', root).addEventListener('click', function () { close(); }); $('[data-close]', root).focus();
      return;
    }
    $('.survey__kicker', root).textContent = sv.title || 'アンケート';
    var q = list[st.i], last = st.i === n - 1;
    $('.survey__bar i', root).style.width = ((st.i + 1) / n * 100) + '%';
    $('.survey__count', root).textContent = (st.i + 1) + ' / ' + n;
    box.innerHTML = '<div class="survey__q" key="' + esc(q.key) + '">' + (st.i === 0 && sv.lead ? '<p class="survey__lead">' + esc(sv.lead) + '</p>' : '') + '<h2 class="survey__title display" id="svq">' + esc(q.title) + (q.required ? '<em class="req">必須</em>' : '') + '</h2>' +
      (q.help ? '<p class="survey__help">' + esc(q.help) + '</p>' : '') + '<div class="survey__ctl">' + controlHTML(q) + '</div>' +
      '<p class="survey__err" role="alert">' + esc(st.err) + '</p></div>' +
      '<div class="survey__nav"><button type="button" class="btn" data-back' + (st.i === 0 ? ' disabled' : '') + '>' + esc(sv.back || '戻る') + '</button>' +
      '<button type="button" class="btn btn--main" data-next' + (st.busy ? ' disabled' : '') + '>' + esc(st.busy ? '送信中…' : (last ? (sv.submit || '送信') : (sv.next || '次へ'))) + '</button></div>';
    wire(q, last);
    var f = $('[data-in]', box) || $('.opt', box); if (f && !st.err) f.focus({ preventScroll: true });
  }
  function wire(q, last) {
    var box = $('.survey__body', root), a = ans(q), multi = q.type === 'checkbox';
    $$('[data-opt]', box).forEach(function (b) {
      b.addEventListener('click', function () {
        var opt = q.options[+b.dataset.opt];
        if (multi) { var k = a.v.indexOf(opt); if (k >= 0) a.v.splice(k, 1); else a.v.push(opt); }
        else { a.v = (a.v === opt && !a.useOther && !q.required) ? '' : opt; a.useOther = false; }
        st.err = ''; render();
      });
    });
    var ob = $('[data-other]', box);
    if (ob) ob.addEventListener('click', function () {
      a.useOther = !a.useOther; if (!multi && a.useOther) a.v = ''; st.err = ''; render();
      var oi = $('[data-otherin]', root); if (oi && a.useOther) oi.focus();
    });
    var oi = $('[data-otherin]', box); if (oi) oi.addEventListener('input', function () { a.other = oi.value; });
    var inp = $('[data-in]', box);
    if (inp) {
      inp.addEventListener('input', function () { a.v = inp.value; });
      if (q.type === 'text') inp.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' && !ev.isComposing) { ev.preventDefault(); a.v = inp.value; go(1); } });
    }
    $('[data-back]', box).addEventListener('click', function () { go(-1); });
    $('[data-next]', box).addEventListener('click', function () { go(1); });
  }
  function go(d) {
    var list = qs(), q = list[st.i];
    if (d > 0 && q.required && !filled(q)) { st.err = 'この質問は必須です。'; render(); return; }
    st.err = '';
    if (d > 0 && st.i === list.length - 1) { submit(); return; }
    st.i = Math.max(0, Math.min(list.length - 1, st.i + d)); render();
  }

  /* ---------- 送信 ---------- */
  function sendGas(values) {
    return fetch((C.source || {}).gasUrl, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ values: values, answers: qs().map(function (q) { return { title: q.title, value: valueOf(q) }; }), submittedAt: new Date().toISOString() }) });
  }
  function sendForm(values) {
    var F = SV.form || {}, E = F.entries || {}, body = new URLSearchParams(), used = 0;
    qs().forEach(function (q) {
      var ent = E[q.key]; if (!ent) return;
      var a = ans(q), o = (a.other || '').trim();
      if (q.type === 'checkbox') {
        a.v.forEach(function (v) { body.append(ent, v); used++; });
        if (a.useOther && o) { body.append(ent, '__other_option__'); body.append(ent + '.other_option_response', o); used++; }
      } else if ((q.type === 'radio' || q.type === 'select') && a.useOther) {
        if (o) { body.append(ent, '__other_option__'); body.append(ent + '.other_option_response', o); used++; }
      } else if (values[q.key]) { body.append(ent, values[q.key]); used++; }
    });
    if (!used) return Promise.reject(new Error('entries が空です'));
    return fetch('https://docs.google.com/forms/d/e/' + F.formId + '/formResponse', { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() });
  }
  function submit() {
    var values = allValues(), F = SV.form || {}, hasForm = F.formId && F.entries && Object.keys(F.entries).length, src = C.source || {}, p;
    if (src.gasUrl) p = sendGas(values);
    else if (hasForm) p = sendForm(values);
    else { st.err = '送信先がまだ設定されていません。js/config.js の survey.form.entries(tools/get-entries.js で作れます)か source.gasUrl を設定してください。回答は消えていません。'; render(); return; }
    st.busy = true; render();
    p.then(function () {
      st.busy = false; st.done = true; render();
      setTimeout(function () { S.loadData(); }, 2500);   // シートに反映されたころに、集計を読み直す
    }).catch(function (e) {
      st.busy = false; st.err = '送信できませんでした(' + (e && e.message ? e.message : '通信エラー') + ')。通信を確認して、もう一度「送信」を押してください。'; render();
    });
  }

  /* ---------- 開く・閉じる ---------- */
  function build() {
    root = document.createElement('div'); root.className = 'survey'; root.hidden = true;
    root.innerHTML = '<div class="survey__panel" role="dialog" aria-modal="true" aria-labelledby="svq"><header class="survey__head"><p class="survey__kicker display">' + esc((S.content.survey || {}).title || 'アンケート') + '</p><span class="survey__count"></span>' +
      '<button type="button" class="survey__x" aria-label="閉じる">×</button></header><div class="survey__bar" aria-hidden="true"><i></i></div><div class="survey__body"></div>' +
      '<svg class="survey__deco" viewBox="0 0 200 20" preserveAspectRatio="none" aria-hidden="true"><path d="M0 10 Q 12 0 25 10 T 50 10 T 75 10 T 100 10 T 125 10 T 150 10 T 175 10 T 200 10" fill="none" stroke="currentColor" stroke-width="3" vector-effect="non-scaling-stroke"/></svg></div>';
    document.body.appendChild(root);
    $('.survey__x', root).addEventListener('click', function () { close(); });
    root.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') { ev.stopPropagation(); close(); } });
  }
  function setInert(on) { ['stage', 'flow'].forEach(function (id) { var n = document.getElementById(id); if (n) { if (on) n.setAttribute('inert', ''); else n.removeAttribute('inert'); } }); }
  function open() {
    if (SV.enabled === false) return;
    if (!root) build();
    if (st.done) st = fresh();
    if (pendingDef && !Object.keys(st.a).length) { var d = pendingDef; pendingDef = null; adopt(d); }
    refreshQuestions();                       // 開くたびに、フォームの最新の質問を読み直す
    lastFocus = document.activeElement; setInert(true);
    root.hidden = false; void root.offsetWidth; root.classList.add('is-open');
    document.documentElement.classList.add('is-modal');
    render();
  }
  function close(reset) {
    if (!root || root.hidden) { if (reset) st = fresh(); return; }
    root.classList.remove('is-open'); document.documentElement.classList.remove('is-modal'); setInert(false);
    var r = root; setTimeout(function () { if (!r.classList.contains('is-open')) r.hidden = true; }, 320);
    if (st.done || reset === true) st = fresh();
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus({ preventScroll: true }); } catch (e) { } }
  }

  S.survey = {
    open: open, close: close, isOpen: function () { return !!root && !root.hidden; },
    /* 「結果に反映」ボタン: data-survey-open がついた要素をクリックすると開く */
    init: function () {
      if (SV.enabled === false) { $$('[data-survey-open]').forEach(function (n) { n.hidden = true; }); return; }
      document.addEventListener('click', function (ev) { var b = ev.target.closest('[data-survey-open]'); if (b) { ev.preventDefault(); open(); } });
      refreshQuestions();                     // ページを開いた時にも先に読んでおく
    }
  };
})(window.Site);
