import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import type { Role } from "@prisma/client";

const COOKIE = "toufir_uid";

export const getSession = cache(async () => {
  const uid = cookies().get(COOKIE)?.value;
  if (!uid) return null;
  const user = await prisma.user.findUnique({ where: { id: uid } });
  return user;
});

export async function requireUser() {
  const user = await getSession();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(role: Role | Role[]) {
  const user = await requireUser();
  const allowed = Array.isArray(role) ? role : [role];
  if (!allowed.includes(user.role)) redirect("/");
  return user;
}
