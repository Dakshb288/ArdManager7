from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import Application, CommandHandler, CallbackContext

# Replace with your bot's token
BOT_TOKEN = "7752394539:AAETGvqFK40VYr4vKtepur3Jv9wS-mO6rXE"

# Replace with the URL of your mini-app
WEB_APP_URL = "https://dakshb288.github.io/ArdManager7/"

async def start(update: Update, context: CallbackContext) -> None:
    """Handle the /start command and open the mini-app."""
    keyboard = [
        [InlineKeyboardButton("Open Mini-App", web_app=WebAppInfo(url=WEB_APP_URL))]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        "Welcome! Click the button below to open the mini-app:",
        reply_markup=reply_markup
    )

def main() -> None:
    """Run the bot."""
    application = Application.builder().token(BOT_TOKEN).build()

    # Add the /start command handler
    application.add_handler(CommandHandler("start", start))

    # Start the bot
    print("Bot is running...")
    application.run_polling()

if __name__ == "__main__":
    main()

