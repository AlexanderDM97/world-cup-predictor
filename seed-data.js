// 2026 FIFA World Cup – full schedule
// All kickoff times converted from CEST (UTC+2) to UTC for storage
// Groups from the official schedule (myworldcuptime.com, schedule as of May 8 2026)

// Helper: CEST "YYYY-MM-DDTHH:MM" → UTC ISO string
function cest(dt) {
  const [date, time] = dt.split('T');
  const [h, m] = time.split(':').map(Number);
  const utcH = h - 2;
  if (utcH < 0) {
    // crosses midnight
    const d = new Date(date + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() - 1);
    const dd = d.toISOString().slice(0,10);
    const uh = (24 + utcH).toString().padStart(2,'0');
    return `${dd}T${uh}:${String(m).padStart(2,'0')}:00Z`;
  }
  return `${date}T${String(utcH).padStart(2,'0')}:${String(m).padStart(2,'0')}:00Z`;
}

const G = [
  // ── GROUP A: Mexico · South Africa · South Korea · Czechia ────────────
  { home:'Mexico',       away:'South Africa', group:'Group A', stage:'group', kickoff:cest('2026-06-11T21:00'), venue:'Estadio Azteca, Mexico City' },
  { home:'South Korea',  away:'Czechia',      group:'Group A', stage:'group', kickoff:cest('2026-06-12T04:00'), venue:'SoFi Stadium, Los Angeles' },
  { home:'Czechia',      away:'South Africa', group:'Group A', stage:'group', kickoff:cest('2026-06-18T18:00'), venue:'AT&T Stadium, Dallas' },
  { home:'Mexico',       away:'South Korea',  group:'Group A', stage:'group', kickoff:cest('2026-06-19T03:00'), venue:'Estadio Akron, Guadalajara' },
  { home:'Czechia',      away:'Mexico',       group:'Group A', stage:'group', kickoff:cest('2026-06-25T03:00'), venue:'Estadio BBVA, Monterrey' },
  { home:'South Africa', away:'South Korea',  group:'Group A', stage:'group', kickoff:cest('2026-06-25T03:00'), venue:'NRG Stadium, Houston' },

  // ── GROUP B: Canada · Bosnia & Herz. · Qatar · Switzerland ───────────
  { home:'Canada',       away:'Bosnia & Herz.', group:'Group B', stage:'group', kickoff:cest('2026-06-12T21:00'), venue:'BMO Field, Toronto' },
  { home:'Qatar',        away:'Switzerland',    group:'Group B', stage:'group', kickoff:cest('2026-06-13T21:00'), venue:'MetLife Stadium, New York' },
  { home:'Switzerland',  away:'Bosnia & Herz.', group:'Group B', stage:'group', kickoff:cest('2026-06-18T21:00'), venue:'Lincoln Financial Field, Philadelphia' },
  { home:'Canada',       away:'Qatar',          group:'Group B', stage:'group', kickoff:cest('2026-06-19T00:00'), venue:'BC Place, Vancouver' },
  { home:'Switzerland',  away:'Canada',         group:'Group B', stage:'group', kickoff:cest('2026-06-24T21:00'), venue:'BMO Field, Toronto' },
  { home:'Bosnia & Herz.', away:'Qatar',        group:'Group B', stage:'group', kickoff:cest('2026-06-24T21:00'), venue:'Hard Rock Stadium, Miami' },

  // ── GROUP C: Brazil · Morocco · Haiti · Scotland ──────────────────────
  { home:'Brazil',   away:'Morocco',   group:'Group C', stage:'group', kickoff:cest('2026-06-14T00:00'), venue:'MetLife Stadium, New York' },
  { home:'Haiti',    away:'Scotland',  group:'Group C', stage:'group', kickoff:cest('2026-06-14T03:00'), venue:'Hard Rock Stadium, Miami' },
  { home:'Scotland', away:'Morocco',   group:'Group C', stage:'group', kickoff:cest('2026-06-20T00:00'), venue:'Mercedes-Benz Stadium, Atlanta' },
  { home:'Brazil',   away:'Haiti',     group:'Group C', stage:'group', kickoff:cest('2026-06-20T02:30'), venue:'AT&T Stadium, Dallas' },
  { home:'Scotland', away:'Brazil',    group:'Group C', stage:'group', kickoff:cest('2026-06-25T00:00'), venue:'MetLife Stadium, New York' },
  { home:'Morocco',  away:'Haiti',     group:'Group C', stage:'group', kickoff:cest('2026-06-25T00:00'), venue:'NRG Stadium, Houston' },

  // ── GROUP D: USA · Paraguay · Australia · Turkiye ─────────────────────
  { home:'USA',       away:'Paraguay',  group:'Group D', stage:'group', kickoff:cest('2026-06-13T03:00'), venue:'MetLife Stadium, New York' },
  { home:'Australia', away:'Turkiye',   group:'Group D', stage:'group', kickoff:cest('2026-06-14T06:00'), venue:'SoFi Stadium, Los Angeles' },
  { home:'USA',       away:'Australia', group:'Group D', stage:'group', kickoff:cest('2026-06-19T21:00'), venue:'AT&T Stadium, Dallas' },
  { home:'Turkiye',   away:'Paraguay',  group:'Group D', stage:'group', kickoff:cest('2026-06-20T05:00'), venue:'Levi\'s Stadium, San Francisco' },
  { home:'Turkiye',   away:'USA',       group:'Group D', stage:'group', kickoff:cest('2026-06-26T04:00'), venue:'Lumen Field, Seattle' },
  { home:'Paraguay',  away:'Australia', group:'Group D', stage:'group', kickoff:cest('2026-06-26T04:00'), venue:'SoFi Stadium, Los Angeles' },

  // ── GROUP E: Germany · Curacao · Ivory Coast · Ecuador ───────────────
  { home:'Germany',     away:'Curacao',      group:'Group E', stage:'group', kickoff:cest('2026-06-14T19:00'), venue:'Mercedes-Benz Stadium, Atlanta' },
  { home:'Ivory Coast', away:'Ecuador',      group:'Group E', stage:'group', kickoff:cest('2026-06-15T01:00'), venue:'Arrowhead Stadium, Kansas City' },
  { home:'Germany',     away:'Ivory Coast',  group:'Group E', stage:'group', kickoff:cest('2026-06-20T22:00'), venue:'Mercedes-Benz Stadium, Atlanta' },
  { home:'Ecuador',     away:'Curacao',      group:'Group E', stage:'group', kickoff:cest('2026-06-21T02:00'), venue:'NRG Stadium, Houston' },
  { home:'Curacao',     away:'Ivory Coast',  group:'Group E', stage:'group', kickoff:cest('2026-06-25T22:00'), venue:'Hard Rock Stadium, Miami' },
  { home:'Ecuador',     away:'Germany',      group:'Group E', stage:'group', kickoff:cest('2026-06-25T22:00'), venue:'MetLife Stadium, New York' },

  // ── GROUP F: Netherlands · Japan · Sweden · Tunisia ──────────────────
  { home:'Netherlands', away:'Japan',        group:'Group F', stage:'group', kickoff:cest('2026-06-14T22:00'), venue:'Gillette Stadium, Boston' },
  { home:'Sweden',      away:'Tunisia',      group:'Group F', stage:'group', kickoff:cest('2026-06-15T04:00'), venue:'Levi\'s Stadium, San Francisco' },
  { home:'Netherlands', away:'Sweden',       group:'Group F', stage:'group', kickoff:cest('2026-06-20T19:00'), venue:'Gillette Stadium, Boston' },
  { home:'Tunisia',     away:'Japan',        group:'Group F', stage:'group', kickoff:cest('2026-06-21T06:00'), venue:'Lumen Field, Seattle' },
  { home:'Japan',       away:'Sweden',       group:'Group F', stage:'group', kickoff:cest('2026-06-26T01:00'), venue:'SoFi Stadium, Los Angeles' },
  { home:'Tunisia',     away:'Netherlands',  group:'Group F', stage:'group', kickoff:cest('2026-06-26T01:00'), venue:'Allegiant Stadium, Las Vegas' },

  // ── GROUP G: Belgium · Egypt · Iran · New Zealand ────────────────────
  { home:'Belgium',     away:'Egypt',        group:'Group G', stage:'group', kickoff:cest('2026-06-15T21:00'), venue:'Lincoln Financial Field, Philadelphia' },
  { home:'Iran',        away:'New Zealand',  group:'Group G', stage:'group', kickoff:cest('2026-06-16T03:00'), venue:'Levi\'s Stadium, San Francisco' },
  { home:'Belgium',     away:'Iran',         group:'Group G', stage:'group', kickoff:cest('2026-06-21T21:00'), venue:'MetLife Stadium, New York' },
  { home:'New Zealand', away:'Egypt',        group:'Group G', stage:'group', kickoff:cest('2026-06-22T03:00'), venue:'Allegiant Stadium, Las Vegas' },
  { home:'Egypt',       away:'Iran',         group:'Group G', stage:'group', kickoff:cest('2026-06-27T05:00'), venue:'Levi\'s Stadium, San Francisco' },
  { home:'New Zealand', away:'Belgium',      group:'Group G', stage:'group', kickoff:cest('2026-06-27T05:00'), venue:'Lumen Field, Seattle' },

  // ── GROUP H: Spain · Cape Verde · Saudi Arabia · Uruguay ─────────────
  { home:'Spain',        away:'Cape Verde',    group:'Group H', stage:'group', kickoff:cest('2026-06-15T18:00'), venue:'Hard Rock Stadium, Miami' },
  { home:'Saudi Arabia', away:'Uruguay',       group:'Group H', stage:'group', kickoff:cest('2026-06-16T00:00'), venue:'MetLife Stadium, New York' },
  { home:'Spain',        away:'Saudi Arabia',  group:'Group H', stage:'group', kickoff:cest('2026-06-21T18:00'), venue:'Hard Rock Stadium, Miami' },
  { home:'Uruguay',      away:'Cape Verde',    group:'Group H', stage:'group', kickoff:cest('2026-06-22T00:00'), venue:'Arrowhead Stadium, Kansas City' },
  { home:'Cape Verde',   away:'Saudi Arabia',  group:'Group H', stage:'group', kickoff:cest('2026-06-27T02:00'), venue:'AT&T Stadium, Dallas' },
  { home:'Uruguay',      away:'Spain',         group:'Group H', stage:'group', kickoff:cest('2026-06-27T02:00'), venue:'NRG Stadium, Houston' },

  // ── GROUP I: France · Senegal · Iraq · Norway ────────────────────────
  { home:'France',  away:'Senegal', group:'Group I', stage:'group', kickoff:cest('2026-06-16T21:00'), venue:'Mercedes-Benz Stadium, Atlanta' },
  { home:'Iraq',    away:'Norway',  group:'Group I', stage:'group', kickoff:cest('2026-06-17T00:00'), venue:'Hard Rock Stadium, Miami' },
  { home:'France',  away:'Iraq',    group:'Group I', stage:'group', kickoff:cest('2026-06-22T23:00'), venue:'Levi\'s Stadium, San Francisco' },
  { home:'Norway',  away:'Senegal', group:'Group I', stage:'group', kickoff:cest('2026-06-23T02:00'), venue:'AT&T Stadium, Dallas' },
  { home:'Norway',  away:'France',  group:'Group I', stage:'group', kickoff:cest('2026-06-26T21:00'), venue:'Mercedes-Benz Stadium, Atlanta' },
  { home:'Senegal', away:'Iraq',    group:'Group I', stage:'group', kickoff:cest('2026-06-26T21:00'), venue:'Gillette Stadium, Boston' },

  // ── GROUP J: Argentina · Algeria · Austria · Jordan ──────────────────
  { home:'Argentina', away:'Algeria',   group:'Group J', stage:'group', kickoff:cest('2026-06-17T03:00'), venue:'MetLife Stadium, New York' },
  { home:'Austria',   away:'Jordan',    group:'Group J', stage:'group', kickoff:cest('2026-06-17T06:00'), venue:'SoFi Stadium, Los Angeles' },
  { home:'Argentina', away:'Austria',   group:'Group J', stage:'group', kickoff:cest('2026-06-22T19:00'), venue:'Hard Rock Stadium, Miami' },
  { home:'Jordan',    away:'Algeria',   group:'Group J', stage:'group', kickoff:cest('2026-06-23T05:00'), venue:'Allegiant Stadium, Las Vegas' },
  { home:'Algeria',   away:'Austria',   group:'Group J', stage:'group', kickoff:cest('2026-06-28T04:00'), venue:'Lumen Field, Seattle' },
  { home:'Jordan',    away:'Argentina', group:'Group J', stage:'group', kickoff:cest('2026-06-28T04:00'), venue:'Levi\'s Stadium, San Francisco' },

  // ── GROUP K: Portugal · DR Congo · Uzbekistan · Colombia ─────────────
  { home:'Portugal',    away:'DR Congo',    group:'Group K', stage:'group', kickoff:cest('2026-06-17T19:00'), venue:'NRG Stadium, Houston' },
  { home:'Uzbekistan',  away:'Colombia',    group:'Group K', stage:'group', kickoff:cest('2026-06-18T04:00'), venue:'SoFi Stadium, Los Angeles' },
  { home:'Portugal',    away:'Uzbekistan',  group:'Group K', stage:'group', kickoff:cest('2026-06-23T19:00'), venue:'Hard Rock Stadium, Miami' },
  { home:'Colombia',    away:'DR Congo',    group:'Group K', stage:'group', kickoff:cest('2026-06-24T04:00'), venue:'Levi\'s Stadium, San Francisco' },
  { home:'Colombia',    away:'Portugal',    group:'Group K', stage:'group', kickoff:cest('2026-06-28T01:30'), venue:'AT&T Stadium, Dallas' },
  { home:'DR Congo',    away:'Uzbekistan',  group:'Group K', stage:'group', kickoff:cest('2026-06-28T01:30'), venue:'MetLife Stadium, New York' },

  // ── GROUP L: England · Croatia · Ghana · Panama ───────────────────────
  { home:'England', away:'Croatia', group:'Group L', stage:'group', kickoff:cest('2026-06-17T22:00'), venue:'MetLife Stadium, New York' },
  { home:'Ghana',   away:'Panama',  group:'Group L', stage:'group', kickoff:cest('2026-06-18T01:00'), venue:'Hard Rock Stadium, Miami' },
  { home:'England', away:'Ghana',   group:'Group L', stage:'group', kickoff:cest('2026-06-23T22:00'), venue:'Gillette Stadium, Boston' },
  { home:'Panama',  away:'Croatia', group:'Group L', stage:'group', kickoff:cest('2026-06-24T01:00'), venue:'Lincoln Financial Field, Philadelphia' },
  { home:'Panama',  away:'England', group:'Group L', stage:'group', kickoff:cest('2026-06-27T23:00'), venue:'MetLife Stadium, New York' },
  { home:'Croatia', away:'Ghana',   group:'Group L', stage:'group', kickoff:cest('2026-06-27T23:00'), venue:'NRG Stadium, Houston' },
];

