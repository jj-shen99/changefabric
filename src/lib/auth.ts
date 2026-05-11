import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { aggregatePermissions, DEFAULT_PERMISSIONS, type Permissions } from "@/lib/auth-types";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.error("[AUTH] Missing credentials");
          throw new Error("Email and password are required");
        }

        console.log("[AUTH] Login attempt for:", credentials.email);

        // Fetch user with their roles
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            userRoles: {
              include: {
                role: true,
              },
            },
          },
        });

        if (!user) {
          console.error("[AUTH] User not found:", credentials.email);
          throw new Error("Invalid email or password");
        }

        console.log("[AUTH] User found:", user.email, "roles:", user.userRoles.map(ur => ur.role.name));

        const isValid = await bcrypt.compare(
          credentials.password,
          user.hashedPassword
        );

        console.log("[AUTH] Password valid:", isValid);

        if (!isValid) {
          throw new Error("Invalid email or password");
        }

        // Extract role names and aggregate permissions
        const roleNames = user.userRoles.map(ur => ur.role.name);
        const rolePermissions = user.userRoles.map(ur => ur.role);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          roles: roleNames,
          permissions: aggregatePermissions(rolePermissions),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const typedUser = user as { roles?: string[]; permissions?: Permissions };
        token.roles = typedUser.roles || [];
        token.permissions = typedUser.permissions || DEFAULT_PERMISSIONS;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.roles = (token.roles as string[]) || [];
        session.user.permissions = (token.permissions as Permissions) || DEFAULT_PERMISSIONS;
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
  useSecureCookies: process.env.NODE_ENV === "production",
};
