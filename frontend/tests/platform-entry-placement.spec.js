import { test, expect } from '@playwright/test';

test('首页与产品中心的线上平台入口位于指定区域', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#/');
  const homeLinks = page.locator('.home-platforms .platform-links');
  await expect(homeLinks.getByRole('link', { name: '淘宝入口' })).toBeVisible();
  await expect(homeLinks.getByRole('link', { name: '抖音入口' })).toBeVisible();
  await expect(page.locator('.products-section .section-head-links .platform-links')).toHaveCount(0);
  const homeHeading = await page.locator('.products-section .section-head').boundingBox();
  const homePlatforms = await homeLinks.boundingBox();
  expect(homePlatforms.y).toBeGreaterThan(homeHeading.y + homeHeading.height);

  await page.goto('/#/products');
  const productsHero = page.locator('.subhero .subhero-platforms .platform-links');
  await expect(productsHero.getByRole('link', { name: '淘宝入口' })).toBeVisible();
  await expect(productsHero.getByRole('link', { name: '抖音入口' })).toBeVisible();
  await expect(page.locator('.offerings-platforms')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/products');
  await expect(page.locator('.subhero .subhero-platforms .platform-links').getByRole('link', { name: '淘宝入口' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
