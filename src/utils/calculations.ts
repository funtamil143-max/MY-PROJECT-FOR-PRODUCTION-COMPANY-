import { Recipe, RawMaterial, ProductionBatch, SaleEntry } from '../types';

/**
 * Calculates the total cost of all raw ingredients in a recipe based on current average costs.
 */
export const calculateIngredientsCost = (recipe: Recipe, materials: RawMaterial[]): number => {
  return recipe.ingredients.reduce((total, ing) => {
    const mat = materials.find((m) => m.id === ing.materialId);
    if (!mat) return total;
    return total + (ing.weightGrams * mat.averageCostPerGram);
  }, 0);
};

/**
 * Calculates the absolute total weight of a recipe (sum of all ingredients).
 * Note: Usually baseBatchSizeGrams is the target weight, but we sum the ingredients to be precise.
 */
export const calculateRecipeTotalWeight = (recipe: Recipe, materials?: RawMaterial[]): number => {
  return recipe.ingredients.reduce((sum, ing) => {
    if (materials) {
      const mat = materials.find((m) => m.id === ing.materialId);
      if (mat) {
        const cat = (mat.category || '').toLowerCase().trim();
        const name = (mat.name || '').toLowerCase().trim();
        if (
          cat.includes('spice') ||
          cat === 'spices' ||
          cat.includes('seasoning') ||
          cat.includes('dair') ||
          cat === 'dairy' ||
          cat.includes('water') ||
          cat === 'liquid' ||
          name === 'water' ||
          name.includes('water')
        ) {
          return sum;
        }
      }
    }
    return sum + ing.weightGrams;
  }, 0);
};

/**
 * Food Cost per Gram = Total Ingredients Cost / Total Ingredients Weight
 */
export const calculateFoodCostPerGram = (recipe: Recipe, materials: RawMaterial[]): number => {
  const totalCost = calculateIngredientsCost(recipe, materials);
  const totalWeight = calculateRecipeTotalWeight(recipe, materials);
  return totalWeight > 0 ? totalCost / totalWeight : 0;
};

/**
 * Labor Cost of a batch = workers * daily wage
 */
export const calculateLaborCost = (recipe: Recipe): number => {
  return recipe.laborWorkersCount * recipe.laborDailyWage;
};

/**
 * Total Batch Cost = Ingredients Cost + Labor Cost + Overhead Cost
 */
export const calculateTotalBatchCost = (recipe: Recipe, materials: RawMaterial[]): number => {
  const ingCost = calculateIngredientsCost(recipe, materials);
  const labor = calculateLaborCost(recipe);
  return ingCost + labor + recipe.overheadCost;
};

/**
 * Calculates packet-wise financials.
 * Standard vs Fully Burdened (including labor/overhead pro-rata)
 */
export interface PacketFinancials {
  foodCost: number;       // Food Cost per Gram * Packet Grams
  pouchCost: number;      // Pouch raw cost
  laborProRata: number;   // (Labor / Batch Weight) * Packet Grams
  overheadProRata: number;// (Overhead / Batch Weight) * Packet Grams
  primeCost: number;      // Food Cost + Pouch Cost
  burdenedCost: number;   // Food + Pouch + Pro-rata Labor + Pro-rata Overhead
  mrp: number;            // Retail Selling Price
  netProfit: number;      // MRP - burdenedCost
  marginPercent: number;  // (netProfit / MRP) * 100
  pricePerKgEquiv: number;// (MRP / Packet Grams) * 1000 (Retail Equivalence)
  theoreticalYield: number;// Total Batch Weight / Packet Grams
}

export const calculatePacketFinancials = (
  recipe: Recipe,
  packSizeGrams: number,
  pouchCost: number,
  mrp: number,
  materials: RawMaterial[],
  unit?: 'gram' | 'kg' | 'liter' | 'pieces' | 'packs' | 'bundle'
): PacketFinancials => {
  const sizeGrams = (unit === 'kg' || unit === 'liter') ? packSizeGrams * 1000 : packSizeGrams;
  const totalWeight = calculateRecipeTotalWeight(recipe, materials);
  const foodCostPerGram = calculateFoodCostPerGram(recipe, materials);
  
  const foodCost = foodCostPerGram * sizeGrams;
  
  const laborTotal = calculateLaborCost(recipe);
  const overheadTotal = recipe.overheadCost;
  
  const laborProRata = totalWeight > 0 ? (laborTotal / totalWeight) * sizeGrams : 0;
  const overheadProRata = totalWeight > 0 ? (overheadTotal / totalWeight) * sizeGrams : 0;
  
  const primeCost = foodCost + pouchCost;
  const burdenedCost = foodCost + pouchCost + laborProRata + overheadProRata;
  
  const netProfit = mrp - burdenedCost;
  const marginPercent = mrp > 0 ? (netProfit / mrp) * 100 : 0;
  
  const pricePerKgEquiv = sizeGrams > 0 ? (mrp / sizeGrams) * 1000 : 0;
  const theoreticalYield = sizeGrams > 0 ? totalWeight / sizeGrams : 0;

  return {
    foodCost,
    pouchCost,
    laborProRata,
    overheadProRata,
    primeCost,
    burdenedCost,
    mrp,
    netProfit,
    marginPercent,
    pricePerKgEquiv,
    theoreticalYield,
  };
};

