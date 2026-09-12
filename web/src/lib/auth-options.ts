import { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.log("GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing. Development login will be active.");
}

const providers: any[] = [
  GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID || "dummy",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "dummy",
  }),
];

if (process.env.NODE_ENV !== "production") {
  providers.push(
    CredentialsProvider({
      name: "Development Login",
      credentials: {
        email: { label: "Email", type: "text", placeholder: "organizer@vibecheck.com" }
      },
      async authorize(credentials) {
        if (credentials?.email) {
          return { id: credentials.email, email: credentials.email, name: credentials.email.split("@")[0] };
        }
        return null;
      }
    })
  );
}

export const authOptions: AuthOptions = {
  providers,
  callbacks: {
    async signIn({ user }) {
      if (user?.email) {
        try {
          const backendUrl = process.env.BACKEND_URL || "http://localhost:4000";
          const token = process.env.PRIVATE_BACKEND_TOKEN || "";
          await fetch(`${backendUrl}/api/user`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { "Authorization": `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
              email: user.email,
              name: user.name || user.email.split("@")[0],
              image: user.image || null,
              categories: []
            })
          });
        } catch (err) {
          console.error("[NextAuth] Failed to auto-create web_user on signIn:", err);
        }
      }
      return true;
    },
    async session({ session, token }) {
      if (session.user) {
        if (token.email) session.user.email = token.email;
        if (token.picture) session.user.image = token.picture as string;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email;
        if (user.image) token.picture = user.image;
      }
      return token;
    }
  },
  secret: process.env.NEXTAUTH_SECRET || "development-secret",
  debug: false,
};
