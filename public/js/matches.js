const token  = localStorage.getItem('wc_token');
const myName = localStorage.getItem('wc_name');
if (!token) window.location.href = 'index.html';

document.getElementById('user-display').textContent = myName ? `👤 ${myName}` : '';
document.getElementById('btn-logout').onclick = () => {
  localStorage.removeItem('wc_token');
  localStorage.removeItem('wc_name');
  localStorage.removeItem('wc_champion');
  window.location.href = 'index.html';
};

const FLAG_ISO = {
  'Algeria':'dz','Argentina':'ar','Australia':'au','Austria':'at',
  'Belgium':'be','Bosnia & Herz.':'ba','Bosnia & Herzegovina':'ba','Brazil':'br',
  'Canada':'ca','Cape Verde':'cv','Colombia':'co','Croatia':'hr','Curacao':'cw',
  'Czechia':'cz','Czech Republic':'cz',
  'DR Congo':'cd',
  'Ecuador':'ec','Egypt':'eg','England':'gb-eng',
  'France':'fr',
  'Germany':'de','Ghana':'gh',
  'Haiti':'ht',
  'Iran':'ir','Iraq':'iq','Ivory Coast':'ci',
  'Japan':'jp','Jordan':'jo',
  'Mexico':'mx','Morocco':'ma',
  'Netherlands':'nl','New Zealand':'nz','Norway':'no',
  'Panama':'pa','Paraguay':'py','Portugal':'pt',
  'Qatar':'qa',
  'Saudi Arabia':'sa','Scotland':'gb-sct','Senegal':'sn',
  'South Africa':'za','South Korea':'kr','Spain':'es','Sweden':'se','Switzerland':'ch',
  'Tunisia':'tn','Turkiye':'tr','Türkiye':'tr','Turkey':'tr',
  'Uruguay':'uy','USA':'us','Uzbekistan':'uz',
};
function flag(team) {
  const iso = FLAG_ISO[team];
  if (!iso) return '';
  return `<img src="https://flagcdn.com/40x30/${iso}.png" alt="${team}" style="width:40px;height:30px;display:block;margin:0 auto 4px">`;
}

const STAGE_LABELS = {
  group: 'Group Stage', r32: 'Round of 32', r16: 'Round of 16',
  qf: 'Quarter-final', sf: 'Semi-final', third: '3rd Place Play-off', final: 'Final',
};
const STAGE_ORDER = ['group','r32','r16','qf','sf','third','final'];
const KNOCKOUT_STAGES = new Set(['r32','r16','qf','sf','third','final']);

function isCET(date) {
  return date.toLocaleString('nl-BE', {
    timeZone: 'Europe/Brussels',
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }) + ' CET';
}

let allMatches    = [];
let myPredictions = {};
let currentFilter = 'all';

