import {test,expect} from '@playwright/test';
import {manager} from './support.js';

async function client(page){
  const state=(await(await page.request.get('/api/auth/session')).json()).data;
  return async(path,method='GET',data)=>{
    const response=await page.request.fetch('/api'+path,{method,headers:{'X-CSRF-TOKEN':state.csrf},...(data?{data}:{})});
    expect(response.ok()).toBe(true);return (await response.json()).data;
  };
}

test('首页与产品中心完整展示四个业务方向及细分能力，入口可以直达',async({page})=>{
  await page.goto('/');
  const capabilities=page.locator('.capability-strip');
  for(const title of ['服务器整机','本地化部署','推理优化','集群交付运维维保'])await expect(capabilities.getByRole('link').filter({hasText:title})).toBeVisible();
  await page.getByRole('link',{name:'探索产品与方案'}).click();
  const navigation=page.getByRole('navigation',{name:'业务方向'});
  for(const title of ['服务器整机','本地化部署','推理优化','集群交付运维维保'])await expect(navigation.getByRole('button',{name:title,exact:true})).toBeVisible();
  await expect(page.locator('.offering-section')).toHaveCount(1);
  const servers=page.locator('#offering-servers');
  await expect(servers.locator('.offering-group-grid')).toHaveCount(0);
  const serverTabs=servers.getByRole('tablist',{name:'服务器产品类别'});
  await expect(serverTabs.getByRole('tab')).toHaveCount(3);
  await expect(serverTabs.getByRole('tab',{name:'全部产品'})).toHaveCount(0);
  await expect(serverTabs.getByRole('tab',{name:'通用服务器'})).toHaveAttribute('aria-selected','true');
  await expect(servers.locator('.server-category-panel')).toHaveCount(1);
  await expect(servers.locator('.product-features li')).toHaveCount(3);
  for(const [tab,image,models] of [
    ['通用服务器','/assets/server-general.svg',['存储型服务器','通算型服务器']],
    ['GPU 服务器','/assets/server-gpu.svg',['5090','4090','5080','5060 16G','V100','PRO 6000D','PRO 5000','PRO 6000']],
    ['国产算力','/assets/server-domestic.svg',['中昊芯英','昆仑芯','曦望','沐曦']]
  ]){
    await serverTabs.getByRole('tab',{name:tab}).click();
    await expect(servers.locator('.server-category-panel')).toHaveCount(1);
    await expect(servers.locator('.server-category-kicker')).toContainText(tab);
    await expect(servers.locator('.server-category-panel img')).toHaveAttribute('src',image);
    for(const model of models)await expect(servers.locator('.server-model-list').getByText(model,{exact:true})).toBeVisible();
    await expect(servers.locator('.server-category-panel .product-features li')).toHaveCount(3);
    await expect(servers.locator('.server-category-panel .product-uses')).toBeVisible();
    await expect(servers.locator('.server-category-panel .product-bottom button')).toBeVisible();
  }
  await expect(page).toHaveURL(/solution=servers&category=domestic/);
  for(const [title,items] of [
    ['本地化部署',['裸金属交付','整体 Token 输出方案','专业 Agent 工具']],
    ['推理优化',['Token 平台优化','推理产出优化','集群性能优化']],
    ['集群交付运维维保',['集群交付','集群运维','集群 GPU 维保','液冷维保']]
  ]){
    await navigation.getByRole('button',{name:title,exact:true}).click();
    await expect(page.locator('.offering-section')).toHaveCount(1);
    await expect(page.locator('.offering-heading h2')).toHaveText(title);
    for(const text of items)await expect(page.locator('.offering-items').getByText(text,{exact:true})).toBeVisible();
  }
  await page.goto('/#/products?solution=inference');
  await expect(page.locator('#offering-inference')).toBeVisible();
  await expect(navigation.getByRole('button',{name:'推理优化',exact:true})).toHaveAttribute('aria-pressed','true');
  for(const [name,href] of [['淘宝入口','https://www.taobao.com/'],['抖音入口','https://www.douyin.com/']])await expect(page.getByRole('link',{name,exact:true})).toHaveAttribute('href',href);
  await page.goto('/#/products');
  await page.locator('.subhero').screenshot({path:'../.runtime/optimization-20261109/products-desktop.png'});
  await page.locator('.offering-catalog').screenshot({path:'../.runtime/optimization-20261109/server-directory-desktop.png'});
  await serverTabs.getByRole('tab',{name:'GPU 服务器'}).click();
  await page.locator('#offering-servers').screenshot({path:'../.runtime/server-tabs-gpu-desktop.png'});
  await page.setViewportSize({width:360,height:900});await page.goto('/');
  await page.locator('.capability-strip').screenshot({path:'../.runtime/optimization-20261109/home-capabilities-mobile.png'});
  await page.locator('.products-section .section-head').screenshot({path:'../.runtime/optimization-20261109/home-products-heading-mobile.png'});
  await page.goto('/#/products');await page.screenshot({path:'../.runtime/optimization-20261109/products-mobile.png',fullPage:true});
});

test('控制台可维护嵌套业务分类和线上链接并同步官网',async({page,context})=>{
  await manager(page);const call=await client(page);
  const originalProducts=await call('/admin/pages/products');
  const visitor=await context.newPage();
  const marker=`-${Date.now()}`;
  try{
    await page.goto('/admin.html#/page-products');
    await page.getByLabel('淘宝链接',{exact:true}).fill('https://www.taobao.com/?from=company');
    const solutions=page.locator('[data-repeater][data-path="solutionGroups"]');
  await solutions.locator(':scope > .cms-repeater-rows > [data-repeat-row]').last().locator(':scope > summary').click();
    await solutions.locator(':scope > .cms-repeater-rows > [data-repeat-row]').last().getByLabel('入口标识（英文）',{exact:true}).fill('R&D');
    const deployment=solutions.locator(':scope > .cms-repeater-rows > [data-repeat-row]').nth(1);
  await deployment.locator(':scope > summary').click();
    await deployment.getByRole('button',{name:'添加细分分类',exact:true}).click();
    const group=deployment.locator('[data-repeater] > .cms-repeater-rows > [data-repeat-row]').last();
    await group.getByLabel('分类名称',{exact:true}).fill(`后台新增部署分类${marker}`);
    await group.getByLabel('内容项目（每行一项）',{exact:true}).fill(`后台新增能力${marker}\n中文与英文 Agent${marker}`);
    await page.getByRole('button',{name:'保存页面',exact:true}).click();
    await expect(page.getByRole('status')).toContainText('页面已保存');
    await visitor.goto('/#/products?solution=deployment');
    await expect(visitor.getByRole('heading',{name:`后台新增部署分类${marker}`,exact:true})).toBeVisible();
    await expect(visitor.getByText(`后台新增能力${marker}`,{exact:true})).toBeVisible();
    await expect(visitor.getByRole('link',{name:'淘宝入口',exact:true})).toHaveAttribute('href','https://www.taobao.com/?from=company');
    await visitor.goto('/#/products?solution=R%26D');
    await expect(visitor.locator('[id="offering-R%26D"]')).toBeVisible();
    for(const width of [320,768,1440]){
      await visitor.setViewportSize({width,height:900});
      for(const route of ['/products']){
        await visitor.goto('/#'+route);await expect(visitor.locator('h1')).toBeVisible();
        expect(await visitor.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      }
    }
  }finally{
    const currentProducts=await call('/admin/pages/products');await call('/admin/pages/products','PUT',{...originalProducts,version:currentProducts.version});
    await visitor.close();
  }
});
