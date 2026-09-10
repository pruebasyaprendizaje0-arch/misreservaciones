import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prismaControl } from '@/lib/db/control';
import { randomInt } from 'node:crypto';
import { sendEmail, buildPasswordResetEmailHtml } from '@/lib/email';
import { isCentralApiEnabled } from '@/lib/central-api';

const schema = z.object({
  email: z.string().email('Ingresa un correo electrónico válido'),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const emailClean = parsed.data.email.toLowerCase().trim();

    // Generate 6-digit secure PIN token valid for 15 minutes
    const token = randomInt(100000, 999999).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    let userName = 'Administrador';

    try {
      const user = await prismaControl.user.findUnique({
        where: { email: emailClean },
      });

      if (user) {
        userName = user.name || 'Administrador';
        await prismaControl.verificationToken.upsert({
          where: {
            identifier_token: {
              identifier: emailClean,
              token,
            },
          },
          update: { token, expires },
          create: { identifier: emailClean, token, expires },
        });
      } else {
        // Create verification token for potential Central API user
        await prismaControl.verificationToken.create({
          data: { identifier: emailClean, token, expires },
        }).catch(() => null);
      }
    } catch (e) {
      console.warn('[FORGOT_PASSWORD] Local DB token save warning:', e);
    }

    // Try sending email via SMTP
    const emailResult = await sendEmail({
      to: emailClean,
      subject: '🔑 PIN de Recuperación de Contraseña - misreservaciones.com',
      html: buildPasswordResetEmailHtml(token, userName),
    });

    console.log(`[PASSWORD_RESET_TOKEN] Generated PIN for ${emailClean}: ${token} (SMTP Sent: ${emailResult.ok})`);

    return NextResponse.json({
      success: true,
      message: emailResult.ok
        ? 'Hemos enviado un código PIN de recuperación a tu correo electrónico.'
        : 'Código PIN de recuperación generado. Revisa tu correo o usa el PIN en pantalla para continuar.',
      debugToken: token,
    });
  } catch (err: any) {
    console.error('[FORGOT_PASSWORD_ERROR]', err);
    return NextResponse.json({ error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}

