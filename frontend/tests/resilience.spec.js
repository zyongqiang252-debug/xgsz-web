import { test,expect } from '@playwright/test';
import { manager } from './support.js';

test('同一产品并行修改显示冲突，保留表单并拒绝覆盖已保存内容',async({page,context})=>{
  await manager(page);
  await page.goto('/admin.html#/products');
  await page.getByRole('row').filter({hasText:'通用服务器整机'}).getByRole('button',{name:'编辑'}).click();
  const other=await context.newPage();await other.goto('/admin.html#/products');
  await other.getByRole('row').filter({hasText:'通用服务器整机'}).getByRole('button',{name:'编辑'}).click();
  await other.getByLabel('产品简介').fill('先保存的版本');await other.getByRole('button',{name:'保存产品'}).click();
  await page.getByLabel('产品简介').fill('应被拒绝的旧版本');await page.getByRole('button',{name:'保存产品'}).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('已被其他页面修改');
  await expect(page.getByLabel('产品简介')).toHaveValue('应被拒绝的旧版本');
  await page.reload();await expect(page.getByText('先保存的版本')).toBeVisible();
});

test('提交失败保留需求输入并允许重试，不展示成功回执',async({page})=>{
  await page.route('**/api/public/inquiries',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({code:503,message:'服务暂不可用，请稍后重试'})}));
  await page.goto('/#/partners');await page.getByRole('button',{name:'申请成为合作伙伴'}).click();
  await page.getByLabel('您的称呼').fill('失败流程测试');await page.getByLabel('联系电话').fill('13800138000');
  await page.getByLabel('公司名称').fill('测试企业');await page.getByLabel('需求描述').fill('保留此段输入');
  await page.getByLabel('我同意将填写的信息用于本次业务联系').check();await page.getByRole('button',{name:'提交需求'}).click();
  await expect(page.getByRole('alert')).toContainText('服务暂不可用');
  await expect(page.getByLabel('需求描述')).toHaveValue('保留此段输入');
  await expect(page.getByRole('button',{name:'提交需求'})).toBeEnabled();
  await expect(page.getByRole('heading',{name:'需求已提交'})).toHaveCount(0);
});
