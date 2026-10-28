/* core/preview.js : おすすめ曲の再生ボタン(▶)
   ・YouTube のリンクと「サビの開始(秒)」が設定されている曲 → その秒数から YouTube の小さなプレーヤーで再生
   ・それ以外 → iTunes の30秒試聴(曲の聴きどころが選ばれることが多いですが、サビからとは限りません)
   ・同時に流れるのは1曲だけ。もう一度押すと止まります。 */
(function (S) {
  var cur = null;   // { btn, audio, frame, token }
  var seq = 0;
  function ytId(u) { var m = String(u || '').match(/(?:youtu\.be\/|[?&]v=|\/shorts\/|\/embed\/)([\w-]{11})/); return m ? m[1] : ''; }
  function secs(v) {
    v = String(v || '').normalize('NFKC').trim(); if (!v) return 0;
    var m = v.match(/^(\d+):(\d{1,2})$/); if (m) return +m[1] * 60 + +m[2];
    var n = parseInt(v, 10); return isNaN(n) ? 0 : n;
  }
  function paint(btn, state, label) {
    btn.classList.toggle('is-on', state === 'on'); btn.classList.toggle('is-wait', state === 'wait'); btn.classList.toggle('is-none', state === 'none');
    var sp = btn.querySelector('span'); if (sp) sp.textContent = state === 'on' ? '■' : state === 'wait' ? '…' : state === 'none' ? '×' : '▶';
    btn.setAttribute('aria-pressed', String(state === 'on'));
    btn.title = label || 'サビ付近を試聴';
    note(btn, state === 'none' ? (label || '') : '');
  }
  function note(btn, text) {        // 失敗した時は、曲の下に理由を表示する
    var li = btn.closest('li'); if (!li) return;
    var n = li.querySelector('.song__msg');
    if (!text) { if (n) n.remove(); return; }
    if (!n) { n = document.createElement('p'); n.className = 'song__msg'; li.appendChild(n); }
    n.textContent = text;
  }
  function stop() {
    if (!cur) return;
    var c = cur; cur = null; seq++;
    if (c.audio) { try { c.audio.pause(); } catch (e) { } c.audio.src = ''; }
    if (c.frame) c.frame.remove();
    if (c.btn && c.btn.isConnected) paint(c.btn, 'off', 'サビ付近を試聴');
  }
  function embed(btn, id, from, label) {
    var li = btn.closest('li'), f = document.createElement('div');
    f.className = 'song__player';
    f.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + id + '?start=' + from + '&autoplay=1&rel=0&playsinline=1" title="' + String(btn.dataset.title).replace(/"/g, '') + '" allow="autoplay; encrypted-media" referrerpolicy="strict-origin-when-cross-origin"></iframe>';
    (li || btn.parentNode).appendChild(f); cur.frame = f; paint(btn, 'on', label || '止める');
  }
  function start(btn) {
    var title = btn.dataset.title, artist = btn.dataset.artist, link = btn.dataset.link, chorus = secs(btn.dataset.chorus), id = ytId(link), my = ++seq;
    cur = { btn: btn };
    if (id && chorus > 0) { embed(btn, id, chorus); return; }       // 設定されたサビから(YouTube)
    paint(btn, 'wait', '読み込み中');
    var look = S.lookup && S.lookup.preview ? S.lookup.preview(title, artist) : Promise.resolve({ error: true });
    look.then(function (r) {
      if (seq !== my || !cur || cur.btn !== btn) return;
      if (!r.url) {
        if (id) { embed(btn, id, 0, '止める(YouTubeを曲の頭から再生中)'); return; }   // 試聴が無くてもYouTubeのリンクがあれば、それを流す
        cur = null; paint(btn, 'none', r.error ? '通信できないため、試聴を取得できませんでした(もう一度押すと再試行します)' : 'この曲の試聴は見つかりませんでした'); return;
      }
      var a = new Audio(); cur.audio = a; a.preload = 'auto';
      a.addEventListener('ended', function () { if (cur && cur.audio === a) stop(); });
      a.addEventListener('error', function () { if (seq === my && cur && cur.audio === a) { cur = null; paint(btn, 'none', '音声を読み込めませんでした(もう一度押すと再試行します)'); } });
      a.src = r.url;
      var p = a.play(); if (p && p.then) p.then(function () { if (seq === my && cur && cur.audio === a) paint(btn, 'on', '止める'); }).catch(function (e) { if (seq === my && cur && cur.audio === a) { cur = null; paint(btn, 'none', (e && e.name === 'NotAllowedError') ? 'ブラウザに再生をブロックされました。もう一度押してください' : '再生できませんでした(もう一度押すと再試行します)'); } });
    });
  }
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('[data-play]'); if (!b) return;
    ev.preventDefault(); ev.stopPropagation();
    if (cur && cur.btn === b) { stop(); return; }
    stop(); start(b);
  }, true);
  S.preview = { stop: stop };
})(window.Site);
