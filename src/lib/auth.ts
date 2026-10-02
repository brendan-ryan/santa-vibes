import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Resend from "next-auth/providers/resend";
import { db } from "@/lib/db";

function emailHtml(url: string) {
  return `<!DOCTYPE html>
<html>
  <body style="font-family:sans-serif;background:#fafafa;margin:0;padding:40px 16px">
    <div style="max-width:420px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e5e7eb">
      <h1 style="color:#b91c1c;font-size:26px;margin:0 0 8px">🎅 Santa Vibes</h1>
      <p style="color:#374151;margin:0 0 24px">Click below to sign in. This link expires in 24 hours.</p>
      <a href="${url}" style="display:inline-block;padding:12px 24px;background:#b91c1c;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">
        Sign in to Santa Vibes
      </a>
      <p style="color:#9ca3af;font-size:12px;margin:24px 0 0">Didn't request this? You can safely ignore it.</p>
    </div>
  </body>
</html>`;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  providers: [
    Resend({
      from: process.env.RESEND_FROM_EMAIL ?? "noreply@example.com",
      sendVerificationRequest: async ({ identifier: email, url }) => {
        // Only send magic links to admin-created accounts
        const user = await db.user.findUnique({ where: { email } });
        if (!user) return;

        if (process.env.NODE_ENV !== "production" || !process.env.RESEND_API_KEY) {
          console.log(`\n🎅 Magic link for ${email}:\n${url}\n`);
          return;
        }

        const { Resend: ResendClient } = await import("resend");
        const client = new ResendClient(process.env.RESEND_API_KEY);
        const { error } = await client.emails.send({
          from: process.env.RESEND_FROM_EMAIL!,
          to: email,
          subject: "Your Santa Vibes sign-in link",
          html: emailHtml(url),
        });
        if (error) throw new Error(error.message);
      },
    }),
  ],
  pages: {
    signIn: "/login",
    verifyRequest: "/login/verify",
  },
  callbacks: {
    session({ session, user }) {
      if (user) {
        session.user.id = user.id;
        session.user.role = user.role;
      }
      return session;
    },
  },
});
