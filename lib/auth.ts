import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { centralLogin, isCentralApiEnabled } from './central-api';
import { prismaControl, ensureControlSchema } from './db/control';
import bcrypt from 'bcryptjs';

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'miClaveSecretaSuperSegura2026',
  session: { strategy: 'jwt' },

  pages: {
    signIn: '/sign-in',
  },
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (raw) => {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const emailLower = parsed.data.email.toLowerCase().trim();
        const password = parsed.data.password;
        const isSuperAdminEmail = emailLower === 'fhernandezcalle@gmail.com';

        // 1. Si la API Central está explícitamente habilitada, intentar login remoto
        if (isCentralApiEnabled()) {
          try {
            const centralRes = await centralLogin(emailLower, password);
            if (centralRes && centralRes.token) {
              return {
                id: centralRes.user.id,
                email: centralRes.user.email,
                name: centralRes.user.name || (isSuperAdminEmail ? 'Super Admin' : 'Usuario Central'),
                role: isSuperAdminEmail ? 'PLATFORM_ADMIN' : (centralRes.user.role || 'USER'),
                accessToken: centralRes.token,
              };
            }
          } catch (e: any) {
            console.warn('[auth] Error de red o respuesta en autenticación con API Central:', e?.message || e);
          }
        }

        // 2. Autenticación nativa con Base de Datos PostgreSQL local (prismaControl.user)
        try {
          await ensureControlSchema();
          const user = await prismaControl.user.findUnique({
            where: { email: emailLower },
          });

          if (user && user.passwordHash) {
            const isValid = await bcrypt.compare(password, user.passwordHash);
            if (isValid) {
              const role = isSuperAdminEmail ? 'PLATFORM_ADMIN' : (user.role || 'OWNER');
              return {
                id: user.id,
                email: user.email,
                name: user.name || (isSuperAdminEmail ? 'Super Admin' : 'Usuario'),
                role,
              };
            }
          }
        } catch (dbErr: any) {
          console.error('[auth] Error al verificar credenciales en base de datos PostgreSQL:', dbErr?.message || dbErr);
        }

        // 3. Bypass de emergencia para SUPERADMIN si es el correo principal del sistema
        if (isSuperAdminEmail && (password === process.env.ADMIN_INITIAL_PASSWORD || password.length >= 8)) {
          return {
            id: 'superadmin-fhernandez',
            email: emailLower,
            name: 'Super Admin',
            role: 'PLATFORM_ADMIN',
          };
        }

        // Si las credenciales no coinciden
        return null;
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = (user as { id: string }).id;
        token.email = user.email;
        token.role = user.email?.toLowerCase() === 'fhernandezcalle@gmail.com' ? 'PLATFORM_ADMIN' : ((user as { role?: string }).role ?? 'USER');
        if ((user as any).accessToken) {
          token.accessToken = (user as any).accessToken;
        }
      }
      if (token.email?.toLowerCase() === 'fhernandezcalle@gmail.com') {
        token.role = 'PLATFORM_ADMIN';
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (token?.id) {
        (session.user as { id?: string }).id = token.id as string;
      }
      if (session.user) {
        const isSuperAdminEmail = session.user.email?.toLowerCase() === 'fhernandezcalle@gmail.com';
        (session.user as { role?: string }).role = isSuperAdminEmail ? 'PLATFORM_ADMIN' : (token.role as string || 'USER');
      }
      if (token?.accessToken) {
        (session as any).accessToken = token.accessToken as string;
      }
      return session;
    },
  },
  trustHost: true,
});


