//lib/auth.ts

import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectToDatabase } from "../lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcrypt";
// import { Phone } from "lucide-react";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        await connectToDatabase();

        const user = await User.findOne({ email: credentials?.email });
        console.log("Found user:", user);
        if (!user) {
          console.log("No user found");
          return null;
        }

        const passwordMatch = await bcrypt.compare(
          credentials!.password,
          user.password
        );

        if (!passwordMatch) {
          console.log("Password does not match");
          return null;
        }

        // ✅ בדיקת אימות מייל
        if (!user.isVerified) {
          console.log("User not verified");
          throw new Error("EMAIL_NOT_VERIFIED"); // ⬅️ שגיאה מיוחדת
        }

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: String(user.role),
          smsBalance: user.smsBalance,
          smsUsed: user.smsUsed,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.smsBalance = user.smsBalance;
        token.phone = user.phone;
        token.smsUsed = user.smsUsed;
        console.log("====🔑 jwt callback - token after adding role:", token);
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.role = token.role as string;
        session.user.phone = token.phone as string;
        session.user.smsBalance = token.smsBalance as number;
        session.user.smsUsed = token.smsUsed as number;
        session.user.id = token.id as string;
      }
      console.log("🧪 token.smsBalance:", token.smsBalance);
      return session;
    },
  },
};

export default authOptions;
