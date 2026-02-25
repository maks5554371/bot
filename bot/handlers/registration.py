from aiogram import Router, F
from aiogram.types import Message
from aiogram.filters import CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import StatesGroup, State

from services.api import api_post
from keyboards.main import main_keyboard

router = Router()


class Registration(StatesGroup):
    waiting_name = State()


@router.message(CommandStart())
async def cmd_start(message: Message, state: FSMContext):
    """Обработка команды /start — начало регистрации."""
    # Попробуем зарегистрировать сразу с данными из Telegram
    result = await api_post('register', {
        'telegram_id': message.from_user.id,
        'telegram_username': message.from_user.username or '',
        'first_name': message.from_user.first_name or '',
    })

    if result.get('created'):
        await message.answer(
            f"🎉 Добро пожаловать на квест, <b>{message.from_user.first_name}</b>!\n\n"
            "Ты зарегистрирован(а). Скоро тебя добавят в команду и квест начнётся!\n\n"
            "Пока можешь поделиться геопозицией, чтобы мы видели где ты.",
            parse_mode='HTML',
            reply_markup=main_keyboard(),
        )
    else:
        await message.answer(
            f"👋 С возвращением, <b>{message.from_user.first_name}</b>!\n\n"
            "Ты уже зарегистрирован(а). Жди подсказку от организатора!",
            parse_mode='HTML',
            reply_markup=main_keyboard(),
        )

    await state.clear()
