/* core/engine.js : 場面(ページ)の登録と進行
   ページを足すには scenes/ に1ファイル作り、Site.registerScene('id', {...}) を呼んで
   config.js の sceneOrder に id を足します(scenes/_template.js を参照)。 */
(function (S) {
  var C = S.config, T = Object.assign({ introMs: 3600, overviewHoldMs: 3200, corrDwellMs: 12000, habitsMs: 14000, slideMs: 900 }, C.timing || {});
  var $ = S.$, $$ = S.$$, esc = S.esc, state = S.state;
  var CANCEL = { cancelled: true };
  var registry = S.scenes = {};
  S.timing = T;
  S.registerScene = function (id, def) { def.id = id; registry[id] = def; return def; };

  /* ---- キャンセルできる待ち時間 ---- */
  var pending = new Set(), run = { id: 0 }, hook = null, waiter = null;
  function cancellable(executor) {
    return new Promise(function (res, rej) {
      var entry = { rej: rej, t: null };
      pending.add(entry);
      executor(function (v) { clearTimeout(entry.t); pending.delete(entry); res(v); }, entry);
    });
  }
  function sleep(ms) { return cancellable(function (done, entry) { entry.t = setTimeout(done, S.reduce ? Math.min(ms, 50) : ms); }); }
  function cancelAll() { run.id++; hook = null; waiter = null; pending.forEach(function (e) { clearTimeout(e.t); e.rej(CANCEL); }); pending.clear(); }

  /* 場面から使う道具 */
  var ctx = S.ctx = {
    sleep: sleep, cancellable: cancellable, T: T,
    waitAdvance: function () { return cancellable(function (done) { waiter = done; }); },   // クリックで次へ進むまで待つ
    onAdvance: function (fn) { hook = fn; },                                               // クリックされた時の独自処理(trueを返すと「次へ」を止める)
    data: function () { return dataReady; }
  };

  var stage, track, scenes = [], curIdx = -1, lastIdx = 0, lastEnter = 0, dataReady = Promise.resolve();

  /* ---- 場面切り替えの線アニメーション ---- */
  function lineFx(dir) {
    if (C.transition === 'none' || S.reduce) return;
    var fx = document.createElement('div'); fx.className = 'fx'; stage.appendChild(fx);
    var cols = ['var(--accent)', 'var(--c2)', 'var(--c3)', 'var(--paper)', 'var(--c5)', 'var(--c4)'], n = 12, i, l, w;
    for (i = 0; i < n; i++) {
      l = document.createElement('i'); w = 28 + ((i * 37) % 50);
      l.style.cssText = 'top:' + (4 + ((i * 53) % 92)) + '%;height:' + (2 + ((i * 7) % 8)) + 'px;width:' + w + '%;background:' + cols[i % cols.length];
      fx.appendChild(l);
      l.animate([{ transform: 'translateX(' + (dir > 0 ? '135vw' : '-135vw') + ')' }, { transform: 'translateX(' + (dir > 0 ? '-140%' : '140%') + ')' }],
        { duration: T.slideMs * (0.75 + ((i * 13) % 10) / 20), delay: ((i * 29) % 12) * 22, easing: 'cubic-bezier(.55,0,.25,1)', fill: 'both' });
    }
    setTimeout(function () { fx.remove(); }, T.slideMs * 1.6 + 400);
  }

  /* ---- HUD ---- */
  function setHud(i) {
    stage.dataset.tone = scenes[i].tone || 'dark';
    var jb = $('#joinBtn'); if (jb) jb.hidden = i === 0 || (C.survey && C.survey.enabled === false);
    $$('#dots button').forEach(function (b, k) { b.classList.toggle('is-on', k === i); b.setAttribute('aria-current', k === i ? 'true' : 'false'); });
  }
  function updateBadge() {
    var b = $('#badge'); if (!b) return;
    var need = (C.source && C.source.minResponses != null) ? C.source.minResponses : 10, txt = '';
    if (state.source !== 'live' && C.showSampleBadge !== false) {
      txt = state.status === 'forced' ? '仮データ表示中(切り替え)' : state.status === 'waiting' ? '回答 ' + (state.liveCount || 0) + '/' + need + '人 ・ 仮データ表示'
        : state.status === 'error' ? '読み込めず ・ 仮データ表示' : 'サンプルデータ';
    }
    b.hidden = !txt; b.textContent = txt;
    b.title = state.status === 'error' ? (state.errorText || '') : '';
  }
  S.updateBadge = updateBadge;

  /* ---- 場面に入る ---- */
  function enterScene(i, instant) {
    var sc = scenes[i];
    sc.el.classList.remove('is-active', 'is-instant');
    sc.build(sc.el);
    setHud(i);
    var far = curIdx >= 0 && Math.abs(i - curIdx) > 1, dir = i >= curIdx ? 1 : -1;
    curIdx = i; lastEnter = Date.now();
    var quick = instant || far || S.reduce;
    track.style.transition = quick ? 'none' : '';
    track.style.transform = 'translateX(' + (-i * 100) + '%)';
    if (quick) { void track.offsetWidth; track.style.transition = ''; } else lineFx(dir);
    requestAnimationFrame(function () { sc.el.classList.add('is-active'); });
    var atEnd = i === lastIdx;
    if (atEnd) document.documentElement.classList.remove('is-locked');
    $('#cue').hidden = !atEnd;
    return quick ? Promise.resolve() : sleep(T.slideMs * 0.85);
  }
  function leaveAll() { scenes.forEach(function (s) { if (s.leave) s.leave(); }); }
  function playFrom(i, instant) {
    cancelAll(); leaveAll(); var id = run.id;
    return (async function () {
      try {
        for (var k = i; k < scenes.length; k++) {
          if (run.id !== id) return;
          var sc = scenes[k];
          if (sc.skip && sc.skip()) continue;
          await enterScene(k, instant && k === i);
          await sc.play(ctx);
        }
      } catch (e) { if (e !== CANCEL) console.error(e); }
    })();
  }
  function nav(delta) {
    var k = Math.max(0, Math.min(lastIdx, curIdx + delta));
    while (scenes[k].skip && scenes[k].skip() && k > 0 && k < lastIdx) k += delta;
    playFrom(k);
  }
  /* 画面のどこかをクリックした時 */
  function advance() {
    var sc = scenes[curIdx]; if (!sc) return;
    if (hook && hook()) return;
    if (waiter) { var w = waiter; waiter = null; w(); return; }
    if (sc.interactive || curIdx >= lastIdx) return;
    if (Date.now() - lastEnter < 350) return;
    nav(1);
  }
  S.advance = advance;

  S.engine = {
    init: function () {
      stage = $('#stage'); track = $('#track');
      stage.style.setProperty('--slide', T.slideMs + 'ms');
      scenes = (C.sceneOrder || []).map(function (id) { if (!registry[id]) { console.warn('[いい曲の条件] 登録されていない場面です:', id); return null; } return registry[id]; }).filter(Boolean);
      lastIdx = scenes.length - 1;
      scenes.forEach(function (sc) {
        var el = document.createElement('section'); el.className = 'scene'; el.dataset.tone = sc.tone || 'dark'; el.setAttribute('aria-label', sc.label || sc.id);
        sc.el = el; track.appendChild(el);
      });
      $('.hud', stage).innerHTML = '<p class="hud__brand">' + esc(S.content.meta.siteName) + '</p><span class="hud__badge" id="badge" hidden></span><button class="hud__btn hud__btn--cta" id="joinBtn" type="button" data-survey-open hidden aria-label="' + esc(S.content.copy.surveyBtn || '回答する') + '"><span>聴き方を答える</span></button><nav class="hud__nav" aria-label="場面の操作"><button class="hud__btn" id="prev" type="button" aria-label="前の場面"><span>‹</span></button><button class="hud__btn" id="next" type="button" aria-label="次の場面"><span>›</span></button><button class="hud__btn" id="skip" type="button"><span>最後へ »</span></button></nav>';
      $('#dots').innerHTML = scenes.map(function (sc, i) { return '<button type="button" aria-label="' + esc(sc.label || sc.id) + 'へ" data-i="' + i + '"><i></i></button>'; }).join('');
      $$('#dots button').forEach(function (b) { b.addEventListener('click', function () { playFrom(+b.dataset.i); }); });
      $('#prev').addEventListener('click', function () { nav(-1); });
      $('#next').addEventListener('click', function () { nav(1); });
      $('#skip').addEventListener('click', function () { playFrom(lastIdx, true); });
      $('#cue').addEventListener('click', function () { var o = $('#overview'); if (o) o.scrollIntoView({ behavior: S.reduce ? 'auto' : 'smooth' }); });
      if (C.clickToAdvance !== false) {
        stage.addEventListener('click', function (ev) {
          if (ev.target.closest('button, a, input, select, textarea, [data-noadvance], .drawer')) return;
          advance();
        });
      }
      document.addEventListener('keydown', function (ev) {
        if (window.scrollY > 40 || document.documentElement.classList.contains('is-modal')) return;
        if (ev.key === 'Escape') leaveAll();
        else if (ev.key === 'ArrowRight') nav(1);
        else if (ev.key === 'ArrowLeft') nav(-1);
        else if (ev.key === ' ' || ev.key === 'Enter') { if (!ev.target.closest('button, a')) { ev.preventDefault(); advance(); } }
      });
      updateBadge();
    },
    setDataReady: function (p) { dataReady = p; },
    start: function () {
      document.documentElement.classList.add('is-locked');
      if (S.reduce || C.autoplay === false) playFrom(lastIdx, true); else playFrom(0);
    },
    current: function () { return scenes[curIdx]; },
    index: function () { return curIdx; },
    /* 最初の画面にもどす(放置リセット用): アンケートを閉じ、縦スクロールをまたロックして、はじめの画面から */
    reset: function () {
      var d = document.documentElement;
      S.state.level = null;
      if (S.survey) S.survey.close(true);
      window.scrollTo(0, 0);
      d.classList.add('is-locked');
      playFrom(0, true);
    }
  };
})(window.Site);
