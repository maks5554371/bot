from aiogram import Router, F
from aiogram.types import Message, CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import StatesGroup, State

from services.api import api_post, api_get
from keyboards.main import main_keyboard

router = Router()


class SongStates(StatesGroup):
    waiting_song = State()
    waiting_confirmation = State()


def _song_input_text():
    return (
        "🎵 Отправь название песни (и исполнителя), и я найду её на Spotify!\n\n"
        "Например: <i>Imagine Dragons - Believer</i>\n\n"
        "Для выхода нажми кнопку ниже."
    )


def _back_kb():
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🔙 Назад в меню", callback_data="song_back")],
    ])


def _confirm_kb():
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="✅ Да, добавить", callback_data="song_confirm")],
        [InlineKeyboardButton(text="🔍 Искать другую", callback_data="song_retry")],
        [InlineKeyboardButton(text="🔙 Назад в меню", callback_data="song_back")],
    ])


def _after_add_kb():
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🎵 Добавить ещё", callback_data="song_another")],
        [InlineKeyboardButton(text="🔙 Назад в меню", callback_data="song_back")],
    ])


@router.message(F.text.in_(["🎵 Добавить песню", "Добавить песню"]))
async def song_button_handler(message: Message, state: FSMContext):
    """Обработка нажатия кнопки 'Добавить песню'."""
    await state.set_state(SongStates.waiting_song)
    await message.answer(_song_input_text(), parse_mode='HTML', reply_markup=_back_kb())


@router.message(SongStates.waiting_song, F.text == "/cancel")
async def cancel_song(message: Message, state: FSMContext):
    """Отмена добавления песни."""
    await state.clear()
    await message.answer("❌ Добавление песни отменено.", reply_markup=main_keyboard())


@router.message(SongStates.waiting_song, F.text)
async def process_song_text(message: Message, state: FSMContext):
    """Обработка текстового запроса песни — только поиск."""
    song_query = message.text.strip()

    if song_query.startswith('/'):
        return

    wait_msg = await message.answer("🔍 Ищу на Spotify...")

    result = await api_post('song/search', {
        'telegram_id': message.from_user.id,
        'query': song_query,
    })

    if 'error' in result:
        error = result['error']
        if error == 'not_found':
            await wait_msg.edit_text(
                "😕 Не нашёл такую песню на Spotify.\n"
                "Попробуй написать точнее — например, добавь имя исполнителя.",
                reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                    [InlineKeyboardButton(text="🔍 Попробовать снова", callback_data="song_retry")],
                    [InlineKeyboardButton(text="🔙 Назад в меню", callback_data="song_back")],
                ]),
            )
            await state.set_state(SongStates.waiting_confirmation)
        else:
            await wait_msg.edit_text(
                f"❌ Ошибка: {result.get('message', result.get('error', 'Неизвестная ошибка'))}",
                reply_markup=_back_kb(),
            )
            await state.set_state(SongStates.waiting_confirmation)
        return

    track = result.get('track', {})
    name = track.get('name', 'Неизвестно')
    artist = track.get('artist', '')
    external_url = track.get('external_url', '')

    # Store track data in FSM for confirmation
    await state.update_data(track=track)
    await state.set_state(SongStates.waiting_confirmation)

    text = (
        f"🔍 Нашёл:\n\n"
        f"🎵 <b>{name}</b>\n"
        f"🎤 {artist}\n"
    )
    if external_url:
        text += f"🔗 <a href=\"{external_url}\">Открыть в Spotify</a>\n"
    text += "\nЭто та песня?"

    await wait_msg.edit_text(text, parse_mode='HTML', disable_web_page_preview=True, reply_markup=_confirm_kb())


@router.message(SongStates.waiting_song, F.audio)
async def process_song_audio(message: Message, state: FSMContext):
    """Обработка аудиофайла — ищем по метаданным."""
    audio = message.audio
    parts = []
    if audio.performer:
        parts.append(audio.performer)
    if audio.title:
        parts.append(audio.title)

    if not parts:
        await message.answer(
            "⚠️ Не удалось определить название трека из файла.\n"
            "Попробуй отправить название текстом: <i>Исполнитель - Название</i>",
            parse_mode='HTML',
        )
        return

    song_query = ' - '.join(parts)

    wait_msg = await message.answer(f"🔍 Ищу на Spotify: <i>{song_query}</i>...", parse_mode='HTML')

    result = await api_post('song/search', {
        'telegram_id': message.from_user.id,
        'query': song_query,
    })

    if 'error' in result:
        error = result['error']
        if error == 'not_found':
            await wait_msg.edit_text(
                f"😕 Не нашёл «{song_query}» на Spotify.\n"
                "Попробуй написать название вручную.",
                reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                    [InlineKeyboardButton(text="🔍 Попробовать снова", callback_data="song_retry")],
                    [InlineKeyboardButton(text="🔙 Назад в меню", callback_data="song_back")],
                ]),
            )
            await state.set_state(SongStates.waiting_confirmation)
        else:
            await wait_msg.edit_text(
                f"❌ Ошибка: {result.get('message', result.get('error', 'Неизвестная ошибка'))}",
                reply_markup=_back_kb(),
            )
            await state.set_state(SongStates.waiting_confirmation)
        return

    track = result.get('track', {})
    name = track.get('name', 'Неизвестно')
    artist = track.get('artist', '')
    external_url = track.get('external_url', '')

    await state.update_data(track=track)
    await state.set_state(SongStates.waiting_confirmation)

    text = (
        f"🔍 Нашёл:\n\n"
        f"🎵 <b>{name}</b>\n"
        f"🎤 {artist}\n"
    )
    if external_url:
        text += f"🔗 <a href=\"{external_url}\">Открыть в Spotify</a>\n"
    text += "\nЭто та песня?"

    await wait_msg.edit_text(text, parse_mode='HTML', disable_web_page_preview=True, reply_markup=_confirm_kb())


