const router = require('express').Router();
const { db, calculatePoints, recalculateChampionPoints } = require('../db');
const { authenticateAdmin } = require('../middleware');

router.get('/matches', authenticateAdmin, async (req, res, next) => {
  try {
    const rs = await db.execute(`
      SELECT m.*, COUNT(p.id) as prediction_count
      FROM matches m LEFT JOIN predictions p ON p.match_id = m.id
      GROUP BY m.id ORDER BY m.kickoff_time ASC
    `);
    res.json(rs.rows);
  } catch (e) { next(e); }
});

router.post('/matches', authenticateAdmin, async (req, res, next) => {
  try {
    const { home_team, away_team, group_name, stage, kickoff_time, venue, prediction_deadline } = req.body;
    if (!home_team || !away_team || !kickoff_time || !stage)
      return res.status(400).json({ error: 'home_team, away_team, stage, kickoff_time required' });
    const r = await db.execute({
      sql:  'INSERT INTO matches (home_team,away_team,group_name,stage,kickoff_time,venue,prediction_deadline) VALUES (?,?,?,?,?,?,?)',
      args: [home_team, away_team, group_name || null, stage, kickoff_time, venue || null, prediction_deadline || null],
    });
    res.json({ id: Number(r.lastInsertRowid), success: true });
  } catch (e) { next(e); }
});

router.put('/matches/:id', authenticateAdmin, async (req, res, next) => {
  try {
    const { home_team, away_team, group_name, stage, kickoff_time, venue, prediction_deadline } = req.body;
    const existing = (await db.execute({ sql: 'SELECT id FROM matches WHERE id=?', args: [req.params.id] })).rows[0];
    if (!existing) return res.status(404).json({ error: 'Match not found' });
    await db.execute({
      sql: `UPDATE matches SET
              home_team           = COALESCE(?,home_team),
              away_team           = COALESCE(?,away_team),
              group_name          = COALESCE(?,group_name),
              stage               = COALESCE(?,stage),
              kickoff_time        = COALESCE(?,kickoff_time),
              venue               = COALESCE(?,venue),
              prediction_deadline = ?
            WHERE id=?`,
      args: [
        home_team || null, away_team || null,
        group_name !== undefined ? group_name : null,
        stage || null, kickoff_time || null,
        venue !== undefined ? venue : null,
        prediction_deadline || null,
        req.params.id,
      ],
    });
    res.json({ success: true });
  } catch (e) { next(e); }
});

router.post('/matches/:id/result', authenticateAdmin, async (req, res, next) => {
  try {
    const { home_score, away_score, first_goal_minute, winner,
            extra_time, penalties, penalties_home, penalties_away } = req.body;
    if (home_score == null || away_score == null || first_goal_minute == null)
      return res.status(400).json({ error: 'home_score, away_score, first_goal_minute required' });

    const match = (await db.execute({ sql: 'SELECT * FROM matches WHERE id=?', args: [req.params.id] })).rows[0];
    if (!match) return res.status(404).json({ error: 'Match not found' });

    const hasPen = !!(penalties && extra_time);
    await db.execute({
      sql: `UPDATE matches SET
              actual_home_score=?, actual_away_score=?, actual_first_goal_minute=?,
              actual_winner=?, actual_extra_time=?, actual_penalties=?,
              actual_penalties_home=?, actual_penalties_away=?, result_entered=1
            WHERE id=?`,
      args: [
        home_score, away_score, first_goal_minute, winner || null,
        extra_time ? 1 : 0, hasPen ? 1 : 0,
        hasPen ? (penalties_home ?? null) : null,
        hasPen ? (penalties_away ?? null) : null,
        req.params.id,
      ],
    });

    const updated     = (await db.execute({ sql: 'SELECT * FROM matches WHERE id=?', args: [req.params.id] })).rows[0];
    const predictions = (await db.execute({ sql: 'SELECT * FROM predictions WHERE match_id=?', args: [req.params.id] })).rows;

    if (predictions.length > 0) {
      const stmts = predictions.map(pred => {
        const { scorePoints, firstGoalPoints, penaltyPoints, etPoints } = calculatePoints(pred, updated);
        return {
          sql:  'UPDATE predictions SET points_score=?,points_first_goal=?,points_penalties=?,points_et=? WHERE id=?',
          args: [scorePoints, firstGoalPoints, penaltyPoints, etPoints, pred.id],
        };
      });
      await db.batch(stmts, 'write');
    }

    await recalculateChampionPoints();
    res.json({ success: true, predictions_updated: predictions.length });
  } catch (e) { next(e); }
});

router.delete('/matches/:id', authenticateAdmin, async (req, res, next) => {
  try {
    await db.batch([
      { sql: 'DELETE FROM predictions WHERE match_id=?', args: [req.params.id] },
      { sql: 'DELETE FROM matches WHERE id=?',           args: [req.params.id] },
    ], 'write');
    res.json({ success: true });
  } catch (e) { next(e); }
});

router.get('/participants', authenticateAdmin, async (req, res, next) => {
  try {
    const rs = await db.execute(`
      SELECT p.id, p.name, p.predicted_champion, p.champion_points, p.created_at,
             COUNT(pr.id) as predictions_count,
             COALESCE(SUM(COALESCE(pr.points_score,0)+COALESCE(pr.points_first_goal,0)+COALESCE(pr.points_penalties,0)+COALESCE(pr.points_et,0)),0) as prediction_points,
             COALESCE(SUM(COALESCE(pr.points_score,0)+COALESCE(pr.points_first_goal,0)+COALESCE(pr.points_penalties,0)+COALESCE(pr.points_et,0)),0) + COALESCE(p.champion_points,0) as total_points
      FROM participants p LEFT JOIN predictions pr ON pr.participant_id=p.id
      GROUP BY p.id ORDER BY total_points DESC
    `);
    res.json(rs.rows);
  } catch (e) { next(e); }
});

module.exports = router;
