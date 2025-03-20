const express = require('express');
const db = require('../config/database');
const { verifyToken } = require('../middleware/authMiddleware');
const router = express.Router();

// Get all users
router.get('/', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM users_it');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user by id
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM users_it WHERE user_id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update user
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { username, email, department } = req.body;
    const result = await db.query(
      'UPDATE users_it SET username = ?, email = ?, department = ? WHERE user_id = ?',
      [username, email, department, req.params.id]
    );
    if (result[0].affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete user
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM users_it WHERE user_id = ?', [req.params.id]);
    if (result[0].affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;