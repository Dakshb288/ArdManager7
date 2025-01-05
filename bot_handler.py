from telegram import Update, WebAppInfo
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes

async def check_membership(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Check if user is a member of the required channel"""
    try:
        user_id = update.effective_user.id
        channel_username = "ArdManagerOfficial"  # Your channel username without @
        
        try:
            member = await context.bot.get_chat_member(f"@ArdManagerOfficial", user_id)
            is_member = member.status in ['member', 'administrator', 'creator']
            
            # Send back the membership status
            await update.callback_query.answer(
                'true' if is_member else 'false',
                cache_time=5
            )
        except Exception as e:
            print(f"Error checking membership: {e}")
            await update.callback_query.answer('false', cache_time=5)
            
    except Exception as e:
        print(f"Error in check_membership: {e}")
        await update.callback_query.answer('false', cache_time=5)

def main():
    """Start the bot."""
    # Create the Application and pass it your bot's token.
    application = Application.builder().token("7752394539:AAETGvqFK40VYr4vKtepur3Jv9wS-mO6rXE").build()

    # Add handlers
    application.add_handler(MessageHandler(filters.StatusUpdate.WEB_APP_DATA, check_membership))

    # Start the Bot
    application.run_polling()
