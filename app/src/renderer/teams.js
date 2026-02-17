(function () {
  window.RelayApp = window.RelayApp || {};
  const utils = window.RelayApp.utils;
  const teamsContainer = document.getElementById('teams-container');

  function renderTeams(teamsByEvent) {
    if (!teamsContainer) return;
    if (!teamsByEvent || !Object.keys(teamsByEvent).length) {
      teamsContainer.innerHTML = '<p class="text-muted">Build teams to see results.</p>';
      return;
    }
    let html = '';
    for (const [eventName, teams] of Object.entries(teamsByEvent)) {
      if (!teams.length) continue;
      html += `<div class="event-block"><h4>${utils.escapeHtml(eventName)}</h4>`;
      for (const team of teams) {
        const [lo, hi] = team.age_group_range;
        html += `<div class="team-block">`;
        html += `<div class="age-group">Age group ${lo}–${hi}</div>`;
        html += `<div class="team-time">Total time: ${utils.formatTimeMMSS(team.total_time)} (age sum: ${team.total_age})</div>`;
        html += `<ul class="swimmers-list">`;
        if (team.is_medley && team.stroke_labels) {
          const strokeTimes = ['backstroke_50', 'breaststroke_50', 'butterfly_50', 'freestyle_50'];
          team.swimmers.forEach((s, i) => {
            const time = s[strokeTimes[i]];
            const ageStr = s.age != null ? `, ${s.age}` : '';
            html += `<li><span class="stroke-label">${team.stroke_labels[i]}:</span>${utils.escapeHtml(s.full_name)}${ageStr} <span class="swimmer-time">(${utils.formatTime(time)})</span></li>`;
          });
        } else {
          team.swimmers.forEach((s) => {
            const ageStr = s.age != null ? `, ${s.age}` : '';
            html += `<li>${utils.escapeHtml(s.full_name)}${ageStr} <span class="swimmer-time">(${utils.formatTime(s.freestyle_50)})</span> <span class="swimmer-time">(${utils.formatTime(s.freestyle_50)})</span></li>`;
          });
        }
        html += `</ul></div>`;
      }
      html += `</div>`;
    }
    teamsContainer.innerHTML = html;
  }

  window.RelayApp.teams = { renderTeams };
})();
