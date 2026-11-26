/* أفكار الريادة — سكربت الواجهة الثابتة (بدون أي مكتبات)
 * كل عنصر تفاعلي يحمل data-armc-region و data-armc-state.
 * الحالات البديلة محفوظة في <template id="REGION-sSTATE">،
 * وجدول الانتقالات في <script id="armc-flow"> : {region:{state:{رقم الزر داخل العنصر: الحالة التالية}}}.
 * عند الربط مع نظام أودو تُستبدل هذه الانتقالات بطلبات حقيقية للخادم. */
(function () {
  var flowEl = document.getElementById('armc-flow');
  var FLOW = flowEl ? JSON.parse(flowEl.textContent) : {};
  function buttons(root) {
    return Array.prototype.filter.call(root.querySelectorAll('button'), function (b) { return !b.classList.contains('tgl'); });
  }
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('button'); if (!btn || btn.classList.contains('tgl')) return;
    var root = btn.closest('[data-armc-region]'); if (!root) return;
    var r = root.getAttribute('data-armc-region'), s = root.getAttribute('data-armc-state');
    var k = buttons(root).indexOf(btn);
    var next = FLOW[r] && FLOW[r][s] && FLOW[r][s][k];
    if (next === undefined) return;
    e.preventDefault();
    var tpl = next === 0 ? null : document.getElementById(r + '-s' + next);
    var fresh = tpl ? tpl.content.firstElementChild.cloneNode(true) : (window.__armcInit[r] || root).cloneNode(true);
    root.replaceWith(fresh);
  });
  // نسخة الحالة الأولى لكل عنصر (للرجوع إليها)
  window.__armcInit = {};
  document.querySelectorAll('[data-armc-region][data-armc-state="0"]').forEach(function (el) {
    window.__armcInit[el.getAttribute('data-armc-region')] = el.cloneNode(true);
  });
  // زر الوضع الساطع / الداكن (الرئيسية — النموذج ب): يبدّل الصنف light على .th والألوان متغيرات CSS
  function setTheme(light) {
    document.querySelectorAll('.th').forEach(function (th) { th.classList.toggle('light', light); });
    document.querySelectorAll('.tgl').forEach(function (t) { t.setAttribute('aria-pressed', light ? 'true' : 'false'); });
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest('.tgl'); if (!t) return;
    var th = document.querySelector('.th'); var light = !(th && th.classList.contains('light'));
    setTheme(light);
    try { localStorage.setItem('armc-theme', light ? 'light' : 'dark'); } catch (x) {}
  });
  try { var saved = localStorage.getItem('armc-theme'); if (saved && document.querySelector('.th')) setTheme(saved === 'light'); } catch (x) {}
})();
