const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { Admin } = require('../models');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Логин и пароль обязательны' });
    }

    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    const token = jwt.sign(
      { id: admin._id, username: admin.username, role: admin.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 3600000, // 1h
    });

    res.json({ token, admin: { id: admin._id, username: admin.username, role: admin.role } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id).select('-password_hash');
    if (!admin) return res.status(404).json({ error: 'Админ не найден' });
    res.json(admin);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Выход выполнен' });
});

module.exports = router;
