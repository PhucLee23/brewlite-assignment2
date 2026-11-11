// Dữ liệu mẫu. Dùng upsert nên chạy lại an toàn; không ghi đè tồn kho nguyên liệu đã có (ADR-003).
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const products = [
  { id: 1, name: 'Espresso', price: 25000, image: 'espresso', description: 'Một shot cà phê đậm đặc, lớp crema dày.' },
  { id: 2, name: 'Cà phê sữa đá', price: 29000, image: 'ca-phe-sua', description: 'Cà phê phin với sữa đặc, vị truyền thống.' },
  { id: 3, name: 'Bạc xỉu', price: 32000, image: 'bac-xiu', description: 'Nhiều sữa, ít cà phê, ngọt dịu.' },
  { id: 4, name: 'Cold brew', price: 45000, image: 'cold-brew', description: 'Ủ lạnh 18 giờ, mỗi ngày chỉ có vài phần.' },
  { id: 5, name: 'Latte', price: 45000, image: 'latte', description: 'Espresso với sữa tươi đánh nóng.' },
  { id: 6, name: 'Cappuccino', price: 45000, image: 'cappuccino', description: 'Espresso, sữa nóng và lớp bọt sữa dày.' },
  { id: 7, name: 'Trà đào cam sả', price: 39000, image: 'tra-dao', description: 'Trà đen, đào miếng, cam và sả tươi.' },
  { id: 8, name: 'Trà vải lài', price: 39000, image: 'tra-vai-lai', description: 'Trà hoa lài với vải thiều, thanh mát.' },
  { id: 9, name: 'Matcha latte', price: 49000, image: 'matcha', description: 'Matcha Nhật pha sữa tươi.' },
  { id: 10, name: 'Trà bưởi hồng', price: 45000, image: 'tra-buoi-hong', description: 'Trà trái cây với bưởi hồng, vị chua ngọt.' },
  { id: 11, name: 'Americano', price: 35000, image: 'americano', description: 'Espresso pha loãng với nước nóng, thanh và nhẹ.' },
  { id: 12, name: 'Americano cam', price: 42000, image: 'americano-cam', description: 'Americano pha nước cam tươi, chua nhẹ và thơm.' },
  { id: 13, name: 'Latte caramel muối', price: 52000, image: 'latte-caramel-muoi', description: 'Latte với sốt caramel và chút muối biển, ngọt mặn hài hòa.' },
  { id: 14, name: 'Trà xoài chanh dây', price: 42000, image: 'tra-xoai-chanh-day', description: 'Trà trái cây với xoài chín và chanh dây.' },
  { id: 15, name: 'Trà sữa oolong', price: 42000, image: 'tra-sua-oolong', description: 'Trà oolong rang với sữa tươi, béo thơm.' },
];

const toppings = [
  { name: 'Trân châu đen', price: 8000 },
  { name: 'Thạch cà phê', price: 7000 },
  { name: 'Kem cheese', price: 10000 },
  { name: 'Shot espresso', price: 12000 },
  { name: 'Pudding trứng', price: 8000 },
];

// Tồn ban đầu của nguyên liệu (ADR-011). Cold brew ủ sẵn 1.000 ml, mỗi ly S 200 ml nên chỉ còn 5 ly S, 4 ly M,
// 3 ly L để thử giới hạn tồn kho; tép bưởi hồng đã hết nên Trà bưởi hồng hiện "Hết hàng" (FR-02)
const ingredients = [
  { name: 'Hạt espresso', unit: 'g', stock: 2000 },
  { name: 'Cà phê phin', unit: 'g', stock: 2500 },
  { name: 'Cold brew ủ sẵn', unit: 'ml', stock: 1000 },
  { name: 'Sữa đặc', unit: 'ml', stock: 3000 },
  { name: 'Sữa tươi', unit: 'ml', stock: 10000 },
  { name: 'Bột matcha', unit: 'g', stock: 160 },
  { name: 'Trà đen', unit: 'g', stock: 250 },
  { name: 'Trà lài', unit: 'g', stock: 250 },
  { name: 'Trà oolong', unit: 'g', stock: 360 },
  { name: 'Đào ngâm', unit: 'g', stock: 3000 },
  { name: 'Vải ngâm', unit: 'g', stock: 2500 },
  { name: 'Mứt xoài chanh dây', unit: 'ml', stock: 2000 },
  { name: 'Tép bưởi hồng', unit: 'g', stock: 0 },
  { name: 'Nước cam', unit: 'ml', stock: 5000 },
  { name: 'Sốt caramel', unit: 'ml', stock: 800 },
  { name: 'Đường nước', unit: 'ml', stock: 3000 },
  { name: 'Ly nhựa', unit: 'cái', stock: 500, scalesWithSize: false },
  { name: 'Trân châu đen', unit: 'g', stock: 2000 },
  { name: 'Kem cheese', unit: 'g', stock: 1500 },
  { name: 'Thạch cà phê', unit: 'g', stock: 2000 },
  { name: 'Pudding trứng', unit: 'g', stock: 1800 },
];

