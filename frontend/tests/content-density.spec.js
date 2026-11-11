import {test,expect} from '@playwright/test';

test('产品中心一次展示当前业务，切换时保留清晰的浏览位置',async({page})=>{
  await page.goto('/#/products');
  await expect(page.getByRole('navigation',{name:'业务方向'}).getByRole('button')).toHaveCount(4);
  await expect(page.locator('.offering-section')).toHaveCount(1);
  await expect(page.locator('.offering-heading h2')).toHaveText('服务器整机');
  await expect(page.locator('.offering-group-grid')).toHaveCount(0);
  await page.locator('.offering-catalog').scrollIntoViewIfNeeded();
  await page.evaluate(()=>window.scrollBy(0,900));
  await page.getByRole('button',{name:'本地化部署',exact:true}).click();
  await expect(page.locator('#offering-deployment')).toBeVisible();
  await expect(page.locator('.offering-sidebar')).toBeInViewport();
  expect(await page.locator('.offering-sidebar').evaluate(element=>element.getBoundingClientRect().top)).toBeLessThan(220);
  await page.goto('/#/products?solution=inference');
  await expect(page.locator('#offering-inference')).toBeVisible();
  await expect(page.locator('.offering-heading h2')).toHaveText('推理优化');
  await page.getByRole('button',{name:'本地化部署',exact:true}).click();
  await expect(page.locator('#offering-deployment')).toBeVisible();
  await expect(page.locator('.offering-items strong')).toHaveText(['裸金属交付','整体 Token 输出方案','专业 Agent 工具']);
  await page.getByRole('button',{name:'推理优化',exact:true}).click();
  await expect(page).toHaveURL(/solution=inference/);
  const navigation=page.getByRole('navigation',{name:'业务方向'});
  await expect(navigation).toBeInViewport();
  expect(await page.evaluate(()=>window.scrollY)).toBeGreaterThan(0);
  await expect(navigation.getByRole('button',{name:'推理优化',exact:true})).toBeFocused();
});

test('项目动态展示最近五条交付并采用主次布局',async({page})=>{
  await page.goto('/#/about');
  const dynamics=page.locator('.about-projects');
  await expect(dynamics).toBeVisible();
  await expect(page.locator('.about-page > .subhero')).toBeVisible();
  await expect(page.locator('.about-hero')).toHaveCount(0);
  await expect(page.locator('.company-milestones')).toHaveCount(0);
  await expect(page.getByRole('navigation',{name:'关于我们页面导航'}).getByRole('link',{name:'项目动态',exact:true})).toHaveCount(0);
  await expect(page.locator('.about-intro-content')).toBeVisible();
  await expect(page.locator('.about-intro-content > p')).toHaveCount(3);
  await expect(page.locator('.about-business-grid > a')).toHaveCount(4);
  await expect(page.locator('.about-service-steps > li')).toHaveCount(4);
  await expect(page.locator('.about-principles-section')).toBeVisible();
  const milestones=(await (await page.request.get('/api/public/content')).json()).data.pages.about.milestones;
  const recent=[...milestones].sort((a,b)=>String(b.date).localeCompare(String(a.date),'zh-CN',{numeric:true})).slice(0,5);
  await expect(dynamics.getByRole('tab')).toHaveCount(0);
  await expect(dynamics.locator('.about-project-feature, .about-project-list > li')).toHaveCount(recent.length);
  await expect(dynamics.locator('.about-project-feature h3')).toHaveText(recent[0].title);
  await expect(dynamics.locator('.about-project-list > li h3')).toHaveText(recent.slice(1).map(item=>item.title));
  expect(await dynamics.locator('.about-project-feature h3').evaluate(element=>parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(24);
  expect(await dynamics.locator('.about-project-list-copy h3').first().evaluate(element=>parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(16);
  expect(await dynamics.evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true);
  expect(await dynamics.locator('.about-project-layout').evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true);
});

test('关于我们最近交付在手机端完整显示且不横向溢出',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/#/about');
  const dynamics=page.locator('.about-projects');
  await expect(dynamics).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('#company-milestones').scrollIntoViewIfNeeded();
  const milestones=(await (await page.request.get('/api/public/content')).json()).data.pages.about.milestones;
  const recentCount=Math.min(milestones.length,5);
  await expect(dynamics.locator('.about-project-feature, .about-project-list > li')).toHaveCount(recentCount);
  await expect(dynamics.locator('.about-project-feature')).toBeVisible();
  expect(await dynamics.locator('.about-project-layout').evaluate(element=>element.scrollWidth<=element.clientWidth&&element.scrollHeight<=element.clientHeight)).toBe(true);
  expect(await dynamics.locator('.about-project-list').evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('常规页脚不重复展示完整联系卡片，联系页面保持完整信息',async({page})=>{
  await page.goto('/');
  await expect(page.locator('.footer-contact')).toHaveCount(0);
  await expect(page.locator('.footer-bottom')).toBeVisible();
  await page.goto('/#/contact');
  await expect(page.locator('.contact-surface')).toBeVisible();
});
