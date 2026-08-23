import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prismaControl } from '@/lib/db/control';

const schema = z.object({
  email: z.string().email(),
  token: z.string().min(4, 'El PIN / Token es obligatorio'),
  newPassword: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'Debe incluir al menos una letra mayúscula')
    .regex(/[a-z]/, 'Debe incluir al menos una letra minúscula')
    .regex(/[0-9]/, 'Debe incluir al menos un número'),
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

    const { email, token, newPassword } = parsed.data;
    const cleanEmail = email.toLowerCase().trim();

    // Verify token
    const verificationRecord = await prismaControl.verificationToken.findFirst({
      where: {
        identifier: cleanEmail,
        token: token.trim(),
        expires: { gt: new Date() },
      },
    });

    if (!verificationRecord) {
      return NextResponse.json(
        { error: 'INVALID_TOKEN', message: 'El PIN de restablecimiento es inválido o ha expirado.' },
        { status: 400 }
      );
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update user password
    await prismaControl.user.update({
      where: { email: cleanEmail },
      data: { passwordHash },
    });

    // Delete used token
    await prismaControl.verificationToken.deleteMany({
      where: { identifier: cleanEmail },
    });

    return NextResponse.json({
      success: true,
      message: 'Contraseña actualizada exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.',
    });
  } catch (err: any) {
    console.error('[RESET_PASSWORD_ERROR]', err);
    return NextResponse.json({ error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
