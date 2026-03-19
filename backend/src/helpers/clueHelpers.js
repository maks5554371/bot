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

async function sendClueToMember(chatId, clueText, media) {
  if (media && media.url) {
    if (media.type === 'video') {
      await telegram.sendMessage(chatId, clueText);
      try {
        await telegram.sendVideo(chatId, media.url);
      } catch (e) {
        console.error(`Failed to send video to ${chatId}:`, e.message);
      }
    } else {
      try {
        await telegram.sendPhoto(chatId, media.url, clueText);
      } catch (e) {
        console.error(`Failed to send photo to ${chatId}, falling back to text:`, e.message);
        await telegram.sendMessage(chatId, clueText);
      }
    }
  } else {
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
  const media = getClueMedia(clue);

  for (const member of team.members) {
    try {
      await sendClueToMember(member.telegram_id, clueText, media);
    } catch (e) {
      console.error(`Failed to send clue to ${member.telegram_id}:`, e.message);
    }
  }
}

module.exports = { getFullMediaUrl, getClueMedia, sendClueToMember, buildClueText, sendStationToTeam };
