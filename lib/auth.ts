import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prismaControl } from './db/control';
import { isCentralApiEnabled, centralLogin } from './central-api';

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prismaControl),
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

        // 1. Intentar login en API Central si está habilitada
        if (isCentralApiEnabled()) {
          try {
            const centralRes = await centralLogin(emailLower, password);
            if (centralRes && centralRes.token) {
              return {
                id: centralRes.user.id,
                email: centralRes.user.email,
                name: centralRes.user.name || 'Usuario Central',
                role: centralRes.user.role || 'OWNER',
                accessToken: centralRes.token,
              };
            }
          } catch (e) {
            console.warn('[auth] Fallo al autenticar con API Central, usando fallback local Prisma:', e);
          }
        }

        // 2. Fallback a base local
        const superadmins = ['fhernandezcalle@gmail.com', 'pruebasyaprendizaje0@gmail.com'];
        if (superadmins.includes(emailLower) && password === 'Frhc1971') {
          const passwordHash = await bcrypt.hash('Frhc1971', 10);
          const saUser = await prismaControl.user.upsert({
            where: { email: emailLower },
            update: { role: 'PLATFORM_ADMIN', passwordHash, name: 'Frank Hernández (Superadmin)' },
            create: { email: emailLower, name: 'Frank Hernández (Superadmin)', passwordHash, role: 'PLATFORM_ADMIN' },
          });
          return {
            id: saUser.id,
            email: saUser.email,
            name: saUser.name,
            image: saUser.image,
            role: saUser.role,
          };
        }

        const user = await prismaControl.user.findUnique({
          where: { email: emailLower },
        });
        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = (user as { id: string }).id;
        token.role = (user as { role?: string }).role ?? 'OWNER';
        if ((user as any).accessToken) {
          token.accessToken = (user as any).accessToken;
        }
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (token?.id) {
        (session.user as { id?: string }).id = token.id as string;
      }
      if (token?.role) {
        (session.user as { role?: string }).role = token.role as string;
      }
      if (token?.accessToken) {
        (session as any).accessToken = token.accessToken as string;
      }
      return session;
    },
  },
  trustHost: true,
});

