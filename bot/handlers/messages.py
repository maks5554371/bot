import re

from aiogram import Router, F
from aiogram.types import Message

from services.api import api_post

router = Router()

# Тексты кнопок без эмодзи — чтобы не пересылать организатору при вводе текстом
BUTTON_TEXTS = {
    "отправить фото", "поделиться геопозицией",
    "добавить песню", "мои песни",
    "профиль", "топ игроков",
    "голосовать", "мой статус",
}

_EMOJI_RE = re.compile(
    r'[\U0001F000-\U0001FFFF\u2600-\u27BF\uFE0F\u200D\u20E3\u2702-\u27B0\u24C2'
    r'\U0001F1E0-\U0001F1FF\U0001F900-\U0001F9FF\U0001FA00-\U0001FA6F\U0001FA70-\U0001FAFF'
    r'\u2139\u2194-\u21AA\u231A-\u231B\u23E9-\u23F3\u23F8-\u23FA\u25AA-\u25FE'
    r'\u2600-\u26FF\u2700-\u27BF\u2934-\u2935\u2B05-\u2B07\u2B1B-\u2B1C\u2B50\u2B55'
    r'\u3030\u303D\u3297\u3299\uFE0F\u200D]+',
    flags=re.UNICODE,
)


def _strip_emoji(text: str) -> str:
    return _EMOJI_RE.sub('', text).strip()


def _is_button_text(text: str) -> bool:
    """Проверяет, является ли текст названием кнопки (с или без эмодзи)."""
    stripped = _strip_emoji(text).lower()
    return stripped in BUTTON_TEXTS


@router.message(F.text & ~F.text.startswith('/'))
async def handle_text_message(message: Message):
    """Обработка текстовых сообщений от участника."""
    text = message.text

    # Обработка кнопки «Отправить фото»
    if text == "📸 Отправить фото" or _strip_emoji(text).lower() == "отправить фото":
        await message.answer(
            "📸 Просто отправь фото в этот чат и я передам его организатору!",
        )
        return

    # Обработка кнопки «Мой статус»
    if text == "ℹ️ Мой статус" or _strip_emoji(text).lower() == "мой статус":
        await message.answer(
            "📊 Твой статус: <i>ожидай подсказку от организатора</i>\n\n"
            "Если тебя уже добавили в команду — скоро придёт первая подсказка!",
            parse_mode='HTML',
        )
        return

    # Не пересылать организатору если это текст кнопки без иконки
    if _is_button_text(text):
        return

    # Пересылка текстового сообщения организатору
    result = await api_post('message', {
        'telegram_id': message.from_user.id,
        'text': text,
    })

    if 'error' not in result:
        await message.answer("📨 Сообщение передано организатору!")
    else:
        await message.answer("❌ Не удалось отправить сообщение. Попробуй позже.")