/**
 * Calculates raw material costs, sales revenue generated from batch products,
 * and the resulting Profit/Loss per batch.
 */
export const calculateBatchFinancials = (
  batch: ProductionBatch,
  recipe: Recipe | undefined,
  materials: RawMaterial[]
) => {
  if (!recipe) {
    return {
      rawMaterialCost: 0,
      salesRevenue: 0,
      profitLoss: 0,
      isProfit: true,
      marginPercent: 0,
    };
  }

  // 1. Raw Material Cost calculation based on recipe ingredient costs scaled to batch size
  const baseIngredientsCost = calculateIngredientsCost(recipe, materials);
  const scaleFactor = recipe.baseBatchSizeGrams > 0 ? (batch.batchSizeGrams / recipe.baseBatchSizeGrams) : 1;
  const rawMaterialCost = baseIngredientsCost * scaleFactor;

  // 2. Sales Revenue generated from products in this batch
  let salesRevenue = 0;

  if (batch.sellingValueTotal !== undefined && batch.sellingValueTotal > 0) {
    salesRevenue = batch.sellingValueTotal;
  } else if (batch.status === 'Packed' && batch.actualYieldPackets && Object.keys(batch.actualYieldPackets).length > 0) {
    Object.entries(batch.actualYieldPackets).forEach(([sizeId, count]) => {
      const sz = recipe.packagingSizes?.find(p => p.id === sizeId);
      if (sz) {
        const unitPrice = sz.wholesalePrice ?? sz.mrp ?? 0;
        salesRevenue += count * unitPrice;
      } else {
        const fallbackRatePerKg = recipe.sellingPricePerKg ?? 250;
        salesRevenue += (batch.batchSizeGrams / 1000) * fallbackRatePerKg;
      }
    });
  } else {
    // For Bulk batches (or un-packed batches), sales revenue is based on bulk produced yield * selling price per kg
    const ratePerKg = recipe.sellingPricePerKg ?? 250;
    const yieldKgRatio = (recipe.producedYieldKg && recipe.baseBatchSizeGrams) 
      ? (recipe.producedYieldKg / (recipe.baseBatchSizeGrams / 1000)) 
      : 1;
    const batchProducedKg = (batch.batchSizeGrams / 1000) * yieldKgRatio;
    salesRevenue = batchProducedKg * ratePerKg;
  }

  // 3. Profit / Loss per Batch = Sales Revenue - Raw Material Cost
  const profitLoss = salesRevenue - rawMaterialCost;
  const isProfit = profitLoss >= 0;
  const marginPercent = salesRevenue > 0 ? (profitLoss / salesRevenue) * 100 : 0;

  return {
    rawMaterialCost,
    salesRevenue,
    profitLoss,
    isProfit,
    marginPercent,
  };
};

/**
 * Calculates detailed production cost including Raw Materials, Oil, Fuel, Labour, and Burden
 */
export const calculateDetailedProductionCost = (
  recipe: Recipe,
  materials: RawMaterial[],
  batchSizeGrams?: number,
  overrideOilUsedLitres?: number,
  overrideOilCostPerLitre?: number,
  overrideFuelCost?: number,
  overrideLabourCost?: number,
  overrideBurdenCost?: number
) => {
  const baseIngredientsCost = calculateIngredientsCost(recipe, materials);
  const scale = (batchSizeGrams && recipe.baseBatchSizeGrams > 0)
    ? (batchSizeGrams / recipe.baseBatchSizeGrams)
    : 1;

  const ingredientsCost = baseIngredientsCost * scale;

  const oilUsedLitres = (overrideOilUsedLitres !== undefined) ? overrideOilUsedLitres : ((recipe.oilUsedLitres || 0) * scale);
  const oilCostPerLitre = (overrideOilCostPerLitre !== undefined) ? overrideOilCostPerLitre : (recipe.oilCostPerLitre || 0);
  const oilCost = oilUsedLitres * oilCostPerLitre;

  const fuelCost = (overrideFuelCost !== undefined) ? overrideFuelCost : ((recipe.fuelCost || 0) * scale);
  const laborCost = (overrideLabourCost !== undefined) ? overrideLabourCost : (calculateLaborCost(recipe) * scale);
  const burdenCost = (overrideBurdenCost !== undefined) ? overrideBurdenCost : ((recipe.otherBurdenCost || recipe.overheadCost || 0) * scale);

  const totalProductionCost = ingredientsCost + oilCost + fuelCost + laborCost + burdenCost;

  const totalWeightKg = (batchSizeGrams ? batchSizeGrams : recipe.baseBatchSizeGrams) / 1000;
  const costPerKg = totalWeightKg > 0 ? totalProductionCost / totalWeightKg : 0;

  return {
    ingredientsCost,
    oilUsedLitres,
    oilCostPerLitre,
    oilCost,
    fuelCost,
    laborCost,
    burdenCost,
    totalProductionCost,
    costPerKg,
  };
};

