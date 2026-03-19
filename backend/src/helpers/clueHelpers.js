const telegram = require('../services/telegram');
const config = require('../config');

function getFullMediaUrl(relativeUrl) {
  if (!relativeUrl) return null;
  if (relativeUrl.startsWith('http')) return relativeUrl;
  const baseUrl = process.env.PUBLIC_URL || process.env.BACKEND_URL || `http://localhost:${config.port}`;
  return `${baseUrl}${relativeUrl}`;
}

function getClueMedia(clue) {
  if (clue.media?.url) {
    return { url: getFullMediaUrl(clue.media.url), type: clue.media.type || 'image' };
  }
  if (clue.media_url) {
    const ext = clue.media_url.split('.').pop().toLowerCase();
    const videoExts = ['mp4', 'mov', 'avi', 'webm'];
    const type = videoExts.includes(ext) ? 'video' : 'image';
    return { url: getFullMediaUrl(clue.media_url), type };
  }
  return null;
}

/**
 * Получить все медиа-файлы из подсказки (новый массив + legacy fallback).
 */
function getAllClueMedia(clue) {
  if (clue.media_files && clue.media_files.length > 0) {
    return clue.media_files.map((m) => ({
      url: getFullMediaUrl(m.url),
      type: m.type || 'image',
    }));
  }
  const single = getClueMedia(clue);
  return single ? [single] : [];
}

async function sendClueToMember(chatId, clueText, media) {
  if (media && media.url) {
    if (media.type === 'video') {
      if (clueText) await telegram.sendMessage(chatId, clueText);
      try {
        await telegram.sendVideo(chatId, media.url);
      } catch (e) {
        console.error(`Failed to send video to ${chatId}:`, e.message);
      }
    } else {
      try {
        await telegram.sendPhoto(chatId, media.url, clueText || '');
      } catch (e) {
        console.error(`Failed to send photo to ${chatId}, falling back to text:`, e.message);
        if (clueText) await telegram.sendMessage(chatId, clueText);
      }
    }
  } else if (clueText) {
    await telegram.sendMessage(chatId, clueText);
  }
}

function buildClueText(clue, index, total, prefix = '') {
  let text = `${prefix}<b>Станция ${index + 1}/${total}</b>\n\n`;
  text += `🔍 <b>Подсказка:</b>\n${clue.text}`;
  if (clue.task_text) {
    text += `\n\n📋 <b>Задание:</b>\n${clue.task_text}`;
  }
  if (clue.answers && clue.answers.length > 0) {
    text += `\n\n💡 <i>Разгадай подсказку и отправь ответ текстом!</i>`;
  }
  return text;
}

async function sendStationToTeam(team, clue, index, total, prefix = '') {
  const clueText = buildClueText(clue, index, total, prefix);
  const mediaList = getAllClueMedia(clue);

  for (const member of team.members) {
    try {
      if (mediaList.length === 0) {
        await telegram.sendMessage(member.telegram_id, clueText);
      } else {
        // Первое медиа отправляем с текстом подсказки
        await sendClueToMember(member.telegram_id, clueText, mediaList[0]);
        // Остальные медиа — без текста
        for (let i = 1; i < mediaList.length; i++) {
          await sendClueToMember(member.telegram_id, '', mediaList[i]);
        }
      }
    } catch (e) {
      console.error(`Failed to send clue to ${member.telegram_id}:`, e.message);
    }
  }
}

module.exports = { getFullMediaUrl, getClueMedia, getAllClueMedia, sendClueToMember, buildClueText, sendStationToTeam };
