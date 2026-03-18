from aiogram import Router, F
from aiogram.types import Message, CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import StatesGroup, State

from services.api import api_get, api_post

router = Router()


class VotingState(StatesGroup):
    choosing_best = State()
    choosing_worst = State()


@router.message(F.text.in_(["🗳 Голосовать", "Голосовать"]))
async def start_voting(message: Message, state: FSMContext):
    """Начать процесс голосования."""
    # Проверяем, есть ли активное голосование
    result = await api_get('voting/active')
    voting = result.get('voting')

    if not voting:
        await message.answer("❌ Сейчас нет активного голосования.")
        return

    # Получаем кандидатов
    candidates = await api_get('voting/candidates', {'telegram_id': message.from_user.id})
    if not candidates or len(candidates) == 0:
        await message.answer("❌ Нет доступных кандидатов для голосования.")
        return

    # Сохраняем данные
    await state.update_data(
        voting_id=voting['_id'],
        candidates=candidates,
    )

    # Показываем кнопки для "Лучший игрок"
    keyboard = _build_candidates_keyboard(candidates, 'best')
    await message.answer(
        f"🗳 <b>{voting['title']}</b>\n\n"
        f"🏆 Выбери <b>лучшего</b> игрока:",
        parse_mode='HTML',
        reply_markup=keyboard,
    )
    await state.set_state(VotingState.choosing_best)


@router.callback_query(F.data.startswith("vote_best_"))
async def handle_vote_best(callback: CallbackQuery, state: FSMContext):
    """Обработка голоса за лучшего игрока."""
    candidate_id = callback.data.replace("vote_best_", "")

    result = await api_post('voting/vote', {
        'telegram_id': callback.from_user.id,
        'candidate_id': candidate_id,
        'category': 'best',
    })

    if result.get('error') == 'already_voted':
        await callback.answer("Ты уже голосовал за лучшего!", show_alert=True)
    elif result.get('error'):
        await callback.answer(f"Ошибка: {result.get('message', result['error'])}", show_alert=True)
    else:
        await callback.answer("✅ Голос за лучшего принят!")

    # Теперь голосуем за худшего
    data = await state.get_data()
    candidates = data.get('candidates', [])

    keyboard = _build_candidates_keyboard(candidates, 'worst')
    await callback.message.edit_text(
        "👎 Теперь выбери <b>худшего</b> игрока:",
        parse_mode='HTML',
        reply_markup=keyboard,
    )
    await state.set_state(VotingState.choosing_worst)


@router.callback_query(F.data.startswith("vote_worst_"))
async def handle_vote_worst(callback: CallbackQuery, state: FSMContext):
    """Обработка голоса за худшего игрока."""
    candidate_id = callback.data.replace("vote_worst_", "")

    result = await api_post('voting/vote', {
        'telegram_id': callback.from_user.id,
        'candidate_id': candidate_id,
        'category': 'worst',
    })

    if result.get('error') == 'already_voted':
        await callback.answer("Ты уже голосовал за худшего!", show_alert=True)
    elif result.get('error'):
        await callback.answer(f"Ошибка: {result.get('message', result['error'])}", show_alert=True)
    else:
        await callback.answer("✅ Голос за худшего принят!")

    await callback.message.edit_text(
        "🎉 Спасибо за участие в голосовании!\n"
        "Результаты будут объявлены после завершения.",
        parse_mode='HTML',
    )
    await state.clear()


@router.callback_query(F.data == "vote_skip")
async def handle_vote_skip(callback: CallbackQuery, state: FSMContext):
    """Пропустить текущую категорию."""
    current_state = await state.get_state()

    if current_state == VotingState.choosing_best.state:
        # Пропустили лучшего, переходим к худшему
        data = await state.get_data()
        candidates = data.get('candidates', [])
        keyboard = _build_candidates_keyboard(candidates, 'worst')
        await callback.message.edit_text(
            "👎 Выбери <b>худшего</b> игрока:",
            parse_mode='HTML',
            reply_markup=keyboard,
        )
        await state.set_state(VotingState.choosing_worst)
        await callback.answer("Пропущено")
    else:
        await callback.message.edit_text(
            "🎉 Спасибо за участие в голосовании!\n"
            "Результаты будут объявлены после завершения.",
            parse_mode='HTML',
        )
        await state.clear()
        await callback.answer("Пропущено")


def _build_candidates_keyboard(candidates: list, category: str) -> InlineKeyboardMarkup:
    """Построить inline-клавиатуру со списком кандидатов."""
    buttons = []
    for c in candidates:
        name = c.get('first_name') or c.get('telegram_username') or str(c.get('telegram_id', '?'))
        buttons.append([
            InlineKeyboardButton(
                text=name,
                callback_data=f"vote_{category}_{c['_id']}",
            )
        ])

    buttons.append([
        InlineKeyboardButton(text="⏭ Пропустить", callback_data="vote_skip")
    ])

    return InlineKeyboardMarkup(inline_keyboard=buttons)
