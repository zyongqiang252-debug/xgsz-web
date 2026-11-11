import { test } from 'node:test';
import assert from 'node:assert/strict';
import { orderProducts } from '../src/product-order.js';

test('推荐产品优先排列，同时每个产品只出现一次', () => {
  const products = [
    { id: 'a', productId: 1 },
    { id: 'b', productId: 2 },
    { id: 'c', productId: 3 },
  ];
  const ordered = orderProducts(products, [{ products: [3, 2, 3, 99] }]);
  assert.deepEqual(ordered.map(product => product.id), ['c', 'b', 'a']);
  assert.deepEqual(products.map(product => product.id), ['a', 'b', 'c']);
});

test('没有推荐配置时保留后台产品顺序', () => {
  const products = [{ id: 'a', productId: 1 }, { id: 'b', productId: 2 }];
  assert.deepEqual(orderProducts(products, []), products);
});
