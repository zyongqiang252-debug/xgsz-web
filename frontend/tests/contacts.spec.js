import { test, expect } from '@playwright/test';
import { manager } from './support.js';

test('后台联系方式保存刷新后，在联系页、咨询弹窗和页脚公开展示，二维码可清除',async({page})=>{
  await manager(page);
  await page.goto('/admin.html#/settings');
  await page.getByLabel('咨询电话',{exact:true}).fill('400-123-4567');
  await page.getByLabel('企业微信账号 / 联系人',{exact:true}).fill('芯光技术 & 商务 <团队>');
  await page.getByLabel('企业微信联系链接',{exact:true}).fill('https://work.weixin.qq.com/kfid/test-contact');
  const png=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=32;canvas.height=32;const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,32,32);ctx.fillStyle='black';ctx.fillRect(8,8,16,16);return canvas.toDataURL('image/png').split(',')[1];});
  await page.getByLabel('上传企业微信二维码',{exact:true}).setInputFiles({name:'test-contact.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
  await expect(page.getByAltText('企业微信二维码预览')).toBeVisible();
  await page.getByRole('button',{name:'保存设置',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('联系信息已保存');
  await page.reload();
  await expect(page.getByLabel('企业微信账号 / 联系人',{exact:true})).toHaveValue('芯光技术 & 商务 <团队>');
  await page.goto('/#/contact');
  const main=page.getByRole('main');
  await expect(main.getByRole('heading',{name:'联系我们',exact:true})).toBeVisible();
  await expect(main.getByRole('link',{name:'400-123-4567',exact:true})).toHaveAttribute('href','tel:4001234567');
  await expect(main.getByText('芯光技术 & 商务 <团队>',{exact:true})).toBeVisible();
  await expect(main.getByRole('link',{name:'通过企业微信联系',exact:true})).toHaveAttribute('href','https://work.weixin.qq.com/kfid/test-contact');
  await expect(main.getByAltText('芯光智数企业微信二维码')).toBeVisible();
  await page.setViewportSize({width:360,height:800});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:'业务咨询',exact:true}).click();
  await expect(page.getByRole('dialog').getByRole('link',{name:'400-123-4567',exact:true})).toBeVisible();
  await expect(page.getByRole('dialog').getByText('芯光技术 & 商务 <团队>',{exact:true})).toHaveCount(0);
  await expect(page.getByRole('dialog').getByRole('heading',{name:'直接联系我们',exact:true})).toHaveCount(0);
  await expect(page.getByRole('dialog').getByRole('link',{name:'通过企业微信联系',exact:true})).toBeVisible();
  await expect(page.getByRole('dialog').getByText('扫码添加企业微信',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'关闭弹窗',exact:true}).click();
  await expect(page.locator('.site-footer').getByText('芯光技术 & 商务 <团队>',{exact:true})).toBeVisible();
  await page.goto('/admin.html#/settings');
  await page.getByRole('button',{name:'移除二维码',exact:true}).click();
  await page.getByRole('button',{name:'保存设置',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('联系信息已保存');
  await page.goto('/#/contact');
  await expect(main.getByAltText('芯光智数企业微信二维码')).toHaveCount(0);
  await page.goto('/admin.html#/settings');
  await page.getByLabel('企业微信联系链接',{exact:true}).fill('');
  await page.getByRole('button',{name:'保存设置',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('联系信息已保存');
  await page.goto('/#/contact');
  await page.getByRole('button',{name:'业务咨询',exact:true}).click();
  await page.getByRole('dialog').getByRole('link',{name:'查看企业微信联系方式',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(main.getByText('芯光技术 & 商务 <团队>',{exact:true})).toBeVisible();
});

test('读取或保存期间锁定二维码变更，避免旧任务覆盖新图片或恢复已移除的图片',async({page})=>{
  await manager(page);await page.goto('/admin.html#/settings');
  const png=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=16;canvas.height=16;return canvas.toDataURL('image/png').split(',')[1];});
  await page.getByLabel('上传企业微信二维码',{exact:true}).setInputFiles({name:'test-contact.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
  await expect(page.getByAltText('企业微信二维码预览')).toBeVisible();
  await page.evaluate(()=>{const decode=window.createImageBitmap;window.createImageBitmap=async(...args)=>{await new Promise(resolve=>{window.releaseQrDecode=resolve;});return decode(...args);};});
  await page.getByLabel('上传企业微信二维码',{exact:true}).setInputFiles({name:'new-contact.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
  await expect.poll(()=>page.evaluate(()=>typeof window.releaseQrDecode)).toBe('function');
  try {
    await expect(page.getByLabel('上传企业微信二维码',{exact:true})).toBeDisabled();
    await expect(page.getByRole('button',{name:'移除二维码',exact:true})).toBeDisabled();
  } finally {await page.evaluate(()=>window.releaseQrDecode());}
  await expect(page.getByLabel('上传企业微信二维码',{exact:true})).toBeEnabled();
  let releaseSave;const pending=new Promise(resolve=>{releaseSave=resolve;});
  await page.route('**/api/admin/settings',async route=>{await pending;await route.continue();});
  try {
    await page.getByRole('button',{name:'保存设置',exact:true}).click();
    await expect(page.getByLabel('上传企业微信二维码',{exact:true})).toBeDisabled();
    await expect(page.getByRole('button',{name:'移除二维码',exact:true})).toBeDisabled();
  } finally {releaseSave();}
  await expect(page.getByRole('status')).toContainText('联系信息已保存');
  await expect(page.getByLabel('上传企业微信二维码',{exact:true})).toBeEnabled();
  await expect(page.getByRole('button',{name:'移除二维码',exact:true})).toBeEnabled();
});
