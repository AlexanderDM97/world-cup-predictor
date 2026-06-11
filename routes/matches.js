const router = require('express').Router();
const { db } = require('../db');

router.get('/', async (req, res, next) => {
  try {
    const rs = await db.execute(`
      SELECT id, home_team, away_team, group_name, stage, kickoff_time, venue,
             prediction_deadline, actual_home_score, actual_away_score,
             actual_first_goal_minute, actual_winner, actual_extra_time,
             actual_penalties, actual_penalties_home, actual_penalties_away,
             result_entered
      FROM matches ORDER BY kickoff_time ASC
    `);
    res.json(rs.rows);
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const rs    = await db.execute({ sql: 'SELECT * FROM matches WHERE id = ?', args: [req.params.id] });
    const match = rs.rows[0];
    if (!match) return res.status(404).json({ error: 'Match not found' });
    res.json(match);
  } catch (e) { next(e); }
});

module.exports = router;
