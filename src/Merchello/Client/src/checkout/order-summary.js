function toFiniteOrZero(value) {
  return Number.isFinite(value) ? value : 0;
}

export function calculateDiscountDelta(previousDiscount, nextDiscount) {
  const previous = toFiniteOrZero(previousDiscount);
  const next = toFiniteOrZero(nextDiscount);
  return Math.max(next - previous, 0);
}

/**
 * Returns the correct discount amount for display based on tax-inclusive setting.
 * When displayPricesIncTax is true, returns taxInclusiveDisplayDiscount.
 * Falls back to basket discount when tax-inclusive value is not available.
 * @param {boolean} displayPricesIncTax
 * @param {number|undefined|null} taxInclusiveDisplayDiscount
 * @param {number|undefined|null} basketDiscount
 * @returns {number}
 */
export function getEffectiveDiscount(displayPricesIncTax, taxInclusiveDisplayDiscount, basketDiscount) {
  if (displayPricesIncTax) {
    return toFiniteOrZero(taxInclusiveDisplayDiscount) || toFiniteOrZero(basketDiscount);
  }
  return toFiniteOrZero(basketDiscount);
}

