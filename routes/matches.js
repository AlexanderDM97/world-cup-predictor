const router = require('express').Router();
const { getDB } = require('../db');

router.get('/', (req, res) => {
  const db = getDB();
  const matches = db.prepare(`
    SELECT id, home_team, away_team, group_name, stage, kickoff_time, venue,
           actual_home_score, actual_away_score, actual_first_goal_minute, actual_winner,
           result_entered
    FROM matches ORDER BY kickoff_time ASC
  `).all();
  res.json(matches);
});

router.get('/:id', (req, res) => {
  const db = getDB();
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
  if (!match) return res.status(404).json({ error: 'Match not found' });
  res.json(match);
});

module.exports = router;
