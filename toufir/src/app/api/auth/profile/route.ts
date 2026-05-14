import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

const schema = z.object({
  fullName: z.string().min(2).max(80),
  city: z.string().min(2).max(60),
  neighborhood: z.string().max(60).optional(),
  language: z.enum(["ar", "fr", "en"]).optional(),
});

export async function POST(req: Request) {
  const user = await requireUser();
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }
  await prisma.user.update({ where: { id: user.id }, data: parsed.data });
  return NextResponse.json({ ok: true });
}
