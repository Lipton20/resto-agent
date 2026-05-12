import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)
const FROM_EMAIL = process.env.FROM_EMAIL || 'agent@restoagent.ru'

export async function sendSupplierOrder({
  to,
  supplierName,
  itemName,
  quantity,
  unit,
  emailBody,
}: {
  to: string
  supplierName: string
  itemName: string
  quantity: number
  unit: string
  emailBody: string
}) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Заявка на поставку: ${itemName}`,
    html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a1a2e;">Заявка на поставку</h2>
      <p><strong>Поставщик:</strong> ${supplierName}</p>
      <p><strong>Товар:</strong> ${itemName}</p>
      <p><strong>Количество:</strong> ${quantity} ${unit}</p>
      <hr />
      <div style="white-space: pre-wrap; color: #333;">${emailBody}</div>
      <hr />
      <p style="color: #888; font-size: 12px;">Это автоматическое сообщение от системы управления заведением RestoAgent.</p>
    </div>`,
  })
}

export async function sendReservationConfirmation({
  guestEmail,
  guestName,
  date,
  time,
  guests,
  tableNumber,
}: {
  guestEmail?: string
  guestName: string
  date: string
  time: string
  guests: number
  tableNumber: number
}) {
  if (!guestEmail) return
  return resend.emails.send({
    from: FROM_EMAIL,
    to: guestEmail,
    subject: 'Подтверждение бронирования',
    html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>✅ Бронирование подтверждено</h2>
      <p>Уважаемый(ая) <strong>${guestName}</strong>,</p>
      <p>Ваш столик забронирован:</p>
      <ul>
        <li>📅 Дата: ${date}</li>
        <li>🕐 Время: ${time}</li>
        <li>👥 Гостей: ${guests}</li>
        <li>🪑 Стол №${tableNumber}</li>
      </ul>
      <p>Ждём вас! По вопросам — пишите нам.</p>
    </div>`,
  })
}
