import telebot
import random
import time
import sqlite3
from telebot import types
from datetime import datetime

# === КОНФИГУРАЦИЯ ===
TOKEN = '8247775945:AAFTfqjUcrrNvBrkO894Tn5Ca9ZVCjY4Jew'
ADMIN_ID = 856199923
CHANNEL_URL = "https://t.me/fresso1"
CHANNEL_ID = "@fresso1"
CHAT_URL = "https://t.me/+Wi9P1hZNp_E1MjZi"
REVIEWS_CHANNEL_LINK = "https://t.me/fressoreviews"
REVIEWS_CHANNEL_ID = "@fressoreviews"
MY_NICK = "@Fr1sso"
BOT_LINK = "https://t.me/Fresso_BeatShop_bot"

bot = telebot.TeleBot(TOKEN)
waiting_for_review = {}

# === БАЗА ДАННЫХ ===
def init_db():
    conn = sqlite3.connect('fresso_final.db', check_same_thread=False)
    conn.execute("PRAGMA journal_mode=WAL")
    cursor = conn.cursor()
    cursor.execute('''CREATE TABLE IF NOT EXISTS users
                      (id INTEGER PRIMARY KEY, username TEXT, name TEXT, join_date TEXT)''')
    cursor.execute('''CREATE TABLE IF NOT EXISTS reviews
                      (user_id INTEGER PRIMARY KEY, rating INTEGER, text TEXT)''')
    conn.commit()
    conn.close()

