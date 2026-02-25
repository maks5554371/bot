from aiogram.types import (
    ReplyKeyboardMarkup,
    KeyboardButton,
    ReplyKeyboardRemove,
)


def main_keyboard() -> ReplyKeyboardMarkup:
    """Основная клавиатура после регистрации."""
    return ReplyKeyboardMarkup(
        keyboard=[
            [
                KeyboardButton(text="📸 Отправить фото"),
                KeyboardButton(text="📍 Поделиться геопозицией", request_location=True),
            ],
            [
                KeyboardButton(text="ℹ️ Мой статус"),
            ],
        ],
        resize_keyboard=True,
    )


def remove_keyboard() -> ReplyKeyboardRemove:
    return ReplyKeyboardRemove()
