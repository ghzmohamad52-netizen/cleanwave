import { Prisma, TransactionType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export class InsufficientFundsError extends Error {
  constructor() {
    super("INSUFFICIENT_FUNDS");
  }
}

export async function getBalance(userId: string): Promise<number> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { walletBalance: true } });
  return u ? Number(u.walletBalance) : 0;
}

export async function credit(
  userId: string,
  amount: number,
  type: TransactionType,
  description: string,
  reference?: string
) {
  if (amount <= 0) throw new Error("Credit amount must be positive");
  return prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { walletBalance: { increment: amount } },
    });
    return tx.walletTransaction.create({
      data: {
        userId,
        amount: new Prisma.Decimal(amount),
        type,
        description,
        reference,
      },
    });
  });
}

export async function debit(
  userId: string,
  amount: number,
  type: TransactionType,
  description: string,
  reference?: string
) {
  if (amount <= 0) throw new Error("Debit amount must be positive");
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { walletBalance: true },
    });
    if (!user || Number(user.walletBalance) < amount) {
      throw new InsufficientFundsError();
    }
    await tx.user.update({
      where: { id: userId },
      data: { walletBalance: { decrement: amount } },
    });
    return tx.walletTransaction.create({
      data: {
        userId,
        amount: new Prisma.Decimal(-amount),
        type,
        description,
        reference,
      },
    });
  });
}
