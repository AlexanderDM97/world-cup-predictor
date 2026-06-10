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

const FLAGS = {
  'Algeria':'🇩🇿','Argentina':'🇦🇷','Australia':'🇦🇺','Austria':'🇦🇹',
  'Belgium':'🇧🇪','Bosnia & Herz.':'🇧🇦','Bosnia & Herzegovina':'🇧🇦','Brazil':'🇧🇷',
  'Canada':'🇨🇦','Cape Verde':'🇨🇻','Colombia':'🇨🇴','Croatia':'🇭🇷','Curacao':'🇨🇼',
  'Czechia':'🇨🇿','Czech Republic':'🇨🇿',
  'DR Congo':'🇨🇩',
  'Ecuador':'🇪🇨','Egypt':'🇪🇬','England':'🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'France':'🇫🇷',
  'Germany':'🇩🇪','Ghana':'🇬🇭',
  'Haiti':'🇭🇹',
  'Iran':'🇮🇷','Iraq':'🇮🇶','Ivory Coast':'🇨🇮',
  'Japan':'🇯🇵','Jordan':'🇯🇴',
  'Mexico':'🇲🇽','Morocco':'🇲🇦',
  'Netherlands':'🇳🇱','New Zealand':'🇳🇿','Norway':'🇳🇴',
  'Panama':'🇵🇦','Paraguay':'🇵🇾','Portugal':'🇵🇹',
  'Qatar':'🇶🇦',
  'Saudi Arabia':'🇸🇦','Scotland':'🏴󠁧󠁢󠁳󠁣󠁴󠁿','Senegal':'🇸🇳',
  'South Africa':'🇿🇦','South Korea':'🇰🇷','Spain':'🇪🇸','Sweden':'🇸🇪','Switzerland':'🇨🇭',
  'Tunisia':'🇹🇳','Turkiye':'🇹🇷','Türkiye':'🇹🇷',
  'Uruguay':'🇺🇾','USA':'🇺🇸','Uzbekistan':'🇺🇿',
};

const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' };

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
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
      const isMe  = p.name === myName;
      const medal = MEDALS[p.rank] || '';
      const champFlag = p.predicted_champion
        ? `${FLAGS[p.predicted_champion] || '🏳️'} ${escHtml(p.predicted_champion)}`
        : '—';
      const penPts = p.penalty_points || 0;
      rows += `
        <tr class="lb-rank-${p.rank <= 3 ? p.rank : ''}${isMe ? ' you' : ''}">
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
          <td>${penPts > 0 ? `<span class="chip chip-pen">${penPts}</span>` : '—'}</td>
        </tr>`;
    });

    document.getElementById('lb-root').innerHTML = `
      <table class="lb-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Champion pick</th>
            <th>Total pts</th>
            <th>Match pts</th>
            <th>Champ pts</th>
            <th>Predicted</th>
            <th>Exact ⭐</th>
            <th>Winner ☑️</th>
            <th>1st goal ⚽</th>
            <th>Penalties 🥅</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;

    document.getElementById('last-updated').textContent = 'Updated ' + new Date().toLocaleTimeString();
  } catch {
    document.getElementById('lb-root').innerHTML =
      '<p class="text-muted text-center" style="padding:2rem">Failed to load leaderboard.</p>';
  }
}

load();
setInterval(load, 60000);
