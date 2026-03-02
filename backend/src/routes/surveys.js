const express = require('express');
const { pool } = require('../db/database');
const router = express.Router();

const VALID_ROLES = ['TITULAIRE', 'AGENT_B', 'RENFORT', 'EA'];
const VALID_VALUES = ['NON_EVALUE', 'CONFORME', 'PARTIEL', 'NON_CONFORME'];

// GET toutes les enquêtes avec infos collaborateur et progression
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT s.*,
             col.first_name, col.last_name,
             t.name as team_name,
             (SELECT COUNT(*) FROM survey_evaluations se WHERE se.survey_id = s.id) as total_criteria,
             (SELECT COUNT(*) FROM survey_evaluations se WHERE se.survey_id = s.id AND se.value != 'NON_EVALUE') as evaluated_criteria
      FROM surveys s
      LEFT JOIN collaborators col ON s.collaborator_id = col.id
      LEFT JOIN teams t ON col.team_id = t.id
      ORDER BY s.date DESC, s.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET une enquête avec ses évaluations groupées par groupe de critères
router.get('/:id', async (req, res) => {
  try {
    const [surveyRows] = await pool.execute(`
      SELECT s.*, col.first_name, col.last_name, t.name as team_name
      FROM surveys s
      LEFT JOIN collaborators col ON s.collaborator_id = col.id
      LEFT JOIN teams t ON col.team_id = t.id
      WHERE s.id = ?
    `, [req.params.id]);

    const survey = surveyRows[0];
    if (!survey) return res.status(404).json({ error: 'Enquête non trouvée' });

    const [evaluations] = await pool.execute(`
      SELECT se.id as evaluation_id, se.value, se.comment,
             c.id as criteria_id, c.name as criteria_name, c.description, c.roles,
             g.id as group_id, g.name as group_name, g.sort_order as group_sort_order,
             c.sort_order as criteria_sort_order
      FROM survey_evaluations se
      JOIN criteria c ON se.criteria_id = c.id
      JOIN \`groups\` g ON c.group_id = g.id
      WHERE se.survey_id = ?
      ORDER BY g.sort_order, g.name, c.sort_order, c.name
    `, [req.params.id]);

    const groupsMap = {};
    for (const item of evaluations) {
      if (!groupsMap[item.group_id]) {
        groupsMap[item.group_id] = {
          id: item.group_id,
          name: item.group_name,
          sort_order: item.group_sort_order,
          criteria: [],
        };
      }
      groupsMap[item.group_id].criteria.push({
        evaluation_id: item.evaluation_id,
        criteria_id: item.criteria_id,
        name: item.criteria_name,
        description: item.description,
        roles: item.roles,
        value: item.value,
        comment: item.comment,
      });
    }

    const groups = Object.values(groupsMap).sort(
      (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)
    );

    res.json({ ...survey, groups });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST créer une enquête et générer les évaluations automatiquement
router.post('/', async (req, res) => {
  const { reference, date, collaborator_id, role, evaluator } = req.body;
  if (!date || !collaborator_id || !role) {
    return res.status(400).json({ error: 'date, collaborator_id et role sont requis' });
  }
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: 'Rôle invalide' });
  }

  const conn = await pool.getConnection();
  try {
    const [applicableCriteria] = await conn.execute(
      "SELECT id FROM criteria WHERE roles = 'TOUS' OR roles = ?",
      [role]
    );

    await conn.beginTransaction();
    const [result] = await conn.execute(
      'INSERT INTO surveys (reference, date, collaborator_id, role, evaluator) VALUES (?, ?, ?, ?, ?)',
      [reference || null, date, collaborator_id, role, evaluator || null]
    );
    const surveyId = result.insertId;

    for (const criterion of applicableCriteria) {
      await conn.execute(
        'INSERT INTO survey_evaluations (survey_id, criteria_id) VALUES (?, ?)',
        [surveyId, criterion.id]
      );
    }
    await conn.commit();

    const [rows] = await conn.execute('SELECT * FROM surveys WHERE id = ?', [surveyId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    await conn.rollback().catch(() => {});
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// PUT modifier une enquête (seulement si EN_COURS)
router.put('/:id', async (req, res) => {
  const conn = await pool.getConnection();
  let inTransaction = false;
  try {
    const [existing] = await conn.execute('SELECT * FROM surveys WHERE id = ?', [req.params.id]);
    const survey = existing[0];
    if (!survey) {
      res.status(404).json({ error: 'Enquête non trouvée' });
      return;
    }
    if (survey.status === 'FINALISEE') {
      res.status(403).json({ error: 'Impossible de modifier une enquête finalisée' });
      return;
    }

    const { reference, date, collaborator_id, role, evaluator } = req.body;

    if (role && role !== survey.role) {
      if (!VALID_ROLES.includes(role)) {
        res.status(400).json({ error: 'Rôle invalide' });
        return;
      }
      const [applicableCriteria] = await conn.execute(
        "SELECT id FROM criteria WHERE roles = 'TOUS' OR roles = ?",
        [role]
      );

      await conn.beginTransaction();
      inTransaction = true;
      await conn.execute(
        'UPDATE surveys SET reference = ?, date = ?, collaborator_id = ?, role = ?, evaluator = ?, updated_at = NOW() WHERE id = ?',
        [
          reference ?? survey.reference,
          date ?? survey.date,
          collaborator_id ?? survey.collaborator_id,
          role,
          evaluator !== undefined ? (evaluator || null) : survey.evaluator,
          req.params.id,
        ]
      );
      await conn.execute('DELETE FROM survey_evaluations WHERE survey_id = ?', [req.params.id]);
      for (const criterion of applicableCriteria) {
        await conn.execute(
          'INSERT INTO survey_evaluations (survey_id, criteria_id) VALUES (?, ?)',
          [req.params.id, criterion.id]
        );
      }
      await conn.commit();
      inTransaction = false;
    } else {
      await conn.execute(
        'UPDATE surveys SET reference = ?, date = ?, collaborator_id = ?, evaluator = ?, updated_at = NOW() WHERE id = ?',
        [
          reference ?? survey.reference,
          date ?? survey.date,
          collaborator_id ?? survey.collaborator_id,
          evaluator !== undefined ? (evaluator || null) : survey.evaluator,
          req.params.id,
        ]
      );
    }

    const [rows] = await conn.execute('SELECT * FROM surveys WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    if (inTransaction) await conn.rollback().catch(() => {});
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// POST finaliser une enquête
router.post('/:id/finalize', async (req, res) => {
  try {
    const [existing] = await pool.execute('SELECT * FROM surveys WHERE id = ?', [req.params.id]);
    const survey = existing[0];
    if (!survey) return res.status(404).json({ error: 'Enquête non trouvée' });
    if (survey.status === 'FINALISEE') {
      return res.status(400).json({ error: 'Enquête déjà finalisée' });
    }
    await pool.execute(
      "UPDATE surveys SET status = 'FINALISEE', updated_at = NOW() WHERE id = ?",
      [req.params.id]
    );
    const [rows] = await pool.execute('SELECT * FROM surveys WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH mettre à jour la valeur et/ou le commentaire d'une évaluation
router.patch('/:surveyId/evaluations/:evaluationId', async (req, res) => {
  try {
    const [surveyRows] = await pool.execute('SELECT * FROM surveys WHERE id = ?', [req.params.surveyId]);
    const survey = surveyRows[0];
    if (!survey) return res.status(404).json({ error: 'Enquête non trouvée' });
    if (survey.status === 'FINALISEE') {
      return res.status(403).json({ error: 'Impossible de modifier une enquête finalisée' });
    }

    const { value, comment } = req.body;
    if (value === undefined && comment === undefined) {
      return res.status(400).json({ error: 'value ou comment est requis' });
    }
    if (value !== undefined && !VALID_VALUES.includes(value)) {
      return res.status(400).json({ error: 'Valeur invalide' });
    }

    const [evalRows] = await pool.execute(
      'SELECT * FROM survey_evaluations WHERE id = ? AND survey_id = ?',
      [req.params.evaluationId, req.params.surveyId]
    );
    if (!evalRows[0]) return res.status(404).json({ error: 'Évaluation non trouvée' });

    const fields = [];
    const params = [];
    if (value !== undefined) { fields.push('value = ?'); params.push(value); }
    if (comment !== undefined) { fields.push('comment = ?'); params.push(comment || null); }
    params.push(req.params.evaluationId);

    await pool.execute(
      `UPDATE survey_evaluations SET ${fields.join(', ')} WHERE id = ?`,
      params
    );
    const [rows] = await pool.execute('SELECT * FROM survey_evaluations WHERE id = ?', [req.params.evaluationId]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE supprimer une enquête
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.execute('DELETE FROM surveys WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Enquête non trouvée' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
