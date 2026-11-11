import { html } from './content-store.js';

export function wecomFields(settings,field) {
  return `<div class="settings-contact-divider"><h3>企业微信</h3><p>账号、联系链接和二维码可按需填写。链接可使用企业微信客户联系或客服入口。</p></div>
    ${field('企业微信账号 / 联系人','wecomName',settings.wecomName)}
    ${field('企业微信联系链接','wecomUrl',settings.wecomUrl,'url')}
    <p class="settings-contact-help">支持 https://work.weixin.qq.com 或 https://qw.qq.com 下的联系链接。</p>
    <div class="settings-qr"><label class="field">上传企业微信二维码<input type="file" accept="image/png,image/jpeg" id="wecom-qr-file" aria-describedby="qr-upload-help"/></label><p id="qr-upload-help" class="settings-contact-help">PNG 或 JPG，512KB 以内，长宽不超过 2048 像素。保存设置后会公开展示；请上传可对外添加的企业微信二维码。</p><input type="hidden" name="wecomQr" value="${html(settings.wecomQr||'')}"/><div id="wecom-qr-preview">${qrPreview(settings.wecomQr)}</div><p id="qr-error" class="form-error" role="alert"></p></div>`;
}

function qrPreview(value) {
  return value?`<div class="settings-qr-preview"><img src="${html(value)}" alt="企业微信二维码预览" width="132" height="132"/><button type="button" class="secondary" data-remove-wecom-qr>移除二维码</button></div>`:'';
}

export function bindContactSettings() {
  document.addEventListener('change',async event=>{
    if(event.target.id!=='wecom-qr-file')return;
    const input=event.target,file=input.files[0],form=input.closest('form');if(!file||!form)return;if(form.dataset.saving==='true'||form.dataset.qrLoading==='true'){input.value='';return;}form.dataset.qrLoading='true';form.querySelector('.settings-qr').querySelectorAll('input,button').forEach(control=>control.disabled=true);
    const error=form.querySelector('#qr-error'),button=form.querySelector('[type="submit"]');error.textContent='';button.disabled=true;
    try {
      if(!['image/png','image/jpeg'].includes(file.type)||file.size>512*1024)throw Error('请选择 512KB 以内的 PNG 或 JPG 图片。');
      const value=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('图片读取失败，请重试。'));reader.readAsDataURL(file);});
      const bitmap=await createImageBitmap(file);
      try {if(bitmap.width>2048||bitmap.height>2048)throw Error('二维码图片长宽不能超过 2048 像素。');}finally{bitmap.close();}
      form.elements.wecomQr.value=value;
      form.querySelector('#wecom-qr-preview').innerHTML=qrPreview(value);
    }catch(failure){error.textContent=failure.message||'图片无法读取，请重新选择。';}
    finally{delete form.dataset.qrLoading;form.querySelector('.settings-qr').querySelectorAll('input,button').forEach(control=>control.disabled=form.dataset.saving==='true');button.disabled=form.dataset.saving==='true';input.value='';}
  });
  document.addEventListener('click',event=>{
    const trigger=event.target.closest('[data-remove-wecom-qr]');if(!trigger)return;
    const form=trigger.closest('form');if(form.dataset.saving==='true'||form.dataset.qrLoading==='true')return;form.elements.wecomQr.value='';form.querySelector('#wecom-qr-preview').innerHTML='';form.querySelector('#qr-error').textContent='';
  });
}
