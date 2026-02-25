from aiogram import Router, F
from aiogram.types import Message

from services.api import api_post

router = Router()


@router.message(F.photo)
async def handle_photo(message: Message):
    """Обработка фото-отчёта от участника."""
    # Берём самое большое фото (последнее в массиве)
    file_id = message.photo[-1].file_id

    result = await api_post('photo', {
        'telegram_id': message.from_user.id,
        'file_id': file_id,
    })

    if 'error' in result:
        error_msg = result['error']
        if 'не в команде' in error_msg.lower():
            await message.answer(
                "⚠️ Ты ещё не в команде. Дождись, пока организатор добавит тебя.",
            )
        else:
            await message.answer(f"❌ Ошибка: {error_msg}")
    else:
        await message.answer(
            "✅ Фото принято! Ожидай подтверждения от организатора.",
        )