async function load() {
  try {
    const [mRes, pRes] = await Promise.all([
      fetch('/api/matches'),
      fetch('/api/predictions/my', { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    if (mRes.status === 401 || pRes.status === 401) { localStorage.clear(); window.location.href = 'index.html'; return; }
    allMatches = await mRes.json();
    const preds = await pRes.json();
    preds.forEach(p => { myPredictions[p.match_id] = p; });
    render();
    scrollToToday();
  } catch {
    document.getElementById('matches-root').innerHTML =
      '<div class="loading-wrap text-muted">Failed to load matches. Is the server running?</div>';
  }
}

function matchStatus(m) {
  if (m.result_entered) return 'done';
  const deadline = m.prediction_deadline || m.kickoff_time;
  if (new Date() >= new Date(deadline)) return 'locked';
  return 'open';
}

function getFiltered() {
  return allMatches.filter(m => {
    if (currentFilter === 'all')  return true;
    if (currentFilter === 'open') return matchStatus(m) === 'open';
    if (currentFilter === 'done') return matchStatus(m) === 'done';
    if (currentFilter === 'mine') return !!myPredictions[m.id];
    return true;
  });
}

function cetDateKey(isoStr) {
  return new Date(isoStr).toLocaleDateString('sv-SE', { timeZone: 'Europe/Brussels' });
}

function cetDateLabel(isoStr) {
  return new Date(isoStr).toLocaleDateString('en-GB', {
    timeZone: 'Europe/Brussels',
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function render() {
  const list = getFiltered().slice().sort((a, b) => new Date(a.kickoff_time) - new Date(b.kickoff_time));
  if (!list.length) {
    document.getElementById('matches-root').innerHTML = '<p class="text-muted text-center mt-3">No matches to show.</p>';
    return;
  }

  let html = '';
  let curDate = null;

  list.forEach(m => {
    const dk = cetDateKey(m.kickoff_time);
    if (dk !== curDate) {
      if (curDate !== null) html += '</div>';
      html += `<div class="stage-section" data-date="${dk}"><div class="stage-heading date-heading">${cetDateLabel(m.kickoff_time)}</div>`;
      curDate = dk;
    }
    html += renderMatch(m);
  });
  if (curDate !== null) html += '</div>';

  document.getElementById('matches-root').innerHTML = html;
}

function renderMatch(m) {
  const status      = matchStatus(m);
  const pred        = myPredictions[m.id];
  const kickoffStr  = isCET(new Date(m.kickoff_time));
  const isKnockout  = KNOCKOUT_STAGES.has(m.stage);
  const canSeeOthers = pred != null || status !== 'open';

  const stageBadge  = `<span class="stage-badge sb-${m.stage}">${STAGE_LABELS[m.stage] || m.stage}</span>`;
  const statusBadge = {
    open:   '<span class="status-badge st-open">Open</span>',
    locked: '<span class="status-badge st-locked">Locked</span>',
    done:   '<span class="status-badge st-done">Finished</span>',
  }[status];
  const deadlineLine = m.prediction_deadline && m.prediction_deadline !== m.kickoff_time
    ? ` · <span class="text-muted fs-sm" style="color:#e67e22">🔒 Deadline: ${isCET(new Date(m.prediction_deadline))}</span>`
    : '';

  // Actual score display
  let scoreHTML = '';
  if (status === 'done') {
    let extras = '';
    if (m.actual_extra_time && !m.actual_penalties) extras = `<div class="score-extra">After ET</div>`;
    if (m.actual_penalties) extras = `<div class="score-extra">Pen: ${m.actual_penalties_home}–${m.actual_penalties_away}</div>`;
    scoreHTML = `<div class="score-disp final">${m.actual_home_score}–${m.actual_away_score}${extras}</div>`;
  } else {
    scoreHTML = `<div class="score-disp"><span class="vs-text">vs</span></div>`;
  }

  // First goal line
  let fgmLine = '';
  if (status === 'done') {
    fgmLine = m.actual_first_goal_minute === 0
      ? `<p class="text-muted fs-sm text-center mb-1">No goals scored</p>`
      : `<p class="text-muted fs-sm text-center mb-1">⚽ First goal: minute ${m.actual_first_goal_minute}</p>`;
  }

  // Prediction area
  let predHTML = '';
  if (status === 'open' && !pred) {
    const etFields = isKnockout ? `
      <div id="ko-et-${m.id}" class="pf-et-row">
        <label class="checkbox-label">
          <input type="checkbox" name="extra_time"> After extra time?
        </label>
      </div>
      <div id="ko-pen-${m.id}" class="pf-pen-row hidden">
        <p class="text-muted" style="font-size:.78rem;margin:.2rem 0 .4rem">Penalties — enter expected shootout score:</p>
        <div class="pf-pen-scores">
          <div class="pf-group"><label>Pen<small>(home)</small></label><input type="number" min="0" max="20" name="pen_home" placeholder="0"></div>
          <span class="colon">:</span>
          <div class="pf-group"><label>Pen<small>(away)</small></label><input type="number" min="0" max="20" name="pen_away" placeholder="0"></div>
        </div>
      </div>` : '';

    predHTML = `
      <div class="pred-area">
        <form class="pred-form" data-match="${m.id}" onsubmit="savePrediction(event,${m.id})">
          <div class="pf-group"><label>${m.home_team.split(' ')[0]}</label><input type="number" min="0" max="30" name="home" placeholder="0" required${isKnockout ? ` oninput="updateKOForm(${m.id})"` : ''}></div>
          <span class="colon">:</span>
          <div class="pf-group"><label>${m.away_team.split(' ')[0]}</label><input type="number" min="0" max="30" name="away" placeholder="0" required${isKnockout ? ` oninput="updateKOForm(${m.id})"` : ''}></div>
          <div class="pf-group fgm"><label>1st goal<small>(0=none)</small></label><input type="number" min="0" max="120" name="fgm" placeholder="0–120" required></div>
          ${etFields}
          <button type="submit" class="btn btn-primary btn-sm" style="align-self:flex-end">Save</button>
        </form>
      </div>`;
  } else if (pred) {
    const ptScore = pred.points_score;
    const ptFgm   = pred.points_first_goal;
    const ptPen   = pred.points_penalties || 0;
    const ptEt    = pred.points_et || 0;
    const total   = (ptScore || 0) + (ptFgm || 0) + ptPen + ptEt;

    let etDisplay = '';
    if (isKnockout) {
      if (pred.predicted_extra_time && pred.predicted_penalties) {
        etDisplay = `<span class="pred-extra-tag">+ET + Pen ${pred.predicted_penalties_home}–${pred.predicted_penalties_away}</span>`;
      } else if (pred.predicted_extra_time) {
        etDisplay = `<span class="pred-extra-tag">+ET</span>`;
      }
    }

    let ptsHTML = '';
    if (status === 'done') {
      const scoreChip = (ptScore === 5 || ptScore === 10)
        ? `<span class="chip chip-gold">⭐ ${ptScore} pts</span>`
        : `<span class="chip chip-score">${ptScore ?? '—'} pts</span>`;
      ptsHTML = `
        <div class="pred-pts">
          ${scoreChip}
          <span class="chip chip-fgm">⚽ ${ptFgm ?? '—'} pts</span>
          ${ptEt > 0 ? `<span class="chip chip-et">⏱ ${ptEt} pt</span>` : ''}
          ${ptPen > 0 ? `<span class="chip chip-pen">🥅 ${ptPen} pts</span>` : ''}
          <span class="chip chip-total">= ${total} pts</span>
        </div>`;
    }

    predHTML = `
      <div class="pred-area">
        <div class="pred-submitted">
          <div class="pred-locked-row">
            <span class="pred-locked-icon">🔒</span>
            <span class="pred-score-txt">${pred.predicted_home_score}–${pred.predicted_away_score}</span>
            <span class="pred-fgm-txt"> ⚽ min ${pred.predicted_first_goal_minute === 0 ? 'none' : pred.predicted_first_goal_minute}</span>
            ${etDisplay}
          </div>
          ${ptsHTML}
        </div>
      </div>`;
  } else if (status === 'locked') {
    predHTML = `<div class="pred-area"><p class="text-muted fs-sm" style="padding:.35rem 0">⏱ Deadline passed — no prediction submitted</p></div>`;
  }

  const othersSection = canSeeOthers ? `
    <div class="others-section">
      <button class="btn btn-sm btn-outline others-toggle-btn" onclick="toggleOthers(${m.id})">
        👥 See all predictions
      </button>
      <div class="others-content hidden" id="others-${m.id}"></div>
    </div>` : '';

  return `
    <div class="match-card" id="match-${m.id}">
      <div class="match-meta">
        <div class="match-meta-left">${stageBadge} ${m.group_name ? `<span class="text-muted">${m.group_name}</span>` : ''}</div>
        <div class="match-meta-right">${statusBadge} <span>${kickoffStr}</span>${deadlineLine}${m.venue ? ` · <span class="text-muted fs-sm">${m.venue}</span>` : ''}</div>
      </div>
      <div class="match-body">
        <div class="teams-row">
          <div class="team">
            <div class="team-flag">${flag(m.home_team)}</div>
            <div class="team-name">${m.home_team}</div>
          </div>
          <div class="vs-block">${scoreHTML}</div>
          <div class="team">
            <div class="team-flag">${flag(m.away_team)}</div>
            <div class="team-name">${m.away_team}</div>
          </div>
        </div>
        ${fgmLine}
        ${predHTML}
        ${othersSection}
      </div>
    </div>`;
}

// ── Dynamic knockout form ──────────────────────────────────────────────

function updateKOForm(matchId) {
  const form = document.querySelector(`.pred-form[data-match="${matchId}"]`);
  if (!form) return;
  const h = parseInt(form.querySelector('[name="home"]').value);
  const a = parseInt(form.querySelector('[name="away"]').value);
  const isDraw = !isNaN(h) && !isNaN(a) && h === a;
  const etSection  = document.getElementById(`ko-et-${matchId}`);
  const penSection = document.getElementById(`ko-pen-${matchId}`);
  if (etSection)  etSection.classList.toggle('hidden', isDraw);
  if (penSection) penSection.classList.toggle('hidden', !isDraw);
  if (!isDraw && form.extra_time) form.extra_time.checked = false;
}
window.updateKOForm = updateKOForm;

// ── Save prediction ────────────────────────────────────────────────────

async function savePrediction(e, matchId) {
  e.preventDefault();
  const form  = e.target;
  const btn   = form.querySelector('button[type=submit]');
  const match = allMatches.find(m => m.id === matchId);
  const isKnockout = KNOCKOUT_STAGES.has(match.stage);

  const home = parseInt(form.home.value);
  const away = parseInt(form.away.value);
  const fgm  = parseInt(form.fgm.value);
  const isDraw = !isNaN(home) && !isNaN(away) && home === away;

  let extraTime = false, penalties = false, penHome = null, penAway = null;
  if (isKnockout) {
    if (isDraw) {
      extraTime = true;
      penalties = true;
      penHome = form.pen_home ? (parseInt(form.pen_home.value) || 0) : 0;
      penAway = form.pen_away ? (parseInt(form.pen_away.value) || 0) : 0;
    } else {
      extraTime = form.extra_time ? form.extra_time.checked : false;
    }
  }

  btn.disabled    = true;
  btn.textContent = 'Saving…';
  try {
    const res = await fetch('/api/predictions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        match_id: matchId, home_score: home, away_score: away, first_goal_minute: fgm,
        extra_time: extraTime, penalties, penalties_home: penHome, penalties_away: penAway,
      }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error); btn.disabled = false; btn.textContent = 'Save'; return; }

    const pRes = await fetch('/api/predictions/my', { headers: { Authorization: `Bearer ${token}` } });
    const preds = await pRes.json();
    myPredictions = {};
    preds.forEach(p => { myPredictions[p.match_id] = p; });

    const card = document.getElementById(`match-${matchId}`);
    if (card && match) card.outerHTML = renderMatch(match);

    loadOthers(matchId, true);
  } catch {
    alert('Network error');
    btn.disabled = false;
    btn.textContent = 'Save';
  }
}
window.savePrediction = savePrediction;

// ── Others' predictions ────────────────────────────────────────────────

function toggleOthers(matchId) {
  const content = document.getElementById(`others-${matchId}`);
  if (!content) return;
  const hidden = content.classList.toggle('hidden');
  if (!hidden && !content.dataset.loaded) {
    loadOthers(matchId, false);
  }
}
window.toggleOthers = toggleOthers;

async function loadOthers(matchId, autoOpen) {
  const content = document.getElementById(`others-${matchId}`);
  if (!content) return;

  if (autoOpen) {
    content.classList.remove('hidden');
    const btn = content.closest('.others-section')?.querySelector('.others-toggle-btn');
    if (btn) btn.textContent = '👥 Hide predictions';
  }

  content.innerHTML = '<div style="padding:.5rem .25rem;color:var(--muted);font-size:.8rem">Loading…</div>';

  try {
    const res = await fetch(`/api/predictions/match/${matchId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (res.status === 403) {
      const d = await res.json();
      content.innerHTML = `<p class="text-muted fs-sm" style="padding:.35rem">${d.error}</p>`;
      return;
    }

    const rows = await res.json();
    content.dataset.loaded = '1';

    if (!rows.length) {
      content.innerHTML = '<p class="text-muted fs-sm" style="padding:.35rem">No predictions submitted yet.</p>';
      return;
    }

    const match = allMatches.find(m => m.id === matchId);
    const isKnockout = match && KNOCKOUT_STAGES.has(match.stage);

    const trows = rows.map(r => {
      const total = (r.points_score || 0) + (r.points_first_goal || 0) + (r.points_penalties || 0);
      let scoreExtra = '';
      if (isKnockout) {
        if (r.predicted_penalties)  scoreExtra = ` <small class="text-muted">(Pen ${r.predicted_penalties_home}–${r.predicted_penalties_away})</small>`;
        else if (r.predicted_extra_time) scoreExtra = ` <small class="text-muted">(+ET)</small>`;
      }
      const hasPoints = r.points_score != null;
      const ptsCells  = hasPoints
        ? `<td>${r.points_score ?? '—'}</td><td>${r.points_first_goal ?? '—'}</td>${r.points_penalties > 0 ? `<td>${r.points_penalties}</td>` : (isKnockout ? '<td>—</td>' : '')}<td class="fw-bold">${total}</td>`
        : `<td>—</td><td>—</td>${isKnockout ? '<td>—</td>' : ''}<td>—</td>`;
      return `<tr>
        <td>${escHtml(r.participant_name)}${r.participant_name === myName ? ' <span class="you-tag">you</span>' : ''}</td>
        <td>${r.predicted_home_score}–${r.predicted_away_score}${scoreExtra}</td>
        <td>${r.predicted_first_goal_minute === 0 ? 'none' : 'min ' + r.predicted_first_goal_minute}</td>
        ${ptsCells}
      </tr>`;
    }).join('');

    const penHeader = isKnockout ? '<th>Pen</th>' : '';
    content.innerHTML = `
      <div class="others-wrap">
        <table class="others-table">
          <thead><tr><th>Player</th><th>Score</th><th>1st goal</th><th>Score</th><th>Goal</th>${penHeader}<th>Total</th></tr></thead>
          <tbody>${trows}</tbody>
        </table>
      </div>`;
  } catch {
    content.innerHTML = '<p class="text-muted fs-sm" style="padding:.35rem">Could not load predictions.</p>';
  }
}
window.loadOthers = loadOthers;

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Filter tabs ────────────────────────────────────────────────────────
document.getElementById('filter-bar').addEventListener('click', (e) => {
  const btn = e.target.closest('.ftab');
  if (!btn) return;
  document.querySelectorAll('#filter-bar .ftab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentFilter = btn.dataset.filter;
  render();
});

function scrollToToday() {
  const todayKey = cetDateKey(new Date().toISOString());
  let el = document.querySelector(`[data-date="${todayKey}"]`);
  if (!el) {
    const all = [...document.querySelectorAll('[data-date]')];
    el = all.find(s => s.dataset.date >= todayKey) || null;
  }
  if (el) {
    const top = el.getBoundingClientRect().top + window.scrollY - 70;
    window.scrollTo({ top, behavior: 'smooth' });
  }
}

load();
