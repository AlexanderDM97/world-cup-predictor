const router = require('express').Router();
const { db } = require('../db');

router.get('/', async (req, res, next) => {
  try {
    const rs = await db.execute(`
      SELECT p.id, p.name, p.predicted_champion,
             COALESCE(p.champion_points,0) AS champion_points,
             COUNT(pr.id) AS predictions_made,
             COALESCE(SUM(COALESCE(pr.points_score,0)+COALESCE(pr.points_first_goal,0)+COALESCE(pr.points_penalties,0)),0) AS prediction_points,
             COALESCE(SUM(COALESCE(pr.points_score,0)+COALESCE(pr.points_first_goal,0)+COALESCE(pr.points_penalties,0)),0) + COALESCE(p.champion_points,0) AS total_points,
             COALESCE(SUM(CASE WHEN pr.points_score=5 THEN 1 ELSE 0 END),0)   AS exact_scores,
             COALESCE(SUM(CASE WHEN pr.points_score=2 THEN 1 ELSE 0 END),0)   AS correct_winners,
             COALESCE(SUM(COALESCE(pr.points_first_goal,0)),0)                AS first_goal_points,
             COALESCE(SUM(COALESCE(pr.points_penalties,0)),0)                 AS penalty_points
      FROM participants p LEFT JOIN predictions pr ON pr.participant_id=p.id
      GROUP BY p.id
      ORDER BY total_points DESC, exact_scores DESC, p.name ASC
    `);
    res.json(rs.rows.map((r, i) => ({ ...r, rank: i + 1 })));
  } catch (e) { next(e); }
});

module.exports = router;
