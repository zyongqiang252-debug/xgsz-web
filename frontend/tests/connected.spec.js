import { test, expect } from '@playwright/test';

test('官网通过真实接口加载页面', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name:'让每一份算力 释放更大价值' })).toBeVisible();
});

test('真实接口提供数据库中的产品和服务', async ({ request }) => {
  const response = await request.get('/api/public/content');
  expect(response.headers()['content-type']).toContain('application/json');
  expect(response.ok()).toBe(true);
  const { data } = await response.json();
  expect(data.products.length).toBeGreaterThan(0);
  expect(data.services.length).toBeGreaterThan(0);
});
