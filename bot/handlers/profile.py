from aiogram import Router, F
from aiogram.types import Message
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import StatesGroup, State

from services.api import api_get, api_post

router = Router()


class ProfileStates(StatesGroup):
    waiting_new_name = State()


@router.message(F.text.in_(["👤 Профиль", "Профиль"]))
async def show_profile(message: Message):
    """Показать профиль игрока."""
    result = await api_get('profile', {'telegram_id': message.from_user.id})

    if result.get('error'):
        await message.answer("❌ Не удалось загрузить профиль. Попробуй /start")
        return

    user = result
    team_name = user.get('team_id', {}).get('name', 'Без команды') if isinstance(user.get('team_id'), dict) else 'Без команды'
    stats = user.get('stats', {})

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


@router.message(Command("name"))
async def cmd_change_name(message: Message, state: FSMContext):
    """Команда /name — начать смену имени."""
    await message.answer(
        "✏️ Введи новое имя (как тебя будут видеть в игре):",
    )
    await state.set_state(ProfileStates.waiting_new_name)


@router.message(ProfileStates.waiting_new_name)
async def process_new_name(message: Message, state: FSMContext):
    """Обработка нового имени."""
    new_name = message.text.strip() if message.text else ''
    if not new_name or len(new_name) > 50:
        await message.answer("❌ Имя не может быть пустым или длиннее 50 символов. Попробуй ещё раз:")
        return

    result = await api_post('profile/name', {
        'telegram_id': message.from_user.id,
        'first_name': new_name,
    })

    if result.get('ok'):
        await message.answer(
            f"✅ Имя изменено на <b>{result['first_name']}</b>",
            parse_mode='HTML',
        )
    else:
        await message.answer("❌ Не удалось изменить имя. Попробуй /start сначала.")

    await state.clear()


@router.message(F.text.in_(["🏆 Топ игроков", "Топ игроков"]))
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
        text += f"{medal} <b>{name}</b> — {lives_hearts} | Ур. {level}\n"

    await message.answer(text, parse_mode='HTML')