// Công thức 1 ly size S theo id món; size M, L dùng 125%, 150% (BR-09)
const recipes: Record<number, Record<string, number>> = {
  1: { 'Hạt espresso': 18, 'Ly nhựa': 1 },
  2: { 'Cà phê phin': 25, 'Sữa đặc': 30, 'Ly nhựa': 1 },
  3: { 'Cà phê phin': 15, 'Sữa đặc': 40, 'Sữa tươi': 60, 'Ly nhựa': 1 },
  4: { 'Cold brew ủ sẵn': 200, 'Ly nhựa': 1 },
  5: { 'Hạt espresso': 18, 'Sữa tươi': 200, 'Ly nhựa': 1 },
  6: { 'Hạt espresso': 18, 'Sữa tươi': 150, 'Ly nhựa': 1 },
  7: { 'Trà đen': 5, 'Đào ngâm': 60, 'Nước cam': 20, 'Đường nước': 20, 'Ly nhựa': 1 },
  8: { 'Trà lài': 5, 'Vải ngâm': 50, 'Đường nước': 20, 'Ly nhựa': 1 },
  9: { 'Bột matcha': 4, 'Sữa tươi': 200, 'Ly nhựa': 1 },
  10: { 'Trà đen': 5, 'Tép bưởi hồng': 50, 'Đường nước': 20, 'Ly nhựa': 1 },
  11: { 'Hạt espresso': 18, 'Ly nhựa': 1 },
  12: { 'Hạt espresso': 18, 'Nước cam': 100, 'Ly nhựa': 1 },
  13: { 'Hạt espresso': 18, 'Sữa tươi': 180, 'Sốt caramel': 20, 'Ly nhựa': 1 },
  14: { 'Trà đen': 5, 'Mứt xoài chanh dây': 40, 'Đường nước': 20, 'Ly nhựa': 1 },
  15: { 'Trà oolong': 6, 'Sữa tươi': 150, 'Đường nước': 20, 'Ly nhựa': 1 },
};

// Một phần topping, không đổi theo size
const toppingRecipes: Record<string, Record<string, number>> = {
  'Trân châu đen': { 'Trân châu đen': 50 },
  'Thạch cà phê': { 'Thạch cà phê': 50 },
  'Kem cheese': { 'Kem cheese': 30 },
  'Shot espresso': { 'Hạt espresso': 18 },
  'Pudding trứng': { 'Pudding trứng': 60 },
};

async function main() {
  // Chỉ cập nhật thông tin nguyên liệu, giữ nguyên tồn kho hiện tại
  const ingredientId = new Map<string, number>();
  for (const { stock, ...info } of ingredients) {
    const row = await prisma.ingredient.upsert({ where: { name: info.name }, update: info, create: { ...info, stock } });
    ingredientId.set(info.name, row.id);
  }
  const recipeRows = (recipe: Record<string, number>) =>
    Object.entries(recipe).map(([name, amount]) => {
      const id = ingredientId.get(name);
      if (!id) throw new Error(`Công thức dùng nguyên liệu chưa khai báo: ${name}`);
      return { ingredientId: id, amount };
    });

  for (const { id, name, price, image, description } of products) {
    const imageUrl = `/images/${image}.jpg`;
    await prisma.product.upsert({
      where: { id },
      update: { name, price, description, imageUrl },
      create: { id, name, price, description, imageUrl },
    });
    // Ghi lại toàn bộ công thức để sửa công thức trong file này có hiệu lực ở lần seed sau
    await prisma.productIngredient.deleteMany({ where: { productId: id } });
    await prisma.productIngredient.createMany({ data: recipeRows(recipes[id]).map((r) => ({ ...r, productId: id })) });
  }
  // Id được gán tay ở trên, đồng bộ lại sequence để lần thêm sau không trùng khóa
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"Product"', 'id'), (SELECT MAX(id) FROM "Product"))`,
  );

  for (const t of toppings) {
    const topping = await prisma.topping.upsert({ where: { name: t.name }, update: { price: t.price }, create: t });
    await prisma.toppingIngredient.deleteMany({ where: { toppingId: topping.id } });
    await prisma.toppingIngredient.createMany({
      data: recipeRows(toppingRecipes[t.name]).map((r) => ({ ...r, toppingId: topping.id })),
    });
  }
  console.log(`Seed xong: ${products.length} món, ${ingredients.length} nguyên liệu, ${toppings.length} topping`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
