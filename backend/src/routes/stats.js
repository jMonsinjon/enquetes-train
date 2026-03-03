const express = require('express');
const router = express.Router();
const { pool } = require('../db/database');

// TOP 3 meilleurs et pires critères (enquêtes FINALISEES, NON_EVALUE exclu)
// Score : CONFORME=3, PARTIEL=2, NON_CONFORME=1
router.get('/top-criteria', async (req, res) => {
  try {
    const sql = `
      SELECT
        c.id,
        c.name,
        AVG(CASE se.value
          WHEN 'CONFORME'     THEN 3
          WHEN 'PARTIEL'      THEN 2
          WHEN 'NON_CONFORME' THEN 1
        END) AS avg_score,
        COUNT(*) AS eval_count
      FROM survey_evaluations se
      JOIN criteria c ON se.criteria_id = c.id
      JOIN surveys s ON se.survey_id = s.id
      WHERE s.status = 'FINALISEE'
        AND se.value != 'NON_EVALUE'
      GROUP BY c.id, c.name
      ORDER BY avg_score ASC, eval_count DESC
    `;

    const [rows] = await pool.execute(sql);

    const worst = rows.slice(0, 3);
    const best = [...rows].reverse().slice(0, 3);

    res.json({ worst, best });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Répartition des évaluations pour un collaborateur
// Pour chaque critère, on garde l'évaluation de l'enquête la plus récente (date DESC, id DESC)
router.get('/collaborator/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const sql = `
      WITH ranked AS (
        SELECT
          se.value,
          ROW_NUMBER() OVER (
            PARTITION BY se.criteria_id
            ORDER BY s.date DESC, s.id DESC
          ) AS rn
        FROM survey_evaluations se
        JOIN surveys s ON se.survey_id = s.id
        WHERE s.collaborator_id = ?
      )
      SELECT value, COUNT(*) AS count
      FROM ranked
      WHERE rn = 1
      GROUP BY value
    `;

    const [rows] = await pool.execute(sql, [id]);

    // Construire un objet avec toutes les valeurs possibles (0 si absent)
    const distribution = { CONFORME: 0, PARTIEL: 0, NON_CONFORME: 0, NON_EVALUE: 0 };
    for (const row of rows) {
      distribution[row.value] = Number(row.count);
    }

    res.json(distribution);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
