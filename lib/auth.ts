import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { getUserByEmail } from "@/lib/user";
import { createUser } from "@/lib/user";
import { initializeDefaultCategoriesForUser } from "./category";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await getUserByEmail(credentials.email);
        if (!user) {
          return null;
        }

        const passwordMatch = await compare(
          credentials.password,
          user.password
        );
        if (!passwordMatch) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "google") {
        try {
          // Ensure user exists in your database (find or create)
          let user: any = await getUserByEmail(profile?.email as string);

          if (!user) {
            // If user doesn't exist, create a new one
            user = await createUser({
              name: profile?.name as string,
              email: profile?.email as string,
              isGoogleSignup: true,
            });
            await initializeDefaultCategoriesForUser(user._id.toString());
          }
          return user;
        } catch (error) {
          console.error("Error in Google sign-in callback:", error);
          return false; // Prevent sign in on error
        }
      }
      // For other providers (e.g., credentials), the authorize function
      // already returns the database user object, so we can just return true
      // here to indicate successful authentication.
      return true;
    },
    async jwt({ token, user, account, profile }) {
      if (user) {
        // Ensure user.email is a string before fetching from the database
        if (typeof user.email === "string") {
          // Fetch the user from your database to get the MongoDB _id
          const databaseUser = await getUserByEmail(user.email);
          if (databaseUser) {
            token.id = databaseUser._id.toString(); // Use the MongoDB _id
          } else {
            console.error(
              "Database user not found in jwt callback for email:",
              user.email
            );
            // Optionally, handle this case - maybe return false from signIn or redirect
          }
        } else {
          console.error(
            "User email is not a string in jwt callback:",
            user.email
          );
          // Handle the case where email is not a string if necessary
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "summer-memories-secret",
  debug: process.env.NODE_ENV === "development",
};
