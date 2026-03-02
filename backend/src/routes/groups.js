const express = require('express');
const { pool } = require('../db/database');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM `groups` ORDER BY sort_order, name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, sort_order = 0 } = req.body;
    if (!name) return res.status(400).json({ error: 'name est requis' });
    const [result] = await pool.execute(
      'INSERT INTO `groups` (name, sort_order) VALUES (?, ?)',
      [name, sort_order]
    );
    const [rows] = await pool.execute('SELECT * FROM `groups` WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, sort_order } = req.body;
    const [existing] = await pool.execute('SELECT * FROM `groups` WHERE id = ?', [req.params.id]);
    const group = existing[0];
    if (!group) return res.status(404).json({ error: 'Groupe non trouvé' });
    await pool.execute(
      'UPDATE `groups` SET name = ?, sort_order = ? WHERE id = ?',
      [name ?? group.name, sort_order ?? group.sort_order, req.params.id]
    );
    const [rows] = await pool.execute('SELECT * FROM `groups` WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.execute('DELETE FROM `groups` WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Groupe non trouvé' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
