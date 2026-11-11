export function orderProducts(products, recommendations) {
  const order = new Map();
  for (const group of recommendations || []) {
    for (const id of group.products || []) {
      if (!order.has(id)) order.set(id, order.size);
    }
  }
  return [...products].sort((first, second) =>
    (order.get(first.productId) ?? Infinity) - (order.get(second.productId) ?? Infinity)
  );
}
