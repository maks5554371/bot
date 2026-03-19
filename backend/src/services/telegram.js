const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const config = require('../config');

const TELEGRAM_API = `https://api.telegram.org/bot${config.botToken}`;
const UPLOADS_DIR = path.join(__dirname, '../../uploads');

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

/**
 * Преобразует URL медиа в локальный путь к файлу (если файл хранится на нашем сервере).
 * /api/uploads/quests/abc.jpg → /path/to/uploads/quests/abc.jpg
 * https://nayriz.shop/api/uploads/quests/abc.jpg → /path/to/uploads/quests/abc.jpg
 */
function resolveLocalPath(url) {
  if (!url) return null;
  const marker = '/api/uploads/';
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  const relative = url.substring(idx + marker.length);
  const filePath = path.join(UPLOADS_DIR, relative);
  return fs.existsSync(filePath) ? filePath : null;
}

async function sendMediaFile(chatId, method, fieldName, fileOrUrl, caption = '') {
  const localPath = resolveLocalPath(fileOrUrl);

  if (localPath) {
    // Отправляем файл напрямую с диска
    const form = new FormData();
    form.append('chat_id', String(chatId));
    form.append(fieldName, fs.createReadStream(localPath));
    if (caption) {
      form.append('caption', caption);
      form.append('parse_mode', 'HTML');
    }
    const res = await axios.post(`${TELEGRAM_API}/${method}`, form, {
      headers: form.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
    return res.data;
  }

  // Внешний URL — передаём как есть
  const res = await axios.post(`${TELEGRAM_API}/${method}`, {
    chat_id: chatId,
    [fieldName]: fileOrUrl,
    caption,
    parse_mode: 'HTML',
  });
  return res.data;
}

async function sendPhoto(chatId, photo, caption = '') {
  try {
    return await sendMediaFile(chatId, 'sendPhoto', 'photo', photo, caption);
  } catch (err) {
    console.error('Telegram sendPhoto error:', err.response?.data || err.message);
    throw err;
  }
}

async function sendVideo(chatId, video, caption = '') {
  try {
    return await sendMediaFile(chatId, 'sendVideo', 'video', video, caption);
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
