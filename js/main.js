/* main.js : 起動 */
(function (S) {
  var C = S.config;
  function init() {
    document.documentElement.dataset.palette = C.palette || 'wrapped';
    document.title = S.content.meta.siteName;
    S.useSample();                      // まず仮のデータで画面を作る
    S.engine.init();
    S.flow.render();
    S.survey.init();
    S.idle.init();
    S.engine.setDataReady(S.loadData()); // 回答を読み込めたら、全体を回答の内容に切り替える
    S.onData(function () { S.updateBadge(); S.flow.render(); });
    var src = C.source || {};
    if (C.refreshSeconds > 0 && (src.sheetId || src.gasUrl)) setInterval(function () { S.loadData(); }, C.refreshSeconds * 1000);
    S.engine.start();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window.Site);
