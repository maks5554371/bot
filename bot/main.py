import asyncio
import logging

from aiogram import Bot, Dispatcher
from aiogram.enums import ParseMode
from aiogram.client.default import DefaultBotProperties

from config import BOT_TOKEN
from handlers import registration, photo, location, messages

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger(__name__)


async def main():
    if not BOT_TOKEN:
        logger.error("BOT_TOKEN не задан! Укажи его в .env файле.")
        return

    bot = Bot(
        token=BOT_TOKEN,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )
    dp = Dispatcher()

    # Регистрация роутеров (порядок важен!)
    dp.include_router(registration.router)
    dp.include_router(photo.router)
    dp.include_router(location.router)
    dp.include_router(messages.router)  # текст — в конце, как fallback

    logger.info("🤖 Бот запущен (polling mode)")

    try:
        await dp.start_polling(bot, allowed_updates=[
            'message',
            'edited_message',
            'callback_query',
        ])
    finally:
        await bot.session.close()


if __name__ == '__main__':
    asyncio.run(main())
