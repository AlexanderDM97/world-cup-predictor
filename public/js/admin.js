let adminToken = sessionStorage.getItem('wc_admin_token');
let allMatches = [];
let currentAdminFilter = 'all';

const STAGE_LABELS = {
  group: 'Group', r32: 'R32', r16: 'R16',
  qf: 'QF', sf: 'SF', third: '3rd', final: 'Final',
};

function showAdminAlert(msg, type = 'danger', id = 'admin-alert2') {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.className = `alert alert-${type}`;
}
function hideAdminAlert(id = 'admin-alert2') {
  document.getElementById(id).className = 'alert hidden';
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Login ──────────────────────────────────────────────────────────────
function checkLogin() {
  if (adminToken) {
    document.getElementById('login-overlay').classList.add('hidden');
    document.getElementById('admin-ui').classList.remove('hidden');
    refreshMatches();
    refreshParticipants();
  }
}
checkLogin();

document.getElementById('admin-login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const pw = document.getElementById('admin-password').value;
  try {
    const res = await fetch('/api/auth/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    });
    const data = await res.json();
    if (!res.ok) { showAdminAlert(data.error, 'danger', 'admin-alert'); return; }
    adminToken = data.token;
    sessionStorage.setItem('wc_admin_token', adminToken);
    checkLogin();
  } catch {
    showAdminAlert('Network error', 'danger', 'admin-alert');
  }
});

document.getElementById('btn-admin-logout').onclick = () => {
  sessionStorage.removeItem('wc_admin_token');
  adminToken = null;
  document.getElementById('login-overlay').classList.remove('hidden');
  document.getElementById('admin-ui').classList.add('hidden');
};

// ── Recalculate all points ─────────────────────────────────────────────
async function recalculateAll() {
  if (!confirm('Recalculate all match points using the current scoring rules?\nThis will overwrite all stored points.')) return;
  try {
    const res  = await fetch('/api/admin/recalculate-all', { method: 'POST', headers: { Authorization: `Bearer ${adminToken}` } });
    const data = await res.json();
    if (!res.ok) { showAdminAlert(data.error); return; }
    showAdminAlert(`✅ Recalculated — ${data.predictions_updated} predictions updated.`, 'success');
    refreshParticipants();
  } catch {
    showAdminAlert('Network error during recalculation.');
  }
}
window.recalculateAll = recalculateAll;

// ── Participants ───────────────────────────────────────────────────────
async function refreshParticipants() {
  try {
    const res  = await fetch('/api/admin/participants', { headers: { Authorization: `Bearer ${adminToken}` } });
    const data = await res.json();
    if (!res.ok) { showAdminAlert(data.error); return; }

    updateStats(data);

    if (!data.length) {
      document.getElementById('participants-table-wrap').innerHTML =
        '<p class="text-muted fs-sm" style="padding:.5rem">No participants yet.</p>';
      return;
    }
    const rows = data.map((p, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${escHtml(p.name)}</strong></td>
        <td class="text-muted fs-sm">${p.predicted_champion || '—'}</td>
        <td>${p.predictions_count}</td>
        <td>${p.prediction_points}</td>
        <td>${p.champion_points || 0}</td>
        <td><strong>${p.total_points}</strong></td>
        <td class="text-muted fs-sm">${new Date(p.created_at).toLocaleDateString()}</td>
      </tr>`).join('');
    document.getElementById('participants-table-wrap').innerHTML = `
      <table class="admin-table">
        <thead><tr>
          <th>#</th><th>Name</th><th>Champion pick</th>
          <th>Preds</th><th>Match pts</th><th>Champ pts</th><th>Total</th><th>Joined</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  } catch { showAdminAlert('Failed to load participants'); }
}
window.refreshParticipants = refreshParticipants;

function updateStats(participants) {
  const totalPred = participants.reduce((s, p) => s + p.predictions_count, 0);
  const statsData = [
    { label: 'Participants',    value: participants.length,                         icon: '👥' },
    { label: 'Predictions',     value: totalPred,                                   icon: '📝' },
    { label: 'Matches entered', value: allMatches.filter(m => m.result_entered).length, icon: '✅' },
    { label: 'Total matches',   value: allMatches.length,                           icon: '⚽' },
  ];
  document.getElementById('stats-row').innerHTML = statsData.map(s => `
    <div class="card" style="padding:1rem;text-align:center">
      <div style="font-size:1.5rem">${s.icon}</div>
      <div style="font-size:1.6rem;font-weight:700;color:var(--green-dark)">${s.value}</div>
      <div class="text-muted fs-sm">${s.label}</div>
    </div>`).join('');
}

// ── Matches ────────────────────────────────────────────────────────────
async function refreshMatches() {
  try {
    const res = await fetch('/api/admin/matches', { headers: { Authorization: `Bearer ${adminToken}` } });
    if (res.status === 401) { sessionStorage.removeItem('wc_admin_token'); adminToken = null; checkLogin(); return; }
    allMatches = await res.json();
    renderMatchesTable();
  } catch { showAdminAlert('Failed to load matches'); }
}
window.refreshMatches = refreshMatches;

function adminFilter(btn, filter) {
  document.querySelectorAll('#admin-filter-bar .ftab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentAdminFilter = filter;
  renderMatchesTable();
}
window.adminFilter = adminFilter;

function getAdminFiltered() {
  return allMatches.filter(m => {
    if (currentAdminFilter === 'all') return true;
    if (currentAdminFilter === 'pending') return !m.result_entered && new Date() >= new Date(m.kickoff_time);
    return m.stage === currentAdminFilter;
  });
}

function renderMatchesTable() {
  const list = getAdminFiltered();
  if (!list.length) {
    document.getElementById('matches-table-wrap').innerHTML =
      '<p class="text-muted fs-sm" style="padding:.75rem">No matches.</p>';
    return;
  }
  const rows = list.map(m => {
    const kickoff = new Date(m.kickoff_time).toLocaleString('nl-BE', {
      timeZone: 'Europe/Brussels', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    const deadlineStr = m.prediction_deadline
      ? `<br><small style="color:#e67e22">🔒 Deadline: ${new Date(m.prediction_deadline).toLocaleString('nl-BE', {
          timeZone: 'Europe/Brussels', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        })} CET</small>`
      : '';
    let resultCell;
    if (m.result_entered) {
      const penStr = m.actual_penalties
        ? ` <span class="text-muted fs-sm">(pen ${m.actual_penalties_home}–${m.actual_penalties_away})</span>`
        : '';
      const etStr = m.actual_extra_time && !m.actual_penalties ? `<span class="text-muted fs-sm"> +ET</span>` : '';
      resultCell = `<span style="font-weight:700">${m.actual_home_score}–${m.actual_away_score}</span>
        <span class="text-muted fs-sm"> ⚽${m.actual_first_goal_minute === 0 ? '–' : m.actual_first_goal_minute + '\''}</span>
        ${etStr}${penStr}`;
    } else {
      resultCell = `<span class="text-muted fs-sm">—</span>`;
    }
    const enterBtn = `<button class="btn btn-xs btn-primary" onclick="openResult(${m.id})">
      ${m.result_entered ? 'Edit' : 'Enter result'}
    </button>`;
    return `
      <tr class="${m.result_entered ? 'result-done' : ''}">
        <td class="text-muted fs-sm">${escHtml(STAGE_LABELS[m.stage] || m.stage)}${m.group_name ? ' · ' + escHtml(m.group_name.replace('Group ', '')) : ''}</td>
        <td><strong>${escHtml(m.home_team)}</strong> vs <strong>${escHtml(m.away_team)}</strong></td>
        <td class="text-muted fs-sm">${kickoff} CET${deadlineStr}</td>
        <td>${resultCell}</td>
        <td class="text-muted fs-sm">${m.prediction_count}</td>
        <td>
          <div class="admin-actions">
            ${enterBtn}
            <button class="btn btn-xs btn-outline" onclick="openEdit(${m.id})">Edit</button>
            <button class="btn btn-xs btn-danger"  onclick="deleteMatch(${m.id})">✕</button>
          </div>
        </td>
      </tr>`;
  }).join('');
  document.getElementById('matches-table-wrap').innerHTML = `
    <table class="admin-table">
      <thead><tr>
        <th>Stage</th><th>Match</th><th>Kickoff (CET)</th><th>Result</th><th>Preds</th><th>Actions</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// ── Result modal ───────────────────────────────────────────────────────
function openResult(id) {
  const m = allMatches.find(m => m.id === id);
  document.getElementById('result-match-id').value    = id;
  document.getElementById('result-match-stage').value = m.stage;
  document.getElementById('result-modal-title').textContent = `Result: ${m.home_team} vs ${m.away_team}`;
  document.getElementById('home-label').textContent   = m.home_team;
  document.getElementById('away-label').textContent   = m.away_team;
  document.getElementById('pen-home-label').textContent = `${m.home_team} pen goals`;
  document.getElementById('pen-away-label').textContent = `${m.away_team} pen goals`;
  document.getElementById('result-home').value = m.actual_home_score ?? '';
  document.getElementById('result-away').value = m.actual_away_score ?? '';
  document.getElementById('result-fgm').value  = m.actual_first_goal_minute ?? '';
  document.getElementById('result-winner').value = m.actual_winner || '';

  const isKnockout = m.stage !== 'group';
  document.getElementById('winner-field').style.display    = isKnockout ? '' : 'none';
  document.getElementById('result-et-section').style.display = isKnockout ? '' : 'none';

  // Restore existing ET/pen values
  document.getElementById('result-extra-time').checked = !!(m.actual_extra_time && isKnockout);
  toggleResultPen();
  document.getElementById('result-penalties').checked = !!(m.actual_penalties && isKnockout);
  toggleResultPenScore();
  document.getElementById('result-pen-home').value = m.actual_penalties_home ?? '';
  document.getElementById('result-pen-away').value = m.actual_penalties_away ?? '';

  document.getElementById('result-alert').className = 'alert hidden';
  document.getElementById('result-modal').classList.add('open');
}
window.openResult = openResult;

function toggleResultPen() {
  const checked = document.getElementById('result-extra-time').checked;
  document.getElementById('result-pen-section').style.display = checked ? '' : 'none';
  if (!checked) {
    document.getElementById('result-penalties').checked = false;
    toggleResultPenScore();
  }
}
window.toggleResultPen = toggleResultPen;

function toggleResultPenScore() {
  const checked = document.getElementById('result-penalties').checked;
  document.getElementById('result-pen-scores').style.display = checked ? '' : 'none';
}
window.toggleResultPenScore = toggleResultPenScore;

async function submitResult() {
  const id         = parseInt(document.getElementById('result-match-id').value);
  const home       = parseInt(document.getElementById('result-home').value);
  const away       = parseInt(document.getElementById('result-away').value);
  const fgm        = parseInt(document.getElementById('result-fgm').value);
  const winner     = document.getElementById('result-winner').value || null;
  const extraTime  = document.getElementById('result-extra-time').checked;
  const penalties  = extraTime && document.getElementById('result-penalties').checked;
  const penHome    = penalties ? (parseInt(document.getElementById('result-pen-home').value) || 0) : null;
  const penAway    = penalties ? (parseInt(document.getElementById('result-pen-away').value) || 0) : null;
  const alertEl    = document.getElementById('result-alert');

  if (isNaN(home) || isNaN(away) || isNaN(fgm)) {
    alertEl.textContent = 'Please fill in all score fields';
    alertEl.className = 'alert alert-danger';
    return;
  }
  if (penalties && (isNaN(penHome) || isNaN(penAway))) {
    alertEl.textContent = 'Please enter the penalty shootout score';
    alertEl.className = 'alert alert-danger';
    return;
  }
  try {
    const res = await fetch(`/api/admin/matches/${id}/result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        home_score: home, away_score: away, first_goal_minute: fgm, winner,
        extra_time: extraTime, penalties, penalties_home: penHome, penalties_away: penAway,
      }),
    });
    const data = await res.json();
    if (!res.ok) { alertEl.textContent = data.error; alertEl.className = 'alert alert-danger'; return; }
    closeModal('result-modal');
    showAdminAlert(`Result saved. ${data.predictions_updated} prediction(s) updated.`, 'success');
    refreshMatches();
    refreshParticipants();
  } catch {
    alertEl.textContent = 'Network error';
    alertEl.className = 'alert alert-danger';
  }
}
window.submitResult = submitResult;

// ── Edit modal ─────────────────────────────────────────────────────────
function setSelectOrAddOption(selectId, value) {
  const sel = document.getElementById(selectId);
  sel.value = value;
  if (sel.value !== value) {
    // Value not in list — add a temporary option so existing data isn't lost
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = value;
    sel.insertBefore(opt, sel.firstChild.nextSibling);
    sel.value = value;
  }
}

function openEdit(id) {
  const m = allMatches.find(m => m.id === id);
  document.getElementById('edit-match-id').value  = id;
  setSelectOrAddOption('edit-home', m.home_team);
  setSelectOrAddOption('edit-away', m.away_team);
  document.getElementById('edit-group').value     = m.group_name || '';
  document.getElementById('edit-stage').value     = m.stage;
  document.getElementById('edit-kickoff').value   = new Date(m.kickoff_time).toISOString().slice(0, 16);
  document.getElementById('edit-venue').value     = m.venue || '';
  document.getElementById('edit-deadline').value  = m.prediction_deadline ? new Date(m.prediction_deadline).toISOString().slice(0, 16) : '';
  document.getElementById('edit-alert').className = 'alert hidden';
  document.getElementById('edit-modal').classList.add('open');
}
window.openEdit = openEdit;

async function submitEdit() {
  const id        = parseInt(document.getElementById('edit-match-id').value);
  const dlVal     = document.getElementById('edit-deadline').value;
  const body = {
    home_team:           document.getElementById('edit-home').value.trim(),
    away_team:           document.getElementById('edit-away').value.trim(),
    group_name:          document.getElementById('edit-group').value.trim() || null,
    stage:               document.getElementById('edit-stage').value,
    kickoff_time:        new Date(document.getElementById('edit-kickoff').value).toISOString(),
    venue:               document.getElementById('edit-venue').value.trim() || null,
    prediction_deadline: dlVal ? new Date(dlVal).toISOString() : null,
  };
  const alertEl = document.getElementById('edit-alert');
  try {
    const res = await fetch(`/api/admin/matches/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) { alertEl.textContent = data.error; alertEl.className = 'alert alert-danger'; return; }
    closeModal('edit-modal');
    refreshMatches();
  } catch {
    alertEl.textContent = 'Network error';
    alertEl.className = 'alert alert-danger';
  }
}
window.submitEdit = submitEdit;

// ── Add modal ──────────────────────────────────────────────────────────
function openAddMatch() {
  document.getElementById('add-home').value     = '';
  document.getElementById('add-away').value     = '';
  document.getElementById('add-group').value    = '';
  document.getElementById('add-stage').value    = 'group';
  document.getElementById('add-kickoff').value  = '';
  document.getElementById('add-venue').value    = '';
  document.getElementById('add-deadline').value = '';
  document.getElementById('add-alert').className = 'alert hidden';
  document.getElementById('add-modal').classList.add('open');
}
window.openAddMatch = openAddMatch;

async function submitAdd() {
  const dlVal = document.getElementById('add-deadline').value;
  const body = {
    home_team:           document.getElementById('add-home').value.trim(),
    away_team:           document.getElementById('add-away').value.trim(),
    group_name:          document.getElementById('add-group').value.trim() || null,
    stage:               document.getElementById('add-stage').value,
    kickoff_time:        new Date(document.getElementById('add-kickoff').value).toISOString(),
    venue:               document.getElementById('add-venue').value.trim() || null,
    prediction_deadline: dlVal ? new Date(dlVal).toISOString() : null,
  };
  const alertEl = document.getElementById('add-alert');
  if (!body.home_team || !body.away_team) {
    alertEl.textContent = 'Home and away team are required';
    alertEl.className = 'alert alert-danger';
    return;
  }
  try {
    const res = await fetch('/api/admin/matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) { alertEl.textContent = data.error; alertEl.className = 'alert alert-danger'; return; }
    closeModal('add-modal');
    refreshMatches();
  } catch {
    alertEl.textContent = 'Network error';
    alertEl.className = 'alert alert-danger';
  }
}
window.submitAdd = submitAdd;

// ── Delete ─────────────────────────────────────────────────────────────
async function deleteMatch(id) {
  const m = allMatches.find(m => m.id === id);
  if (!confirm(`Delete "${m.home_team} vs ${m.away_team}"? This also deletes all predictions for this match.`)) return;
  try {
    await fetch(`/api/admin/matches/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${adminToken}` } });
    refreshMatches();
    refreshParticipants();
  } catch { showAdminAlert('Delete failed'); }
}
window.deleteMatch = deleteMatch;

// ── Modal helpers ──────────────────────────────────────────────────────
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
window.closeModal = closeModal;

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});
