import { test, expect } from '@playwright/test';
import { manager } from './support.js';

test('小程序体验已移除，旧链接回首页且咨询回执保留', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: '小程序体验' })).toHaveCount(0);
  await expect(page.locator('a[href="#/mini"]')).toHaveCount(0);

  const publicContent = await (await page.request.get('/api/public/content')).json();
  expect(publicContent.data.pages.mini).toBeUndefined();

  await page.goto('/#/mini');
  await expect(page.getByRole('heading', { name: '让每一份算力 释放更大价值' })).toBeVisible();
  await expect(page.locator('.site-header, .site-footer')).toHaveCount(2);
  await expect(page.locator('.mini-stage')).toHaveCount(0);
  await expect(page.getByText('我的需求单')).toHaveCount(0);
  await expect(page.getByText('算力服务，随时了解')).toHaveCount(0);

  await manager(page);
  const definitions = await (await page.request.get('/api/admin/cms')).json();
  expect(definitions.data.pages.mini).toBeUndefined();
  await expect(page.request.get('/api/admin/pages/mini')).resolves.toHaveProperty('status');
  expect((await page.request.get('/api/admin/pages/mini')).status()).toBe(404);

  const visitor = await context.newPage();
  await visitor.goto('/#/partners');
  await visitor.getByRole('button', { name: '申请成为合作伙伴' }).click();
  const dialog = visitor.getByRole('dialog');
  await dialog.getByLabel('您的称呼').fill('移除原型验收');
  await dialog.getByLabel('联系电话').fill('13800138000');
  await dialog.getByLabel('公司名称').fill('验收公司');
  await dialog.getByLabel('需求描述').fill('确认咨询提交与回执导出未受影响');
  await dialog.getByLabel('我同意将填写的信息用于本次业务联系').check();
  await dialog.getByRole('button', { name: '提交需求' }).click();
  await expect(dialog.getByText('需求已提交')).toBeVisible();
  await expect(dialog.getByRole('button', { name: '导出提交回执' })).toBeVisible();
  await expect(dialog.getByRole('link', { name: '查看我的需求' })).toHaveCount(0);
  await visitor.close();
});
