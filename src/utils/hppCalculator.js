export function calculateAverageHpp(currentHpp = 0, currentStock = 0, incomingPrice = 0, incomingQty = 0) {
  const totalStock = currentStock + incomingQty;
  if (totalStock === 0) return 0;

  const currentValue = currentHpp * currentStock;
  const incomingValue = incomingPrice * incomingQty;
  return (currentValue + incomingValue) / totalStock;
}

export function calculateProductionHpp(materials = [], laborCost = 0, overheadCost = 0, outputQuantity = 0) {
  const materialCost = materials.reduce((sum, material) => {
    return sum + (Number(material.quantity) || 0) * (Number(material.unitCost) || 0);
  }, 0);
  const totalCost = materialCost + (Number(laborCost) || 0) + (Number(overheadCost) || 0);
  const quantityProduced = Number(outputQuantity) || 0;

  return {
    materialCost,
    laborCost: Number(laborCost) || 0,
    overheadCost: Number(overheadCost) || 0,
    outputQuantity: quantityProduced,
    totalCost,
    hppPerUnit: quantityProduced > 0 ? totalCost / quantityProduced : 0
  };
}

export function calculateGrossProfit(totalSales = 0, totalHpp = 0) {
  return totalSales - totalHpp;
}
