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
  'Tunisia':'tn','Turkiye':'tr','Türkiye':'tr',
  'Uruguay':'uy','USA':'us','Uzbekistan':'uz',
};
function flagImg(country, size) {
  const iso = FLAG_ISO[country];
  if (!iso) return '';
  const s = size || '20x15';
  return `<img src="https://flagcdn.com/${s}/${iso}.png" alt="${country}" style="vertical-align:middle;margin-right:3px">`;
}

const STAGE_LABELS = {
  group: 'Group', r32: 'R32', r16: 'R16',
  qf: 'QF', sf: 'SF', third: '3rd', final: 'Final',
};
const KNOCKOUT = new Set(['r32','r16','qf','sf','third','final']);
const MEDALS   = { 1: '🥇', 2: '🥈', 3: '🥉' };

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function isCET(isoStr) {
  return new Date(isoStr).toLocaleString('nl-BE', {
    timeZone: 'Europe/Brussels', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });
}

async function load() {
  try {
    const res  = await fetch('/api/leaderboard');
    const data = await res.json();

    if (!data.length) {
      document.getElementById('lb-root').innerHTML =
        '<p class="text-muted text-center" style="padding:2rem">No participants yet.</p>';
      return;
    }

    let rows = '';
    data.forEach(p => {
      const isMe      = p.name === myName;
      const medal     = MEDALS[p.rank] || '';
      const champFlag = p.predicted_champion
        ? `${flagImg(p.predicted_champion, '20x15')} ${escHtml(p.predicted_champion)}`
        : '—';
      const penPts = p.penalty_points || 0;
      const etPts  = p.et_points || 0;
      rows += `
        <tr class="lb-rank-${p.rank <= 3 ? p.rank : ''}${isMe ? ' you' : ''}"
            onclick="openDetail(${p.id},'${escHtml(p.name)}')" title="Click to see full breakdown">
          <td class="rank">${medal || p.rank}</td>
          <td class="lb-name">${escHtml(p.name)}${isMe ? '<span class="you-tag">you</span>' : ''}</td>
          <td class="lb-champion-cell">${champFlag}</td>
          <td class="lb-pts">${p.total_points}</td>
          <td class="text-muted">${p.prediction_points}</td>
          <td class="text-muted">${p.champion_points || 0}</td>
          <td>${p.predictions_made}</td>
          <td>${p.exact_scores}</td>
          <td>${p.correct_winners}</td>
          <td>${p.first_goal_points}</td>
          <td>${etPts > 0 ? `<span class="chip chip-et">${etPts}</span>` : '—'}</td>
          <td>${penPts > 0 ? `<span class="chip chip-pen">${penPts}</span>` : '—'}</td>
        </tr>`;
    });

    document.getElementById('lb-root').innerHTML = `
      <div class="lb-scroll-wrap">
        <table class="lb-table">
          <thead>
            <tr>
              <th>#</th><th>Name</th><th>Champion pick</th>
              <th>Total pts</th><th>Match pts</th><th>Champ pts</th>
              <th>Predicted</th><th>Exact ⭐</th><th>Winner ☑️</th>
              <th>1st goal ⚽</th><th>Timeline ⏱</th><th>Penalties 🥅</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;

    document.getElementById('last-updated').textContent = 'Updated ' + new Date().toLocaleTimeString();
  } catch {
    document.getElementById('lb-root').innerHTML =
      '<p class="text-muted text-center" style="padding:2rem">Failed to load leaderboard.</p>';
  }
}

// ── Detail modal ──────────────────────────────────────────────────────────

async function openDetail(participantId, participantName) {
  const modal   = document.getElementById('detail-modal');
  const title   = document.getElementById('detail-title');
  const content = document.getElementById('detail-content');

  title.textContent = `📊 ${participantName}`;
  content.innerHTML = '<div class="loading-wrap"><div class="spinner"></div></div>';
  modal.classList.add('open');

  try {
    const res  = await fetch(`/api/leaderboard/${participantId}/detail`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) { content.innerHTML = `<p class="text-muted" style="padding:1rem">${data.error}</p>`; return; }

    const { participant, predictions } = data;

    let totalScore = 0, totalFgm = 0, totalEt = 0, totalPen = 0, totalPts = 0;

    const rows = predictions.map(p => {
      const isKO      = KNOCKOUT.has(p.stage);
      const hasResult = p.result_entered;
      const sc  = p.points_score ?? null;
      const fgm = p.points_first_goal ?? null;
      const et  = p.points_et ?? null;
      const pen = p.points_penalties ?? null;
      const rowTotal = hasResult ? (sc||0)+(fgm||0)+(et||0)+(pen||0) : null;

      if (rowTotal !== null) {
        totalScore += sc||0; totalFgm += fgm||0;
        totalEt    += et||0; totalPen  += pen||0;
        totalPts   += rowTotal;
      }

      const predStr = `${p.predicted_home_score}–${p.predicted_away_score} ⚽${p.predicted_first_goal_minute === 0 ? 'none' : 'min ' + p.predicted_first_goal_minute}`;
      let predExtra = '';
      if (isKO) {
        if (p.predicted_penalties)  predExtra = ` <span class="text-muted">(Pen ${p.predicted_penalties_home}–${p.predicted_penalties_away})</span>`;
        else if (p.predicted_extra_time) predExtra = ` <span class="text-muted">(+ET)</span>`;
        else predExtra = ` <span class="text-muted">(90 min)</span>`;
      }

      let actualStr = '<span class="pending">Pending</span>';
      if (hasResult) {
        actualStr = `${p.actual_home_score}–${p.actual_away_score} ⚽${p.actual_first_goal_minute === 0 ? 'none' : 'min ' + p.actual_first_goal_minute}`;
        if (isKO) {
          if (p.actual_penalties)  actualStr += ` <span class="text-muted">(Pen ${p.actual_penalties_home}–${p.actual_penalties_away})</span>`;
          else if (p.actual_extra_time) actualStr += ` <span class="text-muted">(+ET)</span>`;
        }
      }

      const scCell  = hasResult ? ((sc === 5 || sc === 8) ? `<span class="chip chip-gold">⭐ ${sc}</span>` : `${sc}`) : '<span class="pending">—</span>';
      const fgmCell = hasResult ? fgm  : '<span class="pending">—</span>';
      const etCell  = isKO && hasResult ? et  : '—';
      const penCell = isKO && hasResult ? pen : '—';
      const totCell = hasResult ? `<strong>${rowTotal}</strong>` : '<span class="pending">—</span>';

      return `<tr>
        <td class="text-muted" style="white-space:nowrap">${isCET(p.kickoff_time)}</td>
        <td style="white-space:nowrap"><strong>${escHtml(p.home_team)}</strong> vs <strong>${escHtml(p.away_team)}</strong>
          <span class="text-muted fs-sm">&nbsp;${STAGE_LABELS[p.stage]||p.stage}</span></td>
        <td>${predStr}${predExtra}</td>
        <td>${actualStr}</td>
        <td style="text-align:center">${scCell}</td>
        <td style="text-align:center">${fgmCell}</td>
        <td style="text-align:center">${etCell}</td>
        <td style="text-align:center">${penCell}</td>
        <td style="text-align:center">${totCell}</td>
      </tr>`;
    }).join('');

    const champFlag  = participant.predicted_champion
      ? `${flagImg(participant.predicted_champion, '20x15')} ${escHtml(participant.predicted_champion)}`
      : '—';
    const champPts   = participant.champion_points || 0;
    const grandTotal = totalPts + champPts;

    content.innerHTML = `
      <div class="detail-wrap">
        <table class="detail-table">
          <thead><tr>
            <th>Date (CET)</th><th>Match</th><th>Prediction</th><th>Actual</th>
            <th>Score</th><th>1st goal</th><th>Timeline</th><th>Penalties</th><th>Total</th>
          </tr></thead>
          <tbody>${rows || '<tr><td colspan="9" class="text-muted" style="padding:1rem">No predictions submitted yet.</td></tr>'}</tbody>
          <tfoot>
            <tr style="background:#f0f4f1;font-weight:700">
              <td colspan="4" style="padding:.5rem .75rem">Match points subtotal</td>
              <td style="text-align:center">${totalScore}</td>
              <td style="text-align:center">${totalFgm}</td>
              <td style="text-align:center">${totalEt}</td>
              <td style="text-align:center">${totalPen}</td>
              <td style="text-align:center">${totalPts}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div class="detail-champion-row">
        🏆 Champion pick: ${champFlag}
        &nbsp;·&nbsp; Champion points: <strong>${champPts}</strong>
        &nbsp;·&nbsp; <strong>Grand total: ${grandTotal} pts</strong>
      </div>`;
  } catch {
    content.innerHTML = '<p class="text-muted" style="padding:1rem">Failed to load breakdown.</p>';
  }
}
window.openDetail = openDetail;

function closeDetail() {
  document.getElementById('detail-modal').classList.remove('open');
}
window.closeDetail = closeDetail;

document.getElementById('detail-modal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('detail-modal')) closeDetail();
});

load();
setInterval(load, 60000);
