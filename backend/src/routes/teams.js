const express = require('express');
const { pool } = require('../db/database');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM teams ORDER BY name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, manager = null } = req.body;
    if (!name) return res.status(400).json({ error: 'name est requis' });
    const [result] = await pool.execute(
      'INSERT INTO teams (name, manager) VALUES (?, ?)',
      [name, manager]
    );
    const [rows] = await pool.execute('SELECT * FROM teams WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, manager } = req.body;
    const [existing] = await pool.execute('SELECT * FROM teams WHERE id = ?', [req.params.id]);
    const team = existing[0];
    if (!team) return res.status(404).json({ error: 'Équipe non trouvée' });
    await pool.execute(
      'UPDATE teams SET name = ?, manager = ? WHERE id = ?',
      [
        name ?? team.name,
        manager !== undefined ? (manager || null) : team.manager,
        req.params.id,
      ]
    );
    const [rows] = await pool.execute('SELECT * FROM teams WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const [used] = await pool.execute(
      'SELECT COUNT(*) as count FROM collaborators WHERE team_id = ?',
      [req.params.id]
    );
    if (Number(used[0].count) > 0) {
      return res.status(409).json({
        error: `Cette équipe contient ${used[0].count} collaborateur(s) et ne peut pas être supprimée`,
      });
    }
    const [result] = await pool.execute('DELETE FROM teams WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Équipe non trouvée' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
