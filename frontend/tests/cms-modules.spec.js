import {test,expect} from '@playwright/test';
import {manager} from './support.js';

test('展示内容和管理员账号可在控制台新增、编辑和删除',async({page})=>{
  await manager(page);
  const cases=[
    ['brands','品牌管理','品牌名称','控制台测试品牌',{'品牌介绍':'品牌原模块保存'}],
    ['certificates','授权证书','证书名称','控制台测试授权',{'证书说明':'授权模块保存','证书图片':'/assets/xgsz-logo.jpg'}],
    ['carousels','首页轮播','轮播标题','控制台测试轮播',{'展示顺序':'1','轮播图片':'/assets/datacenter-hero.webp','点击跳转':'#/products'}],
    ['abouts','公司展示图片','图片说明','控制台测试图片',{'公司展示图片':'/assets/xgsz-logo.jpg'}],
    ['businesses','招商合作','合作方向','控制台测试合作',{'合作介绍':'可从后台修改合作内容'}],
    ['basicInformation','备案与版权','ICP备案号','测试备案号-控制台',{'版权说明':'测试版权'}],
    ['admins','管理员账号','管理员账号','console-test-admin',{'管理员密码':'Console-password-12'}],
  ];
  for(const[kind,label,key,name,values]of cases){
    await page.goto(`/admin.html#/catalog-${kind}`);await page.getByRole('button',{name:`新增${label}`,exact:true}).click();
    await page.getByRole('dialog').getByLabel(key,{exact:true}).fill(name);
    for(const[field,value]of Object.entries(values))await page.getByRole('dialog').getByLabel(field,{exact:true}).fill(value);
    await page.getByRole('button',{name:'保存记录',exact:true}).click();
    const row=page.getByRole('row').filter({hasText:name});await expect(row).toBeVisible();
    if(kind==='basicInformation'){const preview=await page.context().newPage();await preview.goto('/');await expect(preview.locator('.site-footer').getByText(name,{exact:true})).toBeVisible();await preview.close();}
    await row.getByRole('button',{name:'编辑',exact:true}).click();await page.getByRole('dialog').getByLabel(key,{exact:true}).fill(name+'-edit');
    await page.getByRole('button',{name:'保存记录',exact:true}).click();
    const updated=page.getByRole('row').filter({hasText:name+'-edit'});await expect(updated).toBeVisible();
    await updated.getByRole('button',{name:'删除',exact:true}).click();await page.getByRole('button',{name:'确认删除',exact:true}).click();await expect(updated).toHaveCount(0);
  }
  for(const width of [360,768,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
});

test('超过1MB的图片可上传并用于页面，页面和列表可正常显示',async({page})=>{
  await manager(page);await page.goto('/admin.html#/media');
  const png=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=768;canvas.height=768;const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(768,768);crypto.getRandomValues(pixels.data.subarray(0,65536));for(let i=65536;i<pixels.data.length;i+=65536)crypto.getRandomValues(pixels.data.subarray(i,Math.min(i+65536,pixels.data.length)));for(let i=3;i<pixels.data.length;i+=4)pixels.data[i]=255;ctx.putImageData(pixels,0,0);return canvas.toDataURL('image/png').split(',')[1];});
  const buffer=Buffer.from(png,'base64');expect(buffer.length).toBeGreaterThan(1024*1024);expect(buffer.length).toBeLessThan(5*1024*1024);
  await page.getByLabel('上传素材图片',{exact:true}).setInputFiles({name:'large-test.png',mimeType:'image/png',buffer});
  await expect(page.getByAltText('素材图片预览')).toBeVisible();await page.reload();await expect(page.getByAltText('large-test.png',{exact:true})).toBeVisible();
});
