/**
 * Twilio WhatsApp notification utility.
 *
 * Uses native fetch + Twilio REST API to send WhatsApp messages
 * without requiring the twilio SDK package.
 *
 * Required environment variables:
 *   TWILIO_ACCOUNT_SID   – Your Twilio Account SID
 *   TWILIO_AUTH_TOKEN    – Your Twilio Auth Token
 *   TWILIO_WHATSAPP_FROM – Sender number, e.g. "whatsapp:+14155238886" (Sandbox)
 */

type SendResult =
  | { ok: true; sid: string }
  | { ok: false; error: string };

/**
 * Sends a WhatsApp message to the given phone number via Twilio.
 *
 * @param to   - Recipient phone number in E.164 format, e.g. "+18095551234"
 * @param body - Message text
 */
export async function sendWhatsAppNotification(
  to: string,
  body: string
): Promise<SendResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;

  if (!sid || !token || !from) {
    console.warn('[twilio] WhatsApp not configured – skipping notification.');
    return { ok: false, error: 'NOT_CONFIGURED' };
  }

  // Twilio expects "whatsapp:+XXXXXXXXXX" format for both From and To
  const toFormatted = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
  const fromFormatted = from.startsWith('whatsapp:') ? from : `whatsapp:${from}`;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;

  const params = new URLSearchParams({
    To: toFormatted,
    From: fromFormatted,
    Body: body,
  });

  try {
    const credentials = Buffer.from(`${sid}:${token}`).toString('base64');
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const json = (await res.json()) as { sid?: string; message?: string; code?: number };

    if (!res.ok) {
      const errMsg = json.message ?? `HTTP ${res.status}`;
      console.error('[twilio] Failed to send WhatsApp message:', errMsg, json.code);
      return { ok: false, error: errMsg };
    }

    console.log('[twilio] WhatsApp message sent. SID:', json.sid);
    return { ok: true, sid: json.sid! };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[twilio] Network error sending WhatsApp:', message);
    return { ok: false, error: message };
  }
}

/**
 * Builds the booking confirmation message text.
 *
 * @param params.businessName   - Name of the tenant/business
 * @param params.customerName   - Name of the customer
 * @param params.serviceName    - Name of the service reserved
 * @param params.startsAt       - Date/time the reservation starts
 * @param params.endsAt         - Date/time the reservation ends
 * @param params.locale         - Locale string for date formatting (e.g. "es" or "en")
 * @param params.notes          - Optional notes from the booking
 */
export function buildBookingConfirmationMessage(params: {
  businessName: string;
  customerName: string;
  serviceName: string;
  startsAt: Date;
  endsAt: Date;
  locale?: string;
  notes?: string | null;
}): string {
  const { businessName, customerName, serviceName, startsAt, endsAt, locale = 'es', notes } = params;

  const dateStr = startsAt.toLocaleString(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const endTimeStr = endsAt.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (locale === 'es') {
    return [
      `✅ *¡Reserva confirmada!*`,
      ``,
      `Hola, *${customerName}* 👋`,
      `Tu cita ha sido registrada correctamente en *${businessName}*.`,
      ``,
      `📅 *Fecha y hora:* ${dateStr}`,
      `⏱ *Hasta:* ${endTimeStr}`,
      `🛎 *Servicio:* ${serviceName}`,
      notes ? `📝 *Notas:* ${notes}` : null,
      ``,
      `_Si necesitas cancelar o modificar tu cita, por favor contáctanos con al menos 24 horas de anticipación._`,
      ``,
      `¡Hasta pronto! 🙌`,
    ]
      .filter((line) => line !== null)
      .join('\n');
  }

  return [
    `✅ *Booking Confirmed!*`,
    ``,
    `Hi, *${customerName}* 👋`,
    `Your appointment at *${businessName}* has been successfully registered.`,
    ``,
    `📅 *Date & Time:* ${dateStr}`,
    `⏱ *Until:* ${endTimeStr}`,
    `🛎 *Service:* ${serviceName}`,
    notes ? `📝 *Notes:* ${notes}` : null,
    ``,
    `_If you need to cancel or modify your appointment, please contact us at least 24 hours in advance._`,
    ``,
    `See you soon! 🙌`,
  ]
    .filter((line) => line !== null)
    .join('\n');
}
