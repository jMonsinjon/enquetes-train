const express = require('express');
const { pool } = require('../db/database');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT col.*, t.name as team_name
      FROM collaborators col
      LEFT JOIN teams t ON col.team_id = t.id
      ORDER BY t.name, col.last_name, col.first_name
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { team_id, first_name, last_name } = req.body;
    if (!team_id || !first_name || !last_name) {
      return res.status(400).json({ error: 'team_id, first_name et last_name sont requis' });
    }
    const [result] = await pool.execute(
      'INSERT INTO collaborators (team_id, first_name, last_name) VALUES (?, ?, ?)',
      [team_id, first_name, last_name]
    );
    const [rows] = await pool.execute('SELECT * FROM collaborators WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { team_id, first_name, last_name } = req.body;
    const [existing] = await pool.execute('SELECT * FROM collaborators WHERE id = ?', [req.params.id]);
    const col = existing[0];
    if (!col) return res.status(404).json({ error: 'Collaborateur non trouvé' });
    await pool.execute(
      'UPDATE collaborators SET team_id = ?, first_name = ?, last_name = ? WHERE id = ?',
      [team_id ?? col.team_id, first_name ?? col.first_name, last_name ?? col.last_name, req.params.id]
    );
    const [rows] = await pool.execute('SELECT * FROM collaborators WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const [used] = await pool.execute(
      'SELECT COUNT(*) as count FROM surveys WHERE collaborator_id = ?',
      [req.params.id]
    );
    if (Number(used[0].count) > 0) {
      return res.status(409).json({
        error: `Ce collaborateur est associé à ${used[0].count} enquête(s) et ne peut pas être supprimé`,
      });
    }
    const [result] = await pool.execute('DELETE FROM collaborators WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Collaborateur non trouvé' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