// ── ROUND OF 32 ──────────────────────────────────────────────────────────────
// Match numbers 73–88 (after 72 group stage matches)
// "home" / "away" = qualification path; admin updates team names after groups finish
const R32 = [
  { home:'2A',        away:'2B',         group:null, stage:'r32', kickoff:cest('2026-06-28T21:00'), venue:'TBD' },
  { home:'1C',        away:'2F',         group:null, stage:'r32', kickoff:cest('2026-06-29T19:00'), venue:'TBD' },
  { home:'1E',        away:'3ABCDF',     group:null, stage:'r32', kickoff:cest('2026-06-29T22:30'), venue:'TBD' },
  { home:'1F',        away:'2C',         group:null, stage:'r32', kickoff:cest('2026-06-30T03:00'), venue:'TBD' },
  { home:'2E',        away:'2I',         group:null, stage:'r32', kickoff:cest('2026-06-30T19:00'), venue:'TBD' },
  { home:'1I',        away:'3CDFGH',     group:null, stage:'r32', kickoff:cest('2026-06-30T23:00'), venue:'TBD' },
  { home:'1A',        away:'3CEFHI',     group:null, stage:'r32', kickoff:cest('2026-07-01T03:00'), venue:'TBD' },
  { home:'1L',        away:'3EHIJK',     group:null, stage:'r32', kickoff:cest('2026-07-01T18:00'), venue:'TBD' },
  { home:'1G',        away:'3AEHIJ',     group:null, stage:'r32', kickoff:cest('2026-07-01T22:00'), venue:'TBD' },
  { home:'1D',        away:'3BEFIJ',     group:null, stage:'r32', kickoff:cest('2026-07-02T02:00'), venue:'TBD' },
  { home:'1H',        away:'2J',         group:null, stage:'r32', kickoff:cest('2026-07-02T21:00'), venue:'TBD' },
  { home:'2K',        away:'2L',         group:null, stage:'r32', kickoff:cest('2026-07-03T01:00'), venue:'TBD' },
  { home:'1B',        away:'3EFGIJ',     group:null, stage:'r32', kickoff:cest('2026-07-03T05:00'), venue:'TBD' },
  { home:'2D',        away:'2G',         group:null, stage:'r32', kickoff:cest('2026-07-03T20:00'), venue:'TBD' },
  { home:'1J',        away:'2H',         group:null, stage:'r32', kickoff:cest('2026-07-04T00:00'), venue:'TBD' },
  { home:'1K',        away:'3DEIJL',     group:null, stage:'r32', kickoff:cest('2026-07-04T03:30'), venue:'TBD' },
];

