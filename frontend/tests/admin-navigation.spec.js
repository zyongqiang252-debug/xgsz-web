import {test,expect} from '@playwright/test';
import {manager} from './support.js';

test('展示型控制台不提供客户、订单和地址，旧链接回到概览',async({page})=>{
  await manager(page);
  for(const target of ['catalog-users','catalog-orders','catalog-locations','page-global','page-home','page-services','page-partners','page-about','page-contact']){
    await page.goto(`/admin.html#/${target}`);
    await expect(page.getByRole('heading',{name:'网站概览',level:1})).toBeVisible();
    const navigation=page.getByRole('navigation',{name:'后台导航'});
    await expect(navigation.locator('[data-nav-group="business"]')).toHaveCount(0);
    for(const label of ['客户管理','订单管理','客户地址'])await expect(navigation.getByRole('link',{name:label,exact:true})).toHaveCount(0);
    await expect(navigation.getByRole('link',{name:'产品管理',exact:true})).toBeVisible();
  }
});

test('侧栏按用途收起，键盘可展开页面展示且折叠不丢失表单输入',async({page})=>{
  await manager(page);await page.goto('/admin.html');
  const navigation=page.getByRole('navigation',{name:'后台导航'});
  const display=navigation.locator('details').filter({has:page.locator('summary',{hasText:'页面展示'})});
  await expect(display).not.toHaveAttribute('open','');
  await expect(navigation.getByRole('link',{name:'首页内容',exact:true})).toHaveCount(0);
  await expect(navigation.getByRole('link',{name:'产品管理',exact:true})).toBeVisible();
  await display.locator('summary').focus();await page.keyboard.press('Enter');
  await expect(display).toHaveAttribute('open','');
  for(const label of ['首页内容','服务页面','合作页面','公司介绍','联系页面','品牌与页脚'])await expect(navigation.getByRole('link',{name:label,exact:true})).toHaveCount(0);
  await navigation.getByRole('link',{name:'业务方向与线上平台',exact:true}).click();
  await expect(page.getByRole('heading',{name:'业务方向与线上平台',level:1})).toBeVisible();
  await page.getByLabel('淘宝链接',{exact:true}).fill('保留未保存的淘宝链接');
  await display.locator('summary').click();await expect(display).not.toHaveAttribute('open','');
  await expect(page.getByLabel('淘宝链接',{exact:true})).toHaveValue('保留未保存的淘宝链接');
  await display.locator('summary').click();
  await navigation.getByRole('link',{name:'招商合作',exact:true}).click();
  await expect(page.getByRole('heading',{name:'招商合作',level:1})).toBeVisible();
});

test('直接打开子页面自动展开对应分组，手机和桌面侧栏滚动均可用',async({page})=>{
  await manager(page);
  for(const width of [360,1440]){
    await page.setViewportSize({width,height:900});await page.goto('/admin.html#/catalog-admins');
    const navigation=page.getByRole('navigation',{name:'后台导航'});
    const system=navigation.locator('details').filter({has:page.locator('summary',{hasText:'系统设置'})});
    await expect(system).toHaveAttribute('open','');
    await expect(navigation.getByRole('link',{name:'管理员账号',exact:true})).toHaveAttribute('aria-current','page');
    const display=navigation.locator('details').filter({has:page.locator('summary',{hasText:'页面展示'})});
    if(await display.evaluate(group=>!group.open))await display.locator('summary').click();
    await expect(display).toHaveAttribute('open','');
    await navigation.getByRole('link',{name:'图片素材',exact:true}).click();
    await expect(page.getByRole('heading',{name:'图片素材',level:1})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    expect(await navigation.evaluate(e=>getComputedStyle(e).overflowY)).toBe('auto');
  }
});
