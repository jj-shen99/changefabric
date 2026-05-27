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

        console.log("[AUTH] Login attempt for:", credentials.email.replace(/(.{2}).*(@.*)/, "$1***$2"));

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
          console.error("[AUTH] User not found:", credentials.email.replace(/(.{2}).*(@.*)/, "$1***$2"));
          throw new Error("Invalid email or password");
        }

        console.log("[AUTH] User found, roles:", user.userRoles.map(ur => ur.role.name));

        const isValid = await bcrypt.compare(
          credentials.password,
          user.hashedPassword
        );

        // Do not log password validation result

        if (!isValid) {
          throw new Error("Invalid email or password");
        }

        // Extract role names and aggregate permissions
        const roleNames = user.userRoles.map(ur => ur.role.name);
        const rolePermissions = user.userRoles.map(ur => ur.role);
        
        // Check if user has super_admin role (can see all orgs)
        const isSuperAdmin = user.userRoles.some(ur => ur.role.isSuperAdmin);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          roles: roleNames,
          permissions: aggregatePermissions(rolePermissions),
          orgId: user.orgId,
          isSuperAdmin,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const typedUser = user as { roles?: string[]; permissions?: Permissions; orgId?: string; isSuperAdmin?: boolean };
        token.roles = typedUser.roles || [];
        token.permissions = typedUser.permissions || DEFAULT_PERMISSIONS;
        token.id = user.id;
        token.orgId = typedUser.orgId || "demo";
        token.isSuperAdmin = typedUser.isSuperAdmin || false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        // Always fetch fresh roles from database to reflect admin changes
        const userId = token.id as string;
        const user = await prisma.user.findUnique({
          where: { id: userId },
          include: {
            userRoles: {
              include: {
                role: true,
              },
            },
          },
        });

        if (user) {
          // Extract fresh role names and permissions
          const roleNames = user.userRoles.map(ur => ur.role.name);
          const rolePermissions = user.userRoles.map(ur => ur.role);
          const isSuperAdmin = user.userRoles.some(ur => ur.role.isSuperAdmin);

          session.user.roles = roleNames;
          session.user.permissions = aggregatePermissions(rolePermissions);
          session.user.id = user.id;
          session.user.orgId = user.orgId;
          session.user.isSuperAdmin = isSuperAdmin;
        } else {
          // Fallback to token values if user not found
          session.user.roles = (token.roles as string[]) || [];
          session.user.permissions = (token.permissions as Permissions) || DEFAULT_PERMISSIONS;
          session.user.id = token.id as string;
          session.user.orgId = (token.orgId as string) || "demo";
          session.user.isSuperAdmin = (token.isSuperAdmin as boolean) || false;
        }
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
