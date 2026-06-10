const router = require('express').Router();
const { getDB } = require('../db');
const { authenticateParticipant, optionalParticipant } = require('../middleware');

router.post('/', authenticateParticipant, (req, res) => {
  const { match_id, home_score, away_score, first_goal_minute,
          extra_time, penalties, penalties_home, penalties_away } = req.body;

  if (match_id == null || home_score == null || away_score == null || first_goal_minute == null)
    return res.status(400).json({ error: 'match_id, home_score, away_score, first_goal_minute are required' });
  if (home_score < 0 || away_score < 0 || first_goal_minute < 0 || first_goal_minute > 120)
    return res.status(400).json({ error: 'Invalid values' });

  const db    = getDB();
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(match_id);
  if (!match) return res.status(404).json({ error: 'Match not found' });
  if (new Date() >= new Date(match.kickoff_time))
    return res.status(403).json({ error: 'Prediction deadline has passed' });

  const existing = db.prepare('SELECT id FROM predictions WHERE participant_id = ? AND match_id = ?')
    .get(req.participant.id, match_id);
  if (existing)
    return res.status(403).json({ error: 'You have already submitted a prediction for this match — predictions are locked once submitted' });

  const hasPen = penalties && extra_time;
  db.prepare(`
    INSERT INTO predictions
      (participant_id, match_id, predicted_home_score, predicted_away_score, predicted_first_goal_minute,
       predicted_extra_time, predicted_penalties, predicted_penalties_home, predicted_penalties_away)
    VALUES (?,?,?,?,?,?,?,?,?)
  `).run(
    req.participant.id, match_id, home_score, away_score, first_goal_minute,
    extra_time ? 1 : 0, hasPen ? 1 : 0,
    hasPen ? (penalties_home ?? null) : null,
    hasPen ? (penalties_away ?? null) : null
  );

  res.json({ success: true });
});

router.get('/my', authenticateParticipant, (req, res) => {
  const db   = getDB();
  const rows = db.prepare(`
    SELECT p.*, m.home_team, m.away_team, m.group_name, m.stage, m.kickoff_time, m.venue,
           m.actual_home_score, m.actual_away_score, m.actual_first_goal_minute,
           m.actual_extra_time, m.actual_penalties, m.actual_penalties_home, m.actual_penalties_away,
           m.result_entered
    FROM predictions p JOIN matches m ON p.match_id = m.id
    WHERE p.participant_id = ?
    ORDER BY m.kickoff_time ASC
  `).all(req.participant.id);
  res.json(rows);
});

// Visible when: kickoff passed OR requesting participant has their own prediction for this match
router.get('/match/:matchId', optionalParticipant, (req, res) => {
  const db    = getDB();
  const match = db.prepare('SELECT id, kickoff_time FROM matches WHERE id = ?').get(req.params.matchId);
  if (!match) return res.status(404).json({ error: 'Match not found' });

  const kicked = new Date() >= new Date(match.kickoff_time);
  let canSee   = kicked;

  if (!canSee && req.participant) {
    const own = db.prepare('SELECT id FROM predictions WHERE participant_id = ? AND match_id = ?')
      .get(req.participant.id, req.params.matchId);
    canSee = !!own;
  }

  if (!canSee)
    return res.status(403).json({ error: 'Submit your own prediction first to see others' });

  const rows = db.prepare(`
    SELECT pt.name AS participant_name,
           p.predicted_home_score, p.predicted_away_score, p.predicted_first_goal_minute,
           p.predicted_extra_time, p.predicted_penalties,
           p.predicted_penalties_home, p.predicted_penalties_away,
           p.points_score, p.points_first_goal, p.points_penalties
    FROM predictions p JOIN participants pt ON p.participant_id = pt.id
    WHERE p.match_id = ?
    ORDER BY (COALESCE(p.points_score,0)+COALESCE(p.points_first_goal,0)+COALESCE(p.points_penalties,0)) DESC, pt.name ASC
  `).all(req.params.matchId);

  res.json(rows);
});

module.exports = router;
