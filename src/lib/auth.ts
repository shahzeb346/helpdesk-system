
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import type { UserRole } from "@/models/User";
import { loginSchema } from "@/lib/validations/auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,

  session: {
    strategy: "jwt",
  },

  pages: {
    signIn: "/login",
  },

  providers: [
    Credentials({
      credentials: {
        email: {
          label: "Email",
          type: "email",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },

      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);

        if (!parsed.success) {
          return null;
        }

        await connectDB();

        const user = await User.findOne({
          email: parsed.data.email,
        }).select("+passwordHash");

        if (!user || !user.active) {
          return null;
        }

        const passwordMatches = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash
        );

        if (!passwordMatches) {
          return null;
        }

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;

        if (
          user.role === "user" ||
          user.role === "agent" ||
          user.role === "admin"
        ) {
          token.role = user.role;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;

        const allowedRoles: UserRole[] = [
          "user",
          "agent",
          "admin",
        ];

        if (
          typeof token.role === "string" &&
          allowedRoles.includes(token.role as UserRole)
        ) {
          session.user.role = token.role as UserRole;
        }
      }

      return session;
    },
  },
});
