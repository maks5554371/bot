from aiogram import Router, F
from aiogram.types import Message

from services.api import api_post

router = Router()


@router.message(F.location)
async def handle_location(message: Message):
    """Обработка геопозиции (обычной и live)."""
    lat = message.location.latitude
    lng = message.location.longitude

    result = await api_post('location', {
        'telegram_id': message.from_user.id,
        'lat': lat,
        'lng': lng,
    })

    # Не спамим ответом при каждом live-location update
    # Только при первом сообщении (не edited_message)
    if not hasattr(message, '_edited') and result.get('ok'):
        await message.answer(
            "📍 Геопозиция получена! Если ты включил(а) трансляцию — мы будем видеть тебя на карте в реальном времени.",
        )


@router.edited_message(F.location)
async def handle_live_location_update(message: Message):
    """Обработка обновлений live location (edited_message)."""
    lat = message.location.latitude
    lng = message.location.longitude

    await api_post('location', {
        'telegram_id': message.from_user.id,
        'lat': lat,
        'lng': lng,
    })
    # Молча обновляем, не шлём ответ
