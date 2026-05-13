const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`

type ReplyKeyboard = {
  keyboard: string[][]
  resize_keyboard: boolean
  persistent?: boolean
}

export async function sendMessage(
  chatId: number | string,
  text: string,
  parseMode: 'HTML' | 'Markdown' = 'HTML',
  replyMarkup?: ReplyKeyboard
) {
  const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: parseMode,
      reply_markup: replyMarkup,
    }),
  })
  return res.json()
}

export const MANAGER_KEYBOARD: ReplyKeyboard = {
  keyboard: [
    ['📦 Склад', '👥 Смена'],
    ['📊 ABC-анализ', '📋 Брони'],
    ['📅 Забронировать', '❓ Помощь'],
  ],
  resize_keyboard: true,
  persistent: true,
}

export const GUEST_KEYBOARD: ReplyKeyboard = {
  keyboard: [
    ['📅 Забронировать'],
    ['📋 Мои брони', '❓ Помощь'],
  ],
  resize_keyboard: true,
  persistent: true,
}

export async function notifyManagement(message: string) {
  const managerChatId = process.env.MANAGER_TELEGRAM_CHAT_ID
  if (!managerChatId) return
  return sendMessage(managerChatId, message)
}

export async function notifyStaff(telegramId: number, message: string) {
  return sendMessage(telegramId, message)
}

export async function setWebhook(webhookUrl: string) {
  const res = await fetch(`${TELEGRAM_API}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: webhookUrl }),
  })
  return res.json()
}
