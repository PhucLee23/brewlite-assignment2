-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Topping" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,

    CONSTRAINT "Topping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ingredient" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "stock" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "scalesWithSize" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductIngredient" (
    "productId" INTEGER NOT NULL,
    "ingredientId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,

    CONSTRAINT "ProductIngredient_pkey" PRIMARY KEY ("productId","ingredientId")
);

-- CreateTable
CREATE TABLE "ToppingIngredient" (
    "toppingId" INTEGER NOT NULL,
    "ingredientId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,

    CONSTRAINT "ToppingIngredient_pkey" PRIMARY KEY ("toppingId","ingredientId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Topping_name_key" ON "Topping"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Ingredient_name_key" ON "Ingredient"("name");

-- AddForeignKey
ALTER TABLE "ProductIngredient" ADD CONSTRAINT "ProductIngredient_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductIngredient" ADD CONSTRAINT "ProductIngredient_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToppingIngredient" ADD CONSTRAINT "ToppingIngredient_toppingId_fkey" FOREIGN KEY ("toppingId") REFERENCES "Topping"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToppingIngredient" ADD CONSTRAINT "ToppingIngredient_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

