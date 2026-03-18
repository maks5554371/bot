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

async function sendVideo(chatId, video, caption = '') {
  try {
    const res = await axios.post(`${TELEGRAM_API}/sendVideo`, {
      chat_id: chatId,
      video,
      caption,
      parse_mode: 'HTML',
    });
    return res.data;
  } catch (err) {
    console.error('Telegram sendVideo error:', err.response?.data || err.message);
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

async function sendVotingNotification(chatId, voting) {
  const text =
    `🗳 <b>Голосование началось!</b>\n\n` +
    `<b>${voting.title}</b>\n\n` +
    `Голосуй за лучшего и худшего игрока!\n` +
    `Нажми кнопку «🗳 Голосовать» в меню.`;
  try {
    return await sendMessage(chatId, text);
  } catch (e) {
    // Ignore blocked users
  }
}

async function sendVotingResults(chatId, voting, results) {
  let text = `📊 <b>Результаты голосования</b>\n<i>${voting.title}</i>\n\n`;

  text += `🏆 <b>Лучший игрок:</b>\n`;
  if (results.best.length > 0) {
    results.best.slice(0, 3).forEach((r, i) => {
      const medal = ['🥇', '🥈', '🥉'][i] || '▫️';
      text += `${medal} ${r.first_name || r.telegram_username} — ${r.count} гол.\n`;
    });
  } else {
    text += `Нет голосов\n`;
  }

  text += `\n👎 <b>Худший игрок:</b>\n`;
  if (results.worst.length > 0) {
    results.worst.slice(0, 3).forEach((r, i) => {
      const medal = ['🥇', '🥈', '🥉'][i] || '▫️';
      text += `${medal} ${r.first_name || r.telegram_username} — ${r.count} гол.\n`;
    });
  } else {
    text += `Нет голосов\n`;
  }

  try {
    return await sendMessage(chatId, text);
  } catch (e) {
    // Ignore blocked users
  }
}

module.exports = { sendMessage, sendPhoto, sendVideo, sendLocation, getFileUrl, sendVotingNotification, sendVotingResults };
