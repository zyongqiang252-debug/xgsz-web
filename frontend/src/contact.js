import { html,getContent } from './content-store.js';

function wecomLink(value) {
  try { const url=new URL(value); return url.protocol==='https:'&&!url.username&&!url.password&&['work.weixin.qq.com','qw.qq.com'].includes(url.hostname)&&(!url.port||url.port==='443')?url.href:''; } catch {return '';}
}
export function companyContacts(settings, {compact=false}={}) {
  const phone=String(settings.phone||'').trim(), name=String(settings.wecomName||'').trim();
  const link=wecomLink(settings.wecomUrl), qr=String(settings.wecomQr||'');
  const hasQr=/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(qr);
  const dial=/^[+\d\s()（）-]+$/.test(phone)&&phone.replace(/\D/g,'').length>=7?phone.replace(/[^+\d]/g,''):'';
  const extras=[settings.email?`<div class="contact-extra"><span>联系邮箱</span><a href="mailto:${html(settings.email)}">${html(settings.email)}</a></div>`:'',settings.address?`<div class="contact-extra"><span>联系地址</span><p>${html(settings.address)}</p></div>`:''].join('');
  const phoneContent=`<div class="contact-method contact-phone"><span class="contact-method-label">咨询电话</span>${phone?`<p class="contact-phone-value">${dial?`<a href="tel:${html(dial)}">${html(phone)}</a>`:html(phone)}</p>${compact?'':'<small>可直接来电沟通业务需求</small>'}`:'<p class="contact-unavailable">暂未公布</p>'}</div>`;
  const wecomLinkMarkup=link?`<a class="contact-wecom-link" href="${html(link)}" target="_blank" rel="noopener noreferrer">通过企业微信联系 <span aria-hidden="true">↗</span></a>`:'';
  const wecomInfo=(qrHint='')=>`<span class="contact-method-label">企业微信</span>${name?`<p class="wecom-name">${html(name)}</p>`:''}${qrHint}${wecomLinkMarkup}${!name&&!link&&!hasQr?'<p class="contact-unavailable">暂未公布</p>':''}`;
  const compactWecom=link?wecomLinkMarkup:!hasQr?(name?'<a class="contact-wecom-link" href="#/contact" data-contact-details>查看企业微信联系方式</a>':'<p class="contact-unavailable">暂未公布</p>'):'';
  const qrImage=hasQr?`<img class="wecom-qr" src="${html(qr)}" width="132" height="132" alt="${html(getContent().pages.global.name)}企业微信二维码"/>`:'';
  if(compact) return `<div class="company-contacts contacts-compact ${hasQr?'has-qr':''}">
    <div class="compact-contact-details">${phoneContent}${compactWecom?`<div class="contact-method compact-wecom-info"><span class="contact-method-label">企业微信</span>${compactWecom}</div>`:''}</div>
    ${hasQr?`<div class="compact-qr-side"><span class="contact-method-label"><span>扫码添加</span><span>企业微信</span></span>${qrImage}</div>`:''}
  </div>`;
  return `<div class="company-contacts">
    ${phoneContent}
    <div class="contact-method contact-wecom"><div>${wecomInfo(hasQr?'<small>扫码添加企业微信</small>':'')}</div>${qrImage}</div>
    ${extras?`<div class="contact-extras">${extras}</div>`:''}
  </div>`;
}

export function contactPage({settings,page:x,global:g,subhero,arrow}) {
  return `<main id="main" class="contact-page">${subhero('',x.heroTitle,x.heroDesc)}
    <section class="section"><div class="container contact-page-layout"><div><span class="contact-kicker">${g.name}</span><h2>${x.title.replaceAll('\n','<br>')}</h2><p>${x.desc}</p><p>${x.note}</p><button class="button" data-inquiry="业务咨询">${x.button} ${arrow}</button></div><section class="contact-surface" aria-label="公司联系方式">${companyContacts(settings)}</section></div></section>
  </main>`;
}
