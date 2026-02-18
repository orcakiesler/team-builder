(function () {
  window.RelayApp = window.RelayApp || {};
  function formatTime(sec) {
    if (sec == null) return '–';
    const s = Number(sec);
    return isNaN(s) ? '–' : `${s.toFixed(2)}s`;
  }
  function formatTimeMMSS(sec) {
    if (sec == null) return '–';
    const s = Number(sec);
    if (isNaN(s)) return '–';
    const min = Math.floor(s / 60);
    const remainder = s % 60;
    return `${min}:${remainder.toFixed(2).padStart(5, '0')}`;
  }
  function escapeHtml(s) {
    if (s == null) return '';
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }
  window.RelayApp.utils = { formatTime, formatTimeMMSS, escapeHtml };
})();
