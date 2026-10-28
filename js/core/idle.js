/* core/idle.js : しばらく操作しないと、最初の画面に戻るモード
   ・ON/OFF のスイッチは、縦スクロールのいちばん下(右下)にあります。選んだ状態はその人のブラウザに記憶されます。
   ・初期値と秒数は js/config.js の idle で決めます。 */
(function (S) {
  var C = S.config, I = C.idle || {}, KEY = 'ii-idle-reset', timer = null, on = I.enabled !== false, secs = Math.max(5, +I.seconds || 90);
  try { var v = localStorage.getItem(KEY); if (v === '1') on = true; else if (v === '0') on = false; } catch (e) { }

  var last = 0;
  function bump() { var t = Date.now(); if (t - last < 250) return; last = t; arm(); }
  function arm() {
    clearTimeout(timer);
    if (!on) return;
    timer = setTimeout(fire, secs * 1000);
  }
  function fire() {
    if (!on) return;
    var atStart = S.engine.index() === 0 && window.scrollY < 4 && !S.survey.isOpen();
    if (!atStart) S.engine.reset();
    arm();
  }
  function paint() {
    S.$$('[data-idle-toggle]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(on));
      b.querySelector('.sw__state').textContent = on ? 'ON' : 'OFF';
      b.title = on ? secs + '秒操作がないと最初の画面に戻ります' : '放置しても画面は戻りません';
    });
  }
  function set(v) {
    on = !!v; try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) { }
    paint(); arm();
  }
  S.idle = {
    init: function () {
      ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll'].forEach(function (t) { window.addEventListener(t, bump, { passive: true, capture: true }); });
      document.addEventListener('click', function (ev) { var b = ev.target.closest('[data-idle-toggle]'); if (b) set(!on); });
      paint(); arm();
    },
    /* 縦スクロールを描き直した時、スイッチの表示を合わせる */
    paint: paint,
    toggleHTML: function () {
      return '<button type="button" class="sw" data-idle-toggle role="switch" aria-pressed="' + on + '"><span class="sw__knob" aria-hidden="true"></span><span class="sw__label">放置で最初に戻る</span><b class="sw__state">' + (on ? 'ON' : 'OFF') + '</b></button>';
    },
    isOn: function () { return on; }, seconds: secs
  };
})(window.Site);
