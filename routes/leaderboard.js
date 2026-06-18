const router = require('express').Router();
const { db } = require('../db');
const { authenticateParticipant } = require('../middleware');

router.get('/', async (req, res, next) => {
  try {
    const rs = await db.execute(`
      SELECT p.id, p.name, p.predicted_champion,
             COALESCE(p.champion_points,0) AS champion_points,
             COUNT(pr.id) AS predictions_made,
             COALESCE(SUM(COALESCE(pr.points_score,0)+COALESCE(pr.points_first_goal,0)+COALESCE(pr.points_penalties,0)+COALESCE(pr.points_et,0)),0) AS prediction_points,
             COALESCE(SUM(COALESCE(pr.points_score,0)+COALESCE(pr.points_first_goal,0)+COALESCE(pr.points_penalties,0)+COALESCE(pr.points_et,0)),0) + COALESCE(p.champion_points,0) AS total_points,
             COALESCE(SUM(CASE WHEN pr.points_score=5 THEN 1 ELSE 0 END),0)   AS exact_scores,
             COALESCE(SUM(CASE WHEN pr.points_score=2 THEN 1 ELSE 0 END),0)   AS correct_winners,
             COALESCE(SUM(COALESCE(pr.points_first_goal,0)),0)                AS first_goal_points,
             COALESCE(SUM(COALESCE(pr.points_penalties,0)),0)                 AS penalty_points,
             COALESCE(SUM(COALESCE(pr.points_et,0)),0)                        AS et_points
      FROM participants p LEFT JOIN predictions pr ON pr.participant_id=p.id
      GROUP BY p.id
      ORDER BY total_points DESC, exact_scores DESC, p.name ASC
    `);
    res.json(rs.rows.map((r, i) => ({ ...r, rank: i + 1 })));
  } catch (e) { next(e); }
});

// Detailed points breakdown for one participant — any logged-in participant can view
router.get('/:id/detail', authenticateParticipant, async (req, res, next) => {
  try {
    const part = (await db.execute({
      sql:  'SELECT name, predicted_champion, champion_points FROM participants WHERE id=?',
      args: [req.params.id],
    })).rows[0];
    if (!part) return res.status(404).json({ error: 'Participant not found' });

    const rs = await db.execute({
      sql: `SELECT p.predicted_home_score, p.predicted_away_score, p.predicted_first_goal_minute,
                   p.predicted_extra_time, p.predicted_penalties,
                   p.predicted_penalties_home, p.predicted_penalties_away,
                   p.points_score, p.points_first_goal, p.points_penalties, p.points_et,
                   m.id AS match_id, m.home_team, m.away_team, m.stage, m.group_name,
                   m.kickoff_time, m.result_entered,
                   m.actual_home_score, m.actual_away_score, m.actual_first_goal_minute,
                   m.actual_extra_time, m.actual_penalties,
                   m.actual_penalties_home, m.actual_penalties_away
            FROM predictions p JOIN matches m ON p.match_id = m.id
            WHERE p.participant_id = ?
            ORDER BY m.kickoff_time ASC`,
      args: [req.params.id],
    });

    res.json({ participant: part, predictions: rs.rows });
  } catch (e) { next(e); }
});

module.exports = router;
