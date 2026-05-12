const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`

export async function sendMessage(chatId: number | string, text: string, parseMode: 'HTML' | 'Markdown' = 'HTML') {
  const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: parseMode,
    }),
  })
  return res.json()
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
