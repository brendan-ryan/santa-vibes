import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  endpoint: z.string().url(),
  p256dhKey: z.string().min(1),
  authKey: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid subscription data" }, { status: 400 });
  }

  const { endpoint, p256dhKey, authKey } = parsed.data;

  await db.pushSubscription.upsert({
    where: { endpoint },
    create: { userId: session.user.id, endpoint, p256dhKey, authKey },
    update: { userId: session.user.id, p256dhKey, authKey },
  });

  return NextResponse.json({ ok: true });
}
