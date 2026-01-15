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
MY_NICK = "@Fr1sso"
BOT_LINK = "https://t.me/Fresso_BeatShop_bot" # Твоя ссылка на бота

bot = telebot.TeleBot(TOKEN)
waiting_for_review = {}

# === БАЗА ДАННЫХ ===
def init_db():
    conn = sqlite3.connect('fresso_final.db', check_same_thread=False)
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

def save_review_db(u_id, rating, text=""):
    conn = sqlite3.connect('fresso_final.db', check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute("INSERT OR REPLACE INTO reviews (user_id, rating, text) VALUES (?, ?, ?)", (u_id, rating, text))
    conn.commit()
    conn.close()

init_db()

# === ВСПОМОГАТЕЛЬНЫЕ ДАННЫЕ ===
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
    "Салют, **{name}**! 🔥\n\nЯ Fresso. Сделаю твой звук дорогим.",
    "Йо, **{name}**! 👋\n\nНа связи Fresso. Готов к новому хиту?",
    "Привет, **{name}**! 🎧\n\nFresso здесь. Твой путь к качественному саунду начинается тут.",
    "Здорово, **{name}**! 💎\n\nЯ Fresso. Давай выведем твой звук на новый уровень."
]

def plural(n, s, p1, p2):
    if n % 10 == 1 and n % 100 != 11: return f"{n} {s}"
    elif 2 <= n % 10 <= 4 and (n % 100 < 10 or n % 100 >= 20): return f"{n} {p1}"
    else: return f"{n} {p2}"

def main_kb(user_id):
    markup = types.ReplyKeyboardMarkup(resize_keyboard=True, row_width=2)
    markup.add(types.KeyboardButton("🛠 ПОДДЕРЖКА"), types.KeyboardButton("❓ FAQ"))
    if user_id == ADMIN_ID:
        markup.add(types.KeyboardButton("📊 СТАТИСТИКА"))
    return markup

def get_share_kb():
    share_kb = types.InlineKeyboardMarkup()
    # Ссылка для пересылки бота другу
    share_text = "Зацени биты у Fresso! 🔥 Звук реально дорогой."
    share_url = f"https://t.me/share/url?url={BOT_LINK}&text={share_text}"
    share_kb.add(types.InlineKeyboardButton("🚀 Посоветовать другу", url=share_url))
    return share_kb

# === ОБРАБОТЧИКИ ===

@bot.message_handler(commands=['start'])
def start(message):
    u_id = message.from_user.id
    name = message.from_user.first_name
    add_user(u_id, message.from_user.username, name)
    bot.send_sticker(message.chat.id, random.choice(STICKERS))
    
    u_count, avg_r, r_count = get_stats()
    welcome_text = random.choice(GREETINGS).format(name=name)
    
    nav_kb = types.InlineKeyboardMarkup(row_width=2)
    nav_kb.add(
        types.InlineKeyboardButton("📢 Мой канал", url=CHANNEL_URL),
        types.InlineKeyboardButton("⭐ ОЦЕНИТЬ", callback_data="open_rating")
    )
    
    bot.send_message(message.chat.id, welcome_text, parse_mode="Markdown", reply_markup=main_kb(u_id))
    bot.send_message(message.chat.id, f"🏆 Текущий рейтинг: **{avg_r}/5** ({plural(r_count, 'отзыв', 'отзыва', 'отзывов')})", parse_mode="Markdown", reply_markup=nav_kb)

@bot.message_handler(content_types=['text'])
def text_logic(message):
    u_id = message.from_user.id
    
    if u_id in waiting_for_review:
        data = waiting_for_review[u_id]
        save_review_db(u_id, data['stars'], message.text)
        try: bot.edit_message_reply_markup(message.chat.id, data['msg_id'], reply_markup=None)
        except: pass
        bot.send_message(message.chat.id, "✅ Твой отзыв принят! 🙏\nБуду благодарен за рекомендацию:", reply_markup=get_share_kb())
        bot.send_message(ADMIN_ID, f"🔔 **Новый отзыв!**\n{message.from_user.first_name}: {message.text}")
        del waiting_for_review[u_id]
        return

    if message.text == "📊 СТАТИСТИКА" and u_id == ADMIN_ID:
        count, avg, r_c = get_stats()
        bot.send_message(message.chat.id, f"📈 Пользователей: {count}\n⭐ Рейтинг: {avg}/5 ({r_c} отз.)")
    elif message.text == "🛠 ПОДДЕРЖКА":
        bot.send_message(message.chat.id, f"👨‍💻 По всем вопросам: {MY_NICK}")
    elif message.text == "❓ FAQ":
        faq_kb = types.InlineKeyboardMarkup(row_width=1)
        faq_kb.add(
            types.InlineKeyboardButton("📄 Лицензии", callback_data="f_lic"),
            types.InlineKeyboardButton("Как купить бит?", callback_data="f_buy")
        )
        bot.send_message(message.chat.id, "✨ **FAQ — Помощь и информация**", parse_mode="Markdown", reply_markup=faq_kb)
    else:
        bot.reply_to(message, "Используй кнопки меню или нажми /start.")

@bot.callback_query_handler(func=lambda call: True)
def calls(call):
    u_id = call.from_user.id
    if call.data == "open_rating":
        stars = types.InlineKeyboardMarkup()
        stars.add(*[types.InlineKeyboardButton(f"{i}⭐", callback_data=f"s_{i}") for i in range(1, 6)])
        bot.send_message(call.message.chat.id, "Поставь оценку работе: ⭐", reply_markup=stars)
    
    elif call.data.startswith("s_"):
        rating = int(call.data.split("_")[1])
        markup = types.InlineKeyboardMarkup()
        markup.add(types.InlineKeyboardButton("✅ Просто отправить", callback_data=f"fin_{rating}"))
        sent_msg = bot.edit_message_text(f"Выбрано: {rating}⭐\nНапиши отзыв текстом или нажми кнопку:", call.message.chat.id, call.message.message_id, reply_markup=markup)
        waiting_for_review[u_id] = {'stars': rating, 'msg_id': sent_msg.message_id}

    elif call.data.startswith("fin_"):
        rating = int(call.data.split("_")[1])
        save_review_db(u_id, rating)
        bot.edit_message_text(f"✅ Оценка принята!", call.message.chat.id, call.message.message_id)
        bot.send_message(call.message.chat.id, "Буду рад рекомендации! 👇", reply_markup=get_share_kb())
        if u_id in waiting_for_review: del waiting_for_review[u_id]
        bot.send_message(ADMIN_ID, f"🔔 Новая оценка: {rating}⭐")

    elif call.data == "f_lic":
        text_lic = (
            "📜 **Подробная информация о лицензиях:**\n\n"
            "🎹 **MP3 Lease**: Бюджетный вариант. MP3 формат. 50,000 стримов.\n\n"
            "💿 **WAV Lease**: Высокое качество. WAV формат. 100,000 стримов.\n\n"
            "🎼 **TRACKOUT**: Бит по дорожкам. Сведение вокала. 500,000 стримов.\n\n"
            "👑 **EXCLUSIVE**: Полные права. Безлимит. Бит удаляется из магазина."
        )
        bot.send_message(call.message.chat.id, text_lic, parse_mode="Markdown")
    
    elif call.data == "f_buy":
        bot.send_message(call.message.chat.id, "💳 Чтобы купить бит, нажми синюю кнопку **Меню** 📱 слева внизу, выбери товар и следуй инструкциям.", parse_mode="Markdown")
    
    bot.answer_callback_query(call.id)

print("Бот запущен!")
bot.polling(none_stop=True)