export interface WarehouseProductStockItem {
  recipeId: string;
  recipeName: string;
  packSizeId: string;
  packSizeGrams: number;
  packSizeLabel: string;
  unit: string;
  producedPacks: number;
  soldPacks: number;
  packedUnitsInStock: number;
  bulkKgProduced: number;
  bulkKgSold: number;
  bulkKgInStock: number;
  mrp: number;
  wholesalePrice: number;
  stockValueMrp: number;
  stockValueWholesale: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  lastProducedDate?: string;
}

export const calculateWarehouseFinishedGoodsStock = (
  recipes: Recipe[],
  batches: ProductionBatch[],
  salesEntries: SaleEntry[] = []
): WarehouseProductStockItem[] => {
  const stockItems: WarehouseProductStockItem[] = [];

  recipes.forEach((recipe) => {
    const sizes = recipe.packagingSizes || [];

    const recipeBatches = batches.filter(
      (b) => b.recipeId === recipe.id && b.status !== 'Cancelled' && b.status !== 'Rejected'
    );

    const recipeSales = salesEntries.filter(
      (s) => s.paymentStatus !== 'Cancelled' && s.items && s.items.length > 0
    );

    sizes.forEach((p) => {
      let producedPacks = 0;
      let lastProducedDate: string | undefined = undefined;

      recipeBatches.forEach((b) => {
        if (b.actualYieldPackets && b.actualYieldPackets[p.id]) {
          producedPacks += b.actualYieldPackets[p.id];
          if (!lastProducedDate || b.date > lastProducedDate) {
            lastProducedDate = b.date;
          }
        }
      });

      let soldPacks = 0;
      recipeSales.forEach((s) => {
        s.items.forEach((item) => {
          if (item.recipeId === recipe.id) {
            const isMatch = item.packSizeId === p.id || (p.grams && item.saleUnit === 'Packs' && item.unitPrice === p.mrp);
            if (isMatch) {
              if (item.saleUnit === 'Bundles') {
                const bundlePacks = item.packsPerBundle || p.packsPerBundle || 10;
                soldPacks += item.quantity * bundlePacks;
              } else if (item.saleUnit === 'Kg') {
                soldPacks += Math.round((item.quantity * 1000) / (p.grams || 50));
              } else {
                soldPacks += item.quantity;
              }
            }
          }
        });
      });

      const packedUnitsInStock = Math.max(0, producedPacks - soldPacks);
      const mrp = p.mrp || 0;
      const wholesalePrice = p.wholesalePrice || mrp * 0.8;
      const stockValueMrp = packedUnitsInStock * mrp;
      const stockValueWholesale = packedUnitsInStock * wholesalePrice;

      let status: 'In Stock' | 'Low Stock' | 'Out of Stock' = 'In Stock';
      if (packedUnitsInStock <= 0) {
        status = 'Out of Stock';
      } else if (packedUnitsInStock <= 25) {
        status = 'Low Stock';
      }

      stockItems.push({
        recipeId: recipe.id,
        recipeName: recipe.name,
        packSizeId: p.id,
        packSizeGrams: p.grams,
        packSizeLabel: p.grams >= 1000 ? `${p.grams / 1000}kg Bag` : `${p.grams}g Pouch`,
        unit: p.unit || 'gram',
        producedPacks,
        soldPacks,
        packedUnitsInStock,
        bulkKgProduced: 0,
        bulkKgSold: 0,
        bulkKgInStock: 0,
        mrp,
        wholesalePrice,
        stockValueMrp,
        stockValueWholesale,
        status,
        lastProducedDate,
      });
    });
  });

  return stockItems;
};


