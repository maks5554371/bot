from aiogram import Router, F
from aiogram.types import Message

from services.api import api_get

router = Router()


@router.message(F.text == "👤 Профиль")
async def show_profile(message: Message):
    """Показать профиль игрока."""
    result = await api_get('profile', {'telegram_id': message.from_user.id})

    if result.get('error'):
        await message.answer("❌ Не удалось загрузить профиль. Попробуй /start")
        return

    user = result
    team_name = user.get('team_id', {}).get('name', 'Без команды') if isinstance(user.get('team_id'), dict) else 'Без команды'
    stats = user.get('stats', {})
    inventory = user.get('inventory', [])

    # Формируем жизни визуально
    lives = user.get('lives', 0)
    lives_display = '❤️' * lives + '🖤' * max(0, 3 - lives)

    text = (
        f"👤 <b>Профиль</b>\n"
        f"━━━━━━━━━━━━━━━━━━\n"
        f"📛 <b>{user.get('first_name', 'Без имени')}</b>\n"
        f"🚗 Команда: <b>{team_name}</b>\n\n"
        f"❤️ Жизни: {lives_display} ({lives})\n\n"
        f"📊 <b>Статистика:</b>\n"
        f"  📸 Фото отправлено: {stats.get('photos_sent', 0)}\n"
        f"  💬 Сообщений: {stats.get('messages_sent', 0)}\n"
        f"  🎵 Песен: {stats.get('songs_added', 0)}\n"
    )

    await message.answer(text, parse_mode='HTML')


@router.message(F.text == "🏆 Топ игроков")
async def show_leaderboard(message: Message):
    """Показать таблицу лидеров."""
    result = await api_get('leaderboard')

    if isinstance(result, dict) and result.get('error'):
        await message.answer("❌ Не удалось загрузить топ.")
        return

    if not result or len(result) == 0:
        await message.answer("📊 Пока нет данных для рейтинга.")
        return

    text = "🏆 <b>Топ игроков</b>\n━━━━━━━━━━━━━━━━━━\n\n"

    medals = ['🥇', '🥈', '🥉']
    for i, user in enumerate(result[:10]):
        medal = medals[i] if i < 3 else f"{i + 1}."
        name = user.get('first_name') or user.get('telegram_username') or '???'
        lives = user.get('lives', 0)
        level = user.get('level', 1)
        lives_hearts = '❤️' * min(lives, 5)
        if lives > 5:
            lives_hearts += f"+{lives - 5}"

        # Highlight the current user
        is_me = ""
        text += f"{medal} <b>{name}</b> — {lives_hearts} | Ур. {level}\n"

    await message.answer(text, parse_mode='HTML')
