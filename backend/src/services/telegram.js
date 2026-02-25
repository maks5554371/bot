const axios = require('axios');
const config = require('../config');

const TELEGRAM_API = `https://api.telegram.org/bot${config.botToken}`;

async function sendMessage(chatId, text, options = {}) {
  try {
    const res = await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      ...options,
    });
    return res.data;
  } catch (err) {
    console.error('Telegram sendMessage error:', err.response?.data || err.message);
    throw err;
  }
}

async function sendPhoto(chatId, photo, caption = '') {
  try {
    const res = await axios.post(`${TELEGRAM_API}/sendPhoto`, {
      chat_id: chatId,
      photo,
      caption,
      parse_mode: 'HTML',
    });
    return res.data;
  } catch (err) {
    console.error('Telegram sendPhoto error:', err.response?.data || err.message);
    throw err;
  }
}

async function sendLocation(chatId, latitude, longitude) {
  try {
    const res = await axios.post(`${TELEGRAM_API}/sendLocation`, {
      chat_id: chatId,
      latitude,
      longitude,
    });
    return res.data;
  } catch (err) {
    console.error('Telegram sendLocation error:', err.response?.data || err.message);
    throw err;
  }
}

async function getFileUrl(fileId) {
  try {
    const res = await axios.get(`${TELEGRAM_API}/getFile`, {
      params: { file_id: fileId },
    });
    const filePath = res.data.result.file_path;
    return `https://api.telegram.org/file/bot${config.botToken}/${filePath}`;
  } catch (err) {
    console.error('Telegram getFile error:', err.response?.data || err.message);
    throw err;
  }
}

module.exports = { sendMessage, sendPhoto, sendLocation, getFileUrl };
