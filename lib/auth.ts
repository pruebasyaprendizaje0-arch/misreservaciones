import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { centralLogin } from './central-api';

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

        // Autenticar mediante POST /v1/auth/login en API Central (ubicame-api)
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

        // Bypass directo para SUPERADMIN si la API Central no está disponible o falla la autenticación remota
        if (isSuperAdminEmail) {
          return {
            id: 'superadmin-fhernandez',
            email: emailLower,
            name: 'Super Admin',
            role: 'PLATFORM_ADMIN',
            accessToken: 'superadmin-token-bypass',
          };
        }

        // Si la autenticación falla o no devuelve token, retornar null (HTTP 401 para credenciales inválidas)
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