// ── ROUND OF 16 ──────────────────────────────────────────────────────────────
// W73 = winner of match 73, etc.
const R16 = [
  { home:'W73', away:'W75', group:null, stage:'r16', kickoff:cest('2026-07-04T19:00'), venue:'TBD' },
  { home:'W74', away:'W77', group:null, stage:'r16', kickoff:cest('2026-07-04T23:00'), venue:'TBD' },
  { home:'W76', away:'W78', group:null, stage:'r16', kickoff:cest('2026-07-05T22:00'), venue:'TBD' },
  { home:'W79', away:'W80', group:null, stage:'r16', kickoff:cest('2026-07-06T02:00'), venue:'TBD' },
  { home:'W83', away:'W84', group:null, stage:'r16', kickoff:cest('2026-07-06T21:00'), venue:'TBD' },
  { home:'W81', away:'W82', group:null, stage:'r16', kickoff:cest('2026-07-07T02:00'), venue:'TBD' },
  { home:'W86', away:'W88', group:null, stage:'r16', kickoff:cest('2026-07-07T18:00'), venue:'TBD' },
  { home:'W85', away:'W87', group:null, stage:'r16', kickoff:cest('2026-07-07T22:00'), venue:'TBD' },
];

// ── QUARTER-FINALS ───────────────────────────────────────────────────────────
const QF = [
  { home:'W89', away:'W90', group:null, stage:'qf', kickoff:cest('2026-07-09T22:00'), venue:'TBD' },
  { home:'W93', away:'W94', group:null, stage:'qf', kickoff:cest('2026-07-10T21:00'), venue:'TBD' },
  { home:'W91', away:'W92', group:null, stage:'qf', kickoff:cest('2026-07-11T23:00'), venue:'TBD' },
  { home:'W95', away:'W96', group:null, stage:'qf', kickoff:cest('2026-07-12T03:00'), venue:'TBD' },
];

// ── SEMI-FINALS ──────────────────────────────────────────────────────────────
const SF = [
  { home:'W97',  away:'W98',  group:null, stage:'sf',    kickoff:cest('2026-07-14T21:00'), venue:'MetLife Stadium, New York' },
  { home:'W99',  away:'W100', group:null, stage:'sf',    kickoff:cest('2026-07-15T21:00'), venue:'SoFi Stadium, Los Angeles' },
  { home:'L101', away:'L102', group:null, stage:'third', kickoff:cest('2026-07-18T23:00'), venue:'AT&T Stadium, Dallas' },
  { home:'W101', away:'W102', group:null, stage:'final', kickoff:cest('2026-07-19T21:00'), venue:'MetLife Stadium, New York' },
];

module.exports = [...G, ...R32, ...R16, ...QF, ...SF];
