import NextAuth, { type NextAuthOptions, type Session } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import type { JWT } from "next-auth/jwt";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Парола", type: "password" },
      },
      async authorize(credentials: Record<string, string> | undefined) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({ where: { email: credentials.email } });
        if (!user || !user.password) return null;

        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;

        return { id: user.id, name: user.name ?? undefined, email: user.email ?? undefined, image: user.image ?? undefined };
      },
    }),
  ],
  pages: {
    signIn: "/admin/login",
  },
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: any }): Promise<JWT> {
      if (user) token.userId = (user as any).id;
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }): Promise<Session> {
      if (token?.userId && session.user) (session.user as any).id = token.userId;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export const { auth } = NextAuth(authOptions);
