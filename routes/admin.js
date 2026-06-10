const router = require('express').Router();
const { getDB, calculatePoints, recalculateChampionPoints } = require('../db');
const { authenticateAdmin } = require('../middleware');

router.get('/matches', authenticateAdmin, (req, res) => {
  const db = getDB();
  res.json(db.prepare(`
    SELECT m.*, COUNT(p.id) as prediction_count
    FROM matches m LEFT JOIN predictions p ON p.match_id = m.id
    GROUP BY m.id ORDER BY m.kickoff_time ASC
  `).all());
});

router.post('/matches', authenticateAdmin, (req, res) => {
  const { home_team, away_team, group_name, stage, kickoff_time, venue } = req.body;
  if (!home_team || !away_team || !kickoff_time || !stage)
    return res.status(400).json({ error: 'home_team, away_team, stage, kickoff_time required' });
  const db = getDB();
  const r  = db.prepare(`INSERT INTO matches (home_team,away_team,group_name,stage,kickoff_time,venue) VALUES (?,?,?,?,?,?)`)
    .run(home_team, away_team, group_name||null, stage, kickoff_time, venue||null);
  res.json({ id: Number(r.lastInsertRowid), success: true });
});

router.put('/matches/:id', authenticateAdmin, (req, res) => {
  const { home_team, away_team, group_name, stage, kickoff_time, venue } = req.body;
  const db = getDB();
  if (!db.prepare('SELECT id FROM matches WHERE id=?').get(req.params.id))
    return res.status(404).json({ error: 'Match not found' });
  db.prepare(`
    UPDATE matches SET
      home_team    = COALESCE(?,home_team),
      away_team    = COALESCE(?,away_team),
      group_name   = COALESCE(?,group_name),
      stage        = COALESCE(?,stage),
      kickoff_time = COALESCE(?,kickoff_time),
      venue        = COALESCE(?,venue)
    WHERE id=?
  `).run(home_team||null, away_team||null, group_name!==undefined?group_name:null,
         stage||null, kickoff_time||null, venue!==undefined?venue:null, req.params.id);
  res.json({ success: true });
});

router.post('/matches/:id/result', authenticateAdmin, (req, res) => {
  const { home_score, away_score, first_goal_minute, winner,
          extra_time, penalties, penalties_home, penalties_away } = req.body;
  if (home_score==null || away_score==null || first_goal_minute==null)
    return res.status(400).json({ error: 'home_score, away_score, first_goal_minute required' });

  const db    = getDB();
  const match = db.prepare('SELECT * FROM matches WHERE id=?').get(req.params.id);
  if (!match) return res.status(404).json({ error: 'Match not found' });

  const hasPen = !!(penalties && extra_time);

  db.prepare(`
    UPDATE matches SET
      actual_home_score=?, actual_away_score=?, actual_first_goal_minute=?,
      actual_winner=?, actual_extra_time=?, actual_penalties=?,
      actual_penalties_home=?, actual_penalties_away=?, result_entered=1
    WHERE id=?
  `).run(home_score, away_score, first_goal_minute,
         winner||null, extra_time?1:0, hasPen?1:0,
         hasPen?(penalties_home??null):null, hasPen?(penalties_away??null):null,
         req.params.id);

  const updated     = db.prepare('SELECT * FROM matches WHERE id=?').get(req.params.id);
  const predictions = db.prepare('SELECT * FROM predictions WHERE match_id=?').all(req.params.id);
  const upd         = db.prepare('UPDATE predictions SET points_score=?,points_first_goal=?,points_penalties=? WHERE id=?');

  db.exec('BEGIN');
  try {
    for (const pred of predictions) {
      const { scorePoints, firstGoalPoints, penaltyPoints } = calculatePoints(pred, updated);
      upd.run(scorePoints, firstGoalPoints, penaltyPoints, pred.id);
    }
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }

  recalculateChampionPoints(db);

  res.json({ success: true, predictions_updated: predictions.length });
});

router.delete('/matches/:id', authenticateAdmin, (req, res) => {
  const db = getDB();
  db.exec('BEGIN');
  try {
    db.prepare('DELETE FROM predictions WHERE match_id=?').run(req.params.id);
    db.prepare('DELETE FROM matches WHERE id=?').run(req.params.id);
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  res.json({ success: true });
});

router.get('/participants', authenticateAdmin, (req, res) => {
  const db = getDB();
  res.json(db.prepare(`
    SELECT p.id, p.name, p.predicted_champion, p.champion_points, p.created_at,
           COUNT(pr.id) as predictions_count,
           COALESCE(SUM(COALESCE(pr.points_score,0)+COALESCE(pr.points_first_goal,0)+COALESCE(pr.points_penalties,0)),0) as prediction_points,
           COALESCE(SUM(COALESCE(pr.points_score,0)+COALESCE(pr.points_first_goal,0)+COALESCE(pr.points_penalties,0)),0) + COALESCE(p.champion_points,0) as total_points
    FROM participants p LEFT JOIN predictions pr ON pr.participant_id=p.id
    GROUP BY p.id ORDER BY total_points DESC
  `).all());
});

module.exports = router;
