import { PrismaClient, Role, DealStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding…");

  const supplier = await prisma.supplier.upsert({
    where: { ice: "002345678000099" },
    update: {},
    create: {
      businessName: "Coopérative Atlas",
      ice: "002345678000099",
      contactPhone: "+212600000001",
      city: "Marrakech",
      isApproved: true,
      commissionPct: 5.0,
    },
  });

  const agent = await prisma.user.upsert({
    where: { phone: "+212600000002" },
    update: {},
    create: {
      phone: "+212600000002",
      fullName: "Hassan Bennani",
      role: Role.AGENT,
      city: "Casablanca",
      neighborhood: "Maarif",
      isVerified: true,
      language: "fr",
    },
  });

  await prisma.pickupPoint.upsert({
    where: { agentId: agent.id },
    update: {},
    create: {
      agentId: agent.id,
      name: "Hanout Hassan",
      address: "Rue Tata, Maarif",
      city: "Casablanca",
      neighborhood: "Maarif",
      lat: 33.5862,
      lng: -7.6249,
      phone: agent.phone,
      openHours: "9h-22h",
    },
  });

  const products = await Promise.all([
    prisma.product.upsert({
      where: { id: "seed_olive_oil_5l" },
      update: {},
      create: {
        id: "seed_olive_oil_5l",
        supplierId: supplier.id,
        nameAr: "زيت زيتون بكر 5 لتر",
        nameFr: "Huile d'olive extra vierge 5L",
        nameEn: "Extra virgin olive oil 5L",
        descriptionAr: "زيت زيتون مغربي أصيل، إنتاج 2024، عصرة على البارد.",
        descriptionFr: "Huile d'olive marocaine, récolte 2024, première pression à froid.",
        category: "Épicerie",
        images: [
          "https://images.unsplash.com/photo-1601001815853-3835274403b6?w=800",
        ],
        retailPrice: 320,
        unit: "5L",
      },
    }),
    prisma.product.upsert({
      where: { id: "seed_argan_1l" },
      update: {},
      create: {
        id: "seed_argan_1l",
        supplierId: supplier.id,
        nameAr: "زيت أركان أصلي 1 لتر",
        nameFr: "Huile d'argan cosmétique 1L",
        nameEn: "Argan oil cosmetic 1L",
        descriptionAr: "100% أركان طبيعي من سوس.",
        descriptionFr: "100% argan du Souss, certifié.",
        category: "Cosmétique",
        images: [
          "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800",
        ],
        retailPrice: 480,
        unit: "1L",
      },
    }),
    prisma.product.upsert({
      where: { id: "seed_dates_5kg" },
      update: {},
      create: {
        id: "seed_dates_5kg",
        supplierId: supplier.id,
        nameAr: "تمر مجهول 5 كيلو",
        nameFr: "Dattes Mejhoul 5kg",
        nameEn: "Mejhoul dates 5kg",
        descriptionAr: "تمر مجهول فاخر من واحة تافيلالت.",
        descriptionFr: "Dattes Mejhoul premium du Tafilalet.",
        category: "Épicerie",
        images: [
          "https://images.unsplash.com/photo-1609501676725-7186f017a4b7?w=800",
        ],
        retailPrice: 550,
        unit: "5kg",
      },
    }),
  ]);

  const inSevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const inTenDays = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);

  for (const product of products) {
    await prisma.deal.upsert({
      where: { id: `seed_deal_${product.id}` },
      update: {},
      create: {
        id: `seed_deal_${product.id}`,
        productId: product.id,
        supplierId: supplier.id,
        agentId: agent.id,
        groupPrice: Number(product.retailPrice) * 0.72,
        minParticipants: 10,
        maxParticipants: 30,
        currentCount: Math.floor(Math.random() * 9),
        pickupLocation: "Hanout Hassan — Maarif",
        pickupLat: 33.5862,
        pickupLng: -7.6249,
        pickupDate: inTenDays,
        closesAt: inSevenDays,
        status: DealStatus.OPEN,
      },
    });
  }

  console.log("✓ Seeded supplier, agent, 3 products, 3 open deals.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
