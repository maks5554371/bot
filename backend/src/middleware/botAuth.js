const config = require('../config');

function botAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== config.apiSecretKey) {
    return res.status(403).json({ error: 'Невалидный API ключ' });
  }
  next();
}

module.exports = botAuth;
