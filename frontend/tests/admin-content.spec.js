import { test, expect } from '@playwright/test';
import { manager } from './support.js';
test.beforeEach(async ({page}) => manager(page));

async function client(page){
  const state=(await(await page.request.get('/api/auth/session')).json()).data;
  return async(path,method='GET',data)=>{
    const response=await page.request.fetch(`/api${path}`,{method,headers:{'X-CSRF-TOKEN':state.csrf},...(data?{data}:{})});
    expect(response.ok()).toBe(true);
    return response.status()===204?null:(await response.json()).data;
  };
}

test('普通 HTTP 环境可打开产品和业务模块编辑表单',async({page})=>{
  await page.addInitScript(()=>Object.defineProperty(crypto,'randomUUID',{value:undefined,configurable:true}));
  await page.goto('/admin.html#/products');
  await page.getByRole('button',{name:'新增产品',exact:true}).click();
  await expect(page.getByLabel('产品名称')).toBeVisible();
  await page.getByRole('button',{name:'取消',exact:true}).click();
  await page.goto('/admin.html#/page-products');
  await expect(page.getByLabel('淘宝链接',{exact:true})).toBeVisible();
  await expect(page.getByLabel('页面标题',{exact:true})).toHaveCount(0);
});

test('含特殊字符的产品名称保持原文，新增服务在官网技术服务页展示', async ({ page }) => {
  const call=await client(page);
  try {
    await page.goto('/admin.html#/products');
    await page.getByRole('button', { name: '新增产品' }).click();
    await page.getByLabel('产品名称').fill('AT&T GPU');
    await page.getByLabel('产品简介').fill('含特殊字符的产品');
    await page.getByRole('button', { name: '保存产品' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.goto('/');
    await page.getByRole('button', { name: '业务咨询', exact: true }).click();
    await expect(page.getByRole('option', { name: 'AT&T GPU', exact: true })).toHaveCount(1);
    await page.getByRole('button', { name: '关闭弹窗' }).click();
    await page.goto('/admin.html#/services');
    await page.getByRole('button', { name: '新增服务' }).click();
    await page.getByLabel('服务名称').fill('新增演示服务');
    await page.getByLabel('服务简介').fill('这是一段服务简介');
    await page.getByRole('button', { name: '保存服务' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.goto('/');
    const service = page.locator('.service-row').filter({ hasText: '新增演示服务' }).first();
    await expect(service).toBeVisible();
    await expect(service).toContainText('这是一段服务简介');
  } finally {
    const content=await call('/admin/content');
    const product=content.products.find(row=>row.name==='AT&T GPU');
    if(product)await call(`/admin/products/${product.id}?version=${product.version}`,'DELETE');
    const service=content.services.find(row=>row.name==='新增演示服务');
    if(service)await call(`/admin/services/${service.id}?version=${service.version}`,'DELETE');
  }
});

test('删除产品先确认，并在刷新后保留结果', async ({ page }) => {
  await page.goto('/admin.html#/products');
  await page.getByRole('button',{name:'新增产品'}).click();
  await page.getByLabel('产品名称').fill('待删除测试产品');
  await page.getByLabel('产品简介').fill('删除流程验证');
  await page.getByRole('button',{name:'保存产品'}).click();
  const row = page.getByRole('row').filter({ hasText: '待删除测试产品' });
  await row.getByRole('button', { name: '删除' }).click();
  await expect(row).toHaveCount(1);
  await page.getByRole('button', { name: '确认删除' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('row').filter({ hasText: '待删除测试产品' })).toHaveCount(0);
  await page.goto('/#/products');
  await expect(page.getByRole('heading', { name: '待删除测试产品' })).toHaveCount(0);
});

test('同时打开两个后台编辑不同产品，保存不会覆盖另一页的改动', async ({ page, context }) => {
  const call=await client(page);
  const originals=(await call('/admin/content')).products.filter(row=>['通用服务器整机','GPU 服务器整机'].includes(row.name));
  await page.goto('/admin.html#/products');
  await page.getByRole('row').filter({ hasText: '通用服务器整机' }).getByRole('button', { name:'编辑' }).click();
  const other = await context.newPage();
  await other.goto('/admin.html#/products');
  await other.getByRole('row').filter({ hasText: 'GPU 服务器整机' }).getByRole('button', { name:'编辑' }).click();
  await other.getByLabel('产品简介').fill('另一页已保存的 GPU 简介');
  await other.getByRole('button', { name:'保存产品' }).click();
  await expect(other.getByRole('dialog')).toHaveCount(0);
  await page.getByLabel('产品简介').fill('当前页已保存的通用简介');
  await page.getByRole('button', { name:'保存产品' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('另一页已保存的 GPU 简介')).toBeVisible();
  await expect(page.getByText('当前页已保存的通用简介')).toBeVisible();
  for(const original of originals){
    const current=(await call('/admin/content')).products.find(row=>row.id===original.id);
    if(current)await call(`/admin/products/${current.id}`,'PUT',{...current,desc:original.desc});
  }
});
