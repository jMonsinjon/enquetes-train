const express = require('express');
const cors = require('cors');
const { pool, runMigrations } = require('./db/database');

const groupsRouter = require('./routes/groups');
const criteriaRouter = require('./routes/criteria');
const teamsRouter = require('./routes/teams');
const collaboratorsRouter = require('./routes/collaborators');
const surveysRouter = require('./routes/surveys');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/groups', groupsRouter);
app.use('/api/criteria', criteriaRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/collaborators', collaboratorsRouter);
app.use('/api/surveys', surveysRouter);

async function waitForDatabase(retries = 15, delayMs = 3000) {
  for (let i = 0; i < retries; i++) {
    try {
      const conn = await pool.getConnection();
      conn.release();
      console.log('[db] Connexion MySQL établie');
      return;
    } catch (err) {
      if (i === retries - 1) throw err;
      console.log(`[db] MySQL non disponible, nouvelle tentative dans ${delayMs / 1000}s... (${i + 1}/${retries})`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

async function start() {
  try {
    await waitForDatabase();
    await runMigrations();
    app.listen(PORT, () => {
      console.log(`Backend démarré sur http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Erreur de démarrage:', err);
    process.exit(1);
  }
}

start();
