const express = require('express');
const path = require('path');
const { initDB } = require('./db');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth',        require('./routes/auth'));
app.use('/api/matches',     require('./routes/matches'));
app.use('/api/predictions', require('./routes/predictions'));
app.use('/api/admin',       require('./routes/admin'));
app.use('/api/leaderboard', require('./routes/leaderboard'));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`World Cup Predictor → http://localhost:${PORT}`);
      console.log(`Admin password: ${process.env.ADMIN_PASSWORD || 'admin1234'}`);
    });
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
