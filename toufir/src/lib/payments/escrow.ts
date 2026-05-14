import { Prisma, PaymentStatus, DealStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { credit } from "./wallet";

// Escrow flow:
// 1. Order created -> PENDING
// 2. Card/wallet captured -> HELD_IN_ESCROW + deal.currentCount++
// 3. Deal reaches threshold -> deal.status = ACTIVATED
// 4. Customer scans pickup QR at agent -> RELEASED (funds settle to supplier wallet)
// 5. Deal expires below threshold -> REFUNDED to all participants

export async function holdInEscrow(orderId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.update({
      where: { id: orderId },
      data: { paymentStatus: PaymentStatus.HELD_IN_ESCROW },
      include: { deal: true },
    });

    const deal = await tx.deal.update({
      where: { id: order.dealId },
      data: { currentCount: { increment: order.quantity } },
    });

    if (deal.currentCount >= deal.minParticipants && deal.status === DealStatus.OPEN) {
      await tx.deal.update({
        where: { id: deal.id },
        data: { status: DealStatus.ACTIVATED },
      });
    }
    return order;
  });
}

export async function releaseEscrow(orderId: string) {
  // Move funds from escrow to supplier's wallet (minus commission).
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { deal: { include: { supplier: true } } },
    });
    if (order.paymentStatus !== PaymentStatus.HELD_IN_ESCROW) {
      throw new Error(`Cannot release order in status ${order.paymentStatus}`);
    }

    const supplierUser = await tx.user.findFirst({
      where: { phone: order.deal.supplier.contactPhone },
    });

    const amount = Number(order.totalAmount);
    const commission = (amount * order.deal.supplier.commissionPct) / 100;
    const netToSupplier = amount - commission;

    await tx.order.update({
      where: { id: order.id },
      data: { paymentStatus: PaymentStatus.RELEASED },
    });

    if (supplierUser) {
      await tx.user.update({
        where: { id: supplierUser.id },
        data: { walletBalance: { increment: netToSupplier } },
      });
      await tx.walletTransaction.create({
        data: {
          userId: supplierUser.id,
          amount: new Prisma.Decimal(netToSupplier),
          type: "PURCHASE",
          reference: order.id,
          description: `Sale released for deal ${order.dealId}`,
        },
      });
    }

    if (order.deal.agentId) {
      const agentCommission = commission * 0.4; // 40% of platform commission goes to agent
      await tx.user.update({
        where: { id: order.deal.agentId },
        data: { walletBalance: { increment: agentCommission } },
      });
      await tx.walletTransaction.create({
        data: {
          userId: order.deal.agentId,
          amount: new Prisma.Decimal(agentCommission),
          type: "COMMISSION",
          reference: order.id,
          description: `Agent commission for order ${order.id}`,
        },
      });
    }

    return order;
  });
}

export async function refundExpiredDeal(dealId: string) {
  return prisma.$transaction(async (tx) => {
    const deal = await tx.deal.update({
      where: { id: dealId },
      data: { status: DealStatus.EXPIRED },
      include: { orders: true },
    });
    for (const order of deal.orders) {
      if (
        order.paymentStatus === PaymentStatus.HELD_IN_ESCROW ||
        order.paymentStatus === PaymentStatus.PENDING
      ) {
        await tx.order.update({
          where: { id: order.id },
          data: { paymentStatus: PaymentStatus.REFUNDED },
        });
        // Refund to wallet (card refunds handled separately via CMI void).
        await tx.user.update({
          where: { id: order.userId },
          data: { walletBalance: { increment: order.totalAmount } },
        });
        await tx.walletTransaction.create({
          data: {
            userId: order.userId,
            amount: order.totalAmount,
            type: "REFUND",
            reference: order.id,
            description: `Refund for expired deal ${dealId}`,
          },
        });
      }
    }
    return deal;
  });
}

export { credit };
