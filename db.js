const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'worldcup.db');
let db;

function getDB() {
  if (!db) {
    db = new DatabaseSync(DB_PATH);
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA foreign_keys = ON');
  }
  return db;
}

function initDB() {
  const d = getDB();
  d.exec(`
    CREATE TABLE IF NOT EXISTS participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL COLLATE NOCASE,
      pin_hash TEXT NOT NULL,
      predicted_champion TEXT,
      champion_points INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      home_team TEXT NOT NULL,
      away_team TEXT NOT NULL,
      group_name TEXT,
      stage TEXT NOT NULL DEFAULT 'group',
      kickoff_time TEXT NOT NULL,
      venue TEXT,
      actual_home_score INTEGER,
      actual_away_score INTEGER,
      actual_first_goal_minute INTEGER,
      actual_winner TEXT,
      actual_extra_time INTEGER DEFAULT 0,
      actual_penalties INTEGER DEFAULT 0,
      actual_penalties_home INTEGER,
      actual_penalties_away INTEGER,
      result_entered INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      participant_id INTEGER NOT NULL REFERENCES participants(id),
      match_id INTEGER NOT NULL REFERENCES matches(id),
      predicted_home_score INTEGER NOT NULL,
      predicted_away_score INTEGER NOT NULL,
      predicted_first_goal_minute INTEGER NOT NULL,
      predicted_extra_time INTEGER DEFAULT 0,
      predicted_penalties INTEGER DEFAULT 0,
      predicted_penalties_home INTEGER,
      predicted_penalties_away INTEGER,
      points_score INTEGER,
      points_first_goal INTEGER,
      points_penalties INTEGER DEFAULT 0,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(participant_id, match_id)
    );
  `);

  runMigrations(d);

  const count = d.prepare('SELECT COUNT(*) as c FROM matches').get();
  if (Number(count.c) === 0) {
    try {
      const seedData = require('./seed-data');
      const ins = d.prepare(`INSERT INTO matches (home_team,away_team,group_name,stage,kickoff_time,venue) VALUES (?,?,?,?,?,?)`);
      d.exec('BEGIN');
      for (const m of seedData) ins.run(m.home, m.away, m.group, m.stage, m.kickoff, m.venue);
      d.exec('COMMIT');
      console.log(`Seeded ${seedData.length} matches`);
    } catch (e) {
      try { d.exec('ROLLBACK'); } catch {}
      console.log('Seed skipped:', e.message);
    }
  }
}

function runMigrations(d) {
  const cols = (t) => d.prepare(`PRAGMA table_info(${t})`).all().map(r => r.name);
  const add  = (t, col, def) => { if (!cols(t).includes(col)) d.exec(`ALTER TABLE ${t} ADD COLUMN ${col} ${def}`); };
  add('participants', 'predicted_champion',   'TEXT');
  add('participants', 'champion_points',      'INTEGER DEFAULT 0');
  add('matches',      'actual_extra_time',    'INTEGER DEFAULT 0');
  add('matches',      'actual_penalties',     'INTEGER DEFAULT 0');
  add('matches',      'actual_penalties_home','INTEGER');
  add('matches',      'actual_penalties_away','INTEGER');
  add('predictions',  'predicted_extra_time',     'INTEGER DEFAULT 0');
  add('predictions',  'predicted_penalties',       'INTEGER DEFAULT 0');
  add('predictions',  'predicted_penalties_home',  'INTEGER');
  add('predictions',  'predicted_penalties_away',  'INTEGER');
  add('predictions',  'points_penalties',          'INTEGER DEFAULT 0');
}

function calculatePoints(prediction, match) {
  const ph  = Number(prediction.predicted_home_score);
  const pa  = Number(prediction.predicted_away_score);
  const pfg = Number(prediction.predicted_first_goal_minute);
  const ah  = Number(match.actual_home_score);
  const aa  = Number(match.actual_away_score);
  const afg = Number(match.actual_first_goal_minute);

  let scorePoints = 0;
  if (ph === ah && pa === aa) {
    scorePoints = 5;
  } else {
    const pred   = ph > pa ? 'home' : ph < pa ? 'away' : 'draw';
    const actual = match.actual_winner || (ah > aa ? 'home' : ah < aa ? 'away' : 'draw');
    if (pred === actual) scorePoints = 2;
  }

  let firstGoalPoints = 0;
  if (afg === 0)       firstGoalPoints = pfg === 0 ? 5 : 0;
  else if (pfg === 0)  firstGoalPoints = 0;
  else                 firstGoalPoints = Math.max(0, 5 - Math.abs(pfg - afg));

  let penaltyPoints = 0;
  if (match.actual_penalties && prediction.predicted_penalties) {
    const pph = Number(prediction.predicted_penalties_home);
    const ppa = Number(prediction.predicted_penalties_away);
    const aph = Number(match.actual_penalties_home);
    const apa = Number(match.actual_penalties_away);
    if (pph === aph && ppa === apa) penaltyPoints = 10;
  }

  return { scorePoints, firstGoalPoints, penaltyPoints };
}

function recalculateChampionPoints(db) {
  db.prepare('UPDATE participants SET champion_points = 0').run();
  const completed = db.prepare('SELECT * FROM matches WHERE result_entered = 1').all();
  for (const m of completed) {
    const winner = m.actual_winner === 'home' ? m.home_team
                 : m.actual_winner === 'away' ? m.away_team
                 : Number(m.actual_home_score) > Number(m.actual_away_score) ? m.home_team
                 : Number(m.actual_away_score) > Number(m.actual_home_score) ? m.away_team
                 : null;
    if (!winner) continue;
    db.prepare('UPDATE participants SET champion_points = champion_points + 3 WHERE predicted_champion = ?').run(winner);
    if (m.stage === 'final')
      db.prepare('UPDATE participants SET champion_points = champion_points + 10 WHERE predicted_champion = ?').run(winner);
  }
}

module.exports = { getDB, initDB, calculatePoints, recalculateChampionPoints };
