import NextAuth, { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user?: DefaultSession["user"] & {
      id?: string;
      role?: string;
      smsBalance?: number;
      smsUsed?: number;
      phone?: string;
    };
  }

  interface User extends DefaultUser {
    role?: string;
    smsBalance?: number;
    smsUsed?: number;
    phone?: string;
    id?: string;
  }

  interface JWT {
    id?: string;
    role?: string;
    smsBalance?: number;
    smsUsed?: number;
    phone?: string;
    id?: string;
  }
}
