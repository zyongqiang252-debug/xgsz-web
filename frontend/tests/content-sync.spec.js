import {test,expect} from '@playwright/test';
import {manager} from './support.js';

async function client(page){
  const state=(await(await page.request.get('/api/auth/session')).json()).data;
  return async(path,method='GET',data)=>{
    const response=await page.request.fetch(`/api${path}`,{method,headers:{'X-CSRF-TOKEN':state.csrf},...(data?{data}:{})});
    expect(response.ok(),`${method} ${path}: ${await response.text()}`).toBe(true);
    return (await response.json()).data;
  };
}

test('后台新增修改和上下架自动更新已打开的官网，保留筛选和咨询输入',async({page,context})=>{
  await manager(page);const call=await client(page);const visitor=await context.newPage();
  await visitor.goto('/#/products');await visitor.getByRole('tab',{name:'GPU 服务器',exact:true}).click();
  let product;
  try{
    await page.goto('/admin.html#/products');await page.getByRole('button',{name:'新增产品',exact:true}).click();
    await page.getByLabel('产品名称').fill('后台同步验收整机');await page.getByLabel('产品简介').fill('后台新增后在已打开官网展示');
    await page.getByRole('combobox',{name:'产品分类',exact:true}).selectOption({label:'GPU 服务器'});
    await page.getByRole('button',{name:'保存产品',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
    product=(await call('/admin/content')).products.find(row=>row.name==='后台同步验收整机');
    await expect(visitor.getByRole('heading',{name:product.name,exact:true})).toBeVisible();
    await expect(visitor.getByRole('tab',{name:'GPU 服务器',exact:true})).toHaveAttribute('aria-selected','true');
    await visitor.getByRole('button',{name:'业务咨询',exact:true}).click();await visitor.getByLabel('您的称呼').fill('保留未提交称呼');
    const row=page.getByRole('row').filter({hasText:product.name});await row.getByRole('button',{name:'编辑',exact:true}).click();
    await page.getByLabel('产品名称').fill('后台同步更新后的整机');await page.getByRole('button',{name:'保存产品',exact:true}).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(visitor.getByLabel('您的称呼')).toHaveValue('保留未提交称呼');
    await visitor.getByRole('button',{name:'关闭弹窗',exact:true}).click();
    await expect(visitor.getByRole('heading',{name:'后台同步更新后的整机',exact:true})).toBeVisible();
    await expect(visitor.getByRole('button',{name:'业务咨询',exact:true})).toBeFocused();
    const updated=page.getByRole('row').filter({hasText:'后台同步更新后的整机'});await updated.getByRole('button',{name:'下架',exact:true}).click();
    await expect(visitor.getByRole('heading',{name:'后台同步更新后的整机',exact:true})).toHaveCount(0);
    await updated.getByRole('button',{name:'上架',exact:true}).click();
    await expect(visitor.getByRole('heading',{name:'后台同步更新后的整机',exact:true})).toBeVisible();
    await updated.getByRole('button',{name:'删除',exact:true}).click();await page.getByRole('button',{name:'确认删除',exact:true}).click();
    await expect(visitor.getByRole('heading',{name:'后台同步更新后的整机',exact:true})).toHaveCount(0);
    product=null;
  }finally{
    if(product){const current=(await call('/admin/content')).products.find(row=>row.id===product.id);if(current)await call(`/admin/products/${current.id}?version=${current.version}`,'DELETE');}
    await visitor.close();
  }
});
