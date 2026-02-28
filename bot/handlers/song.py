from aiogram import Router, F
from aiogram.types import Message
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import StatesGroup, State

from services.api import api_post, api_get

router = Router()

MAX_SONGS = 10


class SongStates(StatesGroup):
    waiting_song = State()


@router.message(F.text == "🎵 Добавить песню")
async def song_button_handler(message: Message, state: FSMContext):
    """Обработка нажатия кнопки 'Добавить песню'."""
    # Check current song count
    result = await api_get('songs', {'telegram_id': message.from_user.id})
    if 'error' in result:
        await message.answer("❌ Сначала зарегистрируйся командой /start")
        return

    remaining = result.get('remaining', MAX_SONGS)
    count = result.get('count', 0)

    if remaining <= 0:
        await message.answer(
            f"🚫 Ты уже добавил(а) максимум песен ({count}/{result.get('max', MAX_SONGS)}).\n"
            "Больше добавить нельзя.",
        )
        return

    await state.set_state(SongStates.waiting_song)
    await message.answer(
        f"🎵 Отправь название песни (и исполнителя), и я найду её на Spotify!\n\n"
        f"📊 Добавлено: {count}/{result.get('max', MAX_SONGS)}\n"
        f"Осталось: {remaining}\n\n"
        f"Например: <i>Imagine Dragons - Believer</i>\n\n"
        "Для отмены отправь /cancel",
        parse_mode='HTML',
    )


@router.message(SongStates.waiting_song, F.text == "/cancel")
async def cancel_song(message: Message, state: FSMContext):
    """Отмена добавления песни."""
    await state.clear()
    await message.answer("❌ Добавление песни отменено.")


@router.message(SongStates.waiting_song, F.text)
async def process_song_text(message: Message, state: FSMContext):
    """Обработка текстового запроса песни."""
    song_query = message.text.strip()

    if song_query.startswith('/'):
        return  # Ignore commands

    await state.clear()

    wait_msg = await message.answer("🔍 Ищу на Spotify...")

    result = await api_post('song', {
        'telegram_id': message.from_user.id,
        'query': song_query,
    })

    if 'error' in result:
        error = result['error']
        if error == 'not_found':
            await wait_msg.edit_text(
                "😕 Не нашёл такую песню на Spotify.\n"
                "Попробуй написать точнее — например, добавь имя исполнителя.\n\n"
                "Нажми 🎵 <b>Добавить песню</b> чтобы попробовать снова.",
                parse_mode='HTML',
            )
        elif error == 'limit':
            await wait_msg.edit_text(
                f"🚫 {result.get('message', 'Лимит песен достигнут')}",
            )
        elif error == 'duplicate':
            await wait_msg.edit_text(
                "⚠️ Эта песня уже есть в твоём списке!",
            )
        else:
            await wait_msg.edit_text(
                f"❌ Ошибка: {result.get('message', result.get('error', 'Неизвестная ошибка'))}",
            )
        return

    song = result.get('song', {})
    remaining = result.get('remaining', 0)
    name = song.get('name', 'Неизвестно')
    artist = song.get('artist', '')
    external_url = song.get('external_url', '')

    text = (
        f"✅ Песня добавлена в плейлист!\n\n"
        f"🎵 <b>{name}</b>\n"
        f"🎤 {artist}\n"
    )
    if external_url:
        text += f"🔗 <a href=\"{external_url}\">Открыть в Spotify</a>\n"
    text += f"\n📊 Осталось: {remaining} песен(ь)"

    await wait_msg.edit_text(text, parse_mode='HTML', disable_web_page_preview=True)


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
    await state.clear()

    wait_msg = await message.answer(f"🔍 Ищу на Spotify: <i>{song_query}</i>...", parse_mode='HTML')

    result = await api_post('song', {
        'telegram_id': message.from_user.id,
        'query': song_query,
    })

    if 'error' in result:
        error = result['error']
        if error == 'not_found':
            await wait_msg.edit_text(
                f"😕 Не нашёл «{song_query}» на Spotify.\n"
                "Попробуй написать название вручную.\n\n"
                "Нажми 🎵 <b>Добавить песню</b> чтобы попробовать снова.",
                parse_mode='HTML',
            )
        elif error == 'limit':
            await wait_msg.edit_text(f"🚫 {result.get('message', 'Лимит песен достигнут')}")
        elif error == 'duplicate':
            await wait_msg.edit_text("⚠️ Эта песня уже есть в твоём списке!")
        else:
            await wait_msg.edit_text(
                f"❌ Ошибка: {result.get('message', result.get('error', 'Неизвестная ошибка'))}",
            )
        return

    song = result.get('song', {})
    remaining = result.get('remaining', 0)
    name = song.get('name', 'Неизвестно')
    artist = song.get('artist', '')
    external_url = song.get('external_url', '')

    text = (
        f"✅ Песня добавлена в плейлист!\n\n"
        f"🎵 <b>{name}</b>\n"
        f"🎤 {artist}\n"
    )
    if external_url:
        text += f"🔗 <a href=\"{external_url}\">Открыть в Spotify</a>\n"
    text += f"\n📊 Осталось: {remaining} песен(ь)"

    await wait_msg.edit_text(text, parse_mode='HTML', disable_web_page_preview=True)


@router.message(F.text == "📋 Мои песни")
async def my_songs_handler(message: Message):
    """Показать список добавленных песен."""
    result = await api_get('songs', {'telegram_id': message.from_user.id})

    if 'error' in result:
        await message.answer("❌ Сначала зарегистрируйся командой /start")
        return

    songs = result.get('songs', [])
    count = result.get('count', 0)
    max_songs = result.get('max', MAX_SONGS)

    if count == 0:
        await message.answer(
            "🎵 У тебя пока нет добавленных песен.\n"
            "Нажми <b>🎵 Добавить песню</b> чтобы добавить!",
            parse_mode='HTML',
        )
        return

    text = f"🎵 <b>Твои песни ({count}/{max_songs}):</b>\n\n"
    for i, song in enumerate(songs, 1):
        name = song.get('name', '?')
        artist = song.get('artist', '?')
        url = song.get('external_url', '')
        if url:
            text += f"{i}. <a href=\"{url}\">{name}</a> — {artist}\n"
        else:
            text += f"{i}. {name} — {artist}\n"

    remaining = max_songs - count
    if remaining > 0:
        text += f"\n📊 Можно добавить ещё: {remaining}"
    else:
        text += "\n🚫 Лимит достигнут"

    await message.answer(text, parse_mode='HTML', disable_web_page_preview=True)