def add_user(u_id, u_name, f_name):
    conn = sqlite3.connect('fresso_final.db', check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute("INSERT OR IGNORE INTO users VALUES (?, ?, ?, ?)",
                   (u_id, u_name, f_name, datetime.now().strftime("%Y-%m-%d")))
    conn.commit()
    conn.close()

def get_stats():
    conn = sqlite3.connect('fresso_final.db', check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM users")
    u_count = cursor.fetchone()[0]
    cursor.execute("SELECT AVG(rating), COUNT(*) FROM reviews")
    row = cursor.fetchone()
    conn.close()
    return u_count, round(row[0] or 0, 1), row[1] or 0

def get_all_users_ids():
    conn = sqlite3.connect('fresso_final.db', check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users")
    users = [row[0] for row in cursor.fetchall()]
    conn.close()
    return users

def save_review_db(u_id, rating, text="Без текста"):
    conn = sqlite3.connect('fresso_final.db', check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute("INSERT OR REPLACE INTO reviews (user_id, rating, text) VALUES (?, ?, ?)", (u_id, rating, text))
    conn.commit()
    conn.close()

init_db()

# === СТИКЕРЫ (Все 29) ===
STICKERS = [
    'CAACAgIAAxkBAAEP1pJpIerEd64-g_9vwn6VsciATmI0CAACOG8AAu_xSUjXn24RmomZETYE', 'CAACAgIAAxkBAAEP1pRpIerKHjw3XfM03k8i05SMqDeQzQACu2oAAiHyQUjV4zgUg5n5rTYE',
    'CAACAgIAAxkBAAEP1pZpIerQmYRO9Y1NX8jcPHIlJqa_NgACoHIAAmSWeUiXBKYqG0v-HzYE', 'CAACAgIAAxkBAAEP1phpIeroe5Rw6QZb25QCFvKeE5gUygAC0HUAArfUgEjJVrHkLniCCjYE',
    'CAACAgIAAxkBAAEP1pppIer5nKyzgrs0r4ocKC5fuVHNuwACH4kAAjOB-EhgyzMLHWObJTYE', 'CAACAgIAAxkBAAEP1pxpIesFc_7j4Qitn-K6hT2OP1z6rQAC4IUAAmvDWUqGulrbv6zqCzYE',
    'CAACAgIAAxkBAAEP1p5pIesTw8lScVkF7HoU6aU-43JbdQACkYIAAuOO-EqDX3oNDAR_5DYE', 'CAACAgIAAxkBAAEP1qBpIesXx4PtbU8oJJS3gwzj1m1wCQACe5AAAsST-UoNW_k6yJO4OjYE',
    'CAACAgIAAxkBAAEP1qJpIes8JUpUj5WrlFS1LdAwUqkpFQACCBEAAgPcAUimKPMRUKDPFzYE', 'CAACAgIAAxkBAAEP1qRpIets8PI7tAOMwl7_xmxRNddVFAAC4CwAAidRWEjWQmOBa6CkfzYE',
    'CAACAgIAAxkBAAEP1qZpIeuP2lj9KPDpbggPElCvEK_0NgACwjwAAhDZgUhr7O2Rge53rzYE', 'CAACAgIAAxkBAAEP1qdpIeuQ7H1e8IAAAVpPFxNXd4NOqRYAAthDAAJIMXhI99xOuWeG1a02BA',
    'CAACAgIAAxkBAAEP1qppIeuV50-gf0GGkoiYy37l64hJJgAC9DsAArfoeUgQaz5CDjYGaDYE', 'CAACAgIAAxkBAAEP1qxpIeuZbC68tx5hGARtQtDVFD5-uQACS0AAAlBQeEgZneWBRiWmrTYE',
    'CAACAgIAAxkBAAEP1q5pIeuiG2QzZ1RoDukBuqzV1prTOwAC4UMAAmxFeUhuRbTd3dlUKjYE', 'CAACAgIAAxkBAAEP1rBpIeukMpGXMav9q8-93nq4hKUh8gACnzwAAvedeUhJCCxWjZ34ITYE',
    'CAACAgIAAxkBAAEP1rJpIeupiH1-inCHZXvkaEuCDigN6QAC3D4AAg4MeEgMzUgqJxUnxTYE', 'CAACAgIAAxkBAAEP1rRpIeus3yL66NPtfUZwVRlXFDMQoAACMjsAAueyeEjLguRJlTr0hzYE',
    'CAACAgIAAxkBAAEP1rZpIeu0OOYVFVLAZJWpJMPNONs_QQACGYIAAnneQEtkNIPKUCGlIDYE', 'CAACAgIAAxkBAAEP1rhpIewQXmHM7rl4E7Ym-4fdTG8d4wACgysAAvBMAUpB1OXHUweBnzYE',
    'CAACAgIAAxkBAAEP1rppIewTLvSz941RyaQPGY0n_jf-AgACxy8AAggIAAFKL4cC4cX4Ltg2BA', 'CAACAgIAAxkBAAEP1rxpIewXWaD7x3BujSs4htg2w5y0tgACajYAAk6b-UnHfzLXVpUAAf02BA',
    'CAACAgIAAxkBAAEP1r5pIewj2fQV11tUoin4e0oC2iGP_QAC00IAAoQWSUpg5zZOktU4bDYE', 'CAACAgIAAxkBAAEP1sBpIewtdxAiuODo6nf4jsA6fIkP4AACRksAArHdeUl8ejjY_JGMtjYE',
    'CAACAgIAAxkBAAEP1sJpIeyABfNPk9CPltXCmadP6kEaUgACki4AAn-EwElgrqFBx94iITYE', 'CAACAgIAAxkBAAEP1sRpIezpOR-yekU6O0JLt55Fv0ZbEwACfxcAAlPpAUiEFfbqiFq1iDYE',
    'CAACAgIAAxkBAAEP1sZpIezuayxH_rEn5AFnEyVziujpQwACoBQAAnh8-UsXmEI0otoXCjYE', 'CAACAgIAAxkBAAEP1shpIe0AAUdMnMMfx7OxwQo87NcKs-8AArEVAAJPBBFIrCUZbiZ_bqg2BA',
    'CAACAgIAAxkBAAEP1sppIe0OKTXl18NDAAGMkAWg_G9hTTQAAjkWAAKZjFBI-IHoFH7-Ngg2BA'
]

GREETINGS = [
    "Салют, **{name}**! 🔥\n\nДобро пожаловать в пространство **FRESSO**. \nЗдесь рождается звук, который выводит на новый уровень.\n\n🎁 Используй команду /free, чтобы получить бесплатные биты по подписке на канал!",
    "Йо, **{name}**! 👋\n\nНа связи **Fresso**. \nДавай выберем тот самый бит, под который ты запишешь свой лучший трек.\n\n🎁 Введи /free, чтобы забрать пак бесплатных битов по подписке на канал!",
    "Привет, **{name}**! 🎧\n\nРад видеть тебя в **FRESSO BEATS**. \nВсё готово к работе. Твой идеальный саунд уже ждёт внутри.\n\n🎁 Напиши /free и получи доступ к бесплатным битам по подписке на канал!",
    "Здорово, **{name}**! 💎\n\nЯ **Fresso**. \nМоя цель — сделать твой голос частью качественного искусства.\n\n🎁 По команде /free тебя ждёт подарок — бесплатные биты по подписке на канал!"
]

# === КЛАВИАТУРЫ ===
def main_kb(user_id):
    markup = types.ReplyKeyboardMarkup(resize_keyboard=True, row_width=2)
    markup.add(types.KeyboardButton("🛠 ПОДДЕРЖКА"), types.KeyboardButton("❓ FAQ"))
    if user_id == ADMIN_ID:
        markup.add(types.KeyboardButton("📊 СТАТИСТИКА"), types.KeyboardButton("📢 РАССЫЛКА"))
    return markup

def back_kb():
    markup = types.ReplyKeyboardMarkup(resize_keyboard=True)
    markup.add(types.KeyboardButton("🏠 Главное меню"))
    return markup

def is_subscribed(user_id):
    try:
        status = bot.get_chat_member(CHANNEL_ID, user_id).status
        return status in ['member', 'administrator', 'creator']
    except:
        return True

def send_welcome(chat_id, user):
    u_id = user.id
    if u_id in waiting_for_review:
        del waiting_for_review[u_id]
    add_user(u_id, user.username, user.first_name)
    bot.send_sticker(chat_id, random.choice(STICKERS))
    welcome_text = random.choice(GREETINGS).format(name=user.first_name)
    nav_kb = types.InlineKeyboardMarkup()
    nav_kb.row(
        types.InlineKeyboardButton("📢 Мой Канал", url=CHANNEL_URL),
        types.InlineKeyboardButton("🌐 Соцсети", callback_data="open_socials")
    )
    nav_kb.row(
        types.InlineKeyboardButton("💬 Чат", url=CHAT_URL),
        types.InlineKeyboardButton("💭 Отзывы", url=REVIEWS_CHANNEL_LINK)
    )
    nav_kb.add(types.InlineKeyboardButton("⭐ ОЦЕНИТЬ", callback_data="open_rating"))
    bot.send_message(chat_id, welcome_text, parse_mode="Markdown", reply_markup=main_kb(u_id))
    bot.send_message(chat_id, "🏆 Навигация по ссылкам:", reply_markup=nav_kb)

# === ОБРАБОТЧИКИ КОМАНД ===

@bot.message_handler(commands=['start'])
def start_cmd(message):
    send_welcome(message.chat.id, message.from_user)

@bot.message_handler(commands=['free'])
def free_cmd(message):
    if not is_subscribed(message.from_user.id):
        kb = types.InlineKeyboardMarkup()
        kb.add(types.InlineKeyboardButton("🚀 Подписаться на FRESSO", url=CHANNEL_URL))
        bot.send_message(message.chat.id, "❌ **Доступ ограничен!**\n\nЧтобы получить бесплатные биты, подпишись на мой канал. Это лучшая поддержка!", parse_mode="Markdown", reply_markup=kb)
        return

    text = (
        "🎁 **УСЛОВИЯ ИСПОЛЬЗОВАНИЯ FREE BEATS**\n\n"
        "Ты можешь использовать эти биты бесплатно при соблюдении правил:\n\n"
        "1️⃣ **Голосовой тег** — его нельзя вырезать или заглушать.\n"
        "2️⃣ **Некоммерческое использование** — можно записывать демо, выкладывать в соцсети (YouTube, ВК, TikTok), но запрещена монетизация и дистрибуция на площадки (Spotify, Apple Music и др.).\n"
        "3️⃣ **Указание авторства** — в названии или описании обязательно: `(prod. fresso)`.\n\n"
        "📂 **Выбери удобный диск для скачивания:**\n"
        "🔹 [Google Drive (Весь мир)](https://drive.google.com/drive/folders/1m6-GC3vfylhvyOXEREPEk4AsSK_qma1y)\n"
        "🔸 [Яндекс Диск (РФ/СНГ)](https://disk.yandex.ru/d/UABd6CTW4UMw4w)\n\n"
        "📱 **Приложение Диск:**\n"
        "🔗 [Скачать Яндекс Диск](https://ya.cc/t/hCyd2PaZ86Ctnf)\n\n"
        "Для выпуска официального трека необходимо приобрести лицензию."
    )
    bot.send_message(message.chat.id, text, parse_mode="Markdown", disable_web_page_preview=True, reply_markup=back_kb())

# === ЛОГИКА ОТЗЫВА (МЕДИА + ТЕКСТ + ПРИНУДИТЕЛЬНОЕ ОФОРМЛЕНИЕ) ===
@bot.message_handler(content_types=['text', 'photo', 'video', 'animation', 'video_note', 'sticker', 'document'])
def handle_all(message):
    u_id = message.from_user.id

    if message.text == "🏠 Главное меню":
        send_welcome(message.chat.id, message.from_user)
        return

    if u_id in waiting_for_review:
        data = waiting_for_review[u_id]
        stars = "⭐" * data['stars']
        user_link = f"[{message.from_user.first_name}](tg://user?id={u_id})"

        # Собираем текст отзыва
        review_text_content = message.text or message.caption or ""
        full_review_format = f"👤 **Отзыв от {user_link}**\nОценка: {stars}\n\n💬 {review_text_content}"

        save_review_db(u_id, data['stars'], review_text_content or "Медиа-отзыв")

        try:
            # ПРИНУДИТЕЛЬНАЯ ОТПРАВКА В КАНАЛ В ЗАВИСИМОСТИ ОТ ТИПА
            if message.content_type == 'photo':
                bot.send_photo(REVIEWS_CHANNEL_ID, message.photo[-1].file_id, caption=full_review_format, parse_mode="Markdown")
            elif message.content_type == 'video':
                bot.send_video(REVIEWS_CHANNEL_ID, message.video.file_id, caption=full_review_format, parse_mode="Markdown")
            elif message.content_type == 'video_note':
                # Кружки отправляются отдельно, текст шлем следом (кружки не поддерживают caption)
                bot.send_video_note(REVIEWS_CHANNEL_ID, message.video_note.file_id)
                bot.send_message(REVIEWS_CHANNEL_ID, full_review_format, parse_mode="Markdown")
            elif message.content_type == 'animation':
                bot.send_animation(REVIEWS_CHANNEL_ID, message.animation.file_id, caption=full_review_format, parse_mode="Markdown")
            elif message.content_type == 'document':
                bot.send_document(REVIEWS_CHANNEL_ID, message.document.file_id, caption=full_review_format, parse_mode="Markdown")
            else:
                # Для текста и всего остального
                bot.send_message(REVIEWS_CHANNEL_ID, full_review_format, parse_mode="Markdown")

            bot.send_message(message.chat.id, "✅ Твой отзыв опубликован! Спасибо за фидбек.", reply_markup=main_kb(u_id))
        except Exception as e:
            # Резервный вариант на случай ошибки
            bot.send_message(REVIEWS_CHANNEL_ID, full_review_format, parse_mode="Markdown")
            bot.send_message(message.chat.id, "✅ Спасибо за отзыв!", reply_markup=main_kb(u_id))

        del waiting_for_review[u_id]
        return

    # Остальные кнопки меню
    if message.text == "❓ FAQ":
        faq_text = (
            "✨ **ИНФОРМАЦИЯ И ЛИЦЕНЗИИ**\n\n"
            "💳 **КАК КУПИТЬ?**\n"
            "Нажми на синюю кнопку **Mini App (SHOP)** внизу. Выбери бит, тип лицензии и следуй инструкциям.\n\n"
            "📜 **ПОДРОБНЕЕ О ЛИЦЕНЗИЯХ:**\n\n"
            "📀 **MP3 LEASE / WAV LEASE**\n"
            "• Формат: MP3 (320kbps) или WAV (24 bit).\n"
            "• Использование: Стриминговые площадки (Spotify, Apple Music и др.).\n"
            "• Лимит: До 50,000 прослушиваний.\n"
            "• Право на выступление: Да (некоммерческое).\n\n"
            "🎹 **TRACKOUT (STEMS)**\n"
            "• Формат: Полный набор дорожек (WAV).\n"
            "• Использование: Безлимитное коммерческое использование.\n"
            "• Лимит: До 500,000 прослушиваний.\n"
            "• Идеально для качественного сведения вокала с битом.\n\n"
            "💎 **EXCLUSIVE RIGHTS**\n"
            "• Формат: WAV + Trackout.\n"
            "• Полная передача прав собственности.\n"
            "• Бит удаляется из всех магазинов навсегда.\n"
            "• Безлимитные прослушивания, ротации и монетизация."
        )
        bot.send_message(message.chat.id, faq_text, parse_mode="Markdown", reply_markup=back_kb())

    elif message.text == "🛠 ПОДДЕРЖКА":
        bot.send_message(message.chat.id, f"👨‍💻 По всем вопросам и предложениям:\n\nПиши мне: {MY_NICK}", reply_markup=back_kb())

    elif message.text == "📊 СТАТИСТИКА" and u_id == ADMIN_ID:
        u, r, c = get_stats()
        bot.send_message(message.chat.id, f"📊 Юзеров: {u}\n⭐ Средний рейтинг: {r}\n💬 Всего отзывов: {c}")

    elif message.text == "📢 РАССЫЛКА" and u_id == ADMIN_ID:
        msg = bot.send_message(message.chat.id, "Пришли сообщение для рассылки или нажми «Главное меню» для отмены:", reply_markup=back_kb())
        bot.register_next_step_handler(msg, run_broadcast)

    else:
        bot.send_message(message.chat.id, "🤔 Используй меню ниже или введи /start.", reply_markup=main_kb(u_id))

def run_broadcast(message):
    if message.text == "🏠 Главное меню":
        bot.send_message(ADMIN_ID, "❌ Рассылка отменена.", reply_markup=main_kb(ADMIN_ID))
        return
    ids = get_all_users_ids()
    count = 0
    for uid in ids:
        try:
            bot.copy_message(uid, message.chat.id, message.message_id)
            count += 1
            time.sleep(0.05)
        except: pass
    bot.send_message(ADMIN_ID, f"✅ Рассылка завершена. Получили: {count} чел.", reply_markup=main_kb(ADMIN_ID))

# === CALLBACKS ===
@bot.callback_query_handler(func=lambda call: True)
def calls(call):
    u_id = call.from_user.id
    if call.data == "open_socials":
        soc_text = "🔗 **МОИ СОЦИАЛЬНЫЕ СЕТИ:**\n\n🟦 [ВКонтакте](https://vk.ru/fr1sso)\n📸 [Instagram](https://www.instagram.com/fresso.beatzzz)\n☁️ [SoundCloud](https://soundcloud.com/de-nys-nes321)\n🔴 [YouTube](https://youtube.com/@fressobeats3787)"
        bot.send_message(call.message.chat.id, soc_text, parse_mode="Markdown", disable_web_page_preview=True)
    elif call.data == "open_rating":
        kb = types.InlineKeyboardMarkup()
        kb.add(*[types.InlineKeyboardButton(f"{i}⭐", callback_data=f"s_{i}") for i in range(1, 6)])
        bot.send_message(call.message.chat.id, "Поставь оценку моей работе: ⭐", reply_markup=kb)
    elif call.data.startswith("s_"):
        rating = int(call.data.split("_")[1])
        waiting_for_review[u_id] = {'stars': rating}
        kb = types.InlineKeyboardMarkup(row_width=1)
        kb.add(types.InlineKeyboardButton("✅ Опубликовать без текста", callback_data=f"fin_{rating}"),
               types.InlineKeyboardButton("🏠 На главную", callback_data="go_home"))
        bot.edit_message_text(f"Оценка: {rating}⭐\n\nПришли свой отзыв (текст, фото или видео) ниже:",
                              call.message.chat.id, call.message.message_id, reply_markup=kb)
    elif call.data == "go_home":
        if u_id in waiting_for_review: del waiting_for_review[u_id]
        bot.delete_message(call.message.chat.id, call.message.message_id)
        send_welcome(call.message.chat.id, call.from_user)
    elif call.data.startswith("fin_"):
        rating = int(call.data.split("_")[1])
        stars = "⭐" * rating
        user_link = f"[{call.from_user.first_name}](tg://user?id={u_id})"
        save_review_db(u_id, rating)
        bot.edit_message_text("✅ Оценка принята!", call.message.chat.id, call.message.message_id)
        bot.send_message(REVIEWS_CHANNEL_ID, f"👤 **Отзыв от {user_link}**\nОценка: {stars}\n💬 (Без текста)", parse_mode="Markdown")
        if u_id in waiting_for_review: del waiting_for_review[u_id]
    bot.answer_callback_query(call.id)

if __name__ == '__main__':
    bot.polling(none_stop=True)
