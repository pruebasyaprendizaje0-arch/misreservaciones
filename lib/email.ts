import nodemailer from 'nodemailer';

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

/**
 * Envía correos transaccionales usando SMTP configurado en variables de entorno.
 */
export async function sendEmail({ to, subject, html, text }: SendEmailInput): Promise<{ ok: boolean; error?: string }> {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM || 'no-reply@misreservaciones.com';

  if (!host || !user || !pass) {
    console.warn(`[email] SMTP no está completamente configurado en .env (SMTP_HOST, SMTP_USER, SMTP_PASSWORD). Correo hacia ${to} omitido en envío real.`);
    return { ok: false, error: 'SMTP_NOT_CONFIGURED' };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    await transporter.sendMail({
      from,
      to,
      subject,
      text: text || html.replace(/<[^>]*>?/gm, ''),
      html,
    });

    console.log(`[email] Correo enviado exitosamente a ${to}: "${subject}"`);
    return { ok: true };
  } catch (err: any) {
    console.error(`[email] Error al enviar correo a ${to}:`, err);
    return { ok: false, error: err?.message || String(err) };
  }
}

/**
 * Plantilla HTML moderna para el correo de recuperación de contraseña con PIN.
 */
export function buildPasswordResetEmailHtml(pin: string, name?: string): string {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; background-color: #0f172a; color: #f8fafc; border-radius: 16px; border: 1px solid #1e293b;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #6366f1; margin: 0; font-size: 24px; font-weight: 800;">misreservaciones.com</h2>
        <p style="color: #94a3b8; font-size: 14px; margin-top: 4px;">Recuperación de Contraseña para tu Negocio</p>
      </div>

      <div style="background-color: #1e293b; padding: 24px; border-radius: 12px; margin-bottom: 24px; border: 1px solid #334155;">
        <p style="margin-top: 0; color: #e2e8f0; font-size: 15px;">Hola ${name || 'Administrador'},</p>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
          Has solicitado restablecer la contraseña de acceso al panel de tu negocio en <strong>misreservaciones.com</strong>.
        </p>
        
        <div style="text-align: center; margin: 28px 0;">
          <div style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); border-radius: 14px; shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.4);">
            <span style="font-family: monospace; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #ffffff;">
              ${pin}
            </span>
          </div>
        </div>

        <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; margin-bottom: 0;">
          Ingresa este código PIN de 6 dígitos en la pantalla de recuperación. Este PIN expire en <strong>15 minutos</strong>. Si no solicitaste este cambio, puedes ignorar este correo.
        </p>
      </div>

      <div style="text-align: center; font-size: 12px; color: #64748b;">
        <p>© 2026 misreservaciones.com · Plataforma de Reservaciones y Negocios del Ecuador</p>
      </div>
    </div>
  `;
}
