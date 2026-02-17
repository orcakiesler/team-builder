(function () {
  window.RelayApp = window.RelayApp || {};
  const STORAGE_LAST_MEET = 'relay_last_meet_id';
  const STORAGE_LAST_TEAMS = 'relay_last_teams';

  const state = {
    dbPath: null,
    currentSwimmers: [],
    currentCompetitions: [],
    selectedMeetId: null,
    lastTeamsResult: null,
    swimmerSelectMode: false,
  };

  function getLastMeetId() {
    try {
      const v = localStorage.getItem(STORAGE_LAST_MEET);
      return v != null ? parseInt(v, 10) : null;
    } catch (_) { return null; }
  }
  function setLastMeetId(id) {
    try {
      if (id != null) localStorage.setItem(STORAGE_LAST_MEET, String(id));
      else localStorage.removeItem(STORAGE_LAST_MEET);
    } catch (_) {}
  }
  function getLastTeamsByMeet() {
    try {
      const raw = localStorage.getItem(STORAGE_LAST_TEAMS);
      return raw ? JSON.parse(raw) : {};
    } catch (_) { return {}; }
  }
  function setLastTeamsForMeet(meetId, data) {
    if (meetId == null) return;
    const byMeet = getLastTeamsByMeet();
    byMeet[meetId] = { teams: data.teams, swimmers: data.swimmers, reference_year: data.reference_year };
    try {
      localStorage.setItem(STORAGE_LAST_TEAMS, JSON.stringify(byMeet));
    } catch (_) {}
  }

  window.RelayApp.state = state;
  window.RelayApp.AVAILABILITY_KEYS = ['freestyle', 'medley', 'freestyle_mix', 'medley_mix'];
  window.RelayApp.getLastMeetId = getLastMeetId;
  window.RelayApp.setLastMeetId = setLastMeetId;
  window.RelayApp.getLastTeamsByMeet = getLastTeamsByMeet;
  window.RelayApp.setLastTeamsForMeet = setLastTeamsForMeet;
})();
