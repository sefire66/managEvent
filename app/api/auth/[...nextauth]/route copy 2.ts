// app/api/auth/[...nextauth]/route.ts

import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcrypt";

const handler = NextAuth({
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
        console.log("Found user:", user); // 🔍 log result from DB
        if (!user) {
          console.log("No user found");
          return null;
        }

        const passwordMatch = await bcrypt.compare(
          credentials!.password,
          user.password
        );

        console.log("Password match?", passwordMatch); // 🔍 log password result

        if (!passwordMatch) {
          console.log("Password does not match");
          return null;
        }

        // ✅ return minimal user object
        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: String(user.role), // מוסיף את ה-role לטוקן
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login", // optional
  },
});

export { handler as GET, handler as POST };
