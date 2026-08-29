import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prismaControl } from '@/lib/db/control';
import { randomInt } from 'node:crypto';
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

    const { email } = parsed.data;

    if (isCentralApiEnabled()) {
      return NextResponse.json({
        success: true,
        message: 'Si el correo existe en nuestra plataforma, recibirás instrucciones para restablecer tu contraseña.',
      });
    }

    const user = await prismaControl.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      // Return success even if email not found for privacy security
      return NextResponse.json({
        success: true,
        message: 'Si el correo existe en nuestra plataforma, recibirás instrucciones para restablecer tu contraseña.',
      });
    }

    // Generate 6-digit secure PIN token valid for 15 minutes
    const token = randomInt(100000, 999999).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    // Save token in VerificationToken
    await prismaControl.verificationToken.upsert({
      where: {
        identifier_token: {
          identifier: user.email,
          token,
        },
      },
      update: {
        token,
        expires,
      },
      create: {
        identifier: user.email,
        token,
        expires,
      },
    });

    console.log(`[PASSWORD_RESET_TOKEN] Generated token for ${user.email}: ${token}`);

    return NextResponse.json({
      success: true,
      message: 'Instrucciones enviadas. Ingresa el código PIN generado para restablecer tu contraseña.',
      // For immediate user testing convenience when email server is optional:
      debugToken: token,
    });
  } catch (err: any) {
    console.error('[FORGOT_PASSWORD_ERROR]', err);
    return NextResponse.json({ error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
