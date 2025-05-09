import logging
import sqlite3
import requests
import os
import base64
from aiogram import Bot, Dispatcher, types
from aiogram.types import ContentType
from aiogram.utils import executor
from datetime import datetime

TELEGRAM_TOKEN = os.getenv('TELEGRAM_TOKEN', 'СЮДА ВАШ ТОКЕН ТЕЛЕГРАММ БОТА')
GITHUB_TOKEN = os.getenv('GITHUB_TOKEN', 'СЮДА ВАШ ТОКЕН ОТ GITHUB')
GITHUB_REPO = os.getenv('GITHUB_REPO', 'rustem4uz/rustem4uz-music-site') #ссылка на репозиторий
AUDIO_FOLDER = 'audios/'

bot = Bot(token=TELEGRAM_TOKEN)
dp = Dispatcher(bot)
logging.basicConfig(level=logging.INFO)

DB_PATH = 'music_bot.db'
conn = sqlite3.connect(DB_PATH, check_same_thread=False)
cur = conn.cursor()
cur.execute("""
CREATE TABLE IF NOT EXISTS uploads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    telegram_id INTEGER NOT NULL,
    upload_date TEXT DEFAULT CURRENT_TIMESTAMP
)
""")
conn.commit()


def upload_to_github(file_path, filename):
    """
    Uploads a file to the specified GitHub repository using the GitHub API.
    """
    url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{AUDIO_FOLDER}{filename}"
    with open(file_path, "rb") as f:
        content_bytes = f.read()

    content_b64 = base64.b64encode(content_bytes).decode('utf-8')
    data = {
        "message": f"Add {filename}",
        "content": content_b64
    }
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json"
    }
    response = requests.put(url, json=data, headers=headers)
    response.raise_for_status()


@dp.message_handler(content_types=ContentType.AUDIO)
async def handle_audio(message: types.Message):
    audio = message.audio
    if not audio.file_name.lower().endswith('.mp3'):
        await message.reply("Пожалуйста, отправьте файл в формате MP3.") 
        return

    file_info = await bot.get_file(audio.file_id)
    file_path = file_info.file_path
    filename = audio.file_name
    local_path = os.path.join(os.getcwd(), filename)

    file_content = await bot.download_file(file_path)
    with open(local_path, 'wb') as f:
        f.write(file_content.getvalue())

    cur.execute(
        "INSERT INTO uploads (filename, telegram_id) VALUES (?, ?)",
        (filename, message.from_user.id)
    )
    conn.commit()

    try:
        upload_to_github(local_path, filename)
    except Exception as e:
        await message.reply(f"Ошибка при загрузке на GitHub: {e}")
        os.remove(local_path)
        return

    await message.reply("Файл успешно загружен и опубликован!")
    os.remove(local_path)


@dp.message_handler(commands=['start', 'help'])
async def send_welcome(message: types.Message):
    await message.reply(
        "Привет! Пришлите мне MP3-файл, и я добавлю его на музыкальный сайт." #Приветствие, можете поменять там на то что вам надо
    )


if __name__ == '__main__':
    executor.start_polling(dp, skip_updates=True)
