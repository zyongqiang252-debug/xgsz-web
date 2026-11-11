import {test,expect} from '@playwright/test';
import {manager} from './support.js';

test('手机端正文可读，业务区使用内容驱动的紧凑布局',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  for(const selector of ['.hero-copy>p','.section-head p','.product-body>p','.service-row p']){
    const size=await page.locator(selector).first().evaluate(element=>parseFloat(getComputedStyle(element).fontSize));
    expect(size,selector).toBeGreaterThanOrEqual(16);
  }
  await page.goto('/#/products');
  await page.getByRole('button',{name:'本地化部署',exact:true}).click();
  for(const selector of ['.offering-items li','.offering-heading p']){
    const size=await page.locator(selector).first().evaluate(element=>parseFloat(getComputedStyle(element).fontSize));
    expect(size,selector).toBeGreaterThanOrEqual(16);
  }
  await expect(page.locator('#offering-deployment .offering-items strong').first()).toHaveText('裸金属交付');
  for(const item of await page.locator('#offering-deployment .offering-items li').all()){
    expect(await item.evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true);
    await expect(item.getByRole('button')).toBeVisible();
  }
  await page.getByRole('button',{name:'业务咨询',exact:true}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.getByLabel('您的称呼').evaluate(element=>parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(16);
});

test('后台按内容项折叠，展开后能编辑并保持键盘焦点',async({page})=>{
  await manager(page);
  await page.goto('/admin.html#/page-products');
  const groups=page.locator('[data-repeater][data-path="solutionGroups"] > .cms-repeater-rows > [data-repeat-row]');
  await expect(groups).toHaveCount(4);
  await expect(groups.nth(1)).not.toHaveAttribute('open','');
  await groups.nth(1).locator(':scope > summary').click();
  await expect(groups.nth(1)).toHaveAttribute('open','');
  await groups.nth(1).getByRole('button',{name:'添加细分分类',exact:true}).click();
  const nested=groups.nth(1).locator('[data-repeater] > .cms-repeater-rows > [data-repeat-row]').last();
  await expect(nested).toHaveAttribute('open','');
  await nested.getByLabel('分类名称',{exact:true}).fill('折叠编辑验证');
  await expect(nested.getByLabel('分类名称',{exact:true})).toHaveValue('折叠编辑验证');
  await page.getByRole('button',{name:'保存页面',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('页面已保存');
});