# ---- Callback handlers ----

@router.callback_query(F.data == "song_confirm")
async def confirm_song(callback: CallbackQuery, state: FSMContext):
    """Подтверждение — добавить найденную песню."""
    data = await state.get_data()
    track = data.get('track')

    if not track:
        await callback.answer("❌ Песня не найдена, попробуй заново", show_alert=True)
        await state.clear()
        return

    await callback.answer()
    await callback.message.edit_text("⏳ Добавляю в плейлист...")

    result = await api_post('song', {
        'telegram_id': callback.from_user.id,
        'track': track,
    })

    if 'error' in result:
        error = result['error']
        if error == 'duplicate':
            await callback.message.edit_text(
                "⚠️ Эта песня уже есть в твоём списке!",
                reply_markup=_after_add_kb(),
            )
        else:
            await callback.message.edit_text(
                f"❌ Ошибка: {result.get('message', result.get('error', 'Неизвестная ошибка'))}",
                reply_markup=_after_add_kb(),
            )
        await state.set_state(SongStates.waiting_confirmation)
        return

    song = result.get('song', {})
    name = song.get('name', track.get('name', 'Неизвестно'))
    artist = song.get('artist', track.get('artist', ''))
    external_url = song.get('external_url', track.get('external_url', ''))

    text = (
        f"✅ Песня добавлена в плейлист!\n\n"
        f"🎵 <b>{name}</b>\n"
        f"🎤 {artist}\n"
    )
    if external_url:
        text += f"🔗 <a href=\"{external_url}\">Открыть в Spotify</a>\n"

    await callback.message.edit_text(
        text, parse_mode='HTML', disable_web_page_preview=True,
        reply_markup=_after_add_kb(),
    )
    await state.set_state(SongStates.waiting_confirmation)


@router.callback_query(F.data == "song_retry")
async def retry_song(callback: CallbackQuery, state: FSMContext):
    """Искать другую песню."""
    await callback.answer()
    await state.set_state(SongStates.waiting_song)
    await callback.message.edit_text(_song_input_text(), parse_mode='HTML', reply_markup=_back_kb())


@router.callback_query(F.data == "song_another")
async def another_song(callback: CallbackQuery, state: FSMContext):
    """Добавить ещё одну песню."""
    await callback.answer()
    await state.set_state(SongStates.waiting_song)
    await callback.message.edit_text(_song_input_text(), parse_mode='HTML', reply_markup=_back_kb())


@router.callback_query(F.data == "song_back")
async def back_to_menu(callback: CallbackQuery, state: FSMContext):
    """Вернуться в главное меню."""
    await callback.answer()
    await state.clear()
    await callback.message.edit_text("🔙 Возвращаюсь в меню.")
    await callback.message.answer("Главное меню:", reply_markup=main_keyboard())


@router.message(F.text.in_(["📋 Мои песни", "Мои песни"]))
async def my_songs_handler(message: Message):
    """Показать список добавленных песен."""
    result = await api_get('songs', {'telegram_id': message.from_user.id})

    if 'error' in result:
        await message.answer("❌ Сначала зарегистрируйся командой /start")
        return

    songs = result.get('songs', [])
    count = result.get('count', 0)

    if count == 0:
        await message.answer(
            "🎵 У тебя пока нет добавленных песен.\n"
            "Нажми <b>🎵 Добавить песню</b> чтобы добавить!",
            parse_mode='HTML',
        )
        return

    text = f"🎵 <b>Твои песни ({count}):</b>\n\n"
    for i, song in enumerate(songs, 1):
        name = song.get('name', '?')
        artist = song.get('artist', '?')
        url = song.get('external_url', '')
        if url:
            text += f"{i}. <a href=\"{url}\">{name}</a> — {artist}\n"
        else:
            text += f"{i}. {name} — {artist}\n"

    await message.answer(text, parse_mode='HTML', disable_web_page_preview=True)
