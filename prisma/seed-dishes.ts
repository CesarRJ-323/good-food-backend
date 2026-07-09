import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DISHES = [
  { name: 'Ensalada',       category: 'entrada',  price: 1900, description: 'Mix de verdes, cherry, parmesano y vinagreta',     imageUrl: '/images/ensalada.jpeg?w=1200&q=80' },
  { name: 'Hamburguesa',    category: 'principal', price: 2700, description: 'Carne, cheddar, bacon, aioli y papas',             imageUrl: '/images/hamburguesa.jpeg?w=1200&q=80' },
  { name: 'Crème Brûlée',   category: 'postre',   price: 2300, description: 'Vainilla, costra caramelizada y frutos rojos',      imageUrl: '/images/creme_brulee.jpeg?w=1200&q=80' },
  { name: 'Pasta',          category: 'principal', price: 2100, description: 'Tagliatelle al ragù con queso rallado',             imageUrl: '/images/pasta.jpeg?w=1200&q=80' },
  { name: 'Risotto',        category: 'principal', price: 2400, description: 'Arborio, hongos, parmesano y tomillo',              imageUrl: '/images/risotto.jpeg?w=1200&q=80' },
  { name: 'Salmón',         category: 'principal', price: 3400, description: 'Grelleteado, limón, eneldo y arroz integral',      imageUrl: '/images/salmon.jpeg?w=1200&q=80' },
  { name: 'Tartaleta',      category: 'postre',   price: 2200, description: 'Frutilla, kiwi, mandarina y frutos rojos',         imageUrl: '/images/tartaleta.jpeg?w=1200&q=80' },
  { name: 'Tartare',        category: 'entrada',  price: 2800, description: 'Atún, aguacate, sésamo y salsa ponzu',              imageUrl: '/images/tartare.jpeg?w=1200&q=80' },
];

async function main() {
  // Desactivar plato de prueba si existe
  await prisma.dish.updateMany({ where: { name: 'Milanesa prueba' }, data: { active: false } });

  // Para cada plato: si ya existe por nombre, actualizarlo; si no, crearlo
  for (const dish of DISHES) {
    const existing = await prisma.dish.findFirst({ where: { name: dish.name } });
    if (existing) {
      await prisma.dish.update({
        where: { id: existing.id },
        data: { price: dish.price, description: dish.description, imageUrl: dish.imageUrl, active: true },
      });
      console.log(`Updated: ${dish.name}`);
    } else {
      await prisma.dish.create({ data: { ...dish, active: true } });
      console.log(`Created: ${dish.name}`);
    }
  }

  const count = await prisma.dish.count({ where: { active: true } });
  console.log(`\nSeed completo: ${count} platos activos`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
