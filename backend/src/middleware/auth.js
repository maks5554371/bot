const jwt = require('jsonwebtoken');
const config = require('../config');

function authMiddleware(req, res, next) {
  const token =
    req.cookies?.token ||
    (req.headers.authorization && req.headers.authorization.split(' ')[1]);

  if (!token) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Невалидный или истёкший токен' });
  }
}

module.exports = authMiddleware;
