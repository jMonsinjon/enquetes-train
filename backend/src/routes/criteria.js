const express = require('express');
const { pool } = require('../db/database');
const router = express.Router();

const VALID_ROLES = ['TOUS', 'TITULAIRE', 'AGENT_B', 'RENFORT', 'EA'];

// Doit être défini avant /:id pour ne pas être capturé comme paramètre
router.get('/count-for-role/:role', async (req, res) => {
  try {
    const { role } = req.params;
    if (!['TITULAIRE', 'AGENT_B', 'RENFORT', 'EA'].includes(role)) {
      return res.status(400).json({ error: 'Rôle invalide' });
    }
    const [rows] = await pool.execute(
      "SELECT COUNT(*) as count FROM criteria WHERE roles = 'TOUS' OR roles = ?",
      [role]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT c.*, g.name as group_name
      FROM criteria c
      LEFT JOIN \`groups\` g ON c.group_id = g.id
      ORDER BY g.sort_order, g.name, c.sort_order, c.name
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { group_id, name, description = null, roles = 'TOUS', sort_order = 0 } = req.body;
    if (!group_id || !name) return res.status(400).json({ error: 'group_id et name sont requis' });
    if (!VALID_ROLES.includes(roles)) return res.status(400).json({ error: 'Rôle invalide' });
    const [result] = await pool.execute(
      'INSERT INTO criteria (group_id, name, description, roles, sort_order) VALUES (?, ?, ?, ?, ?)',
      [group_id, name, description, roles, sort_order]
    );
    const [rows] = await pool.execute('SELECT * FROM criteria WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { group_id, name, description, roles, sort_order } = req.body;
    const [existing] = await pool.execute('SELECT * FROM criteria WHERE id = ?', [req.params.id]);
    const criterion = existing[0];
    if (!criterion) return res.status(404).json({ error: 'Critère non trouvé' });
    if (roles && !VALID_ROLES.includes(roles)) return res.status(400).json({ error: 'Rôle invalide' });
    await pool.execute(
      'UPDATE criteria SET group_id = ?, name = ?, description = ?, roles = ?, sort_order = ? WHERE id = ?',
      [
        group_id ?? criterion.group_id,
        name ?? criterion.name,
        description !== undefined ? description : criterion.description,
        roles ?? criterion.roles,
        sort_order ?? criterion.sort_order,
        req.params.id,
      ]
    );
    const [rows] = await pool.execute('SELECT * FROM criteria WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const [used] = await pool.execute(
      'SELECT COUNT(*) as count FROM survey_evaluations WHERE criteria_id = ?',
      [req.params.id]
    );
    if (Number(used[0].count) > 0) {
      return res.status(409).json({
        error: `Ce critère est utilisé dans ${used[0].count} évaluation(s) et ne peut pas être supprimé`,
      });
    }
    const [result] = await pool.execute('DELETE FROM criteria WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Critère non trouvé' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
