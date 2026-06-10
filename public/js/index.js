(function () {
  if (localStorage.getItem('wc_token')) {
    window.location.href = 'matches.html';
    return;
  }

  const WC2026_TEAMS = [
    'Algeria','Argentina','Australia','Austria',
    'Belgium','Bosnia & Herz.','Brazil',
    'Canada','Cape Verde','Colombia','Croatia','Curacao','Czechia',
    'DR Congo',
    'Ecuador','Egypt','England',
    'France',
    'Germany','Ghana',
    'Haiti',
    'Iran','Iraq','Ivory Coast',
    'Japan','Jordan',
    'Mexico','Morocco',
    'Netherlands','New Zealand','Norway',
    'Panama','Paraguay','Portugal',
    'Qatar',
    'Saudi Arabia','Scotland','Senegal','South Africa','South Korea','Spain','Sweden','Switzerland',
    'Tunisia','Turkiye',
    'Uruguay','USA','Uzbekistan',
  ].sort((a, b) => a.localeCompare(b));

  const sel = document.getElementById('reg-champion');
  WC2026_TEAMS.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    sel.appendChild(opt);
  });

  function showTab(tab) {
    document.getElementById('tab-login').classList.toggle('active', tab === 'login');
    document.getElementById('tab-register').classList.toggle('active', tab === 'register');
    document.getElementById('form-login').classList.toggle('hidden', tab !== 'login');
    document.getElementById('form-register').classList.toggle('hidden', tab !== 'register');
    clearAlert();
  }
  window.showTab = showTab;

  function showAlert(msg, type = 'danger') {
    const el = document.getElementById('alert');
    el.textContent = msg;
    el.className = `alert alert-${type}`;
  }
  function clearAlert() {
    const el = document.getElementById('alert');
    el.className = 'alert hidden';
    el.textContent = '';
  }

  document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert();
    const name = document.getElementById('login-name').value.trim();
    const pin  = document.getElementById('login-pin').value;
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, pin }),
      });
      const data = await res.json();
      if (!res.ok) { showAlert(data.error); return; }
      localStorage.setItem('wc_token', data.token);
      localStorage.setItem('wc_name', data.name);
      if (data.predicted_champion) localStorage.setItem('wc_champion', data.predicted_champion);
      window.location.href = 'matches.html';
    } catch {
      showAlert('Network error. Is the server running?');
    }
  });

  document.getElementById('form-register').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert();
    const name     = document.getElementById('reg-name').value.trim();
    const pin      = document.getElementById('reg-pin').value;
    const pin2     = document.getElementById('reg-pin2').value;
    const champion = document.getElementById('reg-champion').value;
    if (pin !== pin2)  { showAlert('PINs do not match'); return; }
    if (!/^\d{4,8}$/.test(pin)) { showAlert('PIN must be 4–8 digits'); return; }
    if (!champion) { showAlert('Please select your World Cup winner prediction'); return; }
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, pin, predicted_champion: champion }),
      });
      const data = await res.json();
      if (!res.ok) { showAlert(data.error); return; }
      localStorage.setItem('wc_token', data.token);
      localStorage.setItem('wc_name', data.name);
      if (data.predicted_champion) localStorage.setItem('wc_champion', data.predicted_champion);
      window.location.href = 'matches.html';
    } catch {
      showAlert('Network error. Is the server running?');
    }
  });
})();
