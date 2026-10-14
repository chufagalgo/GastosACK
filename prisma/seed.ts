import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const CATEGORIES = [
  { name: "Comida", emoji: "🍽️" },
  { name: "Transporte", emoji: "🚗" },
  { name: "Material", emoji: "📦" },
  { name: "Alojamiento", emoji: "🏨" },
  { name: "Otros", emoji: "💸" },
];

async function main() {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL }) });

  for (const [position, c] of CATEGORIES.entries()) {
    await db.category.upsert({ where: { name: c.name }, update: {}, create: { ...c, position } });
  }

  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  if (email) {
    const name = process.env.SEED_ADMIN_NAME?.trim() || email;
    await db.member.upsert({ where: { email }, update: { isAdmin: true, active: true }, create: { email, name, isAdmin: true } });
    console.log(`Admin: ${email}`);
  } else {
    console.warn("SEED_ADMIN_EMAIL vacío: no se ha creado ningún admin.");
  }

  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
