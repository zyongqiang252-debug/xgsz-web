import { test, expect } from '@playwright/test';

test('官网可浏览全部主栏目并按产品类别筛选', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '让每一份算力 释放更大价值' })).toBeVisible();
  await page.getByRole('navigation', { name: '主导航' }).getByRole('link', { name: '产品中心' }).click();
  await expect(page.getByRole('heading', { name: '为业务找到合适的算力' })).toBeVisible();
  await page.getByRole('tab', { name: '国产算力' }).click();
  await expect(page.locator('#product-grid').getByRole('article')).toHaveCount(1);
  await page.getByRole('button', { name: '了解配置' }).click();
  await expect(page.getByRole('dialog', { name: '国产卡服务器整机' })).toBeVisible();
  await page.getByRole('button', { name: '关闭弹窗' }).click();
  for (const [name, title] of [['技术服务', '从部署到运维，全程为算力护航'], ['招商合作', '与芯光同行，共拓算力新机遇'], ['关于我们', '以芯为基，让数智生长']]) {
    await page.getByRole('navigation', { name: '主导航' }).getByRole('link', { name }).click();
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
  }
});

test('需求真实提交到服务器，拒绝无效提交并能导出回执', async ({ page }) => {
  await page.goto('/#/partners');
  await page.getByRole('button', { name: '申请成为合作伙伴' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('提交后，您的联系信息与需求将保存到芯光智数业务后台，用于本次业务沟通。')).toBeVisible();
  await dialog.getByRole('button', { name: '提交需求' }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('您的称呼').fill('测试联系人');
  await dialog.getByLabel('联系电话').fill('13800138000');
  await dialog.getByLabel('公司名称').fill('演示企业');
  await dialog.getByLabel('需求描述').fill('需要国产算力服务器方案');
  await dialog.getByLabel('我同意将填写的信息用于本次业务联系').check();
  await dialog.getByRole('button', { name: '提交需求' }).click();
  await expect(dialog.getByText('需求已提交')).toBeVisible();
  const download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: '导出提交回执' }).click();
  expect((await download).suggestedFilename()).toMatch(/芯光智数.*\.json/);
});

test('手机导航可用，页面没有横向溢出', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: '打开导航' }).click();
  await page.getByRole('navigation', { name: '主导航' }).getByRole('link', { name: '产品中心' }).click();
  await expect(page.getByRole('heading', { name: '为业务找到合适的算力' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('键盘跳过导航后保留页面，并能聚焦主要内容', async ({ page }) => {
  await page.goto('/#/products');
  await expect(page.getByRole('heading', {name:'为业务找到合适的算力'})).toBeVisible();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: '为业务找到合适的算力' })).toBeVisible();
  await expect(page.locator('#main')).toBeFocused();
});

test('各页面在手机、平板和桌面尺寸下资源正常且不横向溢出', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['/', '/products', '/services', '/partners', '/about', '/contact']) {
      await page.goto(`/#${route}`);
      await expect(page.locator('#main')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route} at ${width}px`).toBe(true);
    }
  }
  expect(errors).toEqual([]);
});

test('从产品详情转入咨询仍锁定背景，且电话必须含有效数字', async ({ page }) => {
  await page.goto('/#/products?category=domestic');
  await page.getByRole('button', { name: '了解配置' }).click();
  await page.getByRole('button', { name: '咨询整机方案' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: '聊聊您的需求' })).toBeVisible();
  await expect(page.locator('body')).toHaveClass(/modal-open/);
  await dialog.getByLabel('您的称呼').fill('测试');
  await dialog.getByLabel('公司名称').fill('测试企业');
  await dialog.getByLabel('需求描述').fill('整机咨询');
  await dialog.getByLabel('联系电话').fill('+++++++');
  await dialog.getByLabel('我同意将填写的信息用于本次业务联系').check();
  await dialog.getByRole('button', { name: '提交需求' }).click();
  await expect(dialog.getByRole('heading', { name: '聊聊您的需求' })).toBeVisible();
});
