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

/**
 * Отправить медиа участнику. Возвращает file_id из ответа Telegram (для переиспользования).
 */
async function sendClueToMember(chatId, clueText, media) {
  if (media && (media.url || media.file_id)) {
    const source = media.file_id || media.url;
    if (media.type === 'video') {
      if (clueText) await telegram.sendMessage(chatId, clueText);
      try {
        const result = await telegram.sendVideo(chatId, source);
        return result?.result?.video?.file_id || null;
      } catch (e) {
        console.error(`Failed to send video to ${chatId}:`, e.message);
      }
    } else {
      try {
        const result = await telegram.sendPhoto(chatId, source, clueText || '');
        // file_id из самого большого размера фото
        const sizes = result?.result?.photo;
        return sizes?.length ? sizes[sizes.length - 1].file_id : null;
      } catch (e) {
        console.error(`Failed to send photo to ${chatId}, falling back to text:`, e.message);
        if (clueText) await telegram.sendMessage(chatId, clueText);
      }
    }
  } else if (clueText) {
    await telegram.sendMessage(chatId, clueText);
  }
  return null;
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

  if (mediaList.length === 0) {
    // Без медиа — просто текст всем
    for (const member of team.members) {
      try {
        await telegram.sendMessage(member.telegram_id, clueText);
      } catch (e) {
        console.error(`Failed to send clue to ${member.telegram_id}:`, e.message);
      }
    }
    return;
  }

  // Кэш file_id для каждого медиа (индекс → file_id)
  const fileIdCache = {};

  for (let mi = 0; mi < team.members.length; mi++) {
    const member = team.members[mi];
    try {
      // Первое медиа — с текстом подсказки
      const firstMedia = fileIdCache[0]
        ? { file_id: fileIdCache[0], type: mediaList[0].type }
        : mediaList[0];
      const firstFileId = await sendClueToMember(member.telegram_id, clueText, firstMedia);
      if (firstFileId && !fileIdCache[0]) fileIdCache[0] = firstFileId;

      // Остальные медиа — без текста
      for (let i = 1; i < mediaList.length; i++) {
        const media = fileIdCache[i]
          ? { file_id: fileIdCache[i], type: mediaList[i].type }
          : mediaList[i];
        const fid = await sendClueToMember(member.telegram_id, '', media);
        if (fid && !fileIdCache[i]) fileIdCache[i] = fid;
      }
    } catch (e) {
      console.error(`Failed to send clue to ${member.telegram_id}:`, e.message);
    }
  }
}

module.exports = { getFullMediaUrl, getClueMedia, getAllClueMedia, sendClueToMember, buildClueText, sendStationToTeam };
