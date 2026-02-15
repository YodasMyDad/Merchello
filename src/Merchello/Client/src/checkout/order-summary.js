function toFiniteOrZero(value) {
  return Number.isFinite(value) ? value : 0;
}

export function calculateDiscountDelta(previousDiscount, nextDiscount) {
  const previous = toFiniteOrZero(previousDiscount);
  const next = toFiniteOrZero(nextDiscount);
  return Math.max(next - previous, 0);
}

